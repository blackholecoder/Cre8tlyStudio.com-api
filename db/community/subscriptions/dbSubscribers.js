import { v4 as uuidv4 } from "uuid";
import connect from "../../connect.js";
import { sendOutLookMail } from "../../../utils/sendOutlookMail.js";
import { getUserById } from "../../dbUser.js";
import { emailQueue } from "../../../queues/emailQueue.js";
import { saveNotification } from "../notifications/notifications.js";
import { renderAuthorEmailTemplate } from "../../../emails/renderAuthorEmailTemplate.js";
import { getAuthorEmailTemplateByType } from "../authors/dbAuthors.js";

/**
 * Subscribe to an author
 */
export async function subscribeToAuthor(authorUserId, subscriberUserId) {
  try {
    if (authorUserId === subscriberUserId) {
      throw new Error("You cannot subscribe to yourself");
    }

    const db = connect();

    // Fetch author info for notifications
    const [[author]] = await db.query(
      `
      SELECT email, name
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [authorUserId],
    );

    const [[subscriber]] = await db.query(
      `
  SELECT name, email
  FROM users
  WHERE id = ?
  LIMIT 1
  `,
      [subscriberUserId],
    );

    // Check existing subscription
    const [existing] = await db.query(
      `
      SELECT id, deleted_at
      FROM author_subscriptions
      WHERE author_user_id = ?
        AND subscriber_user_id = ?
      LIMIT 1
      `,
      [authorUserId, subscriberUserId],
    );

    let reactivated = false;

    if (existing.length > 0) {
      await db.query(
        `
        UPDATE author_subscriptions
        SET deleted_at = NULL,
            created_at = NOW()
        WHERE author_user_id = ?
          AND subscriber_user_id = ?
        `,
        [authorUserId, subscriberUserId],
      );

      reactivated = true;
    } else {
      await db.query(
        `
        INSERT INTO author_subscriptions
          (id, author_user_id, subscriber_user_id)
        VALUES (?, ?, ?)
        `,
        [uuidv4(), authorUserId, subscriberUserId],
      );
    }

    // 🔔 In app notification
    await saveNotification({
      userId: authorUserId,
      actorId: subscriberUserId,
      type: "subscription",
      message: "subscribed to you",
    });

    // 📧 Email notification

    try {
      await sendNewSubscriberEmail({
        to: author.email,
        subscriberName: subscriber.name,
      });
    } catch (emailErr) {
      console.error("⚠️ Author email failed:", emailErr);
    }

    try {
      const template = await getAuthorEmailTemplateByType(
        authorUserId,
        "free_subscriber_welcome",
      );

      if (template) {
        const rendered = renderAuthorEmailTemplate(template, {
          subscriber_name: subscriber.name,
          author_name: author.name,
        });

        if (rendered) {
          await sendOutLookMail({
            to: subscriber.email,
            subject: rendered.subject,
            html: rendered.html,
          });
        }
      }
    } catch (emailErr) {
      console.error("⚠️ Subscriber welcome email failed:", emailErr);
    }

    return {
      subscribed: true,
      reactivated,
    };
  } catch (err) {
    console.error("subscribeToAuthor error:", err);
    throw err;
  }
}

/**
 * Unsubscribe (soft delete)
 */
export async function unsubscribeFromAuthor(authorUserId, subscriberUserId) {
  try {
    const db = connect();

    // Fetch author info for email
    const [[author]] = await db.query(
      `
      SELECT email
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [authorUserId],
    );

    const [[subscriber]] = await db.query(
      `
      SELECT name
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [subscriberUserId],
    );

    await db.query(
      `
      UPDATE author_subscriptions
      SET deleted_at = NOW()
      WHERE author_user_id = ?
        AND subscriber_user_id = ?
        AND deleted_at IS NULL
      `,
      [authorUserId, subscriberUserId],
    );

    // 📧 Email notification (fire and forget)
    try {
      await sendFreeUnsubscribedEmail({
        to: author.email,
        subscriberName: subscriber?.name,
      });
    } catch (emailErr) {
      console.error("⚠️ Unsubscribe email failed:", emailErr);
    }

    return { subscribed: false };
  } catch (err) {
    console.error("unsubscribeFromAuthor error:", err);
    throw err;
  }
}

/**
 * Check if user is subscribed
 */
export async function isSubscribedToAuthor(authorUserId, subscriberUserId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT 1
      FROM author_subscriptions
      WHERE author_user_id = ?
        AND subscriber_user_id = ?
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [authorUserId, subscriberUserId],
    );

    return rows.length > 0;
  } catch (err) {
    console.error("isSubscribedToAuthor error:", err);
    throw err;
  }
}

/**
 * Get subscriber count for author
 */
export async function getMySubscribers(authorUserId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT
        u.id,
        u.email,
        u.profile_image_url,
        s.paid_subscription,
        s.type,  
        CASE
          WHEN s.paid_subscription = 1 THEN 1
          ELSE 0
        END AS has_subscription,
        COALESCE(s.activity, 0) AS activity,
        s.revenue,
        s.created_at,

        CASE
          WHEN ap.user_id IS NOT NULL THEN 1
          ELSE 0
        END AS has_profile

      FROM author_subscriptions s
      JOIN users u
        ON u.id = s.subscriber_user_id
      LEFT JOIN author_profiles ap
        ON ap.user_id = u.id  
      WHERE s.author_user_id = ?
        AND s.deleted_at IS NULL
      ORDER BY s.created_at DESC
      `,
      [authorUserId],
    );

    return rows;
  } catch (err) {
    console.error("getMySubscribers helper error:", err);
    throw err;
  }
}

