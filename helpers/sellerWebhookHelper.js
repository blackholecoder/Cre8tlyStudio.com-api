// /helpers/sellerWebhookHelper.js
import {
  updateSellerStatus,
  markProductDelivered,
} from "../db/seller/dbSeller.js";
import { deliverDigitalProduct } from "../services/deliveryService.js";
import { getLandingPageById } from "../db/landing/dbLanding.js";
import { sendOutLookMail } from "../utils/sendOutllokMail.js";
import { insertDelivery } from "../db/dbDeliveries.js";

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

  const buyerEmail = session.customer_details?.email;
  const productId = session.metadata?.product_id;
  const sellerAccountId = session.account;

  // 🧩 New: handle landing-page based checkout (PDF sale)
  const landingPageId = session.metadata?.landingPageId;
  const pdfUrl = session.metadata?.pdfUrl;
  const sellerId = session.metadata?.sellerId;
  const leadMagnetId = session.metadata?.leadMagnetId;

  try {
    // 🧠 Case 1: Regular seller product
    if (productId && !landingPageId) {
      if (!buyerEmail) return;
      await deliverDigitalProduct(buyerEmail, productId, sellerAccountId);
      await markProductDelivered(session.id, productId, buyerEmail);
      return;
    }

    // 🧠 Case 2: Paid landing page PDF download
    if (landingPageId && pdfUrl && buyerEmail) {
      const landingPage = await getLandingPageById(landingPageId);
      if (!landingPage) {
        console.warn(`⚠️ Landing page ${landingPageId} not found`);
        return;
      }

      // ✅ Insert delivery record for verified reviews
      await insertDelivery({
        user_id: sellerId, // seller’s user ID
        seller_stripe_id: landingPageId, // we use this as contextual page ref
        product_id: leadMagnetId, // specific eBook (for reviews)
        product_name: landingPage.title || "Digital eBook",
        download_url: pdfUrl,
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
            Thanks for purchasing <strong style="color:#fff;">${
              landingPage.username
            }</strong>’s product!
          </p>
          <div style="text-align:center;margin-top:30px;">
            <a href="${pdfUrl}" target="_blank"
              style="background:linear-gradient(90deg,#7bed9f,#670fe7);color:#000;padding:14px 34px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">
              Download Your PDF
            </a>
          </div>
          <p style="color:#777;font-size:12px;text-align:center;margin-top:30px;">
            © ${new Date().getFullYear()} Cre8tly Studio · Alure Digital
          </p>
        </div>
      `;

      await sendOutLookMail({
        to: buyerEmail,
        subject: `📘 Your download from ${landingPage.username}`,
        html: emailHtml,
      });

      console.log(
        `✅ Purchase email sent to ${buyerEmail} for ${landingPage.username}`
      );
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
