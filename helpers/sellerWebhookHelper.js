// /helpers/sellerWebhookHelper.js
import connect from "../db/connect.js";
import {
  updateSellerStatus,
  markProductDelivered,
} from "../db/seller/dbSeller.js";
import { deliverDigitalProduct } from "../services/deliveryService.js";
import { sendOutLookMail } from "../utils/sendOutllokMail.js";
import { hasDeliveryBySessionId, insertDelivery } from "../db/dbDeliveries.js";

// 🧠 Fired when a seller completes verification or updates info
export async function handleAccountUpdated(account) {
  const accountId = account.id;
  const chargesEnabled = account.charges_enabled;
  const payoutsEnabled = account.payouts_enabled;

  console.log(`✅ Account updated: ${accountId}`);

  await updateSellerStatus(accountId, {
    charges_enabled: chargesEnabled,
    payouts_enabled: payoutsEnabled,
  });
}

// 🏦 Bank account changes
export async function handleExternalAccountChange(event) {
  console.log(`🔄 External account event: ${event.type}`);
  // Optional: could notify seller or log it
}

export async function insertLandingAnalytics({
  landing_page_id,
  event_type,
  ip_address = null,
  user_agent = null,
}) {
  const db = connect();

  await db.query(
    `
    INSERT INTO landing_analytics
      (landing_page_id, event_type, ip_address, user_agent)
    VALUES
      (?, ?, ?, ?)
    `,
    [landing_page_id, event_type, ip_address, user_agent]
  );
}

