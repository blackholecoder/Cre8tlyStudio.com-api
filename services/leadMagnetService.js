import { v4 as uuidv4 } from "uuid";
import { insertLeadMagnet,  updateLeadMagnetPrompt, markLeadMagnetComplete, getLeadMagnetById, updateLeadMagnetStatus, saveLeadMagnetPdf } from "../db/dbLeadMagnet.js";
import { generatePDF } from "./pdfService.js";
import { updateUserRole } from "../db/dbUser.js";
import { askGPT } from "../helpers/gptHelper.js";
import { sendEmail } from "../utils/email.js";
import { uploadFileToSpaces } from "../helpers/uploadToSpace.js";
import fs from "fs/promises";



export async function processPromptFlow(
  magnetId,
  userId,
  prompt,
  theme,
  pages = 5,
  logo, 
  link
) {
  // 🚨 clamp pages securely
  const safePages = Math.min(25, Math.max(1, pages));

  // 1. Mark as pending
  await updateLeadMagnetStatus(magnetId, userId, "pending");

  try {
    const wordsPerPage = 500;
    const totalWords = safePages * wordsPerPage; // ✅ use safePages everywhere

    // 2. Ask GPT with page instruction
    const gptAnswer = await askGPT(
      `${prompt}\n\nWrite approximately ${totalWords} words of detailed content.
Break it into ${safePages} sections, each around ${wordsPerPage} words.
Insert "<!--PAGEBREAK-->" between sections so each page is clearly separated.

Do not stop early. Add examples, case studies, bullet lists, and elaboration to ensure each section is full length.`
    );

    if (!gptAnswer || typeof gptAnswer !== "string") {
      throw new Error("processPromptFlow: GPT did not return valid text");
    }

    let formattedAnswer = gptAnswer;

    // 3. Fallback: if GPT didn’t insert enough pagebreaks, auto-break text
    const existingBreaks = (formattedAnswer.match(/<!--PAGEBREAK-->/g) || []).length;

    if (existingBreaks < safePages - 1) {
      const words = formattedAnswer.split(/\s+/);
      const wordsPerPageCalc = Math.ceil(words.length / safePages);

      let rebuilt = [];
      for (let i = 0; i < words.length; i++) {
        rebuilt.push(words[i]);
        if ((i + 1) % wordsPerPageCalc === 0 && i < words.length - 1) {
          rebuilt.push("<!--PAGEBREAK-->");
        }
      }
      formattedAnswer = rebuilt.join(" ");
    }

    // 4. Replace markers with actual HTML page breaks
    formattedAnswer = formattedAnswer.replace(
      /<!--PAGEBREAK-->/g,
      '<div class="page-break"></div>'
    );

    // 5. Generate PDF with theme
    const localPath = await generatePDF({
      id: magnetId,
      prompt: formattedAnswer,
      theme,
      logo,
      link,
      isHtml: true, // ✅ preserves our HTML
    });
 // 3. Upload to Spaces
    const fileName = `pdfs/${userId}-${magnetId}-${Date.now()}.pdf`;
    const uploaded = await uploadFileToSpaces(localPath, fileName, "application/pdf");

    // 6. Save result in DB
    await saveLeadMagnetPdf(magnetId, userId, prompt, uploaded.Location, theme);

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
      to: ["nathanelson2026@gmail.com"],
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
                  <td style="padding: 8px; font-family: monospace; font-size: 13px;">${session.id}</td>
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

  console.log(`✅ ${slots.length} lead magnet slots created for user ${userId}`);
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
