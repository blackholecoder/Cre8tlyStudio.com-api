// helpers/optimizeImageUpload.js
import sharp from "sharp";

/**
 * Optimize image before upload (Sharp)
 * @param {Buffer} buffer - raw file buffer
 * @param {string} mimetype - mime type
 * @param {number} maxWidth - optional resize width (default 1800)
 * @returns {Promise<{optimizedBuffer: Buffer, format: string, mimetype: string}>}
 */
export async function optimizeImageUpload(buffer, mimetype, options = {}) {
  const { purpose = "content", maxWidth = 1800 } = options;

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    const hasAlpha = Boolean(metadata.hasAlpha);
    const isPng = mimetype.includes("png");
    const isWebp = mimetype.includes("webp");

    // ✅ PNG WITH TRANSPARENCY → keep PNG
    if (isPng && hasAlpha) {
      const optimizedBuffer = await image
        .resize({ width: maxWidth, withoutEnlargement: true })
        .png({
          compressionLevel: 0,
          adaptiveFiltering: false,
        })
        .toBuffer();

      return {
        optimizedBuffer,
        format: "png",
        mimetype: "image/png",
        hasAlpha: true,
      };
    }

    // ❗ PNG WITHOUT TRANSPARENCY OR JPG/WEBP → convert to JPEG
    const optimizedBuffer = await image
      .resize({ width: maxWidth, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();

    return {
      optimizedBuffer,
      format: "jpeg",
      mimetype: "image/jpeg",
      hasAlpha: false,
    };
  } catch (err) {
    console.error("❌ Sharp optimization failed:", err);
    return {
      optimizedBuffer: buffer,
      format: "original",
      mimetype,
      hasAlpha: false,
    };
  }
}
