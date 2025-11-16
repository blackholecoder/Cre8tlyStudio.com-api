import connect from "../connect.js";

export async function logLandingEvent(
  landing_page_id,
  event_type,
  ip_address,
  user_agent,
  viewerId = null,
  referer = "",
  owner_preview = null
) {
  const db = await connect();
  try {

    const [ownerRows] = await db.query(
      "SELECT user_id FROM user_landing_pages WHERE id = ? LIMIT 1",
      [landing_page_id]
    );
    const ownerId = ownerRows?.[0]?.user_id;
    console.log("🧠 OWNER CHECK →", { ownerId, viewerId, owner_preview });

    const isOwnerView =
      (owner_preview && owner_preview === ownerId) ||
      (viewerId && viewerId === ownerId);

      if (isOwnerView) {
      console.log("🚫 SKIPPING: Owner view detected");
      return { success: true, skipped: true, message: "Owner view not tracked." };
    }

    // ✅ Safety: trim overly long user-agent strings (some are 500+ chars)
    const safeUserAgent = (user_agent || "").toString().slice(0, 1000);

    const [result] = await db.query(
      `
      INSERT INTO landing_analytics 
      (landing_page_id, event_type, ip_address, user_agent)
      VALUES (?, ?, ?, ?)
      `,
      [landing_page_id, event_type, ip_address, safeUserAgent]
    );

    return { success: true, id: result.insertId };
  } catch (error) {
    console.error("❌ Error logging landing analytics:", error);
    return { success: false, error };
  } finally {
    await db.end();
  }
}


export async function getLandingAnalyticsSummary(landingPageId, days = 7) {
  const db = await connect();
  const limitDays = parseInt(days, 10) || 7;

  try {

    const [rows] = await db.query(
      `SELECT 
  DATE(created_at) AS date,
  COUNT(*) AS total,
  event_type
FROM landing_analytics
WHERE landing_page_id = ?
  AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
GROUP BY event_type, DATE(created_at)
ORDER BY DATE(created_at) ASC

`,
      [landingPageId, limitDays]
    );

    // ✅ Restructure into frontend-friendly arrays
    const views = rows
      .filter((r) => r.event_type === "view")
      .map((r) => ({ date: r.date, total: r.total }));

    const clicks = rows
      .filter((r) => r.event_type === "click")
      .map((r) => ({ date: r.date, total: r.total }));

    const downloads = rows
      .filter((r) => r.event_type === "download")
      .map((r) => ({ date: r.date, total: r.total }));

    console.log("✅ Parsed views:", views);
    console.log("✅ Parsed clicks:", clicks);
    console.log("✅ Parsed downloads:", downloads);

    return { success: true, views, clicks, downloads };
  } catch (error) {
    console.error("❌ Error in getLandingAnalyticsSummary:", error);
    return { success: false, error };
  } finally {
    await db.end();
  }
}

export async function getLandingPageIdForUser(userId) {
  const db = await connect();
  try {
    const [rows] = await db.query(
      "SELECT id FROM user_landing_pages WHERE user_id = ?",
      [userId]
    );
    return rows.length ? rows[0].id : null;
  } finally {
    await db.end();
  }
}
