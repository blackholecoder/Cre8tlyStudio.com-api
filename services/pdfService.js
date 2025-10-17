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
    textColor: "#222222",
    ctaBg: "#00E07A",
    ctaText: "#000000",
    linkGradient: "#670fe7",
    background: "#e2e8f0",
  },
  classic: {
    font: "AdobeArabic",
    file: "AdobeArabic-Regular.ttf",
    fallback: "Georgia, serif",
    primaryColor: "#000000",
    textColor: "#444444",
    ctaBg: "#C9A86A",
    ctaText: "#ffffff",
    linkGradient: "#A17843",
    background: "#fffaf5",
  },
  bold: {
    font: "Bebas Neue",
    file: "Roboto-Regular.ttf",
    fallback: "Impact, Arial Black, sans-serif",
    primaryColor: "#000000",
    textColor: "#111111",
    ctaBg: "#EC4899",
    ctaText: "#ffffff",
    linkGradient: "#8B5CF6",
    background: "#f9e8ff",
  },
  dark: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf",
    fallback: "Arial, Helvetica, sans-serif",
    primaryColor: "#ffffff",
    textColor: "#e2e8f0",
    ctaBg: "#00E07A",
    ctaText: "#000000",
    linkGradient: "#670fe7",
    background: "#030712",
  },
  royal: {
    font: "Palanquin",
    file: "Palanquin-Regular.ttf",
    fallback: "sans-serif",
    primaryColor: "#ffffff",
    textColor: "#ffffff",
    ctaBg: "#7C3AED",
    ctaText: "#ffffff",
    linkGradient: "#4C1D95",
    background: "#2E026D",
  },
  mint: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf",
    fallback: "sans-serif",
    primaryColor: "#0f172a",
    textColor: "#082f49",
    ctaBg: "#99f6e4",
    ctaText: "#065f46",
    linkGradient: "#34d399",
    background: "#d1fae5",
  },
  sunrise: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf",
    fallback: "sans-serif",
    primaryColor: "#7c2d12",
    textColor: "#451a03",
    ctaBg: "#f97316",
    ctaText: "#ffffff",
    linkGradient: "#fb923c",
    background: "#fed7aa",
  },
  ocean: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf",
    fallback: "sans-serif",
    primaryColor: "#0c4a6e",
    textColor: "#082f49",
    ctaBg: "#38bdf8",
    ctaText: "#ffffff",
    linkGradient: "#0284c7",
    background: "#bae6fd",
  },
  rose: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf",
    fallback: "sans-serif",
    primaryColor: "#831843",
    textColor: "#9d174d",
    ctaBg: "#f43f5e",
    ctaText: "#ffffff",
    linkGradient: "#f472b6",
    background: "#fce7f3",
  },
  graphite: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf",
    fallback: "sans-serif",
    primaryColor: "#e5e7eb",
    textColor: "#9ca3af",
    ctaBg: "#6b7280",
    ctaText: "#ffffff",
    linkGradient: "#111827",
    background: "#1f2937",
  },
  forest: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf",
    fallback: "sans-serif",
    primaryColor: "#e2f7e1",
    textColor: "#d1fae5",
    ctaBg: "#15803d",
    ctaText: "#ffffff",
    linkGradient: "#166534",
    background: "#065f46",
  },
  gold: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf",
    fallback: "sans-serif",
    primaryColor: "#1f1f1f",
    textColor: "#2d2d2d",
    ctaBg: "#facc15",
    ctaText: "#000000",
    linkGradient: "#f59e0b",
    background: "#f59e0b",
  },
  lavender: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf",
    fallback: "sans-serif",
    primaryColor: "#4c1d95",
    textColor: "#6b21a8",
    ctaBg: "#c084fc",
    ctaText: "#ffffff",
    linkGradient: "#a855f7",
    background: "#c084fc",
  },
  peach: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf",
    fallback: "sans-serif",
    primaryColor: "#7c2d12",
    textColor: "#78350f",
    ctaBg: "#fb923c",
    ctaText: "#ffffff",
    linkGradient: "#f97316",
    background: "#f97316",
  },
  midnight: {
    font: "Palanquin",
    file: "Palanquin-Regular.ttf",
    fallback: "sans-serif",
    primaryColor: "#e5e7eb",
    textColor: "#cbd5e1",
    ctaBg: "#334155",
    ctaText: "#ffffff",
    linkGradient: "#1e293b",
    background: "#1e293b",
  },
  aqua: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf",
    fallback: "sans-serif",
    primaryColor: "#082f49",
    textColor: "#0c4a6e",
    ctaBg: "#0ea5e9",
    ctaText: "#ffffff",
    linkGradient: "#22d3ee",
    background: "#0ea5e9",
  },
  berry: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf",
    fallback: "sans-serif",
    primaryColor: "#fdf2f8",
    textColor: "#fce7f3",
    ctaBg: "#db2777",
    ctaText: "#ffffff",
    linkGradient: "#7e22ce",
    background: "#7e22ce",
  },
  lime: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf",
    fallback: "sans-serif",
    primaryColor: "#1a2e05",
    textColor: "#365314",
    ctaBg: "#84cc16",
    ctaText: "#000000",
    linkGradient: "#65a30d",
    background: "#65a30d",
  },
  sand: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf",
    fallback: "sans-serif",
    primaryColor: "#78350f",
    textColor: "#92400e",
    ctaBg: "#fcd34d",
    ctaText: "#000000",
    linkGradient: "#fbbf24",
    background: "#fcd34d",
  },
  sky: {
    font: "Montserrat",
    file: "Montserrat-Regular.ttf",
    fallback: "sans-serif",
    primaryColor: "#0c4a6e",
    textColor: "#082f49",
    ctaBg: "#60a5fa",
    ctaText: "#ffffff",
    linkGradient: "#3b82f6",
    background: "#60a5fa",
  },
};



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
  console.log("✅ generatePDF() started for theme:", theme);
  console.log("📄 generatePDF got bgTheme:", bgTheme);

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
  body, .page {
  color: ${
    ["royal", "dark", "graphite"].includes(bgTheme)
      ? "#ffffff" /* light text for dark backgrounds */
      : "#111111" /* dark text for light backgrounds */
  };
}

