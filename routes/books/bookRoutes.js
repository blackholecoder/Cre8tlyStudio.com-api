import express from "express";
import { authenticateToken, requireAdmin } from "../../middleware/authMiddleware.js";
import {
  createBook,
  markBookComplete,
  getBooksByUser,
  getAllBooks,
  getBookById,
  getBookParts,
  updateBookInfo,
  getBookTypeById,
} from "../../db/book/dbBooks.js";
import { enforcePageLimit, processBookPrompt, validateBookPromptInput } from "../../db/book/dbCreateBookPrompt.js";

const router = express.Router();

// ✅ Create empty book slot
router.post("/", authenticateToken, async (req, res) => {
  try {
    
    const { title, authorName, bookType } = req.body;
    const result = await createBook(req.user.id, null, title, authorName, bookType);
    res.status(201).json(result);
  } catch (err) {
    console.error("Book create error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Fetch all user books
router.get("/", authenticateToken, async (req, res) => {
  try {
    const rows = await getBooksByUser(req.user.id);
    res.json(rows);
  } catch (err) {
    console.error("Book fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Fetch all books (admin)
router.get("/all", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rows = await getAllBooks();
    res.json(rows);
  } catch (err) {
    console.error("Admin fetch books error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Mark completed
router.post("/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;
    const { pdfUrl } = req.body;
    await markBookComplete(id, pdfUrl);
    res.json({ success: true });
  } catch (err) {
    console.error("Book complete error:", err);
    res.status(400).json({ error: "Failed to update book" });
  }
});

// ✅ Fetch single book
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const book = await getBookById(req.params.id, req.user.id); // ✅ include userId check
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json(book);
  } catch (err) {
    console.error("❌ Error fetching book:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Generate book with GPT + PDF
router.post("/prompt", authenticateToken, async (req, res) => {
  try {
    const {
      bookId,
      prompt,
      pages = 10,
      link,
      coverImage,
      title,
      authorName,
      bookName, 
      partNumber = 1,
      bookType,
    } = req.body;

    const userId = req.user.id;

    // ✅ Step 1: Validate user input
    const validationError = validateBookPromptInput(bookId, prompt);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // ✅ Step 2: Enforce per-book page limit
    const limitCheck = await enforcePageLimit(userId, bookId, pages);
    if (limitCheck?.error) {
      return res.status(limitCheck.status).json({ message: limitCheck.error });
    }

    // ✅ Step 3: Update book info (clean helper, no SQL in route)
    try {
      await updateBookInfo(
        bookId,
        userId,
        title || bookName,
        authorName,
        bookType
      );
    } catch (err) {
      console.error("⚠️ Book info update failed:", err.message);
      // non-fatal — we continue generation
    }


    // ✅ Step 3: Process and generate the new book part
    const generated = await processBookPrompt({
      userId,
      bookId,
      prompt,
      pages,
      link,
      coverImage,
      title,
      authorName,
      bookName, 
      partNumber,
      bookType,
    });



    res.json(generated);
  } catch (err) {
    console.error("❌ ERROR in /books/prompt route:", err);
    res.status(500).json({ message: "Failed to process book prompt" });
  }
});

router.get("/:bookId/parts", authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;

    const parts = await getBookParts(bookId, userId);
    res.json(parts);
  } catch (err) {
    console.error("❌ Error fetching book parts:", err);
    res.status(500).json({ message: "Failed to load book parts" });
  }
});

router.put("/update-info/:id", authenticateToken, async (req, res) => {
  try {
    const { title, authorName, bookType } = req.body; // ✅ match camelCase
    console.log("📘 API HIT BOOK TYPE:", bookType);

    await updateBookInfo(req.params.id, req.user.id, title, authorName, bookType);
    res.json({ success: true });
  } catch (err) {
    console.error("Book info update failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});



export default router;