export async function removeSubscriber(authorUserId, subscriberUserId) {
  try {
    const db = connect();

    await db.query(
      `
      UPDATE author_subscriptions
      SET deleted_at = NOW()
      WHERE author_user_id = ?
        AND subscriber_user_id = ?
      `,
      [authorUserId, subscriberUserId],
    );

    return { success: true };
  } catch (err) {
    console.error("removeSubscriber helper error:", err);
    throw err;
  }
}

// Subscriber Invites

export async function createSubscriptionInvites(authorId, emails) {
  try {
    const db = connect();

    const cleanEmails = [
      ...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)),
    ];

    if (!cleanEmails.length) return [];

    const author = await getUserById(authorId);

    const invites = cleanEmails.map((email) => ({
      id: uuidv4(),
      author_id: authorId,
      email,
      token: uuidv4(),
    }));

    const values = invites.map((i) => [i.id, i.author_id, i.email, i.token]);

    await db.query(
      `
      INSERT INTO community_subscription_invites
        (id, author_id, email, token)
      VALUES ?
      `,
      [values],
    );

    // 🔥 enqueue emails instead of sending them
    for (const invite of invites) {
      await emailQueue.add("community-invite", {
        type: "community-invite",
        payload: {
          email: invite.email,
          authorName: author.name,
          inviteUrl: `${process.env.FRONTEND_URL}/community/invites/${invite.token}`,
        },
      });
    }

    return invites;
  } catch (err) {
    console.error("createSubscriptionInvites error:", err);
    throw err;
  }
}

export async function getPendingInvites(authorId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT id, email, status, created_at
      FROM community_subscription_invites
      WHERE author_id = ?
        AND status = 'pending'
      ORDER BY created_at DESC
      `,
      [authorId],
    );

    return rows;
  } catch (err) {
    console.error("getPendingInvites error:", err);
    throw err;
  }
}

export async function acceptSubscriptionInvite(token, userId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT *
      FROM community_subscription_invites
      WHERE token = ?
        AND status = 'pending'
      LIMIT 1
      `,
      [token],
    );

    if (!rows.length) {
      throw new Error("Invalid or expired invite");
    }

    const invite = rows[0];

    // Create subscription (safe because of UNIQUE constraint)
    await db.query(
      `
      INSERT IGNORE INTO author_subscriptions
        (id, author_user_id, subscriber_user_id, created_at)
      VALUES (?, ?, ?, NOW())
      `,
      [uuidv4(), invite.author_id, userId],
    );

    // Mark invite as accepted
    await db.query(
      `
      UPDATE community_subscription_invites
      SET status = 'accepted',
          accepted_at = NOW()
      WHERE id = ?
      `,
      [invite.id],
    );

    return invite;
  } catch (err) {
    console.error("acceptSubscriptionInvite error:", err);
    throw err;
  }
}

