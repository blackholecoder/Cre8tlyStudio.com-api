import express from "express";
import { createCheckout } from "../services/stripeService.js"



const router = express.Router();

router.post("/", async (req, res) => {
  console.log("API HIT FROM BACKEDN CRE8TLY CHECKOUT")
  try {
    const { userId, priceId } = req.body;
    const url = await createCheckout({ userId, priceId });
    res.json({ url });
  } catch (err) {
    console.error("Checkout failed:", err.message);
    res.status(400).json({ error: "checkout create failed" });
  }
});

export default router;