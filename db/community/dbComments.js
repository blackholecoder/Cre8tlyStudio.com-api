import connect from "../connect.js";
import { v4 as uuidv4 } from "uuid";
import { saveNotification } from "./notifications/notifications.js";

export async function addComment(postId, userId, body) {
  try {
    const db = connect();
    const commentId = uuidv4();

    // 1️⃣ Fetch post owner
    const [postRows] = await db.query(
      `SELECT user_id FROM community_posts WHERE id = ?`,
      [postId],
    );

    if (!postRows.length) throw new Error("Post not found");

    const postOwner = postRows[0].user_id;

    // 2️⃣ Save comment
    await db.query(
      `INSERT INTO community_comments (id, post_id, user_id, body, admin_seen)
       VALUES (?, ?, ?, ?, 0)`,
      [commentId, postId, userId, body.trim()],
    );

    // 3️⃣ Save notification (if not the owner)
    if (postOwner !== userId) {
      await saveNotification({
        userId: postOwner, // person receiving the notification
        actorId: userId, // person who made the comment
        type: "comment",
        postId, // ⭐ needed to open the correct post
        parentId: null, // ⭐ top-level comment
        commentId, // ⭐ the comment itself
        message: `commented on your post.`,
      });
    }

    return {
      id: commentId,
      post_id: postId,
      user_id: userId,
      body,
    };
  } catch (error) {
    console.error("❌ Error in addComment:", error);
    throw error;
  }
}

export async function getCommentsByPost(postId, userId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
  SELECT 
    c.id,
    c.body,
    c.created_at,
    u.name AS author,
    u.role AS author_role,
    u.profile_image_url AS author_image,

    (SELECT COUNT(*) FROM community_comments r WHERE r.parent_id = c.id) AS reply_count,

    (SELECT COUNT(*) FROM community_comment_likes l WHERE l.comment_id = c.id) AS like_count,
    (SELECT COUNT(*) FROM community_comment_likes l WHERE l.comment_id = c.id AND l.user_id = ?) AS user_liked

  FROM community_comments c
  JOIN users u ON c.user_id = u.id
  WHERE c.post_id = ? AND c.parent_id IS NULL
  ORDER BY c.created_at ASC
  `,
      [userId, postId], // reqUserId must come from auth in your route file
    );

    return rows;
  } catch (error) {
    console.error("Error in getCommentsByPost:", error);
    throw error;
  }
}

export async function getCommentsPaginated(
  postId,
  userId,
  page = 1,
  limit = 10,
) {
  try {
    const db = connect();
    const offset = (page - 1) * limit;

    const [comments] = await db.query(
      `
  SELECT 
    c.id,
    c.body,
    c.created_at,
    u.name AS author,
    u.role AS author_role,
    u.profile_image_url AS author_image,

    (SELECT COUNT(*) FROM community_comments r WHERE r.parent_id = c.id) AS reply_count,

    (SELECT COUNT(*) FROM community_comment_likes l WHERE l.comment_id = c.id) AS like_count,
    (SELECT COUNT(*) FROM community_comment_likes l WHERE l.comment_id = c.id AND l.user_id = ?) AS user_liked

  FROM community_comments c
  JOIN users u ON c.user_id = u.id
  WHERE c.post_id = ? AND c.parent_id IS NULL
  ORDER BY c.created_at ASC
  LIMIT ? OFFSET ?
  `,
      [userId, postId, limit, offset],
    );

    for (let c of comments) {
      const [replies] = await db.query(
        `
        SELECT 
          r.id,
          r.body,
          r.created_at,
          u.name AS author,
          u.role AS author_role,
          u.profile_image_url AS author_image
        FROM community_comments r
        JOIN users u ON r.user_id = u.id
        WHERE r.parent_id = ?
        ORDER BY r.created_at ASC
        `,
        [c.id],
      );

      c.replies = replies;
    }

    return comments;
  } catch (error) {
    console.error("Error in getCommentsPaginated:", error);
    throw error;
  }
}

export async function createReply(
  userId,
  postId,
  parentId,
  body,
  parentUserId,
) {
  try {
    const db = connect();
    const replyId = crypto.randomUUID();

    await db.query(
      `
      INSERT INTO community_comments (id, user_id, post_id, parent_id, body)
      VALUES (?, ?, ?, ?, ?)
      `,
      [replyId, userId, postId, parentId, body],
    );

    // 🔔 Send notification only if replying to someone else
    if (parentUserId && parentUserId !== userId) {
      await saveNotification({
        userId: parentUserId,
        actorId: userId,
        type: "reply",
        postId,
        parentId,
        commentId: replyId,
        message: "replied to your comment",
      });
    }

    return replyId;
  } catch (err) {
    console.error("❌ createReply failed:", err);
    throw err;
  }
}

export async function getParentCommentUserId(commentId) {
  const db = connect();

  const [rows] = await db.query(
    "SELECT user_id FROM community_comments WHERE id = ?",
    [commentId],
  );

  return rows?.[0]?.user_id || null;
}

export async function getRepliesPaginated(parentId, userId, limit, offset) {
  const db = connect();

  const [rows] = await db.query(
    `
    SELECT 
      c.id,
      c.parent_id, 
      c.body,
      c.created_at,
      u.name AS author,
      u.role AS author_role,
      u.profile_image_url AS author_image,

      /* ❤️ Total likes */
      (SELECT COUNT(*) 
       FROM community_comment_likes l 
       WHERE l.comment_id = c.id) AS like_count,

      /* ❤️ Whether user liked */
      (SELECT COUNT(*) 
       FROM community_comment_likes l 
       WHERE l.comment_id = c.id AND l.user_id = ?) AS user_liked,

      /* 🔥 Correct reply count for ANY depth */
      (SELECT COUNT(*) 
       FROM community_comments cc2 
       WHERE cc2.parent_id = c.id) AS reply_count

    FROM community_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.parent_id = ?
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT ? OFFSET ?
    `,
    [userId, parentId, limit, offset],
  );

  const [[totalRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM community_comments
    WHERE parent_id = ?
    `,
    [parentId],
  );

  return {
    rows: rows.map((r) => ({
      ...r,
      like_count: Number(r.like_count) || 0,
      user_liked: Number(r.user_liked) || 0,
      reply_count: Number(r.reply_count) || 0,
    })),
    total: totalRow.total,
  };
}

