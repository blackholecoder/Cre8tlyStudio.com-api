import { notifyMentions } from "../../helpers/notifyMentions.js";
import { sanitizeHtml } from "../../utils/sanitizeHtml.js";
import { linkifyMentions } from "../community/dbPosts.js";
import connect from "../connect.js";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../../services/spacesClientV3.js";
import { uploadFileToSpaces } from "../../helpers/uploadToSpace.js";

export async function createFragment({
  userId,
  authorUsername,
  body,
  reshareFragmentId = null,
  audio_url = null,
  audio_title = null,
  audio_duration_seconds = null,
  audio_file_size = null,
  audio_mime_type = null,
}) {
  const db = connect();

  try {
    const rawTextOnly = body
      ?.replace(/<[^>]*>/g, " ")
      ?.replace(/\s+/g, " ")
      ?.trim();

    const hasText = !!rawTextOnly;
    const hasAudio = typeof audio_url === "string" && audio_url.trim() !== "";

    if (!hasText && !reshareFragmentId && !hasAudio) {
      throw new Error("Fragment cannot be empty");
    }

    // 🔒 AUDIO VALIDATION
    if (hasAudio) {
      const MAX_AUDIO_SECONDS = 10800; // 3 hours
      const MAX_AUDIO_BYTES = 500 * 1024 * 1024;

      const allowedMimeTypes = [
        "audio/mpeg",
        "audio/mp3",
        "audio/mp4",
        "audio/x-m4a",
      ];

      if (!allowedMimeTypes.includes(audio_mime_type)) {
        throw new Error("Invalid audio format");
      }
      if (
        typeof audio_duration_seconds !== "number" ||
        audio_duration_seconds <= 0 ||
        audio_duration_seconds > MAX_AUDIO_SECONDS
      ) {
        throw new Error("Audio exceeds maximum length");
      }

      if (
        typeof audio_file_size !== "number" ||
        audio_file_size <= 0 ||
        audio_file_size > MAX_AUDIO_BYTES
      ) {
        throw new Error("Audio file too large");
      }

      if (
        !audio_url.includes(
          "cre8tlystudio.nyc3.cdn.digitaloceanspaces.com/fragment_audio/",
        )
      ) {
        throw new Error("Invalid audio source");
      }
    }

    const fragmentId = crypto.randomUUID();

    // ✅ same pipeline as posts
    const withMentions = body ? linkifyMentions(body) : null;
    const cleanBody = withMentions ? sanitizeHtml(withMentions) : null;

    await db.query(
      `
      INSERT INTO fragments (
        id,
        user_id,
        body,
        reshare_fragment_id,
        audio_url,
        audio_title,
        audio_duration_seconds,
        audio_file_size,
        audio_mime_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        fragmentId,
        userId,
        cleanBody,
        reshareFragmentId,
        audio_url,
        audio_title,
        audio_duration_seconds,
        audio_file_size,
        audio_mime_type,
      ],
    );

    if (hasText) {
      await notifyMentions({
        body,
        authorId: userId,
        authorUsername,
        fragmentId,
      });
    }
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

      f.audio_url,
      f.audio_title,
      f.audio_duration_seconds,
      f.audio_file_size,
      f.audio_mime_type,

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
      ru.profile_image_url AS reshared_author_image,
      ru.is_verified AS reshared_author_is_verified

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
    reshare_count: Number(r.reshare_count) || 0,

    audio_url: r.audio_url || null,
    audio_title: r.audio_title || null,
    audio_duration_seconds: r.audio_duration_seconds
      ? Number(r.audio_duration_seconds)
      : null,
    audio_file_size: r.audio_file_size ? Number(r.audio_file_size) : null,
    audio_mime_type: r.audio_mime_type || null,
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

        f.audio_url,
        f.audio_title,
        f.audio_duration_seconds,
        f.audio_file_size,
        f.audio_mime_type,


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

        rf.id AS reshared_id,
        rf.body AS reshared_body,
        rf.created_at AS reshared_created_at,

        ru.id AS reshared_author_id,
        ru.name AS reshared_author,
        ru.username AS reshared_author_username,
        ru.profile_image_url AS reshared_author_image,
        ru.is_verified AS reshared_author_is_verified,

        CASE
          WHEN ap.user_id IS NOT NULL THEN 1
          ELSE 0
        END AS author_has_profile

      FROM fragments f
      JOIN users u ON u.id = f.user_id

      LEFT JOIN fragments rf
        ON rf.id = f.reshare_fragment_id

      LEFT JOIN users ru
        ON ru.id = rf.user_id

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
          reshare_count: Number(row.reshare_count) || 0,

          audio_url: row.audio_url || null,
          audio_title: row.audio_title || null,
          audio_duration_seconds: row.audio_duration_seconds
            ? Number(row.audio_duration_seconds)
            : null,
          audio_file_size: row.audio_file_size
            ? Number(row.audio_file_size)
            : null,
          audio_mime_type: row.audio_mime_type || null,
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
        f.id,
        f.body,
        f.created_at,
        f.updated_at,
        f.reshare_fragment_id,

        f.audio_url,
        f.audio_title,
        f.audio_duration_seconds,
        f.audio_file_size,
        f.audio_mime_type,

        rf.body AS reshared_body,
        rf.created_at AS reshared_created_at,

        ru.name AS reshared_author,
        ru.profile_image_url AS reshared_author_image,
        ru.is_verified AS reshared_author_is_verified

      FROM fragments f

      LEFT JOIN fragments rf
        ON rf.id = f.reshare_fragment_id

      LEFT JOIN users ru
        ON ru.id = rf.user_id

      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      `,
      [userId],
    );

    return rows.map((r) => ({
      ...r,
      audio_url: r.audio_url || null,
      audio_title: r.audio_title || null,
      audio_duration_seconds: r.audio_duration_seconds
        ? Number(r.audio_duration_seconds)
        : null,
      audio_file_size: r.audio_file_size ? Number(r.audio_file_size) : null,
      audio_mime_type: r.audio_mime_type || null,
    }));
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

export async function updateFragment({
  fragmentId,
  userId,
  body,
  audio_url = null,
  audio_title = null,
  audio_duration_seconds = null,
  audio_file_size = null,
  audio_mime_type = null,
}) {
  const db = connect();

  try {
    const rawTextOnly = body
      ?.replace(/<[^>]*>/g, " ")
      ?.replace(/\s+/g, " ")
      ?.trim();

    const hasText = !!rawTextOnly;
    const hasAudio = typeof audio_url === "string" && audio_url.trim() !== "";

    if (!hasText && !hasAudio) {
      throw new Error("Fragment cannot be empty");
    }

    if (hasAudio) {
      const MAX_AUDIO_SECONDS = 10800;
      const MAX_AUDIO_BYTES = 500 * 1024 * 1024;

      const allowedMimeTypes = [
        "audio/mpeg",
        "audio/mp3",
        "audio/mp4",
        "audio/x-m4a",
      ];

      if (!allowedMimeTypes.includes(audio_mime_type)) {
        throw new Error("Invalid audio format");
      }

      if (
        typeof audio_duration_seconds !== "number" ||
        audio_duration_seconds <= 0 ||
        audio_duration_seconds > MAX_AUDIO_SECONDS
      ) {
        throw new Error("Audio exceeds maximum length");
      }

      if (
        typeof audio_file_size !== "number" ||
        audio_file_size <= 0 ||
        audio_file_size > MAX_AUDIO_BYTES
      ) {
        throw new Error("Audio file too large");
      }

      if (
        !audio_url.includes(
          "cre8tlystudio.nyc3.cdn.digitaloceanspaces.com/fragment_audio/",
        )
      ) {
        throw new Error("Invalid audio source");
      }
    }

    await db.query(
      `
      UPDATE fragments
      SET
        body = ?,
        audio_url = ?,
        audio_title = ?,
        audio_duration_seconds = ?,
        audio_file_size = ?,
        audio_mime_type = ?,
        updated_at = NOW()
      WHERE id = ?
        AND user_id = ?
        AND deleted_at IS NULL
      `,
      [
        body,
        hasAudio ? audio_url : null,
        hasAudio ? audio_title : null,
        hasAudio ? audio_duration_seconds : null,
        hasAudio ? audio_file_size : null,
        hasAudio ? audio_mime_type : null,
        fragmentId,
        userId,
      ],
    );
  } catch (err) {
    console.error("❌ updateFragment failed:", err);
    throw err;
  }
}

export async function getUserNameById(userId) {
  const db = connect();

  try {
    const [[row]] = await db.query(
      `
      SELECT name
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId],
    );

    return row?.name || null;
  } catch (err) {
    console.error("❌ getUserNameById error:", err);
    throw err;
  }
}

export async function uploadFragmentAudioHelper({ userId, file }) {
  try {
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const allowedMimeTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/mp4",
      "audio/x-m4a",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error("Unsupported audio format");
    }

    const MAX_AUDIO_BYTES = 500 * 1024 * 1024;

    if (file.size > MAX_AUDIO_BYTES) {
      throw new Error("Audio file too large");
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const key = `fragment_audio/${userId}-${crypto.randomUUID()}.${ext}`;

    // 🔥 THIS is the important fix
    await uploadFileToSpaces(file.tempFilePath, key, file.mimetype);

    const publicUrl = `https://cre8tlystudio.nyc3.cdn.digitaloceanspaces.com/${key}`;

    return {
      publicUrl,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  } catch (err) {
    console.error("❌ uploadFragmentAudioHelper failed:", err);
    throw err;
  }
}
