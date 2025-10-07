import express from "express";
import { getAllLeads } from "../../db/dbGetAllLeads.js";
import { authenticateToken, requireAdmin } from "../../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/admin/leads
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const leads = await getAllLeads();
    res.json({ success: true, leads });
  } catch (err) {
    console.error("Error fetching leads:", err);
    res.status(500).json({ success: false, message: "Failed to fetch leads" });
  }
});

export default router;
