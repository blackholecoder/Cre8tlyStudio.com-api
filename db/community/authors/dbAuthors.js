import connect from "../../connect.js";

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
        p.media_links
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
