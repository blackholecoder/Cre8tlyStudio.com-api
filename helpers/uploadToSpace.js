import AWS from "aws-sdk";
import fs from "fs";

const spacesEndpoint = new AWS.Endpoint("nyc3.digitaloceanspaces.com");

const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
  region: "us-east-1", // DigitalOcean ignores this but SDK expects it
});

export async function uploadFileToSpaces(localPath, fileName, contentType = "application/pdf") {
  // 🧠 Ensure file exists
  if (!fs.existsSync(localPath)) {
    throw new Error(`File not found at path: ${localPath}`);
  }

  const fileContent = fs.readFileSync(localPath);

  // ✅ Spaces expects no leading slash in Key
  const safeKey = fileName.startsWith("/") ? fileName.slice(1) : fileName;

  const params = {
    Bucket: "cre8tlystudio", // Your exact Space name
    Key: safeKey,
    Body: fileContent,
    ACL: "public-read", // makes the file publicly accessible
    ContentType: contentType,
  };

  console.log("📤 Uploading to Spaces:", params.Key);

  const result = await s3.upload(params).promise();

  // 🧹 Delete local temp file after upload
  await fs.promises.unlink(localPath).catch(() =>
    console.warn("⚠️ Could not delete temp file:", localPath)
  );

  console.log("✅ Uploaded to:", result.Location);

  return result;
}
