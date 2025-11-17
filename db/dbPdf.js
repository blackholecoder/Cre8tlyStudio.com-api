import connect from "./connect.js";
import { v4 as uuidv4 } from "uuid";

export const pdfLeads = async (email, source) => {
  try {
    const db = connect();
    const id = uuidv4();
    const created_at = new Date();
    const source = 'free pdf'

    await db.query(
      `INSERT INTO pdf_leads (id, email, source, created_at) VALUES (?, ?, ?, ?)`,
      [id, email, source, created_at]
    );

    ;
    return true;
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      throw new Error("duplicate");
    }
    console.error("Error inserting lead:", e);
    throw e;
  }
};
