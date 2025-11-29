import connect from "../connect.js";

export async function getRecentLeadMagnetsPaginated(page = 1, limit = 10) {
  const db = connect();

  const offset = (page - 1) * limit;

  const [rows] = await db.query(
    `
    SELECT 
      lm.id,
      lm.title,
      lm.status,
      lm.pdf_url,
      lm.created_at,
      u.name AS user_name,
      u.email AS user_email
    FROM lead_magnets lm
    LEFT JOIN users u ON u.id = lm.user_id
    WHERE lm.status = 'completed' 
      AND lm.deleted_at IS NULL
    ORDER BY lm.created_at DESC
    LIMIT ? OFFSET ?
    `,
    [limit, offset]
  );

  const [[countRow]] = await db.query(
    `
    SELECT COUNT(*) as total 
    FROM lead_magnets lm
    WHERE lm.status = 'completed' 
      AND lm.deleted_at IS NULL
    `
  );

  return { magnets: rows, total: countRow.total };
}

