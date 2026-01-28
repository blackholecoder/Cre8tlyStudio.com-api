import express from "express";
import {
  createPost,
  getPostsByTopic,
  getPostById,
  getAllUserPosts,
  updateUserPost,
  deletePost,
  incrementPostView,
  getAllCommunityPosts,
  markCommunityPostViewed,
  likeCommunityPost,
  unlikeCommunityPost,
} from "../../db/community/dbPosts.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import {
  getTopicById,
  getViewedTopics,
  markTopicViewed,
} from "../../db/community/dbtopics.js";
import fs from "fs";
import { uploadFileToSpaces } from "../../helpers/uploadToSpace.js";
import { optimizeImageUpload } from "../../helpers/optimizeImageUpload.js";
import { postEmailQueue } from "../../queues/postEmailQueue.js";

const router = express.Router();

// Get all posts

router.get("/posts", authenticateToken, async (req, res) => {
  try {
    const posts = await getAllCommunityPosts(req.user.id);
    res.json({ posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load posts" });
  }
});

// Viewed Posts
router.post("/posts/:postId/view", authenticateToken, async (req, res) => {
  try {
    await markCommunityPostViewed(req.user.id, req.params.postId);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark post viewed" });
  }
});

// GET all posts in a topic
router.get("/topics/:topicId/posts", authenticateToken, async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user.id;

    const topic = await getTopicById(topicId, userId);
    if (!topic) {
      return res
        .status(404)
        .json({ success: false, message: "Topic not found" });
    }

    const posts = await getPostsByTopic(topicId);
    res.json({ success: true, topic, posts });
  } catch (error) {
    console.error("GET /community/topics/:id/posts error:", error);
    res.status(500).json({ success: false, message: "Failed to load posts" });
  }
});

router.get("/posts/user", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const posts = await getAllUserPosts(userId, userId);

    res.json({ posts });
  } catch (err) {
    console.error("GET /community/posts/user error:", err);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
});

// CREATE post in a topic
router.post("/topics/:topicId/posts", authenticateToken, async (req, res) => {
  try {
    const { topicId } = req.params;
    const { title, subtitle, body, image_url, relatedTopicIds } = req.body;

    if (!title) {
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    const topic = await getTopicById(topicId);
    if (!topic) {
      return res
        .status(404)
        .json({ success: false, message: "Topic not found" });
    }

    const post = await createPost(
      req.user.id,
      topicId,
      title,
      subtitle || null,
      body,
      image_url,
      relatedTopicIds,
    );

    await postEmailQueue.add("send-post-email", {
      authorUserId: req.user.id,
      authorName: req.user.name,
      postTitle: post.title,
      postBody: body,
      postImageUrl: image_url,
      postUrl: `${process.env.FRONTEND_URL}/community/post/${post.slug}`,
    });

    res.json({ success: true, post });
  } catch (error) {
    console.error("POST /community/topics/:id/posts error:", error);
    res.status(500).json({ success: false, message: "Failed to create post" });
  }
});

// GET single post
router.get("/posts/:identifier", authenticateToken, async (req, res) => {
  try {
    const { identifier } = req.params;
    const userId = req.user.id;

    const post = await getPostById(identifier, userId);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    await incrementPostView(post.id, userId);

    res.json({ success: true, post });
  } catch (error) {
    console.error("GET /community/posts/:id error:", error);
    res.status(500).json({ success: false, message: "Failed to load post" });
  }
});

router.post("/:topicId/mark-viewed", authenticateToken, async (req, res) => {
  try {
    await markTopicViewed(req.user.id, req.params.topicId);
    res.json({ success: true });
  } catch (error) {
    console.error("POST /community/topic/:topicId/mark-viewed error:", error);
    res.status(500).json({ success: false, message: "Failed to update view" });
  }
});

router.get("/views", authenticateToken, async (req, res) => {
  try {
    const viewedTopics = await getViewedTopics(req.user.id);
    res.json({ success: true, viewedTopics });
  } catch (err) {
    console.error("GET /community/views error:", err);
    res.status(500).json({ success: false });
  }
});

router.post("/upload-image", authenticateToken, async (req, res) => {
  try {
    const image = req.files?.image;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Missing image file",
      });
    }

    const buffer = fs.readFileSync(image.tempFilePath);

    let bufferToUpload = buffer;
    let finalMimeType = image.mimetype; // ✅ declare up top

    const isImage = image.mimetype.startsWith("image/");

    if (isImage) {
      const supportsTransparency =
        image.mimetype === "image/png" || image.mimetype === "image/webp";

      let optimized;

      if (supportsTransparency) {
        optimized = await optimizeImageUpload(bufferToUpload, image.mimetype, {
          purpose: "post",
        });

        bufferToUpload = optimized.optimizedBuffer;
        finalMimeType = optimized.mimetype;
      } else {
        optimized = await optimizeImageUpload(bufferToUpload, image.mimetype, {
          purpose: "post",
        });

        bufferToUpload = optimized.optimizedBuffer;
        finalMimeType = "image/jpeg";
      }
    }

    const fileExt =
      finalMimeType === "image/png"
        ? "png"
        : finalMimeType === "image/webp"
          ? "webp"
          : "jpg";

    const fileName = `community_posts/${Date.now()}.${fileExt}`;

    const result = await uploadFileToSpaces(
      bufferToUpload,
      fileName,
      finalMimeType,
    );

    fs.unlinkSync(image.tempFilePath);

    res.json({
      success: true,
      image_url: result.Location,
    });
  } catch (err) {
    console.error("❌ Error uploading post image:", err);
    res.status(500).json({
      success: false,
      message: "Failed to upload post image",
    });
  }
});

// Editing Posts Route
router.put("/posts/:postId", authenticateToken, async (req, res) => {
  try {
    const success = await updateUserPost(
      req.user.id,
      req.params.postId,
      req.body,
    );

    if (!success) {
      return res.status(403).json({ message: "Not allowed" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("PUT /community/posts/:postId error:", err);
    res.status(500).json({ message: "Failed to update post" });
  }
});

// delete posts
router.delete("/posts/:id", authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const role = req.user.role;

    const result = await deletePost(postId, userId, role);

    if (!result.success) {
      return res.status(403).json(result);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /community/posts/:id error:", err);
    res.status(500).json({ message: "Failed to delete post" });
  }
});

router.post("/:postId/like", authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    await likeCommunityPost({ postId, userId });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to like post",
    });
  }
});

router.delete("/:postId/like", authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    await unlikeCommunityPost({ postId, userId });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to unlike post",
    });
  }
});

export default router;
