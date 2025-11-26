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

export async function getTopics(userId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT 
        t.id,
        t.name,
        t.slug,
        t.description,
        t.is_locked,
        t.created_at,

        -- newest post in this topic
        (
          SELECT MAX(p.created_at)
          FROM community_posts p
          WHERE p.topic_id = t.id
        ) AS latest_post,

        -- last time this user viewed this topic
        (
          SELECT v.last_viewed
          FROM user_topic_views v
          WHERE v.topic_id = t.id AND v.user_id = ?
        ) AS last_viewed

      FROM community_topics t
      ORDER BY t.name ASC
      `,
      [userId]
    );

    // Append has_new flag
    return rows.map((t) => {
  const hasPosts = !!t.latest_post;

  return {
    ...t,
    has_new:
      hasPosts &&
      (!t.last_viewed ||
        new Date(t.latest_post) > new Date(t.last_viewed)),
  };
});
  } catch (error) {
    console.error("Error in getTopics:", error);
    throw error;
  }
}


export async function getTopicById(topicId, userId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT 
        t.*,

        -- newest post in this topic
        (
          SELECT MAX(p.created_at)
          FROM community_posts p
          WHERE p.topic_id = t.id
        ) AS latest_post,

        -- last time THIS USER viewed this topic
        (
          SELECT v.last_viewed
          FROM user_topic_views v
          WHERE v.topic_id = t.id AND v.user_id = ?
        ) AS last_viewed

      FROM community_topics t
      WHERE t.id = ?
      LIMIT 1
      `,
      [userId, topicId]
    );

    const topic = rows[0] || null;

    if (!topic) return null;

    // Add has_new flag just like getTopics()
    topic.has_new =
      !topic.last_viewed ||
      (topic.latest_post &&
        new Date(topic.latest_post) > new Date(topic.last_viewed));

    return topic;
  } catch (error) {
    console.error("Error in getTopicById:", error);
    throw error;
  }
}



export async function markTopicViewed(userId, topicId) {
  try {
    const db = connect();

    await db.query(
      `
        INSERT INTO user_topic_views (id, user_id, topic_id, last_viewed)
        VALUES (UUID(), ?, ?, NOW())
        ON DUPLICATE KEY UPDATE last_viewed = NOW()
      `,
      [userId, topicId]
    );

  } catch (error) {
    console.error("Error in markTopicViewed:", error);
    throw error;
  }
}

export async function getViewedTopics(userId) {
  try {
    const db = connect();
    const [rows] = await db.query(
      `SELECT topic_id FROM user_topic_views WHERE user_id = ?`,
      [userId]
    );
    return rows.map(r => r.topic_id);
  } catch (err) {
    console.error("Error in getViewedTopics:", err);
    throw err;
  }
}