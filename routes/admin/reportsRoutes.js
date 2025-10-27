import express from "express";
import { authenticateToken, requireAdmin } from "../../middleware/authMiddleware.js";
import { getAllReports } from "../../db/dbGetAllReports.js";


const router = express.Router();

router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const reports = await getAllReports();


    res.json({ success: true, reports });
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ success: false, message: "Failed to fetch reports" });
  }
});

export default router;
