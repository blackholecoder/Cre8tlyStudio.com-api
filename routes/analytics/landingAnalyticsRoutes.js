import express from "express";
import {
  getLandingAnalyticsSummary,
  getLandingPageIdForUser,
  logLandingEvent,
} from "../../db/analytics/dbLandingAnalytics.js";
import { authOptional } from "../../middleware/authMiddleware.js";

const router = express.Router();

// ✅ POST /api/landing-analytics/track
router.post("/track", authOptional, async (req, res) => {
  try {
    const { landing_page_id, event_type, owner_preview } = req.body;

    if (!landing_page_id || !event_type) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    const viewerId = req.user?.id || null;
    const referer = req.headers.referer || "";

    const ip_address =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket?.remoteAddress ||
      null;

    const user_agent = req.headers["user-agent"] || null;

    console.log("🧩 TRACK DEBUG →", {
      landing_page_id,
      event_type,
      viewerId,
      referer,
      owner_preview,
      ip_address,
    });

    const result = await logLandingEvent(
      landing_page_id,
      event_type,
      ip_address,
      user_agent,
      viewerId,
      referer,
      owner_preview
    );

    res.json(result);
  } catch (error) {
    console.error("❌ Error in /track:", error);
    res.status(500).json({ success: false, error: "Server error." });
  }
});


router.get("/summary/:landing_page_id", async (req, res) => {
  try {
    const { landing_page_id } = req.params;
    const { days = 7 } = req.query;

    if (!landing_page_id) {
      return res.status(400).json({
        success: false,
        message: "Missing landing_page_id",
      });
    }

    const result = await getLandingAnalyticsSummary(landing_page_id, days);

    console.log("📤 Sending analytics summary:", result);

    res.json(result); // ✅ send directly — not result.data
  } catch (err) {
    console.error("❌ Error fetching summary:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.get("/id/by-user/:userId", async (req, res) => {
  try {
    const id = await getLandingPageIdForUser(req.params.userId);
    if (!id)
      return res
        .status(404)
        .json({ success: false, message: "Landing page not found" });
    res.json({ id });
  } catch (e) {
    console.error("id/by-user error", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
