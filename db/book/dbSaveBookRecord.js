import connect from "../connect.js";
import { v4 as uuidv4 } from "uuid";

export async function saveBookRecord({
  userId,
  prompt,
  theme,
  pages = 0,
  logo,
  link,
  coverImage,
  fileUrl,
  title,
}) {
  const db = await connect();
  const bookId = uuidv4(); // ✅ Matches CHAR(36) UUID format

  try {
    await db.query(
      `INSERT INTO generated_books 
       (id, user_id, title, prompt, theme, pages, logo, link, cover_image, file_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        bookId,
        userId || null,
        title || "Untitled Book",
        prompt,
        theme,
        pages,
        logo,
        link,
        coverImage,
        fileUrl,
      ]
    );

    return {
      id: bookId,
      title: title || "Untitled Book",
      fileUrl,
      theme,
      pages,
    };
  } catch (err) {
    console.error("❌ Error saving book record:", err);
    throw err;
  } finally {
    if (db.release) db.release();
  }
}
