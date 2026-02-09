import { Queue } from "bullmq";
import redis from "../lib/redis.js";

export const fragmentEmailQueue = new Queue("fragment-email", {
  connection: redis,
});
