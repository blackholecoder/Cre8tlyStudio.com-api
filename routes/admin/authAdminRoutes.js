import express from "express";
import jwt from "jsonwebtoken";
import {
  getUserById,
  getUserByRefreshToken,
  saveRefreshToken,
} from "../../db/dbUser.js";
import { authenticateAdminToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/refresh", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      console.log("❌ No refresh token provided");
      return res.status(401).json({ message: "No refresh token" });
    }

    const user = await getUserByRefreshToken(token);

    // Must exist AND must be an admin-level user
    if (!user || (user.role !== "admin" && user.role !== "marketer")) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    jwt.verify(token, process.env.ADMIN_JWT_REFRESH_SECRET, async (err) => {
      if (err) {
        console.log("❌ REFRESH VERIFY ERROR:", err.message);
        return res.status(403).json({ message: "Expired refresh token" });
      }

      try {
        const newAccessToken = jwt.sign(
          { id: user.id, role: user.role },
          process.env.ADMIN_JWT_SECRET,
          { expiresIn: "15m" }
        );

        const newRefreshToken = jwt.sign(
          { id: user.id, role: user.role },
          process.env.ADMIN_JWT_REFRESH_SECRET,
          { expiresIn: "7d" }
        );

        await saveRefreshToken(user.id, newRefreshToken);

        return res.json({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        });
      } catch (innerErr) {
        console.error("Admin refresh rotation error:", innerErr);
        return res
          .status(500)
          .json({ message: "Could not refresh admin token" });
      }
    });
  } catch (err) {
    console.error("Admin refresh error:", err);
    return res.status(500).json({ message: "Server error during refresh" });
  }
});

router.get("/me", authenticateAdminToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile_image: user.profile_image_url || null,
    });
  } catch (err) {
    console.error("Admin /me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
