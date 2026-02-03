import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import connect from "./connect.js";
import AWS from "aws-sdk";
import { sendOutLookMail } from "../utils/sendOutllokMail.js";
import axios from "axios";

async function sendFreeTrialNotification({ name, email, userId, expiresAt }) {
  const html = `
    <div style="background:#0b0b0b;padding:40px 0;font-family:Arial,sans-serif;">
      <table align="center" width="600" cellpadding="0" cellspacing="0"
        style="background:#111;border-radius:14px;color:#f2f2f2;
        box-shadow:0 0 25px rgba(0,0,0,0.6);padding:0;">

        <!-- Header -->
        <tr>
          <td align="center" style="padding:35px 40px 10px 40px;">
            <img src="https://themessyattic.com/themessyattic-logo.png" width="95" style="opacity:0.95;" />
            <h2 style="color:#7bed9f;font-size:26px;margin:20px 0 5px 0;">
              New Free Trial Sign Up
            </h2>
            <p style="font-size:14px;color:#ccc;margin:0;">A new user just joined The Messy Attic</p>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 60px;">
            <div style="height:1px;background:#222;margin:25px 0;"></div>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding:0 50px 20px 50px;font-size:15px;line-height:1.7;text-align:center;">
            You received a new free trial signup inside The Messy Attic. Here are the details:
          </td>
        </tr>

        <!-- User Details Box -->
        <tr>
          <td align="center" style="padding:0 50px 35px 50px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#0e0e0e;border-radius:10px;padding:20px;
              border:1px solid #1e1e1e;">

              <tr>
                <td style="font-size:15px;padding:8px;color:#7bed9f;font-weight:bold;">Name</td>
                <td style="font-size:15px;padding:8px;color:#ccc;text-align:right;">${name}</td>
              </tr>

              <tr>
                <td style="font-size:15px;padding:8px;color:#7bed9f;font-weight:bold;">Email</td>
                <td style="font-size:15px;padding:8px;color:#ccc;text-align:right;">${email}</td>
              </tr>

              <tr>
                <td style="font-size:15px;padding:8px;color:#7bed9f;font-weight:bold;">User ID</td>
                <td style="font-size:15px;padding:8px;color:#ccc;text-align:right;">${userId}</td>
              </tr>

              <tr>
                <td style="font-size:15px;padding:8px;color:#7bed9f;font-weight:bold;">Trial Expires</td>
                <td style="font-size:15px;padding:8px;color:#ccc;text-align:right;">
                  ${expiresAt.toISOString().slice(0, 10)}
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="font-size:13px;color:#777;padding:0 0 35px 0;">
            Notification sent automatically from The Messy Attic
          </td>
        </tr>

      </table>
    </div>
  `;

  await sendOutLookMail({
    to: "business@aluredigital.com",
    subject: "New Free Trial Signup on The Messy Attic",
    html,
  });
}