export async function updateComment(commentId, userId, body) {
  try {
    const db = connect();

    // Only allow editing your own comment OR admin editing anything
    await db.query(
      `
      UPDATE community_comments
      SET body = ?, updated_at = NOW()
      WHERE id = ? AND (user_id = ? OR ? = 'admin')
      `,
      [body, commentId, userId, userId],
    );

    return true;
  } catch (error) {
    console.error("Error updating comment:", error);
    throw error;
  }
}

export async function deleteComment(commentId, userId, role) {
  try {
    const db = connect();

    // Check who owns the comment
    const [rows] = await db.query(
      `SELECT user_id FROM community_comments WHERE id = ?`,
      [commentId],
    );

    if (rows.length === 0) {
      return { success: false, message: "Comment not found" };
    }

    const ownerId = rows[0].user_id;

    // Only author OR admin can delete
    if (ownerId !== userId && role !== "admin") {
      return { success: false, message: "Unauthorized" };
    }

    // Delete (replies cascade if you're using ON DELETE CASCADE)
    await db.query(`DELETE FROM community_comments WHERE id = ?`, [commentId]);

    return { success: true };
  } catch (err) {
    console.error("Error deleting comment:", err);
    throw err;
  }
}

// LIKES

export async function likeComment(commentId, userId) {
  const db = connect();

  try {
    // Insert like
    await db.query(
      `
      INSERT IGNORE INTO community_comment_likes (id, comment_id, user_id)
      VALUES (UUID(), ?, ?)
      `,
      [commentId, userId],
    );

    // OPTIONAL: Send notification
    // Get the comment owner
    const [rows] = await db.query(
      `SELECT user_id FROM community_comments WHERE id = ?`,
      [commentId],
    );

    if (rows.length) {
      const ownerId = rows[0].user_id;

      // Don't notify yourself
      if (ownerId !== userId) {
        await saveNotification({
          userId: ownerId,
          actorId: userId,
          type: "like",
          referenceId: commentId,
          message: `Someone liked your comment.`,
        });
      }
    }

    return true;
  } catch (err) {
    console.error("❌ Error in likeComment:", err);
    throw err;
  }
}

// --- Remove Like ---
export async function unlikeComment(commentId, userId) {
  const db = connect();

  try {
    await db.query(
      `
      DELETE FROM community_comment_likes 
      WHERE comment_id = ? AND user_id = ?
      `,
      [commentId, userId],
    );

    return true;
  } catch (err) {
    console.error("❌ Error in unlikeComment:", err);
    throw err;
  }
}

// --- Count Likes ---
export async function getLikesForComment(commentId) {
  const db = connect();

  try {
    const [rows] = await db.query(
      `
      SELECT COUNT(*) AS likes 
      FROM community_comment_likes 
      WHERE comment_id = ?
      `,
      [commentId],
    );

    return rows[0]?.likes || 0;
  } catch (err) {
    console.error("❌ Error in getLikesForComment:", err);
    throw err;
  }
}

// --- Check if user already liked ---
export async function userLikedComment(commentId, userId) {
  const db = connect();

  try {
    const [rows] = await db.query(
      `
      SELECT 1 
      FROM community_comment_likes
      WHERE comment_id = ? AND user_id = ?
      LIMIT 1
      `,
      [commentId, userId],
    );

    return rows.length > 0;
  } catch (err) {
    console.error("❌ Error in userLikedComment:", err);
    throw err;
  }
}
