import { v4 as uuidv4 } from "uuid";
import connect from "../connect.js";
import { generateBookPDF } from "../../services/generateBookPDF.js";
import { uploadFileToSpaces } from "../../helpers/uploadToSpace.js";
import fs from "fs";

// ✅ Create a new empty book slot for a user
export async function createBook(
  userId,
  prompt,
  book_name = "Untitled Book",
  authorName = null,
  bookType = "fiction"
) {
  const db = connect();
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
      (id, user_id, book_name, author_name, prompt, pdf_url, status, pages, created_at, slot_number, book_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      book_name?.trim() || "Untitled Book",
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

  return { id, status };
}

// ✅ Mark book as complete
export async function markBookComplete(id, pdfUrl) {
  const db = connect();
  await db.query(
    `UPDATE generated_books 
     SET pdf_url=?, status='completed' 
     WHERE id=? AND deleted_at IS NULL`,
    [pdfUrl, id]
  );
}

// ✅ Get all books for a user
export async function getBooksByUser(userId) {
  const db = connect();

  const [rows] = await db.query(
    `
    SELECT 
      g.id,
      g.user_id,
      g.book_name,
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

      (
        SELECT bp.can_edit 
        FROM book_parts bp
        WHERE bp.book_id = g.id 
          AND bp.user_id = g.user_id
        ORDER BY bp.part_number DESC
        LIMIT 1
      ) AS can_edit,


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

  return rows;
}

// ✅ Get all books (admin)
export async function getAllBooks() {
  const db = connect();
  const [rows] = await db.query(
    `SELECT id, user_id, book_name, slot_number, status, prompt, pdf_url, pages, created_at, author_name
     FROM generated_books
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`
  );
  return rows;
}

// ✅ Soft delete
export async function softDeleteBook(id) {
  const db = connect();
  await db.query(
    "UPDATE generated_books SET deleted_at=NOW() WHERE id=? AND deleted_at IS NULL",
    [id]
  );
}

// ✅ Get single book by ID
export async function getBookById(id) {
  const db = connect();

  // Pull the base book info
  const [rows] = await db.query(
    `
    SELECT 
      g.*,

      (
        SELECT bp.can_edit
        FROM book_parts bp
        WHERE bp.book_id = g.id
          AND bp.user_id = g.user_id
        ORDER BY bp.part_number DESC
        LIMIT 1
      ) AS can_edit

    FROM generated_books g
    WHERE g.id = ?
    LIMIT 1
    `,
    [id]
  );

  if (!rows[0]) return null;

  const book = rows[0];

  return {
    id: book.id,
    book_name: book.book_name,
    authorName: book.author_name,
    bookType: book.book_type,
    font_name: book.font_name,
    font_file: book.font_file,
    can_edit: book.can_edit, // ⚡ NEW
    ...book,
  };
}

export async function updateEditedChapter({
  bookId,
  userId,
  partNumber,
  editedText,
  title,
  bookName,
  authorName,
  font_name,
  font_file,
}) {
  let cleanText = editedText
    .replace(/<h1[^>]*>.*?<\/h1>/gi, "")
    .replace(/^# .*/gm, "")
    .trim();

  const db = connect();

  if (bookName) {
    await db.query(
      `UPDATE generated_books
     SET book_name = ?, updated_at = NOW()
     WHERE id = ? AND user_id = ?`,
      [bookName, bookId, userId]
    );
  }

  // 1. Save new edited text
  await db.query(
    `UPDATE book_parts
   SET 
     gpt_output = ?, 
     title = ?,                  
     can_edit = 0, 
     updated_at = NOW()
   WHERE book_id = ? 
     AND user_id = ? 
     AND part_number = ?`,
    [cleanText, title, bookId, userId, partNumber]
  );

  // 2. Regenerate PDF using edited text
  const chapters = [
    {
      title: title || `Part ${partNumber}`,
      content: cleanText,
    },
  ];

  const { localPdfPath, pageCount } = await generateBookPDF({
    id: `${bookId}-part${partNumber}`,
    title: title || `Part ${partNumber}`,
    author: authorName,
    chapters,
    font_name,
    font_file,
  });

  // 3. Upload PDF
  const fileName = `books/${bookId}_part${partNumber}_edited-${Date.now()}.pdf`;
  const uploaded = await uploadFileToSpaces(
    localPdfPath,
    fileName,
    "application/pdf"
  );

  await db.query(
    `UPDATE book_parts 
     SET file_url = ?, pages = ? 
     WHERE book_id = ? AND user_id = ? AND part_number = ?`,
    [uploaded.Location, pageCount, bookId, userId, partNumber]
  );

  try {
    if (fs.existsSync(localPdfPath)) {
      fs.unlinkSync(localPdfPath);
    }
  } catch (err) {
    console.warn(
      "⚠️ Could not delete local PDF (probably already removed):",
      err.message
    );
  }

  return uploaded.Location;
}

export async function getBookPartByNumber(bookId, partNumber, userId) {
  const db = connect();

  const [rows] = await db.query(
    `
      SELECT 
        id,
        book_id,
        user_id,
        part_number,
        title,
        gpt_output,
        draft_text,
        can_edit,
        created_at,
        updated_at
      FROM book_parts
      WHERE book_id = ? AND part_number = ? AND user_id = ?
      LIMIT 1
    `,
    [bookId, partNumber, userId]
  );

  if (!rows.length) return null;

  const row = rows[0];

  return {
    ...row,

    // 🟩 Always give the editor the correct text:
    // priority: user-edited draft > AI output > empty
    editor_text: row.draft_text || row.gpt_output || "",

    // Make sure can_edit is boolean
    can_edit: row.can_edit === 1 ? 1 : 0,
  };
}

export async function lockBookPartEdit(bookId, partNumber, userId) {
  const db = connect();
  await db.query(
    `UPDATE book_parts 
     SET can_edit = 0, updated_at = NOW()
     WHERE book_id = ? AND part_number = ? AND user_id = ?`,
    [bookId, partNumber, userId]
  );
}

// ✅ Update prompt after submission
export async function updateBookPrompt(id, prompt) {
  const db = connect();
  const [result] = await db.query(
    "UPDATE generated_books SET prompt=?, status='pending' WHERE id=? AND deleted_at IS NULL",
    [prompt, id]
  );
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
  const db = connect();

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
  }
}

export async function updateBookInfo(
  bookId,
  userId,
  bookName,
  authorName,
  bookType
) {
  const db = connect();

  try {
    await db.query(
      `UPDATE generated_books
         SET book_name = ?, author_name = ?, book_type = ?, updated_at = CURRENT_TIMESTAMP
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
  }
}

export async function getBookTypeById(bookId, userId) {
  const db = connect();
  try {
    const [rows] = await db.query(
      "SELECT book_type FROM generated_books WHERE id = ? AND user_id = ?",
      [bookId, userId]
    );
    return rows.length ? rows[0].book_type : null;
  } finally {
  }
}

export async function markBookOnboardingComplete(userId) {
  const db = connect();

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
  }
}

