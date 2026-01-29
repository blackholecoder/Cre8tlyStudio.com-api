import connect from "../connect.js";
import { v4 as uuidv4 } from "uuid";
import { saveNotification } from "./notifications/notifications.js";
import { incrementSubscriberActivity } from "./subscriptions/dbSubscribers.js";
import { ACTIVITY_POINTS } from "../../helpers/activityPoints.js";
import { getCommentPreview } from "../../utils/getCommentPreview.js";
import { sendOutLookMail } from "../../utils/sendOutllokMail.js";

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

    if (postOwner !== userId) {
      await incrementSubscriberActivity({
        authorUserId: postOwner,
        subscriberUserId: userId,
        points: ACTIVITY_POINTS.COMMENT,
      });
    }

    // 3️⃣ Increment cached comment count
    await db.query(
      `
      INSERT INTO community_post_stats (post_id, comment_count)
      VALUES (?, 1)
      ON DUPLICATE KEY UPDATE
        comment_count = comment_count + 1
      `,
      [postId],
    );

    // 3️⃣ Save notification (if not the owner)
    if (postOwner !== userId) {
      await saveNotification({
        userId: postOwner, // person receiving the notification
        actorId: userId, // person who made the comment
        type: "comment",
        postId,
        parentId: null, // ⭐ top-level comment
        commentId, // ⭐ the comment itself
        message: `commented on your post.`,
      });
    }

    // ✅ 6️⃣ HYDRATE the comment before returning
    const hydratedComment = await getCommentById(commentId, userId);

    if (postOwner !== userId) {
      try {
        const [[author]] = await db.query(
          `SELECT email, name FROM users WHERE id = ? LIMIT 1`,
          [postOwner],
        );

        if (author?.email) {
          const preview = getCommentPreview(body);

          await sendNewCommentEmail({
            to: author.email,
            commenterName: hydratedComment.author || "Someone",
            commentPreview: preview,
            postSlug: hydratedComment.post_slug,
          });
        }
      } catch (err) {
        console.error("⚠️ Comment email failed:", err);
        // DO NOT throw
      }
    }

    return hydratedComment;
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
      JOIN users u ON c.user_id = u.id
      LEFT JOIN author_profiles ap ON ap.user_id = u.id
      WHERE c.post_id = ?
        AND c.parent_id IS NULL
        AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
      `,
      [userId, postId],
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
      JOIN community_posts p ON c.post_id = p.id
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

        -- reply count (exclude deleted)
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

        EXISTS (
          SELECT 1
          FROM community_comment_likes l
          WHERE l.comment_id = c.id
            AND l.user_id = ?
        ) AS user_liked

      FROM community_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
        AND c.parent_id IS NULL
        AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
      LIMIT ? OFFSET ?
      `,
      [userId, postId, limit, offset],
    );

    return comments.map((c) => ({
      ...c,
      like_count: Number(c.like_count) || 0,
      user_liked: Number(c.user_liked) || 0,
      reply_count: Number(c.reply_count) || 0,
    }));
  } catch (error) {
    console.error("Error in getCommentsPaginated:", error);
    throw error;
  }
}

export async function createReply(userId, postId, parentId, body) {
  try {
    const db = connect();
    const replyId = crypto.randomUUID();

    const [[parentComment]] = await db.query(
      `SELECT user_id FROM community_comments WHERE id = ? LIMIT 1`,
      [parentId],
    );

    if (!parentComment) {
      throw new Error("Parent comment not found");
    }

    const replyToUserIdFinal = parentComment.user_id;

    // 1️⃣ Fetch post owner
    const [postRows] = await db.query(
      `SELECT user_id FROM community_posts WHERE id = ?`,
      [postId],
    );

    if (!postRows.length) throw new Error("Post not found");

    const postOwner = postRows[0].user_id;

    // 2️⃣ Save reply
    await db.query(
      `
      INSERT INTO community_comments (id, user_id, post_id, parent_id, reply_to_user_id, body)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [replyId, userId, postId, parentId, replyToUserIdFinal, body.trim()],
    );

    // 2.5️⃣ Increment activity score (reply > comment)
    if (postOwner !== userId) {
      await incrementSubscriberActivity({
        authorUserId: postOwner,
        subscriberUserId: userId,
        points: ACTIVITY_POINTS.REPLY,
      });
    }

    await db.query(
      `
      INSERT INTO community_post_stats (post_id, comment_count)
      VALUES (?, 1)
      ON DUPLICATE KEY UPDATE
        comment_count = comment_count + 1
      `,
      [postId],
    );

    // 🔔 Send notification only if replying to someone else
    if (replyToUserIdFinal !== userId) {
      await saveNotification({
        userId: replyToUserIdFinal,
        actorId: userId,
        type: "reply",
        postId,
        parentId,
        commentId: replyId,
        message: "replied to your comment",
      });
    }

    const hydratedReply = await getCommentById(replyId, userId);

    // 📧 Email notification for reply
    if (replyToUserIdFinal !== userId) {
      const [[parentUser]] = await db.query(
        `SELECT email FROM users WHERE id = ? LIMIT 1`,
        [replyToUserIdFinal],
      );

      if (parentUser?.email) {
        const preview = getCommentPreview(body);

        await sendNewReplyEmail({
          to: parentUser.email,
          replierName: hydratedReply.author || "Someone",
          replyPreview: preview,
          postSlug: hydratedReply.post_slug,
        });
      }
    }

    return hydratedReply;
  } catch (err) {
    console.error("❌ createReply failed:", err);
    throw err;
  }
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

    // 1️⃣ Fetch comment + post
    const [rows] = await db.query(
      `
      SELECT id, user_id, post_id
      FROM community_comments
      WHERE id = ? AND deleted_at IS NULL
      `,
      [commentId],
    );

    if (!rows.length) {
      return { success: false, message: "Comment not found" };
    }

    const { user_id: ownerId, post_id: postId } = rows[0];

    // 2️⃣ Permission check
    if (ownerId !== userId && role !== "admin") {
      return { success: false, message: "Unauthorized" };
    }

    // 3️⃣ Count parent + replies (only non-deleted)
    const [countRows] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM community_comments
      WHERE deleted_at IS NULL
        AND (id = ? OR parent_id = ?)
      `,
      [commentId, commentId],
    );

    const deleteCount = countRows[0]?.total || 0;

    // 4️⃣ Soft delete parent + replies
    await db.query(
      `
      UPDATE community_comments
      SET deleted_at = NOW()
      WHERE id = ? OR parent_id = ?
      `,
      [commentId, commentId],
    );

    // 5️⃣ Decrement cached count
    if (deleteCount > 0) {
      await db.query(
        `
        UPDATE community_post_stats
        SET comment_count = GREATEST(comment_count - ?, 0)
        WHERE post_id = ?
        `,
        [deleteCount, postId],
      );
    }

    return { success: true, deleted: deleteCount };
  } catch (err) {
    console.error("Error soft deleting comment:", err);
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
              alt="Cre8tly Studio"
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
              Cre8tly Studio
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
      — Cre8tly Studio
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
              alt="Cre8tly Studio"
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
              Cre8tly Studio
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
      — Cre8tly Studio
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
