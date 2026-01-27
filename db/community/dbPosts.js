import { postEmailQueue } from "../../queues/postEmailQueue.js";
import { sanitizeHtml } from "../../utils/sanitizeHtml.js";
import { slugify } from "../../utils/slugify.js";
import connect from "../connect.js";
import { v4 as uuidv4 } from "uuid";

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

export async function getAllCommunityPosts(userId) {
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
        COALESCE(s.like_count, 0) AS like_count,

        (
          (COALESCE(s.comment_count, 0) * 4) +
          (COALESCE(s.like_count, 0) * 2) +
          (COALESCE(s.views, 0) * 0.25)
        ) AS engagement_score,

        TIMESTAMPDIFF(HOUR, p.created_at, NOW()) AS age_hours,

        CASE
          WHEN p.is_admin_post = 1 THEN 'Cre8tly Studio'
          ELSE u.name
        END AS author,

        CASE
          WHEN p.is_admin_post = 1 THEN '/cre8tly-logo-white.png'
          ELSE u.profile_image_url
        END AS author_image,

        t.name AS topic_name,

        CASE
          WHEN p.is_admin_post = 1 THEN 1
          WHEN ap.user_id IS NOT NULL THEN 1
          ELSE 0
        END AS author_has_profile,

        v.viewed_at IS NULL AS is_unread

      FROM community_posts p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN community_topics t ON t.id = p.topic_id
      LEFT JOIN community_post_stats s ON s.post_id = p.id
      LEFT JOIN author_profiles ap ON ap.user_id = u.id
      LEFT JOIN community_post_views v
        ON v.post_id = p.id
        AND v.user_id = ?

      WHERE p.deleted_at IS NULL
      ORDER BY
  is_unread DESC,
  (engagement_score / GREATEST(age_hours, 1)) DESC,
  p.created_at DESC
      LIMIT 50
      `,
      [userId],
    );

    return rows;
  } catch (err) {
    throw err;
  }
}

export async function createPost(
  userId,
  topicId,
  title,
  subtitle,
  body,
  imageUrl = null,
  relatedTopicIds = [],
) {
  try {
    const db = connect();
    const id = uuidv4();

    const cleanBody = body ? sanitizeHtml(body) : null;

    const textOnly = cleanBody.replace(/<[^>]*>/g, "").trim();

    if (!textOnly) {
      throw new Error("Post body is required");
    }

    const slug = await generateUniqueSlug(db, title);

    // ✅ define once
    const filtered = Array.isArray(relatedTopicIds)
      ? relatedTopicIds.filter((t) => t && t !== topicId).slice(0, 3)
      : [];

    await db.query(
      `
      INSERT INTO community_posts
        (id, user_id, topic_id, title, subtitle, body, slug, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
      ],
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

    return {
      id,
      user_id: userId,
      topic_id: topicId,
      title: title.trim(),
      subtitle: subtitle?.trim() || null,
      body: cleanBody,
      slug,
      image_url: imageUrl,
      related_topic_ids: filtered,
    };
  } catch (error) {
    console.error("Error in createPost:", error);
    throw error;
  }
}

export async function getPostsByTopic(topicId) {
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
        p.topic_id,
        p.user_id,

        COALESCE(s.views, 0) AS views,
        COALESCE(s.comment_count, 0) AS comment_count,

        CASE
          WHEN p.is_admin_post = 1 THEN 'Cre8tly Studio'
          ELSE u.name
        END AS author,

        CASE
          WHEN p.is_admin_post = 1 THEN 'admin'
          ELSE u.role
        END AS author_role,

        CASE
          WHEN p.is_admin_post = 1 THEN '/cre8tly-logo-white.png'
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
        END AS is_primary_topic

      FROM community_posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN community_post_stats s ON s.post_id = p.id
      LEFT JOIN author_profiles ap ON ap.user_id = u.id

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
      [topicId, topicId, topicId],
    );

    return rows;
  } catch (error) {
    console.error("Error in getPostsByTopic:", error);
    throw error;
  }
}

export async function getPostById(identifier) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT 
        p.*,

        COALESCE(s.views, 0) AS views,
        COALESCE(s.comment_count, 0) AS comment_count,

        CASE 
          WHEN p.is_admin_post = 1 THEN 'Cre8tly Studio'
          ELSE u.name
        END AS author,

        CASE 
          WHEN p.is_admin_post = 1 THEN 'admin'
          ELSE u.role
        END AS author_role,

        CASE 
          WHEN p.is_admin_post = 1 THEN '/cre8tly-logo-white.png'
          ELSE u.profile_image_url
        END AS author_image,

        CASE
        WHEN p.is_admin_post = 1 THEN 1
        WHEN ap.user_id IS NOT NULL THEN 1
        ELSE 0
      END AS author_has_profile

        FROM community_posts p
        LEFT JOIN users u 
          ON p.user_id = u.id
        LEFT JOIN community_post_stats s
          ON s.post_id = p.id
        LEFT JOIN author_profiles ap
          ON ap.user_id = u.id

      WHERE 
        (p.slug = ? OR p.id = ?)
        AND p.deleted_at IS NULL
      LIMIT 1
      `,
      [identifier, identifier],
    );

    return rows[0] || null;
  } catch (error) {
    console.error("Error in getPostById:", error);
    throw error;
  }
}

export async function getAllUserPosts(userId) {
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
        COALESCE(s.comment_count, 0) AS comment_count

      FROM community_posts p
      LEFT JOIN community_post_stats s
        ON s.post_id = p.id
      WHERE p.user_id = ?
        AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      `,
      [userId],
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

    const { title, subtitle, body, image_url, is_pinned, is_locked } = data;

    const safeTitle = title?.trim() || null;
    const safeSubtitle = subtitle?.trim() || null;
    const safeBody = sanitizeHtml(body);

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
