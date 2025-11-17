import { v4 as uuidv4 } from "uuid";
import connect from "./connect.js";

/**
 * Save a contact message to the database
 */
export async function saveContactMessage({ name, email, subject, message }) {
  const db = connect();
  const id = uuidv4();
  await db.query(
    `INSERT INTO contact_messages (id, name, email, subject, message)
     VALUES (?, ?, ?, ?, ?)`,
    [id, name, email, subject || null, message]
  );
  return id;
}

/**
 * Optionally save a subscriber if they opted in
 */

