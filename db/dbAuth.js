import crypto from "crypto";

import bcrypt from "bcryptjs";
import connect from "./connect.js";
import { sendOutLookMail } from "../utils/sendOutllokMail.js";

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

  await sendOutLookMail({
  to: email,
  subject: "Reset Your Cre8tly Studio Password",
  html: `
  <div style="background:#0b0b0b;padding:40px 0;font-family:Arial,Helvetica,sans-serif;">
    <table width="600" align="center" cellpadding="0" cellspacing="0"
      style="
        background:#111;
        border-radius:14px;
        color:#f2f2f2;
        box-shadow:0 0 25px rgba(0,0,0,0.6);
        padding:0;
      ">

      <!-- Header -->
      <tr>
        <td align="center" style="padding:40px 40px 20px 40px;">
          <img src="https://cre8tlystudio.com/cre8tly-logo-white.png"
              width="95" style="opacity:0.95;margin-bottom:10px;" />

          <h2 style="
            color:#7bed9f;
            font-size:26px;
            margin-top:10px;
            margin-bottom:5px;
          ">
            Password Reset Request
          </h2>

          <p style="
            font-size:14px;
            color:#ccc;
            margin:0;
          ">
            Secure password recovery for your Cre8tly Studio account
          </p>
        </td>
      </tr>

      <!-- Divider -->
      <tr>
        <td style="padding:0 60px;">
          <div style="height:1px;background:#222;margin:25px 0;"></div>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="
          padding:0 50px 20px 50px;
          font-size:15px;
          line-height:1.7;
          text-align:center;
        ">
          You requested to reset your password for your Cre8tly Studio account.
          Click the button below to proceed securely.
        </td>
      </tr>

      <!-- CTA Button -->
      <tr>
        <td align="center" style="padding:20px 0 35px 0;">
          <a href="${resetLink}"
            style="
              background:#7bed9f;
              color:#000;
              padding:14px 40px;
              border-radius:8px;
              text-decoration:none;
              font-weight:700;
              font-size:15px;
              display:inline-block;
            ">
            Reset Password
          </a>
        </td>
      </tr>

      <!-- Reminder Text -->
      <tr>
        <td style="
          padding:0 50px 20px 50px;
          font-size:13px;
          color:#ccc;
          line-height:1.6;
          text-align:center;
        ">
          If you didn’t request this, you can safely ignore this email.
          Your password will remain unchanged.
        </td>
      </tr>

      <!-- Divider -->
      <tr>
        <td style="padding:0 60px;">
          <div style="height:1px;background:#222;margin:20px 0;"></div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td align="center" style="padding:0 0 35px 0;">
          <p style="font-size:12px;color:#9ca3af;margin-bottom:6px;">
            © ${new Date().getFullYear()} Cre8tly Studio. All rights reserved.
          </p>
          <p style="font-size:11px;color:#7bed9f;font-weight:600;">
            Cre8tly Security System
          </p>
        </td>
      </tr>

    </table>
  </div>
`



,
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
