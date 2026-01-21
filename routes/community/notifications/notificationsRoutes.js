import express from "express";
import { authenticateToken } from "../../../middleware/authMiddleware.js";
import {
  getUnreadNotificationCount,
  getUserNotifications,
  markNotificationsRead,
} from "../../../db/community/notifications/notifications.js";

const router = express.Router();

// 🔥 Get all notifications
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const notifications = await getUserNotifications(userId, limit, offset);

    res.json({ notifications });
  } catch (err) {
    console.error("❌ Notifications fetch error:", err);
    res.status(500).json({ message: "Failed to load notifications" });
  }
});

// 🔥 Mark one notification read
router.post("/mark-read", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json({ success: true });
    }

    await markNotificationsRead(userId, ids);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to mark notifications read", err);
    res.status(500).json({ error: "Failed to mark notifications read" });
  }
});

// 🔥 Get unread count
router.get("/count", authenticateToken, async (req, res) => {
  try {
    const count = await getUnreadNotificationCount(req.user.id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Failed to load count" });
  }
});

export default router;