// Free Trial User EMAIL
async function sendFreeTrialWelcomeEmail({ name, email, expiresAt }) {
  const html = `
    <div style="background:#0b0b0b;padding:40px 0;font-family:Arial,sans-serif;">
      <table align="center" width="600" cellpadding="0" cellspacing="0" 
        style="background:#111;border-radius:14px;padding:0;color:#f2f2f2;box-shadow:0 0 25px rgba(0,0,0,0.6);">
        
        <!-- Header / Hero -->
        <tr>
          <td align="center" style="padding:40px 40px 10px 40px;">
            <img src="https://themessyattic.com/themessyattic-logo.png" width="95" style="opacity:0.95;" />
            <h2 style="color:#7bed9f;font-size:28px;margin:20px 0 5px 0;">Welcome to The Messy Attic</h2>
            <p style="font-size:15px;color:#ccc;margin:0;">Your creative engine is now unlocked</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:20px 50px 0 50px;font-size:15px;line-height:1.7;text-align:center;">
            Hi ${name}, your free seven day trial is now active. You now have full access to create lead magnets, ebooks, covers, landing pages, brand assets, and complete digital products all inside one platform.
          </td>
        </tr>

        <tr>
          <td style="padding:20px 50px 10px 50px;font-size:16px;line-height:1.6;text-align:center;color:#7bed9f;font-weight:bold;">
            If there was ever a time you needed to make money online, now is that time.
          </td>
        </tr>

        <tr>
          <td style="padding:10px 50px;font-size:15px;line-height:1.7;text-align:center;">
            The Messy Attic is now a true all in one platform for creators. Build everything in one place with your own fonts, branding, and visual style. The Live Editor gives you real time control over each line of your digital product, and the Design Canvas lets you add shapes, visuals, highlights, and creative assets without extra tools.
          </td>
        </tr>

        <tr>
          <td style="padding:10px 50px;font-size:15px;line-height:1.7;text-align:center;">
            Create high converting landing pages with strong CTAs, email capture, branded sections, custom domains, analytics, and your logo. No extra software required.
          </td>
        </tr>

        <tr>
          <td style="padding:10px 50px;font-size:15px;line-height:1.7;text-align:center;">
            Sell your digital products directly inside The Messy Attic. Connect your Express account, upload your creations, track sales and manage customers. Automated weekly payouts, no middleman, no complexity.
          </td>
        </tr>

        <tr>
          <td style="padding:10px 50px 30px 50px;font-size:15px;line-height:1.7;text-align:center;">
            Create it, design it, publish it, and sell it in one place. If you want a tool that saves time, saves money, and builds a ready to go automated sales funnel, you just found it. Put your business on autopilot with The Messy Attic.
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 60px;">
            <div style="height:1px;background:#222;margin:20px 0;"></div>
          </td>
        </tr>

        <!-- Three Step Checklist -->
        <tr>
          <td style="padding:0 40px 30px 40px;text-align:center;">
            <h3 style="color:#7bed9f;font-size:20px;margin-bottom:20px;">Your First Steps</h3>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:10px 0;font-size:15px;color:#ccc;">
                  <strong style="color:#7bed9f;">1.</strong> Create your first lead magnet or ebook
                </td>
              </tr>

              <tr>
                <td style="padding:10px 0;font-size:15px;color:#ccc;">
                  <strong style="color:#7bed9f;">2.</strong> Add visuals, highlights, and shapes using the Design Canvas
                </td>
              </tr>

              <tr>
                <td style="padding:10px 0;font-size:15px;color:#ccc;">
                  <strong style="color:#7bed9f;">3.</strong> View your creation and prepare it for your upgraded features
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 50px 30px 50px;text-align:center;font-size:15px;">
            Your trial expires on <strong>${expiresAt
              .toISOString()
              .slice(0, 10)}</strong>.
          </td>
        </tr>

        <!-- CTA Button -->
        <tr>
          <td align="center" style="padding-bottom:40px;">
            <a href="https://themessyattic.com/login"
            style="
              background:#7bed9f;
              color:#000;
              padding:14px 40px;
              border-radius:8px;
              text-decoration:none;
              font-weight:700;
              font-size:16px;
              display:inline-block;
            ">
  Start Creating
</a>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="font-size:13px;color:#777;padding-bottom:35px;">
            Need help? Contact  
            <a href="mailto:support@aluredigital.com" style="color:#7bed9f;text-decoration:none;">
              support@aluredigital.com
            </a>
          </td>
        </tr>

      </table>
    </div>
  `;

  await sendOutLookMail({
    to: email,
    subject: "Welcome to The Messy Attic Free Trial",
    html,
  });
}

