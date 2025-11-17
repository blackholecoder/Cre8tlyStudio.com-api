import Stripe from "stripe";
import connect from "../db/connect.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Load from environment
const FRONTEND_URL = process.env.FRONTEND_URL || "https://cre8tlystudio.com";
const BOOKS_PRICE_ID = process.env.STRIPE_PRICE_BOOKS;
const BUSINESS_BUILDER_MONTHLY = process.env.STRIPE_BUSINESS_BUILDER_PACK_MONTHLY;
const BUSINESS_BUILDER_ANNUAL = process.env.STRIPE_BUSINESS_BUILDER_PACK_ANNUAL;

export async function createCheckout({
  userId,
  productType,
  billingCycle = "annual",
  priceId, // keep this for flexibility
}) {
  // ✅ Fetch user email
  const db = connect();
  const [rows] = await db.query("SELECT email FROM users WHERE id = ?", [userId]);
  ;

  if (!rows.length) throw new Error("User not found");
  const email = rows[0].email;

  // ✅ Determine Stripe price & checkout mode
  let finalPriceId = priceId; // allow manual override
  let mode = "payment";

  if (!finalPriceId) {
    switch (productType) {
      case "author":
        finalPriceId = BOOKS_PRICE_ID;
        break;

      case "business_builder_pack":
        mode = "subscription";
        finalPriceId =
          billingCycle === "monthly"
            ? BUSINESS_BUILDER_MONTHLY
            : BUSINESS_BUILDER_ANNUAL;
        break;

      default:
        throw new Error(`Unknown productType: ${productType}`);
    }
  }

  console.log("🧾 Creating checkout for:", { productType, billingCycle, email, finalPriceId });

  // ✅ Create checkout session
  const session = await stripe.checkout.sessions.create({
    mode,
    payment_method_types: ["card"],
    line_items: [{ price: finalPriceId, quantity: 1 }],
    success_url: `${FRONTEND_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/dashboard?checkout=cancel`,
    customer_email: email,
    metadata: {
      user_id: userId,
      email,
      product_type: productType,
      billing_cycle: billingCycle,
    },
  });

  return session.url;
}


