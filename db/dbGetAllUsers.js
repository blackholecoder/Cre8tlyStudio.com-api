import { v4 as uuidv4 } from "uuid";
import connect from "./connect.js";

export async function getAllUsers() {
  const db = await connect();
  const page = 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const [rows] = await db.query(
    `
  SELECT id, name, email, role, created_at
  FROM users
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?;
`,
    [limit, offset]
  );
  return rows;
}


export async function deleteUserById(userId) {
  const db = await connect();

  try {
    // 1️⃣ Verify user exists
    const [rows] = await db.query("SELECT id, email FROM users WHERE id = ?", [userId]);
    if (rows.length === 0) throw new Error("User not found");

    const user = rows[0];

    // 2️⃣ Delete all lead magnet slots for this user
    const [slotsResult] = await db.query("DELETE FROM lead_magnets WHERE user_id = ?", [userId]);
    console.log(`🧹 Deleted ${slotsResult.affectedRows} lead magnet slots for user ${user.email}`);

    // 3️⃣ Delete the user record
    const [result] = await db.query("DELETE FROM users WHERE id = ?", [userId]);

    await db.end();

    return {
      success: true,
      message: `User ${user.email} and all associated lead magnet slots deleted successfully`,
      deletedSlots: slotsResult.affectedRows,
      result,
    };
  } catch (err) {
    await db.end();
    console.error("❌ Error deleting user and slots:", err);
    throw err;
  }
}
