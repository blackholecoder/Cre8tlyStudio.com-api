import connect from "../connect.js";
import { v4 as uuidv4 } from "uuid";
import { saveNotification } from "./notifications/notifications.js";
import { incrementSubscriberActivity } from "./subscriptions/dbSubscribers.js";
import { ACTIVITY_POINTS } from "../../helpers/activityPoints.js";
import { getCommentPreview } from "../../utils/getCommentPreview.js";
import { sendOutLookMail } from "../../utils/sendOutllokMail.js";
import { extractMentions } from "../../utils/extractMentions.js";
import { checkCommentBadges } from "../badges/dbBadges.js";

export async function addCommentToTarget({
  targetId,
  targetType, // 'post' | 'fragment'
  userId,
  body,
}) {
  try {
    const db = connect();
    const commentId = uuidv4();

    const cleanBody = body?.trim();
    if (!cleanBody) {
      throw new Error("Comment body is empty");
    }

    let ownerUserId = null;

    // 1️⃣ Fetch owner based on target type
    if (targetType === "post") {
      const [[post]] = await db.query(
        `SELECT user_id FROM community_posts WHERE id = ? LIMIT 1`,
        [targetId],
      );
      if (!post) throw new Error("Post not found");
      ownerUserId = post.user_id;
    }

    if (targetType === "fragment") {
      const [[fragment]] = await db.query(
        `SELECT user_id FROM fragments WHERE id = ? LIMIT 1`,
        [targetId],
      );
      if (!fragment) throw new Error("Fragment not found");
      ownerUserId = fragment.user_id;
    }

    // 2️⃣ Save comment (polymorphic)
    await db.query(
      `
      INSERT INTO community_comments (
        id,
        user_id,
        body,
        admin_seen,
        target_id,
        target_type
      ) VALUES (?, ?, ?, 0, ?, ?)
      `,
      [commentId, userId, cleanBody, targetId, targetType],
    );

    // 3️⃣ Mentions (still post-aware for now)
    if (targetType === "post") {
      await saveCommentMentions({
        commentId,
        postId: targetId,
        actorUserId: userId,
        body: cleanBody,
      });
    }

    // 4️⃣ Subscriber activity (posts only)
    if (targetType === "post" && ownerUserId !== userId) {
      await incrementSubscriberActivity({
        authorUserId: ownerUserId,
        subscriberUserId: userId,
        points: ACTIVITY_POINTS.COMMENT,
      });
    }

    // 5️⃣ Increment cached counters
    if (targetType === "post") {
      await db.query(
        `
        INSERT INTO community_post_stats (post_id, comment_count)
        VALUES (?, 1)
        ON DUPLICATE KEY UPDATE
          comment_count = comment_count + 1
        `,
        [targetId],
      );
    }

    if (targetType === "fragment") {
      await db.query(
        `
        UPDATE fragments
        SET comment_count = comment_count + 1
        WHERE id = ?
        `,
        [targetId],
      );
    }

    // 6️⃣ Notifications
    if (ownerUserId && ownerUserId !== userId) {
      await saveNotification({
        userId: ownerUserId,
        actorId: userId,
        type: targetType === "post" ? "comment" : "fragment_comment",
        postId: targetType === "post" ? targetId : null,
        fragmentId: targetType === "fragment" ? targetId : null, // ✅ THIS
        parentId: null,
        commentId,
        message:
          targetType === "post"
            ? "commented on your post."
            : "commented on your fragment.",
      });
    }

    // 7️⃣ Hydrate + email (posts only for now)
    let hydratedComment = await getCommentById(commentId, userId);

    if (targetType === "post" && ownerUserId !== userId) {
      try {
        const [[author]] = await db.query(
          `SELECT email, name FROM users WHERE id = ? LIMIT 1`,
          [ownerUserId],
        );

        if (author?.email) {
          const preview = getCommentPreview(cleanBody);

          await sendNewCommentEmail({
            to: author.email,
            commenterName: hydratedComment.author || "Someone",
            commentPreview: preview,
            postSlug: hydratedComment.post_slug,
          });
        }
      } catch (err) {
        console.error("⚠️ Comment email failed:", err);
      }
    }

    await checkCommentBadges(userId);

    return hydratedComment;
  } catch (error) {
    console.error("❌ Error in addCommentToTarget:", error);
    throw error;
  }
}

