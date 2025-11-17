import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Checks whether a user's Stripe Connect account is active.
 */
export async function getStripeConnectStatus(accountId) {
  if (!accountId) return { connected: false, details_submitted: false };

  try {
    const acct = await stripe.accounts.retrieve(accountId);
    return {
      connected: acct.charges_enabled === true && acct.payouts_enabled === true,
      details_submitted: acct.details_submitted === true,
      account_type: acct.type,
    };
  } catch (err) {
    console.error("❌ Stripe account check failed:", err.message);
    return { connected: false, details_submitted: false };
  }
}