export async function getSubscriptionInviteByToken(token) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT
        i.id,
        i.email,
        i.status,
        u.name AS author_name,
        u.profile_image_url AS author_avatar
      FROM community_subscription_invites i
      JOIN users u ON u.id = i.author_id
      WHERE i.token = ?
        AND i.status = 'pending'
      LIMIT 1
      `,
      [token],
    );

    if (!rows.length) return null;

    return rows[0];
  } catch (err) {
    console.error("getSubscriptionInviteByToken error:", err);
    throw err;
  }
}

// Cancel Invites
export async function cancelSubscriptionInvite(inviteId, authorId) {
  try {
    const db = connect();

    const [result] = await db.query(
      `
      UPDATE community_subscription_invites
      SET
        status = 'expired',
        expired_at = NOW()
      WHERE id = ?
        AND author_id = ?
        AND status = 'pending'
      `,
      [inviteId, authorId],
    );

    if (result.affectedRows === 0) {
      throw new Error(
        "Invite not cancelled. It may already be accepted or expired.",
      );
    }

    return true;
  } catch (err) {
    console.error("cancelSubscriptionInvite error:", err);
    throw err;
  }
}

// Resend Invites
export async function resendSubscriptionInvite(inviteId, authorId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT id, email, token
      FROM community_subscription_invites
      WHERE id = ?
        AND author_id = ?
        AND status = 'pending'
      LIMIT 1
      `,
      [inviteId, authorId],
    );

    if (!rows.length) {
      throw new Error("Invite not found or not pending");
    }

    const invite = rows[0];

    await db.query(
      `
      UPDATE community_subscription_invites
      SET resent_at = NOW()
      WHERE id = ?
      `,
      [invite.id],
    );

    // 🔔 Hook for email service later
    // sendInviteEmail(invite.email, invite.token)

    return invite;
  } catch (err) {
    console.error("resendSubscriptionInvite error:", err);
    throw err;
  }
}

// Activity
export async function incrementSubscriberActivity({
  authorUserId,
  subscriberUserId,
  points,
}) {
  try {
    const db = connect();

    const [result] = await db.query(
      `
      UPDATE author_subscriptions
      SET activity = LEAST(activity + ?, 5),
      last_activity_at = NOW()
      WHERE author_user_id = ?
        AND subscriber_user_id = ?
        AND deleted_at IS NULL
      `,
      [points, authorUserId, subscriberUserId],
    );

    return result.affectedRows > 0;
  } catch (err) {
    console.error("incrementSubscriberActivity error:", err);
    throw err;
  }
}
// BULLMQ WEEKLY SCAN
export async function decayInactiveSubscriberActivity() {
  try {
    const db = connect();

    const [result] = await db.query(
      `
      UPDATE author_subscriptions
      SET activity = GREATEST(activity - 1, 0)
      WHERE last_activity_at < NOW() - INTERVAL 7 DAY
        AND activity > 0
        AND deleted_at IS NULL
      `,
    );

    console.log(
      `🟡 Weekly activity decay applied to ${result.affectedRows} subscribers`,
    );

    return result.affectedRows;
  } catch (err) {
    console.error("❌ decayInactiveSubscriberActivity error:", err);
    throw err;
  }
}

