import connect from "./connect.js";


export async function getAllLeads() {
  const db = await connect();

  const [rows] = await db.query(`
    SELECT id, email, source, created_at
    FROM pdf_leads
    ORDER BY created_at DESC;
  `);

  await db.end();
  return rows;
}