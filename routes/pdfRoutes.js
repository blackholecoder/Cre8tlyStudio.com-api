import express from "express";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

router.get("/proxy", async (req, res) => {
  let { url, title, preview, magnetId } = req.query; // accept title and preview flags

  if (!url || typeof url !== "string") {
    console.error("❌ Missing or invalid ?url:", url);
    return res.status(400).send("Invalid or missing ?url parameter");
  }

  try {
    url = decodeURIComponent(url);

    // ✅ Ensure full HTTPS URL
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    const response = await axios.get(url, { responseType: "arraybuffer" });

    // ✅ Determine clean filename
    let filename = "Cre8tly_Download.pdf";
    const match = url.match(/\/([^\/?#]+\.pdf)(?:[?#]|$)/i);
    if (match) filename = match[1];

    // If ?title is provided (like from your lead_magnets table)
    if (title) {
      filename = `${title.replace(/[^a-z0-9_\-]+/gi, "_")}.pdf`;
    }

    // ✅ Decide inline (preview) vs attachment (download)
    const dispositionType = preview === "1" ? "inline" : "attachment";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Disposition",
      `${dispositionType}; filename="${filename}"`,
    );

    res.send(response.data);
  } catch (err) {
    console.error("❌ Proxy error fetching:", url, err.message);
    res.status(500).send("Failed to fetch PDF");
  }
});

export default router;