// Invite Email Template
export async function sendCommunityInviteEmail({
  email,
  authorName,
  inviteUrl,
}) {
  const inviteHtml = `
<div style="min-height:100%;background:#f9fafb;padding:60px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="
    max-width:460px;
    margin:0 auto;
    background:#ffffff;
    padding:40px 32px;
    border-radius:18px;
    border:1px solid #e5e7eb;
    box-shadow:0 25px 60px rgba(0,0,0,0.06);
  ">

    <!-- Brand -->
    <div style="text-align:center;margin-bottom:36px;">
      <img
        src="https://themessyattic.com/themessyattic-logo.png"
        width="56"
        height="56"
        alt="The Messy Attic"
        style="display:block;margin:0 auto 14px;"
      />
      <div style="
        font-size:20px;
        font-weight:700;
        color:#111827;
        letter-spacing:0.3px;
      ">
        The Messy Attic
      </div>
      <div style="
        width:40px;
        height:2px;
        background:#e5e7eb;
        margin:16px auto 0;
        border-radius:2px;
      "></div>
    </div>

    <!-- Heading -->
    <h2 style="
      font-size:22px;
      font-weight:700;
      color:#111827;
      margin:0 0 8px;
      text-align:center;
    ">
      You’ve been invited
    </h2>

    <p style="
      font-size:14px;
      color:#6b7280;
      margin:0 0 28px;
      text-align:center;
    ">
      A personal invitation
    </p>

    <!-- Invite Card -->
    <div style="
      margin:0 0 28px;
      padding:22px;
      background:#f9fafb;
      border-radius:14px;
      border:1px solid #e5e7eb;
      text-align:center;
    ">
      <div style="
        font-size:15px;
        color:#111827;
        line-height:1.6;
      ">
        <strong>${authorName}</strong> has personally invited you to join a private community for writers, authors, and readers.
      </div>

      <div style="
        font-size:13px;
        color:#6b7280;
        margin-top:10px;
        line-height:1.6;
      ">
        Subscribing lets you follow what they publish and stay connected, without algorithms or noise.
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:32px 0;">
      <a
        href="${inviteUrl}"
        target="_blank"
        style="
          background:#7bed9f;
          color:#000000;
          padding:14px 38px;
          border-radius:10px;
          text-decoration:none;
          font-weight:700;
          font-size:14px;
          display:inline-block;
        "
      >
        Accept invitation
      </a>
    </div>

    <!-- Footer -->
    <div style="
      margin-top:36px;
      padding-top:20px;
      border-top:1px solid #f1f5f9;
      text-align:center;
      font-size:13px;
      color:#6b7280;
      line-height:1.6;
    ">
      If you don’t have an account yet, you’ll be prompted to create one first.
      <br/>
      <span style="display:inline-block;margin-top:8px;">
        — The Messy Attic
      </span>
    </div>

  </div>
</div>
`;

  try {
    await sendOutLookMail({
      to: email,
      subject: `${authorName} invited you to subscribe to The Messy Attic`,
      html: inviteHtml,
    });
  } catch (err) {
    console.error("❌ sendCommunityInviteEmail failed");
    throw err;
  }
}

export async function sendNewSubscriberEmail({ to, subscriberName }) {
  if (!to) {
    throw new Error("No email recipient provided to sendNewSubscriberEmail");
  }

  const html = `
<div style="min-height:100%;background:#f9fafb;padding:60px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="
    max-width:460px;
    margin:0 auto;
    background:#ffffff;
    padding:40px 32px;
    border-radius:18px;
    border:1px solid #e5e7eb;
    box-shadow:0 25px 60px rgba(0,0,0,0.06);
  ">

    <!-- Brand -->
    <div style="text-align:center;margin-bottom:36px;">
      <img
        src="https://themessyattic.com/themessyattic-logo.png"
        width="56"
        height="56"
        alt="The Messy Attic"
        style="display:block;margin:0 auto 14px;"
      />
      <div style="
        font-size:20px;
        font-weight:700;
        color:#111827;
        letter-spacing:0.3px;
      ">
        The Messy Attic
      </div>
      <div style="
        width:40px;
        height:2px;
        background:#e5e7eb;
        margin:16px auto 0;
        border-radius:2px;
      "></div>
    </div>

    <!-- Heading -->
    <h2 style="
      font-size:22px;
      font-weight:700;
      color:#111827;
      margin:0 0 8px;
      text-align:center;
    ">
      New subscriber
    </h2>

    <p style="
      font-size:14px;
      color:#6b7280;
      margin:0 0 28px;
      text-align:center;
    ">
      Your community is growing
    </p>

    <!-- Subscriber Info Card -->
    <div style="
      margin:0 0 28px;
      padding:20px;
      background:#f9fafb;
      border-radius:12px;
      border:1px solid #e5e7eb;
      text-align:center;
    ">
      <div style="
        font-size:15px;
        color:#111827;
        line-height:1.6;
      ">
        <strong>${subscriberName || "Someone"}</strong> just subscribed to your community.
      </div>

      <div style="
        font-size:14px;
        color:#6b7280;
        margin-top:10px;
        line-height:1.6;
      ">
        They’ll now see what you publish and can join discussions when you share new posts.
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:32px 0;">
      <a
        href="https://themessyattic.com/community"
        target="_blank"
        style="
          background:#7bed9f;
          color:#000000;
          padding:14px 38px;
          border-radius:10px;
          text-decoration:none;
          font-weight:700;
          font-size:14px;
          display:inline-block;
        "
      >
        View your community
      </a>
    </div>

    <!-- Footer -->
    <div style="
      margin-top:36px;
      padding-top:20px;
      border-top:1px solid #f1f5f9;
      text-align:center;
      font-size:13px;
      color:#6b7280;
      line-height:1.6;
    ">
      You can manage subscribers and notifications from your dashboard.
      <br/>
      <span style="display:inline-block;margin-top:8px;">
        — The Messy Attic
      </span>
    </div>

  </div>
</div>
`;

  await sendOutLookMail({
    to,
    subject: "You have a new subscriber on The Messy Attic",
    html,
  });
}

