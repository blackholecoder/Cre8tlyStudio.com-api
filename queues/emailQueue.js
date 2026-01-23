import { Queue } from "bullmq";
import redis from "../lib/redis.js";

export const emailQueue = new Queue("email-queue", {
  connection: redis,
});
