import { v4 as uuidv4 } from "uuid";
import connect from "./connect.js";

export async function createLeadMagnet(userId, prompt) {
  const db = await connect();
  const id = uuidv4();
  const createdAt = new Date();

  // ✅ Fetch user's pro_covers status
  const [userRows] = await db.query(
    "SELECT pro_covers FROM users WHERE id = ?",
    [userId]
  );
  const hasProCovers =
    userRows.length > 0 ? userRows[0].pro_covers === 1 : false;

  // ✅ Determine status and slot number
  const status = prompt && prompt.trim() !== "" ? "pending" : "awaiting_prompt";
  const [existing] = await db.query(
    "SELECT COUNT(*) AS total FROM lead_magnets WHERE user_id = ?",
    [userId]
  );
  const slotCount = existing[0].total;

  await db.query(
    `INSERT INTO lead_magnets 
      (id, user_id, prompt, pdf_url, price, status, created_at, theme, slot_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      prompt || null,
      "",
      19.0,
      status,
      createdAt,
      "modern",
      slotCount + 1,
    ]
  );

  await db.end();

  return { id, status, hasProCovers };
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
  slot_number,
}) {
  const db = await connect();
  await db.query(
    `INSERT INTO lead_magnets 
      (id, user_id, prompt, pdf_url, price, status, created_at, stripe_session_id, slot_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      prompt,
      pdfUrl,
      price,
      status,
      createdAt,
      stripeSessionId,
      slot_number,
    ]
  );
  await db.end();
}
export async function getLeadMagnetBySessionId(sessionId) {
  const db = await connect();
  const [rows] = await db.query(
    `
    SELECT id, user_id, slot_number, status, prompt, pdf_url, created_at, theme
    FROM lead_magnets
    WHERE stripe_session_id = ? AND deleted_at IS NULL
    `,
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

  // ✅ Fetch all magnets and user slot info in one go
  const [rows] = await db.query(
    `
    SELECT 
      lm.id,
      lm.user_id,
      lm.slot_number,
      lm.status,
      lm.prompt,
      lm.pdf_url,
      lm.created_at,
      lm.theme,
      lm.created_at_prompt,
      lm.edit_used,
      lm.edit_committed_at,
      u.magnet_slots AS total_slots,
      (
        SELECT COUNT(*) 
        FROM lead_magnets 
        WHERE user_id = lm.user_id 
          AND status = 'completed' 
          AND deleted_at IS NULL
      ) AS used_slots
    FROM lead_magnets lm
    JOIN users u ON lm.user_id = u.id
    WHERE lm.user_id = ? AND lm.deleted_at IS NULL
    ORDER BY lm.created_at DESC
    `,
    [userId]
  );

  await db.end();

  // ✅ Return both rows and a summary at the top level
  const summary =
    rows.length > 0
      ? {
          total_slots: rows[0].total_slots,
          used_slots: rows[0].used_slots,
          available_slots: Math.max(rows[0].total_slots - rows[0].used_slots, 0),
        }
      : { total_slots: 0, used_slots: 0, available_slots: 0 };

  return { magnets: rows, summary };
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
  const [rows] = await db.query("SELECT * FROM lead_magnets WHERE id = ?", [
    id,
  ]);
  return rows[0] || null;
}
export async function updateLeadMagnetStatus(magnetId, userId, status) {
  const db = await connect();
  return db.query(
    "UPDATE lead_magnets SET status = ? WHERE id = ? AND user_id = ?",
    [status, magnetId, userId]
  );
}
export async function saveLeadMagnetPdf(
  magnetId,
  userId,
  prompt,
  pdfUrl,
  theme,
  htmlContent,
  bgTheme,
  logo,
  link,
  coverImage,
  cta
) {
  console.log("🧾 DB Save coverImage:", coverImage);
  const db = await connect();
  const finalTheme = theme || "modern";
  const finalBgTheme = bgTheme || "modern";

  await db.query(
    `
    UPDATE lead_magnets
    SET 
      status = ?, 
      prompt = ?, 
      pdf_url = ?, 
      theme = ?, 
      bg_theme = ?, 
      logo = ?, 
      link = ?, 
      cover_image = ?, 
      cta = ?, 
      editable_html = ?, 
      created_at_prompt = NOW(),
      original_pdf_url = COALESCE(original_pdf_url, ?)
    WHERE id = ? AND user_id = ?
    `,
    [
      "completed",
      prompt,
      pdfUrl,
      finalTheme,
      finalBgTheme,
      logo,
      link,
      coverImage,
      cta,
      htmlContent,
      pdfUrl,
      magnetId,
      userId,
    ]
  );

  await db.end();
}
export async function getPromptMemory(userId) {
  const db = await connect();

  try {
    const [rows] = await db.query(
      `
      SELECT 
        id, 
        prompt, 
        created_at, 
        created_at_prompt
      FROM lead_magnets
      WHERE user_id = ?
        AND prompt IS NOT NULL 
        AND prompt != ''
      ORDER BY COALESCE(created_at_prompt, created_at) DESC
      `,
      [userId]
    );

    return rows;
  } catch (err) {
    console.error("❌ Error fetching prompt memory:", err);
    throw err;
  } finally {
    await db.end();
  }
}
