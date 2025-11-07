import express from "express";
import { authenticateToken, requireAdmin, requireMarketerOrAdmin } from "../../middleware/authMiddleware.js";
import { createUserAndGiveFreeSlots, giveFreeLeadMagnets } from "../../db/dbAddUser.js";

const router = express.Router();

router.post("/create-user-with-slots", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, slots = 5 } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const result = await createUserAndGiveFreeSlots({ name, email, password, slots });
    res.status(201).json(result);
  } catch (err) {
    console.error("Error creating user with slots:", err);
    res.status(500).json({ message: err.message });
  }
});

router.post(
  "/give-free-magnets",
  authenticateToken,
  requireMarketerOrAdmin, // you don't need requireAdmin here; this covers both
  async (req, res) => {
    try {
      const { count = 1 } = req.body;
      let targetUserId;

      // ✅ If admin → allow target any userId
      if (req.user.role === "admin") {
  // Allow admin to target themselves if no userId is provided
  targetUserId = req.body.userId || req.user.id;
} 
      // ✅ If marketer → force to self only
      else if (req.user.role === "marketer") {
        targetUserId = req.user.id;
      } 
      // ✅ Otherwise → deny
      else {
        return res.status(403).json({ message: "Access denied" });
      }

      const result = await giveFreeLeadMagnets(targetUserId, count);

      res.status(200).json({
        message:
          req.user.role === "marketer"
            ? `Gave yourself ${count} free magnet slot(s)`
            : `Gave ${count} free slot(s) to user ${targetUserId}`,
        result,
      });
    } catch (err) {
      console.error("Error giving free magnets:", err);
      res.status(500).json({ message: err.message || "Server error" });
    }
  }
);





export default router;
