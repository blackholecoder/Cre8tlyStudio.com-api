import express from "express";
import { authenticateToken } from "../../../middleware/authMiddleware.js";
import { getUnreadNotificationCount, getUserNotifications, markNotificationRead } from "../../../db/community/notifications/notifications.js";


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
router.post("/read/:id", authenticateToken, async (req, res) => {
  try {
    const ok = await markNotificationRead(req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ message: "Not found" });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to update notification" });
  }
});

// 🔥 Get unread count
router.get("/unread-count", authenticateToken, async (req, res) => {
  try {
    const count = await getUnreadNotificationCount(req.user.id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Failed to load count" });
  }
});



export default router;
