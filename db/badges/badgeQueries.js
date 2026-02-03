import connect from "../connect.js";

export async function getAllBadgesWithUserState(userId) {
  try {
    const db = connect();
    const [rows] = await db.query(
      `
      SELECT
        b.id,
        b.key_name,
        b.name,
        b.description,
        b.icon,
        ub.id IS NOT NULL AS earned,
        ub.earned_at
      FROM badges b
      LEFT JOIN user_badges ub
        ON ub.badge_id = b.id
       AND ub.user_id = ?
      ORDER BY b.created_at ASC
      `,
      [userId],
    );
    return rows;
  } catch (err) {
    console.error("❌ getAllBadgesWithUserState:", err);
    throw err;
  }
}

export async function getBadgeByKey(key) {
  try {
    const db = connect();
    const [[badge]] = await db.query(
      `SELECT * FROM badges WHERE key_name = ? LIMIT 1`,
      [key],
    );
    return badge || null;
  } catch (err) {
    console.error("❌ getBadgeByKey:", err);
    throw err;
  }
}

export async function userHasBadge(userId, badgeId) {
  try {
    const db = connect();
    const [rows] = await db.query(
      `SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = ? LIMIT 1`,
      [userId, badgeId],
    );
    return rows.length > 0;
  } catch (err) {
    console.error("❌ userHasBadge:", err);
    throw err;
  }
}

export async function insertUserBadge(userId, badgeId) {
  try {
    const db = connect();
    await db.query(
      `
      INSERT INTO user_badges (id, user_id, badge_id)
      VALUES (UUID(), ?, ?)
      `,
      [userId, badgeId],
    );
  } catch (err) {
    console.error("❌ insertUserBadge:", err);
    throw err;
  }
}
