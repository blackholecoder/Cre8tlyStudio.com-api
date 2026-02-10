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
  togglePostBookmark,
  getUserBookmarkedPosts,
  unlikeTarget,
  likeTarget,
  getCommunityFeed,
  getUserIdByUsername,
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
import { getUserRecap, markUserSeen } from "../../db/dbUser.js";
import { getUserNameById } from "../../db/fragments/dbFragments.js";

const router = express.Router();

// Community feed route

router.get("/feed", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const { items, hasMore } = await getCommunityFeed({
      userId,
      limit,
      offset,
    });

    res.json({
      success: true,
      items,
      hasMore,
    });
  } catch (err) {
    console.error("❌ GET /community/feed error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to load community feed",
    });
  }
});

// Get all posts

router.get("/posts", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const posts = await getAllCommunityPosts({
      userId,
      limit,
      offset,
    });

    res.json({
      posts,
      hasMore: posts.length === limit,
      nextOffset: offset + posts.length,
    });
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

    const posts = await getPostsByTopic(topicId, userId);
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
    const userId = req.user.id;

    const {
      title,
      subtitle,
      body,
      image_url,
      relatedTopicIds,
      comments_visibility = "public",
    } = req.body;

    if (!title || !body) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const topic = await getTopicById(topicId);
    if (!topic) {
      return res
        .status(404)
        .json({ success: false, message: "Topic not found" });
    }

    const post = await createPost({
      userId,
      topicId,
      title,
      subtitle,
      body,
      imageUrl: image_url,
      relatedTopicIds,
      commentsVisibility: comments_visibility,
    });

    const authorName = await getUserNameById(req.user.id);

    await postEmailQueue.add("send-post-email", {
      authorUserId: userId,
      authorName: authorName,
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

// mentions unique id route

router.get("/u/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const userId = await getUserIdByUsername(username);

    if (!userId) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.redirect(`/community/profile/${userId}`);
  } catch (err) {
    console.error("❌ Username redirect failed:", err);
    return res.status(500).end();
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

router.post("/likes", authenticateToken, async (req, res) => {
  try {
    const { targetType, targetId } = req.body;
    const userId = req.user.id;

    if (!targetType || !targetId) {
      return res.status(400).json({ message: "Missing target info" });
    }

    await likeTarget({ targetType, targetId, userId });

    res.json({ success: true });
  } catch (err) {
    console.error("LIKE error:", err);
    res.status(500).json({ message: "Failed to like" });
  }
});

/**
 * UNLIKE
 * body: { targetType, targetId }
 */
router.delete("/delete-like", authenticateToken, async (req, res) => {
  try {
    const { targetType, targetId } = req.body;
    const userId = req.user.id;

    if (!targetType || !targetId) {
      return res.status(400).json({ message: "Missing target info" });
    }

    await unlikeTarget({ targetType, targetId, userId });

    res.json({ success: true });
  } catch (err) {
    console.error("UNLIKE error:", err);
    res.status(500).json({ message: "Failed to unlike" });
  }
});

router.post("/bookmark/:postId", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const result = await togglePostBookmark(userId, postId);

    res.json({
      success: true,
      bookmarked: result.bookmarked,
    });
  } catch (err) {
    console.error("Bookmark toggle route failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update bookmark",
    });
  }
});

router.get("/saved-user-bookmarks", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Number(req.query.page || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const posts = await getUserBookmarkedPosts(userId, limit, offset);

    res.json({
      success: true,
      posts,
      nextPage: posts.length === limit ? page + 1 : null,
    });
  } catch (err) {
    console.error("Get bookmarks route failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load saved posts",
    });
  }
});

// USER RECAP LOGIC
router.get("/recap", authenticateToken, async (req, res) => {
  try {
    const recap = await getUserRecap(req.user.id);
    res.json(recap);
  } catch {
    res.json({ hasActivity: false });
  }
});

router.post("/mark-seen", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false });
    }

    await markUserSeen(userId);

    res.json({ success: true });
  } catch (err) {
    console.error("Mark seen route failed:", err);
    res.json({ success: false });
  }
});

export default router;
