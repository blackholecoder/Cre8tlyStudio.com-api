import express from "express";
import Stripe from "stripe";
import { getLandingPageById } from "../../../db/landing/dbLanding.js";
import { getLeadMagnetByPdfUrl } from "../../../db/dbLeadMagnet.js";
import { getDeliveryBySessionId } from "../../../db/dbDeliveries.js";
import {
  getUserById,
  updateUserStripeAuthorProductId,
} from "../../../db/dbUser.js";
import { updateUserStripeCustomerId } from "../../../helpers/sellerWebhookHelper.js";
import { authenticateToken } from "../../../middleware/authMiddleware.js";
import connect from "../../../db/connect.js";
import { getAuthorSubscriptionPricing } from "../../../db/community/authors/dbAuthors.js";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🎯 Create a checkout session for a connected account

export async function getTipTarget({ targetType, targetId }) {
  try {
    const db = connect();

    if (targetType === "post") {
      const [[row]] = await db.query(
        `
        SELECT id, user_id AS owner_user_id, slug
        FROM community_posts
        WHERE id = ?
        LIMIT 1
        `,
        [targetId],
      );
      return row || null;
    }

    if (targetType === "fragment") {
      const [[row]] = await db.query(
        `
        SELECT id, user_id AS owner_user_id
        FROM fragments
        WHERE id = ?
        LIMIT 1
        `,
        [targetId],
      );
      return row || null;
    }

    if (targetType === "comment") {
      const [[row]] = await db.query(
        `
        SELECT id, user_id AS owner_user_id
        FROM community_comments
        WHERE id = ?
        LIMIT 1
        `,
        [targetId],
      );
      return row || null;
    }

    return null;
  } catch (err) {
    console.error("❌ getTipTarget error:", err);
    return null;
  }
}

router.post("/create-checkout-session", async (req, res) => {
  try {
    const {
      checkoutType = "product",
      landingPageId,
      blockId,
      productSource,
      sellerId,
      price_in_cents,
    } = req.body;

    // 🔹 TIP CHECKOUT (early exit)
    if (checkoutType === "tip") {
      const { targetType = "post", targetId, tipAmountInCents } = req.body;

      if (!targetId || !tipAmountInCents) {
        return res.status(400).json({
          success: false,
          message: "Missing tip target or amount",
        });
      }

      const target = await getTipTarget({
        targetType,
        targetId,
      });

      if (!target) {
        return res.status(404).json({
          success: false,
          message: "Tip target not found",
        });
      }

      if (req.user?.id === target.owner_user_id) {
        return res.status(400).json({
          success: false,
          message: "You cannot tip yourself",
        });
      }

      const writer = await getUserById(target.owner_user_id);

      if (!writer?.stripe_connect_account_id) {
        return res.status(400).json({
          success: false,
          message: "Recipient cannot receive tips",
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
                name: "Tip",
                description: "Thanks for the great work",
              },
              unit_amount: tipAmountInCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: Math.round(tipAmountInCents * 0.1),
          transfer_data: {
            destination: writer.stripe_connect_account_id,
          },
        },
        metadata: {
          checkoutType: "tip",
          targetType,
          targetId,
          writerUserId: target.owner_user_id,
          tipperUserId: req.user?.id || null,
        },
        success_url: `${process.env.FRONTEND_URL}/community/fragments?tipped=1`,
        cancel_url: `${process.env.FRONTEND_URL}`,
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
        domain: "seller_checkout",
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

router.post(
  "/create-authors-assistant-subscription",
  authenticateToken,
  async (req, res) => {
    try {
      const user = await getUserById(req.user.id);

      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      let stripeCustomerId = user.stripe_customer_id;

      // 1️⃣ Ensure Stripe customer exists
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
            product: "authors_assistant",
          },
        });

        stripeCustomerId = customer.id;

        await updateUserStripeCustomerId(user.id, stripeCustomerId);
      }

      // 2️⃣ Create SUBSCRIPTION checkout session
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: stripeCustomerId,
        line_items: [
          {
            price: process.env.STRIPE_PRICE_AUTHORS_SUBSCRIPTION,
            quantity: 1,
          },
        ],
        metadata: {
          domain: "platform_subscription",
          subscriptionType: "authors_assistant",
          userId: user.id,
        },
        success_url: `${process.env.FRONTEND_URL}/authors-assistant?subscribed=1`,
        cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      });

      res.json({ success: true, url: session.url });
    } catch (err) {
      console.error("❌ Author’s Assistant checkout error:", err);
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

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

// Author Subscription Checkout

router.post(
  "/create-author-subscription-checkout",
  authenticateToken,
  async (req, res) => {
    try {
      const subscriberUserId = req.user.id;
      const { authorUserId, billingInterval } = req.body;

      const pricing = await getAuthorSubscriptionPricing(authorUserId);

      if (!pricing || pricing.enabled !== true) {
        return res.status(400).json({ success: false });
      }

      if (!authorUserId || !["monthly", "annual"].includes(billingInterval)) {
        return res.status(400).json({ success: false });
      }

      const amountInCents =
        billingInterval === "monthly"
          ? pricing.monthly_price_cents
          : pricing.annual_price_cents;

      if (!amountInCents || amountInCents < 100) {
        return res.status(400).json({ success: false });
      }

      const author = await getUserById(authorUserId);
      const subscriber = await getUserById(subscriberUserId);

      if (!author || !subscriber) {
        return res.status(404).json({ success: false });
      }

      // 1️⃣ Ensure Stripe customer for subscriber
      let customerId = subscriber.stripe_customer_id;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: subscriber.email,
          metadata: { userId: subscriberUserId },
        });

        customerId = customer.id;
        await updateUserStripeCustomerId(subscriberUserId, customerId);
      }

      // 2️⃣ Ensure Stripe product for author (one-time)
      let productId = author.stripe_author_product_id;

      if (!productId) {
        const product = await stripe.products.create({
          name: `${author.name}'s Subscription`,
          metadata: { author_user_id: authorUserId },
        });

        productId = product.id;
        await updateUserStripeAuthorProductId(authorUserId, productId);
      }

      // 3️⃣ Create recurring price dynamically
      const price = await stripe.prices.create({
        unit_amount: amountInCents,
        currency: "usd",
        recurring: {
          interval: billingInterval === "monthly" ? "month" : "year",
        },
        product: productId,
      });

      // 4️⃣ Create checkout session
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        metadata: {
          domain: "author_subscription",
          author_user_id: authorUserId,
          subscriber_user_id: subscriberUserId,
          billing_interval: billingInterval,
          amount_in_cents: amountInCents,
        },
        success_url: `${process.env.FRONTEND_URL}/community?subscribed=1`,
        cancel_url: `${process.env.FRONTEND_URL}/community`,
      });

      res.json({ success: true, url: session.url });
    } catch (err) {
      console.error("❌ Author subscription checkout error", err);
      res.status(500).json({ success: false });
    }
  },
);

export default router;
