import express from "express";
import { createEbook, deleteEbook, getEbooks, updateEbook } from "../../db/dbEbooks.js";
import { requireAdmin } from "../../middleware/authMiddleware.js";


const router = express.Router();

// Get all ebooks (for public or admin dashboard)
router.get("/", requireAdmin, async (req, res) => {
  try {
    const ebooks = await getEbooks();
    res.json(ebooks);
  } catch (err) {
    console.error("Ebooks fetch failed:", err.message);
    res.status(400).json({ error: "Failed to load ebooks" });
  }
});

// Create a new ebook (admin)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { title, description, price, imageBase64, productType } = req.body;
    const result = await createEbook({ title, description, price, color, imageBase64, productType });
    res.json(result);
  } catch (err) {
    console.error("Ebook creation failed:", err.message);
    res.status(400).json({ error: "Failed to create ebook" });
  }
});

// Delete an ebook (admin)
router.delete("/", requireAdmin, async (req, res) => {
  try {
    const { ebookId } = req.body;
    const result = await deleteEbook(ebookId);
    res.json(result);
  } catch (err) {
    console.error("Ebook deletion failed:", err.message);
    res.status(400).json({ error: "Failed to delete ebook" });
  }
});

router.put("/", requireAdmin, async (req, res) => {
  try {
    const { id, title, description, price } = req.body;
    const result = await updateEbook({ id, title, description, price, color });
    res.json(result);
  } catch (err) {
    console.error("Ebook update failed:", err.message);
    res.status(400).json({ error: "Failed to update ebook" });
  }
});


// router.post("/test-ebook-sale", async (req, res) => {
//   try {
//     const { email, productType } = req.body;

//     if (!email || !productType) {
//       return res.status(400).json({ error: "Missing email or productType" });
//     }

//     const result = await simulateEbookSale({ email, productType });
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ error: "Failed to simulate ebook sale" });
//   }
// });

export default router;

