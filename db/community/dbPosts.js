import { postEmailQueue } from "../../queues/postEmailQueue.js";
import { sanitizeHtml } from "../../utils/sanitizeHtml.js";
import { slugify } from "../../utils/slugify.js";
import connect from "../connect.js";
import { v4 as uuidv4 } from "uuid";
import { checkPostBadges } from "../badges/dbBadges.js";
import { saveNotification } from "./notifications/notifications.js";
import { getFragmentFeed } from "../fragments/dbFragments.js";

// Community Feed
export async function getCommunityFeed({ userId, limit = 20, offset = 0 }) {
  const db = connect();

  try {
    const fetchSize = limit + offset;

    const posts = await getAllCommunityPosts({
      userId,
      limit: fetchSize,
      offset: 0,
    });

    const fragments = await getFragmentFeed({
      userId,
      limit: fetchSize,
      offset: 0,
    });

    const normalizedPosts = posts.map((p) => ({
      id: p.id,
      type: "post",
      created_at: p.created_at,
      data: p,
    }));

    const normalizedFragments = fragments.map((f) => ({
      id: f.id,
      type: "fragment",
      created_at: f.created_at,
      data: f,
    }));

    const merged = [...normalizedPosts, ...normalizedFragments].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );

    const items = merged.slice(offset, offset + limit);

    return {
      items,
      hasMore: merged.length > offset + limit,
    };
  } catch (err) {
    console.error("getCommunityFeed error:", err);
    throw err;
  }
}

async function generateUniqueSlug(db, title) {
  const base = slugify(title);
  let slug = base;
  let i = 1;

  while (true) {
    const [rows] = await db.query(
      "SELECT id FROM community_posts WHERE slug = ? LIMIT 1",
      [slug],
    );

    if (!rows.length) return slug;
    slug = `${base}-${i++}`;
  }
}

