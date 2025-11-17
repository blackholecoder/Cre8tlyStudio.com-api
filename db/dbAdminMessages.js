import connect from "./connect.js";
import { v4 as uuidv4 } from "uuid";


// ✅ Get all active messages
export async function getAllAdminMessages(userId, offset = 0, limit = 20) {
  let db;
  try {
    db = connect();
    const [rows] = await db.query(
      `
      SELECT am.id, am.title, am.message, am.created_at,
             IF(umr.read_at IS NOT NULL, 1, 0) AS read_status
      FROM admin_messages am
      LEFT JOIN user_message_reads umr
        ON umr.message_id = am.id AND umr.user_id = ?
      WHERE am.deleted_at IS NULL
        AND (umr.deleted_at IS NULL OR umr.deleted_at IS NULL)
      ORDER BY am.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [userId, limit, offset]
    );
    return rows;
  } catch (err) {
    console.error("❌ Error in getAllAdminMessages:", err.message);
    throw new Error("Failed to fetch admin messages");
  } 
}




// ✅ Create new admin message
export async function createAdminMessage(adminId, title, message) {
  let db;
  try {
    db = connect();
    const id = uuidv4();

    await db.query(
      `INSERT INTO admin_messages (id, admin_id, title, message)
       VALUES (?, ?, ?, ?)`,
      [id, adminId, title, message]
    );

    return { id };
  } catch (err) {
    console.error("❌ Error in createAdminMessage:", err.message);
    throw new Error("Failed to create admin message");
  }
}

// ✅ Soft delete message
export async function softDeleteAdminMessage(id) {
  let db;
  try {
    db = connect();

    await db.query(
      `UPDATE admin_messages
       SET deleted_at = NOW()
       WHERE id = ?`,
      [id]
    );

    return { success: true };
  } catch (err) {
    console.error("❌ Error in softDeleteAdminMessage:", err.message);
    throw new Error("Failed to delete admin message");
  } 
}

// USER MESSAGES DB

export async function getUnreadMessageCount(userId) {
  let db;
  try {
    db = connect();
    const [rows] = await db.query(
      `
      SELECT COUNT(*) AS unread_count
      FROM admin_messages m
      LEFT JOIN user_message_reads r 
        ON r.message_id = m.id AND r.user_id = ?
      WHERE m.deleted_at IS NULL
        AND r.read_at IS NULL
      `,
      [userId]
    );
    return rows[0]?.unread_count || 0;
  } catch (err) {
    console.error("❌ Error in getUnreadMessageCount:", err);
    throw new Error("Failed to get unread messages");
  } 
}


export async function markMessageAsRead(userId, messageId) {
  let db;
  try {
    db = connect();
    await db.query(
      `
      INSERT INTO user_message_reads (id, user_id, message_id, read_at)
      VALUES (UUID(), ?, ?, NOW())
      ON DUPLICATE KEY UPDATE read_at = NOW()
      `,
      [userId, messageId]
    );
    return { success: true };
  } catch (err) {
    console.error("❌ Error marking message as read:", err);
    throw new Error("Failed to mark as read");
  } 
}


export async function softDeleteUserMessage(userId, messageId) {
  let db;
  try {
    db = connect();
    await db.query(
      `
      INSERT INTO user_message_reads (id, user_id, message_id, deleted_at)
      VALUES (UUID(), ?, ?, NOW())
      ON DUPLICATE KEY UPDATE deleted_at = NOW()
      `,
      [userId, messageId]
    );
    return { success: true };
  } catch (err) {
    console.error("❌ Error deleting user message:", err);
    throw new Error("Failed to delete message for user");
  } 
}
