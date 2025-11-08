import express from "express";
import jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";

import {
  createUser,
  getUserByEmail,
  getUserById,
  getUserByRefreshToken,
  saveRefreshToken,
} from "../db/dbUser.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { loginAdmin } from "../db/dbAdminAuth.js";
import { updateAdminSettings } from "../db/dbAdminSettings.js";
import { generateTwoFA, verifyTwoFA } from "../db/db2FA.js";
import { uploadAdminImage } from "../db/dbAdminImage.js";
import { forgotPassword, resetPassword } from "../db/dbAuth.js";

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

router.post("/login", async (req, res) => {

  try {
    const { email, password } = req.body;

    const user = await getUserByEmail(email);

    if (!user) {
      console.log("❌ No user found");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      console.log("❌ Password mismatch");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    await saveRefreshToken(user.id, refreshToken);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        has_magnet: user.has_magnet,
        magnet_slots: user.magnet_slots,
        has_book: user.has_book,
        book_slots: user.book_slots,
        has_memory: user.has_memory,
        has_completed_book_onboarding: user.has_completed_book_onboarding,
        pro_covers: user.pro_covers,
        profile_image: user.profile_image_url || null,
        brand_identity_file: user.brand_identity_file || null,
        cta: user.cta || null,
        pro_status: user.pro_status,
        billing_type: user.billing_type,
        pro_expiration: user.pro_expiration,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("🔥 Login route error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/refresh", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ message: "No refresh token" });

  const user = await getUserByRefreshToken(token);
  if (!user) return res.status(403).json({ message: "Invalid refresh token" });

  jwt.verify(token, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ message: "Expired refresh token" });

    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Rotate refresh token
    const newRefreshToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
    await saveRefreshToken(user.id, newRefreshToken);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  });
});

// LOGOUT → clear refresh token
router.post("/logout", authenticateToken, async (req, res) => {
  await saveRefreshToken(req.user.id, null);
  res.json({ message: "Logged out" });
});

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // return everything needed for header
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      has_magnet: user.has_magnet,
      magnet_slots: user.magnet_slots,
      has_book: user.has_book,
      book_slots: user.book_slots,
      has_memory: user.has_memory,
      has_completed_book_onboarding: user.has_completed_book_onboarding,
      pro_covers: user.pro_covers,
      profile_image: user.profile_image_url || null,
      brand_identity_file: user.brand_identity_file || null,
      cta: user.cta || null,
      created_at: user.created_at,
      pro_status: user.pro_status,
      billing_type: user.billing_type,
      pro_expiration: user.pro_expiration,
    });
  } catch (err) {
    console.error("Error in /me:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ADMIN ROUTES

router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginAdmin(email, password);
    res.json(result);
  } catch (err) {
    console.error("Login error:", err);
    res.status(401).json({ message: err.message || "Invalid credentials" });
  }
});

router.post("/admin/verify-login-2fa", async (req, res) => {
  try {
    const { token, twofaToken } = req.body;

    if (!token || !twofaToken) {
      return res.status(400).json({ message: "Missing 2FA data" });
    }
    // Decode temporary login token
    const jwtPayload = jwt.verify(twofaToken, process.env.JWT_SECRET);
    if (!jwtPayload?.id) {
      return res.status(401).json({ message: "Invalid temporary token" });
    }

    // Verify code
    await verifyTwoFA(jwtPayload.id, token);

    // Fetch user info to include role + email
    const user = await getUserById(jwtPayload.id);

    // ✅ Issue final access token for the session
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      success: true,
      message: "2FA verified successfully",
      accessToken,
    });
  } catch (err) {
    console.error("2FA login verify error:", err);
    res.status(401).json({ message: err.message || "Invalid 2FA code" });
  }
});

router.put("/admin/update", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await updateAdminSettings(userId, req.body);
    res.json(result);
  } catch (err) {
    console.error("Settings update error:", err);
    res
      .status(400)
      .json({ message: err.message || "Failed to update settings" });
  }
});

router.post("/admin/enable-2fa", authenticateToken, async (req, res) => {
  try {
    const result = await generateTwoFA(req.user.id);
    res.json(result);
  } catch (err) {
    console.error("2FA enable error:", err);
    res.status(500).json({ message: err.message || "Failed to enable 2FA" });
  }
});

// Verify 2FA token
router.post("/admin/verify-2fa", authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    const result = await verifyTwoFA(req.user.id, token);

    // ✅ After successful verification, issue a proper access token
    const accessToken = jwt.sign(
      {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      success: true,
      message: "2FA verified successfully",
      accessToken, // 👈 send new JWT
    });
  } catch (err) {
    console.error("2FA verify error:", err);
    res.status(401).json({ message: err.message || "Invalid 2FA code" });
  }
});

router.put("/admin/upload-image", authenticateToken, async (req, res) => {
  console.log("🟢 /admin/upload-image hit");
  try {
    const userId = req.user.id;
    const result = await uploadAdminImage(userId, req.body);
    res.json(result);
  } catch (err) {
    console.error("Image upload error:", err);
    res.status(400).json({ message: err.message || "Upload failed" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const result = await forgotPassword(email);
    res.json(result);
  } catch (err) {
    console.error("Forgot password route error:", err);
    res.status(500).json({ message: "Error sending reset email" });
  }
});

// 🔹 Reset Password Route
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res.status(400).json({ message: "Token and new password are required" });

    const result = await resetPassword(token, newPassword);
    res.json(result);
  } catch (err) {
    console.error("Reset password route error:", err);
    res.status(500).json({ message: "Error resetting password" });
  }
});

export default router;
