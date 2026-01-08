// /routes/sellerWebhookRoute.js
import express from "express";
import Stripe from "stripe";
import {
  handleAccountUpdated,
  handleCheckoutCompleted,
  handleExternalAccountChange,
  handlePaymentSucceeded,
  handlePayoutPaid,
} from "../../helpers/sellerWebhookHelper.js";

const router = express.Router();
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe requires the raw body for signature verification
router.post("/", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Stripe signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      // 🧾 Account lifecycle
      case "account.updated":
        await handleAccountUpdated(event.data.object);
        break;

      case "account.external_account.created":
      case "account.external_account.updated":
      case "account.external_account.deleted":
        await handleExternalAccountChange(event);
        break;

      // 💳 Payment + Checkout
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;

      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;

      // 💸 Payouts
      case "payout.paid":
        await handlePayoutPaid(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("⚠️ Seller webhook error:", err);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
