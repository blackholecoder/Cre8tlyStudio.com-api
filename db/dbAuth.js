import crypto from "crypto";

import bcrypt from "bcryptjs";
import connect from "./connect.js";
import { sendMail } from "../utils/sendMail.js";

export const forgotPassword = async (email) => {
  const db = connect();
  const [rows] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
  if (!rows.length) {
    return { message: "If that email exists, a reset link has been sent." };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 30);

  await db.query(
    "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?",
    [hashedToken, expires, email]
  );

  const resetLink = `https://cre8tlystudio.com/reset-password?token=${rawToken}`;

  await sendMail({
  to: email,
  subject: "Reset Your Cre8tly Studio Password",
  html: `
  <div style="background-color:#0a0a0a; color:#ffffff; font-family:'Montserrat',Arial,sans-serif; padding:40px 20px; text-align:center; border-radius:12px;">
    <h1 style="color:#00ff9d; margin-bottom:16px;">Cre8tly Studio</h1>
    <p style="font-size:16px; color:#cccccc; margin-bottom:30px;">
      You requested to reset your password for your Cre8tly Studio account.<br/>
      Click the button below to securely reset it.
    </p>
    <a href="${resetLink}"
      style="display:inline-block; background-color:#00ff9d; color:#000000;
             font-weight:600; text-decoration:none; padding:14px 28px;
             border-radius:8px; font-size:15px;">
      Reset Password
    </a>
    <p style="color:#999999; font-size:14px; margin-top:30px;">
      If you didn’t request this, please ignore this email.<br/>
      Your password will remain unchanged.
    </p>
    <p style="color:#555555; font-size:12px; margin-top:40px;">
      © ${new Date().getFullYear()} Cre8tly Studio. All rights reserved.
    </p>
  </div>
  `,
});


  return { message: "If that email exists, a reset link has been sent." };
};

// 🔹 Reset Password
export async function resetPassword(token, newPassword) {
  const db = connect();
  if (!token || !newPassword) {
    return { status: 400, message: "Token and new password are required" };
  }

  try {
    // Hash the token before lookup
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user by hashed token
    const [rows] = await db.query(
      "SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
      [hashedToken]
    );

    if (!rows.length) {
      return { status: 400, message: "Invalid or expired token" };
    }

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Update password and clear token
    await db.query(
      "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
      [password_hash, rows[0].id]
    );

    return { status: 200, message: "Password reset successful." };
  } catch (err) {
    console.error("Reset password error:", err);
    return { status: 500, message: "Error resetting password" };
  }
}
