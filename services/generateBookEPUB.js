import Epub from "epub-gen";
import fs from "fs";
import path from "path";

export async function generateBookEPUB({
  id,
  title,
  author,
  chapters,
  coverImage = null,
}) {
  const outputDir = path.resolve("public/books");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const epubPath = path.join(outputDir, `${id}.epub`);

  const content = chapters.map((c) => ({
    title: c.title,
    data: c.content,
  }));

  await new Epub({
    title,
    author,
    cover: coverImage && fs.existsSync(coverImage) ? coverImage : undefined,
    content,
    css: `
      body {
        font-family: Georgia, serif;
        line-height: 1.7;
      }
      h2 {
        margin-top: 1.5em;
      }
      blockquote {
        margin: 1.2em;
        font-style: italic;
      }
    `,
    output: epubPath,
  }).promise;

  return { epubPath };
}
