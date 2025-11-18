import express from "express";
import {
  addComment,
  createReply,
  deleteComment,
  getCommentsByPost,
  getCommentsPaginated,
  getParentCommentUserId,
  getRepliesPaginated,
  likeComment,
  unlikeComment,
  updateComment,
} from "../../db/community/dbComments.js";
import { getPostById } from "../../db/community/dbPosts.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// GET comments on a post
router.get("/posts/:postId/comments", authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await getPostById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const comments = await getCommentsByPost(postId, req.user.id);
    res.json({ success: true, comments });
  } catch (error) {
    console.error("GET /community/posts/:id/comments error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to load comments" });
  }
});

// CREATE comment
router.post("/posts/:postId/comments", authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { body } = req.body;

    if (!body) {
      return res
        .status(400)
        .json({ success: false, message: "Comment cannot be empty" });
    }

    const post = await getPostById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const comment = await addComment(postId, req.user.id, body);
    res.json({ success: true, comment });
  } catch (error) {
    console.error("POST /community/posts/:id/comments error:", error);
    res.status(500).json({ success: false, message: "Failed to add comment" });
  }
});

router.get("/posts/:postId/comments", authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const comments = await getCommentsPaginated(
      postId,
      req.user.id,
      page,
      limit
    );

    res.json({
      success: true,
      comments,
      nextPage: comments.length < limit ? null : page + 1,
    });
  } catch (error) {
    console.error("GET /community/posts/:postId/comments error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to load comments" });
  }
});

// Replies


router.post(
  "/comments/:commentId/reply",
  authenticateToken,
  async (req, res) => {
    try {
      const { commentId } = req.params;
      const { body, postId } = req.body;

      if (!body) {
        return res
          .status(400)
          .json({ success: false, message: "Reply cannot be empty" });
      }

      // 🧼 Clean helper call to get parent comment user
      const parentUserId = await getParentCommentUserId(commentId);

      // 🧼 Clean helper call to create reply + notification
      const replyId = await createReply(
        req.user.id,
        postId,
        commentId,
        body,
        parentUserId
      );

      res.json({ success: true, replyId });
    } catch (error) {
      console.error("POST /community/comments/:commentId/reply error:", error);
      res.status(500).json({ success: false, message: "Failed to post reply" });
    }
  }
);


router.get(
  "/comments/:commentId/replies",
  authenticateToken,
  async (req, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.user.id;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const offset = (page - 1) * limit;

      const { rows, total } = await getRepliesPaginated(
        commentId,
        userId,
        limit,
        offset
      );

      const nextPage = offset + limit < total ? page + 1 : null;

      res.json({
        success: true,
        replies: rows,
        nextPage,
      });
    } catch (err) {
      console.error("Failed to load replies:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to load replies" });
    }
  }
);

router.put("/comments/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { body } = req.body;
  const userId = req.user.id; // from auth
  const role = req.user.role; // admin or user

  try {
    await updateComment(id, userId, body, role);
    res.json({ success: true });
  } catch (err) {
    console.error("Edit failed:", err);
    res.status(500).json({ success: false, message: "Failed to edit comment" });
  }
});

router.delete("/comments/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const result = await deleteComment(id, userId, role);

    if (!result.success) {
      return res.status(403).json({ success: false, message: result.message });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete failed:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete comment" });
  }
});

// LIKES

router.post("/comments/:id/like", authenticateToken, async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.id;

  try {
    await likeComment(commentId, userId);

    res.json({ success: true });
  } catch (err) {
    console.error("Like failed:", err);
    res.status(500).json({ success: false });
  }
});

router.delete("/comments/:id/like", authenticateToken, async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.id;

  try {
    await unlikeComment(commentId, userId);

    res.json({ success: true });
  } catch (err) {
    console.error("Unlike failed:", err);
    res.status(500).json({ success: false });
  }
});

export default router;
