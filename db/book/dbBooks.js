import { v4 as uuidv4 } from "uuid";
import connect from "../connect.js";

// ✅ Create a new empty book slot for a user
export async function createBook(userId, prompt, title = "Untitled Book", authorName = null) {
  const db = await connect();
  const id = uuidv4();
  const createdAt = new Date();

  const [existing] = await db.query(
    "SELECT COUNT(*) AS total FROM generated_books WHERE user_id = ?",
    [userId]
  );
  const slotCount = existing[0].total;

  const status = prompt && prompt.trim() !== "" ? "pending" : "awaiting_prompt";

  await db.query(
    `INSERT INTO generated_books 
      (id, user_id, title, author_name, prompt, pdf_url, status, pages, created_at, slot_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      title?.trim() || "Untitled Book",
      authorName,
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
    `SELECT id, user_id, title AS book_name, slot_number, part_number, status, prompt, pdf_url, pages, created_at, author_name
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
    `SELECT id, user_id, title, slot_number, status, prompt, pdf_url, pages, created_at, author_name
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
  await db.query(
    "UPDATE generated_books SET deleted_at=NOW() WHERE id=? AND deleted_at IS NULL",
    [id]
  );
  await db.end();
}

// ✅ Get single book by ID
export async function getBookById(id) {
  const db = await connect();
  const [rows] = await db.query("SELECT * FROM generated_books WHERE id = ?", [
    id,
  ]);
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

export async function saveBookPdf(
  db,
  bookId,
  userId,
  prompt,
  pdfUrl,
  partNumber = 1,
  title = null,
  gptOutput = null,
  pageCount = 0 // 👈 must be passed from createBookPrompt → processBookPrompt
) {
  try {
    const safeTitle = title?.trim() || "Untitled";
    const safeOutput =
      gptOutput?.trim() || prompt?.trim() || "No content available";

    // ✅ 1. Insert or update this part
    await db.query(
      `INSERT INTO book_parts 
        (book_id, user_id, part_number, title, gpt_output, file_url, pages)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         title = VALUES(title),
         gpt_output = VALUES(gpt_output),
         file_url = VALUES(file_url),
         pages = VALUES(pages),
         updated_at = CURRENT_TIMESTAMP`,
      [bookId, userId, partNumber, safeTitle, safeOutput, pdfUrl, pageCount]
    );

    // ✅ 2. Sum total pages for this book
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(pages), 0) AS totalPages
       FROM book_parts
       WHERE book_id = ? AND user_id = ?`,
      [bookId, userId]
    );
    let totalPages = rows[0].totalPages || 0;

    // ✅ 3. Cap at 750 max pages per slot
    if (totalPages > 750) totalPages = 750;

    // ✅ 4. Determine status
    const newStatus = totalPages >= 750 ? "completed" : "in_progress";

    // ✅ 5. Update parent record
    // ✅ 5. Update parent record (preserves original book title unless user edits it)
    await db.query(
      `UPDATE generated_books 
SET 
  status = ?,
  pages = ?,
  prompt = ?,
  pdf_url = ?,
  part_number = ?,
  updated_at = CURRENT_TIMESTAMP
WHERE id = ? AND user_id = ?`,
      [newStatus, totalPages, prompt, pdfUrl, partNumber, bookId, userId]
    );

    console.log(
      `📘 Saved book part ${partNumber}, total ${totalPages} pages (${newStatus})`
    );
  } catch (err) {
    console.error("❌ Error saving book part:", err);
    throw err;
  }
}

export async function getBookParts(bookId, userId) {
  const db = await connect();

  try {
    const [rows] = await db.query(
      `SELECT id, part_number, title, file_url, pages, created_at
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

export async function updateBookInfo(bookId, userId, title, authorName) {
  const db = await connect();

  try {
    await db.query(
      `UPDATE generated_books
         SET title = ?, author_name = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [title?.trim() || "Untitled Book", authorName?.trim() || null, bookId, userId]
    );
  } catch (err) {
    console.error("❌ updateBookInfo failed:", err.message);
    throw err;
  } finally {
    await db.end();
  }
}
