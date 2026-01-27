// helpers/optimizeImageUpload.js
import sharp from "sharp";

export async function optimizeImageUpload(buffer, mimetype, options = {}) {
  const { purpose = "content", maxWidth = 1800 } = options;

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    const hasAlpha = Boolean(metadata.hasAlpha);
     const isPng = mimetype === "image/png";
    const isWebp = mimetype === "image/webp";

    // ✅ PNG WITH TRANSPARENCY → keep PNG
    if ((isPng || isWebp) && hasAlpha) {
      const optimizedBuffer = await image
        .resize({ width: maxWidth, withoutEnlargement: true })
        .toFormat(isPng ? "png" : "webp", {
          quality: 85,
        })
        .toBuffer();

      return {
        optimizedBuffer,
        format: isPng ? "png" : "webp",
        mimetype: isPng ? "image/png" : "image/webp",
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
