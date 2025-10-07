import { s3 } from "../utils/s3Client.js";
import connect from "./connect.js";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import path from "path";

export async function uploadAdminImage(userId, { imageData, fileName, mimeType }) {
  if (!imageData) throw new Error("No image provided");
  if (!mimeType.startsWith("image/")) throw new Error("Invalid file type");

  const buffer = Buffer.from(imageData, "base64");
  if (buffer.length > 2 * 1024 * 1024) throw new Error("Image must be under 2MB");

  // ✅ 1. process image using sharp
  const processed = await sharp(buffer)
    .resize({
      width: 400,          // crop square 400×400 (change if desired)
      height: 400,
      fit: sharp.fit.cover, // center-crop
      position: sharp.strategy.entropy // crop focusing on face/center
    })
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toBuffer();

  const extension = ".jpg";
  const fileKey = `profiles/${userId}/${uuidv4()}${extension}`;

  // ✅ 2. upload processed image to DigitalOcean Space
  await s3
    .upload({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: fileKey,
      Body: processed,
      ACL: "public-read",
      ContentType: "image/jpeg",
    })
    .promise();

  const imageUrl = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_REGION}.digitaloceanspaces.com/${fileKey}`;

  // ✅ 3. save URL to DB
  const db = await connect();
  await db.query("UPDATE users SET profile_image_url = ? WHERE id = ?", [
    imageUrl,
    userId,
  ]);
  await db.end();

  return { imageUrl };
}
