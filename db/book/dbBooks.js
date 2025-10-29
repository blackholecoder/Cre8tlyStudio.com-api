import { v4 as uuidv4 } from "uuid";
import connect from "../connect.js";

// ✅ Create a new empty book slot for a user
export async function createBook(userId, prompt, title = "Untitled Book", authorName = null, bookType = "fiction") {
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
      (id, user_id, title, author_name, prompt, pdf_url, status, pages, created_at, slot_number, book_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      bookType,
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
    `SELECT id, user_id, title AS book_name, slot_number, part_number, status, prompt, pdf_url, pages, created_at, created_at_prompt, author_name, is_draft,
        last_saved_at
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
  const [rows] = await db.query("SELECT * FROM generated_books WHERE id = ?", [id]);
  await db.end();

  if (!rows[0]) return null;

  const book = rows[0];
  return {
    id: book.id,
    title: book.title,
    authorName: book.author_name,
    bookType: book.book_type, // ✅ normalized
    ...book, // keep everything else
  };
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
  pageCount = 0 
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
  created_at_prompt = NOW(),
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

export async function updateBookInfo(bookId, userId, title, authorName, bookType) {
  const db = await connect();

  try {
    await db.query(
      `UPDATE generated_books
         SET title = ?, author_name = ?, book_type = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        title?.trim() || "Untitled Book",
        authorName?.trim() || null,
        bookType || "fiction", // ✅ add bookType argument
        bookId,
        userId,
      ]
    );
  } catch (err) {
    console.error("❌ updateBookInfo failed:", err.message);
    throw err;
  } finally {
    await db.end();
  }
}

export async function getBookTypeById(bookId, userId) {
  const db = await connect();
  try {
    const [rows] = await db.query(
      "SELECT book_type FROM generated_books WHERE id = ? AND user_id = ?",
      [bookId, userId]
    );
    return rows.length ? rows[0].book_type : null;
  } finally {
    await db.end();
  }
}

export async function markBookOnboardingComplete(userId) {
  const db = await connect();

  try {
    const [result] = await db.query(
      "UPDATE users SET has_completed_book_onboarding = 1 WHERE id = ?",
      [userId]
    );

    // Optional: confirm it actually updated a row
    if (result.affectedRows === 0) {
      console.warn(`⚠️ No user found with id: ${userId}`);
      return { success: false, message: "User not found" };
    }

    return { success: true };
  } catch (err) {
    console.error("❌ Database error updating onboarding:", err);
    return { success: false, message: "Database update failed", error: err };
  } finally {
    if (db) await db.end();
  }
}

export async function resetBookOnboarding(userId) {
  const db = await connect();

  try {
    await db.query(
      "UPDATE users SET has_completed_book_onboarding = 0 WHERE id = ?",
      [userId]
    );
    return { success: true };
  } catch (err) {
    console.error("❌ dbResetBookOnboarding error:", err);
    throw err;
  } finally {
    await db.end();
  }
}

export async function saveBookDraft({
  userId,
  bookId,
  draftText,
  book_name, // this is the BOOK TITLE, will map to `title` in DB
  link,
  author_name,
  book_type,
}) {
  const db = await connect();

  try {
    if (bookId) {
      // ✅ Update existing draft
      await db.query(
        `
        UPDATE generated_books
        SET
          draft_text = ?,
          title = COALESCE(?, title),
          link = ?,
          author_name = ?,
          book_type = ?,
          is_draft = 1,
          last_saved_at = NOW()
        WHERE id = ? AND user_id = ?
        `,
        [draftText, book_name, link, author_name, book_type, bookId, userId]
      );

      await db.end();
      return { message: "Draft updated" };
    } else {
      // ✅ Create new draft
      const [result] = await db.query(
        `
        INSERT INTO generated_books
          (id, user_id, title, draft_text, link, author_name, book_type, is_draft, created_at, last_saved_at)
        VALUES
          (UUID(), ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
        `,
        [
          userId,
          book_name || "Untitled Book",
          draftText || "",
          link || "",
          author_name || null,
          book_type || "fiction",
        ]
      );

      await db.end();
      return { id: result.insertId, message: "Draft created" };
    }
  } catch (err) {
    await db.end();
    console.error("❌ Error in saveBookDraft:", err);
    throw err;
  }
}


// Get existing draft by ID
export async function getBookDraft({ userId, bookId }) {
  const db = await connect();

  try {
    const [rows] = await db.query(
      `
      SELECT
        id,
        title AS book_name,
        draft_text,
        link,
        author_name,
        book_type,
        last_saved_at
      FROM generated_books
      WHERE id = ? AND user_id = ? AND is_draft = 1
      `,
      [bookId, userId]
    );

    await db.end();
    return rows.length ? rows[0] : null;
  } catch (err) {
    await db.end();
    console.error("❌ Error in getBookDraft:", err);
    throw err;
  }
}