export async function createUser({ name, username, email, password }) {
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
     username,
     email,
     password_hash,
     role,
     profile_image_url,
     has_magnet,
     magnet_slots,
     has_book,
     book_slots,
     has_memory,
     has_completed_book_onboarding,
     pro_covers,
     plan,
     basic_annual,
     pro_status,
     billing_type,
     pro_expiration,
     created_at
   )
   VALUES (
     ?, ?, ?, ?, ?, 'customer',
     NULL,
     0, 0,
     0, 0,
     0, 0,
     0,
     NULL,        -- plan
     0,           -- basic_annual
     'inactive',
     NULL,
     NULL,
     NOW()
   )`,
      [id, name, username, email, hashedPassword],
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
      [expiresAt, id],
    );

    // 🔹 3. Create default free lead magnet slot
    const freeMagnetId = uuidv4();
    await db.query(
      `INSERT INTO lead_magnets
         (id, user_id, prompt, title, pdf_url, theme, font_name, font_file, created_at)
       VALUES (?, ?, '', 'Free Starter', '', 'modern', 'Montserrat', '/fonts/Montserrat-Regular.ttf', NOW())`,
      [freeMagnetId, id],
    );

    await sendFreeTrialNotification({
      name,
      email,
      userId: id,
      expiresAt,
    });

    await sendFreeTrialWelcomeEmail({
      name,
      email,
      expiresAt,
    });

    // 🔹 4. Return sanitized user object
    return {
      id,
      name,
      username,
      email,
      role: "customer",
      profile_image: null,
      has_magnet: 1,
      magnet_slots: 1,
      has_book: 0,
      book_slots: 0,
      has_memory: 0,
      has_completed_book_onboarding: 0,
      pro_covers: 0,
      plan: null,
      basic_annual: 0,
      billing_type: null,
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

export async function createCommunityUser({ name, username, email, password }) {
  const db = connect();
  const id = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    await db.query(
      `INSERT INTO users (
        id,
        name,
        username,
        email,
        password_hash,
        role,
        is_member,
        is_free_user,
        has_magnet,
        magnet_slots,
        has_book,
        book_slots,
        has_memory,
        has_completed_book_onboarding,
        pro_covers,
        plan,
        basic_annual,
        pro_status,
        billing_type,
        pro_expiration,
        free_trial_expires_at,
        created_at
      )
      VALUES (
        ?, ?, ?, ?, ?, 'customer',
        1,           -- is_member
        1,           -- is_free_user
        0, 0,
        0, 0,
        0, 0,
        0,
        NULL,
        0,
        'inactive',
        NULL,
        NULL,
        NULL,
        NOW()
      )`,
      [id, name, username, email, hashedPassword],
    );

    try {
      await sendCommunitySignupNotification({ name, email });
    } catch (err) {
      console.error("⚠️ Community signup notification failed:", err);
    }

    // 📩 welcome USER
    try {
      await sendCommunityWelcomeEmail({ name, email });
    } catch (err) {
      console.error("⚠️ Community welcome email failed:", err);
    }

    return {
      id,
      name,
      username,
      email,
      role: "customer",
      is_member: 1,
      is_free_user: 1,
      created_at: new Date(),
    };
  } catch (err) {
    console.error("❌ Error creating community user:", err);
    throw err;
  }
}

export async function logEmployeeReferral(refSlug, email, referredUserId) {
  const db = connect();

  // 1. Look up real employee_id using the slug
  const [slugRows] = await db.query(
    "SELECT employee_id FROM referral_slugs WHERE slug = ? LIMIT 1",
    [refSlug],
  );

  if (slugRows.length === 0) {
    console.warn("⚠ Invalid referral slug:", refSlug);
    return false;
  }

  const employeeId = slugRows[0].employee_id;

  // 2. Verify employee is an admin employee
  const [employeeRows] = await db.query(
    "SELECT id FROM users WHERE id = ? AND is_admin_employee = 1",
    [employeeId],
  );

  if (employeeRows.length === 0) {
    console.warn("⚠ Referral slug belongs to non-admin employee:", refSlug);
    return false;
  }

  // 3. Log referral
  await db.query(
    "INSERT INTO employee_referrals (id, employee_id, referred_user_id, referred_email, created_at) VALUES (UUID(), ?, ?, ?, NOW())",
    [employeeId, referredUserId, email],
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
    [employeeId],
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
         username,
         email,
         role,
         profile_image_url, 
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
         plan,
         basic_annual,
         theme,
         is_member,
         stripe_subscription_id,
        subscription_status,
        subscription_price_id,
        subscription_current_period_end,
        authors_assistant_override

       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email],
    );

    return rows[0] || null;
  } catch (err) {
    console.error("❌ Error in getUserByEmail:", err);
    throw err;
  }
}

export async function getUserById(id) {
  const db = connect();

  try {
    const [rows] = await db.query(
      `
  SELECT 
    u.id, 
    u.name, 
    u.username,
    u.email,
    u.role, 
    u.profile_image_url, 
    u.brand_identity_file,
    u.pro_covers, 
    u.has_book, 
    u.book_slots,
    u.has_magnet,
    u.magnet_slots,
    u.has_memory,
    u.has_completed_book_onboarding,
    u.cta,
    u.created_at,
    u.pro_status,
    u.billing_type,
    u.pro_expiration,
    u.has_free_magnet,
    u.is_free_user,
    u.free_trial_expires_at,
    u.twofa_enabled,
    u.stripe_connect_account_id,
    u.has_passkey,
    u.is_admin_employee,
    u.plan,
    u.basic_annual,
    u.theme,
    u.is_member,
    rs.slug AS referral_slug,
    u.stripe_subscription_id,
    u.subscription_status,
    u.subscription_price_id,
    u.subscription_current_period_end,
    u.authors_assistant_override


  FROM users u
  LEFT JOIN referral_slugs rs
    ON rs.employee_id = u.id
  WHERE u.id = ?
  `,
      [id],
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
        Math.ceil((expires - now) / (1000 * 60 * 60 * 24)),
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

export async function getUserByUsername(username) {
  const db = connect();
  const [[row]] = await db.query(
    `SELECT id FROM users WHERE username = ? LIMIT 1`,
    [username],
  );
  return row || null;
}

export async function saveRefreshToken(userId, refreshToken) {
  const db = connect();
  await db.query("UPDATE users SET refresh_token=? WHERE id=?", [
    refreshToken,
    userId,
  ]);
}

export async function logUserActivity({
  userId,
  eventType = "login",
  ipAddress = null,
  userAgent = null,
  country = null,
}) {
  let city = null;
  let region = null;

  try {
    if (ipAddress) {
      // Do NOT override IPv6
      const { data: geo } = await axios.get(
        `http://ip-api.com/json/${ipAddress}`,
      );

      if (geo?.status === "success") {
        // keep IPv6 even if they return IPv4 format
        city = geo.city || null;
        region = geo.regionName || null;
        country = geo.country || country;
      } else {
        console.log("🌎 Geo lookup failed for:", ipAddress);
      }
    }
  } catch (err) {
    console.error("🌎 Axios geo lookup failed:", err.message);
  }

  try {
    const db = connect();
    await db.query(
      `INSERT INTO user_activity_log 
       (user_id, event_type, ip_address, user_agent, country, region, city)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, eventType, ipAddress, userAgent, country, region, city],
    );
  } catch (err) {
    console.error("🔥 Failed to log activity:", err);
  }
}

export async function getUserByRefreshToken(refreshToken) {
  const db = connect();
  const [rows] = await db.query(
    "SELECT * FROM users WHERE refresh_token=? LIMIT 1",
    [refreshToken],
  );
  return rows[0] || null;
}

export async function rotateRefreshToken(userId, newToken, oldToken) {
  try {
    const db = connect();
    if (!userId || !newToken || !oldToken) {
      return false;
    }

    const [result] = await db.query(
      `
      UPDATE users
      SET
        refresh_token = ?,
        previous_refresh_token = ?
      WHERE id = ?
        AND (refresh_token = ? OR previous_refresh_token = ?)
      `,
      [newToken, oldToken, userId, oldToken, oldToken],
    );

    return result.affectedRows === 1;
  } catch (err) {
    console.error("❌ rotateRefreshToken error:", {
      userId,
      err,
    });
    return false;
  }
}

export async function isRefreshTokenValid(userId, token) {
  try {
    const db = connect();
    if (!userId || !token) {
      return false;
    }

    const [rows] = await db.query(
      `
      SELECT 1
      FROM users
      WHERE id = ?
        AND (
          refresh_token = ?
          OR previous_refresh_token = ?
        )
      LIMIT 1
      `,
      [userId, token, token],
    );

    return rows.length > 0;
  } catch (err) {
    console.error("❌ isRefreshTokenValid error:", {
      userId,
      err,
    });
    return false;
  }
}

export async function getAdminByRefreshToken(refreshToken) {
  try {
    const db = connect();
    const [rows] = await db.query(
      "SELECT * FROM users WHERE admin_refresh_token = ? LIMIT 1",
      [refreshToken],
    );
    return rows[0] || null;
  } catch (err) {
    console.error("❌ getAdminByRefreshToken error:", err);
    throw err;
  }
}

export async function saveAdminRefreshToken(userId, token) {
  try {
    const db = connect();
    await db.query("UPDATE users SET admin_refresh_token = ? WHERE id = ?", [
      token,
      userId,
    ]);
  } catch (err) {
    console.error("❌ saveAdminRefreshToken error:", err);
    throw err;
  }
}

export async function updateUserRole(userId, role) {
  const db = connect();
  await db.query("UPDATE users SET role=? WHERE id=?", [role, userId]);
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
      return false;
    }

    await db.query("UPDATE users SET pro_covers = 1 WHERE email = ?", [email]);
    console.log(`✅ Upgraded ${email} to Pro Covers`);
    return true;
  } catch (err) {
    console.error("❌ Failed to upgrade user to Pro Covers:", err.message);
    throw err;
  }
}

export async function provisionAuthorsAssistantOnce(userId) {
  const db = connect();

  try {
    // 1️⃣ Fetch current user + slots
    const [[user]] = await db.query(
      `
      SELECT has_book, book_slots
      FROM users
      WHERE id = ?
      `,
      [userId],
    );

    if (!user) {
      console.warn(`⚠️ No user found for id: ${userId}`);
      return false;
    }

    const bookSlots = user.book_slots > 0 ? user.book_slots : 1;

    // 2️⃣ Enable book access (idempotent)
    await db.query(
      `
      UPDATE users
      SET
        has_book = 1,
        pro_covers = 1,
        book_slots = ?
      WHERE id = ?
      `,
      [bookSlots, userId],
    );

    // 3️⃣ Check existing books
    const [existingBooks] = await db.query(
      `
      SELECT id, slot_number
      FROM generated_books
      WHERE user_id = ?
        AND deleted_at IS NULL
      `,
      [userId],
    );

    const existingSlots = new Set(existingBooks.map((b) => b.slot_number));

    // 4️⃣ Create missing placeholder books
    for (let slot = 1; slot <= bookSlots; slot++) {
      if (existingSlots.has(slot)) continue;

      await db.query(
        `
        INSERT INTO generated_books (
          id,
          user_id,
          book_name,
          prompt,
          status,
          pages,
          part_number,
          slot_number,
          created_at
        )
        VALUES (
          ?, ?, 'Untitled Book', '', 'awaiting_prompt', 0, 1, ?, NOW()
        )
        `,
        [uuidv4(), userId, slot],
      );
    }

    return true;
  } catch (err) {
    console.error("❌ provisionAuthorsAssistantOnce failed:", err);
    throw err;
  }
}

export async function activatePromptMemory(email) {
  try {
    const db = connect();
    const [result] = await db.query(
      "UPDATE users SET has_memory = 1 WHERE email = ?",
      [email],
    );
    if (result.affectedRows === 0) {
      console.warn(`⚠️ No user found for activation with email: ${email}`);
    } else {
      console.log(`✅ Activated Prompt Memory for ${email}`);
    }
  } catch (err) {
    console.error(
      `❌ Error activating Prompt Memory for ${email}:`,
      err.message,
    );
    throw err;
  }
}

export async function upgradeUserToMagnets(email, slotLimit = 15) {
  const db = connect();
  try {
    const [rows] = await db.query(
      "SELECT id, magnet_slots FROM users WHERE email = ?",
      [email],
    );

    if (!rows.length) {
      console.warn(`⚠️ No user found for email: ${email}`);
      return false;
    }

    const user = rows[0];

    // ✅ Ensure total slots are capped, not stacked
    const newSlots = Math.max(user.magnet_slots || 0, slotLimit);

    await db.query(
      `UPDATE users 
       SET has_magnet = 1,
           magnet_slots = ?,
           has_free_magnet = 0,
           free_trial_expires_at = NULL
       WHERE email = ?`,
      [newSlots, email],
    );

    console.log(`🎯 Set lead magnet slots to ${newSlots} for ${email}`);

    return true;
  } catch (err) {
    console.error("❌ upgradeUserToMagnets failed:", err.message);
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
           pro_expiration = ?,
           basic_annual = 0,
           basic_expiration = NULL
       WHERE id = ?`,
      [billingCycle, lockedUntil, lockedUntil, userId],
    );

    await Promise.all([
      upgradeUserToProCovers(email),
      activatePromptMemory(email),
      upgradeUserToMagnets(email),
    ]);

    console.log(`🎁 Granted 15 lead magnet slots to ${email}`);

    return true;
  } catch (err) {
    console.error("❌ activateBusinessBuilder failed:", err.message);
    throw err;
  }
}

