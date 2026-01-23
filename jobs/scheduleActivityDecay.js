import { activityQueue } from "../queues/activityQueue.js";

export async function scheduleWeeklyActivityDecay() {
  await activityQueue.add(
    "weekly-decay",
    {},
    {
      jobId: "weekly-activity-decay", // ✅ prevents duplicates
      repeat: {
        cron: "0 3 * * 1",
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );

  console.log("📅 Weekly activity decay scheduled");
}
