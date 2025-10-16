import express from "express";
import { getUserSettings, removeUserBrandFile, uploadBrandIdentity } from "../db/dbUploads.js";
import { uploadBrandFileSchema } from "../middleware/uploadBrandFileSchema.js";

const router = express.Router();

router.post("/user/settings/upload", async (req, res) => {
  try {
    const { error, value } = uploadBrandFileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { user_id, file_name, file_data } = value;
    const result = await uploadBrandIdentity(user_id, file_name, file_data);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/user/settings/:id", async (req, res) => {
  try {
    const settings = await getUserSettings(req.params.id);
    res.status(200).json({ success: true, settings });
  } catch (err) {
    console.error("Error fetching settings:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/user/settings/remove/:id", async (req, res) => {
  try {
    const result = await removeUserBrandFile(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    console.error("Error removing brand file:", err);
    res.status(500).json({ success: false, message: "Failed to remove brand file" });
  }
});







export default router;
