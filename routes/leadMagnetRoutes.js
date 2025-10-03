import express from "express";
import { createLeadMagnet, getLeadMagnetBySessionId, getLeadMagnetsByUser, markLeadMagnetComplete } from "../db/dbLeadMagnet.js";
import { processPromptFlow } from "../services/leadMagnetService.js";
import { authenticateToken, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create new lead magnet after payment
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { prompt } = req.body;
    const result = await createLeadMagnet(req.user.id, prompt);
    res.status(201).json(result);
  } catch (err) {
    console.error("LeadMagnet create error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/", authenticateToken, async (req, res) => {
  try {
    const rows = await getLeadMagnetsByUser(req.user.id);
    res.json(rows);
  } catch (err) {
    console.error("LeadMagnet fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/all", authenticateToken, requireAdmin, async (req, res) => {
  const rows = await getAllLeadMagnets();
  res.json(rows);
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


router.post("/prompt", authenticateToken, async (req, res) => {
  try {
    const { magnetId, prompt } = req.body;
    if (!magnetId || !prompt) {
      return res.status(400).json({ message: "magnetId and prompt are required" });
    }

    const updated = await processPromptFlow(magnetId, req.user.id, prompt); // 👈 service handles everything
    res.json(updated);
  } catch (err) {
    console.error("❌ ERROR in /prompt route:", err);
    res.status(500).json({ message: "Failed to process prompt" });
  }
});



export default router;
