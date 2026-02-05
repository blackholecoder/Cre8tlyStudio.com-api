import { v4 as uuidv4 } from "uuid";
import connect from "./connect.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function getAllUsers(page = 1, limit = 20) {
  const db = connect();
  const offset = (page - 1) * limit;

  const [[countRow]] = await db.query(`SELECT COUNT(*) AS total FROM users`);

  const [rows] = await db.query(
    `
  SELECT id, name, email, role, created_at
  FROM users
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?;
`,
    [limit, offset],
  );
  return { users: rows, total: countRow.total };
}

export async function deleteUserById(userId) {
  const db = connect();

  try {
    // 1️⃣ Verify user exists
    const [rows] = await db.query("SELECT id, email FROM users WHERE id = ?", [
      userId,
    ]);
    if (rows.length === 0) throw new Error("User not found");

    const user = rows[0];

    // 2️⃣ Delete all lead magnet slots for this user
    const [slotsResult] = await db.query(
      "DELETE FROM lead_magnets WHERE user_id = ?",
      [userId],
    );
    console.log(
      `🧹 Deleted ${slotsResult.affectedRows} lead magnet slots for user ${user.email}`,
    );

    // 3️⃣ Delete the user record
    const [result] = await db.query("DELETE FROM users WHERE id = ?", [userId]);

    return {
      success: true,
      message: `User ${user.email} and all associated lead magnet slots deleted successfully`,
      deletedSlots: slotsResult.affectedRows,
      result,
    };
  } catch (err) {
    console.error("❌ Error deleting user and slots:", err);
    throw err;
  }
}

// Stripe Access Backfill
export async function repairAuthorSubscription(stripeSubscriptionId) {
  const db = connect();

  // 1️⃣ Fetch subscription from Stripe
  const subscription =
    await stripe.subscriptions.retrieve(stripeSubscriptionId);

  const authorUserId = subscription.metadata?.author_user_id;
  const subscriberUserId = subscription.metadata?.subscriber_user_id;

  if (!authorUserId || !subscriberUserId) {
    throw new Error("Subscription missing author or subscriber metadata");
  }

  // 2️⃣ Determine billing interval
  let billingInterval = null;
  const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;

  if (interval === "month") billingInterval = "monthly";
  if (interval === "year") billingInterval = "yearly";

  // 3️⃣ Look up EXISTING row by UNIQUE KEY (author + subscriber)
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

  // 4️⃣ UPDATE if exists
  if (existing) {
    await db.query(
      `
      UPDATE author_subscriptions
      SET
        paid_subscription = 1,
        stripe_customer_id = ?,
        stripe_subscription_id = ?,
        billing_interval = ?,
        current_period_end = FROM_UNIXTIME(?),
        deleted_at = NULL,
        last_activity_at = NOW()
      WHERE id = ?
      `,
      [
        subscription.customer,
        stripeSubscriptionId,
        billingInterval,
        subscription.current_period_end,
        existing.id,
      ],
    );

    return {
      repaired: true,
      updated: true,
      id: existing.id,
    };
  }

  // 5️⃣ INSERT only if relationship does NOT exist
  const id = uuidv4();

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
      ?, ?, ?, 1, ?, ?, ?, FROM_UNIXTIME(?), NOW(), NOW()
    )
    `,
    [
      id,
      authorUserId,
      subscriberUserId,
      subscription.customer,
      stripeSubscriptionId,
      billingInterval,
      subscription.current_period_end,
    ],
  );

  return {
    repaired: true,
    created: true,
    id,
  };
}
