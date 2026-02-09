import express from "express";
import {
  getUserSettings,
  removeUserBrandFile,
  updateUserCta,
  uploadBrandIdentity,
} from "../db/dbUploads.js";
import { uploadBrandFileSchema } from "../middleware/uploadBrandFileSchema.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { uploadUserAvatar } from "../db/dbUser.js";

const router = express.Router();

router.post("/user/settings/upload", authenticateToken, async (req, res) => {
  try {
    const { error, value } = uploadBrandFileSchema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const { user_id, file_name, file_data } = value;
    const result = await uploadBrandIdentity(user_id, file_name, file_data);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/user/settings/:id", authenticateToken, async (req, res) => {
  try {
    const settings = await getUserSettings(req.params.id);
    res.status(200).json({ success: true, settings });
  } catch (err) {
    console.error("Error fetching settings:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete(
  "/user/settings/remove/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const result = await removeUserBrandFile(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      console.error("Error removing brand file:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to remove brand file" });
    }
  },
);

router.put("/user/settings/update-cta", authenticateToken, async (req, res) => {
  try {
    const { userId, cta } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "Missing userId" });
    }

    await updateUserCta(userId, cta);

    res.json({
      success: true,
      message: "CTA updated successfully",
    });
  } catch (err) {
    console.error("🔥 Error in /update-cta:", err);
    res.status(500).json({ message: "Failed to update CTA" });
  }
});

router.post("/upload-avatar", async (req, res) => {
  try {
    const { userId, profileImage, target } = req.body;

    if (!userId || !profileImage) {
      return res.status(400).json({ error: "Missing userId or image" });
    }

    const result = await uploadUserAvatar(userId, profileImage, target);

    res.json({
      success: true,
      profileImage: result.profileImage,
    });
  } catch (err) {
    console.error("Avatar upload failed:", err);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
});

export default router;
