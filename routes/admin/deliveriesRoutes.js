
import express from "express";
import { authenticateAdminToken } from "../../middleware/authMiddleware.js";
import { getPaginatedDeliveries } from "../../db/admin/dbDeliveries.js";



const router = express.Router();

router.get("/admin-deliveries", authenticateAdminToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await getPaginatedDeliveries(page, limit);

    return res.json({
      success: true,
      deliveries: result.deliveries,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error("GET /admin/deliveries error:", err);
    return res.status(500).json({ success: false, message: "Failed to load deliveries" });
  }
});

export default router;