import express from "express";
import { logVisitorExitEvent, logWebsiteVisitor } from "../../db/dbTrackIpWebVisitor/dbTrackIp.js";
import { getUserIp } from "../../helpers/getUserIp.js";


const router = express.Router();

router.post("/track-visitor", async (req, res) => {
  try {

    const visitor_id = await logWebsiteVisitor({
      ...req.body,
      ipAddress: getUserIp(req),
      countryHeader: req.headers["cf-ipcountry"] || null,
    });

    res.json({ success: true, visitor_id });
  } catch (err) {
    console.error("track-visitor error:", err);
    res.status(500).json({ success: false });
  }
});


router.post("/track-exit", async (req, res) => {
  try {
    // 🧠 Ignore incomplete or logged-in user events
    if (!req.body?.visitor_id) {
      console.warn("❌ Exit event ignored – missing visitor_id");
      return res.json({ success: false, ignored: true });
    }

    await logVisitorExitEvent({
      visitor_id: req.body.visitor_id,
      page: req.body.page,
      max_scroll: req.body.max_scroll,
      time_on_page: req.body.time_on_page,
      clicks: req.body.clicks,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("track-exit error:", err);
    res.status(500).json({ success: false });
  }
});



export default router;
