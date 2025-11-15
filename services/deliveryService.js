// /services/deliveryService.js
import connect from "../db/connect.js";
import { v4 as uuidv4 } from "uuid";
import { sendOutLookMail } from "../utils/sendOutllokMail.js";


/**
 * deliverDigitalProduct
 * Handles paid product delivery after Stripe checkout completes.
 * Logs to deliveries table and sends buyer an Outlook email.
 */
export async function deliverDigitalProduct(buyerEmail, productId, sellerStripeId, sessionId = null) {
  const db = await connect();

  try {
    // 1️⃣ Find buyer in users table
    const [user] = await db.query("SELECT id, name FROM users WHERE email = ? LIMIT 1", [buyerEmail]);
    if (!user?.length) {
      console.warn("⚠️ Buyer not found in users table:", buyerEmail);
      return;
    }
    const userId = user[0].id;
    const userName = user[0].name || "Customer";

    // 2️⃣ Fetch product info
    const [product] = await db.query(
      "SELECT name, download_url FROM products WHERE id = ? LIMIT 1",
      [productId]
    );
    if (!product?.length) {
      console.warn("⚠️ Product not found:", productId);
      return;
    }

    const { name, download_url } = product[0];

    // 3️⃣ Log the delivery (matches your schema style)
    const deliveryId = uuidv4();
    await db.query(
      `INSERT INTO deliveries 
        (id, user_id, seller_stripe_id, product_id, product_name, download_url, buyer_email, stripe_session_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [deliveryId, userId, sellerStripeId, productId, name, download_url, buyerEmail, sessionId]
    );

    // 4️⃣ Email buyer via Outlook
    const html = `
      <div style="font-family:Arial,sans-serif;padding:20px;background:#0d0d0d;color:#f2f2f2;">
        <div style="text-align:center;">
          <img src="https://cre8tlystudio.com/cre8tly-logo-white.png" alt="Cre8tly Studio" width="120" />
          <h2 style="color:#7bed9f;">Your Download Awaits</h2>
        </div>
        <p style="font-size:15px;line-height:1.6;">
          Hi ${userName},<br/>
          Thank you for your purchase on <strong>Cre8tly Studio</strong>!
        </p>
        <p style="font-size:15px;line-height:1.6;">
          You can download your product <strong>${name}</strong> below:
        </p>
        <div style="text-align:center;margin-top:20px;">
          <a href="${download_url}" target="_blank"
            style="background:linear-gradient(90deg,#7bed9f,#670fe7);color:#000;padding:14px 34px;border-radius:8px;text-decoration:none;font-weight:700;">
            Download Now
          </a>
        </div>
        <p style="margin-top:25px;font-size:13px;color:#999;text-align:center;">
          If you have any issues, contact 
          <a href="mailto:support@cre8tlystudio.com" style="color:#7bed9f;">support@cre8tlystudio.com</a>.
        </p>
      </div>
    `;

    await sendOutLookMail({
      to: buyerEmail,
      subject: `Your Cre8tly Studio Purchase: ${name}`,
      html,
    });

    console.log(`📦 Delivered "${name}" to ${buyerEmail}`);
  } catch (err) {
    console.error("❌ deliverDigitalProduct error:", err);
  }
}
