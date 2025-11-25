import connect from "../connect.js";





export async function getVisitorsOverTime() {
  try {
    const db = connect();
    const [rows] = await db.query(`
      SELECT DATE(created_at) AS date, COUNT(*) AS visitors
      FROM website_visitors
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    return rows;
  } catch (err) {
    console.error("DB error getVisitorsOverTime:", err);
    return [];
  }
}


export async function getVisitorsByLocation() {
  try {
    const db = connect();
    const [rows] = await db.query(`
      SELECT country, region, city, COUNT(*) AS total
      FROM website_visitors
      GROUP BY country, region, city
    `);
    return rows;
  } catch (err) {
    console.error("DB error getVisitorsByLocation:", err);
    return [];
  }
}

export async function getDevices() {
  try {
    const db = connect();
    const [rows] = await db.query(`
      SELECT device_type, COUNT(*) AS total
      FROM website_visitors
      GROUP BY device_type
    `);
    return rows;
  } catch (err) {
    console.error("DB error getDevices:", err);
    return [];
  }
}

export async function getPageViews() {
  try {
    const db = connect();
    const [rows] = await db.query(`
      SELECT page, COUNT(*) AS total
      FROM website_visitor_events
      WHERE page IS NOT NULL
      GROUP BY page
      ORDER BY total DESC
    `);

    return rows;
  } catch (err) {
    console.error("DB error getPageViews:", err);
    return [];
  }
}

export async function getUniqueReturning() {
  try {
    const db = connect();
    const [rows] = await db.query(`
      SELECT 
        SUM(is_returning = 0) AS unique_visitors,
        SUM(is_returning = 1) AS returning_visitors
      FROM website_visitors
    `);
    return rows[0];
  } catch (err) {
    console.error("DB error getUniqueReturning:", err);
    return { unique_visitors: 0, returning_visitors: 0 };
  }
}

export async function getOnlineVisitors() {
  try {
    const db = connect();
    const [rows] = await db.query(`
      SELECT COUNT(*) AS online
      FROM website_visitors
      WHERE updated_at > NOW() - INTERVAL 2 MINUTE
    `);
    return rows[0];
  } catch (err) {
    console.error("DB error getOnlineVisitors:", err);
    return { online: 0 };
  }
}