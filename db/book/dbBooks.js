import { v4 as uuidv4 } from "uuid";
import connect from "../connect.js";

// ✅ Create a new empty book slot for a user
export async function createBook(userId, prompt) {
  const db = await connect();
  const id = uuidv4();
  const createdAt = new Date();

  const [existing] = await db.query("SELECT COUNT(*) AS total FROM generated_books WHERE user_id = ?", [userId]);
  const slotCount = existing[0].total;

  const status = prompt && prompt.trim() !== "" ? "pending" : "awaiting_prompt";

  await db.query(
    `INSERT INTO generated_books 
      (id, user_id, title, prompt, pdf_url, status, pages, created_at, slot_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      "Untitled Book",
      prompt || "",
      "",
      status,
      0, // ✅ Always start at 0 pages
      createdAt,
      slotCount + 1,
    ]
  );

  await db.end();
  return { id, status };
}

// ✅ Mark book as complete
export async function markBookComplete(id, pdfUrl) {
  const db = await connect();
  await db.query(
    `UPDATE generated_books 
     SET pdf_url=?, status='completed' 
     WHERE id=? AND deleted_at IS NULL`,
    [pdfUrl, id]
  );
  await db.end();
}

// ✅ Get all books for a user
export async function getBooksByUser(userId) {
  const db = await connect();
  const [rows] = await db.query(
    `SELECT id, user_id, title, slot_number, part_number, status, prompt, pdf_url, created_at
     FROM generated_books
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [userId]
  );
  await db.end();
  return rows;
}


// ✅ Get all books (admin)
export async function getAllBooks() {
  const db = await connect();
  const [rows] = await db.query(
    `SELECT id, user_id, title, slot_number, status, prompt, pdf_url, created_at
     FROM generated_books
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`
  );
  await db.end();
  return rows;
}

// ✅ Soft delete
export async function softDeleteBook(id) {
  const db = await connect();
  await db.query("UPDATE generated_books SET deleted_at=NOW() WHERE id=? AND deleted_at IS NULL", [id]);
  await db.end();
}

// ✅ Get single book by ID
export async function getBookById(id) {
  const db = await connect();
  const [rows] = await db.query("SELECT * FROM generated_books WHERE id = ?", [id]);
  await db.end();
  return rows[0] || null;
}

// ✅ Update prompt after submission
export async function updateBookPrompt(id, prompt) {
  const db = await connect();
  const [result] = await db.query(
    "UPDATE generated_books SET prompt=?, status='pending' WHERE id=? AND deleted_at IS NULL",
    [prompt, id]
  );
  await db.end();
  return result.affectedRows > 0;
}

// ✅ Save completed PDF and metadata
export async function saveBookPdf(
  bookId,
  userId,
  prompt,
  pdfUrl,
  partNumber = 1,
  title = null,
  gptOutput = null
) {
  const db = await connect();

  try {
    const safeTitle = title?.trim() || "Untitled";
    const safeOutput = gptOutput?.trim() || prompt?.trim() || "No content available";

    // ✅ 1. Upsert part (insert new or update existing)
    await db.query(
      `INSERT INTO book_parts 
        (book_id, user_id, part_number, title, gpt_output, file_url)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         title = VALUES(title),
         gpt_output = VALUES(gpt_output),
         file_url = VALUES(file_url),
         updated_at = CURRENT_TIMESTAMP`,
      [bookId, userId, partNumber, safeTitle, safeOutput, pdfUrl]
    );

    // ✅ 2. Update parent book info
    await db.query(
      `UPDATE generated_books
       SET status = 'completed',
           prompt = ?,
           pdf_url = ?,
           part_number = ?
       WHERE id = ? AND user_id = ?`,
      [prompt, pdfUrl, partNumber, bookId, userId]
    );
  } catch (err) {
    console.error("❌ Error saving book part:", err);
    throw err;
  } finally {
    await db.end();
  }
}



export async function getBookParts(bookId, userId) {
  const db = await connect();

  try {
    const [rows] = await db.query(
      `SELECT id, part_number, title, file_url, created_at
       FROM book_parts
       WHERE book_id = ? AND user_id = ?
       ORDER BY part_number ASC`,
      [bookId, userId]
    );
    return rows;
  } finally {
    await db.end();
  }
}