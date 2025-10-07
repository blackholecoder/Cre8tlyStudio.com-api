import connect from "./connect.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function loginAdmin(email, password) {
  const db = await connect();

  const [rows] = await db.query(
    "SELECT id, name, email, password_hash, role, twofa_secret FROM users WHERE email = ? AND role = 'admin' LIMIT 1",
    [email]
  );

  await db.end();

  if (rows.length === 0) {
    throw new Error("Admin not found");
  }

  const admin = rows[0];
  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) throw new Error("Incorrect password");

  // ✅ Check if 2FA is enabled
  if (admin.twofa_secret) {
    // Issue a short-lived temporary token (used for 2FA verification)
    const twofaToken = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role, stage: "2fa_pending" },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    return {
      twofaRequired: true,
      message: "2FA verification required",
      twofaToken,
    };
  }

  // ✅ Normal login if 2FA not enabled
  const accessToken = jwt.sign(
  { id: admin.id, email: admin.email, role: admin.role },
  process.env.JWT_SECRET,
  { expiresIn: "2h" }
);

  return {
    message: "Login successful",
    accessToken,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  };
}