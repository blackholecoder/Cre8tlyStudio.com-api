import connect from "./connect.js";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";


/**
 * Generate and store a new 2FA secret for the current admin.
 */
export async function generateTwoFA(userId) {
  const db = await connect();

  const secret = speakeasy.generateSecret({
    name: "Cre8tly Admin",
    length: 20,
  });

  await db.query("UPDATE users SET twofa_secret = ? WHERE id = ?", [secret.base32, userId]);
  await db.end();

  const qr = await QRCode.toDataURL(secret.otpauth_url);

  return { qr, secret: secret.base32 };
}

/**
 * Verify a submitted 2FA code.
 */
export async function verifyTwoFA(userId, token) {
  const db = await connect();
  const [[user]] = await db.query("SELECT twofa_secret FROM users WHERE id = ?", [userId]);
  await db.end();

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
