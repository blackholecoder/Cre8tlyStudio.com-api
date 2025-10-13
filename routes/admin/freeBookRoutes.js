import express from "express";
import { giveFreeBooks } from "../../db/book/dbFreeBooks.js";
import { authenticateToken, requireAdmin } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/give-free-books", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, count = 5 } = req.body;

    if (!userId) return res.status(400).json({ message: "Missing userId" });

    const result = await giveFreeBooks(userId, count);
    res.status(200).json({ message: `Gave ${count} free book slots to user ${userId}` });
  } catch (err) {
    console.error("Error giving free books:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

export default router;