import connect from "../connect.js";



export async function verifyBuyer(email, productId) {
  const db = await connect();
  try {
    const [rows] = await db.query(
      "SELECT id FROM deliveries WHERE buyer_email = ? AND product_id = ? LIMIT 1",
      [email, productId]
    );
    return rows.length > 0;
  } catch (err) {
    console.error("❌ verifyBuyer error:", err);
    throw err;
  } finally {
    await db.end();
  }
}

/**
 * ✅ Insert a new review (only after verified)
 */
export async function insertReview({
  product_id,
  landing_page_id,
  username,
  buyer_email,
  rating,
  review_text,
}) {
  const db = await connect();
  try {
    const id = uuidv4();
    await db.query(
      `INSERT INTO product_reviews 
      (id, product_id, landing_page_id, username, buyer_email, rating, review_text, verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [id, product_id, landing_page_id, username, buyer_email, rating, review_text]
    );
    return { success: true, id };
  } catch (err) {
    console.error("❌ insertReview error:", err);
    throw err;
  } finally {
    await db.end();
  }
}

/**
 * ✅ Fetch all reviews for a specific landing page
 */
export async function getReviewsByLandingPage(landingPageId) {
  const db = await connect();
  try {
    const [rows] = await db.query(
      `SELECT username, rating, review_text, created_at 
       FROM product_reviews 
       WHERE landing_page_id = ? 
       ORDER BY created_at DESC`,
      [landingPageId]
    );
    return rows;
  } catch (err) {
    console.error("❌ getReviewsByLandingPage error:", err);
    throw err;
  } finally {
    await db.end();
  }
}