export async function addComment(postId, userId, body) {
  return addCommentToTarget({
    targetId: postId,
    targetType: "post",
    userId,
    body,
  });
}

export async function getCommentsByPost(
  postId,
  userId,
  hasPaidSubscription,
  isSubscribed,
) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT 
        c.id,
        c.user_id, 
        c.body,
        c.created_at,

        u.name AS author,
        u.role AS author_role,
        u.profile_image_url AS author_image,

        CASE
          WHEN u.role = 'admin' THEN 1
          WHEN ap.user_id IS NOT NULL THEN 1
          ELSE 0
        END AS author_has_profile,

        -- replies (exclude deleted)
        (
          SELECT COUNT(*)
          FROM community_comments r
          WHERE r.parent_id = c.id
            AND r.deleted_at IS NULL
        ) AS reply_count,

        -- likes
        (
          SELECT COUNT(*)
          FROM community_comment_likes l
          WHERE l.comment_id = c.id
        ) AS like_count,

        (
          SELECT COUNT(*)
          FROM community_comment_likes l
          WHERE l.comment_id = c.id
            AND l.user_id = ?
        ) AS user_liked

      FROM community_comments c
      JOIN community_posts p ON p.id = c.target_id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN author_profiles ap ON ap.user_id = u.id

      WHERE c.target_type = 'post'
        AND c.target_id = ?
        AND c.parent_id IS NULL
        AND c.deleted_at IS NULL

        AND (
          p.user_id = ?                             -- 👈 OWNER BYPASS
          OR p.comments_visibility = 'public'
          OR (
            p.comments_visibility = 'paid'
            AND ? = 1
          )
          OR (
            p.comments_visibility = 'private'
            AND ? = 1
          )
        )

      ORDER BY c.created_at ASC
      `,
      [
        userId,
        postId,
        userId,
        hasPaidSubscription ? 1 : 0,
        isSubscribed ? 1 : 0,
      ],
    );

    return rows;
  } catch (error) {
    console.error("Error in getCommentsByPost:", error);
    throw error;
  }
}

export async function getCommentById(commentId, userId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT 
        c.id,
        c.user_id,
        c.body,
        c.created_at,

        c.target_type,
        c.target_id,

        p.slug AS post_slug,

        u.name AS author,
        u.role AS author_role,
        u.profile_image_url AS author_image,

        c.reply_to_user_id,
        reply_user.name AS reply_to_author,

        0 AS reply_count,

        (
          SELECT COUNT(*)
          FROM community_comment_likes l
          WHERE l.comment_id = c.id
        ) AS like_count,

        (
          SELECT COUNT(*)
          FROM community_comment_likes l
          WHERE l.comment_id = c.id
            AND l.user_id = ?
        ) AS user_liked

      FROM community_comments c
      JOIN users u ON c.user_id = u.id

      -- only join posts when this comment belongs to a post
      LEFT JOIN community_posts p
        ON c.target_type = 'post'
       AND c.target_id = p.id

      LEFT JOIN users reply_user
        ON reply_user.id = c.reply_to_user_id

      WHERE c.id = ?
        AND c.deleted_at IS NULL
      LIMIT 1
      `,
      [userId, commentId],
    );

    return rows[0] || null;
  } catch (error) {
    console.error("Error in getCommentById:", error);
    throw error;
  }
}

export async function getUsersByUsernames(usernames) {
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
        AND status = 'active'
      `,
      [usernames],
    );

    return rows || [];
  } catch (error) {
    console.error("❌ getUsersByUsernames error:", error);
    throw error;
  }
}

// get single username
export async function getUserByUsername(username) {
  const db = connect();

  try {
    const [[user]] = await db.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(username) = LOWER(?)
        AND status = 'active'
      LIMIT 1
      `,
      [username],
    );

    return user || null;
  } catch (error) {
    console.error("❌ getUserByUsername error:", error);
    throw error;
  }
}

