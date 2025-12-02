import { v4 as uuidv4 } from "uuid";
import connect from "../../connect.js";

export async function createNotification({
  userId,
  actorId = null,
  type,
  referenceId,
  message
}) {
  const db = connect();
  const id = uuidv4();

  try {
    await db.query(
      `INSERT INTO user_notifications
        (id, user_id, actor_id, type, reference_id, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, actorId, type, referenceId, message]
    );

    return { success: true, id };
  } catch (err) {
    console.error("❌ createNotification error:", err);
    throw err;
  }
}

export async function getUserNotifications(userId, limit = 50, offset = 0) {
  const db = connect();

  try {
    const [rows] = await db.query(
      `
      SELECT n.*, 
             u.name AS actor_name,
             u.profile_image_url AS actor_image
      FROM user_notifications n
      LEFT JOIN users u ON u.id = n.actor_id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [userId, limit, offset]
    );

    return rows;
  } catch (err) {
    console.error("❌ getUserNotifications error:", err);
    throw err;
  }
}

export async function markNotificationRead(id, userId) {
  const db = connect();

  try {
    const [result] = await db.query(
      `
      UPDATE user_notifications
      SET is_read = 1
      WHERE id = ? AND user_id = ?
      `,
      [id, userId]
    );

    return result.affectedRows > 0;
  } catch (err) {
    console.error("❌ markNotificationRead error:", err);
    throw err;
  }
}

export async function getUnreadNotificationCount(userId) {
  const db = connect();

  try {
    const [[row]] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM user_notifications
      WHERE user_id = ? AND is_read = 0
      `,
      [userId]
    );

    return row.count || 0;
  } catch (err) {
    console.error("❌ getUnreadNotificationCount error:", err);
    throw err;
  }
}

export async function saveNotification({
  userId,
  actorId,
  type,          // "comment" or "reply"
  postId,
  parentId = null,
  commentId,
  referenceId, 
  message
}) {
  try {
    const db = connect();
    const id = crypto.randomUUID();

    await db.query(
      `
      INSERT INTO user_notifications
      (id, user_id, actor_id, type, message, reference_id, post_id, parent_id, comment_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        userId,
        actorId,
        type,
        message,
        referenceId, 
        postId,
        parentId,
        commentId
      ]
    );

    return id;
  } catch (err) {
    console.error("❌ Error saving notification:", err);
    throw err;
  }
}
