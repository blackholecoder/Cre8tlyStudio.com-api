import express from "express";
import {
  checkUsernameAvailability,
  deleteLandingTemplate,
  getCoverImageByPdfUrl,
  getLandingPageById,
  getLandingPageByUser,
  getLandingTemplatesByPage,
  getOrCreateLandingPage,
  getUserLeads,
  loadLandingTemplate,
  restoreLandingTemplate,
  saveLandingPageLead,
  saveLandingTemplate,
  updateLandingLogo,
  updateLandingPage,
  updateTemplateVersion,
} from "../../db/landing/dbLanding.js";
import { sendOutLookMail } from "../../utils/sendOutllokMail.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { uploadFileToSpaces } from "../../helpers/uploadToSpace.js";
import { isSafeUrl } from "../../utils/isSafeUrl.js";
import { blendColors } from "../../utils/blendColors.js";
import { optimizeImageUpload } from "../../helpers/optimizeImageUpload.js";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { renderHead } from "./renderers/layout/renderHead.js";
import { renderFooter } from "./renderers/layout/renderFooter.js";
import { renderLegalFooter } from "./renderers/layout/renderLegalFooter.js";
import { renderLandingAnalyticsScript } from "./renderers/scripts/renderLandingAnalyticsScript.js";
import { renderStripeCheckoutScript } from "./renderers/scripts/renderStripeCheckoutScript.js";
import { renderHeader } from "./renderers/layout/renderHeader.js";
import { renderCountdownScript } from "./renderers/scripts/renderCountdownScript.js";
import { renderLeadFormScript } from "./renderers/scripts/renderLeadFormScript.js";
import { renderCountdownStyles } from "./renderers/layout/renderCountdownStyles.js";
import { renderLeadCaptureForm } from "./renderers/layout/renderLeadCaptureForm.js";
import { renderCoverImage } from "./renderers/layout/renderCoverImage.js";
import { renderContentArea } from "./renderers/layout/renderContentArea.js";
import { renderLandingBlocks } from "./renderers/layout/renderLandingBlocks.js";

const router = express.Router();

function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    exec(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      (err, stdout) => {
        if (err) return reject(err);
        resolve(Math.floor(Number(stdout)));
      }
    );
  });
}