export async function searchUsersForMentions(query, limit = 8) {
  const db = connect();

  try {
    if (!query || typeof query !== "string") {
      return [];
    }

    const search = `%${query.toLowerCase()}%`;

    const [rows] = await db.query(
      `
      SELECT id, username, profile_image_url
      FROM users
      WHERE username IS NOT NULL
        AND LOWER(username) LIKE ?
        AND status = 'active'
      ORDER BY username ASC
      LIMIT ?
      `,
      [search, limit],
    );

    return rows || [];
  } catch (error) {
    console.error("❌ searchUsersForMentions error:", error);
    throw error;
  }
}

export async function getUserPreviewByUsername(username) {
  const db = connect();

  try {
    const [[user]] = await db.query(
      `
      SELECT
        u.id,
        u.name,
        u.username,
        u.profile_image_url,

        CASE
          WHEN ap.user_id IS NOT NULL THEN 1
          ELSE 0
        END AS author_has_profile,

        ap.bio
      FROM users u
      LEFT JOIN author_profiles ap ON ap.user_id = u.id
      WHERE LOWER(u.username) = LOWER(?)
        AND u.status = 'active'
      LIMIT 1
      `,
      [username],
    );

    return user || null;
  } catch (error) {
    console.error("❌ getUserPreviewByUsername error:", error);
    throw error;
  }
}

export async function saveCommentMentions({
  commentId,
  postId,
  actorUserId,
  body,
}) {
  const db = connect();

  try {
    if (!body || !commentId || !actorUserId) return;

    const mentions = extractMentions(body);
    if (!mentions.length) return;

    const mentionedUsers = await getUsersByUsernames(mentions);

    for (const mentioned of mentionedUsers) {
      // never mention yourself
      if (mentioned.id === actorUserId) continue;

      await db.query(
        `
        INSERT IGNORE INTO community_comment_mentions
          (id, comment_id, mentioned_user_id)
        VALUES (?, ?, ?)
        `,
        [uuidv4(), commentId, mentioned.id],
      );

      await saveNotification({
        userId: mentioned.id,
        actorId: actorUserId,
        type: "mention",
        postId,
        parentId: null,
        commentId,
        message: "mentioned you in a comment.",
      });
    }
  } catch (error) {
    console.error("❌ saveCommentMentions error:", error);
    throw error;
  }
}

export async function clearCommentMentions(commentId) {
  const db = connect();

  try {
    if (!commentId) return;

    await db.query(
      `
      DELETE FROM community_comment_mentions
      WHERE comment_id = ?
      `,
      [commentId],
    );
  } catch (error) {
    console.error("❌ clearCommentMentions error:", error);
    throw error;
  }
}

