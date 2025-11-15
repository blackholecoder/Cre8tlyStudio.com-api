import Stripe from "stripe";
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);




export async function createStripeConnectAccount(email) {
  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: { transfers: { requested: true } },
  });
  return account;
}

// ✅ Generate onboarding link for that account
export async function createStripeOnboardingLink(accountId) {
  return await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.CLIENT_URL}/dashboard/seller/onboard`,
    return_url: `${process.env.CLIENT_URL}/dashboard/seller/complete`,
    type: "account_onboarding",
  });
}

// ✅ Create product and price for seller account
export async function createProductAndPrice(accountId, name, amount) {
  const product = await stripe.products.create(
    { name },
    { stripeAccount: accountId }
  );
  const price = await stripe.prices.create(
    {
      unit_amount: Math.round(amount * 100),
      currency: "usd",
      product: product.id,
    },
    { stripeAccount: accountId }
  );
  return { product, price };
}

// ✅ Create checkout session for buyer (applying fee)
export async function createCheckoutSession({
  sellerStripeId,
  priceId,
  successUrl,
  cancelUrl,
  platformFeePercent = 10,
}) {
  return await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_types: ["card"],
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_intent_data: {
      application_fee_amount: Math.round(platformFeePercent * 100),
      transfer_data: { destination: sellerStripeId },
    },
  });
}