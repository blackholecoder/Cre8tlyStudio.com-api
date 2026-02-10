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
} from "../../db/fragments/dbFragments.js";
import { fragmentEmailQueue } from "../../queues/fragmentEmailQueue.js";

const router = express.Router();

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { body, reshareFragmentId = null } = req.body;

    if (!body?.trim() && !reshareFragmentId) {
      return res.status(400).json({
        success: false,
        message: "Fragment body is required",
      });
    }

    const authorName = await getUserNameById(req.user.id);

    const fragmentId = await createFragment({
      userId: req.user.id,
      authorUsername: authorName,
      body,
      reshareFragmentId,
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
    const { body } = req.body;

    await updateFragment({
      fragmentId,
      userId: req.user.id,
      body,
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

export default router;
