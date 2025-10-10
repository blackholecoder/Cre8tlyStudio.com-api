import Stripe from "stripe";
import connect from "../db/connect.js"; // ✅ only if you need user email from DB

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Load these from your environment (.env)
const FRONTEND_URL = process.env.FRONTEND_URL || "https://cre8tlystudio.com";
const BASIC_PRICE_ID = process.env.STRIPE_PRICE_BASIC;
const PRO_COVERS_PRICE_ID = process.env.STRIPE_PRICE_PRO_COVERS;

export async function createCheckout({ userId, priceId, productType }) {
  // ✅ optional: fetch user email if you want receipts or metadata
  const db = await connect();
  const [rows] = await db.query("SELECT email FROM users WHERE id = ?", [userId]);
  await db.end();

  if (!rows.length) throw new Error("User not found");
  const email = rows[0].email;

  // ✅ Choose the correct price depending on the product type
  const finalPriceId =
    productType === "pro_covers"
      ? PRO_COVERS_PRICE_ID
      : priceId || BASIC_PRICE_ID;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: finalPriceId, quantity: 1 }],
    success_url: `${FRONTEND_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/dashboard?checkout=cancel`,
    customer_email: email, // ✅ send email to Stripe for receipts
    metadata: {
      user_id: userId,
      product_type: productType || "basic",
      email,
    },
  });

  return session.url;
}