export async function getCommentsPaginated(
  targetType,
  targetId,
  userId,
  hasPaidSubscription = false,
  isSubscribed = false,
  page = 1,
  limit = 10,
) {
  const db = connect();
  const offset = (page - 1) * limit;

  // POSTS (visibility + locking)
  if (targetType === "post") {
    const [comments] = await db.query(
      `
      SELECT 
        c.id,
        c.user_id,
        c.body,
        c.created_at,

        u.name AS author,
        u.role AS author_role,
        u.profile_image_url AS author_image,

        (
          SELECT COUNT(*)
          FROM community_comments r
          WHERE r.parent_id = c.id
            AND r.deleted_at IS NULL
        ) AS reply_count,

        (
          SELECT COUNT(*)
          FROM community_comment_likes l
          WHERE l.comment_id = c.id
        ) AS like_count,

        EXISTS (
          SELECT 1
          FROM community_comment_likes l
          WHERE l.comment_id = c.id
            AND l.user_id = ?
        ) AS user_liked

      FROM community_comments c
      JOIN community_posts p ON p.id = c.target_id
      JOIN users u ON c.user_id = u.id

      WHERE c.target_type = 'post'
        AND c.target_id = ?
        AND c.parent_id IS NULL
        AND c.deleted_at IS NULL

        AND (
          p.user_id = ?                             
          OR p.comments_visibility = 'public'
          OR (p.comments_visibility = 'paid' AND ? = 1)
          OR (p.comments_visibility = 'private' AND ? = 1)
        )

      ORDER BY c.created_at ASC
      LIMIT ? OFFSET ?
      `,
      [
        userId,
        targetId,
        userId,
        hasPaidSubscription ? 1 : 0,
        isSubscribed ? 1 : 0,
        limit,
        offset,
      ],
    );

    return comments.map(normalizeComment);
  }

  // FRAGMENTS (always public)
  const [comments] = await db.query(
    `
    SELECT 
      c.id,
      c.user_id,
      c.body,
      c.created_at,

      u.name AS author,
      u.role AS author_role,
      u.profile_image_url AS author_image,

      (
        SELECT COUNT(*)
        FROM community_comments r
        WHERE r.parent_id = c.id
          AND r.deleted_at IS NULL
      ) AS reply_count,

      (
        SELECT COUNT(*)
        FROM community_comment_likes l
        WHERE l.comment_id = c.id
      ) AS like_count,

      EXISTS (
        SELECT 1
        FROM community_comment_likes l
        WHERE l.comment_id = c.id
          AND l.user_id = ?
      ) AS user_liked

    FROM community_comments c
    JOIN users u ON c.user_id = u.id

    WHERE c.target_type = 'fragment'
      AND c.target_id = ?
      AND c.parent_id IS NULL
      AND c.deleted_at IS NULL

    ORDER BY c.created_at ASC
    LIMIT ? OFFSET ?
    `,
    [userId, targetId, limit, offset],
  );

  return comments.map(normalizeComment);
}

function normalizeComment(c) {
  return {
    ...c,
    like_count: Number(c.like_count) || 0,
    reply_count: Number(c.reply_count) || 0,
    user_liked: Number(c.user_liked) || 0,
  };
}

