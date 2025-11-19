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
  const db = connect();

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
  <div style="background:#0b0b0b;padding:40px 0;font-family:Arial,sans-serif;">
    <table align="center" width="600" cellpadding="0" cellspacing="0"
      style="background:#111;border-radius:14px;color:#f2f2f2;
      box-shadow:0 0 25px rgba(0,0,0,0.6);padding:0;">

      <!-- Header -->
      <tr>
        <td align="center" style="padding:40px 40px 10px 40px;">
          <img src="https://cre8tlystudio.com/cre8tly-logo-white.png" width="95" style="opacity:0.95;" />
          <h2 style="color:#7bed9f;font-size:26px;margin:20px 0 5px 0;">
            Your Download Awaits
          </h2>
          <p style="font-size:14px;color:#ccc;margin:0;">
            Your digital product is ready
          </p>
        </td>
      </tr>

      <!-- Divider -->
      <tr>
        <td style="padding:0 60px;">
          <div style="height:1px;background:#222;margin:25px 0;"></div>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:0 50px 10px 50px;font-size:15px;line-height:1.7;text-align:center;">
          Hi ${userName}, thank you for your purchase on <strong>Cre8tly Studio</strong>.
        </td>
      </tr>

      <tr>
        <td style="padding:0 50px 25px 50px;font-size:15px;line-height:1.7;text-align:center;">
          Your digital product <strong>${name}</strong> is ready for download.
        </td>
      </tr>

      <!-- CTA Button -->
      <tr>
        <td align="center" style="padding:10px 0 40px 0;">
          <a href="${download_url}" target="_blank"
            style="
              background:#7bed9f;
              color:#000;
              padding:14px 40px;
              border-radius:8px;
              text-decoration:none;
              font-weight:700;
              font-size:16px;
              display:inline-block;">
            Download Now
          </a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td align="center" style="font-size:13px;color:#777;padding:0 0 35px 0;">
          If you have any issues, contact
          <a href="mailto:support@aluredigital.com" style="color:#7bed9f;text-decoration:none;">
            support@aluredigital.com
          </a>
        </td>
      </tr>

    </table>
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
