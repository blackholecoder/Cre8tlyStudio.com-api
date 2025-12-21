// /helpers/sellerWebhookHelper.js
import {
  updateSellerStatus,
  markProductDelivered,
} from "../db/seller/dbSeller.js";
import { deliverDigitalProduct } from "../services/deliveryService.js";
import { getLandingPageById } from "../db/landing/dbLanding.js";
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
  const sellerAccountId = session.account;
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

      // Send email to buyer
      const emailHtml = `
  <div style="font-family: Helvetica, sans-serif; background-color: #0d0d0d; padding: 40px 30px; border-radius: 12px; border: 1px solid #1f1f1f; max-width: 600px; margin: 0 auto;">
    
    <!-- HEADER -->
    <div style="text-align:center;margin-bottom:25px;">
      <img src="https://cre8tlystudio.com/cre8tly-logo-white.png" style="width:120px;margin-bottom:15px;"/>
      <h1 style="color:#7bed9f;font-size:26px;margin:0;">Your Audio is Ready</h1>
    </div>

    <!-- COVER IMAGE (Only if exists) -->
    ${
      session.metadata?.cover_url
        ? `
        <div style="text-align:center;margin-bottom:25px;">
          <img 
            src="${session.metadata.cover_url}" 
            style="width:150px;height:150px;object-fit:cover;border-radius:12px;border:1px solid #222;margin-bottom:10px;"
          />
        </div>
        `
        : ""
    }

    <p style="color:#e5e5e5;text-align:center;">
      Thanks for your purchase!
    </p>

    <!-- BUTTON -->
    <div style="text-align:center;margin-top:30px;">
      <a href="${process.env.FRONTEND_URL}/thank-you?session_id=${session.id}"
         style="background:linear-gradient(90deg,#7bed9f,#670fe7);color:#fff;
                padding:14px 34px;border-radius:8px;text-decoration:none;
                font-weight:700;display:inline-block;">
        Access Your Audio Files
      </a>
    </div>

    <!-- FOOTER -->
    <p style="color:#777;font-size:12px;text-align:center;margin-top:30px;">
      © ${new Date().getFullYear()} Cre8tly Studio · Alure Digital
    </p>
  </div>
`;

      await sendOutLookMail({
        to: buyerEmail,
        subject: `🎵 Your Audio Purchase is Ready`,
        html: emailHtml,
      });

      console.log(`🎵 Audio download email sent to ${buyerEmail}`);

      return;
    }

    // 🧠 Case 1: Regular seller product
    if (productId && !landingPageId) {
      if (!buyerEmail) return;
      await deliverDigitalProduct(buyerEmail, productId, sellerAccountId);
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

      const emailHtml = `
    <div style="font-family: Helvetica, sans-serif; background-color: #0d0d0d; padding: 40px 30px; border-radius: 12px; border: 1px solid #1f1f1f; max-width: 600px; margin: 0 auto;">
      <div style="text-align:center;margin-bottom:25px;">
        <img src="https://cre8tlystudio.com/cre8tly-logo-white.png" style="width:120px;margin-bottom:15px;"/>
        <h1 style="color:#7bed9f;font-size:26px;margin:0;">Your Purchase is Ready</h1>
      </div>
      <p style="color:#e5e5e5;text-align:center;">
  Thanks for your purchase!
</p>
      <div style="text-align:center;margin-top:30px;">
        <a href="${downloadUrl}" target="_blank"
          style="background:linear-gradient(90deg,#7bed9f,#670fe7);color:#fff;padding:14px 34px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">
          Download Your Product
        </a>
      </div>
      <p style="color:#777;font-size:12px;text-align:center;margin-top:30px;">
        © ${new Date().getFullYear()} Cre8tly Studio · Alure Digital
      </p>
    </div>
  `;

      await sendOutLookMail({
        to: buyerEmail,
        subject: `📦 Your download is ready`,
        html: emailHtml,
      });

      console.log(`✅ Block-based purchase delivered to ${buyerEmail}`);
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
