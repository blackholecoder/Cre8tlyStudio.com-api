// queues/postEmailQueue.js
import { Queue } from "bullmq";
import redis from "../lib/redis.js";

export const postEmailQueue = new Queue("post-email", {
  connection: redis,
});
