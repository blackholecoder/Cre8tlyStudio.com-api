import connect from "../../connect.js";
import { v4 as uuidv4 } from "uuid";

export async function getAuthorProfile(authorUserId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
  SELECT
    u.id,
    u.name,
    u.profile_image_url,
    p.bio,
    p.about,
    p.current_employment,
    p.interests,
    p.services,
    p.media_links,
    (
      SELECT COUNT(*)
      FROM author_subscriptions s
      WHERE s.author_user_id = u.id
        AND s.deleted_at IS NULL
    ) AS subscriber_count
  FROM users u
  LEFT JOIN author_profiles p
    ON p.user_id = u.id
  WHERE u.id = ?
  `,
      [authorUserId],
    );

    if (!rows.length) return null;

    const row = rows[0];

    const normalizeList = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;

      if (typeof value === "string" && value.trim().startsWith("[")) {
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      }

      if (typeof value === "string") {
        return value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      }

      return [];
    };

    const normalizeJson = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;

      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    };

    return {
      id: row.id,
      name: row.name,
      profile_image_url: row.profile_image_url,
      bio: row.bio || "",
      about: row.about || "",
      current_employment: row.current_employment || "",
      interests: normalizeList(row.interests),
      services: normalizeList(row.services),
      media_links: normalizeJson(row.media_links),
      subscriber_count: Number(row.subscriber_count) || 0,
    };
  } catch (err) {
    console.error("getAuthorProfile error:", err);
    throw err;
  }
}

export async function updateAuthorProfile(userId, data) {
  try {
    const db = connect();

    const { bio, about, current_employment, interests, services, media_links } =
      data;

    await db.query(
      `
      INSERT INTO author_profiles (
        user_id,
        bio,
        about,
        current_employment,
        interests,
        services,
        media_links
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        bio = VALUES(bio),
        about = VALUES(about),
        current_employment = VALUES(current_employment),
        interests = VALUES(interests),
        services = VALUES(services),
        media_links = VALUES(media_links),
        updated_at = NOW()
      `,
      [
        userId,
        bio,
        about,
        current_employment,
        JSON.stringify(interests || []),
        JSON.stringify(services || []),
        JSON.stringify(media_links || []),
      ],
    );

    return true;
  } catch (err) {
    console.error("upsertAuthorProfile error:", err);
    throw err;
  }
}

// Carosel Swiper Profile

export async function getAuthorPostsPreview(authorUserId, limit = 10) {
  const db = connect();

  try {
    const [rows] = await db.query(
      `
      SELECT
        p.id,
        p.title,
        p.subtitle,
        p.image_url,
        p.created_at,

        COALESCE(s.views, 0) AS views,
        COALESCE(s.comment_count, 0) AS comment_count

      FROM community_posts p
      LEFT JOIN community_post_stats s
        ON s.post_id = p.id

      WHERE p.user_id = ?
        AND p.deleted_at IS NULL

      ORDER BY p.created_at DESC
      LIMIT ?
      `,
      [authorUserId, limit],
    );

    return rows;
  } catch (err) {
    console.error("getAuthorPostsPreview error:", err);
    throw err;
  }
}

// Author Profile Settings notifications Pref
export async function getNotificationPreferences(userId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `SELECT * FROM user_notification_preferences WHERE user_id = ?`,
      [userId],
    );

    if (rows.length) return rows[0];

    // create defaults if missing
    await db.query(
      `INSERT INTO user_notification_preferences (user_id) VALUES (?)`,
      [userId],
    );

    const [created] = await db.query(
      `SELECT * FROM user_notification_preferences WHERE user_id = ?`,
      [userId],
    );

    return created[0];
  } catch (err) {
    console.error("getNotificationPreferences error:", err);
    throw err;
  }
}

export async function updateNotificationPreferences(userId, prefs) {
  try {
    const db = connect();

    await db.query(
      `
      UPDATE user_notification_preferences
      SET
        new_free_subscriber = ?,
        canceled_free_subscription = ?,
        post_comments = ?
      WHERE user_id = ?
      `,
      [
        prefs.new_free_subscriber,
        prefs.canceled_free_subscription,
        prefs.post_comments,
        userId,
      ],
    );
  } catch (err) {
    console.error("updateNotificationPreferences error:", err);
    throw err;
  }
}

// Email Author templating

export async function getAuthorEmailTemplateByType(userId, type) {
  try {
    const db = connect();

    const [[template]] = await db.query(
      `
      SELECT subject, body_html
      FROM author_email_templates
      WHERE user_id = ?
        AND type = ?
      LIMIT 1
      `,
      [userId, type],
    );

    return template || null;
  } catch (err) {
    console.error("getAuthorEmailTemplateByType error:", err);
    throw err;
  }
}

export async function upsertAuthorEmailTemplate({
  userId,
  type,
  subject,
  bodyHtml,
}) {
  try {
    const db = connect();

    const [existing] = await db.query(
      `
      SELECT id
      FROM author_email_templates
      WHERE user_id = ?
        AND type = ?
      LIMIT 1
      `,
      [userId, type],
    );

    if (existing.length > 0) {
      await db.query(
        `
        UPDATE author_email_templates
        SET subject = ?, body_html = ?
        WHERE user_id = ?
          AND type = ?
        `,
        [subject, bodyHtml, userId, type],
      );
    } else {
      await db.query(
        `
        INSERT INTO author_email_templates
          (id, user_id, type, subject, body_html)
        VALUES (?, ?, ?, ?, ?)
        `,
        [uuidv4(), userId, type, subject, bodyHtml],
      );
    }
  } catch (err) {
    console.error("upsertAuthorEmailTemplate error:", err);
    throw err;
  }
}

// small helper for email

export async function getUserEmailAndNameById(userId) {
  try {
    const db = connect();

    const [[user]] = await db.query(
      `
      SELECT email, name
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId],
    );

    return user || null;
  } catch (err) {
    console.error("getUserEmailAndNameById error:", err);
    throw err;
  }
}
