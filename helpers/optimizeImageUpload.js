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
    const isPng  = mimetype.includes("png");
    const isWebp = mimetype.includes("webp");

    // PNGs → keep full quality + transparency
    if (isPng) {
      const optimizedBuffer = await sharp(buffer)
        .trim()
        .resize({ width: maxWidth, withoutEnlargement: true })
        .png({
          compressionLevel: 0,   // ✨ KEEP SHARPNESS
          adaptiveFiltering: false
        })
        .toBuffer();

      return { optimizedBuffer, format: "png", mimetype: "image/png" };
    }

    // JPG / WEBP optimization
    const format = isWebp ? "webp" : "jpeg";
    const optimizedBuffer = await sharp(buffer)
      .resize({ width: maxWidth, withoutEnlargement: true })
      [format]({ quality: 80 })
      .toBuffer();

    const outputMime =
      format === "webp" ? "image/webp" : "image/jpeg";

    return { optimizedBuffer, format, mimetype: outputMime };

  } catch (err) {
    console.error("❌ Sharp optimization failed:", err);
    return { optimizedBuffer: buffer, format: "original", mimetype };
  }
}


