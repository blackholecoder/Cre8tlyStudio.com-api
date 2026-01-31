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
      [bookId, userId],
    );
    return rows.length ? rows[0].gpt_output : null;
  } catch (err) {
    console.error("❌ Error fetching last book part:", err);
    return null;
  }
}

export async function saveBookPartText({ userId, bookId, partNumber, text }) {
  const db = connect();
  try {
    await db.execute(
      `INSERT INTO book_parts (user_id, book_id, part_number, gpt_output)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         gpt_output = VALUES(gpt_output),
         updated_at = CURRENT_TIMESTAMP`,
      [userId, bookId, partNumber, text],
    );
    console.log(`✅ Saved book part ${partNumber} for book ${bookId}`);
  } catch (err) {
    console.error("❌ Error saving book part text:", err);
    throw err;
  }
}

export async function saveBookPartSections({
  userId,
  bookId,
  partNumber,
  sections,
}) {
  const db = connect();

  if (!Array.isArray(sections) || !sections.length) return;

  await db.execute(
    `UPDATE book_parts
     SET sections_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND book_id = ? AND part_number = ?`,
    [JSON.stringify(sections), userId, bookId, partNumber],
  );
}
