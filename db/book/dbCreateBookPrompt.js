import connect from "../connect.js";
import { generateBookPDF } from "../../services/generateBookPDF.js";
import { uploadFileToSpaces } from "../../helpers/uploadToSpace.js";
import {
  askBookGPT,
  askBookGPTEducational,
  askBookGPTFiction,
} from "../../helpers/bookGPT.js";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import {
  getLastBookPartText,
  saveBookPartSections,
  saveBookPartText,
} from "./getLastBookPartText.js";
import { getBookTypeById, saveBookPdf } from "./dbBooks.js";
import { normalizePunctuation } from "../../utils/normalizePunctuation.js";

export async function createBookPrompt({
  prompt,
  sections = null,
  pages = 10,
  link,
  coverImage,
  title,
  bookName,
  authorName,
  partNumber = 1,
  bookId = null,
  userId = null,
  bookType,
  font_name = "Montserrat", // ✅ new
  font_file = "/fonts/Montserrat-Regular.ttf", // ✅ new
  isEditing = false,
}) {
  console.log(`✍️ Running Book GPT Engine (Part ${partNumber})...`);
  const db = connect();

  if (
    (!prompt || typeof prompt !== "string" || !prompt.trim()) &&
    (!Array.isArray(sections) || !sections.some((s) => s.content?.trim()))
  ) {
    throw new Error(
      "Either prompt text or section content is required to create a book section"
    );
  }

  // ✅ Generate or reuse Book ID
  const thisBookId = bookId || uuidv4();

  try {
    // ✅ 1. Fetch previous text for continuity
    let previousText = null;
    if (userId && bookId && partNumber > 1) {
      previousText = await getLastBookPartText(bookId, userId);
      if (previousText) {
        console.log("📖 Found previous part text for continuity");
      }
    }

    let resolvedBookType = bookType;
    if (!resolvedBookType) {
      resolvedBookType = await getBookTypeById(thisBookId, userId);
    }

    console.log("BOOK TYPE:", resolvedBookType);

    // ✅ 3. Generate GPT output PER SECTION (authoritative structure)
    const generatedSections = [];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (!section.content?.trim()) continue;

      let sectionOutput = "";

      if (resolvedBookType === "fiction") {
        sectionOutput = await askBookGPTFiction(
          section.content,
          previousText,
          "",
          partNumber
        );
      } else if (resolvedBookType === "non-fiction") {
        sectionOutput = await askBookGPT(
          section.content,
          previousText,
          "",
          partNumber
        );
      } else if (resolvedBookType === "educational") {
        sectionOutput = await askBookGPTEducational(
          section.content,
          previousText,
          "",
          partNumber
        );
      } else {
        sectionOutput = await askBookGPT(
          section.content,
          previousText,
          "",
          partNumber
        );
      }

      sectionOutput = normalizePunctuation(sectionOutput);

      if (!sectionOutput || typeof sectionOutput !== "string") {
        throw new Error(`GPT failed for section ${i + 1}`);
      }

      generatedSections.push({
        title: section.title?.trim() || `Section ${i + 1}`,
        content: sectionOutput.replace(/<h[12][^>]*>.*?<\/h[12]>/gi, "").trim(),
      });

      // 🔁 Continuity moves forward section by section
      previousText = sectionOutput;
    }

    const finalChapterText = generatedSections
      .map((s) => s.content)
      .join("\n\n");

    // ✅ 3. Temporary cover handling
    let tempCoverPath = null;

    if (coverImage) {
      const tmpDir = path.resolve("uploads/tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      // 🟢 Case 1: base64 image
      if (coverImage.startsWith("data:image")) {
        const base64Data = coverImage.replace(/^data:image\/\w+;base64,/, "");
        const extension = coverImage.substring(
          coverImage.indexOf("/") + 1,
          coverImage.indexOf(";")
        );

        tempCoverPath = path.join(tmpDir, `cover_${Date.now()}.${extension}`);
        fs.writeFileSync(tempCoverPath, Buffer.from(base64Data, "base64"));
      }

      // 🟢 Case 2: remote image (Unsplash, CDN, Spaces)
      else if (coverImage.startsWith("http")) {
        const url = new URL(coverImage);
        const ext = path.extname(url.pathname) || ".jpg";

        tempCoverPath = path.join(tmpDir, `cover_${Date.now()}${ext}`);

        const response = await fetch(coverImage);
        if (!response.ok) {
          throw new Error(`Failed to download cover image: ${response.status}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(tempCoverPath, buffer);
      }
    }

    // ✅ 4. Build chapters directly from generated sections
    const chapters = generatedSections.length
      ? generatedSections
      : Array.isArray(sections) && sections.some((s) => s.content?.trim())
      ? sections
          .filter((s) => s.content?.trim())
          .map((s, i) => ({
            title: s.title?.trim() || `Chapter ${partNumber}.${i + 1}`,
            content: s.content.trim(),
          }))
      : [];

    if (!chapters.length) {
      throw new Error("No valid sections were generated for PDF output");
    }

    // ✅ 5. Fallbacks
    let finalTitle = bookName?.trim() || null;
    let finalAuthor = authorName?.trim() || null;

    // ✅ 5a. If missing, pull from DB
    if ((!finalTitle || !finalAuthor) && thisBookId) {
      const [rows] = await db.query(
        `SELECT book_name, author_name FROM generated_books WHERE id = ? AND user_id = ? LIMIT 1`,
        [thisBookId, userId]
      );
      if (rows.length > 0) {
        finalTitle = finalTitle || rows[0].book_name || "Untitled Book";
        finalAuthor = finalAuthor || rows[0].author_name || "Anonymous";
        console.log("🪶 Loaded title/author from DB:", finalTitle, finalAuthor);
      }
    }

    // ✅ 5b. Last-resort fallbacks
    finalTitle =
      finalTitle ||
      (chapters[0]?.title ? chapters[0].title : `Book Part ${partNumber}`);
    finalAuthor = finalAuthor || "Anonymous";

    // ✅ 6. Generate the PDF (DB-provided values always win)
    const { localPdfPath, pageCount } = await generateBookPDF({
      id: `${thisBookId}-part${partNumber}`,
      title: finalTitle,
      author: finalAuthor,
      chapters,
      coverImage: tempCoverPath,
      link,
      partNumber,
      font_name, // ✅ include font info
      font_file,
    });

    // ✅ 7. Upload PDF to Spaces
    const fileName = `books/${thisBookId}_part${partNumber}-${Date.now()}.pdf`;
    const uploaded = await uploadFileToSpaces(
      localPdfPath,
      fileName,
      "application/pdf"
    );

    // ✅ 8. Cleanup temp files
    if (tempCoverPath && fs.existsSync(tempCoverPath))
      fs.unlinkSync(tempCoverPath);
    if (fs.existsSync(localPdfPath)) fs.unlinkSync(localPdfPath);

    // ✅ 9. Save text for continuity

    await saveBookPartText({
      userId,
      bookId: thisBookId,
      partNumber,
      text: finalChapterText,
      can_edit: isEditing ? 0 : 1,
    });

    // new — only if sections were sent
    if (Array.isArray(generatedSections) && generatedSections.length) {
      const gptSections = generatedSections.map((section, index) => ({
        id: `gpt-section-${index + 1}`,
        title: section.title,
        content: section.content,
        source: "gpt", // 👈 THIS IS THE KEY
      }));

      await saveBookPartSections({
        userId,
        bookId: thisBookId,
        partNumber,
        sections: gptSections,
      });
    }

    await db.query(
      `UPDATE generated_books 
       SET font_name = ?, font_file = ?, updated_at = NOW() 
       WHERE id = ? AND user_id = ?`,
      [font_name, font_file, thisBookId, userId]
    );

    // ✅ 10. Return metadata
    return {
      title: finalTitle,
      author: finalAuthor,
      fileUrl: uploaded.Location,
      partNumber,
      bookId: thisBookId,
      gptOutput: finalChapterText,
      actualPages: pageCount || pages,
      font_name,
      font_file,
    };
  } catch (err) {
    console.error("❌ Error creating book part:", err);
    throw err;
  }
}

export function validateBookPromptInput(bookId, prompt) {
  if (!bookId || !prompt) return "bookId and prompt are required";
  if (prompt.length > 2_000_000)
    return "Your input is too long. Please shorten your prompt.";
  return null;
}

/**
 * Check if book exists and hasn’t exceeded its page limit.
 */
export async function enforcePageLimit(userId, bookId, pages) {
  const db = connect();
  const [rows] = await db.query(
    `SELECT pages FROM generated_books WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [bookId, userId]
  );

  if (!rows.length) return { error: "Book not found.", status: 404 };

  const usedPages = rows[0].pages || 0;
  if (usedPages + pages > 750)
    return {
      error: `This book has reached the 750-page limit. (${usedPages}/750 pages used)`,
      status: 403,
    };

  return { usedPages };
}

export async function processBookPrompt({
  userId,
  bookId,
  prompt,
  sections = null,
  pages,
  link,
  coverImage,
  title, // ✅ chapter title
  authorName,
  partNumber,
  bookName, // ✅ book title
  bookType,
  font_name = "Montserrat",
  font_file = "/fonts/Montserrat-Regular.ttf",
}) {
  const db = connect();

  // ✅ Generate content and upload
  const generated = await createBookPrompt({
    userId,
    bookId,
    prompt,
    sections,
    pages,
    link,
    coverImage,
    title, // chapter title
    authorName,
    partNumber,
    bookType,
    font_name,
    font_file,
  });

  const actualPages = generated.actualPages || pages;
  console.log(`📄 Estimated actual pages generated: ${actualPages}`);

  console.log("🧩 Saving part:", { bookId, title, partNumber });

  // ✅ Save file & update page count
  await saveBookPdf(
    db,
    bookId,
    userId,
    prompt,
    generated.fileUrl,
    partNumber,
    title, // ← this is the chapter title
    generated.gptOutput,
    generated.actualPages
  );

  await db.query(
    `UPDATE generated_books 
     SET font_name = ?, font_file = ?, updated_at = NOW()
     WHERE id = ? AND user_id = ?`,
    [font_name, font_file, bookId, userId]
  );

  if (bookName) {
    await db.query(
      `UPDATE generated_books
       SET book_name = ? 
       WHERE id = ? AND user_id = ?`,
      [bookName, bookId, userId]
    );
  }

  console.log(
    `📊 Updating DB with ${generated.actualPages} pages (requested ${pages}), font: ${font_name}`
  );

  return generated;
}
