import connect from "./connect.js";


export async function getAllLeads() {
  const db = connect();

  const [rows] = await db.query(`
    SELECT id, email, source, created_at
    FROM pdf_leads
    ORDER BY created_at DESC;
  `);

  ;
  return rows;
}