export async function deactivateBusinessBuilder(email) {
  const db = connect();
  try {
    await db.query("START TRANSACTION");

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
      [email],
    );
    await db.query(
      `
      DELETE cd
      FROM custom_domains cd
      JOIN users u ON cd.user_id = u.id
      WHERE u.email = ?
      `,
      [email],
    );

    await db.query("COMMIT");

    console.log(`🚫 Business Builder Pack deactivated for ${email}`);
  } catch (err) {
    console.error("❌ deactivateBusinessBuilder failed:", err.message);
  }
}
// BASIC ANNUAL BUILDER PACK
export async function activateBusinessBasicBuilder(email) {
  const db = connect();
  try {
    const [userRows] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    if (!userRows.length) {
      console.warn(`⚠️ No user found for email: ${email}`);
      return;
    }

    const userId = userRows[0].id;

    // ✅ 1-year lock period
    // ✅ 1-year expiration
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // ✅ Update subscription details
    await db.query(
      `
      UPDATE users
      SET pro_status = 'active',
          pro_expiration = ?,
          billing_type = 'annual',
          plan = 'business_basic_builder',
          status = 'active',
          locked_until = ?,
          basic_annual = 1,
          basic_expiration = ?
      WHERE id = ?
      `,
      [expiresAt, expiresAt, expiresAt, userId],
    );

    await Promise.all([
      upgradeUserToProCovers(email),
      activatePromptMemory(email),
      upgradeUserToMagnets(email, 7), // 👈 KEY DIFFERENCE
    ]);

    console.log(`🎁 Granted 7 lead magnet slots to ${email}`);

    return true;
  } catch (err) {
    console.error("❌ activateBusinessBasicBuilder failed:", err.message);
    throw err;
  }
}

