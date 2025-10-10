import express from "express";
import fs from "fs";
import path from "path";
import { authenticateToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Upload a temporary Base64 cover image (max 1GB)
 * Returns the temp file path for Puppeteer PDF generation
 */
router.post("/temp-cover", authenticateToken, async (req, res) => {
  try {
    const { cover } = req.body;

    if (!cover || !cover.startsWith("data:image")) {
      return res.status(400).json({ message: "Invalid image data" });
    }

    // ensure tmp folder exists
    const tempDir = path.resolve("uploads/tmp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // extract file type (png, jpeg, etc.)
    const ext = cover.substring(cover.indexOf("/") + 1, cover.indexOf(";"));
    const fileName = `cover-${Date.now()}.${ext}`;
    const filePath = path.join(tempDir, fileName);

    // decode Base64
    const base64Data = cover.replace(/^data:image\/\w+;base64,/, "");
    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

    // optional: return local URL if you serve /uploads statically
    const fileUrl = `${process.env.BASE_URL || "https://cre8tlystudio.com"}/uploads/tmp/${fileName}`;

    res.json({
      message: "Cover uploaded successfully",
      filePath, // local path for Puppeteer
      fileUrl,  // optional URL for preview
    });
  } catch (err) {
    console.error("❌ Temp cover upload failed:", err);
    res.status(500).json({ message: "Failed to upload cover image" });
  }
});

export default router;
