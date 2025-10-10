import express from "express";
import Stripe from "stripe";
import { handleCheckoutCompleted } from "../services/leadMagnetService.js";
import { upgradeUserToProCovers } from "../db/dbUser.js";


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

        // ✅ safer: rely on metadata rather than product name
        if (session.metadata?.product_type === "pro_covers") {
          console.log("✨ Detected Pro Covers upgrade for:", session.metadata.email);
          await upgradeUserToProCovers(session.metadata.email);
        } else {
          // optional: fetch expanded line items if needed by your existing handler
          const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ["line_items"],
          });
          await handleCheckoutCompleted(fullSession);
        }
      }

      res.sendStatus(200);
    } catch (err) {
      console.error("❌ Webhook processing failed:", err.message);
      res.sendStatus(500);
    }
  }
);




export default router;
