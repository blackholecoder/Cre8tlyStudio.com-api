import connect from "./connect.js";
import { v4 as uuidv4 } from "uuid";
import AWS from "aws-sdk";

export async function createEbook({ title, description, price, color, imageBase64, productType }) {
  const db = await connect();

  try {
    if (!title || !price || !productType || !imageBase64)
      throw new Error("Missing required fields");

    const id = uuidv4();
    const now = new Date();

    // ✅ Convert newlines to HTML paragraphs and auto-link URLs
    const formattedDescription = description
      ? description
          .split("\n")
          .map(line => {
            const withLinks = line.replace(
              /(https?:\/\/[^\s]+)/g,
              '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-headerGreen underline">$1</a>'
            );
            return `<p>${withLinks.trim()}</p>`;
          })
          .join("")
      : "";

    // ✅ Configure DigitalOcean Spaces
    const s3 = new AWS.S3({
      endpoint: process.env.DO_SPACES_ENDPOINT,
      accessKeyId: process.env.DO_SPACES_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET,
    });

    // ✅ Upload image to Spaces
    let imageUrl = null;
    if (imageBase64) {
      const base64Data = Buffer.from(
        imageBase64.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );

      const type = imageBase64.split(";")[0].split("/")[1];
      const filename = `ebooks/${uuidv4()}.${type}`;

      const params = {
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: filename,
        Body: base64Data,
        ACL: "public-read",
        ContentEncoding: "base64",
        ContentType: `image/${type}`,
      };

      const upload = await s3.upload(params).promise();
      imageUrl = upload.Location; // ✅ Final image URL
    }

    // ✅ Save ebook record in DB
    await db.query(
      `INSERT INTO ebooks (id, title, description, price, color, image_url, product_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, formattedDescription, price, color || "purple", imageUrl, productType, now]
    );

    await db.end();

    return {
      success: true,
      message: "Ebook created successfully",
      id,
      imageUrl,
    };
  } catch (err) {
    await db.end();
    console.error("Error creating ebook:", err);
    throw err;
  }
}

export async function getEbooks() {
  const db = await connect();

  try {
    const [rows] = await db.query("SELECT * FROM ebooks ORDER BY created_at DESC");
    await db.end();
    return rows;
  } catch (err) {
    await db.end();
    throw err;
  }
}

// 🗑️ Delete ebook + its image from DigitalOcean Spaces
export async function deleteEbook(ebookId) {
  const db = await connect();

  try {
    // 1️⃣ Fetch the ebook record to get its image URL
    const [rows] = await db.query("SELECT image_url FROM ebooks WHERE id = ?", [ebookId]);
    if (rows.length === 0) throw new Error("Ebook not found");

    const imageUrl = rows[0].image_url;
    const s3 = new AWS.S3({
      endpoint: "https://nyc3.digitaloceanspaces.com",
      accessKeyId: process.env.SPACES_KEY,
      secretAccessKey: process.env.SPACES_SECRET,
    });

    // 2️⃣ Extract the file path (everything after the bucket name)
    if (imageUrl && imageUrl.includes("cre8tlystudio.nyc3.digitaloceanspaces.com")) {
      const key = imageUrl.split("cre8tlystudio.nyc3.digitaloceanspaces.com/")[1];

      try {
        await s3
          .deleteObject({
            Bucket: process.env.SPACES_BUCKET || "cre8tlystudio",
            Key: key,
          })
          .promise();

        console.log("🧹 Deleted image from DigitalOcean:", key);
      } catch (s3Err) {
        console.warn("⚠️ Failed to delete image from Spaces:", s3Err.message);
      }
    }

    // 3️⃣ Delete the ebook from database
    await db.query("DELETE FROM ebooks WHERE id = ?", [ebookId]);
    await db.end();

    return {
      success: true,
      message: "Ebook and image deleted successfully",
    };
  } catch (err) {
    await db.end();
    console.error("Error deleting ebook:", err);
    throw err;
  }
}

export async function updateEbook({ id, title, description, price, color }) {
  const db = await connect();

  try {
    if (!id) throw new Error("Missing ebook ID");

    const fields = [];
    const values = [];

    if (title) {
      fields.push("title = ?");
      values.push(title);
    }
    if (description) {
      fields.push("description = ?");
      values.push(description);
    }
    if (price) {
      fields.push("price = ?");
      values.push(price);
    }
    if (color) {
      fields.push("color = ?");
      values.push(color);
    }

    if (fields.length === 0) throw new Error("No fields to update");

    values.push(id);

    await db.query(
      `UPDATE ebooks SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    await db.end();

    return {
      success: true,
      message: "Ebook updated successfully",
    };
  } catch (err) {
    await db.end();
    console.error("Error updating ebook:", err);
    throw err;
  }
}
