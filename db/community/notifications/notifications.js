import connect from "../../connect.js";

export async function getUserNotifications(userId, limit = 50, offset = 0) {
  const db = connect();

  try {
    const [rows] = await db.query(
      `
      SELECT
        n.id,
        n.user_id,
        n.actor_id,
        n.type,
        n.message,  
        n.reference_id,
        n.is_read,
        n.created_at,

        /* 🔹 target resolution */
        CASE
          WHEN n.post_id IS NOT NULL THEN 'post'
          ELSE 'fragment'
        END AS target_type,

        CASE
          WHEN n.post_id IS NOT NULL THEN n.post_id
          ELSE n.fragment_id
        END AS target_id,


        /* 🔹 actor */
        u.name AS actor_name,
        u.profile_image_url AS actor_image,

        /* 🔹 post preview (only when post) */
        p.image_url AS post_image,
        p.title AS post_title

      FROM user_notifications n

      LEFT JOIN users u
        ON u.id = n.actor_id

      LEFT JOIN community_posts p
        ON p.id = n.post_id
        AND p.deleted_at IS NULL

      WHERE n.user_id = ?
        AND n.created_at >= NOW() - INTERVAL 45 DAY

      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [userId, limit, offset],
    );

    return rows;
  } catch (err) {
    console.error("❌ getUserNotifications error:", err);
    throw err;
  }
}

export async function markNotificationsRead(userId, ids = []) {
  if (!ids.length) return;

  const db = connect();

  await db.query(
    `
    UPDATE user_notifications
    SET is_read = 1
    WHERE user_id = ?
      AND id IN (?)
      AND is_read = 0
    `,
    [userId, ids],
  );
}

export async function getUnreadNotificationCount(userId) {
  const db = connect();

  try {
    const [[row]] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM user_notifications
      WHERE user_id = ?
        AND is_read = 0
        AND created_at >= NOW() - INTERVAL 45 DAY
      `,
      [userId],
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
  type, // e.g. "post_like", "comment", "reply", "fragment_comment"
  postId = null, // ONLY for posts
  fragmentId = null,
  parentId = null,
  commentId = null,
  referenceId = null,
  message,
}) {
  const db = connect();
  const id = crypto.randomUUID();

  try {
    // 🔐 Single source of truth for navigation
    const resolvedReferenceId =
      referenceId ??
      fragmentId ??
      commentId ??
      parentId ??
      postId ??
      (type === "subscription" ? actorId : null);

    if (!resolvedReferenceId) {
      throw new Error("Notification reference_id could not be resolved");
    }

    await db.query(
      `
      INSERT INTO user_notifications
      (
        id,
        user_id,
        actor_id,
        type,
        message,
        reference_id,
        fragment_id,
        post_id,
        parent_id,
        comment_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        userId,
        actorId,
        type,
        message,
        resolvedReferenceId,
        fragmentId,
        postId, // NULL for fragments ✅
        parentId,
        commentId,
      ],
    );

    return id;
  } catch (err) {
    console.error("❌ Error saving notification:", err);
    throw err;
  }
}
