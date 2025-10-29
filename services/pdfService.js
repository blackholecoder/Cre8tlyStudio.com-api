import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pdfThemes } from "./pdfThemes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getReadableTextColor(backgroundColor) {
  try {
    // If background is a gradient (like 'linear-gradient(...)'), return white by default
    if (backgroundColor.startsWith("linear")) return "#ffffff";

    // Extract hex and remove possible '0x' or '#' prefix
    const hex = backgroundColor.replace("#", "").trim();
    if (hex.length !== 6) return "#ffffff"; // fallback

    // Convert hex to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate luminance (perceived brightness)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return white for dark colors, black for light colors
    return luminance < 0.5 ? "#ffffff" : "#000000";
  } catch {
    return "#ffffff";
  }
}




export async function generatePDF({
  id,
  prompt,
  theme = "modern",
  bgTheme = "modern",
  isHtml = false,
  logo,
  link,
  coverImage,
  cta,
}) {


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
    ...sections.map(
      (s) => `<div class="page"><div class="page-inner">${s}</div></div>`
    ),
    `<div class="page"><div class="page-inner">${lastSection}</div></div>`,
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

  const logoImgTag = logo
    ? `<div class="logo-wrapper"><img src="${logo}" alt="Brand Logo" class="logo" /></div>`
    : "";

  let coverImgTag = "";
  if (coverImage && fs.existsSync(coverImage)) {
    const base64Cover = fs.readFileSync(coverImage).toString("base64");
    const ext = path.extname(coverImage).replace(".", "") || "png";
    coverImgTag = `
    <div class="cover-page">
      <img src="data:image/${ext};base64,${base64Cover}" alt="Cover Image" class="cover-img" />
    </div>
  `;
  }

  const cssPath = path.resolve(__dirname, "../public/pdf-style.css");
let cssTemplate = fs.readFileSync(cssPath, "utf8");


const css = cssTemplate
  .replace(/{{font}}/g, selectedTheme.font)
  .replace(/{{fontFormat}}/g, fontFormat)
  .replace(/{{fontBase64}}/g, fontBase64)
  .replace(/{{fallback}}/g, selectedTheme.fallback)
  .replace(/{{textColor}}/g, getReadableTextColor(
    pdfThemes[bgTheme]?.background ||
    (bgTheme?.startsWith("linear") || bgTheme?.startsWith("#") ? bgTheme : "#ffffff")
  ))
  .replace(/{{background}}/g,
    pdfThemes[bgTheme]?.background ||
    (bgTheme?.startsWith("linear") || bgTheme?.startsWith("#") ? bgTheme : "#ffffff")
  )
  .replace(/{{fontSize}}/g, theme === "classic" ? "20pt" : "14pt")
  .replace(/{{h1Size}}/g, theme === "classic" ? "22pt" : "18pt")
  .replace(/{{h2Size}}/g, theme === "classic" ? "18pt" : "13pt")
  .replace(/{{pSize}}/g, theme === "classic" ? "16pt" : "14pt")
  .replace(/{{headingColor}}/g, getReadableTextColor(
  pdfThemes[bgTheme]?.background ||
  (bgTheme?.startsWith("linear") || bgTheme?.startsWith("#") ? bgTheme : "#ffffff")
))
  .replace(/{{ctaBg}}/g, getReadableTextColor(
  pdfThemes[bgTheme]?.background ||
  (bgTheme?.startsWith("linear") || bgTheme?.startsWith("#") ? bgTheme : "#ffffff")
) === "#ffffff" ? "#00E07A" : "#222222")
  .replace(/{{ctaText}}/g, getReadableTextColor(
  pdfThemes[bgTheme]?.ctaBg ||
  pdfThemes[bgTheme]?.background ||
  (bgTheme?.startsWith("linear") || bgTheme?.startsWith("#") ? bgTheme : "#ffffff")
))
  const html = `
<html>
  <head>
    <style>${css}</style>
  </head>
  <body>
  <div class="page-bg"></div>
  ${coverImgTag} 
    <div class="pdf-content">
  ${logoImgTag}
  ${content}
</div>
   ${
     cta || link
       ? (() => {
           const linkedCta = cta
             ? cta
                 .replace(
                   /(https?:\/\/[^\s]+)/g,
                   '<a href="$1" target="_blank">$1</a>'
                 )
                 .replace(
                   /(www\.[^\s]+)/g,
                   '<a href="https://$1" target="_blank">$1</a>'
                 )
                 .replace(/\n/g, "<br>")
             : "";

           const bgColor =
  pdfThemes[bgTheme]?.background ||
  (bgTheme?.startsWith("linear") || bgTheme?.startsWith("#") ? bgTheme : "#ffffff");

const textColor = getReadableTextColor(bgColor);

// Pick a CTA background that contrasts slightly against the page color
// (fallback to bright green if background is dark)
const ctaBg = getReadableTextColor(bgColor) === "#ffffff" ? "#00E07A" : "#111111";

// The CTA button text color should be the opposite of the button background
const ctaText = getReadableTextColor(ctaBg);


           return `
        <!-- Force break after content but avoid an empty page -->


        <section class="final-cta-page" style="
  width:100%;
  min-height:calc(297mm - 15mm); 
  display:flex;
  flex-direction:column;
  justify-content:center;
  align-items:center;
  text-align:center;
  background:${bgColor};
  color:${textColor};
  padding:60px 40px;
  box-sizing:border-box;
">
          <div class="signature-container" style="max-width:600px;margin:auto;">
            ${
              linkedCta
                ? `<p class="cta-text" style="
                    font-size:18px;
                    line-height:1.7;
                    color:${textColor};
                    margin-bottom:32px;
                    text-shadow:none;
                  ">${linkedCta}</p>`
                : ""
            }
            ${
              link
                ? `<div class="footer-link" style="margin-top:20px;">
                    <a href="${link}" target="_blank" class="link-button" style="
                      display:inline-block;
                      background:${ctaBg};
                      color:${ctaText};
                      padding:14px 30px;
                      font-weight:600;
                      font-size:16px;
                      border-radius:30px;
                      text-decoration:none;
                      box-shadow:none;
                      border:2px solid ${getReadableTextColor(bgColor) === "#ffffff" ? "#fff" : "#000"};
                    ">
                      Visit ${new URL(link).hostname.replace(/^www\\./, "")}
                    </a>
                  </div>`
                : ""
            }
            <p class="signature-footer" style="
              margin-top:28px;
              font-style:italic;
              font-size:15px;
              color:${getReadableTextColor(bgColor) === "#ffffff" ? "#d1d5db" : "#666"};
            ">
            </p>
          </div>
        </section>
      `;
         })()
       : ""
   }



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
    preferCSSPageSize: false,
    margin: {
      top: "0mm",
      right: "0mm",
      bottom: "0mm",
      left: "0mm",
    },
  });

  await browser.close();

  if (coverImage && fs.existsSync(coverImage)) {
    try {
      fs.unlinkSync(coverImage);
    } catch (err) {
      console.error("⚠️ Failed to delete temp cover:", err);
    }
  }
  return path.resolve(outputDir, `${id}.pdf`);
}