export async function getAllCommunityPosts({ userId, limit = 20, offset = 0 }) {
  const db = connect();

  try {
    const [rows] = await db.query(
      `
      SELECT
        p.id,
        p.slug,
        p.title,
        p.subtitle,
        p.created_at,
        p.image_url,
        p.topic_id,
        p.user_id,
        p.comments_visibility,
        p.comments_locked,

         CASE
          WHEN p.user_id = ? THEN 1
          ELSE 0
        END AS is_owner,


        COALESCE(s.views, 0) AS views,
        COALESCE(s.comment_count, 0) AS comment_count,
        COALESCE(s.post_like_count, 0) AS like_count,

        (
          (COALESCE(s.comment_count, 0) * 4) +
          (COALESCE(s.post_like_count, 0) * 2) +
          (COALESCE(s.views, 0) * 0.25)
        ) AS engagement_score,

        TIMESTAMPDIFF(HOUR, p.created_at, NOW()) AS age_hours,

        CASE
          WHEN p.is_admin_post = 1 THEN 'The Messy Attic'
          ELSE u.name
        END AS author,

        CASE
          WHEN p.is_admin_post = 1 THEN '/themessyattic-logo.png'
          ELSE u.profile_image_url
        END AS author_image,

        t.name AS topic_name,

        CASE
          WHEN p.is_admin_post = 1 THEN 1
          WHEN ap.user_id IS NOT NULL THEN 1
          ELSE 0
        END AS author_has_profile,

        CASE
          WHEN sub.id IS NOT NULL THEN 1
          ELSE 0
        END AS is_subscribed,

          CASE
          WHEN l.user_id IS NOT NULL THEN 1
          ELSE 0
        END AS has_liked,

        v.viewed_at IS NULL AS is_unread

      FROM community_posts p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN community_topics t ON t.id = p.topic_id
      LEFT JOIN community_post_stats s ON s.post_id = p.id
      LEFT JOIN author_profiles ap ON ap.user_id = u.id
      
      LEFT JOIN community_post_views v
          ON v.post_id = p.id
        AND v.user_id = ?

      LEFT JOIN community_post_likes l
          ON l.target_type = 'post'
        AND l.target_id = p.id
        AND l.user_id = ?

        LEFT JOIN author_subscriptions sub
          ON sub.author_user_id = p.user_id
        AND sub.subscriber_user_id = ?
        AND sub.deleted_at IS NULL

      WHERE p.deleted_at IS NULL
      ORDER BY
  is_unread DESC,
  (engagement_score / GREATEST(age_hours, 1)) DESC,
  p.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [userId, userId, userId, userId, limit, offset],
    );

    return rows;
  } catch (err) {
    throw err;
  }
}

export async function createPost({
  userId,
  topicId,
  title,
  subtitle,
  body,
  imageUrl = null,
  relatedTopicIds = [],
  commentsVisibility,
}) {
  const db = connect();

  try {
    const id = uuidv4();

    const cleanBody = body ? sanitizeHtml(body) : null;
    const textOnly = cleanBody?.replace(/<[^>]*>/g, "").trim();

    if (!textOnly) {
      throw new Error("Post body is required");
    }

    const wordCount = textOnly.replace(/\s+/g, " ").split(" ").length;

    const MIN_POST_WORDS = 501;

    if (wordCount < MIN_POST_WORDS) {
      const err = new Error(
        `Posts require at least ${MIN_POST_WORDS} words. Please post a fragment instead.`,
      );
      err.code = "POST_TOO_SHORT";
      throw err;
    }

    const slug = await generateUniqueSlug(db, title);

    const visibility =
      commentsVisibility === "paid" || commentsVisibility === "private"
        ? commentsVisibility
        : "public";

    const commentsLocked = 0;

    const filtered = Array.isArray(relatedTopicIds)
      ? relatedTopicIds.filter((t) => t && t !== topicId).slice(0, 3)
      : [];

    await db.query(
      `
      INSERT INTO community_posts
        (
          id,
          user_id,
          topic_id,
          title,
          subtitle,
          body,
          slug,
          image_url,
          comments_visibility,
          comments_locked
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        userId,
        topicId,
        title.trim(),
        subtitle?.trim() || null,
        cleanBody,
        slug,
        imageUrl,
        visibility,
        commentsLocked,
      ],
    );

    await db.query(
      `
      INSERT INTO community_post_stats (
        post_id,
        views,
        comment_count,
        post_like_count
      ) VALUES (?, 0, 0, 0)
      `,
      [id],
    );

    if (filtered.length > 0) {
      const values = filtered.map((relatedTopicId) => [id, relatedTopicId]);

      await db.query(
        `
        INSERT IGNORE INTO community_post_related_topics
          (post_id, topic_id)
        VALUES ?
        `,
        [values],
      );
    }

    await checkPostBadges(userId);

    return {
      id,
      user_id: userId,
      topic_id: topicId,
      title: title.trim(),
      subtitle: subtitle?.trim() || null,
      body: cleanBody,
      slug,
      image_url: imageUrl,
      comments_visibility: visibility,
      comments_locked: commentsLocked,
      related_topic_ids: filtered,
    };
  } catch (error) {
    console.error("Error in createPost:", error);
    throw error;
  }
}

