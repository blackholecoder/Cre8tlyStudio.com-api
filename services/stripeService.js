import Stripe from "stripe";
import connect from "../db/connect.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Load from environment
const FRONTEND_URL = process.env.FRONTEND_URL || "https://cre8tlystudio.com";
const BASIC_PRICE_ID = process.env.STRIPE_PRICE_BASIC;
const PRO_COVERS_PRICE_ID = process.env.STRIPE_PRICE_PRO_COVERS;
const BOOKS_PRICE_ID = process.env.STRIPE_PRICE_BOOKS;
const ALL_IN_ONE_BUNDLE_PRICE_ID = process.env.STRIPE_CRE8TLY_ALL_IN_ONE_BUNDLE;
const PROMPT_MEMORY_PRICE_ID = process.env.STRIPE_PROMPT_MEMORY_SUBSCRIPTION;

export async function createCheckout({ userId, priceId, productType }) {
  // ✅ Fetch user email
  const db = await connect();
  const [rows] = await db.query("SELECT email FROM users WHERE id = ?", [userId]);
  await db.end();

  if (!rows.length) throw new Error("User not found");
  const email = rows[0].email;

  // ✅ Choose price ID based on plan
  let finalPriceId;
  let mode = "payment";

  switch (productType) {
    case "author":
      finalPriceId = BOOKS_PRICE_ID;
      break;
    case "bundle":
      finalPriceId = ALL_IN_ONE_BUNDLE_PRICE_ID;
      break;
    case "pro":
      finalPriceId = PRO_COVERS_PRICE_ID;
      break;
    case "prompt_memory":
    finalPriceId = PROMPT_MEMORY_PRICE_ID;
    mode = "subscription";
    break;
    case "lead_magnets":
    case "basic":
    default:
      finalPriceId = priceId || BASIC_PRICE_ID;
      break;
  }

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
      product_type: productType || "basic",
    },
  });

  return session.url;
}