// PIAD EMAIL
export async function sendPaidSubscriberEmail({
  to,
  subscriberName,
  amount,
  interval,
}) {
  if (!to) {
    throw new Error("No email recipient provided to sendPaidSubscriberEmail");
  }

  const html = `
<div style="min-height:100%;background:#f9fafb;padding:60px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="
    max-width:460px;
    margin:0 auto;
    background:#ffffff;
    padding:40px 32px;
    border-radius:18px;
    border:1px solid #e5e7eb;
    box-shadow:0 25px 60px rgba(0,0,0,0.06);
  ">

    <!-- Brand -->
    <div style="text-align:center;margin-bottom:36px;">
      <img
        src="https://themessyattic.com/themessyattic-logo.png"
        width="56"
        height="56"
        alt="The Messy Attic"
        style="display:block;margin:0 auto 14px;"
      />
      <div style="
        font-size:20px;
        font-weight:700;
        color:#111827;
        letter-spacing:0.3px;
      ">
        The Messy Attic
      </div>
      <div style="
        width:40px;
        height:2px;
        background:#e5e7eb;
        margin:16px auto 0;
        border-radius:2px;
      "></div>
    </div>

    <!-- Heading -->
    <h2 style="
      font-size:22px;
      font-weight:700;
      color:#111827;
      margin:0 0 8px;
      text-align:center;
    ">
      You have a new paid subscriber
    </h2>

    <p style="
      font-size:14px;
      color:#6b7280;
      margin:0 0 28px;
      text-align:center;
    ">
      Someone just chose to support your work
    </p>

    <!-- Highlight Card -->
    <div style="
      margin:0 0 28px;
      padding:22px;
      background:#f0fdf4;
      border-radius:14px;
      border:1px solid #bbf7d0;
      text-align:center;
    ">
      <div style="
        font-size:15px;
        color:#111827;
        line-height:1.6;
      ">
        <strong>${subscriberName || "Someone"}</strong> started a
        <strong>paid subscription</strong>.
      </div>

      <div style="
        font-size:14px;
        color:#065f46;
        margin-top:10px;
        font-weight:600;
      ">
        $${amount}/${interval}
      </div>

      <div style="
        font-size:13px;
        color:#6b7280;
        margin-top:8px;
        line-height:1.6;
      ">
        They now have full access to your community and paid content.
      </div>
    </div>

    <!-- Encouragement -->
    <p style="
      font-size:14px;
      color:#374151;
      line-height:1.6;
      margin:0 0 28px;
      text-align:center;
    ">
      You’ve officially earned from your writing. Keep going.
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin:32px 0;">
      <a
        href="https://themessyattic.com/community"
        target="_blank"
        style="
          background:#7bed9f;
          color:#000000;
          padding:14px 38px;
          border-radius:10px;
          text-decoration:none;
          font-weight:700;
          font-size:14px;
          display:inline-block;
        "
      >
        View your community
      </a>
    </div>

    <!-- Footer -->
    <div style="
      margin-top:36px;
      padding-top:20px;
      border-top:1px solid #f1f5f9;
      text-align:center;
      font-size:13px;
      color:#6b7280;
      line-height:1.6;
    ">
      You can manage paid subscribers and earnings from your dashboard.
      <br/>
      <span style="display:inline-block;margin-top:8px;">
        — The Messy Attic
      </span>
    </div>

  </div>
</div>
`;

  await sendOutLookMail({
    to,
    subject: "You have a new paid subscriber 🎉",
    html,
  });
}