export async function getPostsByTopic(topicId, userId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT
        p.id,
        p.title,
        p.subtitle,
        p.body,
        p.image_url,
        p.created_at,
        p.updated_at,
        p.is_pinned,
        p.is_locked,
        p.comments_visibility,
        p.comments_locked,
        p.topic_id,
        p.user_id,

        COALESCE(s.views, 0) AS views,
        COALESCE(s.comment_count, 0) AS comment_count,
        COALESCE(s.post_like_count, 0) AS like_count,

        CASE
          WHEN p.is_admin_post = 1 THEN 'The Messy Attic'
          ELSE u.name
        END AS author,

        CASE
          WHEN p.is_admin_post = 1 THEN 'admin'
          ELSE u.role
        END AS author_role,

        CASE
          WHEN p.is_admin_post = 1 THEN '/themessyattic-logo.png'
          ELSE u.profile_image_url
        END AS author_image,

        CASE
          WHEN p.is_admin_post = 1 THEN 1
          WHEN ap.user_id IS NOT NULL THEN 1
          ELSE 0
        END AS author_has_profile,

        CASE
          WHEN p.topic_id = ? THEN 1
          ELSE 0
        END AS is_primary_topic,

        CASE
          WHEN l.user_id IS NOT NULL THEN 1
          ELSE 0
        END AS has_liked,

        CASE
          WHEN p.user_id = ? THEN 1
          WHEN sub.id IS NOT NULL THEN 1
          ELSE 0
        END AS is_subscribed,

        CASE
          WHEN p.user_id = ? THEN 1
          WHEN sub.paid_subscription = 1 THEN 1
          ELSE 0
        END AS has_paid_subscription

      FROM community_posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN community_post_stats s ON s.post_id = p.id
      LEFT JOIN author_profiles ap ON ap.user_id = u.id

      LEFT JOIN community_post_likes l
          ON l.target_type = 'post'
        AND l.target_id = p.id
        AND l.user_id = ?

      LEFT JOIN author_subscriptions sub
          ON sub.author_user_id = p.user_id
        AND sub.subscriber_user_id = ?
        AND sub.deleted_at IS NULL

          WHERE
      p.deleted_at IS NULL
      AND (
        p.topic_id = ?
        OR EXISTS (
          SELECT 1
          FROM community_post_related_topics rt
          WHERE rt.post_id = p.id
            AND rt.topic_id = ?
            AND rt.topic_id <> p.topic_id
        )
      )
      ORDER BY p.is_pinned DESC, p.created_at DESC
      `,
      [
        topicId, // (1) is_primary_topic
        userId, // (2) has_liked
        userId, // (3) sub.subscriber_user_id
        userId, // (4) is_subscribed CASE
        userId, // (5) has_paid_subscription CASE
        topicId, // (6) main topic filter
        topicId, // (7) related topic filter
      ],
    );

    return rows;
  } catch (error) {
    console.error("Error in getPostsByTopic:", error);
    throw error;
  }
}

export async function getPostById(identifier, userId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT 
        p.*,

        COALESCE(s.views, 0) AS views,
        COALESCE(s.comment_count, 0) AS comment_count,
        COALESCE(s.post_like_count, 0) AS like_count,
        COALESCE(pb.save_count, 0) AS save_count,

        CASE 
          WHEN p.is_admin_post = 1 THEN 'The Messy Attic'
          ELSE u.name
        END AS author,

        CASE 
          WHEN p.is_admin_post = 1 THEN 'admin'
          ELSE u.role
        END AS author_role,

        CASE 
          WHEN p.is_admin_post = 1 THEN '/themessyattic-logo.png'
          ELSE u.profile_image_url
        END AS author_image,

        CASE
        WHEN p.is_admin_post = 1 THEN 1
        WHEN ap.user_id IS NOT NULL THEN 1
        ELSE 0
      END AS author_has_profile,

        CASE
        WHEN l.user_id IS NOT NULL THEN 1
        ELSE 0
      END AS has_liked,

        CASE
        WHEN ub.user_id IS NOT NULL THEN 1
        ELSE 0
      END AS is_bookmarked

        FROM community_posts p
        LEFT JOIN users u 
          ON p.user_id = u.id
        LEFT JOIN community_post_stats s
          ON s.post_id = p.id
        LEFT JOIN author_profiles ap
          ON ap.user_id = u.id
        LEFT JOIN community_post_likes l
            ON l.target_type = 'post'
          AND l.target_id = p.id
          AND l.user_id = ?
        LEFT JOIN post_bookmarks ub
        ON ub.post_id = p.id
       AND ub.user_id = ?

        LEFT JOIN (
          SELECT post_id, COUNT(*) AS save_count
          FROM post_bookmarks
          GROUP BY post_id
        ) pb ON pb.post_id = p.id

      WHERE 
        (p.slug = ? OR p.id = ?)
        AND p.deleted_at IS NULL
      LIMIT 1
      `,
      [userId, userId, identifier, identifier],
    );

    return rows[0] || null;
  } catch (error) {
    console.error("Error in getPostById:", error);
    throw error;
  }
}

