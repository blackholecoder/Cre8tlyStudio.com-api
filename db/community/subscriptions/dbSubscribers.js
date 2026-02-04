import { v4 as uuidv4 } from "uuid";
import connect from "../../connect.js";
import { sendOutLookMail } from "../../../utils/sendOutllokMail.js";
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
    <div style="margin-bottom:32px;">
  <table align="center" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td style="padding-right:10px;vertical-align:middle;">
        <img
          src="https://themessyattic.com/themessyattic-logo.png"
          width="36"
          height="36"
          alt="The Messy Attic"
          style="display:block;"
        />
      </td>
      <td style="vertical-align:middle;">
        <div
          style="
            font-size:20px;
            font-weight:700;
            color:#111827;
            line-height:1;
            font-family:Arial,sans-serif;
          "
        >
          The Messy Attic
        </div>
      </td>
    </tr>
  </table>
</div>


    <h2 style="font-size:26px;font-weight:700;color:#111827;margin:8px 0 8px;">
      You’ve been invited
    </h2>

    <p style="font-size:14px;color:#4b5563;margin-bottom:20px;">
      A personal invitation
    </p>

    <p style="font-size:15px;color:#111827;line-height:1.6;margin-bottom:20px;">
  <strong>${authorName}</strong> has personally invited you to join an amazing private community for writers, authors, and readers on The Messy Attic.
</p>

    <p style="font-size:14px;color:#374151;line-height:1.6;margin-bottom:24px;">
      Subscribing lets you follow what they publish and stay connected, without algorithms or noise.
    </p>

    <div style="text-align:center;margin:30px 0;">
      <a
        href="${inviteUrl}"
        target="_blank"
        style="
          background:#7bed9f;
          color:#000;
          padding:14px 36px;
          border-radius:8px;
          text-decoration:none;
          font-weight:700;
        "
      >
        Accept invite
      </a>
    </div>

    <p style="font-size:13px;color:#6b7280;text-align:center;">
      If you don’t have an account yet, you’ll be prompted to create one first.
    </p>

    <p style="font-size:13px;color:#6b7280;text-align:center;margin-top:12px;">
      — The Messy Attic
    </p>
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
    <!-- Brand -->
    <div style="margin-bottom:32px;">
      <table align="center" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="padding-right:10px;vertical-align:middle;">
            <img
              src="https://themessyattic.com/themessyattic-logo.png"
              width="36"
              height="36"
              alt="The Messy Attic"
              style="display:block;"
            />
          </td>
          <td style="vertical-align:middle;">
            <div style="
              font-size:20px;
              font-weight:700;
              color:#111827;
              line-height:1;
            ">
              The Messy Attic
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Heading -->
    <h2 style="font-size:26px;font-weight:700;color:#111827;margin:8px 0;">
      New subscriber
    </h2>

    <p style="font-size:14px;color:#4b5563;margin-bottom:20px;">
      Your community is growing
    </p>

    <!-- Body -->
    <p style="font-size:15px;color:#111827;line-height:1.6;margin-bottom:20px;">
      <strong>${subscriberName || "Someone"}</strong> just subscribed to your community on The Messy Attic.
    </p>

    <p style="font-size:14px;color:#374151;line-height:1.6;margin-bottom:24px;">
      They’ll now see what you publish and can take part in discussions when you share new posts.
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin:30px 0;">
      <a
        href="https://themessyattic.com/community"
        target="_blank"
        style="
          background:#7bed9f;
          color:#000;
          padding:14px 36px;
          border-radius:8px;
          text-decoration:none;
          font-weight:700;
          display:inline-block;
        "
      >
        View your community
      </a>
    </div>

    <!-- Footer -->
    <p style="font-size:13px;color:#6b7280;text-align:center;">
      You can manage subscribers and notifications from your dashboard.
    </p>

    <p style="font-size:13px;color:#6b7280;text-align:center;margin-top:12px;">
      — The Messy Attic
    </p>
  </div>
</div>
`;

  await sendOutLookMail({
    to,
    subject: "You have a new subscriber on The Messy Attic",
    html,
  });
}

export async function sendFreeUnsubscribedEmail({ to, subscriberName }) {
  if (!to) {
    throw new Error("No email recipient provided to sendFreeUnsubscribedEmail");
  }

  const html = `
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
    <!-- Brand -->
    <div style="margin-bottom:32px;">
      <table align="center" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="padding-right:10px;vertical-align:middle;">
            <img
              src="https://themessyattic.com/themessyattic-logo.png"
              width="36"
              height="36"
              alt="The Messy Attic"
              style="display:block;"
            />
          </td>
          <td style="vertical-align:middle;">
            <div style="
              font-size:20px;
              font-weight:700;
              color:#111827;
              line-height:1;
            ">
              The Messy Attic
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Heading -->
    <h2 style="font-size:26px;font-weight:700;color:#111827;margin:8px 0;">
      Subscriber left
    </h2>

    <p style="font-size:14px;color:#4b5563;margin-bottom:20px;">
      A free subscription was canceled
    </p>

    <!-- Body -->
    <p style="font-size:15px;color:#111827;line-height:1.6;margin-bottom:20px;">
      <strong>${subscriberName || "Someone"}</strong> has unsubscribed from your community.
    </p>

    <p style="font-size:14px;color:#374151;line-height:1.6;margin-bottom:24px;">
      No action is needed. They simply won’t receive future posts or updates unless they resubscribe.
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin:30px 0;">
      <a
        href="https://themessyattic.com/community"
        target="_blank"
        style="
          background:#7bed9f;
          color:#000;
          padding:14px 36px;
          border-radius:8px;
          text-decoration:none;
          font-weight:700;
          display:inline-block;
        "
      >
        View your community
      </a>
    </div>

    <!-- Footer -->
    <p style="font-size:13px;color:#6b7280;text-align:center;">
      You can manage notifications from your dashboard.
    </p>

    <p style="font-size:13px;color:#6b7280;text-align:center;margin-top:12px;">
      — The Messy Attic
    </p>
  </div>
</div>
`;

  await sendOutLookMail({
    to,
    subject: "A subscriber unsubscribed from your community",
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
        u.stripe_connect_account_id
      FROM author_profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
      LIMIT 1
      `,
      [authorUserId],
    );

    if (!row) return false;

    return (
      row.subscriptions_enabled === 1 &&
      (row.monthly_price_cents > 0 || row.annual_price_cents > 0) &&
      !!row.stripe_connect_account_id
    );
  } catch (err) {
    console.error("authorHasPaidSubscription error:", err);
    throw err;
  }
}
