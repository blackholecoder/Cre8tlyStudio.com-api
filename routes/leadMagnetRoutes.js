import express from "express";
import {
  createLeadMagnet,
  getLeadMagnetBySessionId,
  getLeadMagnetsByUser,
  getPromptMemory,
  markLeadMagnetComplete,
  softDeleteMagnetById,
} from "../db/dbLeadMagnet.js";
import { processPromptFlow } from "../services/leadMagnetService.js";
import {
  authenticateToken,
} from "../middleware/authMiddleware.js";
import { askGPT } from "../helpers/gptHelper.js";
import { getUserBrandFile } from "../db/dbUploads.js";
import { getUserById } from "../db/dbUser.js";

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
    const {
      magnetId,
      prompt,
      title,
      font_name,
      font_file,
      bgTheme,
      pages = 5,
      logo,
      link,
      coverImage,
      cta,
      contentType,
    } = req.body;

    // 🧩 1️⃣ Fetch user to determine tier
    const user = await getUserById(req.user.id);

    // 🧩 2️⃣ Free-tier logic: has_free_magnet = 1 and magnet_slots = 1
    const isFreeTier = user?.has_free_magnet === 1 && user?.magnet_slots === 1;

    // 🧩 3️⃣ Enforce 5-page hard cap for free tier
    let safePages = isFreeTier
      ? Math.min(5, Math.max(1, pages))
      : Math.min(50, Math.max(1, pages));

    if (isFreeTier && pages > 5) {
      return res.status(403).json({
        success: false,
        message:
          "Free accounts are limited to 5 pages maximum (Header + Footer included). Please upgrade to unlock more pages.",
      });
    }

    // 🧱 Required field checks
    if (!magnetId || !prompt) {
      return res
        .status(400)
        .json({ message: "magnetId and prompt are required" });
    }

    // 🔒 Prevent oversized prompt payloads
    if (prompt.length > 2_000_000) {
      return res.status(413).json({
        message:
          "Your input is too long. Please shorten your prompt. Max size: 500mb",
      });
    }

    // 🧠 Process prompt normally (page limit enforced above)
    const updated = await processPromptFlow(
      magnetId,
      req.user.id,
      prompt,
      title,
      font_name,
      font_file,
      bgTheme,
      safePages,
      logo,
      link,
      coverImage,
      cta,
      contentType
    );

    res.json(updated);
  } catch (err) {
    console.error("❌ ERROR in /prompt route:");
    console.error("Message:", err.message);
    if (err.stack) console.error("Stack trace:", err.stack);
    if (err.response) {
      console.error("Response data:", err.response.data);
      console.error("Response status:", err.response.status);
    }

    if (err.response?.status === 429) {
      return res.status(429).json({
        message: "OpenAI rate limit reached, please try again shortly.",
      });
    }

    if (
      err.response?.data?.error?.message?.includes("context_length_exceeded")
    ) {
      return res.status(400).json({
        message:
          "Requested document is too long for one generation, please reduce the number of pages.",
      });
    }

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
    // 🧩 1️⃣ Fetch user to determine tier
    const user = await getUserById(req.user.id);
    const isFreeTier = user?.has_free_magnet === 1 && user?.magnet_slots === 1;

    // 🧩 2️⃣ Enforce 5-page cap for free users
    if (isFreeTier) {
      console.log(`🔒 Free-tier user detected (${user.email}) — enforcing limits.`);
    }

    // 🧩 3️⃣ Optional: Modify system prompt to reflect page limits
    const wordGoal = isFreeTier
      ? "around 1,000 words (maximum 5 pages)"
      : "up to 2,500 words (or more if needed)";

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

Guidelines:
- The output should produce ${wordGoal}.
- Never exceed this limit even if the user requests more.
- Keep structure tight, concise, and impactful.
- Match brand tone exactly if provided.

${
  brandTone && brandTone.trim()
    ? `Brand Tone and Style (match this exactly):\n${brandTone.slice(0, 8000)}`
    : `No brand tone file provided, use default professional creative voice.`
}

Your output must be one clean, complete prompt ready for another AI system to use.
Do not include preamble or commentary — only output the generated GPT prompt text.
`;

    // 🧠 Log tone usage for debugging
    if (brandTone && brandTone.trim()) {
      console.log(
        `🗣️ Using brand tone for user ${userId} (${brandTone.length} chars)`
      );
    } else {
      console.log(
        `🎨 No brand tone for user ${userId}, using default creative voice`
      );
    }

    // ✅ Generate the GPT prompt (tone applied automatically)
    const gptResponse = await askGPT(systemPrompt, {
      debug: true,
      brandTone: brandTone || null,
      isFreeTier,
    });

    const cleanPrompt = gptResponse.replace(/<[^>]*>?/gm, "").trim();

    // 🧩 4️⃣ Optionally enforce soft word length check server-side
    if (isFreeTier && cleanPrompt.split(" ").length > 1000) {
      return res.status(403).json({
        success: false,
        message:
          "Free-tier users are limited to approximately 5 pages (about 1,000 words). Please upgrade to generate longer content.",
      });
    }

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

router.delete("/magnets/:id", authenticateToken, async (req, res) => {
  try {
    const magnetId = req.params.id;

    const deleted = await softDeleteMagnetById(magnetId, req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Magnet not found or already deleted",
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Soft delete magnet error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


export default router;
