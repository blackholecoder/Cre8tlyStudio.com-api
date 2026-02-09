import connect from "./connect.js";

export async function getAdminStats() {
  const db = connect();

  // ✅ Total registered users
  const [[{ total_users }]] = await db.query(`
    SELECT COUNT(*) AS total_users FROM users;
  `);

  const [[{ total_leads }]] = await db.query(`
    SELECT COUNT(*) AS total_leads
    FROM pdf_leads;
  `);

  // ✅ Return clean data for frontend
  return {
    total_users,
    total_leads,
  };
}
