import express from "express";
import {
  checkUsernameAvailability,
  getLandingPageById,
  getLandingPageByUser,
  getOrCreateLandingPage,
  saveLandingPageLead,
  updateLandingPage,
} from "../../db/landing/dbLanding.js";
import { sendOutLookMail } from "../../utils/sendOutllokMail.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
const router = express.Router();

// Capture root requests for each subdomain
router.get("/", async (req, res) => {
  const { subdomain } = req;
  if (!subdomain) return res.status(404).send("Landing page not found");

  try {
    const landingPage = await getLandingPageByUser(subdomain);

    console.log("🧱 Raw content_blocks value:", landingPage.content_blocks);
    console.log(
      "🧱 Type of content_blocks:",
      typeof landingPage.content_blocks
    );

    // --- 1️⃣ Default “coming soon” fallback
    if (!landingPage) {
      return res.send("<h1>Coming soon</h1>");
    }

    // --- 2️⃣ Extract core properties
    const thankYouMsg =
      landingPage.email_thank_you_msg ||
      "Thanks for downloading! Check your inbox for your file.";
    const title =
  landingPage.title ||
  `${landingPage.username}`;
    const font = landingPage.font || "Montserrat";
    const bg =
      landingPage.bg_theme || "linear-gradient(to bottom, #ffffff, #F285C3)";

    // --- 3️⃣ Parse structured content blocks
    let contentHTML = "";

    const blocks = Array.isArray(landingPage.content_blocks)
      ? landingPage.content_blocks
      : [];

    // --- 4️⃣ Build HTML from parsed blocks
    try {
      contentHTML = blocks
  .map((block) => {
    const padding = block.padding || 20;

    switch (block.type) {
      case "heading":
        return `<h1 style="padding-bottom:${padding}px">${block.text || ""}</h1>`;

      case "subheading":
        return `<h2 style="padding-bottom:${padding}px">${block.text || ""}</h2>`;

      case "subsubheading":
        return `<h3 style="padding-bottom:${padding}px">${block.text || ""}</h3>`;

      case "paragraph":
        return `<p style="padding-bottom:${padding}px">${block.text || ""}</p>`;

      case "button":
        return `<a href="${block.url || "#"}" class="btn" style="margin-bottom:${padding}px">${
          block.text || "Click Here"
        }</a>`;

      default:
        return "";
    }
  })
  .join("");

    } catch (err) {
      console.error("❌ Failed to render content blocks:", err);
      contentHTML = "";
    }

    // --- 4️⃣ Render HTML with your new blocks injected
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${title}</title>
          <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(
            font
          )}:wght@400;600;700&display=swap" rel="stylesheet" />
          <style>
            html, body {
              margin: 0;
              padding: 0;
              font-family: '${font}', sans-serif;
              height: 100%;
              min-height: 100vh;
              background: ${bg};
              background-attachment: fixed;
              background-size: cover;
              background-position: center;
              overflow-x: hidden;
              overscroll-behavior: none;
              color: #222;
              text-align: center;
            }

            main {
              padding: 80px 20px;
              max-width: 900px;
              margin: 0 auto;
            }

            h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  font-weight: 700;
  color: ${landingPage.font_color_h1 || "#FFFFFF"};
}

h2 {
  font-size: 1.8rem;
  margin-bottom: 0.8rem;
  font-weight: 600;
  color: ${landingPage.font_color_h2 || "#FFFFFF"};
}

h3 {
  font-size: 1.4rem;
  font-weight: 500;
  color: ${landingPage.font_color_h3 || "#FFFFFF"};
}

p {
  font-size: 1.1rem;
  line-height: 1.8;
  max-width: 750px;
  margin: 0 auto 1rem;
  color: ${landingPage.font_color_p || "#FFFFFF"};
}


            .btn {
              display: inline-block;
              background: #000;
              color: #fff;
              padding: 14px 32px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              transition: all 0.3s ease;
            }

            .btn:hover {
              background: #F285C3;
            }

            form {
              margin-top: 40px;
            }

            input[type="email"] {
              padding: 12px 20px;
              width: 260px;
              border-radius: 6px;
              border: 1px solid #ccc;
              margin-right: 10px;
            }

            button {
              background: #000;
              color: #fff;
              padding: 12px 24px;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
            }

            button:hover {
              background: #F285C3;
            }

            footer {
              margin-top: 60px;
              font-size: 0.95rem;
              color: #555;
            }
          </style>
        </head>

        <body>
  <main>
    ${
      contentHTML ||
      "<h1>Welcome to My Page</h1><p>Start customizing your content.</p>"
    }

    <form id="leadForm">
  <input type="hidden" name="landingPageId" value="${landingPage.id}" />
  <input type="email" name="email" placeholder="Email address" required />
  <button type="submit">Download Now</button>
</form>

<p id="thankyou" style="display:none;color:white;margin-top:20px;font-size:1.1rem;">
  🎁 Check your inbox for the download link!
</p>

<script>
document.getElementById("leadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value;
  const landingPageId = form.landingPageId.value;

  try {
    const res = await fetch("https://cre8tlystudio.com/api/landing/landing-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ landingPageId, email }),
    });

    const data = await res.json();

    if (data.success) {
      form.style.display = "none";
      document.getElementById("thankyou").style.display = "block";
    } else {
      alert(data.message || "Something went wrong. Please try again.");
    }
  } catch (err) {
    console.error("Submission error:", err);
    alert("Server error. Please try again later.");
  }
});
</script>




    <footer>
      <em>${thankYouMsg}</em>
    </footer>
  </main>
