import connect from "../connect.js";
import { v4 as uuidv4 } from "uuid";

export async function createTopic(name, slug, description = null) {
  try {
    const db = connect();
    const id = uuidv4();

    await db.query(
      `
      INSERT INTO community_topics (id, name, slug, description)
      VALUES (?, ?, ?, ?)
      `,
      [id, name.trim(), slug.trim(), description]
    );

    return { id, name, slug, description };
  } catch (error) {
    console.error("Error in createTopic:", error);
    throw error;
  }
}

export async function getTopics() {
  try {
    const db = connect();

    const [rows] = await db.query(`
      SELECT id, name, slug, description, is_locked, created_at
      FROM community_topics
      ORDER BY name ASC
    `);

    return rows;
  } catch (error) {
    console.error("Error in getTopics:", error);
    throw error;
  }
}

export async function getTopicById(topicId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `SELECT * FROM community_topics WHERE id = ? LIMIT 1`,
      [topicId]
    );

    return rows[0] || null;
  } catch (error) {
    console.error("Error in getTopicById:", error);
    throw error;
  }
}