import express from "express";
import { askGPT } from "../helpers/gptHelper.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/ask", authenticateToken, async (req, res) => {
  try {
    const { prompt } = req.body;
    const answer = await askGPT(prompt);
    res.json({ success: true, answer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