export async function getCommunityPostById(postId) {
  try {
    const db = connect();

    const [[post]] = await db.query(
      `
      SELECT id, slug
      FROM community_posts
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [postId],
    );

    return post || null;
  } catch (err) {
    console.error("getCommunityPostById failed:", err);
    throw err;
  }
}

export async function getAllUserPosts(ownerUserId, viewerUserId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT
        p.id,
        p.user_id,
        p.topic_id,
        p.title,
        p.subtitle,
        p.body,
        p.created_at,
        p.updated_at,
        p.is_pinned,
        p.is_locked,
        p.is_admin_post,
        p.admin_seen,
        p.image_url,

        COALESCE(s.views, 0) AS views,
        COALESCE(s.comment_count, 0) AS comment_count,
        COALESCE(s.post_like_count, 0) AS like_count,

        CASE
          WHEN l.user_id IS NOT NULL THEN 1
          ELSE 0
        END AS has_liked

      FROM community_posts p
      LEFT JOIN community_post_stats s
        ON s.post_id = p.id
      LEFT JOIN community_post_likes l
          ON l.target_type = 'post'
        AND l.target_id = p.id
        AND l.user_id = ?
      WHERE p.user_id = ?
        AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      `,
      [viewerUserId, ownerUserId],
    );

    return rows;
  } catch (err) {
    console.error("getAllUserPosts helper error:", err);
    throw err;
  }
}

export async function pinPost(postId, state = 1) {
  try {
    const db = connect();
    await db.query(`UPDATE community_posts SET is_pinned = ? WHERE id = ?`, [
      state,
      postId,
    ]);
  } catch (error) {
    console.error("Error in pinPost:", error);
    throw error;
  }
}

export async function lockPost(postId, state = 1) {
  try {
    const db = connect();
    await db.query(`UPDATE community_posts SET is_locked = ? WHERE id = ?`, [
      state,
      postId,
    ]);
  } catch (error) {
    console.error("Error in lockPost:", error);
    throw error;
  }
}

// Viewed Posts
export async function markCommunityPostViewed(userId, postId) {
  const db = connect();

  try {
    await db.query(
      `
      INSERT IGNORE INTO community_post_views (user_id, post_id)
      VALUES (?, ?)
      `,
      [userId, postId],
    );
  } catch (err) {
    throw err;
  }
}

// Editing Posts
export async function updateUserPost(userId, postId, data) {
  try {
    const db = connect();

    const {
      title,
      subtitle,
      body,
      image_url,
      is_pinned,
      is_locked,
      comments_visibility,
    } = data;

    const safeTitle = title?.trim() || null;
    const safeSubtitle = subtitle?.trim() || null;
    const safeBody = body ? sanitizeHtml(body) : null;

    // normalize visibility
    const visibility =
      comments_visibility === "paid" || comments_visibility === "private"
        ? comments_visibility
        : "public";

    // derive lock state
    const commentsLocked = is_locked ?? 0;

    const [result] = await db.query(
      `
      UPDATE community_posts
      SET
        title = ?,
        subtitle = ?,
        body = ?,
        image_url = COALESCE(?, image_url),
        is_pinned = ?,
        is_locked = ?,
        comments_visibility = ?,
        comments_locked = ?,
        updated_at = NOW()
      WHERE id = ? AND user_id = ?
      `,
      [
        safeTitle,
        safeSubtitle,
        safeBody,
        image_url ?? null,
        is_pinned ?? 0,
        is_locked ?? 0,
        visibility,
        commentsLocked,
        postId,
        userId,
      ],
    );

    return result.affectedRows > 0;
  } catch (err) {
    console.error("updateUserPost helper error:", err);
    throw err;
  }
}

// delete posts
export async function deletePost(postId, userId, role) {
  try {
    const db = connect();

    // 1️⃣ Verify post exists + owner
    const [rows] = await db.query(
      `
      SELECT user_id
      FROM community_posts
      WHERE id = ?
      `,
      [postId],
    );

    if (!rows.length) {
      return { success: false, message: "Post not found" };
    }

    const ownerId = rows[0].user_id;

    // 2️⃣ Only owner or admin can delete
    if (ownerId !== userId && role !== "admin") {
      return { success: false, message: "Unauthorized" };
    }

    // 3️⃣ Delete post
    // Comments + stats will cascade if FK is set correctly
    await db.query(
      `
      UPDATE community_posts SET deleted_at = NOW() WHERE id = ?
      `,
      [postId],
    );

    return { success: true };
  } catch (err) {
    console.error("❌ deletePost helper error:", err);
    throw err;
  }
}

