import AWS from "aws-sdk";
import fs from "fs";

const spacesEndpoint = new AWS.Endpoint("nyc3.digitaloceanspaces.com");

const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
  region: "us-east-1",
});

/**
 * Upload either a local file path or buffer directly to DigitalOcean Spaces.
 * Automatically deletes temp files if applicable.
 */
export async function uploadFileToSpaces(
  input,
  fileName,
  contentType = "application/octet-stream"
) {
  try {
    let fileContent;

    if (Buffer.isBuffer(input)) {
      // logo, cover image, etc.
      fileContent = input;
    } else if (typeof input === "string" && fs.existsSync(input)) {
      // path from disk (PDF, temporary export)
      fileContent = fs.readFileSync(input);
    } else {
      throw new Error("Invalid file input — must be buffer or existing path");
    }

    const safeKey = fileName.startsWith("/") ? fileName.slice(1) : fileName;

    const params = {
      Bucket: "cre8tlystudio",
      Key: safeKey,
      Body: fileContent,
      ACL: "public-read",
      ContentType: contentType,
    };

    const result = await s3.upload(params).promise();

    // if it's a temp file, remove it
    if (typeof input === "string") {
      await fs.promises.unlink(input).catch(() =>
        console.warn("⚠️ Could not delete temp file:", input)
      );
    }

    return result;
  } catch (err) {
    console.error("❌ uploadFileToSpaces failed:", err);
    throw err;
  }
}

