import connect from "../connect.js";
import { generateBookPDF } from "../../services/generateBookPDF.js";
import { uploadFileToSpaces } from "../../helpers/uploadToSpace.js";
import { askBookGPT, askBookGPTEducational, askBookGPTFiction } from "../../helpers/bookGPT.js";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import {
  getLastBookPartText,
  saveBookPartText,
} from "./getLastBookPartText.js";
import { getBookTypeById, saveBookPdf } from "./dbBooks.js";

export async function createBookPrompt({
  prompt,
  pages = 10,
  link,
  coverImage,
  title,
  authorName,
  partNumber = 1,
  bookId = null,
  userId = null,
  bookType,
  font_name = "Montserrat",           // ✅ new
  font_file = "/fonts/Montserrat-Regular.ttf", // ✅ new
}) {
  console.log(`✍️ Running Book GPT Engine (Part ${partNumber})...`);
  const db = await connect();

  if (!prompt || typeof prompt !== "string") {
    throw new Error("Prompt text is required to create a book section");
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

    // ✅ 3. Choose correct GPT engine based on type
    let gptOutput = "";
    if (resolvedBookType === "fiction") {
      gptOutput = await askBookGPTFiction(prompt, previousText, "", partNumber);
    } else if (resolvedBookType === "non-fiction") {
      gptOutput = await askBookGPT(prompt, previousText, "", partNumber);
    } else if (resolvedBookType === "educational") {
      gptOutput = await askBookGPTEducational(prompt, previousText, "", partNumber);
    } else {
      console.log("⚠️ Unknown type, defaulting to non-fiction GPT");
      gptOutput = await askBookGPT(prompt, previousText, "", partNumber);
    }

    if (!gptOutput || typeof gptOutput !== "string") {
      throw new Error("GPT did not return valid text for the book section");
    }


    // ✅ 3. Temporary cover handling
    let tempCoverPath = null;
    if (coverImage && coverImage.startsWith("data:image")) {
      const tmpDir = path.resolve("uploads/tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const base64Data = coverImage.replace(/^data:image\/\w+;base64,/, "");
      const extension = coverImage.substring(
        coverImage.indexOf("/") + 1,
        coverImage.indexOf(";")
      );

      tempCoverPath = path.join(tmpDir, `cover_${Date.now()}.${extension}`);
      fs.writeFileSync(tempCoverPath, Buffer.from(base64Data, "base64"));
    }

    // ✅ 4. Parse chapters
    const chapters = [];
    const regex = /<h[12][^>]*>(.*?)<\/h[12]>([\s\S]*?)(?=<h[12]|$)/gi;
    let match;
    while ((match = regex.exec(gptOutput)) !== null) {
      const chapterTitle = match[1]?.replace(/<\/?[^>]+(>|$)/g, "").trim();
      const chapterContent = match[2]?.trim() || "";
      if (chapterTitle && chapterContent) {
        chapters.push({ title: chapterTitle, content: chapterContent });
      }
    }

    // ✅ 5. Fallbacks
    let finalTitle = title?.trim() || null;
    let finalAuthor = authorName?.trim() || null;

    // ✅ 5a. If missing, pull from DB
    if ((!finalTitle || !finalAuthor) && thisBookId) {
      const [rows] = await db.query(
        `SELECT title, author_name FROM generated_books WHERE id = ? AND user_id = ? LIMIT 1`,
        [thisBookId, userId]
      );
      if (rows.length > 0) {
        finalTitle = finalTitle || rows[0].title || "Untitled Book";
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
      font_name, // ✅ include font info
      font_file, 
    });

    console.log("📄 PDF Generated, Page Count:", pageCount);

    // ✅ 7. Upload PDF to Spaces
    const fileName = `books/${thisBookId}_part${partNumber}-${Date.now()}.pdf`;
    const uploaded = await uploadFileToSpaces(localPdfPath, fileName, "application/pdf");

    // ✅ 8. Cleanup temp files
    if (tempCoverPath && fs.existsSync(tempCoverPath)) fs.unlinkSync(tempCoverPath);
    if (fs.existsSync(localPdfPath)) fs.unlinkSync(localPdfPath);

    // ✅ 9. Save text for continuity
    await saveBookPartText({
      userId,
      bookId: thisBookId,
      partNumber,
      text: gptOutput,
    });

    await db.query(
      `UPDATE generated_books 
       SET font_name = ?, font_file = ?, updated_at = NOW() 
       WHERE id = ? AND user_id = ?`,
      [font_name, font_file, thisBookId, userId]
    );

    console.log(`📚 Book Part ${partNumber} uploaded successfully: ${uploaded.Location}`);

    // ✅ 10. Return metadata
    return {
      title: finalTitle,
      author: finalAuthor,
      fileUrl: uploaded.Location,
      partNumber,
      bookId: thisBookId,
      gptOutput,
      actualPages: pageCount || pages,
      font_name, 
      font_file,
    };
  } catch (err) {
    console.error("❌ Error creating book part:", err);
    throw err;
  } finally {
    await db.end();
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
  const db = await connect();
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
  const db = await connect();


  // ✅ Generate content and upload
  const generated = await createBookPrompt({
    userId,
    bookId,
    prompt,
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
       SET title = COALESCE(NULLIF(title, ''), ?) 
       WHERE id = ? AND user_id = ?`,
      [bookName, bookId, userId]
    );
  }

  console.log(
    `📊 Updating DB with ${generated.actualPages} pages (requested ${pages}), font: ${font_name}`
  );

  await db.end();
  return generated;
}

