import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import connect from "./connect.js";

export async function createUser({ name, email, password }) {
  const db = await connect();
  const id = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    await db.query(
      `INSERT INTO users 
       (id, name, email, password_hash, role, has_magnet, magnet_slots, has_completed_book_onboarding, has_memory, created_at)
       VALUES (?, ?, ?, ?, 'customer', 0, 0, 0, 0, NOW())`,
      [id, name, email, hashedPassword]
    );

    console.log(`✅ New user created: ${email}`);

    return {
      id,
      name,
      email,
      role: "customer",
      has_magnet: 0,
      magnet_slots: 0,
      has_completed_book_onboarding: 0,
      has_memory: 0,
      created_at: new Date(),
    };
  } catch (err) {
    console.error("❌ Error creating user:", err);
    throw err;
  } finally {
    await db.end();
  }
}

export async function getUserByEmail(email) {
  const db = await connect();

  try {
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
         magnet_slots,
         brand_identity_file,
         has_completed_book_onboarding,
         has_memory,
         cta
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    return rows[0] || null;
  } catch (err) {
    console.error("❌ Error in getUserByEmail:", err);
    throw err;
  } finally {
    await db.end();
  }
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

  try {
    const [rows] = await db.query(
      `SELECT 
         id, 
         name, 
         email,
         role, 
         profile_image_url, 
         brand_identity_file,
         pro_covers, 
         has_book, 
         book_slots,
         has_magnet,
         magnet_slots,
         has_memory,
         has_completed_book_onboarding,
         cta,
         created_at,
         twofa_secret IS NOT NULL AS twofa_enabled
       FROM users 
       WHERE id = ?`,
      [id]
    );

    return rows[0] || null;
  } catch (err) {
    console.error("❌ Error in getUserById:", err);
    throw err;
  } finally {
    await db.end();
  }
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
    const newSlots = user.book_slots > 0 ? user.book_slots : 1;

    await db.query(
      "UPDATE users SET has_book = 1, pro_covers = 1, book_slots = ? WHERE email = ?",
      [newSlots, email]
    );

    console.log(`📚 Activated Book slot + Pro Covers for ${email}`);
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

export async function upgradeUserToBundle(email) {
  const db = await connect();
  try {
    const [rows] = await db.query(
      "SELECT id, book_slots, has_magnet, has_book, pro_covers FROM users WHERE email = ?",
      [email]
    );

    if (!rows.length) {
      console.warn(`⚠️ No user found for email: ${email}`);
      await db.end();
      return false;
    }

    const user = rows[0];
    const newBookSlots = user.book_slots > 0 ? user.book_slots : 1;

    await db.query(
      `UPDATE users 
       SET has_magnet = 1, 
           pro_covers = 1, 
           has_book = 1, 
           book_slots = ? 
       WHERE email = ?`,
      [newBookSlots, email]
    );

    console.log(`🎁 Bundle activated for ${email}: 5 magnets, Pro Covers, 1 book slot`);
    await db.end();
    return true;
  } catch (err) {
    console.error("❌ upgradeUserToBundle failed:", err.message);
    await db.end();
    throw err;
  }
}