// Analytics for Posts
export async function incrementPostView(postId, viewerUserId) {
  try {
    const db = connect();

    // 1. Get post owner
    const [[post]] = await db.query(
      `
      SELECT user_id
      FROM community_posts
      WHERE id = ?
        AND deleted_at IS NULL
      `,
      [postId],
    );

    if (!post) return; // post missing or deleted

    // 2. Do NOT count self views
    if (post.user_id === viewerUserId) return;

    // 3. Upsert + increment views
    await db.query(
      `
      INSERT INTO community_post_stats (post_id, views)
      VALUES (?, 1)
      ON DUPLICATE KEY UPDATE views = views + 1
      `,
      [postId],
    );
  } catch (err) {
    console.error("❌ incrementPostView error:", err);
    throw err;
  }
}

// *************************************************************//
// Helper for getting subscribers of Author
export async function getAuthorEmailSubscribers(authorUserId) {
  const db = connect();

  const [rows] = await db.query(
    `
    SELECT u.id, u.email, u.name
    FROM author_subscriptions s
    JOIN users u
      ON u.id = s.subscriber_user_id
    WHERE s.author_user_id = ?
      AND s.deleted_at IS NULL
    `,
    [authorUserId],
  );

  return rows;
}
// Get post for email when Author creates post
export async function getPostForEmail(postId) {
  const db = connect();

  const [rows] = await db.query(
    `
    SELECT
      p.id,
      p.title,
      p.body,
      p.image_url,
      p.slug,
      u.name AS author_name
    FROM community_posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
      AND p.deleted_at IS NULL
    `,
    [postId],
  );

  return rows[0] || null;
}

export async function queuePostEmails(postId, authorUserId) {
  await postEmailQueue.add("send-post-email", {
    postId,
    authorUserId,
  });
}

// like and dislike posts

// new target Likes
export async function likeTarget({ targetType, targetId, userId }) {
  const db = connect();

  if (targetType === "post") {
    await db.query(
      `
      INSERT IGNORE INTO community_post_likes
        (id, post_id, user_id, target_id, target_type)
      VALUES (?, ?, ?, ?, 'post')
      `,
      [uuidv4(), targetId, userId, targetId],
    );

    await db.query(
      `
      UPDATE community_post_stats
      SET post_like_count = post_like_count + 1
      WHERE post_id = ?
      `,
      [targetId],
    );

    return;
  }

  if (targetType === "fragment") {
    // 1. insert like
    await db.query(
      `
    INSERT IGNORE INTO fragment_likes
      (id, fragment_id, user_id)
    VALUES (?, ?, ?)
    `,
      [uuidv4(), targetId, userId],
    );

    // 2. increment count
    await db.query(
      `
    UPDATE fragments
    SET like_count = like_count + 1
    WHERE id = ?
    `,
      [targetId],
    );

    // 3. fetch fragment owner
    const [[fragment]] = await db.query(
      `
    SELECT user_id
    FROM fragments
    WHERE id = ?
    LIMIT 1
    `,
      [targetId],
    );

    if (!fragment) return;

    const ownerUserId = fragment.user_id;

    // 4. skip self-like
    if (ownerUserId === userId) return;

    // 5. save notification (reuse existing system)
    await saveNotification({
      userId: ownerUserId,
      actorId: userId,
      type: "fragment_like",
      fragmentId: targetId,
      postId: null,
      parentId: null,
      commentId: null,
      referenceId: targetId, // fragment id
      message: "liked your fragment.",
    });

    return;
  }

  throw new Error("Invalid targetType");
}

