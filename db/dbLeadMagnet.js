import { v4 as uuidv4 } from "uuid";
import connect from "./connect.js";

export async function createLeadMagnet(userId, prompt) {
  const db = await connect();
  const id = uuidv4();
  const createdAt = new Date();

  await db.query(
    `INSERT INTO lead_magnets 
      (id, user_id, prompt, pdf_url, price, status, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, prompt, "", 19.0, "pending", createdAt]
  );

  await db.end();
  return { id, status: "pending" };
}

export async function markLeadMagnetComplete(id, pdfUrl) {
  const db = await connect();
  await db.query(
    `UPDATE lead_magnets 
     SET pdf_url=?, status='completed' 
     WHERE id=? AND deleted_at IS NULL`,
    [pdfUrl, id]
  );
  await db.end();
}

export async function insertLeadMagnet({
  id,
  userId,
  prompt,
  pdfUrl,
  price,
  status,
  createdAt,
  stripeSessionId,
}) {
  const db = await connect();
  await db.query(
    `INSERT INTO lead_magnets 
      (id, user_id, prompt, pdf_url, price, status, created_at, stripe_session_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, prompt, pdfUrl, price, status, createdAt, stripeSessionId]
  );
  await db.end();
}

export async function getLeadMagnetBySessionId(sessionId) {
  const db = await connect();
  const [rows] = await db.query(
    "SELECT * FROM lead_magnets WHERE stripe_session_id = ? AND deleted_at IS NULL",
    [sessionId]
  );
  await db.end();
  console.log("DB lookup rows:", rows);
  return rows[0] || null;
}

export async function updateLeadMagnetPrompt(id, prompt) {
  const db = await connect();
  const [result] = await db.query(
    "UPDATE lead_magnets SET prompt=?, status='pending' WHERE id=? AND prompt='' AND deleted_at IS NULL",
    [prompt, id]
  );
  await db.end();
  return result.affectedRows > 0; // false if already had a prompt
}

export async function getLeadMagnetsByUser(userId) {
  const db = await connect();
  const [rows] = await db.query(
    "SELECT * FROM lead_magnets WHERE user_id=? AND deleted_at IS NULL ORDER BY created_at DESC",
    [userId]
  );
  await db.end();
  return rows;
}

export async function softDeleteLeadMagnet(id) {
  const db = await connect();
  await db.query(
    "UPDATE lead_magnets SET deleted_at=NOW() WHERE id=? AND deleted_at IS NULL",
    [id]
  );
  await db.end();
}

export async function getLeadMagnetById(id) {
  const db = await connect();
  const [rows] = await db.query("SELECT * FROM lead_magnets WHERE id = ?", [id]);
  return rows[0] || null;
}

export async function updateLeadMagnetStatus(magnetId, userId, status) {
  const db = await connect();
  return db.query(
    "UPDATE lead_magnets SET status = ? WHERE id = ? AND user_id = ?",
    [status, magnetId, userId]
  );
}

export async function saveLeadMagnetPdf(magnetId, userId, prompt, pdfUrl) {
  const db = await connect();
  return db.query(
    "UPDATE lead_magnets SET status = ?, prompt = ?, pdf_url = ? WHERE id = ? AND user_id = ?",
    ["completed", prompt, pdfUrl, magnetId, userId]
  );
}
