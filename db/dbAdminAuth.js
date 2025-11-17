import connect from "./connect.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function loginAdmin(email, password) {
  const db = connect();

  // ✅ Allow both admins and marketers to log in
  const [rows] = await db.query(
    "SELECT id, name, email, password_hash, role, twofa_secret FROM users WHERE email = ? AND role IN ('admin', 'marketer') LIMIT 1",
    [email]
  );

  ;

  if (rows.length === 0) {
    throw new Error("Access denied: not an admin or marketer");
  }

  const user = rows[0];

  // ✅ Check password
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error("Incorrect password");

  // ✅ Handle optional 2FA (admin-only)
  if (user.twofa_secret && user.role === "admin") {
    const twofaToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, stage: "2fa_pending" },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    return {
      twofaRequired: true,
      message: "2FA verification required",
      twofaToken,
    };
  }

  // ✅ Generate full access token
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  return {
    message: "Login successful",
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
