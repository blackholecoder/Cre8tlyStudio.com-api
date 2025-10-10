import connect from "./connect.js";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export async function createUserAndGiveFreeSlots({
  name,
  email,
  password,
  slots = 5,
  role = "customer",
}) {
  const db = await connect();
  const now = new Date();

  try {
    // check if user already exists
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      throw new Error("User with this email already exists");
    }

    // generate id and hash password
    const id = uuidv4();
    const hash = await bcrypt.hash(password || Math.random().toString(36).slice(-8), 10);

    // insert user
    await db.query(
      "INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, name, email, hash, role, now]
    );

    // build 5 free slot rows
    const leadMagnets = Array.from({ length: slots }).map((_, i) => [
      uuidv4(),
      id,
      "",
      "",
      0.0,
      "awaiting_prompt",
      now,
      null,
      null,
      "modern",
      i + 1,
    ]);

    await db.query(
      `INSERT INTO lead_magnets 
        (id, user_id, prompt, pdf_url, price, status, created_at, deleted_at, stripe_session_id, theme, slot_number)
       VALUES ?`,
      [leadMagnets]
    );

    await db.end();

    return { message: `Created ${email} with ${slots} free slots`, userId: id };
  } catch (err) {
    await db.end();
    throw err;
  }
}

export async function giveFreeLeadMagnets(userId, count = 5) {
  const db = await connect();

  try {
    // 1️⃣ Confirm user exists
    const [userRows] = await db.query("SELECT email FROM users WHERE id = ?", [userId]);
    if (userRows.length === 0) throw new Error("User not found");

    const userEmail = userRows[0].email;

    // 2️⃣ Find the current highest slot_number for that user
    const [slotRows] = await db.query(
      "SELECT MAX(slot_number) AS maxSlot FROM lead_magnets WHERE user_id = ?",
      [userId]
    );
    const startFrom = slotRows[0].maxSlot ? slotRows[0].maxSlot + 1 : 1;

    const now = new Date();

    // 3️⃣ Create new lead_magnets rows starting from the next slot number
    const leadMagnets = Array.from({ length: count }).map((_, i) => [
      uuidv4(), // id
      userId,   // user_id
      "",       // prompt
      "",       // pdf_url
      0.0,      // price (free)
      "awaiting_prompt",
      now,
      null,     // deleted_at
      null,     // stripe_session_id
      "modern", // theme
      startFrom + i, // ✅ Correct next slot number
    ]);

    // 4️⃣ Insert the new slots
    await db.query(
      `INSERT INTO lead_magnets 
        (id, user_id, prompt, pdf_url, price, status, created_at, deleted_at, stripe_session_id, theme, slot_number)
       VALUES ?`,
      [leadMagnets]
    );

    await db.end();

    return {
      success: true,
      message: `Gave ${count} free slots to ${userEmail}`,
      newSlots: leadMagnets.map((s) => s[10]), // optional: returns the slot numbers
    };
  } catch (err) {
    await db.end();
    throw err;
  }
}



