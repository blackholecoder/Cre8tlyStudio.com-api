import express from "express";
import { getAdminStats } from "../../db/dbStats.js";




const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const stats = await getAdminStats();
    res.json({ success: true, stats });
  } catch (err) {
    console.error("Error fetching admin stats:", err);
    res.status(500).json({ success: false, message: "Failed to load stats" });
  }
});

export default router;