export async function sendFreeUnsubscribedEmail({ to, subscriberName }) {
  if (!to) {
    throw new Error("No email recipient provided to sendFreeUnsubscribedEmail");
  }

  const html = `
<div style="min-height:100%;background:#f9fafb;padding:60px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="
    max-width:460px;
    margin:0 auto;
    background:#ffffff;
    padding:40px 32px;
    border-radius:18px;
    border:1px solid #e5e7eb;
    box-shadow:0 25px 60px rgba(0,0,0,0.06);
  ">

    <!-- Brand -->
    <div style="text-align:center;margin-bottom:36px;">
      <img
        src="https://themessyattic.com/themessyattic-logo.png"
        width="56"
        height="56"
        alt="The Messy Attic"
        style="display:block;margin:0 auto 14px;"
      />
      <div style="
        font-size:20px;
        font-weight:700;
        color:#111827;
        letter-spacing:0.3px;
      ">
        The Messy Attic
      </div>
      <div style="
        width:40px;
        height:2px;
        background:#e5e7eb;
        margin:16px auto 0;
        border-radius:2px;
      "></div>
    </div>

    <!-- Heading -->
    <h2 style="
      font-size:22px;
      font-weight:700;
      color:#111827;
      margin:0 0 8px;
      text-align:center;
    ">
      A subscriber left
    </h2>

    <p style="
      font-size:14px;
      color:#6b7280;
      margin:0 0 28px;
      text-align:center;
    ">
      A free subscription was canceled
    </p>

    <!-- Info Card -->
    <div style="
      margin:0 0 28px;
      padding:20px;
      background:#f9fafb;
      border-radius:12px;
      border:1px solid #e5e7eb;
      text-align:center;
    ">
      <div style="
        font-size:15px;
        color:#111827;
        line-height:1.6;
      ">
        <strong>${subscriberName || "Someone"}</strong> has unsubscribed from your community.
      </div>

      <div style="
        font-size:13px;
        color:#6b7280;
        margin-top:10px;
        line-height:1.6;
      ">
        No action is needed. They won’t receive future posts unless they choose to resubscribe.
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:32px 0;">
      <a
        href="https://themessyattic.com/community"
        target="_blank"
        style="
          background:#7bed9f;
          color:#000000;
          padding:14px 38px;
          border-radius:10px;
          text-decoration:none;
          font-weight:700;
          font-size:14px;
          display:inline-block;
        "
      >
        View your community
      </a>
    </div>

    <!-- Footer -->
    <div style="
      margin-top:36px;
      padding-top:20px;
      border-top:1px solid #f1f5f9;
      text-align:center;
      font-size:13px;
      color:#6b7280;
      line-height:1.6;
    ">
      You can manage subscribers and notifications from your dashboard.
      <br/>
      <span style="display:inline-block;margin-top:8px;">
        — The Messy Attic
      </span>
    </div>

  </div>
</div>
`;

  await sendOutLookMail({
    to,
    subject: "A subscriber unsubscribed from your community",
    html,
  });
}

