import connect from "./connect.js";
import { s3 } from "../utils/s3Client.js";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { scanUploadedFile } from "../middleware/NodeClam.js";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";

export async function uploadBrandIdentity(userId, fileName, base64Data) {
  const db = connect();

  try {
    // 1️⃣ Create a safe filename
    const ext = path.extname(fileName).toLowerCase();
    const safeName = uuidv4() + ext;

    // 2️⃣ Write to a local temp file for scanning
    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const tempPath = path.join(tempDir, safeName);

    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(tempPath, buffer);

    if (buffer.length > 25 * 1024 * 1024) {
      throw new Error("File too large — max 25MB allowed");
    }

    // 3️⃣ Scan file before upload
    await scanUploadedFile(tempPath);

    const mimeType =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".png"
        ? "image/png"
        : "application/octet-stream";

    // 4️⃣ Upload to DigitalOcean Spaces
    const upload = await s3
      .upload({
        Bucket: process.env.SPACES_BUCKET || "cre8tlystudio",
        Key: `brand_identity/${safeName}`,
        Body: fs.createReadStream(tempPath),
        ACL: "public-read",
        ContentType: mimeType,
      })
      .promise();

    // 5️⃣ Clean up temp file
    fs.unlinkSync(tempPath);

    try {
      await db.query("UPDATE users SET brand_identity_file = ? WHERE id = ?", [
        upload.Location,
        userId,
      ]);
    } finally {
      ;
    }

    return {
      success: true,
      message: "File uploaded successfully",
      fileUrl: upload.Location,
    };
  } catch (err) {
    ;
    console.error("Error uploading brand file:", err);
    throw err;
  }
}

export async function deleteBrandIdentity(userId) {
  const db = connect();

  try {
    // 1️⃣ Fetch user’s brand file URL
    const [rows] = await db.query(
      "SELECT brand_identity_file FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) throw new Error("User not found");

    const fileUrl = rows[0].brand_identity_file;

    // 2️⃣ Delete file from Spaces if it exists
    if (fileUrl && fileUrl.includes(".digitaloceanspaces.com")) {
      const key = fileUrl.split("digitaloceanspaces.com/")[1];
      try {
        await s3
          .deleteObject({
            Bucket: process.env.SPACES_BUCKET || "cre8tlystudio",
            Key: key,
          })
          .promise();

        console.log("🧹 Deleted brand identity file:", key);
      } catch (s3Err) {
        console.warn("⚠️ Failed to delete from Spaces:", s3Err.message);
      }
    }

    // 3️⃣ Remove reference from DB
    await db.query("UPDATE users SET brand_identity_file = NULL WHERE id = ?", [
      userId,
    ]);

    ;

    return {
      success: true,
      message: "Brand identity file deleted successfully",
    };
  } catch (err) {
    ;
    console.error("Error deleting brand file:", err);
    throw err;
  }
}

export async function getUserSettings(userId) {
  const db = connect();
  try {
    const [rows] = await db.query(
      "SELECT id, email, name, brand_identity_file, cta FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) throw new Error("User not found");
    return rows[0];
  } catch (err) {
    console.error("Error fetching user settings:", err);
    throw err;
  }
}

export async function getUserBrandFile(userId) {
  const db = connect();
  try {
    const [rows] = await db.query(
      "SELECT brand_identity_file FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!rows.length || !rows[0].brand_identity_file) return null;
    const fileUrl = rows[0].brand_identity_file.toLowerCase();

    // 🧩 Handle .txt files
    if (fileUrl.endsWith(".txt")) {
      const response = await axios.get(fileUrl);
      return response.data.slice(0, 8000);
    }

    // 🧩 Handle .docx files
    if (fileUrl.endsWith(".docx")) {
      const resp = await axios.get(fileUrl, { responseType: "arraybuffer" });
      const buffer = Buffer.from(resp.data);
      const { value: text } = await mammoth.extractRawText({ buffer });
      return text.trim().slice(0, 8000);
    }

    // 🧩 Handle .pdf files
    if (fileUrl.endsWith(".pdf")) {
      const resp = await axios.get(fileUrl, { responseType: "arraybuffer" });
      const data = new Uint8Array(resp.data);

      const loadingTask = pdfjsLib.getDocument({
        data,
        useSystemFonts: true,
        disableFontFace: true,
      });

      const pdfDoc = await loadingTask.promise;
      let text = "";

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const content = await page.getTextContent();
        text += content.items.map((it) => it.str).join(" ") + "\n";
        if (text.length > 12000) break; // stop if it gets too long
      }

      return text.trim().slice(0, 8000);
    }

    // 🚫 Unsupported file type
    console.warn("⚠️ Unsupported brand file type:", fileUrl);
    return null;

  } catch (err) {
    console.error("Error fetching user brand file:", err);
    return null;
  }
}


export async function removeUserBrandFile(userId) {
  const db = connect();

  try {
    // 1️⃣ Fetch file URL
    const [rows] = await db.query(
      "SELECT brand_identity_file FROM users WHERE id = ?",
      [userId]
    );
    if (!rows.length) throw new Error("User not found");

    const fileUrl = rows[0].brand_identity_file;
    if (!fileUrl) return { success: false, message: "No brand file to delete" };

    // 2️⃣ Delete from DigitalOcean Spaces
    try {
      const key = fileUrl.split("digitaloceanspaces.com/")[1];
      await s3
        .deleteObject({
          Bucket: process.env.SPACES_BUCKET || "cre8tlystudio",
          Key: key,
        })
        .promise();
      console.log("🧹 Deleted brand identity file from Spaces:", key);
    } catch (err) {
      console.warn("⚠️ Failed to delete brand file from Spaces:", err.message);
    }

    // 3️⃣ Clear DB reference
    await db.query("UPDATE users SET brand_identity_file = NULL WHERE id = ?", [
      userId,
    ]);

    return {
      success: true,
      message: "Brand identity file removed successfully",
    };
  } catch (err) {
    console.error("Error removing brand file:", err);
    throw err;
  } 
}

export async function updateUserCta(userId, cta) {
  const db = connect();
  try {
    const [result] = await db.query("UPDATE users SET cta = ? WHERE id = ?", [
      cta,
      userId,
    ]);
    return result;
  } catch (err) {
    console.error("❌ Error updating user CTA:", err);
    throw err;
  }
}
