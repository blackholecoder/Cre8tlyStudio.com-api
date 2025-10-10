import express from "express";
import stripe from "stripe";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const stripeClient = stripe(STRIPE_SECRET);

router.post("/pro-covers", authenticateToken, async (req, res) => {
  try {
    const session = await stripeClient.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Cre8tlyStudio Pro Covers Upgrade",
            },
            unit_amount: 12000, // $120.00 one-time fee
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/dashboard?upgrade=success`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard?upgrade=cancelled`,

      // ✅ Important: identify this session explicitly for your webhook
      metadata: {
        product_type: "pro_covers",
        user_id: req.user.id,
        email: req.user.email,
      },

      // ✅ Optional for invoices & receipts
      customer_email: req.user.email,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe session error:", err);
    res.status(500).json({ message: "Failed to create Stripe session" });
  }
});

export default router;
