import express from "express";
import {
  authenticateAdminToken,
  requireAdmin,
} from "../../middleware/authMiddleware.js";
import {
  createAdminComment,
  createAdminCommunityPost,
  deleteAdminComment,
  deleteAdminCommunityPost,
  getAdminCommunityPosts,
  getAdminSinglePost,
  getAllComments,
  getAllPosts,
  getCommentsForAdminPost,
  getPostsByTopic,
  getUnseenCommentCount,
  getUnseenCommentCountByTopic,
  getUnseenCommentMapByPost,
  getUnseenPostCount,
  markAllCommentsSeen,
  markAllPostsSeen,
  updateAdminComment,
} from "../../db/admin/dbCreateAdminPosts.js";
import { getTopics } from "../../db/community/dbtopics.js";

const router = express.Router();

router.post("/post", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.id; // YOUR ACCOUNT
    const { topic_id, title, body } = req.body;

    await createAdminCommunityPost({ topic_id, title, body, adminId });

    res.json({ success: true });
  } catch (err) {
    console.error("Admin community post failed:", err);
    res.status(500).json({ success: false });
  }
});

router.get("/list", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {
    const { offset = 0, limit = 20 } = req.query;

    const posts = await getAdminCommunityPosts(offset, limit);

    res.json({ posts });
  } catch (err) {
    console.error("Failed to load community posts:", err);
    res.status(500).json({ success: false });
  }
});

router.get(
  "/topics",
  authenticateAdminToken,
  requireAdmin,
  async (req, res) => {
    try {
      const topics = await getTopics();
      res.json({ success: true, topics });
    } catch (err) {
      console.error("GET /admin/community/topics error:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to load topics" });
    }
  }
);

router.delete(
  "/posts/:postId",
  authenticateAdminToken,
  requireAdmin,
  async (req, res) => {
    try {
      const success = await deleteAdminCommunityPost(req.params.postId);

      if (!success) {
        return res
          .status(404)
          .json({ success: false, message: "Post not found" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /admin/community/posts error:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to delete post" });
    }
  }
);

// COMMENTS
router.get("/comments", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {
    const offset = Number(req.query.offset || 0);
    const limit = Number(req.query.limit || 20);

    const comments = await getAllComments(offset, limit);

    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: "Failed to load comments" });
  }
});


router.post(
  "/post/:postId/mark-seen",
  authenticateAdminToken,
  async (req, res) => {
    try {
      await markAllCommentsSeen(req.params.postId);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);


router.get("/unseen-count", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {
    const count = await getUnseenCommentCount();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch unseen count" });
  }
});

// POST 

router.put("/posts/mark-seen", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {
    await markAllPostsSeen();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark posts seen" });
  }
});


router.get("/posts/unseen-count", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {
    const count = await getUnseenPostCount();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Failed to load unseen count" });
  }
});

router.get("/all-posts", authenticateAdminToken, requireAdmin, async (req, res) => {
  try {
    const offset = Number(req.query.offset || 0);
    const limit = Number(req.query.limit || 20);

    const posts = await getAllPosts(offset, limit);

    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: "Failed to load posts" });
  }
});

// ===============================
// GET POSTS BY TOPIC
// ===============================
router.get(
  "/posts-by-topic/:topicId",
  authenticateAdminToken,
  requireAdmin,
  async (req, res) => {
    try {
      const posts = await getPostsByTopic(req.params.topicId);
      res.json({ success: true, posts });
    } catch (err) {
      console.error("GET /admin/community/posts-by-topic error:", err);
      res.status(500).json({ success: false });
    }
  }
);

// ===============================
// GET COMMENTS FOR A POST
// ===============================
router.get(
  "/post/:postId/comments",
  authenticateAdminToken,
  requireAdmin,
  async (req, res) => {
    try {
      const comments = await getCommentsForAdminPost(req.params.postId);
      res.json({ success: true, comments });
    } catch (err) {
      console.error("GET /admin/community/post/comments error:", err);
      res.status(500).json({ success: false });
    }
  }
);

