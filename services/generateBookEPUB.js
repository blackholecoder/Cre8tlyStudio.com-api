import EPub from "epub-gen";
import connect from "../db/connect.js";
import fs from "fs";
import path from "path";
import { getBookForEPUB } from "../db/book/dbBooks.js";
import { uploadFileToSpaces } from "../helpers/uploadToSpace.js";

// At this stage all functions and routes are done, now its time for the front end
export async function generateBookEPUB({ bookId, userId }) {
  const db = connect();

  // 1. Get EPUB-ready data
  const epubData = await getBookForEPUB({ bookId, userId });
  const { book, chapters } = epubData;

  if (!book.is_complete) {
    throw new Error("Book must be finalized before publishing EPUB");
  }

  // 2. Ensure all parts are finalized
  const [countResult] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM book_parts
    WHERE book_id = ?
      AND user_id = ?
      AND gpt_output IS NOT NULL
      AND gpt_output != ''
    `,
    [bookId, userId]
  );

  if (countResult[0].total !== chapters.length) {
    throw new Error("Not all book parts are finalized");
  }

  // 3. Temp output directory
  const tempDir = path.resolve("tmp/epub");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const localEpubPath = path.join(tempDir, `${book.id}-${Date.now()}.epub`);

  // 4. Build EPUB content
  const content = chapters.map((chapter) => ({
    title: chapter.title,
    data: chapter.content,
  }));

  // 5. Generate EPUB locally
  try {
    await new EPub(
      {
        title: book.title,
        author: book.author,
        cover: book.coverImage || undefined,
        content,
        lang: "en",
      },
      localEpubPath
    ).promise;
  } catch (err) {
    throw new Error(`Failed to generate EPUB: ${err.message}`);
  }

  // 6. Upload to DigitalOcean Spaces
  const fileName = `books/${book.id}/book-${Date.now()}.epub`;

  const uploaded = await uploadFileToSpaces(
    localEpubPath,
    fileName,
    "application/epub+zip"
  );

  // 7. Persist EPUB URL
  await db.query(
    `
    UPDATE generated_books
    SET epub_url = ?
    WHERE id = ? AND user_id = ?
    `,
    [uploaded.Location, book.id, userId]
  );

  // 8. Cleanup local file
  try {
    if (fs.existsSync(localEpubPath)) {
      fs.unlinkSync(localEpubPath);
    }
  } catch (err) {
    console.warn("⚠️ Could not delete local EPUB:", err.message);
  }

  return {
    epubUrl: uploaded.Location,
  };
}
