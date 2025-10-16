import connect from "./connect.js";

import { s3 } from "../utils/s3Client.js";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { scanUploadedFile } from "../middleware/NodeClam.js";

export async function uploadBrandIdentity(userId, fileName, base64Data) {
  const db = await connect();

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

    // 3️⃣ Scan file before upload
    await scanUploadedFile(tempPath);

    // 4️⃣ Upload to DigitalOcean Spaces
    const upload = await s3
      .upload({
        Bucket: process.env.SPACES_BUCKET || "cre8tlystudio",
        Key: `brand_identity/${safeName}`,
        Body: fs.createReadStream(tempPath),
        ACL: "public-read",
        ContentType: "application/octet-stream",
      })
      .promise();

    // 5️⃣ Clean up temp file
    fs.unlinkSync(tempPath);

    // 6️⃣ Store file URL in DB
    await db.query("UPDATE users SET brand_identity_file = ? WHERE id = ?", [
      upload.Location,
      userId,
    ]);

    await db.end();

    return {
      success: true,
      message: "File uploaded successfully",
      fileUrl: upload.Location,
    };
  } catch (err) {
    await db.end();
    console.error("Error uploading brand file:", err);
    throw err;
  }
}

export async function deleteBrandIdentity(userId) {
  const db = await connect();

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
    await db.query(
      "UPDATE users SET brand_identity_file = NULL WHERE id = ?",
      [userId]
    );

    await db.end();

    return {
      success: true,
      message: "Brand identity file deleted successfully",
    };
  } catch (err) {
    await db.end();
    console.error("Error deleting brand file:", err);
    throw err;
  }
}

export async function getUserSettings(userId) {
  const db = await connect();
  try {
    const [rows] = await db.query(
      "SELECT id, email, name, brand_identity_file FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) throw new Error("User not found");
    return rows[0];
  } catch (err) {
    console.error("Error fetching user settings:", err);
    throw err;
  } finally {
    await db.end();
  }
}

export async function getUserBrandFile(userId) {
  const db = await connect();
  try {
    // gracefully handle if column doesn’t exist yet (older DBs)
    const [rows] = await db.query(`
      SELECT
        CASE
          WHEN COLUMN_NAME IS NOT NULL THEN (SELECT brand_identity_file FROM users WHERE id = ?)
          ELSE NULL
        END AS brand_identity_file
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'brand_identity_file'
      LIMIT 1;
    `, [userId]);

    // If column missing or user not found
    if (!rows.length || !rows[0].brand_identity_file) return null;
    return rows[0].brand_identity_file;
  } catch (err) {
    console.error("Error fetching user brand file:", err);
    return null; // fail safe, never crash GPT generation
  } finally {
    await db.end();
  }
}

export async function removeUserBrandFile(userId) {
  const db = await connect();

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

    return { success: true, message: "Brand identity file removed successfully" };
  } catch (err) {
    console.error("Error removing brand file:", err);
    throw err;
  } finally {
    await db.end();
  }
}



