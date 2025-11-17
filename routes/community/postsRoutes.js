import express from "express";
import { 
  createPost, 
  getPostsByTopic, 
  getPostById 
} from "../../db/community/dbPosts.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { getTopicById } from "../../db/community/dbtopics.js";

const router = express.Router();

// GET all posts in a topic
router.get("/topics/:topicId/posts", authenticateToken, async (req, res) => {
  try {
    const { topicId } = req.params;

    const topic = await getTopicById(topicId);
    if (!topic) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }

    const posts = await getPostsByTopic(topicId);
    res.json({ success: true, topic, posts });

  } catch (error) {
    console.error("GET /community/topics/:id/posts error:", error);
    res.status(500).json({ success: false, message: "Failed to load posts" });
  }
});

// CREATE post in a topic
router.post("/topics/:topicId/posts", authenticateToken, async (req, res) => {
  try {
    const { topicId } = req.params;
    const { title, body } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const topic = await getTopicById(topicId);
    if (!topic) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }

    const post = await createPost(req.user.id, topicId, title, body);
    res.json({ success: true, post });

  } catch (error) {
    console.error("POST /community/topics/:id/posts error:", error);
    res.status(500).json({ success: false, message: "Failed to create post" });
  }
});

// GET single post
router.get("/posts/:postId", authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await getPostById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    res.json({ success: true, post });

  } catch (error) {
    console.error("GET /community/posts/:id error:", error);
    res.status(500).json({ success: false, message: "Failed to load post" });
  }
});

export default router;
