// /helpers/sellerWebhookHelper.js
import connect from "../db/connect.js";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import {
  updateSellerStatus,
  markProductDelivered,
  insertTip,
} from "../db/seller/dbSeller.js";
import { deliverDigitalProduct } from "../services/deliveryService.js";
import { sendOutLookMail } from "../utils/sendOutlookMail.js";
import { hasDeliveryBySessionId, insertDelivery } from "../db/dbDeliveries.js";
import { getUserById } from "../db/dbUser.js";
import { sendTipReceivedEmail } from "../emails/sendTipReceivedEmail.js";
import { saveNotification } from "../db/community/notifications/notifications.js";
import {
  sendPaidSubscriberEmail,
  sendPaidUnsubscribedEmail,
} from "../db/community/subscriptions/dbSubscribers.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    [landing_page_id, event_type, ip_address, user_agent],
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
    // 💖 TIP CHECKOUT
    if (session.metadata?.checkoutType === "tip") {
      const writerUserId = session.metadata?.writerUserId;
      const postId = session.metadata?.postId;
      const amount = session.amount_total; // Stripe authoritative amount

      if (!writerUserId || !amount) {
        console.warn("⚠️ Tip checkout missing metadata", {
          sessionId: session.id,
          metadata: session.metadata,
        });
        return;
      }

      // 🔒 Idempotency already protected by hasDeliveryBySessionId
      await insertTip({
        stripe_session_id: session.id,
        writer_user_id: writerUserId,
        post_id: postId || null,
        amount_cents: amount,
        currency: session.currency,
        tipper_email: session.customer_details?.email || null,
      });

      const writer = await getUserById(writerUserId);
      if (!writer) {
        console.warn("⚠️ Tip writer not found", { writerUserId });
        return;
      }

      try {
        await sendTipReceivedEmail({
          to: writer.email,
          amount_cents: amount,
          postUrl: `${process.env.FRONTEND_URL}/community`,
        });
      } catch (err) {
        console.error("⚠️ Tip email failed", err);
      }

      // Notification (non-blocking)
      try {
        await sendTipReceivedNotification({
          writerUserId,
          tipperUserId: session.metadata?.tipperUserId || null,
          postId,
          amount_cents: amount,
        });
      } catch (err) {
        console.error("⚠️ Tip notification failed", err);
      }

      console.log("💖 Tip recorded", {
        sessionId: session.id,
        writerUserId,
        amount,
      });

      return; // ⛔ VERY IMPORTANT: stop here
    }
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
          src="https://themessyattic.com/cre8tly-logo.png"
          style="width:48px;height:48px;object-fit:contain;"
        />
        <div style="line-height:1.1;">
          <div style="font-size:18px;font-weight:600;color:#111827;">
            The Messy Attic
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
        © ${new Date().getFullYear()} The Messy Attic · Alure Digital
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
        session.id,
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
          src="https://themessyattic.com/cre8tly-logo.png"
          style="width:48px;height:48px;object-fit:contain;"
        />
        <div style="font-size:18px;font-weight:600;color:#111827;">
          The Messy Attic
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
        © ${new Date().getFullYear()} The Messy Attic · Alure Digital
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
      [sellerStripeAccountId],
    );

    const sellerEmail = seller?.[0]?.email;
    const sellerName = seller?.[0]?.name || "Seller";

    if (!sellerEmail) {
      console.warn(
        "⚠️ Seller email not found for stripe account:",
        sellerStripeAccountId,
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
      <img src="https://themessyattic.com/themessyattic-logo.png" width="40" />
      <div style="font-size:18px;font-weight:600;color:#111827;">
        The Messy Attic
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
      This sale was processed through The Messy Attic
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

export async function sendTipReceivedNotification({
  writerUserId,
  tipperUserId = null,
  postId = null,
  amount_cents,
}) {
  try {
    const tipAmountFormatted = `$${(amount_cents / 100).toFixed(2)}`;

    await saveNotification({
      userId: writerUserId,
      actorId: tipperUserId,
      type: "tip_received",
      postId,
      message: `sent you a ${tipAmountFormatted} tip`,
    });
  } catch (err) {
    console.error("❌ Failed to send tip notification", err);
    throw err;
  }
}

// Auhtors Assistant Subscription

export async function updateUserStripeCustomerId(userId, customerId) {
  const db = connect();

  try {
    await db.query(
      `
      UPDATE users
      SET stripe_customer_id = ?
      WHERE id = ?
      `,
      [customerId, userId],
    );
  } catch (err) {
    console.error("❌ updateUserStripeCustomerId error:", {
      userId,
      customerId,
      error: err,
    });
    throw err;
  }
}

export async function handleSubscriptionUpsert(subscription) {
  const customerId = subscription.customer;
  const status = subscription.status;
  const priceId = subscription.items.data[0]?.price?.id || null;

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  const user = await getUserByStripeCustomerId(customerId);
  if (!user) {
    console.warn("Subscription for unknown customer:", customerId);
    return;
  }

  await updateUserSubscription({
    userId: user.id,
    stripeSubscriptionId: subscription.id,
    status,
    priceId,
    periodEnd,
  });

  console.log("🔁 Subscription synced", {
    userId: user.id,
    status,
    periodEnd,
  });
}

export async function updateUserSubscription({
  userId,
  stripeSubscriptionId,
  status,
  priceId,
  periodEnd,
}) {
  const db = connect();

  try {
    await db.query(
      `
      UPDATE users
      SET
        stripe_subscription_id = ?,
        subscription_status = ?,
        subscription_price_id = ?,
        subscription_current_period_end = ?
      WHERE id = ?
      `,
      [stripeSubscriptionId, status, priceId, periodEnd, userId],
    );
  } catch (err) {
    console.error("❌ updateUserSubscription error:", {
      userId,
      stripeSubscriptionId,
      status,
      priceId,
      periodEnd,
      error: err,
    });
    throw err;
  }
}

export async function getUserByStripeCustomerId(stripeCustomerId) {
  const db = connect();

  try {
    const [[user]] = await db.query(
      `
      SELECT *
      FROM users
      WHERE stripe_customer_id = ?
      LIMIT 1
      `,
      [stripeCustomerId],
    );

    return user || null;
  } catch (err) {
    console.error("❌ getUserByStripeCustomerId error:", err);
    throw err;
  }
}

export async function handleAuthorCheckoutCompleted(session) {
  try {
    if (!session.subscription) {
      console.warn("⚠️ Checkout completed without subscription", session.id);
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(
      session.subscription,
    );

    const authorUserId = subscription.metadata?.author_user_id;
    const subscriberUserId = subscription.metadata?.subscriber_user_id;

    if (!authorUserId || !subscriberUserId) {
      console.warn("⚠️ Missing author subscription metadata", {
        sessionId: session.id,
        subscriptionId: session.subscription,
      });
      return;
    }

    const {
      id: stripeSubscriptionId,
      customer: stripeCustomerId,
      status,
      current_period_end,
      items,
    } = subscription;

    let billingInterval = null;
    const stripeInterval = items?.data?.[0]?.price?.recurring?.interval;

    if (stripeInterval === "month") billingInterval = "monthly";
    if (stripeInterval === "year") billingInterval = "yearly";

    const paid = status === "active" || status === "trialing";

    const db = connect();

    const [[existing]] = await db.query(
      `
      SELECT id, stripe_subscription_id
      FROM author_subscriptions
      WHERE author_user_id = ?
        AND subscriber_user_id = ?
      LIMIT 1
      `,
      [authorUserId, subscriberUserId],
    );

    if (existing?.stripe_subscription_id === stripeSubscriptionId) {
      return;
    }

    if (existing) {
      await db.query(
        `
        UPDATE author_subscriptions
        SET
          paid_subscription = ?,
          stripe_customer_id = ?,
          stripe_subscription_id = ?,
          billing_interval = ?,
          current_period_end = FROM_UNIXTIME(?),
          deleted_at = NULL,
          last_activity_at = NOW()
        WHERE author_user_id = ?
          AND subscriber_user_id = ?
        `,
        [
          paid ? 1 : 0,
          stripeCustomerId,
          stripeSubscriptionId,
          billingInterval,
          current_period_end,
          authorUserId,
          subscriberUserId,
        ],
      );
    } else {
      await db.query(
        `
        INSERT INTO author_subscriptions (
          id,
          author_user_id,
          subscriber_user_id,
          paid_subscription,
          stripe_customer_id,
          stripe_subscription_id,
          billing_interval,
          current_period_end,
          created_at,
          last_activity_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?), NOW(), NOW()
        )
        `,
        [
          uuidv4(),
          authorUserId,
          subscriberUserId,
          paid ? 1 : 0,
          stripeCustomerId,
          stripeSubscriptionId,
          billingInterval,
          current_period_end,
        ],
      );
    }
  } catch (err) {
    console.error("❌ handleAuthorCheckoutCompleted failed", {
      sessionId: session?.id,
      error: err,
    });
    throw err;
  }
}

export async function handleAuthorSubscriptionUpsert(subscription) {
  try {
    const authorUserId = subscription.metadata?.author_user_id;
    const subscriberUserId = subscription.metadata?.subscriber_user_id;

    if (!authorUserId || !subscriberUserId) {
      console.warn("⚠️ Author subscription missing metadata", subscription.id);
      return;
    }

    const {
      status,
      current_period_end,
      customer: stripeCustomerId,
      id: stripeSubscriptionId,
      items,
    } = subscription;

    // 🔁 map Stripe interval → DB enum
    let billingInterval = null;
    const stripeInterval = items?.data?.[0]?.price?.recurring?.interval;

    if (stripeInterval === "month") billingInterval = "monthly";
    if (stripeInterval === "year") billingInterval = "yearly";

    const isPaid = status === "active" || status === "trialing";

    const db = connect();

    const [[existing]] = await db.query(
      `
      SELECT id
      FROM author_subscriptions
      WHERE author_user_id = ?
        AND subscriber_user_id = ?
      LIMIT 1
      `,
      [authorUserId, subscriberUserId],
    );

    // 🆕 insert if missing
    if (!existing) {
      await db.query(
        `
        INSERT INTO author_subscriptions (
          id,
          author_user_id,
          subscriber_user_id,
          paid_subscription,
          stripe_customer_id,
          stripe_subscription_id,
          billing_interval,
          current_period_end,
          last_activity_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?), NOW()
        )
        `,
        [
          uuidv4(),
          authorUserId,
          subscriberUserId,
          isPaid ? 1 : 0,
          stripeCustomerId,
          stripeSubscriptionId,
          billingInterval,
          current_period_end,
        ],
      );

      return;
    }

    // 🔄 update existing
    await db.query(
      `
      UPDATE author_subscriptions
      SET
        paid_subscription = ?,
        stripe_customer_id = ?,
        stripe_subscription_id = ?,
        billing_interval = ?,
        current_period_end = FROM_UNIXTIME(?),
        deleted_at = NULL,
        last_activity_at = NOW()
      WHERE author_user_id = ?
        AND subscriber_user_id = ?
      `,
      [
        isPaid ? 1 : 0,
        stripeCustomerId,
        stripeSubscriptionId,
        billingInterval,
        current_period_end,
        authorUserId,
        subscriberUserId,
      ],
    );
  } catch (err) {
    console.error("❌ handleAuthorSubscriptionUpsert failed", {
      subscriptionId: subscription?.id,
      error: err,
    });

    throw err;
  }
}

// INVOICES SUCCEEDED

export async function handleAuthorInvoicePaid(invoice) {
  try {
    const {
      id: invoiceId,
      amount_paid,
      subscription: stripeSubscriptionId,
    } = invoice;

    if (!amount_paid || amount_paid <= 0) {
      console.warn("⚠️ Invoice paid with zero amount", invoiceId);
      return;
    }

    if (!stripeSubscriptionId) {
      console.warn("⚠️ Invoice missing subscription ID", invoiceId);
      return;
    }

    const db = connect();

    const [[row]] = await db.query(
      `
      SELECT
        id,
        author_user_id,
        subscriber_user_id,
        revenue,
        last_invoice_id
      FROM author_subscriptions
      WHERE stripe_subscription_id = ?
      LIMIT 1
      `,
      [stripeSubscriptionId],
    );

    if (!row) {
      console.warn("⚠️ Invoice for missing author subscription", {
        invoiceId,
        stripeSubscriptionId,
      });
      return;
    }

    // 🔁 idempotency guard
    if (row.last_invoice_id === invoiceId) {
      console.log("🔁 Invoice already processed", invoiceId);
      return;
    }

    const revenueIncrement = amount_paid / 100;

    await db.query(
      `
      UPDATE author_subscriptions
      SET
        revenue = revenue + ?,
        paid_subscription = 1,
        last_invoice_id = ?,
        last_activity_at = NOW()
      WHERE id = ?
      `,
      [revenueIncrement, invoiceId, row.id],
    );

    // 📧 Send paid subscription email to author
    const [[author]] = await db.query(
      `
      SELECT email
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [row.author_user_id],
    );

    const interval =
      invoice.lines?.data?.[0]?.price?.recurring?.interval === "year"
        ? "year"
        : "month";

    if (invoice.billing_reason === "subscription_create" && author?.email) {
      await sendPaidSubscriberEmail({
        to: author.email,
        subscriberName: "A new member",
        amount: (invoice.amount_paid / 100).toFixed(2),
        interval,
      });
    }

    console.log("💰 Author subscription revenue recorded + email sent", {
      stripeSubscriptionId,
      invoiceId,
      revenueIncrement,
    });
  } catch (err) {
    console.error("❌ handleAuthorInvoicePaid failed", {
      invoiceId: invoice?.id,
      error: err,
    });
    throw err;
  }
}

// INVOICES FAILED

export async function handleAuthorInvoiceFailed(invoice, subscription) {
  try {
    const authorUserId = subscription.metadata?.author_user_id;
    const subscriberUserId = subscription.metadata?.subscriber_user_id;

    if (!authorUserId || !subscriberUserId) {
      console.warn(
        "⚠️ Invoice failed missing author subscription metadata",
        invoice.id,
      );
      return;
    }

    const {
      id: stripeSubscriptionId,
      status,
      current_period_end,
    } = subscription;

    const db = connect();

    const [[row]] = await db.query(
      `
      SELECT id, status
      FROM author_subscriptions
      WHERE author_user_id = ?
        AND subscriber_user_id = ?
        AND stripe_subscription_id = ?
      LIMIT 1
      `,
      [authorUserId, subscriberUserId, stripeSubscriptionId],
    );

    if (!row) {
      console.warn("⚠️ Invoice failed for missing author subscription", {
        invoiceId: invoice.id,
        stripeSubscriptionId,
      });
      return;
    }

    // If already canceled, do nothing
    if (row.status === "canceled") {
      return;
    }

    // Force past_due on failed invoice
    await db.query(
      `
      UPDATE author_subscriptions
      SET
        paid_subscription = 0,
        status = 'past_due',
        current_period_end = FROM_UNIXTIME(?),
        last_activity_at = NOW()
      WHERE id = ?
      `,
      [current_period_end, row.id],
    );

    console.log("⚠️ Author subscription marked past_due", {
      authorUserId,
      subscriberUserId,
      stripeSubscriptionId,
      invoiceId: invoice.id,
    });
  } catch (err) {
    console.error("❌ handleAuthorInvoiceFailed failed", {
      invoiceId: invoice?.id,
      error: err,
    });

    throw err;
  }
}

export async function handleAuthorSubscriptionDeleted(subscription) {
  try {
    const stripeSubscriptionId = subscription.id;

    const db = connect();

    const [[row]] = await db.query(
      `
      SELECT id, author_user_id
      FROM author_subscriptions
      WHERE stripe_subscription_id = ?
      LIMIT 1
      `,
      [stripeSubscriptionId],
    );

    if (!row) {
      console.warn(
        "⚠️ Subscription deleted but row missing",
        stripeSubscriptionId,
      );
      return;
    }

    await db.query(
      `
      UPDATE author_subscriptions
      SET
        paid_subscription = 0,
        deleted_at = NOW(),
        last_activity_at = NOW()
      WHERE id = ?
      `,
      [row.id],
    );

    const [[author]] = await db.query(
      `
      SELECT email
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [row.author_user_id],
    );

    if (author?.email) {
      await sendPaidUnsubscribedEmail({
        to: author.email,
        subscriberName: "A member",
      });
    }

    console.log(
      "🚪 Paid subscription canceled + email sent",
      stripeSubscriptionId,
    );
  } catch (err) {
    console.error("❌ handleAuthorSubscriptionDeleted failed", err);
    throw err;
  }
}
