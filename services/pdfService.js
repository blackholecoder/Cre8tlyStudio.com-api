import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfThemes = {
  modern: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf",
    fallback: "Arial, Helvetica, sans-serif",
    primaryColor: "#000000",
    textColor: "#222",
    ctaBg: "#00E07A",
    ctaText: "#000",
    linkGradient: "linear-gradient(90deg, #00E07A 0%, #670fe7 100%)",
  },
  classic: {
    font: "AdobeArabic",
    file: "AdobeArabic-Regular.ttf",
    fallback: "Georgia, serif",
    primaryColor: "#000000",
    textColor: "#444",
    ctaBg: "#C9A86A",
    ctaText: "#fff",
    linkGradient: "linear-gradient(90deg, #C9A86A 0%, #A17843 100%)",
  },

  bold: {
    font: "Bebas Neue",
    file: "Roboto-Regular.ttf",
    fallback: "Impact, Arial Black, sans-serif",
    primaryColor: "#000000",
    textColor: "#111",
    ctaBg: "#EC4899",
    ctaText: "#fff",
    linkGradient: "linear-gradient(90deg, #EC4899 0%, #8B5CF6 100%)",
  },
};

export async function generatePDF({
  id,
  prompt,
  theme = "modern",
  isHtml = false,
  logo,
  link,
}) {
  console.log("✅ generatePDF() started for theme:", theme);
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--allow-file-access-from-files",
      "--font-render-hinting=medium",
    ],
  });

  const page = await browser.newPage();
  await page.evaluateHandle("document.fonts.ready");

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

  const sections = content.split(/<!--PAGEBREAK-->/g);
  const lastSection = sections.pop();

  content = [
    ...sections.map((s) => `<div class="page">${s}</div>`),
    `<div class="page">
      ${lastSection}
      ${
        link
          ? `
        <div class="link-container" style="margin-top: 12px; margin-bottom: 6px;">
          <a href="${link}" target="_blank" class="link-button">
            Visit ${new URL(link).hostname.replace(/^www\\./, "")}
          </a>
        </div>
      `
          : ""
      }
   </div>`,
  ].join("");

  const fontPath = path.resolve(
    __dirname,
    "../public/fonts",
    selectedTheme.file
  );

  // 🔥 Read and embed font as Base64
  const fontBase64 = fs.readFileSync(fontPath).toString("base64");
  const fontFormat = selectedTheme.file.endsWith(".otf")
    ? "opentype"
    : selectedTheme.file.endsWith(".ttf")
    ? "truetype"
    : "woff2";

  console.log("Font path:", fontPath);

  const logoImgTag = logo
    ? `<div class="logo-wrapper"><img src="${logo}" alt="Brand Logo" class="logo" /></div>`
    : "";

  const html = `
<html>
  <head>
    <style>
      @font-face {
        font-family: '${selectedTheme.font}';
        src: url('data:font/${fontFormat};base64,${fontBase64}') format('${fontFormat}');
        font-weight: normal;
        font-style: normal;
      }

      html, body, h1, h2, h3, p, div, span {
        font-family: '${selectedTheme.font}', ${
    selectedTheme.fallback
  } !important;
      }

      body {
        padding: 0;
        color: ${selectedTheme.textColor};
        line-height: 1.7;
        font-size: ${
          theme === "classic" ? "20pt" : "14pt"
        }; /* 👈 only enlarge AdobeArabic */
        max-width: 100%;
      }

      header {
        position: fixed;
        top: 0mm;
        left: 0mm;
        right: 0mm;
        height: 20mm;
        text-align: left;
        padding: 5mm 0 0 10mm;
      }

      .logo-wrapper {
        text-align: center;
        margin-top: 0;
        margin-bottom: 20px;
      }

      .logo {
        width: 64px;
        height: 64px;
        object-fit: contain;
      }

      h1 {
        color: ${selectedTheme.primaryColor};
        text-align: center;
        font-weight: 700;
        font-size: ${theme === "classic" ? "22pt" : "18pt"};
        letter-spacing: 0.2pt;
        line-height: 1.2;
        margin-top: 10mm;
        margin-bottom: 6mm;
      }

      h2 {
        color: ${selectedTheme.primaryColor};
        font-weight: 600;
        font-size: ${theme === "classic" ? "18pt" : "13pt"};
        margin-top: 8mm;
        margin-bottom: 4mm;
      }

      p {
        margin: 0 0 12px;
        font-size: ${theme === "classic" ? "16pt" : "14pt"};
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

      .link-container {
        text-align: center;
        margin-top: 45px;
      }

      .link-button {
  display: inline-block;
  background: ${theme === "classic" ? "#000000" : selectedTheme.linkGradient};
  color: ${
    theme === "classic" ? "#C9A86A" : selectedTheme.linkTextColor || "white"
  };
  padding: 12px 26px;
  font-weight: 600;
  font-size: ${theme === "classic" ? "18px" : "15px"};
  border: 1px solid ${
    theme === "classic" ? "#C9A86A" : selectedTheme.linkTextColor || "#fff"
  };
  border-radius: 30px;
  text-decoration: none;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}


      .link-button:hover {
        transform: scale(1.02);
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
      }

      .page {
        page-break-after: always;
        break-after: page;
      }

      .page:last-child {
        page-break-after: auto;
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
    ${logoImgTag}
    ${content}
  </body>
</html>
`;

  await page.setContent(html);
  await page.evaluateHandle("document.fonts.ready").catch(() => {});

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
  return path.resolve(outputDir, `${id}.pdf`);
}