export async function createReplyToComment({ userId, parentId, body }) {
  try {
    const db = connect();
    const replyId = crypto.randomUUID();

    const cleanBody = body?.trim();
    if (!cleanBody) {
      throw new Error("Reply body is empty");
    }

    // 1️⃣ Fetch parent comment (this gives us EVERYTHING we need)
    const [[parentComment]] = await db.query(
      `
      SELECT
        id,
        user_id,
        target_id,
        target_type
      FROM community_comments
      WHERE id = ?
      LIMIT 1
      `,
      [parentId],
    );

    if (!parentComment) {
      throw new Error("Parent comment not found");
    }

    const replyToUserIdFinal = parentComment.user_id;
    const { target_id, target_type } = parentComment;

    // 2️⃣ Save reply (inherits target)
    await db.query(
      `
      INSERT INTO community_comments (
        id,
        user_id,
        body,
        parent_id,
        reply_to_user_id,
        target_id,
        target_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        replyId,
        userId,
        cleanBody,
        parentId,
        replyToUserIdFinal,
        target_id,
        target_type,
      ],
    );

    // 3️⃣ Mentions (posts only for now)
    if (target_type === "post") {
      await saveCommentMentions({
        commentId: replyId,
        postId: target_id,
        actorUserId: userId,
        body: cleanBody,
      });
    }

    // 4️⃣ Increment counters
    if (target_type === "post") {
      await db.query(
        `
        INSERT INTO community_post_stats (post_id, comment_count)
        VALUES (?, 1)
        ON DUPLICATE KEY UPDATE
          comment_count = comment_count + 1
        `,
        [target_id],
      );
    }

    if (target_type === "fragment") {
      await db.query(
        `
        UPDATE fragments
        SET comment_count = comment_count + 1
        WHERE id = ?
        `,
        [target_id],
      );
    }

    // 5️⃣ Subscriber activity (posts only)
    if (target_type === "post") {
      const [[post]] = await db.query(
        `SELECT user_id FROM community_posts WHERE id = ? LIMIT 1`,
        [target_id],
      );

      if (post && post.user_id !== userId) {
        await incrementSubscriberActivity({
          authorUserId: post.user_id,
          subscriberUserId: userId,
          points: ACTIVITY_POINTS.REPLY,
        });
      }
    }

    // 6️⃣ Notification (reply target, not post owner)
    if (replyToUserIdFinal !== userId) {
      await saveNotification({
        userId: replyToUserIdFinal,
        actorId: userId,
        type: target_type === "post" ? "reply" : "fragment_reply",

        postId: target_type === "post" ? target_id : null,
        fragmentId: target_type === "fragment" ? target_id : null,

        parentId,
        commentId: replyId,

        message:
          target_type === "post"
            ? "replied to your comment"
            : "replied to your fragment comment",
      });
    }

    const hydratedReply = await getCommentById(replyId, userId);

    // 7️⃣ Email (posts only, for now)
    if (target_type === "post" && replyToUserIdFinal !== userId) {
      try {
        const [[parentUser]] = await db.query(
          `SELECT email FROM users WHERE id = ? LIMIT 1`,
          [replyToUserIdFinal],
        );

        if (parentUser?.email) {
          const preview = getCommentPreview(cleanBody);

          await sendNewReplyEmail({
            to: parentUser.email,
            replierName: hydratedReply.author || "Someone",
            replyPreview: preview,
            postSlug: hydratedReply.post_slug,
          });
        }
      } catch (err) {
        console.error("⚠️ Reply email failed:", err);
      }
    }

    return hydratedReply;
  } catch (err) {
    console.error("❌ createReplyToComment failed:", err);
    throw err;
  }
}

export async function createReply(userId, parentId, body) {
  return createReplyToComment({
    userId,
    parentId,
    body,
  });
}
export async function getRepliesPaginated(parentId, userId, limit, offset) {
  const db = connect();

  const [rows] = await db.query(
    `
    SELECT 
      c.id,
      c.user_id,
      c.parent_id,
      c.body,
      c.created_at,

      c.target_type,
      c.target_id,

      c.reply_to_user_id,
      reply_user.name AS reply_to_author,

      u.name AS author,
      u.role AS author_role,
      u.profile_image_url AS author_image,

      /* ❤️ Total likes */
      (
        SELECT COUNT(*)
        FROM community_comment_likes l
        WHERE l.comment_id = c.id
      ) AS like_count,

      /* ❤️ Whether user liked */
      EXISTS (
        SELECT 1
        FROM community_comment_likes l
        WHERE l.comment_id = c.id
          AND l.user_id = ?
      ) AS user_liked,

      /* 🔥 Reply count (exclude deleted) */
      (
        SELECT COUNT(*)
        FROM community_comments cc2
        WHERE cc2.parent_id = c.id
          AND cc2.deleted_at IS NULL
      ) AS reply_count

    FROM community_comments c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN users reply_user
      ON reply_user.id = c.reply_to_user_id
    WHERE c.parent_id = ?
      AND c.deleted_at IS NULL
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
      AND deleted_at IS NULL
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

    const [result] = await db.query(
      `
      UPDATE community_comments
      SET body = ?, updated_at = NOW()
      WHERE id = ?
        AND user_id = ?
      `,
      [body.trim(), commentId, userId],
    );

    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error updating comment:", error);
    throw error;
  }
}

export async function deleteComment(commentId, userId, role) {
  try {
    const db = connect();

    // 1️⃣ Load parent comment (source of truth)
    const [[comment]] = await db.query(
      `
      SELECT
        id,
        user_id,
        target_type,
        target_id
      FROM community_comments
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1
      `,
      [commentId],
    );

    if (!comment) {
      return { success: false, message: "Comment not found" };
    }

    // 2️⃣ Permission check
    if (comment.user_id !== userId && role !== "admin") {
      return { success: false, message: "Unauthorized" };
    }

    // 3️⃣ Count parent + replies (non-deleted only)
    const [[countRow]] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM community_comments
      WHERE deleted_at IS NULL
        AND (id = ? OR parent_id = ?)
      `,
      [commentId, commentId],
    );

    const deleteCount = Number(countRow?.total) || 0;

    // 4️⃣ Soft delete parent + replies
    await db.query(
      `
      UPDATE community_comments
      SET deleted_at = NOW()
      WHERE id = ? OR parent_id = ?
      `,
      [commentId, commentId],
    );

    // 5️⃣ Decrement cached counters (polymorphic)
    if (deleteCount > 0) {
      if (comment.target_type === "post") {
        await db.query(
          `
          UPDATE community_post_stats
          SET comment_count = GREATEST(comment_count - ?, 0)
          WHERE post_id = ?
          `,
          [deleteCount, comment.target_id],
        );
      }

      if (comment.target_type === "fragment") {
        await db.query(
          `
          UPDATE fragments
          SET comment_count = GREATEST(comment_count - ?, 0)
          WHERE id = ?
          `,
          [deleteCount, comment.target_id],
        );
      }
    }

    return { success: true, deleted: deleteCount };
  } catch (err) {
    console.error("❌ deleteComment failed:", err);
    throw err;
  }
}

// LIKES
export async function likeComment(commentId, userId) {
  const db = connect();

  try {
    // 1️⃣ Insert like edge
    const [result] = await db.query(
      `
      INSERT IGNORE INTO community_comment_likes (id, comment_id, user_id)
      VALUES (UUID(), ?, ?)
      `,
      [commentId, userId],
    );

    // If already liked, stop
    if (result.affectedRows === 0) return true;

    // 3️⃣ Fetch ownership for activity + notifications
    const [[row]] = await db.query(
      `
      SELECT
        c.user_id AS comment_owner,
        p.user_id AS post_owner,
        c.post_id
      FROM community_comments c
      JOIN community_posts p ON p.id = c.post_id
      WHERE c.id = ?
      `,
      [commentId],
    );

    if (!row) return true;

    const { comment_owner, post_owner, post_id } = row;

    // 4️⃣ Activity
    if (post_owner !== userId) {
      await incrementSubscriberActivity({
        authorUserId: post_owner,
        subscriberUserId: userId,
        points: ACTIVITY_POINTS.LIKE,
      });
    }

    // 5️⃣ Notify comment owner
    if (comment_owner !== userId) {
      await saveNotification({
        userId: comment_owner,
        actorId: userId,
        postId: post_id,
        type: "comment_like",
        referenceId: commentId,
        message: "liked your comment.",
      });
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
    // 1️⃣ Remove like edge
    const [result] = await db.query(
      `
      DELETE FROM community_comment_likes
      WHERE comment_id = ? AND user_id = ?
      `,
      [commentId, userId],
    );

    if (result.affectedRows === 0) return true;

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

// Check for Paid Subscription
export async function hasPaidAuthorSubscription({
  authorUserId,
  subscriberUserId,
}) {
  try {
    const db = connect();

    const [[row]] = await db.query(
      `
      SELECT 1
      FROM author_subscriptions
      WHERE author_user_id = ?
        AND subscriber_user_id = ?
        AND paid_subscription = 1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [authorUserId, subscriberUserId],
    );

    return !!row;
  } catch (err) {
    console.error("hasPaidAuthorSubscription error:", err);
    throw err;
  }
}

