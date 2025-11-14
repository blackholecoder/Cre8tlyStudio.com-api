import express from "express";
import {
  checkUsernameAvailability,
  getCoverImageByPdfUrl,
  getLandingPageById,
  getLandingPageByUser,
  getOrCreateLandingPage,
  getUserLeads,
  saveLandingPageLead,
  updateLandingLogo,
  updateLandingPage,
} from "../../db/landing/dbLanding.js";
import { sendOutLookMail } from "../../utils/sendOutllokMail.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { uploadFileToSpaces } from "../../helpers/uploadToSpace.js";
import { isSafeUrl } from "../../utils/isSafeUrl.js";
import { blendColors } from "../../utils/blendColors.js";
const router = express.Router();

// Capture root requests for each subdomain
router.get("/", async (req, res) => {
  const { subdomain } = req;
  if (!subdomain) return res.status(404).send("Landing page not found");

  try {
    const landingPage = await getLandingPageByUser(subdomain);

    // --- 1️⃣ Default “coming soon” fallback
    if (!landingPage) {
      return res.send("<h1>Coming soon</h1>");
    }

    const mainOverlayColor = blendColors(
      landingPage.bg_theme.includes("#") ? landingPage.bg_theme : "#1e0033" // fallback if using gradient
    );

    // --- 2️⃣ Extract core properties

    const title = landingPage.username || landingPage.title || "Cre8tly Studio";

    const font = landingPage.font || "Montserrat";
    const bg =
      landingPage.bg_theme || "linear-gradient(to bottom, #ffffff, #F285C3)";

    // --- 3️⃣ Parse structured content blocks
    let contentHTML = "";

    const blocks = Array.isArray(landingPage.content_blocks)
      ? landingPage.content_blocks
      : [];

    const hasBanner = blocks.some((b) => b.type === "offer_banner");

    // --- 4️⃣ Build HTML from parsed blocks
    try {
      // 🧹 Remove offer_banner from normal rendering so it only appears at the top
      const filteredBlocks = blocks.filter((b) => b.type !== "offer_banner");

      contentHTML = filteredBlocks
        .map((block) => {
          const padding = block.padding || 20;

          switch (block.type) {
            case "heading":
              return `<h1 style="padding-bottom:${padding}px">${
                block.text || ""
              }</h1>`;

            case "subheading":
              return `<h2 style="padding-bottom:${padding}px">${
                block.text || ""
              }</h2>`;

            case "subsubheading":
              return `<h3 style="padding-bottom:${padding}px">${
                block.text || ""
              }</h3>`;

            case "list_heading":
              return `<p style="
                padding-bottom:${padding / 2}px;
                font-weight:${landingPage.font_weight_label || 700};
                font-size:1.15rem;
                text-align:${block.alignment || "left"};
                color:${landingPage.font_color_p || "#FFFFFF"};
                max-width:700px;
                margin:0 auto;
              ">${block.text || ""}</p>`;

            case "paragraph":
              const lines = (block.text || "").split(/\n/);
              const hasBullets = lines.some((line) =>
                line.trim().startsWith("•")
              );
              const labelLine =
                lines[0] && !lines[0].trim().startsWith("•") ? lines[0] : null;
              const contentLines = labelLine ? lines.slice(1) : lines;

              // ✅ If user explicitly chose bullet list
              if (block.bulleted) {
                const listItems = lines
                  .filter((line) => line.trim() !== "")
                  .map((line) => `<li>${line.replace(/^•\s*/, "")}</li>`)
                  .join("");

                return `
      <ul style="
        list-style: disc;
        padding-left:1.5rem;
        text-align:${block.alignment || "left"};
        color:${landingPage.font_color_p || "#FFFFFF"};
        line-height:1.8;
        max-width:700px;
        margin:0 auto;
        padding-bottom:${padding}px;
      ">
        ${listItems}
      </ul>
    `;
              }

              // 🟡 Fallback: auto-detect existing bullet style (old data)
              if (hasBullets) {
                return `
      <div style="padding-bottom:${padding}px; max-width:700px; margin:0 auto; text-align:left; line-height:1.8;">
        ${
          labelLine
            ? `<p style="
                font-weight:${landingPage.font_weight_label || 600};
                font-size:1.15rem;
                margin-bottom:6px;
                color:${landingPage.font_color_p || "#FFFFFF"};
              ">${labelLine}</p>`
            : ""
        }
        <ul style="list-style: disc; padding-left:1.5rem; color:${
          landingPage.font_color_p || "#FFFFFF"
        };">
          ${contentLines
            .map((line) =>
              line.trim().startsWith("•")
                ? `<li>${line.replace(/^•\s*/, "")}</li>`
                : ""
            )
            .join("")}
        </ul>
      </div>`;
              }

              // 🧾 Normal paragraph fallback
              return `<p style="
    padding-bottom:${padding}px;
    white-space:pre-line;
    text-align:${block.alignment || "left"};
    max-width:700px;
    margin:0 auto;
    line-height:1.8;
    color:${landingPage.font_color_p || "#FFFFFF"};
  ">${block.text}</p>`;

            case "button":
              return `
    <div style="text-align:center; margin:40px 0 60px;">
      <a 
        href="${block.url || "#"}" 
        class="btn"
        ${block.new_tab ? 'target="_blank" rel="noopener noreferrer"' : ""}
        style="display:inline-block;"
      >
        ${block.text || "Click Here"}
      </a>
    </div>
  `;

            case "video":
              const videoPadding = block.padding || 20;
              const videoUrl = block.url || "";
              const caption = block.caption || "";
              const autoplay = block.autoplay ? "autoplay" : "";
              const loop = block.loop ? "loop" : "";
              const muted = block.muted ? "muted" : "";

              if (!videoUrl) return "";

              // Determine embed type
              let embedHTML = "";
              if (
                videoUrl.includes("youtube.com") ||
                videoUrl.includes("youtu.be")
              ) {
                embedHTML = `<iframe 
      src="${videoUrl.replace("watch?v=", "embed/")}" 
      title="YouTube video" 
      style="width:100%;aspect-ratio:16/9;border:none;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.35);" 
      allow="autoplay; fullscreen"
      allowfullscreen
    ></iframe>`;
              } else if (videoUrl.includes("vimeo.com")) {
                embedHTML = `<iframe 
      src="${videoUrl.replace("vimeo.com", "player.vimeo.com/video")}" 
      title="Vimeo video" 
      style="width:100%;aspect-ratio:16/9;border:none;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.35);" 
      allow="autoplay; fullscreen"
      allowfullscreen
    ></iframe>`;
              } else {
                embedHTML = `<video 
      src="${videoUrl}" 
      ${autoplay} ${loop} ${muted} 
      controls 
      style="width:100%;max-width:800px;display:block;margin:0 auto;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.35);" 
    ></video>`;
              }

              return `
    <div style="
      text-align:center;
      padding-bottom:${videoPadding}px;
      margin-top:40px;
    ">
      ${
        caption
          ? `<p style="
                margin-bottom:16px;
                font-size:1.1rem;
                color:${landingPage.font_color_h1 || "#FFFFFF"};
                font-weight:700;
                text-transform:uppercase;
                text-align:center;
                letter-spacing:0.5px;
              ">${caption}</p>`
          : ""
      }
      ${embedHTML}
    </div>
  `;

            case "divider":

            case "spacer":
              const dividerHeight = block.height || 40;
              const dividerStyle = block.style || "line";
              const dividerColor = block.color || "rgba(255,255,255,0.2)";
              const dividerWidth = block.width || "60%";

              if (dividerStyle === "space") {
                return `<div style="height:${dividerHeight}px;"></div>`;
              }

              return `
    <hr style="
      border: none;
      border-top: 1px solid ${dividerColor};
      width: ${dividerWidth};
      margin: ${dividerHeight / 2}px auto;
      opacity: 0.6;
    " />
  `;

            case "offer_banner":
              const bannerBg = block.use_gradient
                ? `linear-gradient(${block.gradient_direction || "90deg"}, ${
                    block.gradient_start || "#F285C3"
                  }, ${block.gradient_end || "#7bed9f"})`
                : block.bg_color || "#F285C3";

              const buttonBg = bannerBg;

              return `
    <div style="
      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:center;
      background:${bannerBg};
      color:${block.text_color || "#fff"};
      text-align:center;
      padding:${block.padding || 40}px 20px;
      font-weight:600;
      font-size:1.2rem;
      line-height:1.5;

      /* ✅ FINAL VERSION THAT WILL SHOW ROUNDED TOP CORNERS */
position: relative;
top: -60px;                         /* rise into main’s top curve */
margin: 0 -30px -20px;              /* align to edges */
border-radius: 24px 24px 0 0;       /* top corners rounded */
overflow: hidden;                   /* clip the gradient inside */
-webkit-mask-image: -webkit-radial-gradient(white, black); /* Safari fix */
background-clip: padding-box;
-webkit-background-clip: padding-box; /* Safari fix */
isolation: isolate;                 /* ensures z-index and clipping work */
z-index: 5;
box-shadow: 0 6px 24px rgba(0,0,0,0.3);

      z-index: 2;
    ">
      <div style="max-width:800px;margin:0 auto;">
        <p style="
          font-size:1.5rem;
          font-weight:700;
          margin:0 0 22px;
          text-align:center;
          color:${block.text_color || "#fff"};
        ">
          ${block.text || "🔥 Limited Time Offer! Get your free eBook today!"}
        </p>

        ${
          block.link_text && block.link_url
            ? `<a href="${block.link_url}" target="_blank" rel="noopener noreferrer"
                style="
                  display:inline-block;
                  background:${buttonBg};
                  color:#fff;
                  padding:14px 32px;
                  border-radius:10px;
                  font-weight:700;
                  font-size:1rem;
                  text-decoration:none;
                  box-shadow:0 4px 15px rgba(0,0,0,0.3);
                  transition:transform 0.25s ease;
                "
                onmouseover="this.style.transform='scale(1.05)'"
                onmouseout="this.style.transform='scale(1)'"
              >
                ${block.link_text}
              </a>`
            : ""
        }
      </div>
    </div>
  `;

            case "calendly":
              if (!block.calendly_url) return "";

              const calendlyHeight = block.height || 700;
              const title = block.title || "Book a Call";
              const titleColor = block.title_color || "#FFFFFF"; // default white

              return `
    <div style="
      text-align:center;
      padding-bottom:${padding || 40}px;
      margin-top:40px;
    ">
      <p style="
        margin-bottom:16px;
        font-size:1.5rem;
        font-weight:700;
        color:${titleColor};
        text-align:center;
        text-transform:none;
      ">
        ${title}
      </p>
      <iframe
        src="${block.calendly_url}"
        title="Calendly Booking"
        style="
          width:100%;
          max-width:400px;
          height:${calendlyHeight}px;
          border:none;
          border-radius:12px;
          box-shadow:0 4px 20px rgba(0,0,0,0.35);
        "
        loading="lazy"
      ></iframe>
    </div>
  `;

            case "social_links": {
              const align = block.alignment || "center";
              const iconStyle = block.icon_style || "color";
              const iconColor = block.icon_color || "#ffffff";
              const links = block.links || {};

              const iconSet = {
                instagram:
                  "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/instagram.svg",
                threads:
                  "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/threads.svg",
                twitter:
                  "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg",
                youtube:
                  "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg",
                linkedin:
                  "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/linkedin.svg",
                facebook:
                  "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/facebook.svg",
                tiktok:
                  "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/tiktok.svg",
              };

              const renderedIcons = Object.entries(links)
                .filter(([platform, url]) => url && iconSet[platform])
                .map(
                  ([platform, url]) => `
        <a href="${url}" target="_blank" rel="noopener noreferrer"
          style="
            display:inline-block;
            width:24px;
            height:24px;
            margin:0 10px;
            transition:transform 0.2s ease, opacity 0.2s ease;
            text-decoration:none;
          "
          onmouseover="this.style.transform='scale(1.1)';this.style.opacity='0.9';"
          onmouseout="this.style.transform='scale(1)';this.style.opacity='1';"
        >
          <div
            style="
              width:100%;
              height:100%;
              -webkit-mask:url(${iconSet[platform]}) no-repeat center / contain;
              mask:url(${iconSet[platform]}) no-repeat center / contain;
              background-color:${iconStyle === "mono" ? "#ffffff" : iconColor};
              transition:transform 0.2s ease;
            "
          ></div>
        </a>`
                )
                .join("");

              return `
    <div style="
      text-align:${align};
      padding:40px 0 60px;
    ">
      ${renderedIcons}
    </div>
  `;
            }

            case "countdown": {
              const label = block.text || "Offer Ends In:";
              const variant = block.style_variant || "minimal";
              const targetDate = block.target_date || null;

              if (!targetDate) return "";

              // Determine accent color from bg_theme
              const getAccentColor = () => {
                const theme = landingPage.bg_theme || "";
                if (theme.includes("emerald")) return "#10b981";
                if (theme.includes("purple") || theme.includes("royal"))
                  return "#8b5cf6";
                if (theme.includes("pink") || theme.includes("rose"))
                  return "#ec4899";
                if (theme.includes("yellow") || theme.includes("amber"))
                  return "#facc15";
                if (theme.includes("blue")) return "#3b82f6";
                if (theme.includes("red")) return "#ef4444";
                return "#10b981";
              };
              const accent = getAccentColor();

              // Minimal inline CSS for countdown
              const styleMap = {
                minimal: `
      font-size:2rem;
      font-family:monospace;
      letter-spacing:2px;
      color:${landingPage.font_color_h1 || "#fff"};
    `,
                boxed: `
      display:inline-block;
      background:rgba(0,0,0,0.3);
      border:1px solid rgba(255,255,255,0.2);
      border-radius:10px;
      padding:16px 30px;
      font-size:1.8rem;
      font-family:monospace;
      color:${landingPage.font_color_h1 || "#fff"};
    `,
                glow: `
      font-size:2rem;
      font-family:monospace;
      letter-spacing:2px;
      color:${accent};
      text-shadow:0 0 12px ${accent};
      animation:pulseGlow 2s infinite;
    `,
              };

              return `
  <div style="text-align:center;padding:50px 0;">
    <p style="font-weight:700;font-size:1.3rem;color:${
      landingPage.font_color_h1 || "#fff"
    };margin-bottom:10px;">
      ${label}
    </p>
    <div 
      id="countdown-${block.id || Math.random().toString(36).substring(2, 8)}" 
      style="${styleMap[variant] || styleMap.minimal}"
      data-target="${targetDate}"
    >
      00:00:00:00
    </div>
    <div style="color:${
      landingPage.font_color_p || "#ccc"
    };font-size:0.9rem;margin-top:8px;letter-spacing:1px;">
      DAYS&nbsp;&nbsp;|&nbsp;&nbsp;HRS&nbsp;&nbsp;|&nbsp;&nbsp;MIN&nbsp;&nbsp;|&nbsp;&nbsp;SEC
    </div>
  </div>
  `;
            }

            default:
              return "";
          }
        })
        .join("");
    } catch (err) {
      console.error("❌ Failed to render content blocks:", err);
      contentHTML = "";
    }

    let coverImageUrl = null;
    if (landingPage.pdf_url) {
      coverImageUrl = await getCoverImageByPdfUrl(landingPage.pdf_url);
    }
    landingPage.cover_image_url = coverImageUrl;

    // ✅ Move offer_banner above cover image automatically
    let bannerHTML = "";
    if (blocks.some((b) => b.type === "offer_banner")) {
      // extract only the banner parts
      bannerHTML = blocks
        .filter((b) => b.type === "offer_banner")
        .map((b) => {
          // reuse your existing switch logic
          const bannerBg = b.match_main_bg
            ? mainOverlayColor // 👈 matches the content div overlay color
            : b.use_gradient
            ? `linear-gradient(${b.gradient_direction || "90deg"}, ${
                b.gradient_start || "#F285C3"
              }, ${b.gradient_end || "#7bed9f"})`
            : b.bg_color || "#F285C3";

          const buttonBg = bannerBg;
          return `
        <div style="
          display:flex;
          flex-direction:column;
          justify-content:center;
          align-items:center;
          background:${bannerBg};
          color:${b.text_color || "#fff"};
          text-align:center;
          padding:${b.padding || 50}px 20px;
          font-weight:600;
          font-size:1.2rem;
          line-height:1.5;
          margin:0 -30px 40px;
          border-radius: 24px 24px 0 0;
          box-shadow:0 6px 24px rgba(0,0,0,0.3);
        ">
          <div style="max-width:800px;margin:0 auto;">
            <p style="
              font-size:1.5rem;
              font-weight:700;
              margin:0 0 22px;
              text-align:center;
              color:${b.text_color || "#fff"};
            ">
              ${b.text || "🔥 Limited Time Offer! Get your free eBook today!"}
            </p>
            ${
              b.link_text && b.link_url
                ? `<a href="${b.link_url}" target="_blank" rel="noopener noreferrer"
                    style="
                      display:inline-block;
                      background:${buttonBg};
                      color:#fff;
                      padding:14px 32px;
                      border-radius:10px;
                      font-weight:700;
                      font-size:1rem;
                      text-decoration:none;
                      box-shadow:0 4px 15px rgba(0,0,0,0.3);
                      transition:transform 0.25s ease;
                    "
                    onmouseover="this.style.transform='scale(1.05)'"
                    onmouseout="this.style.transform='scale(1)'"
                  >
                    ${b.link_text}
                  </a>`
                : ""
            }
          </div>
        </div>
      `;
        })
        .join("");
    }

    function isDarkColor(hex) {
      if (!hex || !hex.startsWith("#")) return true; // default dark
      const h = hex.replace("#", "");
      const bigint = parseInt(
        h.length === 3
          ? h
              .split("")
              .map((x) => x + x)
              .join("")
          : h,
        16
      );
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness < 128; // true if dark
    }

    const visualColor = landingPage.bg_theme?.includes("#")
      ? landingPage.bg_theme
      : mainOverlayColor; // use overlay for gradients

    const footerTextColor = isDarkColor(visualColor) ? "#ffffff" : "#000000";

    // --- 4️⃣ Render HTML with your new blocks injected
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${title}</title>
          <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(
            font
          )}:wght@400;600;700&display=swap" rel="stylesheet" />
         <style>
  html, body {
    margin: 0;
    padding: 0;
    font-family: '${font}', sans-serif;
    height: 100%;
    min-height: 100vh;
    background: ${bg};
    background-attachment: fixed;
    background-size: cover;
    background-position: center;
    overflow-x: hidden;
    overscroll-behavior: none;
    color: #222;
  }

    header {
  position: relative;
  display: flex;
  justify-content: center; /* future cover centers */
  align-items: center;
  width: 100%;
  padding: 40px 20px 0;
}

header .logo {
  position: absolute;
  top: 20px;
  left: 30px;
  height: 45px;           /* smaller height */
  max-width: 140px;       /* narrower width */
  object-fit: contain;
  border-radius: 6px;     /* subtle rounding if needed */
  padding: 0;             /* remove inner padding */
  background: none;       /* no white or semi-transparent background */
  box-shadow: none;       /* clean, no shadow */
}

/* 🔹 Optional PDF cover (centered) */
header .cover {
  max-height: 260px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.25);
}

.cover-image {
  display: block;
  margin: 70px auto 50px;
  width: 100%;
  max-width: 480px;           /* balanced width */
  aspect-ratio: 3 / 4;        /* classic book/PDF ratio */
  border-radius: 12px;
  object-fit: cover;
  box-shadow:
    0 15px 35px rgba(0, 0, 0, 0.25),
    0 6px 20px rgba(0, 0, 0, 0.15);
  background: #000;
  border: 2px solid rgba(255, 255, 255, 0.06);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}


  main {
    max-width: 850px;
    margin: 60px auto;
    padding: 0px 30px 100px;
    text-align: center;
    background: ${mainOverlayColor};
    backdrop-filter: blur(6px);
    border-radius: 24px;
    box-shadow: 0 4px 25px rgba(0,0,0,0.15);
  }

  main {
  overflow: visible; /* ✅ allows banner to rise above padding visually */
}

 h1, h2, h3 {
  max-width: 700px;
  margin: 0 auto 1.5rem; /* unified vertical rhythm */
  text-align: center;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: ${landingPage.font_color_h1 || "#FFFFFF"};
  line-height: 1.3;
}

h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: ${landingPage.font_color_h2 || "#FFFFFF"};
  line-height: 1.4;
}

h3 {
  font-size: 1.4rem;
  font-weight: 500;
  color: ${landingPage.font_color_h3 || "#FFFFFF"};
  line-height: 1.5;
}

p {
  max-width: 700px;
  margin: 0 auto 1.5rem;
  text-align: left;              /* ✅ Left-align paragraphs and bullets */
  font-size: 1.1rem;
  line-height: 1.8;
  color: ${landingPage.font_color_p || "#FFFFFF"};
}


  img {
    max-width: 280px;
    border-radius: 12px;
    margin-bottom: 40px;
  }

 .btn {
  display: inline-block;
  background: #7bed9f;
  color: #000;
  padding: 12px 28px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: 0.3px;
  line-height: 1.2;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, box-shadow 0.3s ease, background 0.3s ease;
}
.btn:hover {
  background: #5fd98d;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

 form {
  margin-top: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap; /* ✅ allows wrapping on mobile */
  gap: 10px;
  width: 100%;             
  max-width: 700px;       
  margin-left: auto;       
  margin-right: auto;      
}

  input[type="email"] {
  padding: 12px 20px;
  width: 100%;
  max-width: 320px; /* ✅ fits nicely on desktop */
  border-radius: 6px;
  border: 1px solid #ccc;
  flex: 1;
}

  button {
  background: #000;
  color: #fff;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s, transform 0.2s ease;
  width: 100%;
  max-width: 200px; /* ✅ ensures button doesn’t overflow */
}


  button:hover {
    background: #7bed9f;
    color: #000;
    transform: translateY(-1px);
  }

  footer {
    margin-top: 60px;
    font-size: 0.95rem;
    color: #ccc;
  }

  footer em {
  color: #fff;
  font-style: normal; /* optional */
}

main {
  position: relative;
  min-height: 100vh;
}

main p.powered {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  text-align: center;
}

.cover-wrapper {
  padding-top: 50px;   /* 👈 Adjust this value until it looks right */
}

div[style*="linear-gradient"] {
  border-radius: inherit;
  overflow: hidden;
  -webkit-mask-image: -webkit-radial-gradient(white, black);
}

  /* Responsive */
  @media (max-width: 768px) {
    main {
    max-width: 90%;
    padding: 40px 12px 60px;
    background: none;
    backdrop-filter: none;
    box-shadow: none;
    border-radius: 0;
  }

  header .logo {
  height: 35px;
  left: 16px;
  top: 12px;
}

    h1 { font-size: 2rem; }
    h2 { font-size: 1.5rem; }
    p  { font-size: 1rem; }
    input[type="email"], button { width: 100%; margin: 6px 0; }

    .cover-wrapper {
    padding-top: 30px;   /* smaller gap on mobile */
  }
  }
@media (max-width: 600px) {
  form {
    flex-direction: column; /* ✅ stacks input and button vertically */
  }

  input[type="email"],
button {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;  /* ✅ NEW - prevents off-screen padding overflow */
}
}


</style>

        </head>

        <body>
        <header>
  ${
    landingPage.logo_url
      ? `<img src="${landingPage.logo_url}" alt="Brand Logo" class="logo" />`
      : ""
  }

  
</header>

  <main>
  ${bannerHTML}
${
  landingPage.cover_image_url
    ? `
      <div class="cover-wrapper">
        <img src="${landingPage.cover_image_url}" alt="Cover" class="cover-image" />
      </div>
    `
    : ""
}

    ${
      contentHTML ||
      "<h1>Welcome to My Page</h1><p>Start customizing your content.</p>"
    }

    ${
      landingPage.show_download_button
        ? `
  <form id="leadForm">
    <input type="hidden" name="landingPageId" value="${landingPage.id}" />
    <input type="email" name="email" placeholder="Email address" required />
    <button type="submit">Download Now</button>
  </form>

  <p id="thankyou" 
     style="display:none;color:white;margin-top:30px;font-size:1.1rem;text-align:center;">
    🎁 Check your inbox for the download link!
  </p>
`
        : ""
    }

    <script>
function initCountdowns() {
  const elements = document.querySelectorAll('[id^="countdown-"]');
  elements.forEach(el => {
    const targetDate = new Date(el.dataset.target);
    if (!targetDate) return;

    const update = () => {
      const now = new Date();
      const diff = targetDate - now;
      if (diff <= 0) {
  el.textContent = "00:00:00:00";
  el.style.opacity = "0.5";
  el.style.transition = "opacity 1.5s ease";
  setTimeout(() => el.parentElement.style.display = "none", 2000);
  return;
}
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      el.textContent = 
        String(d).padStart(2,"0")+":"+
        String(h).padStart(2,"0")+":"+
        String(m).padStart(2,"0")+":"+
        String(s).padStart(2,"0");
    };
    update();
    setInterval(update, 1000);
  });
}

document.addEventListener("DOMContentLoaded", initCountdowns);
</script>
<style>
@keyframes pulseGlow {
  0%, 100% { text-shadow: 0 0 8px rgba(255,255,255,0.4); }
  50% { text-shadow: 0 0 16px rgba(255,255,255,0.9); }
}
</style>



<script>
document.getElementById("leadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value;
  const landingPageId = form.landingPageId.value;

  try {
    const res = await fetch("https://cre8tlystudio.com/api/landing/landing-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ landingPageId, email }),
    });

    const data = await res.json();

    if (data.success) {
      form.style.display = "none";
      document.getElementById("thankyou").style.display = "block";
    } else {
      alert(data.message || "Something went wrong. Please try again.");
    }
  } catch (err) {
    console.error("Submission error:", err);
    alert("Server error. Please try again later.");
  }
});
</script>




    <footer>
      ${
        landingPage.email_thank_you_msg
          ? `<footer><em>${landingPage.email_thank_you_msg}</em></footer>`
          : ""
      }
     <p class="powered" style="color:${footerTextColor}">
  Powered by 
  <a 
    href="https://cre8tlystudio.com" 
    target="_blank" 
    rel="noopener noreferrer"
    style="color:${footerTextColor};text-decoration:none;font-weight:bold;"
  >
    Cre8tly Studio
  </a>
</p>

    </footer>
  </main>
  <footer style="
  display:flex;
  justify-content:flex-end;
  align-items:center;
  flex-wrap:wrap;
  gap:10px;
  padding:25px 50px;
  font-size:0.85rem;
  background:rgba(0,0,0,0.3);
  backdrop-filter:blur(6px);
  color:${footerTextColor};
  border-top:1px solid rgba(255,255,255,0.05);
">
  <span style="flex:1;text-align:left;opacity:0.7;">
    © ${new Date().getFullYear()} Alure Digital. All rights reserved
  </span>

  <div style="text-align:right;opacity:0.8;">
    <a href="https://cre8tlystudio.com/terms" target="_blank" rel="noopener noreferrer"
       style="color:${footerTextColor};text-decoration:none;margin:0 8px;">
      Terms
    </a> |
    <a href="https://cre8tlystudio.com/privacy-policy" target="_blank" rel="noopener noreferrer"
       style="color:${footerTextColor};text-decoration:none;margin:0 8px;">
      Privacy
    </a> |
    <a href="https://cre8tlystudio.com/cookies-policy" target="_blank" rel="noopener noreferrer"
       style="color:${footerTextColor};text-decoration:none;margin:0 8px;">
      Cookies
    </a> |
    <a href="https://cre8tlystudio.com/refund-policy" target="_blank" rel="noopener noreferrer"
       style="color:${footerTextColor};text-decoration:none;margin:0 8px;">
      Refunds
    </a>
  </div>
</footer>

<script>
async function trackEvent(eventType) {
  try {
    await fetch("https://cre8tlystudio.com/api/landing-analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        landing_page_id: "${landingPage.id}",
        event_type: eventType
      }),
    });
  } catch (err) {
    console.error("❌ Analytics error:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // ✅ Track initial page view
  trackEvent("view");

  // ✅ Track clicks on regular link buttons
  document.querySelectorAll("a.btn").forEach(btn => {
    btn.addEventListener("click", () => trackEvent("click"));
  });

  // ✅ Track PDF link clicks
  document.querySelectorAll('a[href$=".pdf"]').forEach(link => {
    link.addEventListener("click", () => trackEvent("download"));
  });

  // ✅ Track the "Download Now" button (form submit)
  const leadForm = document.getElementById("leadForm");
  if (leadForm) {
    leadForm.addEventListener("submit", async () => {
      // The user clicked the button → count this as a click + download
      await trackEvent("click");
      await trackEvent("download");
    });
  }
});
</script>




</body>

      </html>
    `);
  } catch (err) {
    console.error("❌ Error loading landing page:", err);
    res.status(500).send("Server error");
  }
});

