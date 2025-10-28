import sharp from "sharp";
import fs from "fs";
import path from "path";

export async function optimizeCoverImage(coverImageUrl, size = "medium") {
  if (!coverImageUrl) return null;

  try {
    // ✅ Decide target width
    let width = 800;
    if (size === "small") width = 400;
    if (size === "large") width = 1200;

    // ✅ Fetch image (remote or local)
    let buffer;
    if (coverImageUrl.startsWith("http")) {
      const response = await fetch(coverImageUrl);
      buffer = Buffer.from(await response.arrayBuffer());
    } else {
      const localPath = path.join(process.cwd(), "uploads", coverImageUrl);
      if (!fs.existsSync(localPath)) return null;
      buffer = fs.readFileSync(localPath);
    }

    // ✅ Resize + compress
    const optimizedBuffer = await sharp(buffer)
      .resize(width)
      .webp({ quality: 80 })
      .toBuffer();

    // ✅ Convert to base64 (for inline preview)
    const base64 = `data:image/webp;base64,${optimizedBuffer.toString("base64")}`;
    return base64;
  } catch (err) {
    console.error("Error optimizing cover image:", err.message);
    return coverImageUrl; // fallback to original if Sharp fails
  }
}
