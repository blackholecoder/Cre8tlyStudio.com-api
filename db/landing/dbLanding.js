import connect from "../connect.js";
import { v4 as uuidv4 } from "uuid";

export async function getLandingPageByUser(username) {
  try {
    const db = await connect();

    const [rows] = await db.query(
      "SELECT * FROM user_landing_pages WHERE username = ? LIMIT 1",
      [username]
    );

    const page = rows[0];

    // ✅ Don’t re-parse if it's already an array/object
    if (page && typeof page.content_blocks === "string") {
      try {
        page.content_blocks = JSON.parse(page.content_blocks);
      } catch (err) {
        console.warn("⚠️ Could not parse content_blocks for:", username);
        page.content_blocks = [];
      }
    }

    return page || null;
  } catch (err) {
    console.error("❌ Error fetching landing page for user:", username, err);
    throw new Error("Failed to fetch landing page");
  }
}

export async function saveLandingPageLead(landingPageId, email) {
  const db = await connect();

  try {
    const id = uuidv4();
    await db.query(
      "INSERT INTO landing_page_leads (id, landing_page_id, email) VALUES (?, ?, ?)",
      [id, landingPageId, email]
    );
    return { success: true, id };
  } catch (err) {
    console.error("❌ Error saving landing page lead:", err);
    throw err;
  } finally {
    await db.end(); // ✅ only if your connect() doesn’t use a shared pool
  }
}

