
import express from "express";
import { getVisitorsOverTime, getVisitorsByLocation, getDevices, getPageViews, getUniqueReturning, getOnlineVisitors } from "../../../db/admin/dbWebsiteAnalytics.js";
import { authenticateToken, requireAdmin } from "../../../middleware/authMiddleware.js";
const router = express.Router();



router.get("/visitors-over-time", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rows = await getVisitorsOverTime();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching visitors-over-time:", err);
    res.status(500).json({ success: false });
  }
});


// Visitors by country / state / region / city
router.get("/visitors-by-location", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rows = await getVisitorsByLocation();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching visitors-by-location:", err);
    res.status(500).json({ success: false });
  }
});


// Devices (iPhone, Android, Desktop)
router.get("/devices", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rows = await getDevices();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching devices:", err);
    res.status(500).json({ success: false });
  }
});


// Page views
router.get("/page-views", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rows = await getPageViews();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching page-views:", err);
    res.status(500).json({ success: false });
  }
});


// Unique vs returning visitors
router.get("/unique-vs-returning",authenticateToken, requireAdmin, async (req, res) => {
  try {
    const data = await getUniqueReturning();
    res.json(data);
  } catch (err) {
    console.error("Error fetching unique-vs-returning:", err);
    res.status(500).json({ success: false });
  }
});


// Real-time online visitors (updated_at > 2 min)
router.get("/online", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const data = await getOnlineVisitors();
    res.json(data);
  } catch (err) {
    console.error("Error fetching online visitors:", err);
    res.status(500).json({ success: false });
  }
});


export default router;