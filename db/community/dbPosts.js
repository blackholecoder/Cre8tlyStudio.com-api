import connect from "../connect.js";
import { v4 as uuidv4 } from "uuid";


export async function createPost(userId, topicId, title, body) {
  try {
    const db = await connect();
    const id = uuidv4();

    await db.query(
      `
      INSERT INTO community_posts (id, user_id, topic_id, title, body)
      VALUES (?, ?, ?, ?, ?)
      `,
      [id, userId, topicId, title.trim(), body || null]
    );

    return { id, user_id: userId, topic_id: topicId, title, body };
  } catch (error) {
    console.error("Error in createPost:", error);
    throw error;
  }
}

export async function getPostsByTopic(topicId) {
  try {
    const db = await connect();

    const [rows] = await db.query(
      `
      SELECT 
        p.id,
        p.title,
        p.body,
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
      [topicId]
    );

    return rows;
  } catch (error) {
    console.error("Error in getPostsByTopic:", error);
    throw error;
  }
}

export async function getPostById(postId) {
  try {
    const db = await connect();

    const [rows] = await db.query(
      `
      SELECT 
        p.*,
        u.name AS author,
        u.role AS author_role
      FROM community_posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
      LIMIT 1
      `,
      [postId]
    );

    return rows[0] || null;
  } catch (error) {
    console.error("Error in getPostById:", error);
    throw error;
  }
}


export async function pinPost(postId, state = 1) {
  try {
    const db = await connect();
    await db.query(
      `UPDATE community_posts SET is_pinned = ? WHERE id = ?`,
      [state, postId]
    );
  } catch (error) {
    console.error("Error in pinPost:", error);
    throw error;
  }
}

export async function lockPost(postId, state = 1) {
  try {
    const db = await connect();
    await db.query(
      `UPDATE community_posts SET is_locked = ? WHERE id = ?`,
      [state, postId]
    );
  } catch (error) {
    console.error("Error in lockPost:", error);
    throw error;
  }
}