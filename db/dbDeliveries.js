import { v4 as uuidv4 } from "uuid";
import connect from "../db/connect.js";

/**
 * Records a successful PDF delivery (used for verified reviews).
 * Called after checkout completion inside handleCheckoutCompleted().
 */
export async function insertDelivery({
  user_id, // Seller (user) ID
  seller_stripe_id, // Landing page ID or Stripe account ref
  product_id, // Lead magnet / eBook ID
  product_name, // eBook title
  download_url, // PDF link
  buyer_email, // Customer’s email
  stripe_session_id, // Stripe session reference
  cover_url = null,
}) {
  const db = connect();
  try {
    const id = uuidv4();

    await db.query(
      `
      INSERT INTO deliveries
        (id, user_id, seller_stripe_id, product_id, product_name,
         download_url, buyer_email, stripe_session_id, cover_url, delivered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        id,
        user_id,
        seller_stripe_id,
        product_id,
        product_name || "Digital Download",
        download_url,
        buyer_email,
        stripe_session_id,
        cover_url,
      ]
    );

    console.log(`📦 Delivery saved: ${buyer_email} → ${product_name}`);
    return { success: true, id };
  } catch (err) {
    console.error("❌ insertDelivery error:", err);
    throw err;
  }
}

export async function getDeliveryBySessionId(sessionId) {
  const db = connect();

  try {
    if (!sessionId) {
      console.warn("⚠️ getDeliveryBySessionId called with no sessionId");
      return null;
    }

    const [rows] = await db.query(
      `
      SELECT 
        product_name,
        download_url,
        cover_url
      FROM deliveries
      WHERE stripe_session_id = ?
      LIMIT 1
      `,
      [sessionId]
    );

    if (!rows.length) {
      console.warn(`⚠️ No delivery found for session: ${sessionId}`);
      return null;
    }

    // Normal return
    return rows[0];
  } catch (err) {
    console.error("❌ Error in getDeliveryBySessionId:", err);
    return null; // Return safe fallback instead of crashing
  }
}
