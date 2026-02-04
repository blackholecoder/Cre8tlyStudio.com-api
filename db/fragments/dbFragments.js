import connect from "../connect.js";

export async function createFragment({
  userId,
  body,
  reshareFragmentId = null,
}) {
  const db = connect();

  try {
    const cleanBody = body?.trim();
    if (!cleanBody) {
      throw new Error("Fragment body is empty");
    }

    const fragmentId = crypto.randomUUID();

    await db.query(
      `
      INSERT INTO fragments (
        id,
        user_id,
        body,
        reshare_fragment_id
      ) VALUES (?, ?, ?, ?)
      `,
      [fragmentId, userId, cleanBody, reshareFragmentId],
    );

    // Increment reshare count if this is a reshare
    if (reshareFragmentId) {
      await db.query(
        `
        UPDATE fragments
        SET reshare_count = reshare_count + 1
        WHERE id = ?
        `,
        [reshareFragmentId],
      );
    }

    return fragmentId;
  } catch (err) {
    console.error("❌ createFragment failed:", err);
    throw err;
  }
}
// The Fragment Feed

export async function getFragmentFeed({
  userId,
  ownerId = null,
  limit = 20,
  offset = 0,
}) {
  const db = connect();

  limit = Math.max(1, Math.min(Number(limit) || 20, 50));
  offset = Math.max(0, Number(offset) || 0);

  const escapedUserId = db.escape(userId);

  const ownerFilter = ownerId ? `AND f.user_id = ${db.escape(ownerId)}` : "";

  const [rows] = await db.query(
    `
    SELECT
      f.id,
      f.body,
      f.created_at,
      f.updated_at,
      f.views,

      COUNT(fl.id) AS like_count,

      MAX(ul.user_id IS NOT NULL) AS has_liked,

      f.reshare_count,

      (
        SELECT COUNT(*)
        FROM community_comments c
        WHERE c.target_type = 'fragment'
          AND c.target_id = f.id
          AND c.parent_id IS NULL
          AND c.deleted_at IS NULL
      ) AS comment_count,

      u.id AS author_id,
      u.name AS author,
      u.username AS author_username,
      u.profile_image_url AS author_image,
      u.is_verified AS author_is_verified,

      rf.id AS reshared_id,
      rf.body AS reshared_body,
      rf.created_at AS reshared_created_at,

      ru.id AS reshared_author_id,
      ru.name AS reshared_author,
      ru.username AS reshared_author_username,
      ru.profile_image_url AS reshared_author_image

    FROM fragments f
    JOIN users u ON u.id = f.user_id

    LEFT JOIN fragment_likes fl
      ON fl.fragment_id = f.id

    LEFT JOIN fragment_likes ul
      ON ul.fragment_id = f.id
     AND ul.user_id = ${escapedUserId}

    LEFT JOIN fragments rf ON f.reshare_fragment_id = rf.id
    LEFT JOIN users ru ON ru.id = rf.user_id

    WHERE f.deleted_at IS NULL
     ${ownerFilter}
    GROUP BY f.id
    ORDER BY f.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
    `,
  );

  return rows.map((r) => ({
    ...r,
    views: Number(r.views) || 0,
    like_count: Number(r.like_count) || 0,
    has_liked: Boolean(r.has_liked),
    comment_count: Number(r.comment_count) || 0,
  }));
}

export async function getFragmentById(fragmentId, userId = null) {
  const db = connect();
  const escapedUserId = userId ? db.escape(userId) : "NULL";

  try {
    await db.query(
      `
      UPDATE fragments
      SET views = views + 1
      WHERE id = ?
        AND user_id != ?
      `,
      [fragmentId, userId],
    );

    const [[row]] = await db.query(
      `
      SELECT
        f.id,
        f.user_id,
        f.body,
        f.created_at,
        f.updated_at,
        f.views, 

        COUNT(fl.id) AS like_count,
        MAX(ul.user_id IS NOT NULL) AS has_liked,

        (
          SELECT COUNT(*)
          FROM community_comments c
          WHERE c.target_type = 'fragment'
            AND c.target_id = f.id
            AND c.deleted_at IS NULL
        ) AS comment_count,
         

        f.reshare_count,

        u.id AS author_id,
        u.name AS author,
        u.username AS author_username,
        u.profile_image_url AS author_image,
        u.is_verified AS author_is_verified,

        CASE
          WHEN ap.user_id IS NOT NULL THEN 1
          ELSE 0
        END AS author_has_profile

      FROM fragments f
      JOIN users u ON u.id = f.user_id

      LEFT JOIN author_profiles ap
        ON ap.user_id = u.id

      LEFT JOIN fragment_likes fl
        ON fl.fragment_id = f.id

      LEFT JOIN fragment_likes ul
        ON ul.fragment_id = f.id
       AND ul.user_id = ${escapedUserId}

       

      WHERE f.id = ?
      GROUP BY f.id
      LIMIT 1
      `,
      [fragmentId],
    );

    return row
      ? {
          ...row,
          views: Number(row.views) || 0,
          like_count: Number(row.like_count) || 0,
          has_liked: Boolean(row.has_liked),
          comment_count: Number(row.comment_count) || 0,
        }
      : null;
  } catch (err) {
    console.error("❌ getFragmentById failed:", err);
    throw err;
  }
}

export async function getUserFragments(userId) {
  const db = connect();

  try {
    const [rows] = await db.query(
      `
      SELECT
        id,
        body,
        image_url,
        created_at
      FROM fragments
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId],
    );

    return rows;
  } catch (err) {
    console.error("getUserFragments failed:", err);
    throw err;
  }
}

export async function deleteFragmentById(fragmentId, userId) {
  const db = connect();

  try {
    const [result] = await db.query(
      `
      DELETE FROM fragments
      WHERE id = ? AND user_id = ?
      `,
      [fragmentId, userId],
    );

    return result.affectedRows > 0;
  } catch (err) {
    console.error("deleteFragmentById failed:", err);
    throw err;
  }
}

export async function updateFragment({ fragmentId, userId, body }) {
  const db = connect();

  await db.query(
    `
    UPDATE fragments
    SET body = ?, updated_at = NOW()
    WHERE id = ? AND user_id = ? AND deleted_at IS NULL
    `,
    [body, fragmentId, userId],
  );
}
