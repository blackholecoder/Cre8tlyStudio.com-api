import express from "express";
import Stripe from "stripe";
import {
  activateBusinessBuilder,
  deactivateBusinessBuilder,
  activateBusinessBasicBuilder,
  deactivateBusinessBasicBuilder,
  provisionAuthorsAssistantOnce,
} from "../db/dbUser.js"; // ✅ make sure these two new helpers are exported there
import {
  getUserByStripeCustomerId,
  handleSubscriptionUpsert,
} from "../helpers/sellerWebhookHelper.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const BOOKS_PRICE_ID = process.env.STRIPE_PRICE_AUTHORS_SUBSCRIPTION;

router.post("/", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.sendStatus(400);
  }

  try {
    const eventType = event.type;

    // 🧠 AUTHOR’S ASSISTANT SUBSCRIPTION (PROVISION ONCE)
    if (
      eventType === "customer.subscription.created" ||
      eventType === "customer.subscription.updated"
    ) {
      const subscription = event.data.object;

      // ✅ ALWAYS sync subscription state
      await handleSubscriptionUpsert(subscription);

      const priceId = subscription.items?.data?.[0]?.price?.id;

      if (priceId === BOOKS_PRICE_ID) {
        const user = await getUserByStripeCustomerId(subscription.customer);

        if (!user) {
          console.warn("⚠️ No user found for subscription customer");
          return res.sendStatus(200);
        }

        // ✅ Provision once (idempotent)
        await provisionAuthorsAssistantOnce(user.id);
      }

      return res.sendStatus(200);
    }

    // 🧾 CHECKOUT COMPLETE
    if (eventType === "checkout.session.completed") {
      const session = event.data.object;
      const email = session.metadata?.email;
      const product = session.metadata?.product_type;
      const billingCycle = session.metadata?.billing_cycle;

      if (!email || !product) {
        console.warn("⚠️ Missing metadata on Stripe session");
        return res.sendStatus(200);
      }

      let handledUpgrade = false;

      switch (product) {
        case "business_builder_pack":
          await activateBusinessBuilder(email, billingCycle);
          handledUpgrade = true;
          break;

        case "business_basic_builder":
          await activateBusinessBasicBuilder(email);
          handledUpgrade = true;
          break;

        default:
          console.log(`⚙️ Unrecognized product type: ${product}`);
          break;
      }
    }

    // 💳 SUBSCRIPTION PAYMENT SUCCEEDED
    if (eventType === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      const email = invoice.customer_email;
      const productType =
        invoice.lines?.data?.[0]?.price?.product ||
        invoice.metadata?.product_type;

      if (email && productType) {
        try {
          if (productType.includes("business_builder_pack")) {
            await activateBusinessBuilder(email);
            console.log(`✅ Business Builder payment succeeded for ${email}`);
          }

          if (productType.includes("business_basic_builder")) {
            await activateBusinessBasicBuilder(email);
            console.log(`✅ Business Basic payment succeeded for ${email}`);
          }
        } catch (err) {
          console.error(
            `❌ Failed to activate after invoice success: ${err.message}`,
          );
        }
      }
    }

    if (eventType === "customer.subscription.deleted") {
      const subscription = event.data.object;

      // always sync subscription state
      await handleSubscriptionUpsert(subscription);

      return res.sendStatus(200);
    }

    // 🚫 SUBSCRIPTION PAYMENT FAILED OR CANCELED
    if (eventType === "invoice.payment_failed") {
      const data = event.data.object;
      const email = data.customer_email || data.metadata?.email;
      const productType =
        data.lines?.data?.[0]?.price?.product || data.metadata?.product_type;

      if (email && productType) {
        try {
          if (productType.includes("business_builder_pack")) {
            await deactivateBusinessBuilder(email);
          }
          console.log(
            `🚫 Subscription canceled or payment failed for ${email}`,
          );

          if (productType.includes("business_basic_builder")) {
            await deactivateBusinessBasicBuilder(email);
          }
        } catch (err) {
          console.error(
            `❌ Failed to deactivate after payment failure: ${err.message}`,
          );
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook processing failed:", err.message);
    res.sendStatus(500);
  }
});

export default router;
