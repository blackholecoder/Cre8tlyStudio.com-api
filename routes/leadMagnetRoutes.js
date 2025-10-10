import express from "express";
import { createLeadMagnet, getLeadMagnetBySessionId, getLeadMagnetsByUser, markLeadMagnetComplete } from "../db/dbLeadMagnet.js";
import { processPromptFlow } from "../services/leadMagnetService.js";
import { authenticateToken, requireAdmin } from "../middleware/authMiddleware.js";
import { askGPT } from "../helpers/gptHelper.js";

const router = express.Router();

// Create new lead magnet after payment
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { prompt } = req.body;
    const result = await createLeadMagnet(req.user.id, null);
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
    const { magnetId, prompt, theme, pages, logo, link, coverImage, cta, } = req.body;  // 👈 include theme
    if (!magnetId || !prompt) {
      return res.status(400).json({ message: "magnetId and prompt are required" });
    }

      // 🔒 Prompt length validation (server-side safety)
    if (prompt.length > 2000) {
      return res.status(413).json({
        message: "Your input is too long. Please shorten your prompt. Max size: 5GB",
      });
    }

    const updated = await processPromptFlow(magnetId, req.user.id, prompt, theme, pages, logo, link, coverImage, cta,); 
    res.json(updated);
  } catch (err) {
    console.error("❌ ERROR in /prompt route:", err);
    res.status(500).json({ message: "Failed to process prompt" });
  }
});


router.post("/prompt-builder", async (req, res) => {
  const { audience, pain, promise, offer } = req.body;
console.log("🎯 Received prompt-builder data:", req.body);
  try {
    const systemPrompt = `
You are Cre8tlyStudio AI, an expert marketing strategist and creative lead magnet designer.
Your task is to craft a clear, professional GPT prompt that will generate a high-converting lead magnet 
for the user's target audience.

Use the following answers as context:
Audience: ${audience}
Pain: ${pain}
Promise: ${promise}
Offer: ${offer || "none provided"}

Your output should be one complete prompt ready to feed into another AI system.
It should instruct the AI to create a lead magnet that educates, inspires, and builds trust with the audience.
Do not include any preamble or commentary — just return the generated prompt text.
`;

    const gptResponse = await askGPT(systemPrompt);

    res.json({ prompt: gptResponse });
  } catch (err) {
    console.error("❌ Error building smart prompt:", err);
    res.status(500).json({ message: "Failed to generate smart prompt." });
  }
});




export default router;
