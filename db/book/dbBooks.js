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
    `
    SELECT 
      g.id,
      g.user_id,
      g.title AS book_name,
      g.slot_number,
      g.part_number,
      g.status,
      g.prompt,
      g.pdf_url,
      g.pages,
      g.created_at,
      g.created_at_prompt,
      g.author_name,
      g.is_draft,
      g.last_saved_at,
      g.font_name,    
      g.font_file, 
      -- ✅ NEW: tell us if Part 1 already exists
      EXISTS (
        SELECT 1 
        FROM book_parts p
        WHERE p.book_id = g.id 
          AND p.user_id = g.user_id 
          AND p.part_number = 1
      ) AS has_part_1
    FROM generated_books g
    WHERE g.user_id = ? 
      AND g.deleted_at IS NULL
    ORDER BY g.created_at DESC
    `,
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
    font_name: book.font_name, // ✅ added
    font_file: book.font_file, // ✅ added
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
  chapterTitle = null,
  gptOutput = null,
  pageCount = 0
) {
  try {
    const safeTitle = chapterTitle?.trim() || "Untitled Chapter";
    const safeOutput =
      gptOutput?.trim() || prompt?.trim() || "No content available";

    // ✅ 1. Insert or update this part (chapter)
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

    // ✅ 2. Sum total pages
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(pages), 0) AS totalPages
       FROM book_parts
       WHERE book_id = ? AND user_id = ?`,
      [bookId, userId]
    );
    let totalPages = rows[0].totalPages || 0;

    // ✅ 3. Cap at 750 max
    if (totalPages > 750) totalPages = 750;

    // ✅ 4. Status update
    const newStatus = totalPages >= 750 ? "completed" : "in_progress";

    // ✅ 5. Update parent record (without overwriting title)
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
      `📘 Saved book part ${partNumber} ("${safeTitle}"), total ${totalPages} pages (${newStatus})`
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

export async function updateBookInfo(bookId, userId, bookName, authorName, bookType) {
  const db = await connect();

  try {
    await db.query(
      `UPDATE generated_books
         SET title = ?, author_name = ?, book_type = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        bookName?.trim() || "Untitled Book",
        authorName?.trim() || null,
        bookType || "fiction",
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
  book_name, // maps to title
  link,
  author_name,
  book_type,
  partNumber = null,
  font_name,
  font_file,
}) {
  const db = await connect();

  try {
    // ✅ Optional check: prevent duplicate parts
    if (partNumber) {
      const [existingPart] = await db.query(
        `SELECT id FROM book_parts WHERE book_id = ? AND user_id = ? AND part_number = ?`,
        [bookId, userId, partNumber]
      );

      if (existingPart.length > 0) {
        await db.end();
        return { error: true, message: `Part ${partNumber} already submitted, cannot save draft.` };
      }
    }

    if (!bookId) {
      await db.end();
      throw new Error("Missing bookId — each user must have a pre-created book row before saving a draft.");
    }

    // ✅ Update book draft with font info
    const [result] = await db.query(
      `
      UPDATE generated_books
      SET
        draft_text = ?,
        title = COALESCE(?, title),
        link = ?,
        author_name = ?,
        book_type = ?,
        is_draft = 1,
        last_saved_at = NOW(),
        font_name = ?,
        font_file = ?
      WHERE id = ? AND user_id = ?
      `,
      [
        draftText,
        book_name,
        link,
        author_name,
        book_type,
        font_name,
        font_file,
        bookId,
        userId,
      ]
    );

    await db.end();

    if (result.affectedRows === 0) {
      console.warn(`⚠️ No book found for user ${userId} with id ${bookId}`);
      return { error: true, message: "No matching book found" };
    }

    return { success: true, id: bookId, message: "Draft updated" };
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
        last_saved_at,
        font_name,   
        font_file
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


export async function saveBookPartDraft({ userId, bookId, partNumber, draftText, title }) {
  const db = await connect();

  try {
    const [existing] = await db.query(
      `SELECT id FROM book_parts WHERE book_id = ? AND user_id = ? AND part_number = ?`,
      [bookId, userId, partNumber]
    );

    if (existing.length) {
      await db.query(
        `UPDATE book_parts
         SET draft_text = ?, title = COALESCE(?, title), updated_at = NOW()
         WHERE book_id = ? AND user_id = ? AND part_number = ?`,
        [draftText, title, bookId, userId, partNumber]
      );
    } else {
      await db.query(
        `INSERT INTO book_parts (book_id, user_id, part_number, title, draft_text, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [bookId, userId, partNumber, title, draftText]
      );
    }

    await db.end();
    return { message: "Part draft saved" };
  } catch (err) {
    await db.end();
    console.error("❌ saveBookPartDraft error:", err);
    throw err;
  }
}




