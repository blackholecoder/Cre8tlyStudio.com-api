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

export async function createPost(
  userId,
  topicId,
  title,
  subtitle,
  body,
  imageUrl = null,
) {
  try {
    const db = connect();
    const id = uuidv4();

    const cleanBody = body ? sanitizeHtml(body) : null;
    const slug = await generateUniqueSlug(db, title);

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

    return {
      id,
      user_id: userId,
      topic_id: topicId,
      title: title.trim(),
      subtitle: subtitle?.trim() || null,
      cleanBody,
      slug,
      image_url: imageUrl,
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
        u.name AS author,
        u.role AS author_role
      FROM community_posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.topic_id = ?
        AND p.deleted_at IS NULL
      ORDER BY p.is_pinned DESC, p.created_at DESC
      `,
      [topicId],
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
        END AS author_image

      FROM community_posts p
      LEFT JOIN users u 
        ON p.user_id = u.id
      LEFT JOIN community_post_stats s
        ON s.post_id = p.id

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
