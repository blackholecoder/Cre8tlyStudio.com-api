import express from "express";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import {
  createFragment,
  deleteFragmentById,
  getFragmentById,
  getFragmentFeed,
  getUserFragments,
  getUserNameById,
  updateFragment,
  uploadFragmentAudioHelper,
} from "../../db/fragments/dbFragments.js";
import { fragmentEmailQueue } from "../../queues/fragmentEmailQueue.js";

const router = express.Router();

router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      body,
      reshareFragmentId = null,
      audio_url = null,
      audio_title = null,
      audio_duration_seconds = null,
      audio_file_size = null,
      audio_mime_type = null,
    } = req.body;

    const hasText = body?.trim();
    const hasAudio = !!audio_url;

    if (!hasText && !reshareFragmentId && !hasAudio) {
      return res.status(400).json({
        success: false,
        message: "Fragment cannot be empty",
      });
    }
    const authorName = await getUserNameById(req.user.id);

    const fragmentId = await createFragment({
      userId: req.user.id,
      authorUsername: authorName,
      body,
      reshareFragmentId,
      audio_url,
      audio_title,
      audio_duration_seconds,
      audio_file_size,
      audio_mime_type,
    });

    await fragmentEmailQueue.add("send-fragment-email", {
      authorUserId: req.user.id,
      authorName: authorName || "Someone you follow",
      fragmentBody: body,
      fragmentUrl: `${process.env.FRONTEND_URL}/community/fragments/${fragmentId}`,
    });

    res.json({
      success: true,
      fragmentId,
    });
  } catch (err) {
    console.error("❌ POST /fragments error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create fragment",
    });
  }
});

/**
 * GET fragment feed
 */
router.get("/feed", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const fragments = await getFragmentFeed({
      userId,
      limit: Number(req.query.limit) || 20,
      offset: Number(req.query.offset) || 0,
    });

    res.json({
      success: true,
      fragments,
    });
  } catch (err) {
    console.error("❌ GET /fragments/feed error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch fragment feed",
    });
  }
});

router.get("/my-fragments", authenticateToken, async (req, res) => {
  try {
    const fragments = await getFragmentFeed({
      userId: req.user.id, // viewer
      ownerId: req.user.id, // filter
      limit: Number(req.query.limit) || 20,
      offset: Number(req.query.offset) || 0,
    });

    res.json({ success: true, fragments });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

router.get("/:fragmentId", authenticateToken, async (req, res) => {
  try {
    const { fragmentId } = req.params;
    const userId = req.user?.id || null;

    const fragment = await getFragmentById(fragmentId, userId);

    if (!fragment) {
      return res.status(404).json({
        success: false,
        message: "Fragment not found",
      });
    }

    res.json({
      success: true,
      fragment,
    });
  } catch (err) {
    console.error("❌ GET /fragments/:id error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch fragment",
    });
  }
});

// put
router.put("/:fragmentId", authenticateToken, async (req, res) => {
  try {
    const { fragmentId } = req.params;

    const {
      body,
      audio_url = null,
      audio_title = null,
      audio_duration_seconds = null,
      audio_file_size = null,
      audio_mime_type = null,
    } = req.body;

    await updateFragment({
      fragmentId,
      userId: req.user.id,
      body,
      audio_url,
      audio_title,
      audio_duration_seconds,
      audio_file_size,
      audio_mime_type,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ PUT /fragments/:id error:", err);
    res.status(500).json({ success: false });
  }
});

router.get("/user", authenticateToken, async (req, res) => {
  try {
    const fragments = await getUserFragments(req.user.id);
    res.json({ fragments });
  } catch {
    res.status(500).json({ message: "Failed to fetch fragments" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const success = await deleteFragmentById(req.params.id, req.user.id);

    if (!success) {
      return res.status(404).json({ message: "Fragment not found" });
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "Failed to delete fragment" });
  }
});

router.post("/upload-audio", authenticateToken, async (req, res) => {
  try {
    if (!req.files || !req.files.audio) {
      console.log("❌ No audio in req.files");
      return res.status(400).json({
        success: false,
        message: "No audio file uploaded",
      });
    }

    const file = req.files.audio;

    const result = await uploadFragmentAudioHelper({
      userId: req.user.id,
      file,
    });

    res.json({
      success: true,
      publicUrl: result.publicUrl,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
    });
  } catch (err) {
    console.error("❌ BACKEND ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;
