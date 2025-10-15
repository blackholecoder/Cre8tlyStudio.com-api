import express from "express";
import Stripe from "stripe";
import { handleCheckoutCompleted } from "../services/leadMagnetService.js";
import { upgradeUserToBooks, upgradeUserToBundle, upgradeUserToMagnets, upgradeUserToProCovers } from "../db/dbUser.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return res.sendStatus(400);
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const email = session.metadata?.email;
        const product = session.metadata?.product_type;

        if (!email || !product) {
          console.warn("⚠️ Missing metadata on Stripe session");
          return res.sendStatus(400);
        }

        // ✅ Always run handleCheckoutCompleted afterward for logging / analytics
        let handledUpgrade = false;

        switch (product) {
          case "pro_covers":
            console.log(`✨ Detected Pro Covers upgrade for: ${email}`);
            await upgradeUserToProCovers(email);
            handledUpgrade = true;
            break;

          case "books":
            console.log(`📚 Detected Book Dashboard upgrade for: ${email}`);
            await upgradeUserToBooks(email); // also grants pro_covers
            handledUpgrade = true;
            break;

          case "lead_magnets":
            console.log(`🎯 Detected Lead Magnet Plan for: ${email}`);
            await upgradeUserToMagnets(email);
            handledUpgrade = true;
            break;

          case "bundle":
            console.log(`🎁 Detected All-In-One Bundle purchase for: ${email}`);
            await upgradeUserToBundle(email);
            handledUpgrade = true;
            break;

          default:
            console.log(`⚙️ Unrecognized product type: ${product}`);
            break;
        }

        // ✅ Run your general checkout handler for ALL sessions (including upgrades)
        const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items"],
        });
        await handleCheckoutCompleted(fullSession);

        if (handledUpgrade)
          console.log(`✅ Finished processing ${product} upgrade for ${email}`);
      }

      res.sendStatus(200);
    } catch (err) {
      console.error("❌ Webhook processing failed:", err.message);
      res.sendStatus(500);
    }
  }
);


export default router;
