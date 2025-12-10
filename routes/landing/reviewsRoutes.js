import express from "express";
import {
  verifyBuyer,
  insertReview,
  getReviewsByLandingPage,
} from "../../db/landing/dbReviews.js";

const router = express.Router();

/**
 * ✅ Verify purchase
 */
router.post("/verify-purchase", async (req, res) => {
  try {
    const { email, productId } = req.body;
    if (!email || !productId) {
      return res
        .status(400)
        .json({ verified: false, message: "Missing fields" });
    }

    const verified = await verifyBuyer(email, productId);
    res.json({ verified });
  } catch (err) {
    console.error("❌ /verify-purchase error:", err);
    res.status(500).json({ verified: false, message: "Server error" });
  }
});

/**
 * ✅ Submit review
 */
router.post("/submit", async (req, res) => {
  try {
    const { username, email, rating, review_text, productId, landingPageId } =
      req.body;

    if (!username || !email || !rating || !review_text || !productId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const verified = await verifyBuyer(email, productId);
    if (!verified) {
      return res
        .status(403)
        .json({ success: false, message: "Purchase not verified" });
    }

    await insertReview({
      product_id: productId,
      landing_page_id: landingPageId,
      username,
      buyer_email: email,
      rating,
      review_text,
    });

    console.log("🧩 Review Insert Debug:", {
      landingPageId,
      productId,
      username,
      email,
    });

    res.json({ success: true, message: "Review submitted successfully" });
  } catch (err) {
    console.error("❌ /submit error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * ✅ Get reviews by landing page
 */
router.get("/:landingPageId", async (req, res) => {
  try {
    const { landingPageId } = req.params;
    if (!landingPageId) {
      return res.status(400).json({ reviews: [], message: "Missing ID" });
    }

    const reviews = await getReviewsByLandingPage(landingPageId);
    res.json({ reviews });
  } catch (err) {
    console.error("❌ /:landingPageId error:", err);
    res.status(500).json({ reviews: [] });
  }
});

export default router;
