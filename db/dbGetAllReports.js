import connect from "./connect.js";

export async function getAllReports() {
  const db = await connect();

  const [rows] = await db.query(`
    SELECT 
      lm.id,
      u.name AS user_name,
      u.email AS user_email,
      lm.status,
      lm.theme,
      lm.slot_number,
      lm.created_at
    FROM lead_magnets lm
    LEFT JOIN users u ON lm.user_id = u.id
    ORDER BY lm.created_at DESC
  `);

  await db.end();
  return rows;
}
