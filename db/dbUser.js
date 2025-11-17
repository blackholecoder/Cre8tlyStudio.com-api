import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import connect from "./connect.js";

export async function createUser({ name, email, password }) {
  const db = connect();
  const id = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    // 🔹 1. Create base user (standard insert)
    await db.query(
      `INSERT INTO users 
       (
         id,
         name,
         email,
         password_hash,
         role,
         has_magnet,
         magnet_slots,
         has_book,
         book_slots,
         has_memory,
         has_completed_book_onboarding,
         pro_covers,
         pro_status,
         billing_type,
         pro_expiration,
         created_at
       )
       VALUES (?, ?, ?, ?, 'customer', 0, 0, 0, 0, 0, 0, 0, 'inactive', NULL, NULL, NOW())`,
      [id, name, email, hashedPassword]
    );

    // 🔹 2. Initialize 7-day free trial
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.query(
      `UPDATE users
         SET has_magnet = 1,
             magnet_slots = 1,
             has_free_magnet = 1,
             is_free_user = 1,
             free_trial_expires_at = ?
       WHERE id = ?`,
      [expiresAt, id]
    );

    // 🔹 3. Create default free lead magnet slot
    const freeMagnetId = uuidv4();
    await db.query(
      `INSERT INTO lead_magnets
         (id, user_id, prompt, title, pdf_url, theme, font_name, font_file, created_at)
       VALUES (?, ?, '', 'Free Starter', '', 'modern', 'Montserrat', '/fonts/Montserrat-Regular.ttf', NOW())`,
      [freeMagnetId, id]
    );

    // 🔹 4. Return sanitized user object
    return {
      id,
      name,
      email,
      role: "customer",
      has_magnet: 1,
      magnet_slots: 1,
      has_book: 0,
      book_slots: 0,
      has_memory: 0,
      has_completed_book_onboarding: 0,
      pro_covers: 0,
      pro_status: "inactive",
      billing_type: null,
      pro_expiration: null,
      has_free_magnet: 1,
      free_trial_expires_at: expiresAt,
      created_at: new Date(),
    };
  } catch (err) {
    console.error("❌ Error creating user:", err);
    throw err;
  }
}

export async function logEmployeeReferral(refEmployee, email) {
  const db = connect();

  // Check if this is a valid admin employee
  const [rows] = await db.query(
    "SELECT id FROM users WHERE id = ? AND is_admin_employee = 1",
    [refEmployee]
  );

  if (rows.length === 0) return false;

  // Log referral
  await db.query(
    "INSERT INTO employee_referrals (id, employee_id, referred_email, created_at) VALUES (UUID(), ?, ?, NOW())",
    [refEmployee, email]
  );

  return true;
}

export async function getReferralsByEmployee(employeeId) {
  const db = connect();
  const [rows] = await db.query(
    `SELECT er.*, u.name AS employee_name
     FROM employee_referrals er
     LEFT JOIN users u ON er.employee_id = u.id
     WHERE er.employee_id = ?
     ORDER BY er.created_at DESC`,
    [employeeId]
  );
  return rows;
}
/**
 * ✅ Aggregate total referrals for all employees (for admin dashboard view)
 */
export async function getAllEmployeeReferralStats() {
  const db = connect();
  const [rows] = await db.query(`
    SELECT 
      u.id AS employee_id,
      u.name AS employee_name,
      u.email AS employee_email,
      COUNT(er.id) AS total_referrals
    FROM users u
    LEFT JOIN employee_referrals er ON u.id = er.employee_id
    WHERE u.is_admin_employee = 1
    GROUP BY u.id, u.name, u.email
    ORDER BY total_referrals DESC;
  `);
  return rows;
}

export async function getUserByEmail(email) {
  const db = connect();

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
         cta,
         pro_status,
         billing_type,
         pro_expiration,
         has_free_magnet,
         is_free_user,
         free_trial_expires_at,
         twofa_enabled,
         webauthn_challenge,          
         webauthn_id,                 
         webauthn_public_key,
         stripe_connect_account_id,
         has_passkey,
         is_admin_employee,
         plan
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    return rows[0] || null;
  } catch (err) {
    console.error("❌ Error in getUserByEmail:", err);
    throw err;
  }
}

export async function saveRefreshToken(userId, refreshToken) {
  const db = connect();
  await db.query("UPDATE users SET refresh_token=? WHERE id=?", [
    refreshToken,
    userId,
  ]);
  ;
}

export async function getUserByRefreshToken(refreshToken) {
  const db = connect();
  const [rows] = await db.query(
    "SELECT * FROM users WHERE refresh_token=? LIMIT 1",
    [refreshToken]
  );
  ;
  return rows[0] || null;
}

