import connect from "../connect.js";

export async function getLastBookPartText(bookId, userId) {
  const db = connect();
  try {
    const [rows] = await db.execute(
      `SELECT gpt_output 
       FROM book_parts 
       WHERE book_id = ? AND user_id = ?
       ORDER BY part_number DESC 
       LIMIT 1`,
      [bookId, userId]
    );
    return rows.length ? rows[0].gpt_output : null;
  } catch (err) {
    console.error("❌ Error fetching last book part:", err);
    return null;
  }
}

export async function saveBookPartText({
  userId,
  bookId,
  partNumber,
  text,
  can_edit,
}) {
  const db = connect();
  try {
    await db.execute(
      `INSERT INTO book_parts (user_id, book_id, part_number, gpt_output, can_edit)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         gpt_output = VALUES(gpt_output),
         can_edit = VALUES(can_edit),
         updated_at = CURRENT_TIMESTAMP`,
      [userId, bookId, partNumber, text, can_edit]
    );
    console.log(`✅ Saved book part ${partNumber} for book ${bookId}`);
  } catch (err) {
    console.error("❌ Error saving book part text:", err);
    throw err;
  }
}
