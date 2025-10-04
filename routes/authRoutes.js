import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import { createUser, getUserByEmail, getUserById, getUserByRefreshToken, saveRefreshToken } from "../db/dbUser.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await createUser({ name, email, password });

    res.status(201).json({ message: "User created", userId: user.id });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// LOGIN
// /login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await getUserByEmail(email);
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

  // Short-lived access token
  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  // Long-lived refresh token
  const refreshToken = jwt.sign(
    { id: user.id, role: user.role }, // 👈 include role for future verification
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  await saveRefreshToken(user.id, refreshToken);

  res.json({
    user: { id: user.id, name: user.name, role: user.role },
    accessToken,
    refreshToken,
  });
});


// REFRESH → get new access token
// /refresh
router.post("/refresh", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ message: "No refresh token provided" });


  // ✅ Check DB
  const user = await getUserByRefreshToken(token);
  if (!user) return res.status(403).json({ message: "Invalid refresh token" });

  // ✅ Verify JWT
  jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Expired refresh token" });

    // ✅ Issue new access token
    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // ✅ Optionally rotate refresh token
    const newRefreshToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
    saveRefreshToken(user.id, newRefreshToken);

    res.json({ 
      accessToken: newAccessToken, 
      refreshToken: newRefreshToken // 👈 return this too
    });
  });
});


// LOGOUT → clear refresh token
router.post("/logout", authenticateToken, async (req, res) => {
  await saveRefreshToken(req.user.id, null);
  res.json({ message: "Logged out" });
});

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.id); // 👈 only call helper
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Error in /me:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;