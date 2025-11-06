import express from "express";
import { authenticateToken, requireAdmin } from "../../middleware/authMiddleware.js";
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

router.post("/give-free-magnets", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, count = 1 } = req.body;

    if (!userId) return res.status(400).json({ message: "Missing userId" });

    const result = await giveFreeLeadMagnets(userId, count);
    res.status(200).json({ message: `Gave ${count} free slots to user ${userId}` });
    
  } catch (err) {
    console.error("Error giving free magnets:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});




export default router;
