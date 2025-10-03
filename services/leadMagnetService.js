import { v4 as uuidv4 } from "uuid";
import { insertLeadMagnet,  updateLeadMagnetPrompt, markLeadMagnetComplete, getLeadMagnetById, updateLeadMagnetStatus, saveLeadMagnetPdf } from "../db/dbLeadMagnet.js";
import { generatePDF } from "./pdfService.js";
import { updateUserRole } from "../db/dbUser.js";
import { askGPT } from "../helpers/gptHelper.js";
import { sendEmail } from "../utils/email.js";


export async function processPromptFlow(
  magnetId,
  userId,
  prompt,
  theme,
  pages = 5
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
    const pdfUrl = await generatePDF({
      id: magnetId,
      prompt: formattedAnswer,
      theme,
      isHtml: true, // ✅ preserves our HTML
    });

    // 6. Save result in DB
    await saveLeadMagnetPdf(magnetId, userId, prompt, pdfUrl);

    return { pdf_url: pdfUrl, status: "completed" };
  } catch (err) {
    await updateLeadMagnetStatus(magnetId, userId, "failed");
    throw err;
  }
}



// export async function handleCheckoutCompleted(session) {
//   const createdAt = new Date();

//   // Get price from session
//   const lineItem = session.line_items?.data?.[0];
//   const price = lineItem?.price?.unit_amount
//     ? lineItem.price.unit_amount / 100
//     : session.amount_total / 100;

//   const userId = session.metadata?.userId || null;

//   const slots = [];

//   // Create 5 lead magnet slots
//   for (let i = 0; i < 5; i++) {
//     const id = uuidv4();
//     await insertLeadMagnet({
//       id,
//       userId,
//       prompt: "",
//       pdfUrl: "",
//       price,
//       status: "awaiting_prompt",
//       createdAt,
//       stripeSessionId: session.id,
//       slot_number: i + 1  
//     });
//     slots.push(id);
//   }

//   // If a user is linked, mark them as a customer
//   if (userId) {
//     await updateUserRole(userId, "customer");
//     console.log(`✅ User ${userId} upgraded to customer`);
//   }

//   const amount = (session.amount_total / 100).toFixed(2);
//   await sendEmail({
//     to: ["nathanelson2026@gmail.com"], // add both
//     subject: "🎉 New Sale! Lead Magnet Slots Purchased",
//     html: `
//   <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 30px;">
//     <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">

//       <!-- Header -->
//       <div style="background: linear-gradient(135deg, #4f46e5, #9333ea); padding: 20px; text-align: center; color: white;">
//         <h1 style="margin: 0; font-size: 22px;">New Lead Magnet Order 🎉</h1>
//         <p style="margin: 5px 0 0; font-size: 14px;">A customer just completed a purchase</p>
//       </div>

//       <!-- Body -->
//       <div style="padding: 25px; color: #111827;">
//         <h2 style="margin-top: 0; font-size: 20px; color: #1f2937;">Order Details</h2>
//         <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
//           <tr>
//             <td style="padding: 8px; font-weight: bold; width: 180px;">User ID:</td>
//             <td style="padding: 8px;">${userId || "Guest"}</td>
//           </tr>
//           <tr style="background: #f9fafb;">
//             <td style="padding: 8px; font-weight: bold;">Amount Paid:</td>
//             <td style="padding: 8px;">$${amount}</td>
//           </tr>
//           <tr>
//             <td style="padding: 8px; font-weight: bold;">Slots Created:</td>
//             <td style="padding: 8px;">${slots.length}</td>
//           </tr>
//           <tr style="background: #f9fafb;">
//             <td style="padding: 8px; font-weight: bold;">Stripe Session ID:</td>
//             <td style="padding: 8px; font-family: monospace; font-size: 13px;">${session.id}</td>
//           </tr>
//         </table>

//         <div style="margin-top: 25px; padding: 15px; background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 6px; font-size: 15px; color: #065f46;">
//           🎉 Great news! Another sale just came through. The system has automatically provisioned the slots and upgraded the user.
//         </div>
//       </div>

//       <!-- Footer -->
//       <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
//         <p style="margin: 0;">This is an automated sales notification.</p>
//         <p style="margin: 2px 0 0;">© ${new Date().getFullYear()} Cre8tly Studio</p>
//       </div>
//     </div>
//   </div>
// `,

//   });

//   console.log(`✅ ${slots.length} lead magnet slots created for user ${userId}`);
// }

export async function handleCheckoutCompleted(session) {
  const createdAt = new Date();

  // Get price from session
  const lineItem = session.line_items?.data?.[0];
  const price = lineItem?.price?.unit_amount
    ? lineItem.price.unit_amount / 100
    : session.amount_total / 100;

  const userId = session.metadata?.userId || null;

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

  // ✅ Send sale notification email with try/catch
  try {
    await sendEmail({
      to: ["nathanelson2026@gmail.com"], // multiple recipients
      subject: "🎉 New Sale! Lead Magnet Slots Purchased",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 30px;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4f46e5, #9333ea); padding: 20px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 22px;">New Lead Magnet Order 🎉</h1>
              <p style="margin: 5px 0 0; font-size: 14px;">A customer just completed a purchase</p>
            </div>

            <!-- Body -->
            <div style="padding: 25px; color: #111827;">
              <h2 style="margin-top: 0; font-size: 20px; color: #1f2937;">Order Details</h2>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                  <td style="padding: 8px; font-weight: bold; width: 180px;">User ID:</td>
                  <td style="padding: 8px;">${userId || "Guest"}</td>
                </tr>
                <tr style="background: #f9fafb;">
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

              <div style="margin-top: 25px; padding: 15px; background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 6px; font-size: 15px; color: #065f46;">
                🎉 Great news! Another sale just came through. The system has automatically provisioned the slots and upgraded the user.
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
              <p style="margin: 0;">This is an automated sales notification.</p>
              <p style="margin: 2px 0 0;">© ${new Date().getFullYear()} Cre8tly Studio</p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("📧 Sale notification email sent successfully");
  } catch (err) {
    console.error("❌ Failed to send sale email:", err.message);
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
