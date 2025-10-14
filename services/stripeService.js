import Stripe from "stripe";
import connect from "../db/connect.js"; // ✅ only if you need user email from DB

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Load these from your environment (.env)
const FRONTEND_URL = process.env.FRONTEND_URL || "https://cre8tlystudio.com";
const BASIC_PRICE_ID = process.env.STRIPE_PRICE_BASIC;
const PRO_COVERS_PRICE_ID = process.env.STRIPE_PRICE_PRO_COVERS;
const BOOKS_PRICE_ID = process.env.STRIPE_PRICE_BOOKS;


export async function createCheckout({ userId, priceId, productType }) {
  // ✅ Fetch user email for Stripe receipts
  const db = await connect();
  const [rows] = await db.query("SELECT email FROM users WHERE id = ?", [userId]);
  await db.end();

  if (!rows.length) throw new Error("User not found");
  const email = rows[0].email;

  // ✅ Decide which price to use
  let finalPriceId;

  switch (productType) {
    case "books":
      finalPriceId = BOOKS_PRICE_ID;
      break;
    case "pro_covers":
      finalPriceId = PRO_COVERS_PRICE_ID;
      break;
    case "lead_magnets":
    default:
      finalPriceId = priceId || BASIC_PRICE_ID;
      break;
  }

  // ✅ Create the Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: finalPriceId, quantity: 1 }],
    success_url: `${FRONTEND_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/dashboard?checkout=cancel`,
    customer_email: email,
    metadata: {
      user_id: userId,
      email,
      product_type: productType || "lead_magnets", // drives webhook logic
    },
  });

  return session.url;
}
