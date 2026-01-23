import { Queue } from "bullmq";
import redis from "../lib/redis.js";

export const activityQueue = new Queue("activity-decay", {
  connection: redis,
});
