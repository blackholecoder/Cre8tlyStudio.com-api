import express from "express";
import {
  authenticateToken,
  requireAdmin,
} from "../../middleware/authMiddleware.js";
import {
  createBook,
  markBookComplete,
  getBooksByUser,
  getAllBooks,
  getBookById,
  getBookParts,
  updateBookInfo,
  markBookOnboardingComplete,
  resetBookOnboarding,
  saveBookDraft,
  getBookDraft,
  saveBookPartDraft,
  getBookPartByNumber,
  lockBookPartEdit,
  updateEditedChapter,
  getBookPartDraft,
} from "../../db/book/dbBooks.js";
import {
  enforcePageLimit,
  processBookPrompt,
  validateBookPromptInput,
} from "../../db/book/dbCreateBookPrompt.js";

const router = express.Router();

const MAX_CHAPTER_WORDS = 3000;

function getWordCount(text = "") {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
}

// ✅ Create empty book slot
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { bookName, authorName, bookType } = req.body;
    const result = await createBook(
      req.user.id,
      null,
      bookName,
      authorName,
      bookType
    );
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
      sections,
      pages = 10,
      link,
      coverImage,
      title,
      authorName,
      bookName,
      partNumber = 1,
      bookType,
      font_name = "Montserrat",
      font_file = "/fonts/Montserrat-Regular.ttf",
      isEditing = false,
    } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ message: "Invalid chapter content" });
    }

    let totalWords = 0;

    if (Array.isArray(sections) && sections.length > 0) {
      totalWords = sections.reduce(
        (sum, s) => sum + getWordCount(s.content || ""),
        0
      );
    } else {
      totalWords = getWordCount(prompt);
    }

    if (totalWords > MAX_CHAPTER_WORDS) {
      return res.status(400).json({
        message: `Chapter exceeds the maximum allowed length. 
${totalWords.toLocaleString()} words provided, limit is ${MAX_CHAPTER_WORDS.toLocaleString()} words.
Please split this into another chapter.`,
      });
    }

    const userId = req.user.id;

    const existingPart = await getBookPartByNumber(bookId, partNumber, userId);

    if (isEditing) {
      if (!existingPart || existingPart.can_edit !== 1) {
        return res.status(403).json({
          error: "This chapter has already been edited and is now locked.",
        });
      }

      // ✏️ --- EDIT MODE: Save edited text ONLY, no GPT ---
      const updatedUrl = await updateEditedChapter({
        bookId,
        userId,
        partNumber,
        editedText: prompt,
        title,
        bookName,
        authorName,
        font_name,
        font_file,
      });

      return res.json({
        message: "Chapter edited successfully",
        fileUrl: updatedUrl,
        partNumber,
      });
    }

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
      await updateBookInfo(bookId, userId, bookName, authorName, bookType);
    } catch (err) {
      console.error("⚠️ Book info update failed:", err.message);
      // non-fatal — we continue generation
    }

    // ✅ Step 3: Process and generate the new book part
    const generated = await processBookPrompt({
      userId,
      bookId,
      prompt,
      sections,
      pages,
      link,
      coverImage,
      title,
      authorName,
      bookName,
      partNumber,
      bookType,
      font_name, // ✅ include in payload
      font_file,
      isEditing,
    });

    if (isEditing) {
      await lockBookPartEdit(bookId, partNumber, userId);
    }

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
    const { bookName, authorName, bookType } = req.body; // ✅ match camelCase
    console.log("📘 API HIT BOOK TYPE:", bookType);

    await updateBookInfo(
      req.params.id,
      req.user.id,
      bookName,
      authorName,
      bookType
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Book info update failed:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/book-complete", async (req, res) => {
  // console.log("")
  try {
    const { userId } = req.body;
    await markBookOnboardingComplete(userId);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to update onboarding:", err);
    res.status(500).json({ error: "Failed to update onboarding status" });
  }
});

router.post("/onboarding/replay", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await resetBookOnboarding(userId);
    res.json({ success: true, message: "Onboarding reset successfully." });
  } catch (err) {
    console.error("🔥 Error resetting onboarding:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to reset onboarding." });
  }
});

router.post("/draft", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      bookId,
      draftText,
      sections,
      book_name,
      link,
      author_name,
      book_type,
      font_name, // ✅ NEW
      font_file,
    } = req.body;

    const result = await saveBookDraft({
      userId,
      bookId,
      draftText,
      sections,
      book_name,
      link,
      author_name,
      book_type,
      font_name, // ✅ NEW
      font_file,
    });

    if (result.error) {
      return res.status(400).json({ message: result.message });
    }

    res.json(result);
  } catch (err) {
    console.error("Error saving draft:", err);
    res.status(500).json({ message: "Server error while saving draft" });
  }
});

router.get("/draft/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const bookId = req.params.id;
    const draft = await getBookDraft({ userId, bookId });

    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }

    res.json(draft);
  } catch (err) {
    console.error("Error fetching draft:", err);
    res.status(500).json({ message: "Server error while fetching draft" });
  }
});

router.post(
  "/:bookId/part/:partNumber/draft",
  authenticateToken,
  async (req, res) => {
    const { bookId, partNumber } = req.params;
    const { draftText, title, sections } = req.body;
    const userId = req.user.id;

    try {
      const result = await saveBookPartDraft({
        userId,
        bookId,
        partNumber,
        draftText,
        title,
        sections,
      });
      res.json(result);
    } catch (err) {
      console.error("❌ Error saving part draft:", err);
      res.status(500).json({ message: "Failed to save part draft" });
    }
  }
);

router.get(
  "/:bookId/part/:partNumber/draft",
  authenticateToken,
  async (req, res) => {
    const { bookId, partNumber } = req.params;
    const userId = req.user.id;

    try {
      const data = await getBookPartDraft(bookId, partNumber, userId);

      if (!data) {
        return res.status(404).json({ message: "No draft or chapter found" });
      }

      res.json(data);
    } catch (err) {
      console.error("❌ Error loading part draft:", err);
      res.status(500).json({ message: "Failed to load chapter draft" });
    }
  }
);

export default router;