export async function resetBookOnboarding(userId) {
  const db = connect();

  try {
    await db.query(
      "UPDATE users SET has_completed_book_onboarding = 0 WHERE id = ?",
      [userId]
    );
    return { success: true };
  } catch (err) {
    console.error("❌ dbResetBookOnboarding error:", err);
    throw err;
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
  const db = connect();

  try {
    // ✅ Optional check: prevent duplicate parts
    if (partNumber) {
      const [existingPart] = await db.query(
        `SELECT id FROM book_parts WHERE book_id = ? AND user_id = ? AND part_number = ?`,
        [bookId, userId, partNumber]
      );

      if (existingPart.length > 0) {
        return {
          error: true,
          message: `Part ${partNumber} already submitted, cannot save draft.`,
        };
      }
    }

    if (!bookId) {
      throw new Error(
        "Missing bookId — each user must have a pre-created book row before saving a draft."
      );
    }

    // ✅ Update book draft with font info
    const [result] = await db.query(
      `
      UPDATE generated_books
      SET
        draft_text = ?,
        book_name = COALESCE(?, book_name),
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

    if (result.affectedRows === 0) {
      console.warn(`⚠️ No book found for user ${userId} with id ${bookId}`);
      return { error: true, message: "No matching book found" };
    }

    return { success: true, id: bookId, message: "Draft updated" };
  } catch (err) {
    console.error("❌ Error in saveBookDraft:", err);
    throw err;
  }
}

// Get existing draft by ID
export async function getBookDraft({ userId, bookId }) {
  const db = connect();

  try {
    const [rows] = await db.query(
      `
      SELECT
        g.id,
        g.book_name,
        g.draft_text,
        g.link,
        g.author_name,
        g.book_type,
        g.last_saved_at,
        g.font_name,
        g.font_file,

        -- 🔥 Pull the GPT output for Part 1
        (
          SELECT bp.gpt_output 
          FROM book_parts bp
          WHERE bp.book_id = g.id 
            AND bp.user_id = g.user_id
            AND bp.part_number = 1
          LIMIT 1
        ) AS gpt_output,

        -- 🔥 Also return can_edit for Part 1
        (
          SELECT bp.can_edit 
          FROM book_parts bp
          WHERE bp.book_id = g.id 
            AND bp.user_id = g.user_id
            AND bp.part_number = 1
          LIMIT 1
        ) AS can_edit,

        (
  SELECT bp.sections_json
  FROM book_parts bp
  WHERE bp.book_id = g.id
    AND bp.user_id = g.user_id
    AND bp.part_number = 1
  LIMIT 1
) AS sections_json

      FROM generated_books g
      WHERE g.id = ? AND g.user_id = ?
      LIMIT 1
      `,
      [bookId, userId]
    );

    return rows.length ? rows[0] : null;
  } catch (err) {
    console.error("❌ Error in getBookDraft:", err);
    throw err;
  }
}

export async function saveBookPartDraft({
  userId,
  bookId,
  partNumber,
  draftText,
  title,
  sections,
}) {
  const db = connect();

  try {
    const [existing] = await db.query(
      `SELECT id FROM book_parts WHERE book_id = ? AND user_id = ? AND part_number = ?`,
      [bookId, userId, partNumber]
    );

    if (existing.length) {
      await db.query(
        `UPDATE book_parts
         SET sections_json = ?, draft_text = ?, title = COALESCE(?, title), updated_at = NOW()
         WHERE book_id = ? AND user_id = ? AND part_number = ?`,
        [JSON.stringify(sections), draftText, title, bookId, userId, partNumber]
      );
    } else {
      await db.query(
        `INSERT INTO book_parts (
     book_id,
     user_id,
     part_number,
     title,
     draft_text,
     sections_json,
     gpt_output,
     created_at
   )
   VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          bookId,
          userId,
          partNumber,
          title,
          draftText,
          JSON.stringify(sections),
          "",
        ]
      );
    }

    return { message: "Part draft saved" };
  } catch (err) {
    console.error("❌ saveBookPartDraft error:", err);
    throw err;
  }
}

export async function getBookPartDraft(bookId, partNumber, userId) {
  const db = connect();

  const [rows] = await db.query(
    `
    SELECT 
      bp.id,
      bp.part_number,
      bp.title,
      bp.file_url,
      bp.pages,
      bp.created_at,
      bp.draft_text,
      bp.sections_json,
      bp.gpt_output,
      bp.can_edit,
      
      gb.book_name,
      gb.author_name,
      gb.book_type,
      gb.link,
      gb.font_name,
      gb.font_file
    FROM book_parts bp
    LEFT JOIN generated_books gb
      ON gb.id = bp.book_id
    WHERE bp.book_id = ?
      AND bp.part_number = ?
      AND bp.user_id = ?
    LIMIT 1
    `,
    [bookId, partNumber, userId]
  );

  return rows[0] || null;
}