export async function updateUserRole(userId, role) {
  const db = connect();
  await db.query("UPDATE users SET role=? WHERE id=?", [role, userId]);
  ;
}

export async function getUserById(id) {
  const db = connect();

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
         pro_status,
         billing_type,
         pro_expiration,
        has_free_magnet,
        is_free_user,
        free_trial_expires_at,
        twofa_enabled,
        stripe_connect_account_id,
        has_passkey,
        is_admin_employee,
        plan
       FROM users 
       WHERE id = ?`,
      [id]
    );

    const user = rows[0] || null;
     if (!user) return null;
    // 🔹 Add a derived field for frontend convenience
    if (user?.free_trial_expires_at) {
      const now = new Date();
      const expires = new Date(user.free_trial_expires_at);
      user.trial_expired = now > expires;
      user.trial_days_remaining = Math.max(
        0,
        Math.ceil((expires - now) / (1000 * 60 * 60 * 24))
      );
    } else {
      user.trial_expired = false;
      user.trial_days_remaining = null;
    }

    return user;
  } catch (err) {
    console.error("❌ Error in getUserById:", err);
    throw err;
  }
}

export async function upgradeUserToProCovers(email) {
  const db = connect();

  try {
    // Double-check the user exists before updating
    const [rows] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    if (!rows.length) {
      console.warn(`⚠️ No user found for email: ${email}`);
      ;
      return false;
    }

    await db.query("UPDATE users SET pro_covers = 1 WHERE email = ?", [email]);
    ;

    console.log(`✅ Upgraded ${email} to Pro Covers`);
    return true;
  } catch (err) {
    console.error("❌ Failed to upgrade user to Pro Covers:", err.message);
    ;
    throw err;
  }
}

export async function upgradeUserToBooks(email) {
  const db = connect();
  try {
    const [rows] = await db.query(
      "SELECT id, book_slots FROM users WHERE email = ?",
      [email]
    );

    if (!rows.length) {
      console.warn(`⚠️ No user found for email: ${email}`);
      ;
      return false;
    }

    const user = rows[0];
    const newSlots = user.book_slots > 0 ? user.book_slots : 1;

    await db.query(
      "UPDATE users SET has_book = 1, pro_covers = 1, book_slots = ? WHERE email = ?",
      [newSlots, email]
    );

    console.log(`📚 Activated Book slot + Pro Covers for ${email}`);
    ;
    return true;
  } catch (err) {
    console.error("❌ upgradeUserToBooks failed:", err.message);
    ;
    throw err;
  }
}

export async function activatePromptMemory(email) {
  try {
    const db = connect();
    const [result] = await db.query(
      "UPDATE users SET has_memory = 1 WHERE email = ?",
      [email]
    );
    ;

    if (result.affectedRows === 0) {
      console.warn(`⚠️ No user found for activation with email: ${email}`);
    } else {
      console.log(`✅ Activated Prompt Memory for ${email}`);
    }
  } catch (err) {
    console.error(
      `❌ Error activating Prompt Memory for ${email}:`,
      err.message
    );
    throw err;
  }
}

export async function upgradeUserToMagnets(email) {
  const db = connect();
  try {
    const [rows] = await db.query(
      "SELECT id, magnet_slots FROM users WHERE email = ?",
      [email]
    );

    if (!rows.length) {
      console.warn(`⚠️ No user found for email: ${email}`);
      ;
      return false;
    }

    const user = rows[0];
    const newSlots = (user.magnet_slots || 0) + 15;

    await db.query(
      `UPDATE users 
         SET has_magnet = 1, 
             magnet_slots = ?, 
             has_free_magnet = 0,         -- 🚫 Remove free tier flag
             free_trial_expires_at = NULL  -- 🧹 Clear trial expiration
       WHERE email = ?`,
      [newSlots, email]
    );

    console.log(
      `🎯 Added +15 lead magnet slots for ${email} (new total: ${newSlots})`
    );
    ;
    return true;
  } catch (err) {
    console.error("❌ upgradeUserToMagnets failed:", err.message);
    ;
    throw err;
  }
}

export async function activateBusinessBuilder(email, billingCycle = "annual") {
  const db = connect();
  try {
    const [userRows] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    if (!userRows.length) {
      console.warn(`⚠️ No user found for email: ${email}`);
      ;
      return;
    }

    const userId = userRows[0].id;

    // ✅ 1-year lock period
    const lockedUntil = new Date();
    lockedUntil.setFullYear(lockedUntil.getFullYear() + 1);

    // ✅ Update subscription details
    await db.query(
      `UPDATE users 
       SET pro_status = 'active',
           billing_type = ?,
           plan = 'business_builder_pack',
           status = 'active',
           locked_until = ?,
           pro_expiration = ?
       WHERE id = ?`,
      [billingCycle, lockedUntil, lockedUntil, userId]
    );

    await Promise.all([
      upgradeUserToProCovers(email),
      activatePromptMemory(email),
      upgradeUserToMagnets(email),
    ]);


    console.log(`🎁 Granted 15 lead magnet slots to ${email}`);

    ;
    return true;
  } catch (err) {
    console.error("❌ activateBusinessBuilder failed:", err.message);
    ;
    throw err;
  }
}

export async function deactivateBusinessBuilder(email) {
  const db = connect();
  try {
    await db.query(
      `UPDATE users 
       SET pro_status = 'inactive',
           status = 'cancelled',
           pro_covers = 0,
           has_memory = 0,
           has_magnet = 0,
           magnet_slots = 0,
           has_free_magnet = 0,
           free_trial_expires_at = NULL,
           plan = NULL,
           billing_type = NULL,
           locked_until = NULL,
           pro_expiration = NULL
       WHERE email = ?`,
      [email]
    );
    console.log(`🚫 Business Builder Pack deactivated for ${email}`);
    ;
  } catch (err) {
    console.error("❌ deactivateBusinessBuilder failed:", err.message);
    ;
  }
}

export async function getLeadMagnetByPdfUrl(pdfUrl) {
  try {
    const db = connect();
    const [rows] = await db.query(
      "SELECT * FROM lead_magnets WHERE pdf_url = ? OR original_pdf_url = ? LIMIT 1",
      [pdfUrl, pdfUrl]
    );
    return rows[0] || null;
  } catch (err) {
    console.error("❌ getLeadMagnetByPdfUrl error:", err);
    throw err;
  }
}

// PASSKEYS FUNCTIONS
export async function updateWebAuthnChallenge(userId, challenge) {
  const db = connect();
  try {
    await db.query("UPDATE users SET webauthn_challenge = ? WHERE id = ?", [
      challenge,
      userId,
    ]);
  } catch (err) {
    console.error("❌ Error in updateWebAuthnChallenge:", err);
    throw err;
  }
}

// 🔹 Store the user’s credential public key and related data
export async function saveWebAuthnCredentials({
  userId,
  credentialID,
  credentialPublicKey,
  counter,
}) {
  const db = connect();
  try {
    await db.query(
      `UPDATE users SET 
        webauthn_id = ?, 
        webauthn_public_key = ?, 
        webauthn_counter = ? 
       WHERE id = ?`,
      [credentialID, credentialPublicKey, counter, userId]
    );

    // ✅ Mark user as having a passkey
    await db.query("UPDATE users SET has_passkey = 1 WHERE id = ?", [userId]);
  } catch (err) {
    console.error("❌ Error in saveWebAuthnCredentials:", err);
    throw err;
  }
}



// 🔹 Retrieve a user's WebAuthn credential info by email
export async function getWebAuthnCredentials(email) {
  const db = connect();
  try {
    const [rows] = await db.query(
      `SELECT 
         id AS id, 
         webauthn_id AS credentialID, 
         webauthn_public_key AS credentialPublicKey, 
         COALESCE(webauthn_counter, 0) AS counter,
         webauthn_challenge AS challenge
       FROM users 
       WHERE email = ? AND webauthn_id IS NOT NULL 
       LIMIT 1`,
      [email]
    );

    return rows[0] || null;
  } catch (err) {
    console.error("❌ Error in getWebAuthnCredentials:", err);
    throw err;
  } 
}

// 🔹 Update WebAuthn counter after successful authentication
export async function updateWebAuthnCounter(userId, newCounter) {
  const db = connect();
  try {
    await db.query("UPDATE users SET webauthn_counter = ? WHERE id = ?", [
      newCounter,
      userId,
    ]);
  } catch (err) {
    console.error("❌ Error in updateWebAuthnCounter:", err);
    throw err;
  }
}

export async function removeUserPasskey(userId) {
  const db = connect();
  try {
    await db.query(
      `UPDATE users 
       SET webauthn_id = NULL, 
           webauthn_public_key = NULL, 
           webauthn_counter = 0, 
           has_passkey = 0 
       WHERE id = ?`,
      [userId]
    );
    return { success: true };
  } catch (err) {
    console.error("❌ Error in removeUserPasskey:", err);
    throw err;
  }
}

// Stripe

export async function updateStripeAccountId(userId, accountId) {
  const db = connect();
  await db.query("UPDATE users SET stripe_connect_account_id = ? WHERE id = ?", [
    accountId,
    userId,
  ]);
  return true;
}
