import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateBookPDF({
  id,
  title = "Untitled Book",
  author = "Anonymous",
  chapters = [],
  coverImage = null,
  link = null,
  partNumber = 1,
  font_name = "AdobeArabic",
  font_file = "/fonts/AdobeArabic-Regular.ttf",
}) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.evaluateHandle("document.fonts.ready");

  // ✅ Resolve dynamic font path
  const fontPath = path.resolve(
    __dirname,
    `../public${font_file.startsWith("/") ? font_file : "/" + font_file}`
  );

  let finalFontPath = fontPath;

  if (!fs.existsSync(fontPath)) {
    console.warn(`⚠️ Font not found at ${fontPath}, falling back to default.`);
    finalFontPath = path.resolve(
      __dirname,
      "../public/fonts/AdobeArabic-Regular.ttf"
    );
  }

  // ✅ Detect format and convert
  const fontFormat = finalFontPath.endsWith(".otf")
    ? "opentype"
    : finalFontPath.endsWith(".ttf")
    ? "truetype"
    : "woff2";

  const fontBase64 = fs.readFileSync(finalFontPath).toString("base64");

  let coverTag = "";
  if (coverImage && fs.existsSync(coverImage)) {
    const ext = path.extname(coverImage).replace(".", "") || "png";
    const base64 = fs.readFileSync(coverImage).toString("base64");
    coverTag = `
      <div class="cover-page">
        <img src="data:image/${ext};base64,${base64}" class="cover-img" />
      </div>`;
  }

  const learnMore = link
    ? `
    <div class="page">
      <div class="page-inner">
        <div class="chapter">
          <h2 class="chapter-title">Learn More</h2>
          <p>
            Continue your journey at
            <a href="${link}" class="book-link">${link}</a>.
          </p>
        </div>
      </div>
    </div>
  `
    : "";

  const safeChapters = chapters.filter(
    (c) => c?.content && typeof c.content === "string" && c.content.trim()
  );

  const content =
    safeChapters
      .map(
        (c) => `
  <div class="page">
    <div class="page-inner">
      <div class="chapter">
        <h2 class="chapter-title">${c.title}</h2>
        ${
          c.content.trim().startsWith("<")
            ? c.content
            : c.content
                .split(/\n+/)
                .map((p) => `<p>${p.trim()}</p>`)
                .join("")
        }
      </div>
    </div>
  </div>
`
      )
      .join("") + learnMore;

  const titlePage =
    partNumber === 1
      ? `
      <div class="title-page">
        <h1>${title}</h1>
        <h2>by ${author}</h2>
        ${link ? `<p><a href="${link}" target="_blank">${link}</a></p>` : ""}
      </div>
    `
      : "";

  await page.setContent(`
<html>
  <head>
    <style>
      @font-face {
        font-family: '${font_name}';
        src: url('data:font/${fontFormat};base64,${fontBase64}') format('${fontFormat}');
      }

      body {
        font-family: '${font_name}', Georgia, serif;
        margin: 0;
        padding: 0;
      }

      .page {
        width: 210mm;
        break-inside: avoid;
      }
        .page:not(:last-child) {
  page-break-after: always;
}

      .page-inner {
        padding: 0;
      }


      .cover-page { 
      position: relative; 
      width: 210mm; 
      height: 297mm; 
      page-break-after: always; 
      overflow: hidden; 
      } 
      
      .cover-img { 
      position: absolute; 
      top: 0; 
      left: 0; 
      width: 100%; 
      height: 100%; 
      object-fit: cover; 
      }

      .title-page {
  width: 210mm;
  height: 297mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  page-break-after: always;
}
      .title-page h1 { 
      font-size: 26pt; color: #000; 
      margin-bottom: 10px; 
      } 
      .title-page h2 { 
      font-size: 16pt; 
      color: #444; 
      margin-bottom: 10px; 
      }

      .chapter {
        margin: 0 0 24px 0;
        font-size: 13pt;
        line-height: 1.8;
        text-align: justify;
      }

      .chapter-title {
        margin-top: 32px; 
        margin-bottom: 12px; 
        font-size: 18pt; 
        font-weight: bold; 
        color: #000; 
        page-break-after: avoid;
      }

      .book-link {
        color: #3366cc;
        text-decoration: none;
      }

      p {
  page-break-inside: avoid;
  break-inside: avoid;
}
    </style>
  </head>
  <body>
    ${coverTag}
    ${titlePage}
    ${content}
  </body>
</html>
`);

  await page.evaluateHandle("document.fonts.ready").catch(() => {});

  const outputDir = path.resolve("public/books");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const localPdfPath = path.join(outputDir, `${id}.pdf`);

  await page.pdf({
    path: localPdfPath,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: {
      top: "25mm",
      bottom: "25mm",
      left: "20mm",
      right: "20mm",
    },
  });

  await browser.close();

  // ✅ Ensure file is fully written before reading
  await new Promise((res) => setTimeout(res, 300));

  let pageCount = 0;
  try {
    if (fs.existsSync(localPdfPath)) {
      const pdfBytes = fs.readFileSync(localPdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      pageCount = pdfDoc.getPageCount();
      console.log("✅ True page count:", pageCount);
    } else {
      console.warn("⚠️ PDF file not found:", localPdfPath);
    }
  } catch (err) {
    console.warn("⚠️ Page count read error:", err.message);
  }

  return { localPdfPath, pageCount };
}
