import express from "express";
import { authenticateAdminToken, requireAdmin } from "../../middleware/authMiddleware.js";
import { createAdminMessage, getAllAdminMessages, getUnreadMessageCount, markMessageAsRead, softDeleteAdminMessage, softDeleteUserMessage } from "../../db/dbAdminMessages.js";

const router = express.Router();

router.post("/", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {
    const { title, message } = req.body;
    const adminId = req.user.id;

    if (adminId !== process.env.SUPER_ADMIN_ID) {
      return res.status(403).json({ message: "Access denied" });
    }

    const result = await createAdminMessage(adminId, title, message);
    res.json(result);
  } catch (err) {
    console.error("❌ Error creating admin message:", err.message);
    res.status(500).json({ message: "Failed to create admin message" });
  }
});


router.get("/", authenticateAdminToken, async (req, res) => {
  const { offset = 0, limit = 20 } = req.query;
  try {
    const userId = req.user.id;
    const rows = await getAllAdminMessages(userId, Number(offset), Number(limit));
    res.json(rows);
  } catch (err) {
    console.error("Error fetching admin messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});


router.delete("/:id", authenticateAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    await softDeleteAdminMessage(id);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error deleting admin message:", err.message);
    res.status(500).json({ message: "Failed to delete message" });
  }
});


router.delete("/user/:id", authenticateAdminToken, async (req, res) => {
  try {
    await softDeleteUserMessage(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get("/count", authenticateAdminToken, async (req, res) => {
  try {
    const count = await getUnreadMessageCount(req.user.id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Mark as read
router.post("/:id/read", authenticateAdminToken, async (req, res) => {
  try {
    await markMessageAsRead(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});





export default router;
