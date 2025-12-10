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
}) {
  const db = connect();
  try {
    const id = uuidv4();

    await db.query(
      `
      INSERT INTO deliveries
        (id, user_id, seller_stripe_id, product_id, product_name,
         download_url, buyer_email, stripe_session_id, delivered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
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
      ]
    );

    console.log(`📦 Delivery saved: ${buyer_email} → ${product_name}`);
    return { success: true, id };
  } catch (err) {
    console.error("❌ insertDelivery error:", err);
    throw err;
  }
}
