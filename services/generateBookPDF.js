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
}) {

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.evaluateHandle("document.fonts.ready");

  const fontPath = path.resolve(__dirname, "../public/fonts/AdobeArabic-Regular.ttf");
  const fontBase64 = fs.readFileSync(fontPath).toString("base64");

  let coverTag = "";
  if (coverImage && fs.existsSync(coverImage)) {
    const ext = path.extname(coverImage).replace(".", "") || "png";
    const base64 = fs.readFileSync(coverImage).toString("base64");
    coverTag = `
      <div class="cover-page">
        <img src="data:image/${ext};base64,${base64}" class="cover-img" />
      </div>`;
  }

  const content = chapters
    .map(
      (c) => `
        <div class="chapter">
          <h1>${c.title}</h1>
          <p>${c.content.replace(/\n/g, "</p><p>")}</p>
        </div>`
    )
    .join("");

  const learnMore = link
    ? `
      <div class="page-break"></div>
      <div class="chapter">
        <h2>Learn More</h2>
        <p>
          Continue your journey at 
          <a href="${link}" class="book-link">${link}</a>.
        </p>
      </div>`
    : "";

  const html = `
  <html>
  <head>
    <style>
      @font-face {
        font-family: 'AdobeArabic';
        src: url('data:font/truetype;base64,${fontBase64}') format('truetype');
      }
      body {
        font-family: 'AdobeArabic', Georgia, serif;
        color: #222;
        margin: 0;
        padding: 0;
      }
      .cover-page {
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        page-break-after: always;
      }
      .cover-img {
        max-width: 70%;
        height: auto;
        border: 4px solid #222;
        border-radius: 8px;
      }
      .title-page {
        text-align: center;
        margin-top: 200px;
        page-break-after: always;
      }
      .title-page h1 {
        font-size: 26pt;
        color: #000;
        margin-bottom: 10px;
      }
      .title-page h2 {
        font-size: 16pt;
        color: #444;
        margin-bottom: 10px;
      }
      .chapter {
        margin: 60px auto;
        max-width: 700px;
        padding: 0 20px;
        text-align: justify;
        font-size: 13pt;
        line-height: 1.8;
        page-break-inside: avoid;
      }
      .chapter h1 {
        margin-top: 40px;
        margin-bottom: 20px;
        font-size: 20pt;
        color: #000;
      }
      .book-link {
        color: #3366cc;
        text-decoration: none;
      }
      .page-break { page-break-before: always; }
      @page { size: A4; margin: 20mm; }
    </style>
  </head>
  <body>
    ${coverTag}
    <div class="title-page">
      <h1>${title}</h1>
      <h2>by ${author}</h2>
      ${link ? `<p><a href="${link}" target="_blank">${link}</a></p>` : ""}
    </div>
    ${content}
    ${learnMore}
  </body>
  </html>
  `;

  await page.setContent(html);
  await page.evaluateHandle("document.fonts.ready").catch(() => {});

  const outputDir = path.resolve("public/books");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const localPdfPath = path.join(outputDir, `${id}.pdf`);

  await page.pdf({
    path: localPdfPath,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size:10px; color:#888; text-align:right; width:100%; padding-right:20px;">
        <span class="title"></span>
      </div>
    `,
    footerTemplate: `
      <div style="font-size:10px; color:#555; text-align:center; width:100%; padding-bottom:10px;">
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>
    `,
    margin: { top: "15mm", bottom: "20mm", left: "15mm", right: "15mm" },
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

console.log(`📄 Final PDF page count: ${pageCount}`);
console.log("✅ Book PDF generated:", localPdfPath);

return { localPdfPath, pageCount };
}
