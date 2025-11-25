import connect from "./connect.js";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";


/**
 * Generate and store a new 2FA secret for the current admin.
 */
export async function generateTwoFA(userId) {
  const db = connect();

  const secret = speakeasy.generateSecret({
    name: "Cre8tly Admin",
    length: 20,
  });

  await db.query("UPDATE users SET twofa_secret = ? WHERE id = ?", [secret.base32, userId]);
  ;

  const qr = await QRCode.toDataURL(secret.otpauth_url);

  return { qr, secret: secret.base32 };
}
/**
 * Verify a submitted 2FA code.
 */
export async function verifyTwoFA(userId, token) {
  const db = connect();
  const [[user]] = await db.query("SELECT twofa_secret FROM users WHERE id = ?", [userId]);
  ;

  if (!user || !user.twofa_secret) throw new Error("2FA not enabled for this user");

  const verified = speakeasy.totp.verify({
    secret: user.twofa_secret,
    encoding: "base32",
    token,
  });

  if (!verified) throw new Error("Invalid 2FA code");

  // ✅ Generate full access token
  const accessToken = jwt.sign(
    { id: userId, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  return {
    message: "2FA verification successful",
    accessToken,
    admin: {
      id: userId,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

export async function generateUserTwoFA(userId) {
  const db = connect();

  const secret = speakeasy.generateSecret({
    name: "Cre8tly Studio", // Label shown inside Google Authenticator
    length: 20,
  });

  // Store the secret
  await db.query("UPDATE users SET twofa_secret = ? WHERE id = ?", [
    secret.base32,
    userId,
  ]);
  ;

  return { qr: secret.otpauth_url, secret: secret.base32 };
}

export async function verifyUserTwoFA(userId, token) {
  const db = connect();
  const [[user]] = await db.query(
    "SELECT twofa_secret FROM users WHERE id = ?",
    [userId]
  );
  ;

  if (!user || !user.twofa_secret) {
    throw new Error("2FA not enabled for this user");
  }

  const verified = speakeasy.totp.verify({
    secret: user.twofa_secret,
    encoding: "base32",
    token,
  });

  return { verified };
}

export async function enableUserTwoFA(userId) {
  const db = connect();
  try {
    await db.query("UPDATE users SET twofa_enabled = 1 WHERE id = ?", [userId]);
    return true;
  } catch (err) {
    console.error("❌ Failed to enable 2FA for user:", userId, err);
    throw new Error("Failed to enable 2FA");
  } 
}


// ADMIN

export async function verifyAdminTwoFA(userId, token) {
  try {
    const db = connect();

    const [[user]] = await db.query(
      "SELECT id, email, name, role, twofa_secret FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!user || !user.twofa_secret) {
      throw new Error("2FA not enabled for this user");
    }

    // Only admin + marketer allowed
    if (user.role !== "admin" && user.role !== "marketer") {
      throw new Error("Unauthorized: Not an admin");
    }

    const verified = speakeasy.totp.verify({
      secret: user.twofa_secret,
      encoding: "base32",
      token,
    });

    if (!verified) throw new Error("Invalid 2FA code");

    return user;

  } catch (err) {
    console.error("verifyAdminTwoFA error:", err);
    throw err;
  }
}



