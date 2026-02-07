// /routes/sellerWebhookRoute.js
import express from "express";
import Stripe from "stripe";
import {
  handleAccountUpdated,
  handleAuthorCheckoutCompleted,
  handleAuthorInvoiceFailed,
  handleAuthorInvoicePaid,
  handleAuthorSubscriptionDeleted,
  handleAuthorSubscriptionUpsert,
  handleCheckoutCompleted,
  handleExternalAccountChange,
  handlePaymentSucceeded,
  handlePayoutPaid,
  handleSubscriptionUpsert,
} from "../../helpers/sellerWebhookHelper.js";
import { handleAuthorSubscriptionUpdated } from "../../db/community/subscriptions/dbSubscribers.js";

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
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("❌ Stripe signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      // ======================
      // 🧾 CONNECTED ACCOUNTS
      // ======================
      case "account.updated":
        await handleAccountUpdated(event.data.object);
        break;

      case "account.external_account.created":
      case "account.external_account.updated":
      case "account.external_account.deleted":
        await handleExternalAccountChange(event);
        break;

      // ======================
      // 💳 CHECKOUT & PAYMENTS
      // ======================
      case "checkout.session.completed": {
        const session = event.data.object;

        // Subscription checkout — metadata lives on the subscription
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription,
          );

          if (subscription.metadata?.domain === "author_subscription") {
            await handleAuthorCheckoutCompleted(session);
          } else {
            console.warn(
              "⚠️ Subscription checkout missing or unknown domain",
              subscription.id,
            );
          }

          break;
        }

        // One-time / tip / seller checkout
        switch (session.metadata?.domain) {
          case "seller_checkout":
            await handleCheckoutCompleted(session);
            break;

          default:
            console.log("Unhandled checkout domain", session.id);
        }

        break;
      }

      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;

      // ======================
      // 💸 PAYOUTS
      // ======================
      case "payout.paid":
        await handlePayoutPaid(event.data.object);
        break;

      // ======================
      // 🔁 SUBSCRIPTIONS (generic)
      // ======================
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;

        if (subscription.metadata?.domain === "author_subscription") {
          // Always keep subscription in sync
          await handleAuthorSubscriptionUpsert(subscription);

          // 🔔 Only runs when user clicks "Cancel at period end"
          if (
            event.type === "customer.subscription.updated" &&
            subscription.cancel_at_period_end === true
          ) {
            await handleAuthorSubscriptionUpdated(subscription);
          }

          break;
        }

        if (subscription.metadata?.domain === "platform_subscription") {
          await handleSubscriptionUpsert(subscription);
          break;
        }

        console.log("Unknown subscription domain", subscription.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;

        if (subscription.metadata?.domain === "author_subscription") {
          await handleAuthorSubscriptionDeleted(subscription);
        }

        break;
      }

      // ======================
      // 🧾 INVOICES (SUBSCRIPTIONS)
      // ======================
      case "invoice.paid": {
        const invoice = event.data.object;

        if (!invoice.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription,
        );

        if (subscription.metadata?.domain === "author_subscription") {
          await handleAuthorInvoicePaid(invoice, subscription);
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;

        if (!invoice.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription,
        );

        if (subscription.metadata?.domain === "author_subscription") {
          await handleAuthorInvoiceFailed(invoice, subscription);
        }

        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("⚠️ Seller webhook error:", err);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
