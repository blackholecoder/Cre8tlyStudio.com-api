import express from "express";
import {
  acceptSubscriptionInvite,
  authorHasPaidSubscription,
  cancelSubscriptionInvite,
  createSubscriptionInvites,
  getAuthorSubscriptionByUsers,
  getMyAuthorSubscriptions,
  getMySubscribers,
  getPendingInvites,
  getSubscribersByAuthorId,
  getSubscriptionInviteByToken,
  isSubscribedToAuthor,
  removeSubscriber,
  resendSubscriptionInvite,
  subscriberHasPaidSubscription,
  subscribeToAuthor,
  unsubscribeFromAuthor,
} from "../../../db/community/subscriptions/dbSubscribers.js";
import { authenticateToken } from "../../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:authorUserId/subscribe", authenticateToken, async (req, res) => {
  try {
    const { authorUserId } = req.params;
    const subscriberUserId = req.user.id;

    const result = await subscribeToAuthor(authorUserId, subscriberUserId);

    res.json(result);
  } catch (err) {
    console.error("Subscribe route error:", err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * Unsubscribe
 */
router.delete(
  "/:authorUserId/subscribe",
  authenticateToken,
  async (req, res) => {
    try {
      const { authorUserId } = req.params;
      const subscriberUserId = req.user.id;

      const result = await unsubscribeFromAuthor(
        authorUserId,
        subscriberUserId,
      );

      res.json(result);
    } catch (err) {
      console.error("Unsubscribe route error:", err);
      res.status(400).json({ error: err.message });
    }
  },
);

/**
 * Subscription state (for post UI)
 */

router.get("/:authorUserId/status", authenticateToken, async (req, res) => {
  try {
    const { authorUserId } = req.params;
    const subscriberUserId = req.user.id;

    const subscribed = await isSubscribedToAuthor(
      authorUserId,
      subscriberUserId,
    );

    const hasPaidSubscription = await authorHasPaidSubscription(authorUserId);
    // 👆 LEAVE THIS EXACTLY AS IS (author offers paid)

    const subscriberHasPaid = await subscriberHasPaidSubscription({
      authorUserId,
      subscriberUserId,
    });

    res.json({
      subscribed,
      has_paid_subscription: hasPaidSubscription, // 👈 DO NOT CHANGE
      subscriber_has_paid: subscriberHasPaid, // 👈 NEW FIELD
    });
  } catch (err) {
    console.error("Subscription status route error:", err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * Subscriber count (My Posts)
 */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const subscribers = await getMySubscribers(req.user.id);

    res.json({
      count: subscribers.length,
      updated_at: new Date().toISOString(),
      subscribers: subscribers.map((s) => ({
        id: s.id,
        email: s.email,
        profile_image_url: s.profile_image_url,
        has_profile: !!s.has_profile,
        paid: s.paid_subscription === 1,
        type: s.type ?? "Free",
        activity: s.activity, // ✅ ADD THIS
        created_at: s.created_at, // ✅ KEEP RAW DATE
        revenue: Number(s.revenue || 0),
      })),
    });
  } catch (err) {
    console.error("GET /subscriptions/me error:", err);
    res.status(400).json({ error: err.message });
  }
});

// Get all Users subscribers they are subscribed to
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const subscriberUserId = req.user.id;

    const subscriptions = await getMyAuthorSubscriptions(subscriberUserId);

    res.json({ subscriptions });
  } catch (err) {
    console.error("❌ Failed to fetch my subscriptions", err);
    res.status(500).json({ error: "Failed to load subscriptions" });
  }
});

router.delete("/:subscriberUserId", authenticateToken, async (req, res) => {
  try {
    const { subscriberUserId } = req.params;

    const result = await removeSubscriber(req.user.id, subscriberUserId);

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/invites", authenticateToken, async (req, res) => {
  try {
    const { emails } = req.body;

    if (!Array.isArray(emails)) {
      console.warn("⚠️ Invalid emails payload", { emails });
      return res.status(400).json({ error: "Emails array required" });
    }

    const invites = await createSubscriptionInvites(req.user.id, emails);

    console.log("✅ Invites created", {
      count: invites.length,
    });

    res.json({ invites });
  } catch (err) {
    console.error("❌ Invite route error", {
      message: err.message,
      stack: err.stack,
    });
    res.status(400).json({ error: err.message });
  }
});
/**
 * Get pending invites
 */
router.get("/invites", authenticateToken, async (req, res) => {
  try {
    const invites = await getPendingInvites(req.user.id);
    res.json({ invites });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/invites/:token", async (req, res) => {
  try {
    const invite = await getSubscriptionInviteByToken(req.params.token);

    if (!invite) {
      return res.status(404).json({ error: "Invite not found or expired" });
    }

    res.json({
      invite,
      requires_auth: true,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/invites/:token/accept", authenticateToken, async (req, res) => {
  try {
    const invite = await acceptSubscriptionInvite(
      req.params.token,
      req.user.id,
    );

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/invites/:id", authenticateToken, async (req, res) => {
  try {
    await cancelSubscriptionInvite(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/invites/:id/resend", authenticateToken, async (req, res) => {
  try {
    const invite = await resendSubscriptionInvite(req.params.id, req.user.id);

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/all-user-subscribers", authenticateToken, async (req, res) => {
  try {
    const authorUserId = req.user.id;

    const subscribers = await getSubscribersByAuthorId(authorUserId);

    res.json({
      success: true,
      subscribers,
    });
  } catch (err) {
    console.error("Failed to load subscribers", err);
    res.status(500).json({
      success: false,
      message: "Failed to load subscribers",
    });
  }
});

router.get(
  "/authors/:authorUserId/subscribers",
  authenticateToken,
  async (req, res) => {
    try {
      const subscribers = await getSubscribersByAuthorId(
        req.params.authorUserId,
      );

      res.json({ success: true, subscribers });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Failed to load subscribers",
      });
    }
  },
);

// Cancel Subscription
router.post(
  "/subscriptions/:authorUserId/cancel",
  authenticateToken,
  async (req, res) => {
    try {
      const subscriberUserId = req.user.id;
      const { authorUserId } = req.params;

      const subscription = await getAuthorSubscriptionByUsers({
        authorUserId,
        subscriberUserId,
      });

      if (!subscription || !subscription.stripe_subscription_id) {
        return res.status(404).json({ error: "Subscription not found" });
      }

      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      // Stripe will emit customer.subscription.updated
      // Webhook will update DB

      res.json({ success: true });
    } catch (err) {
      console.error("Cancel subscription error", err);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  },
);

export default router;
