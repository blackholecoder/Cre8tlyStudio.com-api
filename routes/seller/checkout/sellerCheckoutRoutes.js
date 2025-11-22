import express from "express";
import Stripe from "stripe";
import { getLandingPageById } from "../../../db/landing/dbLanding.js";
import { getLeadMagnetByPdfUrl } from "../../../db/dbLeadMagnet.js";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🎯 Create a checkout session for a connected account

router.post("/create-checkout-session", async (req, res) => {
  try {
    const { landingPageId, pdfUrl, sellerId, price_in_cents } = req.body;

    // Get landing page info
    const landingPage = await getLandingPageById(landingPageId);
    if (!landingPage || !landingPage.stripe_connect_account_id) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid landing page data" });
    }

    const accountId = landingPage.stripe_connect_account_id;

    // ✅ Determine which PDF version to use (edited or original)
    const finalPdfUrl = pdfUrl || landingPage.pdf_url;
    if (!finalPdfUrl) {
      return res
        .status(400)
        .json({ success: false, message: "No PDF linked to landing page" });
    }

    // ✅ Fetch matching lead magnet for visuals and price
    const leadMagnet = await getLeadMagnetByPdfUrl(finalPdfUrl);

    // ✅ Determine price (priority: frontend > lead magnet > landing page)
    const price =
      price_in_cents ||
      (leadMagnet?.price ? Math.round(leadMagnet.price * 100) : landingPage.price_in_cents);

    if (!price) {
      return res.status(400).json({
        success: false,
        message: "Missing price information for this product",
      });
    }

    // ✅ Use title and cover image from lead magnet (fallback to landing page)
    const productTitle = leadMagnet?.title || landingPage.title || "Digital Download";
    const productImage = leadMagnet?.cover_image
      ? [leadMagnet.cover_image]
      : [landingPage.cover_image_url || "https://cre8tlystudio.com/default-cover.png"];

    // ✅ Create Checkout Session with platform fee (10 %)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productTitle,
              images: productImage,
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: Math.round(price * 0.2),
        transfer_data: {
          destination: accountId, // ✅ seller’s account
        },
      },
      metadata: {
        landingPageId: landingPage.id,
        pdfUrl: finalPdfUrl,
        sellerId: sellerId || landingPage.user_id,
        leadMagnetId: leadMagnet?.id || null,
         productTitle: productTitle 
      },
      success_url: `${process.env.FRONTEND_URL}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/`,
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.error("❌ Stripe checkout error:", err.message);
    if (err.raw) console.error("⚙️ Stripe raw:", err.raw);
    return res.status(500).json({
      success: false,
      message: err.message,
      stripe_error: err.raw?.message || null,
    });
  }
});


router.get("/downloads/:sessionId/file", async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing session ID" });
    }

    // 🧾 Retrieve session info from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (!session || session.payment_status !== "paid") {
      return res
        .status(403)
        .json({ success: false, message: "Payment not completed" });
    }

    const { landingPageId, pdfUrl } = session.metadata || {};
    if (!landingPageId || !pdfUrl) {
      return res
        .status(404)
        .json({ success: false, message: "No linked download found" });
    }

    // 🧠 Try to get the magnet title from DB
    const magnet = await getLeadMagnetByPdfUrl(pdfUrl);
    const magnetTitle = magnet?.title || "Cre8tly_Download";

    // ✅ Build proxy URL including the title
    const proxyUrl = `${
      process.env.SITE_URL
    }/api/pdf/proxy?url=${encodeURIComponent(
      pdfUrl.startsWith("http") ? pdfUrl : `https://${pdfUrl}`
    )}&title=${encodeURIComponent(magnetTitle)}`;

    res.redirect(proxyUrl);
  } catch (err) {
    console.error("❌ Error retrieving download:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch download" });
  }
});

export default router;