// ===============================
// ADMIN REPLY TO A POST
// ===============================
router.post(
  "/post/:postId/comment",
  authenticateAdminToken,
  requireAdmin,
  async (req, res) => {
    try {
      const adminId = req.user.id;
      const { body, parent_id } = req.body;

      await createAdminComment({
        postId: req.params.postId,
        adminId,
        body,
        parent_id
      });

      res.json({ success: true });
    } catch (err) {
      console.error("POST admin/community/post/comment error:", err);
      res.status(500).json({ success: false });
    }
  }
);

// ===============================
// UNSEEN COMMENTS BY TOPIC
// ===============================
router.get(
  "/unseen-map/:topicId",
  authenticateAdminToken,
  requireAdmin,
  async (req, res) => {
    try {
      const map = await getUnseenCommentMapByPost(req.params.topicId);
      res.json({ success: true, byPost: map });
    } catch (err) {
      console.error("GET unseen comment map error:", err);
      res.status(500).json({ success: false });
    }
  }
);

// ===============================
// UNSEEN COMMENTS BY TOPIC TOTAL
// ===============================
router.get(
  "/unseen-count/by-topic",
  authenticateAdminToken,
  requireAdmin,
  async (req, res) => {
    try {
      const counts = await getUnseenCommentCountByTopic();
      res.json({ success: true, byTopic: counts });
    } catch (err) {
      console.error("GET unseen-count/by-topic error:", err);
      res.status(500).json({ success: false });
    }
  }
);


router.get(
  "/post/:postId/comments",
  authenticateAdminToken,
  requireAdmin,
  async (req, res) => {
    try {
      const comments = await getCommentsForAdminPost(req.params.postId);
      res.json({ success: true, comments });
    } catch (err) {
      console.error("GET /admin/community/post/comments error:", err);
      res.status(500).json({ success: false });
    }
  }
);

router.post(
  "/post/:postId/comment",
  authenticateAdminToken,
  requireAdmin,
  async (req, res) => {
    try {
      const adminId = req.user.id;
      const { body } = req.body;

      await createAdminComment({
        postId: req.params.postId,
        adminId,
        body,
      });

      res.json({ success: true });
    } catch (err) {
      console.error("POST admin/community/post/comment error:", err);
      res.status(500).json({ success: false });
    }
  }
);

router.get(
  "/unseen-map/:topicId",
  authenticateAdminToken,
  requireAdmin,
  async (req, res) => {
    try {
      const map = await getUnseenCommentMapByPost(req.params.topicId);
      res.json({ success: true, byPost: map });
    } catch (err) {
      console.error("GET unseen comment map error:", err);
      res.status(500).json({ success: false });
    }
  }
);

router.get(
  "/unseen-count/by-topic",
  authenticateAdminToken,
  requireAdmin,
  async (req, res) => {
    try {
      const counts = await getUnseenCommentCountByTopic();
      res.json({ success: true, byTopic: counts });
    } catch (err) {
      console.error("GET unseen-count/by-topic error:", err);
      res.status(500).json({ success: false });
    }
  }
);

router.delete(
  "/comments/:commentId",
  authenticateAdminToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { commentId } = req.params;

      await deleteAdminComment(commentId);

      res.json({ success: true });
    } catch (err) {
      console.error("DELETE admin/community/comment error:", err);
      res.status(500).json({ success: false });
    }
  }
);


router.put("/comments/:commentId", async (req, res) => {
  try {
    const { commentId } = req.params;
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: "Body required" });
    }

    await updateAdminComment(commentId, body);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ update comment error:", err);
    res.status(500).json({ success: false });
  }
});

router.get(
  "/post/:postId",
  authenticateAdminToken,
  requireAdmin,
  async (req, res) => {
    try {
      const post = await getAdminSinglePost(req.params.postId);
      if (!post) {
        return res.status(404).json({ success: false, message: "Post not found" });
      }

      const comments = await getCommentsForAdminPost(req.params.postId);

      res.json({
        success: true,
        post,
        comments
      });
    } catch (err) {
      console.error("GET /admin/community/post error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);







export default router;
