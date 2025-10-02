import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

export async function generatePDF({ id, prompt, isHtml = false }) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  let content;
  if (isHtml) {
    content = prompt;
  } else {
    // Convert newlines to <p> blocks so Chrome paginates
    const paragraphs = prompt
      .split(/\n+/)
      .map((line) => `<p>${line}</p>`)
      .join("");
    content = paragraphs;
  }

  const html = `
    <html>
      <head>
        <style>
          body {
  font-family: "Helvetica Neue", Arial, sans-serif;
  padding: 0; /* 🔥 Let Puppeteer margins handle it */
  color: #222;
  line-height: 1.6;
  font-size: 14pt; /* optional: make font a bit bigger */
  max-width: 100%; /* use full width */
}
          p {
            margin: 0 0 12px;
            font-size: 16px;
          }
          @page {
            size: A4;
            margin: 20mm;
          }
          .page-break {
            page-break-before: always;
          }
        </style>
      </head>
      <body>
        <h1>Your Lead Magnet</h1>
        ${content}
      </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: "networkidle0" });

  const outputDir = path.resolve("public/pdfs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, `${id}.pdf`);
  await page.pdf({
    path: filePath,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: "15mm", // was 20mm
      right: "10mm", // was 15mm
      bottom: "15mm", // was 20mm
      left: "10mm", // was 15mm
    },
  });

  await browser.close();

  return `/api/static/pdfs/${id}.pdf`;
}
