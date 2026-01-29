import express from "express";
import Stripe from "stripe";
import { getLandingPageById } from "../../../db/landing/dbLanding.js";
import { getLeadMagnetByPdfUrl } from "../../../db/dbLeadMagnet.js";
import { getDeliveryBySessionId } from "../../../db/dbDeliveries.js";
import { getUserById } from "../../../db/dbUser.js";
import { getCommunityPostById } from "../../../db/community/dbPosts.js";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🎯 Create a checkout session for a connected account

router.post("/create-checkout-session", async (req, res) => {
  try {
    const {
      checkoutType = "product",
      landingPageId,
      blockId,
      productSource,
      sellerId,
      price_in_cents,
      postId,
      writerUserId,
      tipAmountInCents,
    } = req.body;

    // 🔹 TIP CHECKOUT (early exit)
    if (checkoutType === "tip") {
      if (!postId) {
        return res.status(400).json({
          success: false,
          message: "Missing postId for tip checkout",
        });
      }

      if (!writerUserId || !tipAmountInCents) {
        return res.status(400).json({
          success: false,
          message: "Missing writerUserId or tip amount",
        });
      }

      const writer = await getUserById(writerUserId);

      const post = await getCommunityPostById(postId);

      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      if (req.user?.id === writerUserId) {
        return res.status(400).json({
          success: false,
          message: "You cannot tip yourself",
        });
      }

      if (!writer?.stripe_connect_account_id) {
        return res.status(400).json({
          success: false,
          message: "Writer is not set up to receive tips",
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Tip for writer",
                description: "Thanks for the great writing",
              },
              unit_amount: tipAmountInCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: Math.round(tipAmountInCents * 0.1), // optional
          transfer_data: {
            destination: writer.stripe_connect_account_id,
          },
        },
        metadata: {
          checkoutType: "tip",
          postId,
          postSlug: post.slug,
          writerUserId,
          tipperUserId: req.user?.id || null,
        },
        success_url: `${process.env.FRONTEND_URL}/community/post/${post.slug}?tipped=1`,
        cancel_url: `${process.env.FRONTEND_URL}/community`,
      });

      return res.json({ success: true, url: session.url });
    }

    if (!landingPageId || !blockId || !productSource) {
      return res.status(400).json({
        success: false,
        message: "Missing landingPageId, blockId, or productSource",
      });
    }

    const landingPage = await getLandingPageById(landingPageId);

    if (!landingPage || !landingPage.stripe_connect_account_id) {
      return res.status(400).json({
        success: false,
        message: "Invalid landing page data",
      });
    }

    const accountId = landingPage.stripe_connect_account_id;

    let blocks = [];
    try {
      blocks = Array.isArray(landingPage.content_blocks)
        ? landingPage.content_blocks
        : JSON.parse(landingPage.content_blocks || "[]");
    } catch {
      return res.status(500).json({
        success: false,
        message: "Invalid content_blocks JSON",
      });
    }

    const allBlocks = [];

    for (const block of blocks) {
      allBlocks.push(block);

      if (Array.isArray(block.children)) {
        allBlocks.push(...block.children);
      }
    }

    const checkoutBlock = allBlocks.find((b) => b.id === blockId);

    if (!checkoutBlock) {
      return res.status(404).json({
        success: false,
        message: "Checkout block not found",
      });
    }

    const price =
      price_in_cents ||
      (checkoutBlock.price ? Math.round(checkoutBlock.price * 100) : null);

    if (price === null || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing price information",
      });
    }

    let downloadUrl;

    if (productSource === "internal") {
      downloadUrl = checkoutBlock.pdf_url;
    }

    if (productSource === "external") {
      downloadUrl = checkoutBlock.external_file_url;
    }

    if (!downloadUrl) {
      return res.status(400).json({
        success: false,
        message: "No downloadable file linked to this product",
      });
    }

    const leadMagnet =
      productSource === "internal"
        ? await getLeadMagnetByPdfUrl(downloadUrl)
        : null;

    const productImage = checkoutBlock.product_image_url
      ? [checkoutBlock.product_image_url]
      : checkoutBlock.image_url
        ? [checkoutBlock.image_url]
        : leadMagnet?.cover_image
          ? [leadMagnet.cover_image]
          : [
              landingPage.cover_image_url ||
                "https://themessyattic.com/default-cover.png",
            ];

    // external upload
    let productTitle;

    // INTERNAL = lead magnet title
    if (productSource === "internal") {
      productTitle =
        checkoutBlock.product_name ||
        leadMagnet?.title ||
        landingPage.title ||
        "Digital Download";
    }

    if (productSource === "external") {
      productTitle =
        checkoutBlock.product_name ||
        checkoutBlock.external_file_name ||
        "Digital Download";
    }

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
          destination: accountId,
        },
      },
      metadata: {
        landingPageId: landingPage.id,
        blockId,
        productSource,
        sellerId: sellerId || landingPage.user_id,
        sellerStripeAccountId: accountId,
        downloadUrl, // ✅ REQUIRED
        productTitle,
      },
      success_url: `${process.env.FRONTEND_URL}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/`,
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.error("❌ Stripe checkout error:", err.message);
    if (err.raw) console.error("⚙️ Stripe raw:", err.raw);

    res.status(500).json({
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
      return res.status(400).json({
        success: false,
        message: "Missing session ID",
      });
    }

    // ✅ SOURCE OF TRUTH: deliveries table
    const delivery = await getDeliveryBySessionId(sessionId);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Download not ready yet",
      });
    }

    const pdfUrl = delivery.download_url;
    const title = delivery.product_name || "Cre8tly_Download";

    const proxyUrl = `${
      process.env.SITE_URL
    }/api/pdf/proxy?url=${encodeURIComponent(
      pdfUrl,
    )}&title=${encodeURIComponent(title)}`;

    res.redirect(proxyUrl);
  } catch (err) {
    console.error("❌ Error retrieving download:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch download",
    });
  }
});

