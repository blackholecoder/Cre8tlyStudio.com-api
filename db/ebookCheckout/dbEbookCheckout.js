
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createEbookCheckout({ userId, title, description, price, productType }) {

  const cleanDescription = description
      ? description.replace(/<[^>]*>?/gm, "").trim()
      : "Instant download after purchase.";
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: title,
              description: cleanDescription, // strip HTML
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId || "guest",
        productType,
        title,
        price,
      },
      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.FRONTEND_URL}`,
    });

    return session;
  } catch (err) {
    console.error("Stripe session creation error:", err.message);
    throw err;
  }
}

