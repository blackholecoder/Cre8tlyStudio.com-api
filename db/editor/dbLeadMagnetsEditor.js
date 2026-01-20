import connect from "../connect.js";
import fs from "fs";
import jwt from "jsonwebtoken";
import { JSDOM } from "jsdom";
import createDOMPurify from "isomorphic-dompurify";
import { generatePDF } from "../../services/pdfService.js";
import { uploadFileToSpaces } from "../../helpers/uploadToSpace.js";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startLeadMagnetEdit(userId, leadMagnetId) {
  const db = connect();
  const [rows] = await db.query(
    `SELECT user_id, editable_html, html_template, edit_used, edit_commit_count, export_count, theme, bg_theme, logo, link, cover_image, cta, pdf_url, original_pdf_url, font_name
       FROM lead_magnets
      WHERE id = ?`,
    [leadMagnetId]
  );

  if (!rows.length) throw new Error("Lead magnet not found");
  const record = rows[0];

  if (record.user_id !== userId) throw new Error("Unauthorized");

  if (record.export_count > 0) {
    throw new Error("Editing is locked after export");
  }

  const token = jwt.sign(
    { id: leadMagnetId, uid: userId },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  // 🔹 Start from whatever is stored
  let editableHtml = record.editable_html || "";

  // 🔥 Strip CTA + visit link from the HTML BEFORE it goes to the editor
  if (editableHtml) {
    // Remove CTA text if present
    if (record.cta) {
      const ctaText = record.cta.trim();
      editableHtml = editableHtml.replace(ctaText, "");
      editableHtml = editableHtml.replace(/<p>\s*<\/p>/g, "");
      editableHtml = editableHtml.replace(/\n{2,}/g, "\n");
    }

    // Remove things like "Visit mydomain.com" / raw URL from the HTML
    if (record.link) {
      try {
        const domain = new URL(record.link).hostname.replace(/^www\./, "");

        const regexVisit = new RegExp(`Visit\\s+${domain}[\\s\\S]*?$`, "gi");
        editableHtml = editableHtml.replace(regexVisit, "");

        const regexUrl = new RegExp(record.link.replace(/\//g, "\\/"), "gi");
        editableHtml = editableHtml.replace(regexUrl, "");
      } catch (e) {
        console.error("Failed to parse link for CTA stripping:", e);
      }
    }
  }

  // 🛟 LEGACY FALLBACK: old PDFs have no html_template
  let htmlTemplate = record.html_template;

  if (!htmlTemplate && editableHtml) {
    htmlTemplate = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        font-family: ${record.font_name || "Montserrat"}, sans-serif;
      }

      .page {
        max-width: 667px;
        margin: 0 auto;
        background: #ffffff;
      }

      .page-inner {
        padding: 32px 24px;
        box-sizing: border-box;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="page-inner">
        ${editableHtml}
      </div>
    </div>
  </body>
</html>
`;
  }

  const pdfSource = record.original_pdf_url || record.pdf_url;

  return {
    token,
    editableHtml, // ⬅ cleaned version, NO CTA inside
    htmlTemplate,
    pdfSource,
    meta: {
      theme: record.theme,
      bgTheme: record.bg_theme,
      logo: record.logo,
      link: record.link,
      coverImage: record.cover_image,
      cta: record.cta,
      pdf_url: record.pdf_url || null,
      original_pdf_url: record.original_pdf_url || null,
    },
  };
}

export async function commitLeadMagnetEdit(
  userId,
  leadMagnetId,
  { updatedHtml, file }
) {
  const db = connect();
  const [rows] = await db.query(
    "SELECT user_id, theme, bg_theme, logo, link, cover_image, cta, edit_commit_count FROM lead_magnets WHERE id = ?",
    [leadMagnetId]
  );

  if (!rows.length) throw new Error("Lead magnet not found");
  const record = rows[0];
  if (record.user_id !== userId) throw new Error("Unauthorized");

  if (record.edit_commit_count >= 2) {
    throw new Error("Editing is locked for this lead magnet");
  }

  let finalPdfPath;
  let editableHtml = null;

  if (updatedHtml) {
    console.log("🧪 COMMIT INPUT", {
      hasUpdatedHtml: !!updatedHtml,
      updatedHtmlLength: updatedHtml?.length,
      containsCtaText: record.cta
        ? updatedHtml.includes(record.cta.slice(0, 20))
        : false,
    });

    const window = new JSDOM("").window;
    const DOMPurify = createDOMPurify(window);
    let safeHtml = DOMPurify.sanitize(updatedHtml || "");
    if (typeof safeHtml !== "string") safeHtml = String(safeHtml);

    // MUST be let, not const
    let cleanHtml = safeHtml.replace(/<img[^>]+unsplash[^>]+>/gi, "");

    // 🔥 Remove trailing blank blocks, breaks, leftover wrappers
    cleanHtml = cleanHtml
      .replace(/(<!--PAGEBREAK-->\s*)+$/gi, "")
      .replace(/(<p>\s*<\/p>\s*)+$/gi, "")
      .replace(/(<div>\s*<\/div>\s*)+$/gi, "");

    console.log("🧼 CLEAN HTML", {
      length: cleanHtml.length,
      containsFooterBlock: cleanHtml.includes("footer-link"),
      containsCtaText: record.cta
        ? cleanHtml.includes(record.cta.slice(0, 20))
        : false,
    });

    let finalCoverPath = record.cover_image;
    if (record.cover_image?.startsWith("http")) {
      const tmpDir = path.resolve(__dirname, "../uploads/tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const response = await axios.get(record.cover_image, {
        responseType: "arraybuffer",
        timeout: 10000,
      });

      const ext = path.extname(new URL(record.cover_image).pathname) || ".jpg";
      finalCoverPath = path.join(tmpDir, `cover_edit_${Date.now()}${ext}`);
      fs.writeFileSync(finalCoverPath, Buffer.from(response.data));
    }

    console.log("🎨 PDF INPUT", {
      hasCta: !!record.cta,
      hasSafeLink: !!record.link,
      bgTheme: record.bg_theme,
      hasLogo: !!record.logo,
      hasCover: !!finalCoverPath,
    });

    const localPath = await generatePDF({
      id: leadMagnetId,
      prompt: cleanHtml,
      isHtml: true,
      theme: record.theme,
      bgTheme: record.bg_theme,
      logo: record.logo,
      safeLink: record.link,
      coverImage: finalCoverPath,
      cta: record.cta,
    });

    finalPdfPath = localPath;

    // IMPORTANT: save cleaned HTML, NOT the raw safeHtml
    editableHtml = cleanHtml;
  }

  // Handle direct file upload
  else if (file) {
    const uploadDir = path.resolve(__dirname, "../uploads/tmp");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const tmpPath = path.join(uploadDir, `canvas_${Date.now()}.pdf`);
    await file.mv(tmpPath);
    finalPdfPath = tmpPath;
  } else {
    throw new Error("No valid data provided (missing HTML or PDF).");
  }

  const fileName = `pdfs/${userId}-${leadMagnetId}-edit-${Date.now()}.pdf`;
  const uploaded = await uploadFileToSpaces(
    finalPdfPath,
    fileName,
    "application/pdf"
  );

  await db.query(
    `
    UPDATE lead_magnets
    SET 
      pdf_url = ?,
      editable_html = IFNULL(?, editable_html),
      edit_used = 1,
      edit_commit_count = edit_commit_count + 1,
      edit_committed_at = NOW()
    WHERE id = ? AND user_id = ?
    `,
    [uploaded.Location, editableHtml, leadMagnetId, userId]
  );

  return { pdf_url: uploaded.Location };
}
