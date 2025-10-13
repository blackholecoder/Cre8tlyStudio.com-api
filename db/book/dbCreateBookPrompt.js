import connect from "../connect.js";
import { generateBookPDF } from "../../services/generateBookPDF.js";
import { uploadFileToSpaces } from "../../helpers/uploadToSpace.js";
import { askBookGPT } from "../../helpers/bookGPT.js";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import {
  getLastBookPartText,
  saveBookPartText,
} from "./getLastBookPartText.js";
import { saveBookPdf } from "./dbBooks.js";

export async function createBookPrompt({
  prompt,
  pages = 10, // default smaller chunks for gradual writing
  link,
  coverImage,
  title,
  authorName,
  partNumber = 1,
  bookId = null,
  userId = null, // required for context
}) {
  console.log(`✍️ Running Book GPT Engine (Part ${partNumber})...`);
  const db = await connect();

  if (!prompt || typeof prompt !== "string") {
    throw new Error("Prompt text is required to create a book section");
  }

  // ✅ Generate a unique or reuse existing Book ID
  const thisBookId = bookId || uuidv4();

  try {
    // ✅ 1. Fetch previous text (continuity for next part)
    let previousText = null;
    if (userId && bookId && partNumber > 1) {
      previousText = await getLastBookPartText(bookId, userId);
      if (previousText) {
        console.log("📖 Found previous part text for continuity");
      }
    }

    // ✅ 2. Ask GPT to expand or continue story gradually
    const gptOutput = await askBookGPT(prompt, previousText, partNumber);
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

    // ✅ 4. Parse chapters (so table of contents works cleanly)
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

    // ✅ 5. Use fallback title if AI didn’t define one
    const finalTitle =
      title?.trim() ||
      (chapters[0]?.title ? chapters[0].title : `Book Part ${partNumber}`);
    const finalAuthor = authorName?.trim() || "Anonymous";

    // ✅ 6. Generate the PDF
    const { localPdfPath, pageCount } = await generateBookPDF({
      id: `${thisBookId}-part${partNumber}`,
      title: finalTitle,
      author: finalAuthor,
      chapters,
      coverImage: tempCoverPath,
      link,
    });

    // ✅ 7. Upload to DigitalOcean
    const fileName = `books/${thisBookId}_part${partNumber}-${Date.now()}.pdf`;
    const uploaded = await uploadFileToSpaces(
      localPdfPath,
      fileName,
      "application/pdf"
    );

    // ✅ 8. Cleanup local temp files
    if (tempCoverPath && fs.existsSync(tempCoverPath))
      fs.unlinkSync(tempCoverPath);
    if (fs.existsSync(localPdfPath)) fs.unlinkSync(localPdfPath);

    // ✅ 9. Save generated text for continuity
    await saveBookPartText({
      userId,
      bookId: thisBookId,
      partNumber,
      text: gptOutput,
    });


    console.log(
      `📚 Book Part ${partNumber} uploaded successfully: ${uploaded.Location}`
    );

    // ✅ 10. Return metadata
    return {
      title: finalTitle,
      author: finalAuthor,
      fileUrl: uploaded.Location,
      partNumber,
      bookId: thisBookId,
      gptOutput,
      actualPages: pageCount || pages,
    };
  } catch (err) {
    console.error("❌ Error creating book part:", err);
    throw err;
  }
}

export function validateBookPromptInput(bookId, prompt) {
  if (!bookId || !prompt) return "bookId and prompt are required";
  if (prompt.length > 20000)
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
  if (usedPages + pages > 150)
    return {
      error: `This book has reached the 150-page limit. (${usedPages}/150 pages used)`,
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
  title,
  authorName,
  partNumber,
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
    title,
    authorName,
    partNumber,
  });

  const actualPages = generated.actualPages || pages;
  console.log(`📄 Estimated actual pages generated: ${actualPages}`);

  // ✅ Save file & update page count
  await saveBookPdf(
    bookId,
    userId,
    prompt,
    generated.fileUrl,
    partNumber,
    generated.title, // ✅ add title
    generated.gptOutput
  );

  await db.query(
    `UPDATE generated_books 
     SET pages = LEAST(pages + ?, 150)
     WHERE id = ? AND user_id = ?`,
    [generated.actualPages || 1, bookId, userId]
  );

  console.log(`📊 Updating DB with actual ${generated.actualPages} pages (requested ${pages})`);


  return generated;
}
