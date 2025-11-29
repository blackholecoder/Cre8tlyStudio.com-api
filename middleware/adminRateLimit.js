import rateLimit from "express-rate-limit";
import connect from "../db/connect.js";
import jwt from "jsonwebtoken";


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

    // Decode user ID from temporary token
    const payload = jwt.verify(twofaToken, process.env.ADMIN_JWT_SECRET);
    const userId = payload.id;

    if (!userId) {
      return res.status(401).json({ message: "Invalid 2FA token" });
    }

    const db = connect();
    const [[user]] = await db.query(
      "SELECT id, failed_2fa_attempts, locked_until FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

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
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
