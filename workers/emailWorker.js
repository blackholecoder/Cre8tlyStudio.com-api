import { Worker } from "bullmq";
import redis from "../lib/redis.js";
import { sendCommunityInviteEmail } from "../db/community/subscriptions/dbSubscribers.js";

new Worker(
  "email-queue",
  async (job) => {
    try {
      const { type, payload } = job.data;

      console.log("📧 Processing job", job.id, type);

      if (type === "community-invite") {
        await sendCommunityInviteEmail(payload);
      }
    } catch (err) {
      console.error("❌ Email job failed", job.id, err);

      // IMPORTANT:
      // rethrow so BullMQ knows the job failed
      // this allows retries / failure tracking
      throw err;
    }
  },
  {
    connection: redis,
  },
);

console.log("📨 Email worker running");
