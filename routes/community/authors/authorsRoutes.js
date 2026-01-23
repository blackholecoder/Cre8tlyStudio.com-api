import express from "express";
import {
  getAuthorProfile,
  updateAuthorProfile,
} from "../../../db/community/authors/dbAuthors.js";
import { authenticateToken } from "../../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const profile = await getAuthorProfile(req.user.id);
    res.json({ profile });
  } catch (err) {
    console.error("Get my author profile error:", err);
    res.status(400).json({ error: err.message });
  }
});

router.post("/me", authenticateToken, async (req, res) => {
  try {
    await updateAuthorProfile(req.user.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
