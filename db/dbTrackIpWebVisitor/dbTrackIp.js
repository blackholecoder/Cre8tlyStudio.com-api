import axios from "axios";
import connect from "../connect.js";
import { v4 as uuid } from "uuid";

export async function logWebsiteVisitor({
  page,
  full_url,
  referrer,
  utm,
  device_type,
  browser,
  screen_width,
  screen_height,
  timezone,
  language,
  ipAddress,
  countryHeader,
}) {
  let city = null;
  let region = null;
  let country = countryHeader || null;

  /* -------------------------
      GEO LOOKUP (Safe)
  -------------------------- */
  try {
    if (ipAddress) {
      const { data: geo } = await axios.get(
        `http://ip-api.com/json/${ipAddress}`,
      );

      if (geo?.status === "success") {
        city = geo.city || null;
        region = geo.regionName || null;
        country = geo.country || countryHeader || null;
      }
    }
  } catch (err) {
    console.error("Geo lookup failed:", err.message);
  }

  const db = connect();

  /* -------------------------
      Check if visitor exists
      Matching IP + UserAgent in last 24h
  -------------------------- */
  let existing = null;
  try {
    const [rows] = await db.query(
      `
      SELECT id, visit_count
      FROM website_visitors
      WHERE ip_address = ?
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [ipAddress],
    );

    if (rows.length > 0) {
      existing = rows[0];
    }
  } catch (err) {
    console.error("Lookup existing visitor failed:", err);
  }

  /* -------------------------
      If returning visitor
  -------------------------- */
  if (existing) {
    try {
      await db.query(
        `
        UPDATE website_visitors
        SET 
          page = ?,
          full_url = ?,
          referrer = ?,
          device_type = ?,
          browser = ?,
          screen_width = ?,
          screen_height = ?,
          timezone = ?,
          language = ?,
          country = ?,
          region = ?,
          city = ?,
          is_returning = 1,
          visit_count = visit_count + 1,
          updated_at = NOW()
        WHERE id = ?
      `,
        [
          page,
          full_url,
          referrer,
          device_type,
          browser,
          screen_width,
          screen_height,
          timezone,
          language,
          country,
          region,
          city,
          existing.id,
        ],
      );
    } catch (err) {
      console.error("Failed updating returning visitor:", err);
    }

    return existing.id;
  }

  /* -------------------------
      First time visitor → INSERT
  -------------------------- */

  const id = uuid();

  try {
    await db.query(
      `
      INSERT INTO website_visitors
      (id, ip_address, page, full_url, referrer,
       utm_source, utm_medium, utm_campaign, utm_term, utm_content,
       fbclid, ttclid,
       device_type, browser, screen_width, screen_height,
       timezone, language, country, region, city,
       is_returning, visit_count, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, NOW())
    `,
      [
        id,
        ipAddress,
        page,
        full_url,
        referrer,

        utm.utm_source || null,
        utm.utm_medium || null,
        utm.utm_campaign || null,
        utm.utm_term || null,
        utm.utm_content || null,
        utm.fbclid || null,
        utm.ttclid || null,

        device_type,
        browser,
        screen_width,
        screen_height,
        timezone,
        language,
        country,
        region,
        city,
      ],
    );
  } catch (err) {
    console.error("Failed inserting visitor:", err);
  }

  return id;
}

export async function logVisitorExitEvent({
  visitor_id,
  page,
  max_scroll,
  time_on_page,
  clicks,
}) {
  try {
    const db = connect();
    await db.query(
      `INSERT INTO website_visitor_events
      (id, visitor_id, page, max_scroll, time_on_page, click_events)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuid(),
        visitor_id,
        page,
        max_scroll,
        time_on_page,
        JSON.stringify(clicks || []),
      ],
    );
  } catch (err) {
    console.error("Failed inserting exit event:", err);
  }
}
