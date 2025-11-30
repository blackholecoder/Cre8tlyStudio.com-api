// helpers/optimizeImageUpload.js
import sharp from "sharp";

/**
 * Optimize image before upload (Sharp)
 * @param {Buffer} buffer - raw file buffer
 * @param {string} mimetype - mime type
 * @param {number} maxWidth - optional resize width (default 1800)
 * @returns {Promise<{optimizedBuffer: Buffer, format: string, mimetype: string}>}
 */
export async function optimizeImageUpload(buffer, mimetype, maxWidth = 1800) {
  try {
    const isJpeg = mimetype.includes("jpeg") || mimetype.includes("jpg");
    const isPng = mimetype.includes("png");
    const isWebp = mimetype.includes("webp");

    const format = isWebp ? "webp" : "jpeg"; // prefer WebP output
    const optimizedBuffer = await sharp(buffer)
      .resize({ width: maxWidth, withoutEnlargement: true })
      [format]({ quality: 80 })
      .toBuffer();

    const outputMime =
      format === "webp"
        ? "image/webp"
        : isJpeg
        ? "image/jpeg"
        : isPng
        ? "image/png"
        : "image/webp";

    return { optimizedBuffer, format, mimetype: outputMime };
  } catch (err) {
    console.error("❌ Sharp optimization failed:", err);
    return { optimizedBuffer: buffer, format: "original", mimetype };
  }
}
