import { v4 as uuidv4 } from "uuid";
import { insertLeadMagnet,  updateLeadMagnetPrompt, getLeadMagnetBySessionId, markLeadMagnetComplete } from "../db/dbLeadMagnet.js";
import { generatePDF } from "./pdfService.js";

export async function handleCheckoutCompleted(session) {
  const id = uuidv4();
  const createdAt = new Date();

  // Get price from session
  const lineItem = session.line_items?.data[0];
  const price = lineItem?.price?.unit_amount
    ? lineItem.price.unit_amount / 100
    : session.amount_total / 100;

  await insertLeadMagnet({
    id,
    userId: session.metadata?.userId || null,
    prompt: "",
    pdfUrl: "",
    price,
    status: "pending",
    createdAt,
    stripeSessionId: session.id,
  });

  console.log("Lead magnet created:", id, "price:", price);
}



export async function attachPromptToLeadMagnet(sessionId, prompt) {
  const leadMagnet = await getLeadMagnetBySessionId(sessionId);
  if (!leadMagnet) throw new Error("Lead magnet not found");

  // Save the raw Quill HTML in DB
  await updateLeadMagnetPrompt(leadMagnet.id, prompt);

  try {
    // Generate PDF with Quill styles
    const pdfUrl = await generatePDF({ id: leadMagnet.id, prompt, isHtml: true });

    // Mark completed in DB
    await markLeadMagnetComplete(leadMagnet.id, pdfUrl);

    return { ...leadMagnet, prompt, status: "completed", pdf_url: pdfUrl };
  } catch (err) {
    console.error("❌ PDF generation failed:", err);
    return { ...leadMagnet, prompt, status: "failed" };
  }
}