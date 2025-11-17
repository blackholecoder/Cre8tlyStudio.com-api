import Stripe from "stripe";
import connect from "../connect.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Update seller account flags
export async function updateSellerStatus(stripeAccountId, fields) {
  const db = connect();
  await db.query(
    "UPDATE users SET charges_enabled = ?, payouts_enabled = ? WHERE stripe_connect_account_id = ?",
    [fields.charges_enabled, fields.payouts_enabled, stripeAccountId]
  );
}

// Mark a product as delivered
export async function markProductDelivered(sessionId, productId, buyerEmail) {
  const db = connect();
  await db.query(
    "INSERT INTO seller_purchases (session_id, product_id, buyer_email) VALUES (?, ?, ?)",
    [sessionId, productId, buyerEmail]
  );
}


export async function getSellerStripeAccountId(userId) {
  try {
    const db = connect();
    const [rows] = await db.query(
      "SELECT stripe_connect_account_id FROM users WHERE id = ?",
      [userId]
    );
    return rows?.[0]?.stripe_connect_account_id || null;
  } catch (err) {
    console.error("❌ Error fetching seller Stripe account ID:", err);
    throw new Error("Database error while fetching Stripe account ID");
  }
}

// 💾 Save a new Stripe account ID to the user record
export async function saveSellerStripeAccountId(userId, accountId) {
  try {
    const db = connect();
    await db.query(
      "UPDATE users SET stripe_connect_account_id = ? WHERE id = ?",
      [accountId, userId]
    );
    return true;
  } catch (err) {
    console.error("❌ Error saving seller Stripe account ID:", err);
    throw new Error("Database error while saving Stripe account ID");
  }
}


// SELLER PAYOUT AND BALANCE INFO

export async function getSellerBalance(accountId) {
  try {
    const balance = await stripe.balance.retrieve({ stripeAccount: accountId });
    return {
      available: balance.available[0]?.amount || 0,
      pending: balance.pending[0]?.amount || 0,
      currency: balance.available[0]?.currency || "usd",
    };
  } catch (err) {
    console.error("❌ Stripe balance error:", err);
    throw err;
  }
}

// 💸 Get payouts list
export async function getSellerPayouts(accountId) {
  try {
    const payouts = await stripe.payouts.list(
      { limit: 10 },
      { stripeAccount: accountId }
    );
    return payouts.data;
  } catch (err) {
    console.error("❌ Stripe payouts error:", err);
    throw err;
  }
}

export async function createSellerDashboardLink(accountId) {
  try {
    const link = await stripe.accounts.createLoginLink(accountId);
    return link;
  } catch (err) {
    console.error("❌ Stripe createLoginLink error:", err);
    throw err;
  }
}
