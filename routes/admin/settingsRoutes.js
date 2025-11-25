import express from "express";
import { getMaintenanceStatus, setMaintenanceStatus } from "../../db/settings/dbSettings.js";
import { authenticateToken, requireAdmin } from "../../middleware/authMiddleware.js";


const router = express.Router();

router.get("/maintenance", async (req, res) => {
  try {
    const status = await getMaintenanceStatus();
    res.status(200).json({
      success: true,
      maintenance: !!status, // always returns boolean
    });
  } catch (err) {
    console.error("❌ Error fetching maintenance status:", err);
    res.status(500).json({
      success: false,
      maintenance: false,
      error: "Failed to retrieve maintenance status",
      details: err.message,
    });
  }
});


router.post("/maintenance", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { enabled } = req.body;
    const adminId = req.user?.id;

    // 🔒 Validate admin identity
    if (!adminId) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    if (adminId !== process.env.SUPER_ADMIN_ID) {
      return res.status(403).json({ message: "Access denied" });
    }

    // 🔧 Toggle maintenance mode
    const result = await setMaintenanceStatus(enabled);
    res.status(200).json({ success: true, maintenance: result });
  } catch (err) {
    console.error("❌ Error updating maintenance mode:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update maintenance mode",
      details: err.message,
    });
  }
});





export default router;