// AUDIO CHECKOUT

// 🎵 AUDIO CHECKOUT — SINGLE OR ALBUM
router.post("/create-audio-checkout", async (req, res) => {
  try {
    const {
      landingPageId,
      blockId,
      sellerId,
      audio_type, // "single" or "album"
      audio_urls, // array of URLs
      product_name, // displayed to buyer
      price_in_cents, // total price
      cover_url,
    } = req.body;

    if (!landingPageId || !blockId || !audio_type || !audio_urls?.length) {
      return res.status(400).json({
        success: false,
        message: "Missing required audio checkout data",
      });
    }

    // Fetch landing page info
    const landingPage = await getLandingPageById(landingPageId);
    if (!landingPage || !landingPage.stripe_connect_account_id) {
      return res.status(400).json({
        success: false,
        message: "Invalid landing page or seller account missing",
      });
    }

    const accountId = landingPage.stripe_connect_account_id;

    if (!price_in_cents) {
      return res.status(400).json({
        success: false,
        message: "Missing price for audio checkout",
      });
    }

    // Build Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: product_name?.trim() || "Audio Download",
              images: cover_url ? [cover_url] : [],
            },
            unit_amount: price_in_cents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: Math.round(price_in_cents * 0.2), // 20% fee
        transfer_data: {
          destination: accountId,
        },
      },
      metadata: {
        audio_type, // "single" or "album"
        landingPageId,
        blockId,
        sellerId: sellerId || landingPage.user_id,
        audio_product_name: product_name,
        audio_urls: JSON.stringify(audio_urls),
        cover_url: cover_url || "",
      },
      success_url: `${process.env.FRONTEND_URL}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/`,
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.error("❌ Audio checkout error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/downloads/:sessionId/info", async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Missing session ID",
      });
    }

    // NO SQL HERE — clean
    const delivery = await getDeliveryBySessionId(sessionId);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found",
      });
    }

    res.json({
      success: true,
      product_name: delivery.product_name,
      download_url: delivery.download_url,
      cover_url: delivery.cover_url, // Track or Album Cover
    });
  } catch (err) {
    console.error("❌ Error fetching delivery info:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export default router;
