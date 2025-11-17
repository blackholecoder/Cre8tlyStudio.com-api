import express from "express";
import { createTopic, getTopics, getTopicById } from "../../db/community/dbtopics.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// GET all topics
router.get("/", authenticateToken, async (req, res) => {
  try {
    const topics = await getTopics();
    res.json({ success: true, topics });
  } catch (error) {
    console.error("GET /community/topics error:", error);
    res.status(500).json({ success: false, message: "Failed to load topics" });
  }
});

router.get("/:topicId", authenticateToken, async (req, res) => {
  try {
    const { topicId } = req.params;

    const topic = await getTopicById(topicId);
    if (!topic) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }

    res.json({ success: true, topic });

  } catch (error) {
    console.error("GET /community/topics/:topicId error:", error);
    res.status(500).json({ success: false, message: "Failed to load topic" });
  }
});

// CREATE new topic (admin only)
router.post("/", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const { name, slug, description } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: "Missing name or slug" });
    }

    const topic = await createTopic(name, slug, description);
    res.json({ success: true, topic });

  } catch (error) {
    console.error("POST /community/topics error:", error);
    res.status(500).json({ success: false, message: "Failed to create topic" });
  }
});

export default router;
