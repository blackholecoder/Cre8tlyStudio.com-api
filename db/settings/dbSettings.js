import connect from "../connect.js";

export async function getMaintenanceStatus() {
  const db = await connect();
  const [rows] = await db.query("SELECT site_maintenance FROM settings LIMIT 1");
  await db.end();
  return rows[0]?.site_maintenance === 1;
}