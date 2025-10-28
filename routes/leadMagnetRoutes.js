import express from "express";
import { createLeadMagnet, getLeadMagnetBySessionId, getLeadMagnetsByUser, getPromptMemory, markLeadMagnetComplete } from "../db/dbLeadMagnet.js";
import { processPromptFlow } from "../services/leadMagnetService.js";
import { authenticateToken, requireAdmin } from "../middleware/authMiddleware.js";
import { askGPT } from "../helpers/gptHelper.js";
import { getUserBrandFile } from "../db/dbUploads.js";

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
  // console.log("🟢 /prompt route hit with body keys:", Object.keys(req.body));
  try {
    const { magnetId, prompt, title, theme, bgTheme, pages, logo, link, coverImage, cta, contentType } = req.body;  // 👈 include theme

    if (!magnetId || !prompt) {
      return res.status(400).json({ message: "magnetId and prompt are required" });
    }

      // 🔒 Prompt length validation (server-side safety)
    if (prompt.length > 2_000_000) {
      return res.status(413).json({
        message: "Your input is too long. Please shorten your prompt. Max size: 500mb",
      });
    }

    const updated = await processPromptFlow(magnetId, req.user.id, prompt, title, theme, bgTheme, pages, logo, link, coverImage, cta, contentType); 
    res.json(updated);
  } catch (err) {
    // 🧠 Enhanced error logging
    console.error("❌ ERROR in /prompt route:");
    console.error("Message:", err.message);
    if (err.stack) console.error("Stack trace:", err.stack);
    if (err.response) {
      console.error("Response data:", err.response.data);
      console.error("Response status:", err.response.status);
    }
    if (err.request) {
      console.error("Request error:", err.request.path || "(unknown request path)");
    }

    // ⚙️ Send more informative error feedback to frontend
    if (err.response?.status === 429) {
      return res.status(429).json({ message: "OpenAI rate limit reached, please try again shortly." });
    }
    if (err.response?.data?.error?.message?.includes("context_length_exceeded")) {
      return res.status(400).json({
        message: "Requested document is too long for one generation, please reduce the number of pages.",
      });
    }

    // 🚨 Default fallback
    res.status(500).json({
      message:
        err.response?.data?.error?.message ||
        err.message ||
        "Something went wrong on the server. Check logs for details.",
    });
  }
});


router.post("/prompt-builder", authenticateToken, async (req, res) => {
  const { audience, pain, promise, offer, userId } = req.body;
  console.log("🎯 Received prompt-builder data:", req.body);

  try {
    // ✅ This already returns TONE TEXT (from pdf/txt) or null
    const brandTone = await getUserBrandFile(userId);

    const systemPrompt = `
You are Cre8tlyStudio AI, an expert marketing strategist and creative lead magnet designer.
Your job is to craft a GPT prompt that generates a high-converting lead magnet for the user's target audience.
Write in a tone that reflects the brand voice provided (if available).

Context:
Audience: ${audience}
Pain: ${pain}
Promise: ${promise}
Offer: ${offer || "none provided"}

${
  brandTone && brandTone.trim()
    ? `Brand Tone and Style (match this exactly):\n${brandTone.slice(0, 8000)}`
    : `No brand tone file provided, use default professional creative voice.`
}

Your output must be one clean, complete prompt ready for another AI system to use.
Do not include preamble or commentary — only output the generated GPT prompt text.
`;

    if (brandTone && brandTone.trim()) {
      console.log(`🗣️ Using brand tone for user ${userId} (${brandTone.length} chars)`);
    } else {
      console.log(`🎨 No brand tone for user ${userId}, using default creative voice`);
    }

    // ✅ Pass the tone text to askGPT so it can blend voice at the system level
    const gptResponse = await askGPT(systemPrompt, {
      debug: true,
      brandTone: brandTone || null,
    });

    const cleanPrompt = gptResponse.replace(/<[^>]*>?/gm, "").trim();
    res.json({ prompt: cleanPrompt });
  } catch (err) {
    console.error("❌ Error building smart prompt:", err);
    res.status(500).json({ message: "Failed to generate smart prompt." });
  }
});



router.get("/prompt-memory/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const data = await getPromptMemory(userId);
    res.json(data);
  } catch (err) {
    console.error("Error fetching prompt memory:", err);
    res.status(500).json({ error: "Failed to load prompt memory" });
  }
});




export default router;
