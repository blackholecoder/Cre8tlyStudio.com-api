// /services/deliveryService.js
import connect from "../db/connect.js";
import { v4 as uuidv4 } from "uuid";
import { sendOutLookMail } from "../utils/sendOutllokMail.js";

/**
 * deliverDigitalProduct
 * Handles paid product delivery after Stripe checkout completes.
 * Logs to deliveries table and sends buyer an Outlook email.
 */
export async function deliverDigitalProduct(
  buyerEmail,
  productId,
  sellerStripeId,
  sessionId = null,
) {
  const db = connect();

  try {
    // 1️⃣ Find buyer in users table
    const [user] = await db.query(
      "SELECT id, name FROM users WHERE email = ? LIMIT 1",
      [buyerEmail],
    );
    if (!user?.length) {
      console.warn("⚠️ Buyer not found in users table:", buyerEmail);
      return;
    }
    const userId = user[0].id;
    const userName = user[0].name || "Customer";

    // 2️⃣ Fetch product info
    const [product] = await db.query(
      "SELECT name, download_url FROM products WHERE id = ? LIMIT 1",
      [productId],
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
      [
        deliveryId,
        userId,
        sellerStripeId,
        productId,
        name,
        download_url,
        buyerEmail,
        sessionId,
      ],
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
          <img src="https://themessyattic.com/themessyattic-logo.png" width="95" style="opacity:0.95;" />
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
          Hi ${userName}, thank you for your purchase on <strong>The Messy Attic</strong>.
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
      subject: `Your The Messy Attic Purchase: ${name}`,
      html,
    });

    console.log(`📦 Delivered "${name}" to ${buyerEmail}`);

    // 5️⃣ Fetch seller info
    try {
      const [seller] = await db.query(
        "SELECT email, name FROM users WHERE stripe_connect_account_id = ? LIMIT 1",
        [sellerStripeId],
      );

      console.log("🧾 Seller lookup result:", seller);

      const sellerEmail = seller?.[0]?.email;
      const sellerName = seller?.[0]?.name || "Seller";

      console.log("📧 Seller resolved:", {
        sellerEmail,
        sellerName,
      });

      if (!sellerEmail) {
        console.warn(
          "⚠️ Seller email not found for stripe account:",
          sellerStripeId,
        );
      } else {
        const sellerHtml = `
<div style="min-height:100%;background:#ffffff;padding:60px 20px;font-family:Arial,sans-serif;">
  <div style="
    max-width:420px;
    margin:0 auto;
    background:#ffffff;
    padding:32px;
    border-radius:16px;
    border:1px solid #e5e7eb;
    box-shadow:0 20px 40px rgba(0,0,0,0.08);
  ">

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
      <img
        src="https://themessyattic.com/themessyattic-logo.png"
        width="40"
        height="40"
        style="display:block;"
        alt="The Messy Attic"
      />
      <div style="font-size:18px;font-weight:600;color:#111827;">
        The Messy Attic
      </div>
    </div>

    <!-- Title -->
    <h2 style="
      font-size:28px;
      font-weight:700;
      color:#111827;
      margin:0 0 8px 0;
    ">
      You made a sale
    </h2>

    <p style="
      font-size:14px;
      color:#4b5563;
      margin:0 0 24px 0;
    ">
      <strong>${sellerName}</strong> a new purchase was just completed.
    </p>

    <!-- Content -->
    <p style="font-size:15px;color:#111827;line-height:1.6;margin-bottom:12px;">
      <strong>${name}</strong> has been purchased.
    </p>

    <p style="font-size:15px;color:#111827;line-height:1.6;margin-bottom:20px;">
      Buyer email: <strong>${buyerEmail}</strong>
    </p>

    <!-- Footer -->
    <p style="
      font-size:13px;
      color:#6b7280;
      margin-top:24px;
      text-align:center;
    ">
      This sale was processed through The Messy Attic
    </p>

  </div>
</div>
`;
        console.log("➡️ Attempting to send seller email to:", sellerEmail);
        await sendOutLookMail({
          to: sellerEmail,
          subject: `You made a sale: ${name}`,
          html: sellerHtml,
        });
        console.log("✅ Seller email sendOutLookMail resolved");
        console.log(`💰 Seller notified: ${sellerEmail}`);
      }
    } catch (sellerErr) {
      console.error("⚠️ Seller notification failed:", sellerErr);
    }
  } catch (err) {
    console.error("❌ deliverDigitalProduct error:", err);
  }
}
