import { Worker } from "bullmq";
import redis from "../lib/redis.js";
import { decayInactiveSubscriberActivity } from "../db/community/subscriptions/dbSubscribers.js";

export const activityWorker = new Worker(
  "activity-decay",
  async () => {
    console.log("🕒 Running weekly activity decay job");

    const affected = await decayInactiveSubscriberActivity();

    return {
      decayed: affected,
      ranAt: new Date().toISOString(),
    };
  },
  {
    connection: redis,
  },
);

activityWorker.on("completed", (job) => {
  console.log("✅ Activity decay completed", job.returnvalue);
});

activityWorker.on("failed", (job, err) => {
  console.error("❌ Activity decay failed", err);
});
