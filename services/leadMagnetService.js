import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import {
  insertLeadMagnet,
  updateLeadMagnetPrompt,
  markLeadMagnetComplete,
  getLeadMagnetById,
  updateLeadMagnetStatus,
  saveLeadMagnetPdf,
} from "../db/dbLeadMagnet.js";
import { generatePDF } from "./pdfService.js";
import { updateUserRole } from "../db/dbUser.js";
import { askGPT, generateLearningDoc } from "../helpers/gptHelper.js";
import { sendEmail } from "../utils/email.js";
import { uploadFileToSpaces } from "../helpers/uploadToSpace.js";
import { getUserBrandFile } from "../db/dbUploads.js";
import axios from "axios";
import { pdfThemes } from "./pdfThemes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function processPromptFlow(
  magnetId,
  userId,
  prompt,
  title,
  theme,
  bgTheme,
  pages = 5,
  logo,
  link,
  coverImage,
  cta,
  contentType
) {


  

  const safePages = Math.min(50, Math.max(1, pages));
  await updateLeadMagnetStatus(magnetId, userId, "pending");

  try {
    const brandTone = await getUserBrandFile(userId);

    // ✅ Build prompt (no brandFile URL fallback)
    let finalPrompt = prompt;
    if (brandTone) {
      finalPrompt += `

Use the following brand tone and style guide while writing (match voice and slang exactly):
${brandTone.slice(0, 4000)}
`;
    }

    const wordsPerPage = 500;
    const totalWords = safePages * wordsPerPage;

    // 🧠 Pick helper + pass brandTone
    let gptAnswer;
    if (contentType === "learning_doc") {
      gptAnswer = await generateLearningDoc(finalPrompt, {
        totalWords,
        safePages,
        wordsPerPage,
        brandTone: brandTone || null,
      });
    } else {
      gptAnswer = await askGPT(finalPrompt, {
        totalWords,
        safePages,
        wordsPerPage,
        mode: "lead_magnet",
        brandTone: brandTone || null,
      });
    }

    if (!gptAnswer || typeof gptAnswer !== "string") {
      throw new Error("processPromptFlow: GPT did not return valid text");
    }

    // 🧱 Ensure page breaks
    let formattedAnswer = gptAnswer;
    const existingBreaks = (formattedAnswer.match(/<!--PAGEBREAK-->/g) || [])
      .length;
    if (existingBreaks < safePages - 1) {
      const words = formattedAnswer.split(/\s+/);
      const per = Math.ceil(words.length / safePages);
      const rebuilt = [];
      for (let i = 0; i < words.length; i++) {
        rebuilt.push(words[i]);
        if ((i + 1) % per === 0 && i < words.length - 1) {
          rebuilt.push("<!--PAGEBREAK-->");
        }
      }
      formattedAnswer = rebuilt.join(" ");
    }
    formattedAnswer = formattedAnswer.replace(
      /<!--PAGEBREAK-->/g,
      '<div class="page-break"></div>'
    );
    // 🖼️ Cover handling
    let tempCoverPath = null;
    if (coverImage) {
      const tmpDir = path.resolve(__dirname, "../uploads/tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      if (coverImage.startsWith("data:image")) {
        const base64Data = coverImage.replace(/^data:image\/\w+;base64,/, "");
        const extension = coverImage.substring(
          coverImage.indexOf("/") + 1,
          coverImage.indexOf(";")
        );
        tempCoverPath = path.join(tmpDir, `cover_${Date.now()}.${extension}`);
        fs.writeFileSync(tempCoverPath, Buffer.from(base64Data, "base64"));
      } else if (coverImage.startsWith("http")) {
        try {
          const response = await axios.get(coverImage, {
            responseType: "arraybuffer",
            timeout: 10000,
          });
          const extension =
            path.extname(new URL(coverImage).pathname) || ".jpg";
          tempCoverPath = path.join(tmpDir, `cover_${Date.now()}${extension}`);
          fs.writeFileSync(tempCoverPath, Buffer.from(response.data));
        } catch (err) {
          console.warn("⚠️ Failed to fetch remote cover image:", err.message);
        }
      }
    }


    let finalLogoUrl = logo;
    if (logo && logo.startsWith("data:image")) {
      const tmpDir = path.resolve(__dirname, "../uploads/tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const logosDir = path.join(tmpDir, "logos");
      if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

      try {
        const base64Data = logo.replace(/^data:image\/\w+;base64,/, "");
        const extension = logo.substring(
          logo.indexOf("/") + 1,
          logo.indexOf(";")
        );
        const logoFileName = `logos/${userId}-${magnetId}-${Date.now()}.${extension}`;
        const tempLogoPath = path.join(tmpDir, logoFileName);
        fs.writeFileSync(tempLogoPath, Buffer.from(base64Data, "base64"));

        // Upload logo to Spaces
        const uploadedLogo = await uploadFileToSpaces(
          tempLogoPath,
          logoFileName,
          `image/${extension}`
        );
        finalLogoUrl = uploadedLogo.Location;

        // Cleanup local file
        await fs.promises.unlink(tempLogoPath).catch(() => {});
      } catch (err) {
        console.warn("⚠️ Failed to upload logo image:", err.message);
      }
    }

if (tempCoverPath && fs.existsSync(tempCoverPath)) {
  const stats = fs.statSync(tempCoverPath);
} else {
  console.log("⚠️ No local cover image file found at:", tempCoverPath);
}
    // 📄 Generate PDF
    const localPath = await generatePDF({
      id: magnetId,
      prompt: formattedAnswer,
      theme,
      bgTheme,
      logo: finalLogoUrl,
      link,
      coverImage: tempCoverPath,
      cta,
      isHtml: true,
    });

    // ☁️ Upload + save
    const fileName = `pdfs/${userId}-${magnetId}-${Date.now()}.pdf`;
    const uploaded = await uploadFileToSpaces(
      localPath,
      fileName,
      "application/pdf"
    );

   // ✅ Detect dark themes for correct text color
const isDarkBg = ["royal", "dark", "graphite", "purple", "navy", "lavender", "carbon"].includes(bgTheme);

// ✅ Pick proper colors dynamically
const resolvedTheme = {
  background: pdfThemes[bgTheme]?.background || bgTheme || "#fff",
  color: isDarkBg ? "#fff" : "#000",
};

// ✅ CTA contrast (light on dark, dark on light)
const ctaBg = pdfThemes[bgTheme]?.ctaBg || (isDarkBg ? "#fff" : "#00E07A");
const ctaText = pdfThemes[bgTheme]?.ctaText || (isDarkBg ? "#000" : "#000");

// ✅ Load CSS and inject variables
const cssPath = path.resolve(__dirname, "../public/pdf-style.css");
const cssTemplate = fs.readFileSync(cssPath, "utf8");

const css = cssTemplate
  .replace(/{{font}}/g, "Montserrat")
  .replace(/{{background}}/g, resolvedTheme.background)
  .replace(/{{textColor}}/g, resolvedTheme.color)
  .replace(/{{ctaBg}}/g, ctaBg)
  .replace(/{{ctaText}}/g, ctaText);

  // ✅ Resolve cover image inline (base64 preferred)
const coverSrc =
  tempCoverPath && fs.existsSync(tempCoverPath)
    ? `data:image/${path.extname(tempCoverPath).replace(".", "")};base64,${fs
        .readFileSync(tempCoverPath)
        .toString("base64")}`
    : coverImage || "";

const coverImgTag = coverSrc
  ? `<div class="cover-page"><img src="${coverSrc}" alt="Cover Image" class="cover-img" /></div>`
  : "";


let htmlContent = `
<html>
  <head>
    <meta charset="utf-8" />
    <style>${css}</style>
  </head>
  <body>
  
    ${coverImgTag || ""}
    <div class="page">
      <div class="page-inner">
      ${formattedAnswer}
      </div>
    </div>

    ${
      cta
        ? `
          <div contenteditable="false" class="footer-link">
            <p style="font-size:1.2rem;font-weight:600;margin-bottom:20px;">
              ${cta}
            </p>
            ${
              link
                ? `
                  <a href="${link}" target="_blank" class="link-button" style="
                    background:${ctaBg};
                    color:${ctaText};
                    border:2px solid ${isDarkBg ? "#fff" : "#000"};
                  ">
                    Visit ${new URL(link).hostname.replace(/^www\\./, "")}
                  </a>
                `
                : ""
            }
          </div>
        `
        : ""
    }
  </body>
</html>
`;


    await saveLeadMagnetPdf(
      magnetId,
      userId,
      prompt,
      title,
      uploaded.Location,
      theme,
      htmlContent,
      bgTheme,
      finalLogoUrl,
      link,
      coverImage,
      cta
    );
    return { pdf_url: uploaded.Location, status: "completed" };
  } catch (err) {
    await updateLeadMagnetStatus(magnetId, userId, "failed");
    throw err;
  }
}

export async function handleCheckoutCompleted(session) {
  const createdAt = new Date();

  // Get price from session
  const lineItem = session.line_items?.data?.[0];
  const price = lineItem?.price?.unit_amount
    ? lineItem.price.unit_amount / 100
    : session.amount_total / 100;

  const userId = session.metadata?.userId || null;
  const customerEmail = session.customer_details?.email || null; // ✅ Customer email from Stripe

  const slots = [];

  // Create 5 lead magnet slots
  for (let i = 0; i < 5; i++) {
    const id = uuidv4();
    await insertLeadMagnet({
      id,
      userId,
      prompt: "",
      pdfUrl: "",
      price,
      status: "awaiting_prompt",
      createdAt,
      stripeSessionId: session.id,
      slot_number: i + 1,
    });
    slots.push(id);
  }

  // If a user is linked, mark them as a customer
  if (userId) {
    await updateUserRole(userId, "customer");
    console.log(`✅ User ${userId} upgraded to customer`);
  }

  const amount = (session.amount_total / 100).toFixed(2);

  // ---------------------------
  // 📧 Send sale notification email to you + partner
  // ---------------------------
  try {
    await sendEmail({
      to: ["nathannelson2026@gmail.com"],
      subject: "🎉 New Sale! Lead Magnet Slots Purchased",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 30px;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #4f46e5, #9333ea); padding: 20px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 22px;">New Lead Magnet Order 🎉</h1>
              <p style="margin: 5px 0 0; font-size: 14px;">A customer just completed a purchase</p>
            </div>
            <div style="padding: 25px; color: #111827;">
              <h2 style="margin-top: 0; font-size: 20px; color: #1f2937;">Order Details</h2>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                  <td style="padding: 8px; font-weight: bold; width: 180px;">User ID:</td>
                  <td style="padding: 8px;">${userId || "Guest"}</td>
                </tr>
                <tr style="background: #f9fafb;">
                  <td style="padding: 8px; font-weight: bold;">Customer Email:</td>
                  <td style="padding: 8px;">${customerEmail || "N/A"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Amount Paid:</td>
                  <td style="padding: 8px;">$${amount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Slots Created:</td>
                  <td style="padding: 8px;">${slots.length}</td>
                </tr>
                <tr style="background: #f9fafb;">
                  <td style="padding: 8px; font-weight: bold;">Stripe Session ID:</td>
                  <td style="padding: 8px; font-family: monospace; font-size: 13px;">${
                    session.id
                  }</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      `,
    });
    console.log("📧 Sale notification email sent to admin/partner");
  } catch (err) {
    console.error("❌ Failed to send admin email:", err.message);
  }

  // ---------------------------
  // 📧 Send Welcome Email to Customer
  // ---------------------------
  if (customerEmail) {
    try {
      await sendEmail({
        to: customerEmail,
        subject: "🎉 Welcome! Your Lead Magnet Slots Are Ready",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 30px; background: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 25px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              <h1 style="color: #4f46e5;">Welcome to Cre8tly Studio 🎉</h1>
              <p>Thank you for your purchase! You now have <strong>${slots.length} lead magnet slots</strong> ready to use.</p>

              <h2>Next Steps</h2>
              <ul>
                <li>Login to your <a href="https://yourdomain.com/dashboard" style="color: #4f46e5;">dashboard</a></li>
                <li>Enter your first prompt</li>
                <li>Select your theme and number of pages</li>
                <li>Download your professional PDF instantly</li>
              </ul>

              <p>If you need help, reach us at <a href="mailto:support@yourdomain.com">support@yourdomain.com</a>.</p>

              <p style="margin-top: 20px;">We’re excited to see what you create 🚀</p>
            </div>
          </div>
        `,
      });
      console.log(`📧 Welcome email sent to customer: ${customerEmail}`);
    } catch (err) {
      console.error("❌ Failed to send welcome email:", err.message);
    }
  } else {
    console.warn("⚠️ No customer email found in session");
  }

  console.log(
    `✅ ${slots.length} lead magnet slots created for user ${userId}`
  );
}

export async function attachPromptToLeadMagnet(magnetId, prompt) {
  const leadMagnet = await getLeadMagnetById(magnetId); // 👈 FIX: lookup by ID, not sessionId
  if (!leadMagnet) throw new Error("Lead magnet not found");

  // Prevent overwriting an existing prompt
  if (leadMagnet.prompt && leadMagnet.prompt.trim() !== "") {
    throw new Error("Prompt already submitted for this lead magnet.");
  }

  // Save the prompt + set to pending
  await updateLeadMagnetPrompt(leadMagnet.id, prompt);

  try {
    // Generate PDF immediately
    const pdfUrl = await generatePDF({
      id: leadMagnet.id,
      prompt,
      isHtml: true,
    });

    // Mark completed in DB
    await markLeadMagnetComplete(leadMagnet.id, pdfUrl);

    return {
      ...leadMagnet,
      prompt,
      status: "completed",
      pdf_url: pdfUrl,
    };
  } catch (err) {
    console.error("❌ PDF generation failed:", err);
    return { ...leadMagnet, prompt, status: "failed" };
  }
}
