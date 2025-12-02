import connect from "../connect.js";
import crypto from "crypto";

export async function createReferralSlug(employeeId, slug) {
  const db = connect();

  // If slug not provided, generate one
  if (!slug) {
    slug = crypto.randomUUID().slice(0, 8); // clean short code
  }

  // Make sure slug is unique
  const [existing] = await db.query(
    "SELECT id FROM referral_slugs WHERE slug = ? LIMIT 1",
    [slug]
  );

  if (existing.length) {
    throw new Error("Slug already in use. Choose another one.");
  }

  const id = crypto.randomUUID();

  await db.query(
    `INSERT INTO referral_slugs (id, employee_id, slug)
     VALUES (?, ?, ?)`,
    [id, employeeId, slug]
  );

  return { id, slug };
}
