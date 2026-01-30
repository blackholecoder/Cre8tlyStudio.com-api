import Stripe from "stripe";
import connect from "../db/connect.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Load from environment
const FRONTEND_URL = process.env.FRONTEND_URL || "https://themessyattic.com";
const BOOKS_PRICE_ID = process.env.STRIPE_PRICE_AUTHORS_SUBSCRIPTION;
const BUSINESS_BUILDER_MONTHLY =
  process.env.STRIPE_BUSINESS_BUILDER_PACK_MONTHLY;
const BUSINESS_BUILDER_ANNUAL = process.env.STRIPE_BUSINESS_BUILDER_PACK_ANNUAL;
const STRIPE_BUSINESS_BASIC_BUILDER_ANNUAL =
  process.env.STRIPE_BUSINESS_BASIC_BUILDER_ANNUAL;

export async function createCheckout({
  userId,
  productType,
  billingCycle = "annual",
  priceId,
}) {
  const db = connect();

  try {
    // ✅ Fetch user email + stripe customer
    const [[user]] = await db.query(
      `
      SELECT email, stripe_customer_id
      FROM users
      WHERE id = ?
      `,
      [userId],
    );

    if (!user) throw new Error("User not found");

    let stripeCustomerId = user.stripe_customer_id;

    // ✅ Ensure Stripe customer exists
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });

      stripeCustomerId = customer.id;
      await updateUserStripeCustomerId(userId, stripeCustomerId);
    }

    // ✅ Determine Stripe price & checkout mode
    let finalPriceId = priceId;
    let mode = "payment";

    if (!finalPriceId) {
      switch (productType) {
        case "author":
          mode = "subscription";
          finalPriceId = BOOKS_PRICE_ID;
          break;

        case "business_builder_pack":
          mode = "subscription";
          finalPriceId =
            billingCycle === "monthly"
              ? BUSINESS_BUILDER_MONTHLY
              : BUSINESS_BUILDER_ANNUAL;
          break;

        case "business_basic_builder":
          mode = "subscription";
          finalPriceId = STRIPE_BUSINESS_BASIC_BUILDER_ANNUAL;
          break;

        default:
          throw new Error(`Unknown productType: ${productType}`);
      }
    }

    console.log("🧾 Creating checkout for:", {
      userId,
      productType,
      billingCycle,
      finalPriceId,
      mode,
    });

    // ✅ Create checkout session (IMPORTANT CHANGE HERE)
    const session = await stripe.checkout.sessions.create({
      mode,
      customer: stripeCustomerId, // ⬅️ NOT customer_email
      payment_method_types: ["card"],
      line_items: [{ price: finalPriceId, quantity: 1 }],
      success_url: `${FRONTEND_URL}/dashboard?subscribed=1`,
      cancel_url: `${FRONTEND_URL}/dashboard?checkout=cancel`,
      metadata: {
        user_id: userId,
        product_type: productType,
        billing_cycle: billingCycle,
      },
    });

    return session.url;
  } catch (err) {
    console.error("❌ createCheckout error:", err);
    throw err;
  }
}
