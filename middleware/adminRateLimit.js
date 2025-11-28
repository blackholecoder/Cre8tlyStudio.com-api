import rateLimit from "express-rate-limit";
import connect from "../db/connect.js";

export const admin2FALimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute window
  max: 5,                     // 5 attempts per minute
  message: { message: "Too many 2FA attempts. Please wait 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});


export async function admin2faLockout(req, res, next) {
  try {
    const { twofaToken } = req.body;

    if (!twofaToken) {
      return res.status(400).json({ message: "Missing 2FA token" });
    }

    const db = connect();
    const [[user]] = await db.query(
      "SELECT id, failed_2fa_attempts, locked_until FROM users WHERE id = (SELECT id FROM users WHERE id = (SELECT id FROM users WHERE id = ?)) LIMIT 1",
      [req.body.userId]
    );

    const now = new Date();

    if (user.locked_until && now < new Date(user.locked_until)) {
      const minutesLeft = Math.ceil(
        (new Date(user.locked_until) - now) / 60000
      );
      return res.status(429).json({
        message: `Account locked for ${minutesLeft} minutes.`,
      });
    }

    next();

  } catch (err) {
    console.error("admin2faLockout middleware error:", err);
    res.status(500).json({ message: "Server error" });
  }
}