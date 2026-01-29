import connect from "../connect.js";

export async function getPaginatedDeliveries(page = 1, limit = 20) {
  const db = connect();
  const offset = (page - 1) * limit;

  const [rows] = await db.query(
    `
    SELECT 
      d.id,
      d.user_id,
      u.name AS buyer_name,
      d.buyer_email,
      d.product_id,
      d.product_name,
      d.download_url,
      d.delivered_at,
      d.thank_you_sent,

      -- Landing page fields
      lp.username,
      cd.domain AS custom_domain

    FROM deliveries d
    LEFT JOIN users u ON u.id = d.user_id
    LEFT JOIN user_landing_pages lp 
  ON lp.user_id = d.user_id

    LEFT JOIN custom_domains cd
      ON cd.user_id = d.user_id
    AND cd.is_primary = 1
    AND cd.verified = 1
    ORDER BY d.delivered_at DESC
    LIMIT ? OFFSET ?
    `,
    [limit, offset],
  );

  const [[countResult]] = await db.query(
    `SELECT COUNT(*) AS total FROM deliveries`,
  );

  // Build final landing page URL
  rows.forEach((d) => {
    if (d.custom_domain) {
      d.landing_url = `https://${d.custom_domain}`;
    } else if (d.username) {
      d.landing_url = `https://${d.username}.themessyattic.com`;
    } else {
      d.landing_url = null;
    }
  });

  return {
    deliveries: rows,
    pagination: {
      total: countResult.total,
      page,
      limit,
      totalPages: Math.ceil(countResult.total / limit),
    },
  };
}
