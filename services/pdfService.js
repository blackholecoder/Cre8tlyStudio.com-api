import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfThemes = {
  modern: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf", // 👈 must exist in /public/fonts
    fallback: "Arial, Helvetica, sans-serif",
    primaryColor: "#00E07A",
    textColor: "#222",
    ctaBg: "#00E07A",
    ctaText: "#000",
  },
  classic: {
    font: "AdobeArabic",
    file: "AdobeArabic-Regular.ttf", // 👈 must exist in /public/fonts
    fallback: "Georgia, serif",
    primaryColor: "#000000",
    textColor: "#444",
    ctaBg: "#C9A86A",
    ctaText: "#fff",
  },
  bold: {
    font: "Bebas Neue",
    file: "BebasNeue-Regular.ttf", // 👈 must exist in /public/fonts
    fallback: "Impact, Arial Black, sans-serif",
    primaryColor: "#8B5CF6",
    textColor: "#111",
    ctaBg: "#EC4899",
    ctaText: "#fff",
  },
};

// export async function generatePDF({
//   id,
//   prompt,
//   theme = "modern",
//   isHtml = false,
// }) {
//   const browser = await puppeteer.launch({
//     headless: "new",
//     args: ["--no-sandbox", "--disable-setuid-sandbox"],
//   });
//   const page = await browser.newPage();
//   const selectedTheme = pdfThemes[theme] || pdfThemes.modern;

//   if (!selectedTheme.file) {
//     throw new Error(`Font file missing for theme: ${theme}`);
//   }

//   let content;
//   if (isHtml) {
//     content = prompt;
//   } else {
//     const paragraphs = prompt
//       .split(/\n+/)
//       .map((line) => `<p>${line}</p>`)
//       .join("");
//     content = paragraphs;
//   }

//   const fontPath = path.resolve(
//     __dirname,
//     "../public/fonts",
//     selectedTheme.file
//   );

//   console.log("🔠 Loading font:", fontPath, fs.existsSync(fontPath));

//   const fontFormat = selectedTheme.file.endsWith(".otf")
//   ? "opentype"
//   : selectedTheme.file.endsWith(".ttf")
//   ? "truetype"
//   : "woff2";

//   const html = `
//   <html>
//     <head>
//       <style>
//         @font-face {
//   font-family: '${selectedTheme.font}';
//   src: url('file://${fontPath}') format('${fontFormat}');
//   font-weight: normal;
//   font-style: normal;
// }

// body, h1, h2, h3, p {
//   font-family: '${selectedTheme.font}', ${selectedTheme.fallback};
// }


//         body {
//           font-family: '${selectedTheme.font}', ${selectedTheme.fallback};
//           padding: 0;
//           color: ${selectedTheme.textColor};
//           line-height: 1.6;
//           font-size: 14pt;
//           max-width: 100%;
//         }

//         h1 {
//         font-family: '${selectedTheme.font}', ${selectedTheme.fallback};
//         color: ${selectedTheme.primaryColor};
//         text-align: center;
//         margin-bottom: 20px;
//         font-weight: bold;
//         font-size: 28pt;
// }

//         p {
//           margin: 0 0 12px;
//           font-size: 16px;
//         }

//         .cta {
//           background: ${selectedTheme.ctaBg};
//           color: ${selectedTheme.ctaText};
//           padding: 16px;
//           border-radius: 8px;
//           margin: 24px 0;
//           text-align: center;
//           font-weight: bold;
//           font-size: 18px;
//         }

//         @page { size: A4; margin: 20mm; }
//       </style>
//     </head>
//     <body>
//       ${content}
//       <div class="cta">Take Action Now – Download, Share, and Grow 🚀</div>
//     </body>
//   </html>
// `;

//   await page.setContent(html, { waitUntil: "networkidle0" });
//   await page.evaluateHandle("document.fonts.ready");

//   const outputDir = path.resolve("public/pdfs");
//   if (!fs.existsSync(outputDir)) {
//     fs.mkdirSync(outputDir, { recursive: true });
//   }

//   const filePath = path.join(outputDir, `${id}.pdf`);
//   await page.pdf({
//     path: filePath,
//     format: "A4",
//     printBackground: true,
//     preferCSSPageSize: true,
//     margin: {
//       top: "15mm",
//       right: "10mm",
//       bottom: "15mm",
//       left: "10mm",
//     },
//   });

//   await browser.close();
//   return `/api/static/pdfs/${id}.pdf`;
// }

export async function generatePDF({
  id,
  prompt,
  theme = "modern",
  isHtml = false,
}) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  const selectedTheme = pdfThemes[theme] || pdfThemes.modern;

  if (!selectedTheme.file) {
    throw new Error(`Font file missing for theme: ${theme}`);
  }

  let content;
  if (isHtml) {
    content = prompt;
  } else {
    const paragraphs = prompt
      .split(/\n+/)
      .map((line) => `<p>${line}</p>`)
      .join("");
    content = paragraphs;
  }

  content = content
  .split(/<!--PAGEBREAK-->/g)
  .map(section => `<div class="page">${section}</div>`)
  .join("");

  const fontPath = path.resolve(
    __dirname,
    "../public/fonts",
    selectedTheme.file
  );

  const fontFormat = selectedTheme.file.endsWith(".otf")
    ? "opentype"
    : selectedTheme.file.endsWith(".ttf")
    ? "truetype"
    : "woff2";

    

  const html = `
  <html>
    <head>
      <style>
        @font-face {
          font-family: '${selectedTheme.font}';
          src: url('file://${fontPath}') format('${fontFormat}');
          font-weight: normal;
          font-style: normal;
        }

        body, h1, h2, h3, p {
          font-family: '${selectedTheme.font}', ${selectedTheme.fallback};
        }

        body {
          padding: 0;
          color: ${selectedTheme.textColor};
          line-height: 1.6;
          font-size: 14pt;
          max-width: 100%;
        }

        h1 {
          color: ${selectedTheme.primaryColor};
          text-align: center;
          margin-bottom: 20px;
          font-weight: bold;
          font-size: 28pt;
        }

        p {
          margin: 0 0 12px;
          font-size: 16px;
        }

        .cta {
          background: ${selectedTheme.ctaBg};
          color: ${selectedTheme.ctaText};
          padding: 16px;
          border-radius: 8px;
          margin: 24px 0;
          text-align: center;
          font-weight: bold;
          font-size: 18px;
        }

       .page {
  page-break-after: always; /* force new page after each */
  break-after: page;
}
.page:last-child {
  page-break-after: auto; /* no blank final page */
}

        @page {
          size: A4;
          margin: 20mm;
          @bottom-center {
            content: "Page " counter(page) " of " counter(pages);
            font-family: '${selectedTheme.font}', ${selectedTheme.fallback};
            font-size: 12px;
            color: ${selectedTheme.textColor};
          }
        }
      </style>
    </head>
    <body>
      ${content}
      <div class="cta">Take Action Now – Download, Share, and Grow 🚀</div>
    </body>
  </html>
`;

  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");

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
      top: "15mm",
      right: "10mm",
      bottom: "20mm", // extra space for footer page numbers
      left: "10mm",
    },
  });

  await browser.close();
  return `/api/static/pdfs/${id}.pdf`;
}

