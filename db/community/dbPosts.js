import connect from "../connect.js";
import { v4 as uuidv4 } from "uuid";

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

    await db.query(
      `
      INSERT INTO community_posts
        (id, user_id, topic_id, title, subtitle, body, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        userId,
        topicId,
        title.trim(),
        subtitle?.trim() || null,
        body?.trim() || null,
        imageUrl,
      ],
    );

    return {
      id,
      user_id: userId,
      topic_id: topicId,
      title: title.trim(),
      subtitle: subtitle?.trim() || null,
      body: body?.trim() || null,
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

export async function getPostById(postId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT 
        p.*,

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
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
      LIMIT 1
      `,
      [postId],
    );

    return rows[0] || null;
  } catch (error) {
    console.error("Error in getPostById:", error);
    throw error;
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