// PAID UNSUBSCRIBED EMAIL
export async function sendPaidUnsubscribedEmail({ to, subscriberName }) {
  if (!to) {
    throw new Error("No email recipient provided to sendPaidUnsubscribedEmail");
  }

  const html = `
<div style="min-height:100%;background:#f9fafb;padding:60px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="
    max-width:460px;
    margin:0 auto;
    background:#ffffff;
    padding:40px 32px;
    border-radius:18px;
    border:1px solid #e5e7eb;
    box-shadow:0 25px 60px rgba(0,0,0,0.06);
  ">

    <!-- Brand -->
    <div style="text-align:center;margin-bottom:36px;">
      <img
        src="https://themessyattic.com/themessyattic-logo.png"
        width="56"
        height="56"
        alt="The Messy Attic"
        style="display:block;margin:0 auto 14px;"
      />
      <div style="
        font-size:20px;
        font-weight:700;
        color:#111827;
        letter-spacing:0.3px;
      ">
        The Messy Attic
      </div>
      <div style="
        width:40px;
        height:2px;
        background:#e5e7eb;
        margin:16px auto 0;
        border-radius:2px;
      "></div>
    </div>

    <!-- Heading -->
    <h2 style="
      font-size:22px;
      font-weight:700;
      color:#111827;
      margin:0 0 8px;
      text-align:center;
    ">
      A paid subscriber canceled
    </h2>

    <p style="
      font-size:14px;
      color:#6b7280;
      margin:0 0 28px;
      text-align:center;
    ">
      A supporter has ended their paid subscription
    </p>

    <!-- Info Card -->
    <div style="
      margin:0 0 28px;
      padding:20px;
      background:#f9fafb;
      border-radius:12px;
      border:1px solid #e5e7eb;
      text-align:center;
    ">
      <div style="
        font-size:15px;
        color:#111827;
        line-height:1.6;
      ">
        <strong>${subscriberName || "Someone"}</strong> has canceled their
        <strong>paid subscription</strong>.
      </div>

      <div style="
        font-size:13px;
        color:#6b7280;
        margin-top:10px;
        line-height:1.6;
      ">
        They will no longer be billed and will lose access to paid content at the end of their billing period.
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:32px 0;">
      <a
        href="https://themessyattic.com/community"
        target="_blank"
        style="
          background:#7bed9f;
          color:#000000;
          padding:14px 38px;
          border-radius:10px;
          text-decoration:none;
          font-weight:700;
          font-size:14px;
          display:inline-block;
        "
      >
        View your community
      </a>
    </div>

    <!-- Footer -->
    <div style="
      margin-top:36px;
      padding-top:20px;
      border-top:1px solid #f1f5f9;
      text-align:center;
      font-size:13px;
      color:#6b7280;
      line-height:1.6;
    ">
      You can review subscribers and earnings in your dashboard.
      <br/>
      <span style="display:inline-block;margin-top:8px;">
        — The Messy Attic
      </span>
    </div>

  </div>
</div>
`;

  await sendOutLookMail({
    to,
    subject: "A paid subscriber canceled",
    html,
  });
}

