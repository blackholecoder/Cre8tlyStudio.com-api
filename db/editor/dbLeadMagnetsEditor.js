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
  `SELECT user_id, editable_html, edit_used,
          theme, bg_theme, logo, link, cover_image, cta, pdf_url, original_pdf_url
     FROM lead_magnets
    WHERE id = ?`,
  [leadMagnetId]
);
  ;

  if (!rows.length) throw new Error("Lead magnet not found");
  const record = rows[0];
  if (record.user_id !== userId) throw new Error("Unauthorized");
  if (record.edit_used) throw new Error("Edit already used");

  const token = jwt.sign(
    { id: leadMagnetId, uid: userId },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  

  return {
  token,
  editableHtml: record.editable_html || "",
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
}
}

export async function commitLeadMagnetEdit(
  userId,
  leadMagnetId,
  { updatedHtml, file }
) {
  const db = connect();
  const [rows] = await db.query(
    "SELECT user_id, theme, bg_theme, logo, link, cover_image, cta FROM lead_magnets WHERE id = ?",
    [leadMagnetId]
  );

  if (!rows.length) {
    ;
    throw new Error("Lead magnet not found");
  }

  const record = rows[0];
  if (record.user_id !== userId) {
    ;
    throw new Error("Unauthorized");
  }

  let finalPdfPath;
  let editableHtml = null;

  // 🧩 Handle HTML updates
  if (updatedHtml) {
    const window = new JSDOM("").window;
    const DOMPurify = createDOMPurify(window);
    let safeHtml = DOMPurify.sanitize(updatedHtml || "");
    if (typeof safeHtml !== "string") safeHtml = String(safeHtml);

    const cleanHtml = safeHtml.replace(/<img[^>]+unsplash[^>]+>/gi, "");

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

    const localPath = await generatePDF({
      id: leadMagnetId,
      prompt: cleanHtml,
      isHtml: true,
      theme: record.theme,
      bgTheme: record.bg_theme,
      logo: record.logo,
      link: record.link,
      coverImage: finalCoverPath,
      cta: record.cta,
    });

    finalPdfPath = localPath;
    editableHtml = safeHtml;
  }

  // 🧩 Handle direct PDF uploads (from Canvas)
  else if (file) {
    const uploadDir = path.resolve(__dirname, "../uploads/tmp");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const tmpPath = path.join(uploadDir, `canvas_${Date.now()}.pdf`);
    await file.mv(tmpPath);
    finalPdfPath = tmpPath;
  } else {
    ;
    throw new Error("No valid data provided (missing HTML or PDF).");
  }

  // ✅ Upload to Spaces
  const fileName = `pdfs/${userId}-${leadMagnetId}-edit-${Date.now()}.pdf`;
  const uploaded = await uploadFileToSpaces(
    finalPdfPath,
    fileName,
    "application/pdf"
  );

  // ✅ Update DB
  await db.query(
    `
    UPDATE lead_magnets
    SET 
      pdf_url = ?,
      editable_html = IFNULL(?, editable_html),
      edit_used = 1,
      edit_committed_at = NOW()
    WHERE id = ? AND user_id = ?
    `,
    [uploaded.Location, editableHtml, leadMagnetId, userId]
  );

  ;
  return { pdf_url: uploaded.Location };
}




