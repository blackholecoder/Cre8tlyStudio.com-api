import connect from "../connect.js";

export async function getMaintenanceStatus() {
  const db = connect();
  const [rows] = await db.query(
    "SELECT site_maintenance FROM settings LIMIT 1"
  );
  return rows[0]?.site_maintenance === 1;
}

export async function setMaintenanceStatus(enabled) {
  const db = connect();
  await db.query("UPDATE settings SET site_maintenance = ? LIMIT 1", [
    enabled ? 1 : 0,
  ]);
  return enabled;
}
