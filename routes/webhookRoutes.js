import express from "express";
import Stripe from "stripe";
import { handleCheckoutCompleted } from "../services/leadMagnetService.js";
import {
  upgradeUserToBooks,
  activateBusinessBuilder,
  deactivateBusinessBuilder,
  activateBusinessBasicBuilder,
  deactivateBusinessBasicBuilder,
} from "../db/dbUser.js"; // ✅ make sure these two new helpers are exported there

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/", async (req, res) => {
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
    const eventType = event.type;

    // 🧾 CHECKOUT COMPLETE
    if (eventType === "checkout.session.completed") {
      const session = event.data.object;
      const email = session.metadata?.email;
      const product = session.metadata?.product_type;
      const billingCycle = session.metadata?.billing_cycle;

      if (!email || !product) {
        console.warn("⚠️ Missing metadata on Stripe session");
        return res.sendStatus(400);
      }

      let handledUpgrade = false;

      switch (product) {
        case "author":
          console.log(`📚 Author’s Assistant upgrade for: ${email}`);
          await upgradeUserToBooks(email);
          handledUpgrade = true;
          break;

        case "business_builder_pack":
          console.log(
            `🏗️ Business Builder Pack (${billingCycle}) for: ${email}`
          );
          await activateBusinessBuilder(email, billingCycle);
          handledUpgrade = true;
          break;

        case "business_basic_builder":
          console.log(`🧱 Business Basic Builder (annual) for: ${email}`);
          await activateBusinessBasicBuilder(email);
          handledUpgrade = true;
          break;

        default:
          console.log(`⚙️ Unrecognized product type: ${product}`);
          break;
      }

      // optional expansion
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items"],
      });
      await handleCheckoutCompleted(fullSession);

      if (handledUpgrade)
        console.log(`✅ Finished processing ${product} upgrade for ${email}`);
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
            `❌ Failed to activate after invoice success: ${err.message}`
          );
        }
      }
    }

    // 🚫 SUBSCRIPTION PAYMENT FAILED OR CANCELED
    if (
      eventType === "invoice.payment_failed" ||
      eventType === "customer.subscription.deleted"
    ) {
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
            `🚫 Subscription canceled or payment failed for ${email}`
          );

          if (productType.includes("business_basic_builder")) {
            await deactivateBusinessBasicBuilder(email);
          }
        } catch (err) {
          console.error(
            `❌ Failed to deactivate after payment failure: ${err.message}`
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
