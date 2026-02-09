import { Worker } from "bullmq";

import redis from "../lib/redis.js";
import connect from "../db/connect.js";
import { sendNewFragmentEmail } from "../emails/sendNewFragmentEmail.js";

new Worker(
  "fragment-email",
  async (job) => {
    const { authorUserId, authorName, fragmentBody, fragmentUrl } = job.data;

    const db = connect();

    const rawText = fragmentBody
      ? fragmentBody.replace(/<[^>]*>?/gm, "").trim()
      : "";

    const excerpt =
      rawText.length > 160 ? rawText.slice(0, 160) + "…" : rawText;

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
      await sendNewFragmentEmail({
        to: row.email,
        authorName,
        excerpt,
        fragmentUrl,
      });
    }
  },
  {
    connection: redis,
    concurrency: 3,
  },
);

console.log("📨 Fragment email worker running");
