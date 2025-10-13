import connect from "../connect.js";


export async function giveFreeBooks(userId, count = 5) {
  const db = await connect();

  for (let i = 0; i < count; i++) {
    await db.query(
      `INSERT INTO generated_books (id, user_id, prompt, status, created_at, slot_number, pages, part_number)
       VALUES (UUID(), ?, '', 'awaiting_prompt', NOW(), ?, 0, ?)`,
      [userId, i + 1, i + 1]
    );
  }

  return { success: true, count };
}