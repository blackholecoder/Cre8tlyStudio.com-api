import express from "express";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { getAllBadgesWithUserState } from "../../db/badges/badgeQueries.js";
import { checkUserBadges } from "../../db/badges/dbBadges.js";

const router = express.Router();

router.get("/my-badges", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Ensure badges are up to date
    await checkUserBadges(userId);

    const badges = await getAllBadgesWithUserState(userId);

    res.json({ success: true, badges });
  } catch (err) {
    console.error("❌ GET /my-badges:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load badges",
    });
  }
});

router.get("/user-badges/:userId", authenticateToken, async (req, res) => {
  try {
    const badges = await getAllBadgesWithUserState(req.params.userId);

    res.json({ success: true, badges });
  } catch (err) {
    console.error("❌ GET /badges/user/:userId:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load badges",
    });
  }
});

export default router;