export async function getLandingPageById(id) {
  try {
    const db = await connect();
    const [rows] = await db.query(
      "SELECT * FROM user_landing_pages WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0];
  } catch (err) {
    console.error("❌ getLandingPageById error:", err);
    throw err;
  }
}

export async function getLandingPageByUserId(userId) {
  const db = await connect();
  try {
    const [rows] = await db.query(
      `
      SELECT lp.*, u.pro_status
      FROM user_landing_pages lp
      JOIN users u ON lp.user_id = u.id
      WHERE lp.user_id = ? LIMIT 1
    `,
      [userId]
    );

    if (!rows[0]) return null;
    if (rows[0].pro_status !== "active") return { error: "User not PRO" };

    return rows[0];
  } catch (err) {
    console.error("❌ Error fetching landing page:", err);
    throw err;
  }
}

export async function updateLandingPage(id, fields) {
  const db = await connect();
  try {
    const {
      headline,
      description,
      font,
      font_file,
      bg_theme,
      username,
      font_color_h1,
      font_color_h2,
      font_color_h3,
      font_color_p,
      content_blocks,
      pdf_url, 
    } = fields;

    // ✅ Prevent duplicate usernames
    if (username) {
      const [exists] = await db.query(
        "SELECT id FROM user_landing_pages WHERE username = ? AND id != ?",
        [username, id]
      );
      if (exists.length > 0) {
        return {
          success: false,
          message: "That username is already taken.",
        };
      }
    }

    // ✅ Normalize content_blocks to a clean JSON string
    let contentBlocksJSON;

    if (Array.isArray(content_blocks)) {
      contentBlocksJSON = JSON.stringify(content_blocks);
    } else if (typeof content_blocks === "string") {
      try {
        const parsed = JSON.parse(content_blocks);
        contentBlocksJSON = JSON.stringify(parsed);
      } catch (err) {
        console.warn("⚠️ Invalid JSON string, keeping previous data for ID:", id);
        // Fetch old value to avoid wiping data
        const [oldRows] = await db.query(
          "SELECT content_blocks FROM user_landing_pages WHERE id = ?",
          [id]
        );
        contentBlocksJSON = oldRows[0]?.content_blocks || "[]";
      }
    } else {
      console.warn("⚠️ Unknown format for content_blocks, skipping overwrite");
      const [oldRows] = await db.query(
        "SELECT content_blocks FROM user_landing_pages WHERE id = ?",
        [id]
      );
      contentBlocksJSON = oldRows[0]?.content_blocks || "[]";
    }

    // ✅ Perform safe update
    await db.query(
      `UPDATE user_landing_pages 
       SET 
         headline = ?, 
         description = ?, 
         font = ?, 
         font_file = ?, 
         bg_theme = ?, 
         username = ?,
         font_color_h1 = ?,
         font_color_h2 = ?,
         font_color_h3 = ?,
         font_color_p  = ?,
         content_blocks = ?, 
         pdf_url = ?,
         updated_at = NOW()
       WHERE id = ?`,
      [
        headline,
        description,
        font,
        font_file,
        bg_theme,
        username,
        font_color_h1,
        font_color_h2,
        font_color_h3,
        font_color_p,
        contentBlocksJSON,
        pdf_url,
        id,
      ]
    );

    console.log("✅ Successfully updated landing page:", id);
    return { success: true };
  } catch (err) {
    console.error("❌ Error updating landing page:", err);
    throw err;
  } finally {
    await db.end();
  }
}

export async function getOrCreateLandingPage(userId) {
  const db = await connect();
  try {
    // 1️⃣ Check if landing page exists
    const [rows] = await db.query(
      `SELECT 
         lp.id,
         lp.user_id,
         lp.title,
         lp.headline,
         lp.description,
         lp.theme_color,
         lp.font,
         lp.font_file,
         lp.bg_theme,
         lp.font_color_h1,
         lp.font_color_h2,
         lp.font_color_h3,
         lp.font_color_p,
         lp.content_blocks,
         lp.pdf_url,              -- ✅ include this field
         lp.username,
         lp.updated_at,
         u.pro_covers
       FROM user_landing_pages lp 
       JOIN users u ON lp.user_id = u.id 
       WHERE lp.user_id = ? 
       LIMIT 1`,
      [userId]
    );

    if (rows[0]) {
      const page = rows[0];

      // 🧩 Parse content_blocks safely
      if (page && typeof page.content_blocks === "string") {
        try {
          page.content_blocks = JSON.parse(page.content_blocks);
        } catch {
          page.content_blocks = [];
        }
      }

      console.log("📦 Found existing landing page (with PDF URL)");
      return page;
    }

    console.log("⚙️ No landing page found, creating default one...");

    // 2️⃣ Check user and PRO status
    const [userRows] = await db.query(
      `SELECT id, name, pro_covers FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const user = userRows[0];
    if (!user) return { error: "User not found", status: 404 };
    if (user.pro_covers !== 1)
      return { error: "Access denied. PRO plan required.", status: 403 };

    // 3️⃣ Create default page
    const defaultPage = {
      id: uuidv4(),
      user_id: userId,
      title: "Your Custom Landing Page",
      headline: "Welcome to My Digital World",
      description: "This is your personal landing page — start customizing!",
      theme_color: "#E93CAC",
      font: "Montserrat",
      button_text: "Download Now",
      pdf_url: null, // ✅ add placeholder
      created_at: new Date(),
    };

    await db.query(
      `INSERT INTO user_landing_pages 
       (id, user_id, title, headline, description, theme_color, font, button_text, pdf_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        defaultPage.id,
        defaultPage.user_id,
        defaultPage.title,
        defaultPage.headline,
        defaultPage.description,
        defaultPage.theme_color,
        defaultPage.font,
        defaultPage.button_text,
        defaultPage.pdf_url, // ✅ included here
        defaultPage.created_at,
      ]
    );

    console.log("✅ Created new landing page:", defaultPage);
    return defaultPage;
  } catch (err) {
    console.error("❌ Error in getOrCreateLandingPage:", err);
    return { error: "Server error", status: 500 };
  } finally {
    await db.end();
  }
}

export async function checkUsernameAvailability(username) {
  const db = await connect();
  try {
    const [rows] = await db.query(
      "SELECT id FROM user_landing_pages WHERE username = ? LIMIT 1",
      [username]
    );
    return rows.length === 0; // true = available
  } catch (err) {
    console.error("❌ Error in checkUsernameAvailability helper:", err);
    throw err;
  } finally {
    await db.end();
  }
}
