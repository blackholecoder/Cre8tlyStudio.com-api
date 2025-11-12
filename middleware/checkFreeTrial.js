export async function checkFreeTrial(req, res, next) {
  const db = await connect();
  const [rows] = await db.query(
    "SELECT has_free_magnet, free_trial_expires_at FROM users WHERE id = ?",
    [req.user.id]
  );
  const user = rows[0];
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.has_free_magnet) {
    const expired = new Date() > new Date(user.free_trial_expires_at);
    if (expired) {
      return res.status(403).json({
        success: false,
        message: "Your free 7-day trial has expired. Please upgrade to continue.",
      });
    }
  }
  next();
}