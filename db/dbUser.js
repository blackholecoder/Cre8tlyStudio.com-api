import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import connect from "./connect.js";

export async function createUser({ name, email, password }) {
  const db = await connect();
  const id = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 12);

  await db.query(
    `INSERT INTO users (id, name, email, password_hash) 
     VALUES (?, ?, ?, ?)`,
    [id, name, email, hashedPassword]
  );

  // await db.end();
  return { id, email, name, role: "customer" };
}

export async function getUserByEmail(email) {
  const db = await connect();
  const [rows] = await db.query(
    `SELECT 
       id,
       name,
       email,
       role,
       password_hash,
       pro_covers,
       has_book,
       has_magnet,
       book_slots,
       magnet_slots
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );
  await db.end();
  return rows[0] || null;
}

export async function saveRefreshToken(userId, refreshToken) {
  const db = await connect();
  await db.query("UPDATE users SET refresh_token=? WHERE id=?", [refreshToken, userId]);
  await db.end();
}

export async function getUserByRefreshToken(refreshToken) {
  const db = await connect();
  const [rows] = await db.query("SELECT * FROM users WHERE refresh_token=? LIMIT 1", [refreshToken]);
  await db.end();
  return rows[0] || null;
}

export async function updateUserRole(userId, role) {
  const db = await connect();
  await db.query("UPDATE users SET role=? WHERE id=?", [role, userId]);
  await db.end();
}

export async function getUserById(id) {
  const db = await connect();
  const [rows] = await db.query(
    `SELECT 
       id, 
       name, 
       email,
       has_book, 
       role, 
       profile_image_url, 
       pro_covers, 
       has_magnet,
       book_slots,
       magnet_slots,
       twofa_secret IS NOT NULL AS twofa_enabled 
     FROM users 
     WHERE id = ?`,
    [id]
  );
  await db.end();
  return rows[0] || null;
}

export async function upgradeUserToProCovers(email) {
  const db = await connect();

  try {
    // Double-check the user exists before updating
    const [rows] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (!rows.length) {
      console.warn(`⚠️ No user found for email: ${email}`);
      await db.end();
      return false;
    }

    await db.query("UPDATE users SET pro_covers = 1 WHERE email = ?", [email]);
    await db.end();

    console.log(`✅ Upgraded ${email} to Pro Covers`);
    return true;
  } catch (err) {
    console.error("❌ Failed to upgrade user to Pro Covers:", err.message);
    await db.end();
    throw err;
  }
}

export async function upgradeUserToBooks(email) {
  const db = await connect();
  try {
    const [rows] = await db.query(
      "SELECT id, book_slots FROM users WHERE email = ?",
      [email]
    );

    if (!rows.length) {
      console.warn(`⚠️ No user found for email: ${email}`);
      await db.end();
      return false;
    }

    const user = rows[0];
    let newSlots = user.book_slots || 0;

    // ✅ If user has no available slot, give them 1
    if (newSlots < 1) newSlots = 1;

    await db.query(
      "UPDATE users SET has_book = 1, book_slots = ? WHERE email = ?",
      [newSlots, email]
    );

    console.log(`📚 Activated 1 book slot (750 pages) for ${email}`);
    await db.end();
    return true;
  } catch (err) {
    console.error("❌ upgradeUserToBooks failed:", err.message);
    await db.end();
    throw err;
  }
}

export async function upgradeUserToMagnets(email) {
  const db = await connect();
  try {
    const [rows] = await db.query(
      "SELECT id, magnet_slots FROM users WHERE email = ?",
      [email]
    );
    if (!rows.length) {
      console.warn(`⚠️ No user found for email: ${email}`);
      await db.end();
      return false;
    }

    const user = rows[0];
    const newSlots = (user.magnet_slots || 0) + 5;

    await db.query(
      "UPDATE users SET has_magnet = 1, magnet_slots = ? WHERE email = ?",
      [newSlots, email]
    );

    console.log(`🎯 Added 5 lead magnet slots for ${email} (total: ${newSlots})`);
    await db.end();
    return true;
  } catch (err) {
    console.error("❌ upgradeUserToMagnets failed:", err.message);
    await db.end();
    throw err;
  }
}
