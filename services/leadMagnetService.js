import { v4 as uuidv4 } from "uuid";
import { insertLeadMagnet,  updateLeadMagnetPrompt, markLeadMagnetComplete, getLeadMagnetById, updateLeadMagnetStatus, saveLeadMagnetPdf } from "../db/dbLeadMagnet.js";
import { generatePDF } from "./pdfService.js";
import { updateUserRole } from "../db/dbUser.js";
import { askGPT } from "../helpers/gptHelper.js";


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
      slot_number: i + 1  
    });
    slots.push(id);
  }

  // If a user is linked, mark them as a customer
  if (userId) {
    await updateUserRole(userId, "customer");
    console.log(`✅ User ${userId} upgraded to customer`);
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
