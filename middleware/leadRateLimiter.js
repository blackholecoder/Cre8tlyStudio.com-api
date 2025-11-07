import rateLimit from "express-rate-limit";

export const leadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                   // limit each IP to 5 lead submissions per window
  standardHeaders: true,    // include rate limit info in response headers
  legacyHeaders: false,     // disable deprecated headers
  message: {
    success: false,
    message: "Too many submissions. Please try again later.",
  },
});
