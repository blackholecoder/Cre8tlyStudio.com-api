import connect from "../connect.js";
import {
  getBadgeByKey,
  insertUserBadge,
  userHasBadge,
} from "./badgeQueries.js";

export async function grantBadgeIfNotEarned(userId, badgeKey) {
  try {
    const badge = await getBadgeByKey(badgeKey);
    if (!badge) return;

    const alreadyEarned = await userHasBadge(userId, badge.id);
    if (alreadyEarned) return;

    await insertUserBadge(userId, badge.id);
  } catch (err) {
    console.error("❌ grantBadgeIfNotEarned:", err);
    throw err;
  }
}

export async function checkCommentBadges(userId) {
  try {
    const db = connect();

    // --- HELPFUL ---
    // Option B: total comments written
    const [[{ commentCount }]] = await db.query(
      `
      SELECT COUNT(*) AS commentCount
      FROM community_comments
      WHERE user_id = ?
        AND is_deleted = 0
      `,
      [userId],
    );

    if (commentCount >= 25) {
      await grantBadgeIfNotEarned(userId, "helpful");
    }

    // --- GREAT LISTENER ---
    // Replies only (listening + responding)
    const [[{ replyCount }]] = await db.query(
      `
      SELECT COUNT(*) AS replyCount
      FROM community_comments
      WHERE user_id = ?
        AND parent_id IS NOT NULL
        AND is_deleted = 0
      `,
      [userId],
    );

    if (replyCount >= 10) {
      await grantBadgeIfNotEarned(userId, "great_listener");
    }
  } catch (err) {
    console.error("❌ checkCommentBadges:", err);
    throw err;
  }
}

export async function checkUserBadges(userId) {
  try {
    const db = connect();

    const [[user]] = await db.query(
      `
      SELECT created_at
      FROM users
      WHERE id = ?
      `,
      [userId],
    );

    if (!user) return;

    // This helper intentionally does NOTHING for now
    // because your badges are comment-based.
    // It exists so routes have a stable call point.
  } catch (err) {
    console.error("❌ checkUserBadges:", err);
    throw err;
  }
}

export async function checkPostBadges(userId) {
  try {
    const db = connect();

    const [[{ postCount }]] = await db.query(
      `
      SELECT COUNT(*) AS postCount
      FROM community_posts
      WHERE user_id = ?
        AND deleted_at IS NULL
      `,
      [userId],
    );

    if (postCount >= 10) {
      await grantBadgeIfNotEarned(userId, "posted_regularly");
    }
  } catch (err) {
    console.error("❌ checkPostBadges:", err);
    throw err;
  }
}

export async function checkTipBadges(writerUserId) {
  try {
    const db = connect();

    const [[{ totalCents }]] = await db.query(
      `
      SELECT COALESCE(SUM(amount_cents), 0) AS totalCents
      FROM post_tips
      WHERE writer_user_id = ?
      `,
      [writerUserId],
    );

    if (Number(totalCents) >= 2000) {
      await grantBadgeIfNotEarned(writerUserId, "quality_content");
    }
  } catch (err) {
    console.error("❌ checkTipBadges:", err);
    throw err;
  }
}
