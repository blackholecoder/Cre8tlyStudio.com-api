import { getUserById } from "../db/dbUser.js";

export async function requireAuthorsAssistantSubscription(req, res, next) {
  const user = await getUserById(req.user.id);

  if (
    user.subscription_status !== "active" ||
    !user.subscription_current_period_end ||
    new Date(user.subscription_current_period_end) < new Date()
  ) {
    return res.status(403).json({
      success: false,
      message: "Author’s Assistant subscription required",
    });
  }

  next();
}
