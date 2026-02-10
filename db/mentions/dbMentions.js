import connect from "../connect.js";

export async function resolveMentionedUsers(usernames) {
  const db = connect();

  try {
    if (!Array.isArray(usernames) || usernames.length === 0) {
      return [];
    }

    const [rows] = await db.query(
      `
      SELECT id, username
      FROM users
      WHERE LOWER(username) IN (?)
      `,
      [usernames],
    );

    return rows || [];
  } catch (err) {
    console.error("❌ resolveMentionedUsers failed:", err);
    throw err;
  }
}
