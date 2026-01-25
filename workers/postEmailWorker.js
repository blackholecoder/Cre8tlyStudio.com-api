import { Worker } from "bullmq";
import connect from "../db/connect.js";
import redis from "../lib/redis.js";
import { sendNewPostEmail } from "../emails/sendNewPostEmail.js";

new Worker(
  "post-email",
  async (job) => {
    const {
      authorUserId,
      authorName,
      postTitle,
      postBody,
      postImageUrl,
      postUrl,
    } = job.data;

    const db = connect();

    const rawText = postBody ? postBody.replace(/<[^>]*>?/gm, "").trim() : "";

    const excerpt =
      rawText.length > 160 ? rawText.slice(0, 160) + "…" : rawText;

    // Get subscribers
    const [rows] = await db.query(
      `
      SELECT u.email
      FROM author_subscriptions s
      JOIN users u ON u.id = s.subscriber_user_id
      WHERE s.author_user_id = ?
        AND s.deleted_at IS NULL
      `,
      [authorUserId],
    );

    if (!rows.length) return;

    for (const row of rows) {
      await sendNewPostEmail({
        to: row.email,
        authorName,
        postTitle,
        excerpt,
        postImageUrl,
        postUrl,
      });
    }
  },
  {
    connection: redis,
    concurrency: 3,
  },
);

console.log("📨 Post email worker running");
