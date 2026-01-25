import redis from "../lib/redis.js";

const WINDOW_SECONDS = 10 * 60; // 10 minutes
const MAX_ATTEMPTS = 3;

export async function checkTestEmailRateLimit(userId) {
  const key = `rate:test-email:${userId}`;

  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }

  if (current > MAX_ATTEMPTS) {
    const ttl = await redis.ttl(key);

    return {
      allowed: false,
      retryAfterSeconds: ttl > 0 ? ttl : WINDOW_SECONDS,
    };
  }

  return { allowed: true };
}
