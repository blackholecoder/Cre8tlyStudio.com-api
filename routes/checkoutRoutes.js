import express from "express";
import { createCheckout } from "../services/stripeService.js"



const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { userId, priceId, productType } = req.body;
    const url = await createCheckout({ userId, priceId, productType });
    res.json({ url });
  } catch (err) {
    console.error("Checkout failed:", err.message);
    res.status(400).json({ error: "checkout create failed" });
  }
});

export default router;