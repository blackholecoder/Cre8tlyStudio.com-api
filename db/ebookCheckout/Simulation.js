import { sendEbookEmail } from "../ebookCheckout/dbSendEbookEmail.js";


export async function simulateEbookSale({ email, productType }) {
  try {
    if (!email || !productType) throw new Error("Missing email or productType");

    // just reuse your existing helper
    await sendEbookEmail({
      email,
      productType,
      title: "Simulated Ebook Purchase",
    });

    return { success: true, message: `Simulated sale email sent to ${email}` };
  } catch (err) {
    console.error("❌ Simulate sale failed:", err.message);
    throw err;
  }
}