// 💰 Buyer successfully purchased a product
export async function handleCheckoutCompleted(session) {
  console.log(`💳 Checkout completed for ${session.id}`);

  const alreadyDelivered = await hasDeliveryBySessionId(session.id);
  if (alreadyDelivered) {
    console.warn("⚠️ Duplicate Stripe webhook ignored", {
      sessionId: session.id,
    });
    return;
  }

  const buyerEmail = session.customer_details?.email;
  const productId = session.metadata?.product_id;
  const sellerAccountId =
    session.metadata?.sellerStripeAccountId || session.account;
  // 🧩 New: handle landing-page based checkout (PDF sale)
  const landingPageId = session.metadata?.landingPageId;
  const blockId = session.metadata?.blockId;
  const productSource = session.metadata?.productSource;
  const sellerId = session.metadata?.sellerId;

  if (landingPageId && !blockId) {
    console.error("❌ Landing checkout missing blockId", {
      sessionId: session.id,
      landingPageId,
      metadata: session.metadata,
    });
    return;
  }

  try {
    // 🎵 AUDIO PURCHASE — SINGLE OR ALBUM
    if (
      session.metadata?.audio_type === "single" ||
      session.metadata?.audio_type === "album"
    ) {
      console.log("🎵 Audio purchase detected:", session.metadata.audio_type);

      if (!buyerEmail) {
        console.warn("⚠️ Missing buyer email for audio purchase");
        return;
      }

      // Array of audio URLs
      const audioFiles = JSON.parse(session.metadata.audio_urls || "[]");

      if (!audioFiles.length) {
        console.warn("⚠️ No audio files found in metadata");
        return;
      }

      // Insert into your deliveries table for thank-you page
      await insertDelivery({
        user_id: session.metadata?.sellerId,
        seller_stripe_id: landingPageId,
        product_id: blockId,
        product_name: session.metadata?.audio_product_name || "Audio Download",
        download_url: JSON.stringify(audioFiles), // store multiple URLs
        cover_url: session.metadata?.cover_url || null,
        buyer_email: buyerEmail,
        stripe_session_id: session.id,
      });

      await insertLandingAnalytics({
        landing_page_id: landingPageId,
        event_type: "download",
        ip_address: null,
        user_agent: "stripe-webhook",
      });

      // Send email to buyer
      const emailHtml = `
  <div style="
    font-family: Helvetica, Arial, sans-serif;
    background-color: #f9fafb;
    padding: 40px 20px;
  ">
    <div style="
      max-width: 520px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 20px 30px rgba(0,0,0,0.06);
    ">

      <!-- HEADER -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
        <img 
          src="https://cre8tlystudio.com/cre8tly-logo.png"
          style="width:48px;height:48px;object-fit:contain;"
        />
        <div style="line-height:1.1;">
          <div style="font-size:18px;font-weight:600;color:#111827;">
            Cre8tly Studio
          </div>
        </div>
      </div>

      <h1 style="
        font-size:26px;
        font-weight:700;
        color:#111827;
        margin-bottom:8px;
      ">
        Your audio is ready
      </h1>

      <p style="
        font-size:14px;
        color:#4b5563;
        margin-bottom:24px;
      ">
        Thanks for your purchase. Your audio files are ready to access.
      </p>

      <!-- COVER IMAGE -->
      ${
        session.metadata?.cover_url
          ? `
          <div style="text-align:center;margin-bottom:24px;">
            <img
              src="${session.metadata.cover_url}"
              style="
                width:160px;
                height:160px;
                object-fit:cover;
                border-radius:12px;
                border:1px solid #e5e7eb;
              "
            />
          </div>
          `
          : ""
      }

      <!-- BUTTON -->
      <a
        href="${process.env.FRONTEND_URL}/thank-you?session_id=${session.id}"
        style="
          display:block;
          width:100%;
          text-align:center;
          background:#111827;
          color:#ffffff;
          padding:14px 0;
          border-radius:10px;
          text-decoration:none;
          font-weight:600;
          font-size:15px;
          margin-top:16px;
        "
      >
        Access your audio files
      </a>

      <!-- FOOTER -->
      <p style="
        margin-top:32px;
        text-align:center;
        font-size:12px;
        color:#9ca3af;
      ">
        © ${new Date().getFullYear()} Cre8tly Studio · Alure Digital
      </p>
    </div>
  </div>
`;

      await sendOutLookMail({
        to: buyerEmail,
        subject: `🎵 Your Audio Purchase is Ready`,
        html: emailHtml,
      });

      console.log(`🎵 Audio download email sent to ${buyerEmail}`);

      await notifySellerOfSale({
        sellerStripeAccountId: sellerAccountId,
        productName: session.metadata?.audio_product_name || "Audio Download",
        buyerEmail,
      });

      return;
    }

    // 🧠 Case 1: Regular seller product
    if (productId && !landingPageId) {
      if (!buyerEmail) return;
      await deliverDigitalProduct(
        buyerEmail,
        productId,
        sellerAccountId,
        session.id
      );

      await notifySellerOfSale({
        sellerStripeAccountId: sellerAccountId,
        productName: "Digital Product",
        buyerEmail,
      });

      await markProductDelivered(session.id, productId, buyerEmail);
      return;
    }

    // 🧠 Case 2: Paid landing page PDF download
    if (landingPageId && blockId && buyerEmail) {
      if (!productSource) {
        console.error("❌ Missing productSource for landing checkout", {
          sessionId: session.id,
          blockId,
          metadata: session.metadata,
        });
        return;
      }

      const downloadUrl = session.metadata?.downloadUrl;
      const productName =
        session.metadata?.productTitle ||
        session.metadata?.productName ||
        "Digital Product";

      if (!downloadUrl) {
        console.error("❌ Missing downloadUrl in Stripe metadata", {
          sessionId: session.id,
          metadata: session.metadata,
        });
        return;
      }

      await insertDelivery({
        user_id: sellerId,
        seller_stripe_id: landingPageId,
        product_id: blockId,
        product_name: productName,
        download_url: downloadUrl,
        buyer_email: buyerEmail,
        stripe_session_id: session.id,
      });

      await insertLandingAnalytics({
        landing_page_id: landingPageId,
        event_type: "download",
        ip_address: null,
        user_agent: "stripe-webhook",
      });

      const emailHtml = `
  <div style="
    font-family: Helvetica, Arial, sans-serif;
    background-color: #f9fafb;
    padding: 40px 20px;
  ">
    <div style="
      max-width: 520px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 20px 30px rgba(0,0,0,0.06);
    ">

      <!-- HEADER -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
        <img
          src="https://cre8tlystudio.com/cre8tly-logo.png"
          style="width:48px;height:48px;object-fit:contain;"
        />
        <div style="font-size:18px;font-weight:600;color:#111827;">
          Cre8tly Studio
        </div>
      </div>

      <h1 style="
        font-size:26px;
        font-weight:700;
        color:#111827;
        margin-bottom:8px;
      ">
        Your purchase is ready
      </h1>

      <p style="
        font-size:14px;
        color:#4b5563;
        margin-bottom:24px;
      ">
        Thanks for your purchase. Your product is ready to download.
      </p>

      <!-- BUTTON -->
      <a
        href="${downloadUrl}"
        target="_blank"
        style="
          display:block;
          width:100%;
          text-align:center;
          background:#111827;
          color:#ffffff;
          padding:14px 0;
          border-radius:10px;
          text-decoration:none;
          font-weight:600;
          font-size:15px;
          margin-top:8px;
        "
      >
        Download your product
      </a>

      <!-- FOOTER -->
      <p style="
        margin-top:32px;
        text-align:center;
        font-size:12px;
        color:#9ca3af;
      ">
        © ${new Date().getFullYear()} Cre8tly Studio · Alure Digital
      </p>
    </div>
  </div>
`;

      await sendOutLookMail({
        to: buyerEmail,
        subject: `📦 Your download is ready`,
        html: emailHtml,
      });

      console.log(`✅ Block-based purchase delivered to ${buyerEmail}`);

      await notifySellerOfSale({
        sellerStripeAccountId: sellerAccountId,
        productName,
        buyerEmail,
      });
      return;
    }

    console.warn("⚠️ Unhandled checkout type — missing metadata.");
  } catch (err) {
    console.error("❌ Error in handleCheckoutCompleted:", err);
  }
}

