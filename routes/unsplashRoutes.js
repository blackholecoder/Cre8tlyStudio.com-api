import express from "express";

const router = express.Router();

router.get("/search", async (req, res) => {
  const { query, page = 1 } = req.query;
  if (!query) {
    return res.status(400).json({ error: "Query required" });
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        query
      )}&per_page=12&page=${page}`,
      {
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    // 🔐 IMPORTANT: handle non-JSON responses
    if (!response.ok) {
      const text = await response.text();
      console.error("Unsplash API error:", response.status, text);

      return res.status(response.status).json({
        error: "Unsplash rate limit reached",
        message: text,
      });
    }

    const data = await response.json();

    res.json(data.results || []);
  } catch (err) {
    console.error("Unsplash fetch failed:", err.message);

    res.status(500).json({
      error: "Failed to fetch Unsplash images",
    });
  }
});

export default router;
