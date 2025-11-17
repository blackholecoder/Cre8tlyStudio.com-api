import connect from "./connect.js";


export async function getAdminStats() {
  const db = connect();

  // ✅ Total registered users
  const [[{ total_users }]] = await db.query(`
    SELECT COUNT(*) AS total_users FROM users;
  `);

  // ✅ Total lead magnets created
  const [[{ total_magnets }]] = await db.query(`
    SELECT COUNT(*) AS total_magnets FROM lead_magnets;
  `);

  // ✅ Completed lead magnets
  const [[{ completed_magnets }]] = await db.query(`
    SELECT COUNT(*) AS completed_magnets
    FROM lead_magnets
    WHERE status = 'completed';
  `);

  // ✅ Awaiting / Pending lead magnets
  const [[{ awaiting_magnets }]] = await db.query(`
    SELECT COUNT(*) AS awaiting_magnets
    FROM lead_magnets
    WHERE status IN ('awaiting_prompt','pending');
  `);

  // ✅ Optional: Failed (if you want to display error rates later)
  const [[{ failed_magnets }]] = await db.query(`
    SELECT COUNT(*) AS failed_magnets
    FROM lead_magnets
    WHERE status = 'failed';
  `);

  const [[{ total_leads }]] = await db.query(`
    SELECT COUNT(*) AS total_leads
    FROM pdf_leads;
  `);

  ;

  // ✅ Return clean data for frontend
  return {
    total_users,
    total_magnets,
    completed_magnets,
    awaiting_magnets,
    failed_magnets,
    total_leads
  };
}