export async function unlikeTarget({ targetType, targetId, userId }) {
  const db = connect();

  if (targetType === "post") {
    const [res] = await db.query(
      `
      DELETE FROM community_post_likes
      WHERE target_type = 'post'
        AND target_id = ?
        AND user_id = ?
      `,
      [targetId, userId],
    );

    if (res.affectedRows) {
      await db.query(
        `
        UPDATE community_post_stats
        SET post_like_count = GREATEST(post_like_count - 1, 0)
        WHERE post_id = ?
        `,
        [targetId],
      );
    }

    return;
  }

  if (targetType === "fragment") {
    const [res] = await db.query(
      `
      DELETE FROM fragment_likes
      WHERE fragment_id = ?
        AND user_id = ?
      `,
      [targetId, userId],
    );

    if (res.affectedRows) {
      await db.query(
        `
        UPDATE fragments
        SET like_count = GREATEST(like_count - 1, 0)
        WHERE id = ?
        `,
        [targetId],
      );
    }

    return;
  }

  throw new Error("Invalid targetType");
}

// bookmarks

export async function togglePostBookmark(userId, postId) {
  const db = connect();

  try {
    // Check if bookmark exists
    const [existing] = await db.query(
      `
      SELECT id
      FROM post_bookmarks
      WHERE user_id = ?
        AND post_id = ?
      LIMIT 1
      `,
      [userId, postId],
    );

    if (existing.length > 0) {
      // Remove bookmark
      await db.query(
        `
        DELETE FROM post_bookmarks
        WHERE user_id = ?
          AND post_id = ?
        `,
        [userId, postId],
      );

      return { bookmarked: false };
    }

    // Add bookmark
    await db.query(
      `
      INSERT INTO post_bookmarks (id, user_id, post_id)
      VALUES (?, ?, ?)
      `,
      [uuidv4(), userId, postId],
    );

    return { bookmarked: true };
  } catch (err) {
    console.error("togglePostBookmark failed:", err);
    throw err;
  }
}

export async function getUserBookmarkedPosts(userId, limit = 20, offset = 0) {
  const db = connect();

  try {
    const [rows] = await db.query(
      `
      SELECT
        p.id,
        p.slug,
        p.title,
        p.subtitle,
        p.created_at,
        p.image_url,
        p.topic_id,
        p.user_id,

        COALESCE(s.views, 0) AS views,
        COALESCE(s.comment_count, 0) AS comment_count,
        COALESCE(s.post_like_count, 0) AS like_count,
        COALESCE(pb.save_count, 0) AS save_count,

        CASE
          WHEN p.is_admin_post = 1 THEN 'The Messy Attic'
          ELSE u.name
        END AS author,

        CASE
          WHEN p.is_admin_post = 1 THEN '/themessyattic-logo.png'
          ELSE u.profile_image_url
        END AS author_image,

        CASE
          WHEN p.is_admin_post = 1 THEN 1
          WHEN ap.user_id IS NOT NULL THEN 1
          ELSE 0
        END AS author_has_profile,

        CASE
          WHEN l.user_id IS NOT NULL THEN 1
          ELSE 0
        END AS has_liked,

        v.viewed_at IS NULL AS is_unread,

        b.created_at AS bookmarked_at

      FROM post_bookmarks b
      JOIN community_posts p
        ON p.id = b.post_id

      LEFT JOIN users u
        ON u.id = p.user_id

      LEFT JOIN community_post_stats s
        ON s.post_id = p.id

      LEFT JOIN author_profiles ap
        ON ap.user_id = u.id

      LEFT JOIN community_post_views v
        ON v.post_id = p.id
        AND v.user_id = ?

      LEFT JOIN community_post_likes l
        ON l.post_id = p.id
        AND l.user_id = ?

      LEFT JOIN (
        SELECT post_id, COUNT(*) AS save_count
        FROM post_bookmarks
        GROUP BY post_id
      ) pb ON pb.post_id = p.id

      WHERE
        b.user_id = ?
        AND p.deleted_at IS NULL

      ORDER BY
        b.created_at DESC

      LIMIT ? OFFSET ?
      `,
      [userId, userId, userId, limit, offset],
    );

    return rows;
  } catch (err) {
    console.error("getUserBookmarkedPosts failed:", err);
    throw err;
  }
}
