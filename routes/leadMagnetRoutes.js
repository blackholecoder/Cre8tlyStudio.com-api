import express from "express";
import { createLeadMagnet, getLeadMagnetBySessionId, markLeadMagnetComplete } from "../db/dbLeadMagnet.js";
import { attachPromptToLeadMagnet } from "../services/leadMagnetService.js";

const router = express.Router();

// Create new lead magnet after payment
router.post("/", async (req, res) => {
  try {
    const { userId, prompt } = req.body;
    const leadMagnet = await createLeadMagnet(userId, prompt);
    res.json(leadMagnet);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "failed to create lead magnet" });
  }
});

// (Optional) Mark completed after PDF generation
router.post("/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;
    const { pdfUrl } = req.body;
    await markLeadMagnetComplete(id, pdfUrl);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "failed to update lead magnet" });
  }
});

router.get("/:sessionId", async (req, res) => {
  try {
    const magnet = await getLeadMagnetBySessionId(req.params.sessionId);
    if (!magnet) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json(magnet);
  } catch (err) {
    console.error("Error fetching lead magnet:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// router.post("/prompt", async (req, res) => {
//   try {
//     const { sessionId, prompt } = req.body;
//     const updated = await attachPromptToLeadMagnet(sessionId, prompt);
//     res.json(updated);
//   } catch (err) {
//     console.error(err);
//     res.status(400).json({ error: "Failed to attach prompt" });
//   }
// });
router.post("/prompt", async (req, res) => {
  try {
    console.log("👉 /prompt HIT");
    console.log("Request body:", req.body);

    const { sessionId, prompt } = req.body;
    if (!sessionId) {
      console.error("❌ Missing sessionId");
      return res.status(400).json({ error: "Missing sessionId" });
    }
    if (!prompt) {
      console.error("❌ Missing prompt");
      return res.status(400).json({ error: "Missing prompt" });
    }

    const updated = await attachPromptToLeadMagnet(sessionId, prompt);

    console.log("✅ Updated lead magnet:", updated);
    res.json(updated);
  } catch (err) {
    console.error("❌ ERROR in /prompt route:", err.message, err.stack);
    res.status(500).json({ error: "Failed to attach prompt" });
  }
});

export default router;