/* If background is very light (like mint, ocean, sunrise, etc.), force darker text */
${
  ["mint", "sunrise", "ocean", "rose"].includes(bgTheme)
    ? `
  body, .page, h1, h2, h3, p, span {
    color: #111111 !important;
    text-shadow: none !important;
  }
  `
    : ""
}

      body {
  margin: 0;
  padding: 0;
  background: ${
    pdfThemes[bgTheme]?.background ||
    (bgTheme?.startsWith("linear") || bgTheme?.startsWith("#")
      ? bgTheme
      : "#ffffff")
  };
  font-size: ${theme === "classic" ? "20pt" : "14pt"};
  line-height: 1.7;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

/* each page block now carries the background */


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
        text-align: center;
        font-weight: 700;
        font-size: ${theme === "classic" ? "22pt" : "18pt"};
        letter-spacing: 0.2pt;
        line-height: 1.2;
        margin-top: 10mm;
        margin-bottom: 6mm;
      }

      h2 {
        font-weight: 600;
        font-size: ${theme === "classic" ? "18pt" : "13pt"};
        margin-top: 8mm;
        margin-bottom: 4mm;
      }
        h1, h2, h3 {
  color: ${
    ["royal", "dark", "graphite"].includes(bgTheme)
      ? "#ffffff"
      : selectedTheme.primaryColor || "#111111"
  };
}

      p {
        margin: 0 0 12px;
        font-size: ${theme === "classic" ? "16pt" : "14pt"};
      }

      .cta {
  background: ${
    ["royal", "dark", "graphite"].includes(bgTheme)
      ? "#ffffff"
      : selectedTheme.ctaBg
  };
  color: ${
    ["royal", "dark", "graphite"].includes(bgTheme)
      ? "#000000"
      : selectedTheme.ctaText
  };
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
  width: 100%;
  min-height: 100vh;
  background: ${
    pdfThemes[bgTheme]?.background ||
    (bgTheme?.startsWith("linear") || bgTheme?.startsWith("#")
      ? bgTheme
      : "#ffffff")
  };
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
  padding: 30mm;
  box-sizing: border-box;
  color: ${
    ["royal", "dark", "graphite"].includes(bgTheme)
      ? "#f9fafb"
      : selectedTheme.textColor || "#111"
  };
  page-break-after: always;
  break-after: page;
}

