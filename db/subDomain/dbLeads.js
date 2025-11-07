import connect from "../connect.js";



export async function saveLead(id, email, source) {
  try {
      const db = await connect();
    // Check if the email already exists
    const [existing] = await db.query(
      "SELECT id FROM pdf_leads WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return { success: false, message: "Email already registered" };
    }

    await db.query(
      "INSERT INTO pdf_leads (id, email, source, created_at) VALUES (?, ?, ?, NOW())",
      [id, email, source]
    );

    return { success: true, message: "Lead saved successfully" };
  } catch (err) {
    console.error("DB Error in saveLead:", err);
    throw new Error("Database operation failed");
  }
}