// 🪙 Payment succeeded (backup signal)
export async function handlePaymentSucceeded(paymentIntent) {
  console.log(`💵 Payment succeeded: ${paymentIntent.id}`);
}

// 💸 Payout sent to seller
export async function handlePayoutPaid(payout) {
  console.log(`💸 Payout sent: ${payout.id} → ${payout.destination}`);
  // Optional: record in your DB
}

export async function notifySellerOfSale({
  sellerStripeAccountId,
  productName,
  buyerEmail,
}) {
  const db = connect();

  try {
    const [seller] = await db.query(
      "SELECT email, name FROM users WHERE stripe_connect_account_id = ? LIMIT 1",
      [sellerStripeAccountId]
    );

    const sellerEmail = seller?.[0]?.email;
    const sellerName = seller?.[0]?.name || "Seller";

    if (!sellerEmail) {
      console.warn(
        "⚠️ Seller email not found for stripe account:",
        sellerStripeAccountId
      );
      return;
    }

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
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
      <img src="https://cre8tlystudio.com/cre8tly-logo-white.png" width="40" />
      <div style="font-size:18px;font-weight:600;color:#111827;">
        Cre8tly Studio
      </div>
    </div>

    <h2 style="font-size:26px;font-weight:700;color:#111827;margin-bottom:8px;">
      You made a sale
    </h2>

    <p style="font-size:14px;color:#4b5563;margin-bottom:20px;">
      A new purchase was just completed.
    </p>

    <p style="font-size:15px;color:#111827;margin-bottom:10px;">
      <strong>${productName}</strong> has been purchased.
    </p>

    <p style="font-size:15px;color:#111827;margin-bottom:20px;">
      Buyer email: <strong>${buyerEmail}</strong>
    </p>

    <p style="font-size:13px;color:#6b7280;text-align:center;">
      This sale was processed through Cre8tly Studio
    </p>
  </div>
</div>
`;

    await sendOutLookMail({
      to: sellerEmail,
      subject: `You made a sale: ${productName}`,
      html: sellerHtml,
    });

    console.log(`💰 Seller notified: ${sellerEmail}`);
  } catch (err) {
    console.error("⚠️ Seller notification failed:", err);
  }
}
