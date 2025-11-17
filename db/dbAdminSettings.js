import connect from "./connect.js";
import bcrypt from "bcryptjs";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

export async function updateAdminSettings(userId, { email, currentPassword, newPassword, profileImage }) {
  const db = connect();

  const [rows] = await db.query("SELECT email, password_hash FROM users WHERE id = ? AND role = 'admin'", [userId]);
  if (!rows.length) throw new Error("Admin not found");
  const admin = rows[0];

  // ✅ Optional email update
  if (email && email !== admin.email) {
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) throw new Error("Email is already in use");
    await db.query("UPDATE users SET email = ? WHERE id = ?", [email, userId]);
  }

  // ✅ Password update
  if (newPassword) {
    if (!currentPassword) throw new Error("Current password required");
    const valid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!valid) throw new Error("Incorrect current password");

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashed, userId]);
  }

  // ✅ Image upload
  if (profileImage) {
    const base64Data = Buffer.from(
      profileImage.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );
    const type = profileImage.split(";")[0].split("/")[1];

    const s3 = new AWS.S3({
      endpoint: "https://nyc3.digitaloceanspaces.com",
      accessKeyId: process.env.SPACES_KEY,
      secretAccessKey: process.env.SPACES_SECRET,
    });

    const filename = `profiles/${uuidv4()}.${type}`;
    const params = {
      Bucket: process.env.SPACES_BUCKET,
      Key: filename,
      Body: base64Data,
      ACL: "public-read",
      ContentEncoding: "base64",
      ContentType: `image/${type}`,
    };

    const upload = await s3.upload(params).promise();
    await db.query("UPDATE users SET profile_image = ? WHERE id = ?", [upload.Location, userId]);
  }

  ;
  return { message: "Settings updated successfully" };
}