router.post("/landing-leads", async (req, res) => {
  try {
    const { landingPageId, email } = req.body;

    if (!landingPageId || !email) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // 1️⃣ Save the lead
    const lead = await saveLandingPageLead(landingPageId, email);

    // 2️⃣ Get landing page data
    const landingPage = await getLandingPageById(landingPageId);
    if (!landingPage) {
      return res
        .status(404)
        .json({ success: false, message: "Landing page not found" });
    }

    // 3️⃣ Compose email HTML (clean and branded)
    // const emailHtml = `
    //   <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #030303; padding: 40px 30px; border-radius: 12px; border: 1px solid #f1f1f1; max-width: 600px; margin: 0 auto;">
    //   <div style="text-align: center; margin-bottom: 25px;">
    //     <img src="https://cre8tlystudio.com/cre8tly-logo-white.png" alt="Cre8tly Studio" style="width: 120px; height: auto; margin-bottom: 15px;" />
    //     <h1 style="color: #670fe7; font-size: 26px; margin: 0;">Your Free Guide Awaits</h1>
    //   </div>

    //   <p style="color: #fff; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
    //     Thanks for connecting with <strong>${landingPage.username}</strong>! 🎉
    //   </p>

    //   <p style="color: #444; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
    //     ${
    //       landingPage.email_thank_you_msg ||
    //       "Your download is ready below — enjoy this exclusive Cre8tly guide created just for you."
    //     }
    //   </p>

    //   <div style="text-align: center; margin-top: 30px;">
    //     <a href="${landingPage.pdf_url}" target="_blank"
    //       style="background-color: #7bed9f; color: #000000; padding: 14px 34px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(242,133,195,0.4);">
    //       Download Your PDF
    //     </a>
    //   </div>

    //   <div style="margin-top: 35px; text-align: center;">
    //     <p style="font-size: 14px; color: #666; line-height: 1.6; margin: 0;">
    //       Ready to elevate your next project? Visit
    //       <a href="https://cre8tlystudio.com" target="_blank" style="color: #7bed9f; text-decoration: none; font-weight: 600;">
    //         Cre8tly Studio
    //       </a>
    //       for professional tools that help you design, write, and publish like a pro.
    //     </p>
    //   </div>

    //   <hr style="border: none; border-top: 1px solid #f1f1f1; margin: 40px 0;" />

    //   <p style="color: #999; font-size: 12px; text-align: center;">
    //     © ${new Date().getFullYear()} Cre8tly Studio · Alure Digital<br/>
    //     You received this email because you downloaded a file through ${
    //       landingPage.username
    //     }'s Cre8tly page.
    //   </p>
    // </div>
    // `;
    const emailHtml = `
  <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0d0d0d; padding: 40px 30px; border-radius: 12px; border: 1px solid #1f1f1f; max-width: 600px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 25px;">
      <img src="https://cre8tlystudio.com/cre8tly-logo-white.png" alt="Cre8tly Studio" style="width: 120px; height: auto; margin-bottom: 15px;" />
      <h1 style="color: #7bed9f; font-size: 26px; margin: 0;">Your Free Guide Awaits</h1>
    </div>

    <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 20px; text-align: center;">
      Thanks for connecting with <strong style="color: #ffffff;">${landingPage.username}</strong>! 🎉
    </p>

    <p style="color: #b3b3b3; font-size: 15px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
      ${
        landingPage.email_thank_you_msg ||
        "Your download is ready below — enjoy this exclusive Cre8tly guide created just for you."
      }
    </p>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${landingPage.pdf_url}" target="_blank"
        style="background: linear-gradient(90deg, #7bed9f, #670fe7); color: #000000; padding: 14px 34px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block; box-shadow: 0 4px 14px rgba(103, 15, 231, 0.4); letter-spacing: 0.3px;">
        Download Your PDF
      </a>
    </div>

    <div style="margin-top: 35px; text-align: center;">
      <p style="font-size: 14px; color: #999; line-height: 1.6; margin: 0;">
        Ready to elevate your next project? Visit
        <a href="https://cre8tlystudio.com" target="_blank" style="color: #7bed9f; text-decoration: none; font-weight: 600;">
          Cre8tly Studio
        </a>
        for professional tools that help you design, write, and publish like a pro.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #1f1f1f; margin: 40px 0;" />

    <p style="color: #777; font-size: 12px; text-align: center;">
      © ${new Date().getFullYear()} Cre8tly Studio · Alure Digital<br/>
      You received this email because you downloaded a file through <strong style="color: #ccc;">${
        landingPage.username
      }</strong>'s Cre8tly page.
    </p>
  </div>
`;


    // 4️⃣ Send via Outlook
    await sendOutLookMail({
      to: email,
      subject: `🎁 Your download from ${landingPage.username}`,
      html: emailHtml,
    });

    console.log(
      `✅ PDF email sent to ${email} for landing page ${landingPageId}`
    );

    res
      .status(200)
      .json({ success: true, message: "Lead saved and email sent" });
  } catch (err) {
    console.error("❌ Lead error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/builder/:userId", authenticateToken, async (req, res) => {
  try {
    console.log("🧭 /builder route hit");
    const { userId } = req.params;

    if (!req.user?.id) {
      console.log("❌ No user in token");
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (req.user.id !== userId) {
      console.log(`🚫 Token mismatch: ${req.user.id} !== ${userId}`);
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const landingPage = await getOrCreateLandingPage(userId);
    if (landingPage.error) {
      return res.status(landingPage.status || 500).json({
        success: false,
        message: landingPage.error,
      });
    }

    res.json({ success: true, landingPage });
  } catch (err) {
    console.error("🔥 Error in /builder route:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/update/:id", authenticateToken, async (req, res) => {
  try {
    console.log("🧠 Incoming landing page update body:", req.body);
    const { id } = req.params;

    // 🧩 If content_blocks exist, validate URLs inside them
    if (Array.isArray(req.body.content_blocks)) {
      req.body.content_blocks = await Promise.all(
        req.body.content_blocks.map(async (block) => {
          if (block.type === "button" && !isSafeUrl(block.url)) {
            console.warn("⚠️ Unsafe URL blocked:", block.url);

            // ⚠️ 1️⃣ Send alert email to admin
            try {
              await sendOutLookMail({
                to: "business@aluredigital.com",
                subject: "🚨 Unsafe URL Blocked in Landing Page Update",
                html: `
                  <div style="font-family:Arial,Helvetica,sans-serif; background:#fff; padding:20px; border-radius:10px; border:1px solid #eee; max-width:600px;">
                    <h2 style="color:#e74c3c;">🚨 Suspicious URL Blocked</h2>
                    <p><strong>User ID:</strong> ${
                      req.user?.id || "Unknown"
                    }</p>
                    <p><strong>Landing Page ID:</strong> ${id}</p>
                    <p><strong>URL Attempted:</strong> ${block.url}</p>
                    <p style="color:#555;">
                      This URL was automatically blocked and replaced with "#".
                      Please review this user's activity for potential abuse.
                    </p>
                    <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
                    <p style="font-size:12px;color:#888;">Sent automatically by Cre8tly Studio Security System</p>
                  </div>
                `,
              });
              console.log(
                "📧 Security alert email sent for unsafe URL:",
                block.url
              );
            } catch (mailErr) {
              console.error("❌ Failed to send security email:", mailErr);
            }

            // 2️⃣ Neutralize URL before saving
            block.url = "#";
          }

          return block;
        })
      );
    }

    const result = await updateLandingPage(id, req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Landing page not found",
      });
    }

    res.json({ success: true, message: "Landing page updated successfully" });
  } catch (err) {
    console.error("❌ Error in /update/:id:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/check-username/:username", authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user?.id;

    if (!username || username.length < 3) {
      return res
        .status(400)
        .json({ available: false, message: "Username too short" });
    }

    const available = await checkUsernameAvailability(username, currentUserId);

    if (!available) {
      return res.json({
        available: false,
        message: "That username is already taken.",
      });
    }

    res.json({ available: true, message: "This username is available!" });
  } catch (err) {
    console.error("🔥 Error in /check-username route:", err);
    res
      .status(500)
      .json({ available: false, message: "Server error checking username" });
  }
});

router.post("/upload-logo", async (req, res) => {
  try {
    const { landingId } = req.body;
    const logo = req.files?.logo;

    if (!landingId || !logo) {
      return res.status(400).json({
        success: false,
        message: "Missing landingId or logo file",
      });
    }

    // Build filename and upload to Spaces
    const ext = logo.name.split(".").pop();
    const fileName = `landing_logos/${landingId}-${Date.now()}.${ext}`;
    const result = await uploadFileToSpaces(logo.data, fileName, logo.mimetype);

    // Save URL to DB
    await updateLandingLogo(landingId, result.Location);

    res.json({ success: true, logo_url: result.Location });
  } catch (err) {
    console.error("❌ Error uploading logo:", err);
    res.status(500).json({
      success: false,
      message: "Failed to upload logo",
    });
  }
});

router.get("/lead-magnets/cover", async (req, res) => {
  try {
    const { pdfUrl } = req.query;
    if (!pdfUrl) {
      return res
        .status(400)
        .json({ success: false, message: "Missing pdfUrl" });
    }

    const cover = await getCoverImageByPdfUrl(pdfUrl);
    if (!cover) {
      return res.json({ success: false, message: "No cover found" });
    }

    res.json({ success: true, cover_image: cover });
  } catch (err) {
    console.error("❌ Error in /lead-magnets/cover route:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/leads", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const data = await getUserLeads(req.user.id, page, limit);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error("Error fetching leads:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