</body>

      </html>
    `);
  } catch (err) {
    console.error("❌ Error loading landing page:", err);
    res.status(500).send("Server error");
  }
});

router.post("/landing-leads", async (req, res) => {
  try {
    const { landingPageId, email } = req.body;

    if (!landingPageId || !email) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // 1️⃣ Save the lead
    const lead = await saveLandingPageLead(landingPageId, email);

    // 2️⃣ Get landing page data
    const landingPage = await getLandingPageById(landingPageId);
    if (!landingPage) {
      return res
        .status(404)
        .json({ success: false, message: "Landing page not found" });
    }

    // 3️⃣ Compose email HTML (clean and branded)
    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #ffffff; padding: 40px 30px; border-radius: 12px; border: 1px solid #f1f1f1; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 25px;">
        <img src="https://cre8tlystudio.com/cre8tly-logo-white.png" alt="Cre8tly Studio" style="width: 120px; height: auto; margin-bottom: 15px;" />
        <h1 style="color: #F285C3; font-size: 26px; margin: 0;">Your Free Guide Awaits</h1>
      </div>

      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Thanks for connecting with <strong>${landingPage.username}</strong>! 🎉
      </p>

      <p style="color: #444; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
        ${
          landingPage.email_thank_you_msg ||
          "Your download is ready below — enjoy this exclusive Cre8tly guide created just for you."
        }
      </p>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${landingPage.pdf_url}" target="_blank"
          style="background-color: #F285C3; color: #ffffff; padding: 14px 34px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(242,133,195,0.4);">
          Download Your PDF
        </a>
      </div>

      <div style="margin-top: 35px; text-align: center;">
        <p style="font-size: 14px; color: #666; line-height: 1.6; margin: 0;">
          Ready to elevate your next project? Visit
          <a href="https://cre8tlystudio.com" target="_blank" style="color: #F285C3; text-decoration: none; font-weight: 600;">
            Cre8tly Studio
          </a>
          for professional tools that help you design, write, and publish like a pro.
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #f1f1f1; margin: 40px 0;" />

      <p style="color: #999; font-size: 12px; text-align: center;">
        © ${new Date().getFullYear()} Cre8tly Studio · Alure Digital<br/>
        You received this email because you downloaded a file through ${
          landingPage.username
        }'s Cre8tly page.
      </p>
    </div>
    `;

    // 4️⃣ Send via Outlook
    await sendOutLookMail({
      to: email,
      subject: `🎁 Your download from ${landingPage.username}`,
      html: emailHtml,
    });

    console.log(
      `✅ PDF email sent to ${email} for landing page ${landingPageId}`
    );

    res
      .status(200)
      .json({ success: true, message: "Lead saved and email sent" });
  } catch (err) {
    console.error("❌ Lead error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/builder/:userId", authenticateToken, async (req, res) => {
  try {
    console.log("🧭 /builder route hit");
    const { userId } = req.params;

    if (!req.user?.id) {
      console.log("❌ No user in token");
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (req.user.id !== userId) {
      console.log(`🚫 Token mismatch: ${req.user.id} !== ${userId}`);
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const landingPage = await getOrCreateLandingPage(userId);
    if (landingPage.error) {
      return res.status(landingPage.status || 500).json({
        success: false,
        message: landingPage.error,
      });
    }

    res.json({ success: true, landingPage });
  } catch (err) {
    console.error("🔥 Error in /builder route:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/update/:id", authenticateToken, async (req, res) => {
  try {
    console.log("🧠 Incoming landing page update body:", req.body); 
    const { id } = req.params;
    const result = await updateLandingPage(id, req.body);

    // ⚠️ Handle failed updates (username conflict or not found)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Landing page not found",
      });
    }

    res.json({ success: true, message: "Landing page updated successfully" });
  } catch (err) {
    console.error("❌ Error in /update/:id:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/check-username/:username", authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user?.id;

    if (!username || username.length < 3) {
      return res
        .status(400)
        .json({ available: false, message: "Username too short" });
    }

    const available = await checkUsernameAvailability(username, currentUserId);

    if (!available) {
      return res.json({
        available: false,
        message: "That username is already taken.",
      });
    }

    res.json({ available: true, message: "This username is available!" });
  } catch (err) {
    console.error("🔥 Error in /check-username route:", err);
    res
      .status(500)
      .json({ available: false, message: "Server error checking username" });
  }
});

export default router;
