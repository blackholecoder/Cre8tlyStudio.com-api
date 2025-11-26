import connect from "./connect.js";

export async function getAllReports() {
  const db = connect();

  const [rows] = await db.query(`
    SELECT 
      u.id AS user_id,
      u.name AS user_name,
      u.email AS user_email,
      u.magnet_slots AS purchased_slots,
      lp.custom_domain AS landing_custom_domain,
      lp.username AS landing_username,
      COUNT(lm.id) AS total_reports,
      SUM(CASE WHEN lm.status = 'completed' THEN 1 ELSE 0 END) AS completed_reports,
      SUM(CASE WHEN lm.status = 'pending' THEN 1 ELSE 0 END) AS pending_reports,
      SUM(CASE WHEN lm.status = 'failed' THEN 1 ELSE 0 END) AS failed_reports,
      (u.magnet_slots - COUNT(lm.id)) AS remaining_slots,
      MAX(lm.created_at) AS last_created_at,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', lm.id,
          'prompt', lm.prompt,
          'theme', lm.theme,
          'status', lm.status,
          'pdf_url', lm.pdf_url,
          'original_pdf_url', lm.original_pdf_url,
          'slot_number', lm.slot_number,
          'created_at', lm.created_at,
          'created_at_prompt', lm.created_at_prompt,
          'edit_used', lm.edit_used,
          'edit_committed_at', lm.edit_committed_at,
          'bg_theme', lm.bg_theme,
          'cta', lm.cta,
          'logo', lm.logo,
          'link', lm.link,
          'cover_image', lm.cover_image
        )
      ) AS lead_magnets
    FROM users u
    LEFT JOIN lead_magnets lm 
      ON lm.user_id = u.id 
      AND lm.deleted_at IS NULL
      LEFT JOIN user_landing_pages lp 
  ON lp.user_id = u.id
    GROUP BY u.id, u.name, u.email, u.magnet_slots, lp.custom_domain, lp.username
    ORDER BY last_created_at DESC;
  `);

  return rows.map((r) => {
    let leadMagnets = [];
    let landing_url = null;

    if (r.landing_custom_domain) {
      // If user has a custom domain configured
      landing_url = `https://${r.landing_custom_domain}`;
    } else if (r.landing_username) {
      // Default Cre8tly subdomain
      landing_url = `https://${r.landing_username}.cre8tlystudio.com`;
    }

    try {
      if (typeof r.lead_magnets === "string") {
        leadMagnets = JSON.parse(r.lead_magnets);
      } else if (Array.isArray(r.lead_magnets)) {
        leadMagnets = r.lead_magnets;
      } else if (r.lead_magnets && typeof r.lead_magnets === "object") {
        leadMagnets = [r.lead_magnets];
      }
    } catch (err) {
      console.warn("⚠️ Failed to parse lead_magnets for user:", r.user_email);
    }

    return {
      ...r,
      lead_magnets: leadMagnets,
      landing_url,
    };
  });
}
