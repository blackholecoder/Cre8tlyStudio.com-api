import { v4 as uuidv4 } from "uuid";
import { insertLeadMagnet,  updateLeadMagnetPrompt, markLeadMagnetComplete, getLeadMagnetById, updateLeadMagnetStatus, saveLeadMagnetPdf } from "../db/dbLeadMagnet.js";
import { generatePDF } from "./pdfService.js";
import { updateUserRole } from "../db/dbUser.js";
import { askGPT } from "../helpers/gptHelper.js";


export async function processPromptFlow(magnetId, userId, prompt) {
  // 1. Mark as pending
  await updateLeadMagnetStatus(magnetId, userId, "pending");

  try {
    // 2. Ask GPT
    const gptAnswer = await askGPT(prompt);

    if (!gptAnswer || typeof gptAnswer !== "string") {
      throw new Error("processPromptFlow: GPT did not return valid text");
    }

    // 3. Generate PDF from GPT’s answer
    const pdfUrl = await generatePDF({
      id: magnetId,
      prompt: gptAnswer,  // ✅ send GPT output
      isHtml: false
    });

    // 4. Save result in DB
    await saveLeadMagnetPdf(magnetId, userId, prompt, pdfUrl);

    return { pdf_url: pdfUrl, status: "completed" };
  } catch (err) {
    await updateLeadMagnetStatus(magnetId, userId, "failed");
    throw err;
  }
}


export async function handleCheckoutCompleted(session) {
  const id = uuidv4();
  const createdAt = new Date();

  // Get price from session
  const lineItem = session.line_items?.data?.[0];
  const price = lineItem?.price?.unit_amount
    ? lineItem.price.unit_amount / 100
    : session.amount_total / 100;

  const userId = session.metadata?.userId || null;

  // Create lead magnet slot
  await insertLeadMagnet({
    id,
    userId,
    prompt: "",
    pdfUrl: "",
    price,
    status: "pending",
    createdAt,
    stripeSessionId: session.id,
  });

  // If a user is linked, mark them as a customer
  if (userId) {
    await updateUserRole(userId, "customer");
    console.log(`✅ User ${userId} upgraded to customer`);
  }

  console.log("✅ Lead magnet created:", id, "price:", price);
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
