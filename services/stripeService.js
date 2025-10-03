import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createCheckout({ userId, priceId }) {
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: "https://cre8tlystudio.com/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://cre8tlystudio.com/dashboard?checkout=cancel",
    metadata: { userId },
  });

  return session.url; 
}
