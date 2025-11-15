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
      `
      SELECT 
        lp.*, 
        u.stripe_connect_account_id
      FROM user_landing_pages lp
      LEFT JOIN users u ON lp.user_id = u.id
      WHERE lp.id = ?
      LIMIT 1
      `,
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
    let {
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
      cover_image_url,
      logo_url,
      show_download_button,
    } = fields;

    // 🧹 Trim strings if they exist
    headline = headline?.trim() || null;
    description = description?.trim() || null;
    username = username?.trim() || null;

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

    // ✅ Normalize and validate content_blocks
    let parsedBlocks = [];
    let contentBlocksJSON = "[]";

    if (Array.isArray(content_blocks)) {
      parsedBlocks = content_blocks;
    } else if (typeof content_blocks === "string") {
      try {
        parsedBlocks = JSON.parse(content_blocks);
      } catch {
        console.warn(`⚠️ Invalid JSON for content_blocks, keeping old data for ID ${id}`);
        const [oldRows] = await db.query(
          "SELECT content_blocks FROM user_landing_pages WHERE id = ?",
          [id]
        );
        contentBlocksJSON = oldRows[0]?.content_blocks || "[]";
      }
    } else {
      const [oldRows] = await db.query(
        "SELECT content_blocks FROM user_landing_pages WHERE id = ?",
        [id]
      );
      contentBlocksJSON = oldRows[0]?.content_blocks || "[]";
    }

    // ✅ Calendly URL validator
    const isValidCalendlyUrl = (url) =>
      /^https:\/\/calendly\.com\/[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)?$/.test(url);

    // ✅ Verify any Calendly blocks
    if (Array.isArray(parsedBlocks)) {
      for (const block of parsedBlocks) {
        if (block.type === "calendly") {
          if (!block.calendly_url || !isValidCalendlyUrl(block.calendly_url)) {
            console.warn(
              `⚠️ Invalid Calendly URL in landing ${id}: ${block.calendly_url}`
            );
            return {
              success: false,
              message:
                "Invalid Calendly URL. It must start with https://calendly.com/",
            };
          }
        }
      }
      parsedBlocks = parsedBlocks.map((b) => ({
  ...b,
  collapsed: b.collapsed ?? true, // ensure this field exists
}));
      contentBlocksJSON = JSON.stringify(parsedBlocks);
    }

    // ✅ Execute safe update
    await db.query(
      `
      UPDATE user_landing_pages 
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
        font_color_p = ?,
        content_blocks = ?, 
        pdf_url = ?,
        cover_image_url = ?,
        logo_url = ?,
        show_download_button = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
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
        cover_image_url,
        logo_url,
        show_download_button,
        id,
      ]
    );

    console.log("✅ Successfully updated landing page:", id);

    // ✅ Return updated record
    const [updated] = await db.query(
      "SELECT * FROM user_landing_pages WHERE id = ? LIMIT 1",
      [id]
    );

    return { success: true, landingPage: updated[0] || null };
  } catch (err) {
    console.error("❌ Error updating landing page:", err);
    return { success: false, message: err.message || "Server error" };
  } finally {
    await db.end();
  }
}


export async function getOrCreateLandingPage(userId) {
  const db = await connect();
  try {
    // 1️⃣ Check if landing page already exists
    const [rows] = await db.query(
      `
      SELECT 
        lp.id,
        lp.user_id,
        lp.username,
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
        lp.pdf_url,
        lp.cover_image_url,
        lp.logo_url,
        lp.button_text,
        lp.updated_at,
        u.pro_covers
      FROM user_landing_pages lp
      JOIN users u ON lp.user_id = u.id
      WHERE lp.user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (rows[0]) {
      const page = rows[0];

      // 🧩 Safely parse content_blocks JSON
      if (page && typeof page.content_blocks === "string") {
        try {
          page.content_blocks = JSON.parse(page.content_blocks);
        } catch {
          page.content_blocks = [];
        }
      }

      console.log("📦 Found existing landing page");
      return page;
    }

    console.log("⚙️ No landing page found, creating default one...");

    // 2️⃣ Check user and PRO plan status
    const [userRows] = await db.query(
      `SELECT id, name, pro_covers FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const user = userRows[0];
    if (!user) return { error: "User not found", status: 404 };
    if (user.pro_covers !== 1)
      return { error: "Access denied. PRO plan required.", status: 403 };

    // 3️⃣ Define new default page
    const defaultPage = {
      id: uuidv4(),
      user_id: userId,
      username: null,
      title: "Your Custom Landing Page",
      headline: "Welcome to My Digital World",
      description: "This is your personal landing page — start customizing!",
      theme_color: "#E93CAC",
      font: "Montserrat",
      font_file: "/fonts/Montserrat-Regular.ttf",
      bg_theme: "linear-gradient(to bottom, #ffffff, #F285C3)",
      button_text: "Download Now",
      pdf_url: null,
      cover_image_url: null,
      logo_url: null,
      font_color_h1: "#FFFFFF",
      font_color_h2: "#FFFFFF",
      font_color_h3: "#FFFFFF",
      font_color_p: "#FFFFFF",
      content_blocks: JSON.stringify([]),
      collect_emails: 1,
      email_list_name: "My Subscribers",
      email_leads_count: 0,
      email_notify: 1,
      email_thank_you_msg: "Thank you for subscribing!",
      auto_send_pdf: 1,
      created_at: new Date(),
    };

    // 4️⃣ Insert it into DB
    await db.query(
      `
      INSERT INTO user_landing_pages 
      (id, user_id, username, title, headline, description, theme_color, font, font_file,
       bg_theme, button_text, pdf_url, cover_image_url, logo_url,
       font_color_h1, font_color_h2, font_color_h3, font_color_p,
       content_blocks, collect_emails, email_list_name, email_leads_count,
       email_notify, email_thank_you_msg, auto_send_pdf, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        defaultPage.id,
        defaultPage.user_id,
        defaultPage.username,
        defaultPage.title,
        defaultPage.headline,
        defaultPage.description,
        defaultPage.theme_color,
        defaultPage.font,
        defaultPage.font_file,
        defaultPage.bg_theme,
        defaultPage.button_text,
        defaultPage.pdf_url,
        defaultPage.cover_image_url,
        defaultPage.logo_url,
        defaultPage.font_color_h1,
        defaultPage.font_color_h2,
        defaultPage.font_color_h3,
        defaultPage.font_color_p,
        defaultPage.content_blocks,
        defaultPage.collect_emails,
        defaultPage.email_list_name,
        defaultPage.email_leads_count,
        defaultPage.email_notify,
        defaultPage.email_thank_you_msg,
        defaultPage.auto_send_pdf,
        defaultPage.created_at,
      ]
    );

    console.log("✅ Created new default landing page:", defaultPage);
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

export async function updateLandingLogo(landingId, logoUrl) {
  const db = await connect();
  try {
    await db.query(
      "UPDATE user_landing_pages SET logo_url = ? WHERE id = ?",
      [logoUrl, landingId]
    );
    console.log(`✅ Logo updated for landing page ID: ${landingId}`);
  } catch (err) {
    console.error("❌ Error in updateLandingLogo helper:", err);
    throw err;
  } finally {
    await db.end();
  }
}

export async function getCoverImageByPdfUrl(pdfUrl) {
  const db = await connect();
  try {
    const [rows] = await db.query(
      "SELECT cover_image FROM lead_magnets WHERE pdf_url = ? LIMIT 1",
      [pdfUrl]
    );
    return rows[0]?.cover_image || null;
  } catch (err) {
    console.error("❌ Error in getCoverImageByPdfUrl:", err);
    throw err;
  } finally {
    await db.end();
  }
}

export async function getUserLeads(userId, page = 1, limit = 20) {
  const db = await connect();
  const offset = (page - 1) * limit;

  // ✅ Main paginated query
  const [rows] = await db.query(
    `
    SELECT 
      lpl.id,
      lpl.email,
      lpl.created_at,
      ulp.id AS landing_page_id,
      ulp.title AS landing_title,
      ulp.pdf_url,
      ulp.cover_image_url,
      lm.title AS title
    FROM landing_page_leads AS lpl
    INNER JOIN user_landing_pages AS ulp 
      ON ulp.id = lpl.landing_page_id
    LEFT JOIN lead_magnets AS lm 
      ON lm.id = SUBSTRING_INDEX(
                  SUBSTRING_INDEX(
                    REPLACE(SUBSTRING_INDEX(ulp.pdf_url, '/', -1), '.pdf', ''),
                    '-edit',
                    1
                  ),
                  '-',
                  -5
                )
    WHERE ulp.user_id = ?
    ORDER BY lpl.created_at DESC
    LIMIT ? OFFSET ?
    `,
    [userId, limit, offset]
  );

  // ✅ Get total count for pagination metadata
  const [[{ total }]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM landing_page_leads AS lpl
    INNER JOIN user_landing_pages AS ulp 
      ON ulp.id = lpl.landing_page_id
    WHERE ulp.user_id = ?
    `,
    [userId]
  );


  return {
    leads: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}












