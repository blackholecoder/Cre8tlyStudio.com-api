import express from "express";
import { createEbookCheckout } from "../../db/ebookCheckout/dbEbookCheckout.js";




const router = express.Router();

// ✅ Dynamic checkout for ebooks
router.post("/", async (req, res) => {
  try {
    const { userId, title, description, price, productType } = req.body;

    // ✅ Allow guests — userId can be null
    if (!title || !price || !productType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const session = await createEbookCheckout({
      userId: userId || null, // pass null if guest
      title,
      price,
      description,
      productType,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Ebook checkout failed:", err);
    res.status(400).json({ error: "Failed to create checkout session" });
  }
});


export default router

