import connect from "../connect.js";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import dns from "dns/promises";

export async function getUserDomains(userId) {
  const db = connect();

  try {
    const [rows] = await db.query(
      `
      SELECT 
        id,
        domain,
        verification_token,
        is_primary,
        verified,
        ssl_status,
        created_at,
        verified_at
      FROM custom_domains
      WHERE user_id = ?
      ORDER BY is_primary DESC, created_at ASC
      `,
      [userId]
    );

    return { success: true, domains: rows };
  } catch (err) {
    console.error("❌ getUserDomains error:", err);
    return { success: false, message: "Failed to load domains" };
  }
}

export async function addDomain(userId, domain) {
  const db = connect();

  try {
    // 1️⃣ Load user plan + status
    const [[user]] = await db.query(
      `
      SELECT pro_status, plan
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // 2️⃣ Enforce plan rule
    if (user.pro_status !== 1 || user.plan !== "business_builder_pack") {
      return {
        success: false,
        message:
          "Custom domains are available only on the Business Builder Pack.",
      };
    }

    // 3️⃣ Enforce single-domain limit
    const [[{ count }]] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM custom_domains
      WHERE user_id = ?
      `,
      [userId]
    );

    if (count >= 1) {
      return {
        success: false,
        message: "You can only add one custom domain on your plan.",
      };
    }

    // 4️⃣ Insert domain
    const id = uuidv4();
    const verificationToken = crypto.randomBytes(24).toString("hex");

    await db.query(
      `
      INSERT INTO custom_domains 
      (id, user_id, domain, verification_token, is_primary, verified, ssl_status)
      VALUES (?, ?, ?, ?, 0, 0, 'pending')
      `,
      [id, userId, domain, verificationToken]
    );

    return {
      success: true,
      message: "Domain added. Verification required.",
    };
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return { success: false, message: "Domain already exists" };
    }

    console.error("❌ addDomain error:", err);
    return { success: false, message: "Failed to add domain" };
  }
}

export async function setPrimaryDomain(userId, domain) {
  const db = connect();

  try {
    await db.query("START TRANSACTION");

    // Remove primary flag from all user domains
    await db.query(
      `
      UPDATE custom_domains
      SET is_primary = 0
      WHERE user_id = ?
      `,
      [userId]
    );

    // Set new primary (must be verified)
    const [result] = await db.query(
      `
  UPDATE custom_domains
  SET is_primary = 1,
      ssl_status = 'pending'
  WHERE user_id = ? AND domain = ? AND verified = 1
  `,
      [userId, domain]
    );

    if (!result.affectedRows) {
      await db.query("ROLLBACK");
      return {
        success: false,
        message: "Domain must be verified to set as primary",
      };
    }

    await db.query(
      `
      UPDATE user_landing_pages
      SET username = NULL
      WHERE user_id = ?
      `,
      [userId]
    );

    await db.query("COMMIT");

    return { success: true, message: "Primary domain updated" };
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("❌ setPrimaryDomain error:", err);
    return { success: false, message: "Failed to set primary domain" };
  }
}

export async function removeDomain(userId, domain) {
  const db = connect();

  try {
    const [result] = await db.query(
      `
      DELETE FROM custom_domains
      WHERE user_id = ? AND domain = ?
      `,
      [userId, domain]
    );

    if (!result.affectedRows) {
      return { success: false, message: "Domain not found" };
    }

    return { success: true, message: "Domain removed" };
  } catch (err) {
    console.error("❌ removeDomain error:", err);
    return { success: false, message: "Failed to remove domain" };
  }
}

// VERIFY DOMAIN
export async function verifyDomainOwnership(userId, domain) {
  const db = connect();

  try {
    // 1️⃣ Get stored verification token
    const [rows] = await db.query(
      `
      SELECT id, verification_token, verified
      FROM custom_domains
      WHERE user_id = ?
        AND domain = ?
      LIMIT 1
      `,
      [userId, domain]
    );

    if (!rows.length) {
      return { success: false, message: "Domain not found" };
    }

    const record = rows[0];

    if (record.verified) {
      return { success: true, verified: true };
    }

    const expectedValue = `cre8tly-domain-verification=${record.verification_token}`;

    // 2️⃣ Query DNS TXT records
    let txtRecords;
    try {
      txtRecords = await dns.resolveTxt(domain);
    } catch (err) {
      // DNS not propagated yet
      return {
        success: false,
        verified: false,
        message: "TXT record not found yet",
      };
    }

    // 3️⃣ Flatten records (DNS returns nested arrays)
    const flattened = txtRecords.flat().map((r) => r.trim());

    const matched = flattened.includes(expectedValue);

    if (!matched) {
      return {
        success: false,
        verified: false,
        message: "Verification record not found",
      };
    }

    // 4️⃣ Mark verified
    await db.query(
      `
      UPDATE custom_domains
      SET verified = 1,
          verified_at = NOW()
      WHERE id = ?
      `,
      [record.id]
    );

    return {
      success: true,
      verified: true,
    };
  } catch (err) {
    console.error("❌ verifyDomainOwnership error:", err);
    return {
      success: false,
      message: "Domain verification failed",
    };
  }
}