.page:last-child {
  page-break-after: auto;
}

      @page {
        size: A4;
        margin: 0;
        @bottom-center {
          content: "Page " counter(page) " of " counter(pages);
          font-family: '${selectedTheme.font}', ${selectedTheme.fallback};
          font-size: 12px;
          color: ${selectedTheme.textColor};
        }
      }

        .cover-page {
page-break-before: always !important;
  page-break-after: always !important;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  width: 100vw;
  height: 100vh;
  background: ${
    pdfThemes[bgTheme]?.background ||
    (bgTheme?.startsWith("linear") || bgTheme?.startsWith("#")
      ? bgTheme
      : "#ffffff")
  };
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
  margin: 0;
  padding: 0;
}

.cover-img {
  width: 100%;
  height: auto;
  max-width: 667px;
  max-height: calc(100vh - 40mm);
  object-fit: contain;
  margin: 0 auto;
  display: block;
}

  .signature-page {
  page-break-before: always;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  min-height: calc(100vh - 60mm); /* keeps content within margins */
  background: linear-gradient(to bottom right, #0a0a0a, #111);
  color: white;
  padding: 40px 30px;
  box-sizing: border-box;
}

.signature-container {
  max-width: 600px;
  margin: 0 auto;
}

.cta-text {
  font-family: 'Montserrat', sans-serif;
  font-size: 18px;
  line-height: 1.7;
  color: #222;
  margin-bottom: 32px;
}

.signature-footer {
  font-size: 16px;
  font-style: italic;
  color: #a3a3a3;
  margin-top: 16px;
}

.signature-page a {
  color: #00b7ff;
  text-decoration: underline;
  font-weight: 500;
}

.signature-page a:hover {
  color: #00e0ff;
  text-decoration: none;
}

.final-cta-page {
  page-break-before: always !important;
  page-break-after: always !important;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  min-height: 100vh;
  background: ${
    pdfThemes[bgTheme]?.background ||
    (bgTheme?.startsWith("linear") || bgTheme?.startsWith("#")
      ? bgTheme
      : "#ffffff")
  };
  color: ${
    ["royal", "dark", "graphite"].includes(bgTheme)
      ? "#ffffff"
      : "#111111"
  };
  padding: 40px 30px;
  box-sizing: border-box;
}


.footer-link {
  text-align: center;
  margin-top: 12px;
}

.footer-link .link-button {
  display: inline-block;
  background: linear-gradient(90deg, #00E07A 0%, #670fe7 100%);
  color: white;
  padding: 12px 26px;
  font-weight: 600;
  font-size: 16px;
  border: 1px solid white;
  border-radius: 30px;
  text-decoration: none;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.footer-link .link-button:hover {
  transform: scale(1.05);
  box-shadow: 0 0 10px rgba(0,0,0,0.3);
}




    </style>
  </head>
  <body>
  ${coverImgTag} 
    <div class="pdf-content">
  ${logoImgTag}
  ${content}
</div>
   ${cta || link
  ? (() => {
      const linkedCta = cta
        ? cta
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
            .replace(/(www\.[^\s]+)/g, '<a href="https://$1" target="_blank">$1</a>')
            .replace(/\n/g, "<br>")
        : "";

      const isDarkBg = ["royal", "dark", "graphite"].includes(bgTheme);
      const textColor = isDarkBg ? "#ffffff" : "#111111";
      const ctaBg = pdfThemes[bgTheme]?.ctaBg || "#00E07A";
      const ctaText = pdfThemes[bgTheme]?.ctaText || "#000000";
      const bgColor =
        pdfThemes[bgTheme]?.background ||
        (bgTheme?.startsWith("#") ? bgTheme : "#ffffff");

      return `
        <!-- Force break after content but avoid an empty page -->


        <section class="final-cta-page" style="
  break-before: page;
  width:100%;
  min-height:100vh;
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
                      border:2px solid ${isDarkBg ? "#fff" : "#000"};
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
              color:${isDarkBg ? "#d1d5db" : "#666"};
            ">
              — Your Partner in Growth
            </p>
          </div>
        </section>
      `;
    })()
  : ""}



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