// Capture root requests for each subdomain
router.get("/", async (req, res, next) => {
  const { subdomain } = req;

  if (!subdomain) {
    return next(); // passes to the next route → /r/:slug will now work
  }

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

    const titleBase =
      landingPage.username || landingPage.title || "Cre8tly Studio";
    const title = `${titleBase} | Cre8tly Studio`;

    const font = landingPage.font || "Montserrat";
    const bg =
      landingPage.bg_theme || "linear-gradient(to bottom, #ffffff, #F285C3)";

    // --- 3️⃣ Parse structured content blocks
    let contentHTML = "";

    const blocks = Array.isArray(landingPage.content_blocks)
      ? landingPage.content_blocks
      : [];

    // --- 4️⃣ Build HTML from parsed blocks
    try {
      // 🧹 Remove offer_banner from normal rendering so it only appears at the top
      const contentBlocks = blocks.filter((b) => b.type !== "offer_banner");

      contentHTML = renderLandingBlocks({
        blocks: contentBlocks,
        landingPage,
        mainOverlayColor,
      });
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
          const bannerBg = b.match_main_bg
            ? mainOverlayColor
            : b.use_gradient
            ? `linear-gradient(${b.gradient_direction || "90deg"}, ${
                b.gradient_start || "#F285C3"
              }, ${b.gradient_end || "#7bed9f"})`
            : b.bg_color || "#F285C3";

          const buttonText = b.button_text || "Claim Offer";

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
        box-shadow:none;
      ">
        <div style="max-width:800px;margin:0 auto;">
          <p style="
            font-size:1.5rem;
            font-weight:700;
            margin:0 0 22px;
            text-align:center;
            color:${b.text_color || "#fff"};
          ">
            ${b.text || "🔥 Limited Time Offer!"}
          </p>

          <!-- ALWAYS scroll to Stripe Checkout -->
          <button
  onclick="document.getElementById('buy-now').scrollIntoView({ behavior: 'smooth' })"
  style="
    display:block;
    background:${
      b.use_gradient
        ? `linear-gradient(${b.gradient_direction || "90deg"}, ${
            b.gradient_start || "#F285C3"
          }, ${b.gradient_end || "#7bed9f"})`
        : b.button_color || b.bg_color || "#F285C3"
    };
    color:${b.button_text_color || b.text_color || "#fff"};
    padding:22px 36px;             
    border-radius:8px;             
    font-weight:700;
    font-size:1rem;
    cursor:pointer;
    border:none;
    width:100%;                    
    max-width:340px;                
    margin:16px auto 0 auto;        
    box-shadow:0 4px 12px rgba(0,0,0,0.3);
    transition:transform 0.25s ease;
  "
  onmouseover="this.style.transform='scale(1.05)'"
  onmouseout="this.style.transform='scale(1)'"
>
  ${buttonText}
</button>



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

    // --- HTML with your new blocks injected
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        ${renderHead({
          title,
          font,
          bg,
          mainOverlayColor,
          landingPage,
        })}
        <body>

        ${renderHeader({
          landingPage,
        })}

    <main>
      ${bannerHTML}
      ${renderCoverImage({ landingPage })}

      ${renderContentArea({ contentHTML })}


      ${renderLeadCaptureForm({ landingPage })}
      ${renderCountdownScript()}
      ${renderCountdownStyles()}
      ${renderLeadFormScript()}
      ${renderFooter({ landingPage, footerTextColor })}
     </main>
      ${renderLegalFooter({ footerTextColor })}
      ${renderLandingAnalyticsScript({ landingPage })}
      ${renderStripeCheckoutScript()}

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

    const emailHtml = `
  <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0d0d0d; padding: 40px 30px; border-radius: 12px; border: 1px solid #1f1f1f; max-width: 600px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 25px;">
      <img src="https://cre8tlystudio.com/cre8tly-logo-white.png" alt="Cre8tly Studio" style="width: 85px; height: auto; margin-bottom: 15px;" />
      <h1 style="color: #7bed9f; font-size: 26px; margin: 0;">Your Free Guide Awaits</h1>
    </div>

    <p style="color: #e5e5e5; font-size: 16px; line-height: 1.6; margin-bottom: 20px; text-align: center;">
      Thanks for connecting with <strong style="color: #ffffff;">${
        landingPage.username
      }</strong>! 🎉
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

router.post("/upload-media-block", async (req, res) => {
  const MAX_AUDIO_SECONDS = 3 * 60 * 60;

  try {
    const { landingId, blockId } = req.body;
    let file = null;

    if (req.files?.audio && req.files.audio.size > 0) {
      file = req.files.audio;
    } else if (req.files?.image && req.files.image.size > 0) {
      file = req.files.image;
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No valid media file found (audio or image)",
      });
    }

    if (!landingId || !blockId || !file) {
      return res.status(400).json({
        success: false,
        message: "Missing landingId, blockId, or media file",
      });
    }

    const mimetype = file.mimetype.toLowerCase();
    const isImage = mimetype.startsWith("image/");
    const isAudio = mimetype.startsWith("audio/");

    if (!isImage && !isAudio) {
      return res.status(400).json({
        success: false,
        message: "File must be an image or audio type",
      });
    }

    let bufferToUpload = file.data;

    // 🖼 If it's an image, optimize first
    if (isImage) {
      const { optimizedBuffer } = await optimizeImageUpload(
        file.data,
        file.mimetype
      );
      bufferToUpload = optimizedBuffer;
    }

    // 🎧 AUDIO DURATION LIMIT (3 HOURS MAX)
    if (isAudio) {
      const tempPath = path.join(
        os.tmpdir(),
        `audio-check-${Date.now()}-${file.name}`
      );

      fs.writeFileSync(tempPath, file.data);

      try {
        const duration = await getAudioDuration(tempPath);

        if (duration > MAX_AUDIO_SECONDS) {
          fs.unlinkSync(tempPath);

          return res.status(400).json({
            success: false,
            message: "Audio exceeds maximum length of 3 hours",
            max_seconds: MAX_AUDIO_SECONDS,
            actual_seconds: duration,
          });
        }
      } catch (err) {
        fs.unlinkSync(tempPath);
        throw err;
      }

      fs.unlinkSync(tempPath);
    }

    // 🎧 If audio, no optimization needed — passthrough upload

    // File extension
    let ext = file.name.split(".").pop().toLowerCase();

    // fallback to mimetype if no real extension
    if (!ext || ext.length > 5) {
      ext = mimetype.split("/")[1];
    }

    // Final filename
    const fileName = `landing_blocks/${landingId}-${blockId}-${Date.now()}.${ext}`;

    // Upload to Spaces
    const result = await uploadFileToSpaces(bufferToUpload, fileName, mimetype);

    res.json({
      success: true,
      url: result.Location.startsWith("http")
        ? result.Location
        : `https://${result.Location}`,
      originalName: file.name,
      type: isImage ? "image" : "audio",
    });
  } catch (err) {
    console.error("❌ Error uploading media block:", err);

    if (err.message?.includes("File too large")) {
      return res
        .status(413)
        .json({ success: false, message: "File exceeds size limit" });
    }

    res.status(500).json({ success: false, message: "Upload failed" });
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

// SAVE TEMPLATES

router.post("/save-template/:id", authenticateToken, async (req, res) => {
  try {
    const landingPageId = req.params.id;
    const name = req.body.name || null;
    const snapshot = req.body.snapshot;
    const userId = req.user.id;

    if (!snapshot) {
      return res.json({
        success: false,
        message: "Snapshot missing from request",
      });
    }

    const response = await saveLandingTemplate({
      userId,
      landingPageId,
      name,
      snapshot,
    });

    return res.json(response);
  } catch (err) {
    console.error("❌ save-template error:", err);
    res.json({ success: false, message: "Server error" });
  }
});

router.get("/templates/:id", authenticateToken, async (req, res) => {
  try {
    const landingPageId = req.params.id;
    const response = await getLandingTemplatesByPage(landingPageId);
    return res.json(response);
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error" });
  }
});

router.get("/load-template/:versionId", authenticateToken, async (req, res) => {
  try {
    const { versionId } = req.params;
    const response = await loadLandingTemplate(versionId);
    return res.json(response);
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error" });
  }
});

router.put("/restore-template/:id", authenticateToken, async (req, res) => {
  try {
    const landingPageId = req.params.id;
    const { snapshot } = req.body;

    const response = await restoreLandingTemplate(landingPageId, snapshot);
    return res.json(response);
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error" });
  }
});

router.put("/update-template/:versionId", async (req, res) => {
  try {
    const { versionId } = req.params;
    const { name, snapshot } = req.body;

    const result = await updateTemplateVersion(versionId, name, snapshot);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ Error updating template version:", err);
    return res.status(500).json({ success: false });
  }
});

router.delete("/delete-template/:id", authenticateToken, async (req, res) => {
  try {
    const versionId = req.params.id;
    const userId = req.user.id;

    const result = await deleteLandingTemplate(versionId, userId);

    return res.json(result);
  } catch (err) {
    console.error("❌ delete-template error:", err);
    return res.json({ success: false, message: "Server error" });
  }
});

export default router;