// Email template

export async function sendNewCommentEmail({
  to,
  commenterName,
  commentPreview,
  postSlug,
}) {
  if (!to) {
    throw new Error("No email recipient provided to sendNewCommentEmail");
  }

  const html = `
<div style="min-height:100%;background:#ffffff;padding:60px 20px;font-family:Arial,sans-serif;">
  <div style="
    max-width:420px;
    margin:0 auto;
    background:#ffffff;
    padding:32px;
    border-radius:16px;
    border:1px solid #e5e7eb;
    box-shadow:0 20px 40px rgba(0,0,0,0.08);
  ">
    <!-- Brand -->
    <div style="margin-bottom:32px;">
      <table align="center" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="padding-right:10px;vertical-align:middle;">
            <img
              src="https://themessyattic.com/themessyattic-logo.png"
              width="36"
              height="36"
              alt="The Messy Attic"
              style="display:block;"
            />
          </td>
          <td style="vertical-align:middle;">
            <div style="
              font-size:20px;
              font-weight:700;
              color:#111827;
              line-height:1;
            ">
              The Messy Attic
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Heading -->
    <h2 style="font-size:24px;font-weight:700;color:#111827;margin:8px 0;">
      New comment on your post
    </h2>

    <p style="font-size:14px;color:#4b5563;margin-bottom:20px;">
      Someone joined the conversation
    </p>

    <!-- Body -->
    <p style="font-size:15px;color:#111827;line-height:1.6;margin-bottom:12px;">
      <strong>${commenterName || "Someone"}</strong> commented:
    </p>

    <blockquote style="
      margin:0 0 24px;
      padding-left:14px;
      border-left:3px solid #e5e7eb;
      color:#374151;
      font-size:14px;
      line-height:1.6;
    ">
      ${commentPreview}
    </blockquote>

    <!-- CTA -->
    <div style="text-align:center;margin:30px 0;">
      <a
        href="https://themessyattic.com/p/${postSlug}"
        target="_blank"
        style="
          background:#7bed9f;
          color:#000;
          padding:14px 36px;
          border-radius:8px;
          text-decoration:none;
          font-weight:700;
          display:inline-block;
        "
      >
        View the conversation
      </a>
    </div>

    <!-- Footer -->
    <p style="font-size:13px;color:#6b7280;text-align:center;">
      You’re receiving this because someone replied to your post.
    </p>

    <p style="font-size:13px;color:#6b7280;text-align:center;margin-top:12px;">
      — The Messy Attic
    </p>
  </div>
</div>
`;

  await sendOutLookMail({
    to,
    subject: "New comment on your post",
    html,
  });
}
// Reply email
export async function sendNewReplyEmail({
  to,
  replierName,
  replyPreview,
  postSlug,
}) {
  if (!to) {
    throw new Error("No email recipient provided to sendNewReplyEmail");
  }

  const html = `
<div style="min-height:100%;background:#ffffff;padding:60px 20px;font-family:Arial,sans-serif;">
  <div style="
    max-width:420px;
    margin:0 auto;
    background:#ffffff;
    padding:32px;
    border-radius:16px;
    border:1px solid #e5e7eb;
    box-shadow:0 20px 40px rgba(0,0,0,0.08);
  ">
    <!-- Brand -->
    <div style="margin-bottom:32px;">
      <table align="center" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="padding-right:10px;vertical-align:middle;">
            <img
              src="https://themessyattic.com/themessyattic-logo.png"
              width="36"
              height="36"
              alt="The Messy Attic"
              style="display:block;"
            />
          </td>
          <td style="vertical-align:middle;">
            <div style="
              font-size:20px;
              font-weight:700;
              color:#111827;
              line-height:1;
            ">
              The Messy Attic
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Heading -->
    <h2 style="font-size:24px;font-weight:700;color:#111827;margin:8px 0;">
      New reply to your comment
    </h2>

    <p style="font-size:14px;color:#4b5563;margin-bottom:20px;">
      Someone continued the conversation
    </p>

    <!-- Body -->
    <p style="font-size:15px;color:#111827;line-height:1.6;margin-bottom:12px;">
      <strong>${replierName || "Someone"}</strong> replied:
    </p>

    <blockquote style="
      margin:0 0 24px;
      padding-left:14px;
      border-left:3px solid #e5e7eb;
      color:#374151;
      font-size:14px;
      line-height:1.6;
    ">
      ${replyPreview}
    </blockquote>

    <!-- CTA -->
    <div style="text-align:center;margin:30px 0;">
      <a
        href="https://themessyattic.com/p/${postSlug}"
        target="_blank"
        style="
          background:#7bed9f;
          color:#000;
          padding:14px 36px;
          border-radius:8px;
          text-decoration:none;
          font-weight:700;
          display:inline-block;
        "
      >
        View the reply
      </a>
    </div>

    <!-- Footer -->
    <p style="font-size:13px;color:#6b7280;text-align:center;">
      You’re receiving this because someone replied to your comment.
    </p>

    <p style="font-size:13px;color:#6b7280;text-align:center;margin-top:12px;">
      — The Messy Attic
    </p>
  </div>
</div>
`;

  await sendOutLookMail({
    to,
    subject: "New reply to your comment",
    html,
  });
}
