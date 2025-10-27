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
  const db = await connect();
  const [rows] = await db.query(
  `SELECT user_id, editable_html, edit_used,
          theme, bg_theme, logo, link, cover_image, cta
     FROM lead_magnets
    WHERE id = ?`,
  [leadMagnetId]
);
  await db.end();

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
  },
}
}

export async function commitLeadMagnetEdit(userId, leadMagnetId, { token, updatedHtml }) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.id !== leadMagnetId || decoded.uid !== userId)
      throw new Error("Unauthorized");
  } catch {
    throw new Error("Invalid or expired token");
  }

  const db = await connect();
  const [rows] = await db.query(
    "SELECT user_id, edit_used, theme, bg_theme, logo, link, cover_image, cta FROM lead_magnets WHERE id = ?",
    [leadMagnetId]
  );

  if (!rows.length) {
    await db.end();
    throw new Error("Lead magnet not found");
  }

  const record = rows[0];
  if (record.user_id !== userId) {
    await db.end();
    throw new Error("Unauthorized");
  }
  if (record.edit_used) {
    await db.end();
    throw new Error("Edit already used");
  }

  // ✅ Sanitize HTML
  const window = new JSDOM("").window;
  const DOMPurify = createDOMPurify(window);
  const safeHtml = DOMPurify.sanitize(updatedHtml || "");

if (typeof safeHtml !== "string") {
  safeHtml = String(safeHtml);
}

let finalCoverPath = record.cover_image;

if (record.cover_image && record.cover_image.startsWith("http")) {
  try {
    const tmpDir = path.resolve(__dirname, "../uploads/tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const response = await axios.get(record.cover_image, {
      responseType: "arraybuffer",
      timeout: 10000,
    });

    const ext = path.extname(new URL(record.cover_image).pathname) || ".jpg";
    finalCoverPath = path.join(tmpDir, `cover_edit_${Date.now()}${ext}`);
    fs.writeFileSync(finalCoverPath, Buffer.from(response.data));
    console.log("🧩 Recreated local cover image:", finalCoverPath);
  } catch (err) {
    console.warn("⚠️ Failed to rebuild local cover:", err.message);
  }
}
let cleanHtml = safeHtml.replace(/<img[^>]+unsplash[^>]+>/gi, ""); 

// If in the future you allow small images within text but still want to drop large cover-type ones, you could do:
// Code belwo targets only “cover” or “unsplash”-type sources.
// formattedAnswer = formattedAnswer.replace(/<img[^>]*(unsplash|cover|photo)[^>]*>/gi, "");

console.log("🕵️ Image count in HTML:", (safeHtml.match(/<img/gi) || []).length);


  // ✅ Generate new PDF with all visual fields intact
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

  // ✅ Upload to Spaces
  const fileName = `pdfs/${userId}-${leadMagnetId}-edit-${Date.now()}.pdf`;
  const uploaded = await uploadFileToSpaces(localPath, fileName, "application/pdf");

  // ✅ Update DB — mark edit as USED and preserve the final HTML
  await db.query(
    `
    UPDATE lead_magnets
    SET 
      pdf_url = ?,
      editable_html = ?,   -- store the sanitized HTML one last time
      edit_used = 1,        -- mark as used
      edit_committed_at = NOW()
    WHERE id = ? AND user_id = ?
    `,
    [uploaded.Location, safeHtml, leadMagnetId, userId]
  );

  await db.end();

  return { pdf_url: uploaded.Location };
}



