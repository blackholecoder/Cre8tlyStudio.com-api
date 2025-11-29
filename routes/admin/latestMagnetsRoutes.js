import express from "express";
import { getRecentLeadMagnetsPaginated } from "../../db/admin/dbLeadMagents.js";
import { authenticateAdminToken, requireAdmin } from "../../middleware/authMiddleware.js";


const router = express.Router();


router.get("/recent", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const data = await getRecentLeadMagnetsPaginated(page, limit);

    res.json({
      success: true,
      magnets: data.magnets,
      total: data.total,
      page,
      totalPages: Math.ceil(data.total / limit),
    });
  } catch (err) {
    console.error("Error fetching paginated magnets:", err);
    res.status(500).json({ message: "Failed to load magnets" });
  }
});

export default router;