export async function getSubscribersByAuthorId(authorUserId) {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
      SELECT
        u.id,
        u.name,
        u.username,
        u.profile_image_url,

        s.paid_subscription AS has_subscription,

        CASE
          WHEN ap.user_id IS NOT NULL THEN 1
          ELSE 0
        END AS has_profile

      FROM author_subscriptions s
      JOIN users u
        ON u.id = s.subscriber_user_id
      LEFT JOIN author_profiles ap
        ON ap.user_id = u.id
      WHERE s.author_user_id = ?
        AND s.deleted_at IS NULL
      ORDER BY s.created_at DESC
      `,
      [authorUserId],
    );

    return rows;
  } catch (err) {
    console.error("getSubscribersByAuthorId error:", err);
    throw err;
  }
}

// PAID SUBSCRIPTIONS

export async function authorHasPaidSubscription(authorUserId) {
  try {
    const db = connect();

    const [[row]] = await db.query(
      `
      SELECT
        p.subscriptions_enabled,
        p.monthly_price_cents,
        p.annual_price_cents,
        p.vip_price_cents,
        u.stripe_connect_account_id
      FROM author_profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
      LIMIT 1
      `,
      [authorUserId],
    );

    if (!row) return false;

    const hasAnyPaidPrice =
      (row.monthly_price_cents && row.monthly_price_cents > 0) ||
      (row.annual_price_cents && row.annual_price_cents > 0) ||
      (row.vip_price_cents && row.vip_price_cents > 0);

    return (
      row.subscriptions_enabled === 1 &&
      hasAnyPaidPrice &&
      !!row.stripe_connect_account_id
    );
  } catch (err) {
    console.error("authorHasPaidSubscription error:", err);
    throw err;
  }
}

export async function subscriberHasPaidSubscription({
  authorUserId,
  subscriberUserId,
}) {
  const db = connect();

  const [[row]] = await db.query(
    `
    SELECT id
    FROM author_subscriptions
    WHERE author_user_id = ?
      AND subscriber_user_id = ?
      AND paid_subscription = 1
      AND deleted_at IS NULL
      AND (
        cancel_at_period_end = 0
        OR (cancel_at_period_end = 1 AND current_period_end > NOW())
      )
      AND (
        current_period_end IS NULL
        OR current_period_end > NOW()
      )
    LIMIT 1
    `,
    [authorUserId, subscriberUserId],
  );

  return !!row;
}

export async function hasAuthorSubscription({
  authorUserId,
  subscriberUserId,
}) {
  const db = connect();

  const [[row]] = await db.query(
    `
    SELECT 1
    FROM author_subscriptions
    WHERE author_user_id = ?
      AND subscriber_user_id = ?
      AND deleted_at IS NULL
    LIMIT 1
    `,
    [authorUserId, subscriberUserId],
  );

  return !!row;
}

// Cancel Subscription
export async function markSubscriptionCanceling({ id, currentPeriodEnd }) {
  const db = connect();

  await db.query(
    `
    UPDATE author_subscriptions
    SET
      cancel_at_period_end = 1,
      current_period_end = ?
    WHERE id = ?
    `,
    [currentPeriodEnd, id],
  );
}

export async function getAuthorSubscriptionByUsers({
  authorUserId,
  subscriberUserId,
}) {
  try {
    const db = connect();

    const [[row]] = await db.query(
      `
      SELECT
        id,
        author_user_id,
        subscriber_user_id,
        paid_subscription,
        stripe_subscription_id,
        billing_interval,
        type,
        current_period_end,
        deleted_at
      FROM author_subscriptions
      WHERE author_user_id = ?
        AND subscriber_user_id = ?
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [authorUserId, subscriberUserId],
    );

    return row || null;
  } catch (err) {
    console.error("getAuthorSubscriptionByUsers error:", err);
    throw err;
  }
}

export async function finalizeCanceledSubscription({
  stripeSubscriptionId,
  currentPeriodEnd,
}) {
  const db = connect();

  await db.query(
    `
    UPDATE author_subscriptions
    SET
      deleted_at = NOW(),
      current_period_end = FROM_UNIXTIME(?)
    WHERE stripe_subscription_id = ?
    `,
    [currentPeriodEnd, stripeSubscriptionId],
  );
}

export async function handleAuthorSubscriptionUpdated(subscription) {
  try {
    const db = connect();

    await db.query(
      `
      UPDATE author_subscriptions
      SET
        cancel_at_period_end = ?,
        current_period_end = FROM_UNIXTIME(?),
        last_activity_at = NOW()
      WHERE stripe_subscription_id = ?
        AND deleted_at IS NULL
      `,
      [
        subscription.cancel_at_period_end ? 1 : 0,
        subscription.current_period_end,
        subscription.id,
      ],
    );

    console.log(
      subscription.cancel_at_period_end
        ? "⏳ Subscription set to cancel at period end"
        : "🔁 Subscription cancellation reversed",
      subscription.id,
    );
  } catch (err) {
    console.error("❌ handleAuthorSubscriptionUpdated failed", err);
    throw err;
  }
}

// get All users Subscriptiuons they are subcribed to
export async function getMyAuthorSubscriptions(subscriberUserId) {
  const db = connect();

  try {
    const [rows] = await db.query(
      `
      SELECT
        s.id,
        s.author_user_id,
        s.subscriber_user_id,

        s.paid_subscription,
        s.type,
        s.billing_interval,
        s.current_period_end,
        s.cancel_at_period_end,
        s.created_at,

        u.name AS author_name,
        u.username AS author_username,
        u.profile_image_url AS author_image_url

      FROM author_subscriptions s
      JOIN users u
        ON u.id = s.author_user_id

      WHERE s.subscriber_user_id = ?
        AND s.deleted_at IS NULL

      ORDER BY s.created_at DESC
      `,
      [subscriberUserId],
    );

    return rows;
  } catch (err) {
    console.error("❌ getMyAuthorSubscriptions error", err);
    throw err;
  }
}
