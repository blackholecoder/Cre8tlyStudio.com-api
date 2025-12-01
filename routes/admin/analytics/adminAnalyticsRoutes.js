
import express from "express";
import axios from "axios";

import { getVisitorsOverTime, getVisitorsByLocation, getDevices, getPageViews, getUniqueReturning, getOnlineVisitors } from "../../../db/admin/dbWebsiteAnalytics.js";
import { authenticateAdminToken, requireAdmin } from "../../../middleware/authMiddleware.js";
const router = express.Router();



router.get("/visitors-over-time", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {
    const rows = await getVisitorsOverTime();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching visitors-over-time:", err);
    res.status(500).json({ success: false });
  }
});


// Visitors by country / state / region / city
router.get("/visitors-by-location", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {
    const rows = await getVisitorsByLocation();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching visitors-by-location:", err);
    res.status(500).json({ success: false });
  }
});


// Devices (iPhone, Android, Desktop)
router.get("/devices", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {
    const rows = await getDevices();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching devices:", err);
    res.status(500).json({ success: false });
  }
});


// Page views
router.get("/page-views", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {
    const rows = await getPageViews();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching page-views:", err);
    res.status(500).json({ success: false });
  }
});


// Unique vs returning visitors
router.get("/unique-vs-returning", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {
    const data = await getUniqueReturning();
    res.json(data);
  } catch (err) {
    console.error("Error fetching unique-vs-returning:", err);
    res.status(500).json({ success: false });
  }
});


// Real-time online visitors (updated_at > 2 min)
router.get("/online", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {
    const data = await getOnlineVisitors();
    res.json(data);
  } catch (err) {
    console.error("Error fetching online visitors:", err);
    res.status(500).json({ success: false });
  }
});


router.get("/geo", async (req, res) => {
  const { city, region, country } = req.query;

  if (!city) {
    return res.status(400).json({ error: "Missing city" });
  }

  const query = `${city}, ${region || ""}, ${country || ""}`;

  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(query)}` +
    `&format=json&limit=1`;

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Cre8tlyStudio/1.0 (admin@cre8tlystudio.com)",
      },
    });

    const data = response.data;

    if (!Array.isArray(data) || data.length === 0) {
      return res.json(null);
    }

    return res.json({
      lat: Number(data[0].lat),
      lng: Number(data[0].lon),
    });
  } catch (err) {
    console.error("Geocode error:", err.response?.data || err.message);
    return res.status(500).json(null);
  }
});



export default router;