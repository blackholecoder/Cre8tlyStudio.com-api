import connect from "../connect.js";


export async function giveFreeBooks(userId, count = 5) {
  const db = await connect();

  try {
    // 1️⃣ Give free book slots
    for (let i = 0; i < count; i++) {
      await db.query(
        `INSERT INTO generated_books 
          (id, user_id, prompt, status, created_at, slot_number, pages, part_number)
         VALUES (UUID(), ?, '', 'awaiting_prompt', NOW(), ?, 0, ?)`,
        [userId, i + 1, i + 1]
      );
    }

    // 2️⃣ Update user to reflect book access
    await db.query(
      `UPDATE users 
       SET has_book = 1, book_slots = ? 
       WHERE id = ?`,
      [count, userId]
    );

    return { success: true, count };
  } catch (err) {
    console.error("❌ giveFreeBooks error:", err);
    return { success: false, error: err.message };
  } finally {
    await db.end();
  }
}