export async function deactivateBusinessBasicBuilder(email) {
  const db = connect();
  try {
    await db.query(
      `UPDATE users
       SET basic_annual = 0,
       pro_status = 'inactive',
           basic_expiration = NULL,
           status = 'cancelled',
           has_magnet = 0,
           magnet_slots = 0,
           has_free_magnet = 0,
           free_trial_expires_at = NULL,
           plan = NULL,
           billing_type = NULL,
           locked_until = NULL
       WHERE email = ?
         AND pro_status = 'inactive'`,
      [email],
    );

    console.log(`🚫 Business Basic Builder deactivated for ${email}`);
  } catch (err) {
    console.error("❌ deactivateBusinessBasicBuilder failed:", err.message);
  }
}

export async function getLeadMagnetByPdfUrl(pdfUrl) {
  try {
    const db = connect();
    const [rows] = await db.query(
      "SELECT * FROM lead_magnets WHERE pdf_url = ? OR original_pdf_url = ? LIMIT 1",
      [pdfUrl, pdfUrl],
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
      [credentialID, credentialPublicKey, counter, userId],
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
      [email],
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
      [userId],
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
  await db.query(
    "UPDATE users SET stripe_connect_account_id = ? WHERE id = ?",
    [accountId, userId],
  );
  return true;
}
// Image Upload
export async function uploadUserAvatar(userId, profileImage) {
  const db = connect();

  // Remove prefix & decode base64
  const base64Data = Buffer.from(
    profileImage.replace(/^data:image\/\w+;base64,/, ""),
    "base64",
  );
  const type = profileImage.split(";")[0].split("/")[1];

  // Setup Spaces
  const s3 = new AWS.S3({
    endpoint: process.env.DO_SPACES_ENDPOINT,
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  });

  const filename = `profiles/${uuidv4()}.${type}`;

  // Upload
  const params = {
    Bucket: process.env.DO_SPACES_BUCKET,
    Key: filename,
    Body: base64Data,
    ACL: "public-read",
    ContentEncoding: "base64",
    ContentType: `image/${type}`,
  };

  const upload = await s3.upload(params).promise();

  // Save in DB
  await db.query("UPDATE users SET profile_image_url = ? WHERE id = ?", [
    upload.Location,
    userId,
  ]);

  return { profileImage: upload.Location };
}

// Light Mode Toggle
export async function updateUserTheme(userId, theme) {
  const db = connect();
  await db.query(`UPDATE users SET theme = ? WHERE id = ?`, [theme, userId]);
}

// Create Community Sign Up Email
// helpers/emails/sendCommunitySignupNotification.js
export async function sendCommunitySignupNotification({ name, email }) {
  const communitySignupHtml = `
<div style="min-height:100%;background:#ffffff;padding:60px 20px;font-family:Arial,sans-serif;">
  <div style="
    max-width:420px;
    margin:0 auto;
    background:#ffffff;
    padding:32px;
    border-radius:16px;
    border:1px solid #e5e7eb;
    box-shadow:0 20px 40px rgba(0,0,0,0.08);
  ">
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
      <img
        src="https://themessyattic.com/themessyattic-logo.png"
        width="40"
        height="40"
        style="display:block;"
        alt="The Messy Attic"
      />
      <div style="font-size:18px;font-weight:600;color:#111827;">
        The Messy Attic
      </div>
    </div>

    <!-- Title -->
    <h2 style="
      font-size:26px;
      font-weight:700;
      color:#111827;
      margin-bottom:8px;
    ">
      New Community Signup
    </h2>

    <!-- Subtitle -->
    <p style="font-size:14px;color:#4b5563;margin-bottom:20px;">
      A new user just joined the community.
    </p>

    <!-- Content -->
    <p style="font-size:15px;color:#111827;margin-bottom:10px;">
      Name: <strong>${name}</strong>
    </p>

    <p style="font-size:15px;color:#111827;margin-bottom:20px;">
      Email: <strong>${email}</strong>
    </p>

    <!-- Footer -->
    <p style="font-size:13px;color:#6b7280;text-align:center;">
      The Messy Attic Community
    </p>
  </div>
</div>
`;

  await sendOutLookMail({
    to: "business@aluredigital.com", // your inbox
    subject: "New Community Signup",
    html: communitySignupHtml,
  });
}

export async function sendCommunityWelcomeEmail({ name, email }) {
  const communityWelcomeHtml = `
<div style="min-height:100%;background:#ffffff;padding:60px 20px;font-family:Arial,sans-serif;">
  <div style="
    max-width:420px;
    margin:0 auto;
    background:#ffffff;
    padding:32px;
    border-radius:16px;
    border:1px solid #e5e7eb;
    box-shadow:0 20px 40px rgba(0,0,0,0.08);
  ">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
      <img src="https://themessyattic.com/themessyattic-logo.png" width="40" />
      <div style="font-size:18px;font-weight:600;color:#111827;">
        The Messy Attic
      </div>
    </div>

    <h2 style="font-size:26px;font-weight:700;color:#111827;margin-bottom:8px;">
      Welcome to the Community
    </h2>

    <p style="font-size:14px;color:#4b5563;margin-bottom:20px;">
      You’re officially in.
    </p>

    <p style="font-size:15px;color:#111827;line-height:1.6;margin-bottom:20px;">
      Hi <strong>${name}</strong>,  
      welcome to the The Messy Attic community.
    </p>

    <div style="text-align:center;margin:30px 0;">
      <a
        href="https://themessyattic.com/community"
        target="_blank"
        style="
          background:#7bed9f;
          color:#000;
          padding:14px 36px;
          border-radius:8px;
          text-decoration:none;
          font-weight:700;
        "
      >
        Enter the Community
      </a>
    </div>

    <p style="font-size:13px;color:#6b7280;text-align:center;">
      — The Messy Attic
    </p>
  </div>
</div>
`;

  await sendOutLookMail({
    to: email,
    subject: "Welcome to the The Messy Attic Community",
    html: communityWelcomeHtml,
  });
}

export async function updateLastSeen(userId) {
  const db = connect();

  try {
    await db.query(
      `
      UPDATE users
      SET last_seen_at = NOW()
      WHERE id = ?
        AND (
          last_seen_at IS NULL
          OR last_seen_at < NOW() - INTERVAL 15 MINUTE
        )
      `,
      [userId],
    );
  } catch (err) {
    console.error("Failed to update last_seen_at:", err);
  }
}

export async function getUserRecap(userId) {
  const db = connect();

  try {
    // 1. Fetch last_seen_at
    const [[user]] = await db.query(
      `
      SELECT last_seen_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId],
    );

    const since = user?.last_seen_at;

    // If user has never been seen, do not show recap
    if (!since) {
      return {
        since: null,
        hasActivity: false,
        summary: {},
        items: {},
      };
    }

    // 2. Comments on user's posts
    const [commentsOnPosts] = await db.query(
      `
      SELECT
        p.id AS post_id,
        p.title AS post_title,
        COUNT(c.id) AS count
      FROM community_comments c
      JOIN community_posts p ON p.id = c.post_id
      WHERE
        p.user_id = ?
        AND c.user_id != ?
        AND c.is_deleted = 0
        AND c.created_at > ?
      GROUP BY p.id
      `,
      [userId, userId, since],
    );

    // 3. Replies to user's comments
    const [repliesToComments] = await db.query(
      `
      SELECT
        p.id AS post_id,
        p.title AS post_title,
        COUNT(c.id) AS count
      FROM community_comments c
      JOIN community_posts p ON p.id = c.post_id
      WHERE
        c.parent_id IS NOT NULL
        AND c.reply_to_user_id = ?
        AND c.user_id != ?
        AND c.is_deleted = 0
        AND c.created_at > ?
      GROUP BY p.id
      `,
      [userId, userId, since],
    );

    // 4. Mentions
    const [mentions] = await db.query(
      `
      SELECT
        p.id AS post_id,
        p.title AS post_title,
        COUNT(m.id) AS count
      FROM community_comment_mentions m
      JOIN community_comments c ON c.id = m.comment_id
      JOIN community_posts p ON p.id = c.post_id
      WHERE
        m.mentioned_user_id = ?
        AND c.created_at > ?
      GROUP BY p.id
      `,
      [userId, since],
    );

    // 5. Build summary counts
    const summary = {
      commentsOnYourPosts: commentsOnPosts.reduce((a, b) => a + b.count, 0),
      repliesToYourComments: repliesToComments.reduce((a, b) => a + b.count, 0),
      mentions: mentions.reduce((a, b) => a + b.count, 0),
    };

    const hasActivity =
      summary.commentsOnYourPosts > 0 ||
      summary.repliesToYourComments > 0 ||
      summary.mentions > 0;

    return {
      since,
      hasActivity,
      summary,
      items: {
        commentsOnYourPosts: commentsOnPosts,
        repliesToYourComments: repliesToComments,
        mentions,
      },
    };
  } catch (err) {
    console.error("Failed to get user recap:", err);

    // Fail quietly, never block UI
    return {
      since: null,
      hasActivity: false,
      summary: {},
      items: {},
    };
  }
}

export async function markUserSeen(userId) {
  const db = connect();

  try {
    await db.query(
      `
      UPDATE users
      SET last_seen_at = NOW()
      WHERE id = ?
      `,
      [userId],
    );

    return { success: true };
  } catch (err) {
    console.error("Failed to mark user as seen:", err);
    return { success: false };
  }
}
