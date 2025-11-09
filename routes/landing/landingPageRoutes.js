import express from "express";
import {
  checkUsernameAvailability,
  getCoverImageByPdfUrl,
  getLandingPageById,
  getLandingPageByUser,
  getOrCreateLandingPage,
  saveLandingPageLead,
  updateLandingLogo,
  updateLandingPage,
} from "../../db/landing/dbLanding.js";
import { sendOutLookMail } from "../../utils/sendOutllokMail.js";
import { authenticateToken } from "../../middleware/authMiddleware.js";
import { uploadFileToSpaces } from "../../helpers/uploadToSpace.js";
import { isSafeUrl } from "../../utils/isSafeUrl.js";
const router = express.Router();

// Capture root requests for each subdomain
router.get("/", async (req, res) => {
  const { subdomain } = req;
  if (!subdomain) return res.status(404).send("Landing page not found");

  try {
    const landingPage = await getLandingPageByUser(subdomain);

    // --- 1️⃣ Default “coming soon” fallback
    if (!landingPage) {
      return res.send("<h1>Coming soon</h1>");
    }

    // --- 2️⃣ Extract core properties

    const title = landingPage.username || landingPage.title || "Cre8tly Studio";

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
              return `<h1 style="padding-bottom:${padding}px">${
                block.text || ""
              }</h1>`;

            case "subheading":
              return `<h2 style="padding-bottom:${padding}px">${
                block.text || ""
              }</h2>`;

            case "subsubheading":
              return `<h3 style="padding-bottom:${padding}px">${
                block.text || ""
              }</h3>`;

            case "list_heading":
              return `<p style="
                padding-bottom:${padding / 2}px;
                font-weight:${landingPage.font_weight_label || 700};
                font-size:1.15rem;
                text-align:${block.alignment || "left"};
                color:${landingPage.font_color_p || "#FFFFFF"};
                max-width:700px;
                margin:0 auto;
              ">${block.text || ""}</p>`;

            case "paragraph":
              const lines = (block.text || "").split(/\n/);
              const hasBullets = lines.some((line) =>
                line.trim().startsWith("•")
              );
              const labelLine =
                lines[0] && !lines[0].trim().startsWith("•") ? lines[0] : null;
              const contentLines = labelLine ? lines.slice(1) : lines;

              // ✅ If user explicitly chose bullet list
              if (block.bulleted) {
                const listItems = lines
                  .filter((line) => line.trim() !== "")
                  .map((line) => `<li>${line.replace(/^•\s*/, "")}</li>`)
                  .join("");

                return `
      <ul style="
        list-style: disc;
        padding-left:1.5rem;
        text-align:${block.alignment || "left"};
        color:${landingPage.font_color_p || "#FFFFFF"};
        line-height:1.8;
        max-width:700px;
        margin:0 auto;
        padding-bottom:${padding}px;
      ">
        ${listItems}
      </ul>
    `;
              }

              // 🟡 Fallback: auto-detect existing bullet style (old data)
              if (hasBullets) {
                return `
      <div style="padding-bottom:${padding}px; max-width:700px; margin:0 auto; text-align:left; line-height:1.8;">
        ${
          labelLine
            ? `<p style="
                font-weight:${landingPage.font_weight_label || 600};
                font-size:1.15rem;
                margin-bottom:6px;
                color:${landingPage.font_color_p || "#FFFFFF"};
              ">${labelLine}</p>`
            : ""
        }
        <ul style="list-style: disc; padding-left:1.5rem; color:${
          landingPage.font_color_p || "#FFFFFF"
        };">
          ${contentLines
            .map((line) =>
              line.trim().startsWith("•")
                ? `<li>${line.replace(/^•\s*/, "")}</li>`
                : ""
            )
            .join("")}
        </ul>
      </div>`;
              }

              // 🧾 Normal paragraph fallback
              return `<p style="
    padding-bottom:${padding}px;
    white-space:pre-line;
    text-align:${block.alignment || "left"};
    max-width:700px;
    margin:0 auto;
    line-height:1.8;
    color:${landingPage.font_color_p || "#FFFFFF"};
  ">${block.text}</p>`;

            case "button":
  return `
    <div style="text-align:center; margin:40px 0 60px;">
      <a 
        href="${block.url || "#"}" 
        class="btn"
        ${block.new_tab ? 'target="_blank" rel="noopener noreferrer"' : ''}
        style="display:inline-block;"
      >
        ${block.text || "Click Here"}
      </a>
    </div>
  `;


            default:
              return "";
          }
        })
        .join("");
    } catch (err) {
      console.error("❌ Failed to render content blocks:", err);
      contentHTML = "";
    }

    let coverImageUrl = null;
    if (landingPage.pdf_url) {
      coverImageUrl = await getCoverImageByPdfUrl(landingPage.pdf_url);
    }
    landingPage.cover_image_url = coverImageUrl;

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
  }

    header {
  position: relative;
  display: flex;
  justify-content: center; /* future cover centers */
  align-items: center;
  width: 100%;
  padding: 40px 20px 0;
}

header .logo {
  position: absolute;
  top: 20px;
  left: 30px;
  height: 45px;           /* smaller height */
  max-width: 140px;       /* narrower width */
  object-fit: contain;
  border-radius: 6px;     /* subtle rounding if needed */
  padding: 0;             /* remove inner padding */
  background: none;       /* no white or semi-transparent background */
  box-shadow: none;       /* clean, no shadow */
}

/* 🔹 Optional PDF cover (centered) */
header .cover {
  max-height: 260px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.25);
}

.cover-image {
  display: block;
  margin: 70px auto 50px;
  width: 100%;
  max-width: 480px;           /* balanced width */
  aspect-ratio: 3 / 4;        /* classic book/PDF ratio */
  border-radius: 12px;
  object-fit: cover;
  box-shadow:
    0 15px 35px rgba(0, 0, 0, 0.25),
    0 6px 20px rgba(0, 0, 0, 0.15);
  background: #000;
  border: 2px solid rgba(255, 255, 255, 0.06);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}


  main {
    max-width: 850px;
    margin: 60px auto;
    padding: 60px 30px 100px;
    text-align: center;
    background: rgba(255,255,255,0.04);
    backdrop-filter: blur(6px);
    border-radius: 24px;
    box-shadow: 0 4px 25px rgba(0,0,0,0.15);
  }

 h1, h2, h3 {
  max-width: 700px;
  margin: 0 auto 1.5rem; /* unified vertical rhythm */
  text-align: center;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: ${landingPage.font_color_h1 || "#FFFFFF"};
  line-height: 1.3;
}

h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: ${landingPage.font_color_h2 || "#FFFFFF"};
  line-height: 1.4;
}

h3 {
  font-size: 1.4rem;
  font-weight: 500;
  color: ${landingPage.font_color_h3 || "#FFFFFF"};
  line-height: 1.5;
}

p {
  max-width: 700px;
  margin: 0 auto 1.5rem;
  text-align: left;              /* ✅ Left-align paragraphs and bullets */
  font-size: 1.1rem;
  line-height: 1.8;
  color: ${landingPage.font_color_p || "#FFFFFF"};
}


  img {
    max-width: 280px;
    border-radius: 12px;
    margin-bottom: 40px;
  }

 .btn {
  display: inline-block;
  background: #7bed9f;
  color: #000;
  padding: 12px 28px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: 0.3px;
  line-height: 1.2;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, box-shadow 0.3s ease, background 0.3s ease;
}
.btn:hover {
  background: #5fd98d;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

 form {
  margin-top: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap; /* ✅ allows wrapping on mobile */
  gap: 10px;
  width: 100%;             
  max-width: 700px;       
  margin-left: auto;       
  margin-right: auto;      
}

  input[type="email"] {
  padding: 12px 20px;
  width: 100%;
  max-width: 320px; /* ✅ fits nicely on desktop */
  border-radius: 6px;
  border: 1px solid #ccc;
  flex: 1;
}

  button {
  background: #000;
  color: #fff;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s, transform 0.2s ease;
  width: 100%;
  max-width: 200px; /* ✅ ensures button doesn’t overflow */
}


  button:hover {
    background: #7bed9f;
    color: #000;
    transform: translateY(-1px);
  }

  footer {
    margin-top: 60px;
    font-size: 0.95rem;
    color: #ccc;
  }

  footer em {
  color: #fff;
  font-style: normal; /* optional */
}

  /* Responsive */
  @media (max-width: 768px) {
    main {
    max-width: 90%;
    padding: 40px 12px 60px;
    background: none;
    backdrop-filter: none;
    box-shadow: none;
    border-radius: 0;
  }

  header .logo {
  height: 35px;
  left: 16px;
  top: 12px;
}

    h1 { font-size: 2rem; }
    h2 { font-size: 1.5rem; }
    p  { font-size: 1rem; }
    input[type="email"], button { width: 100%; margin: 6px 0; }
  }
@media (max-width: 600px) {
  form {
    flex-direction: column; /* ✅ stacks input and button vertically */
  }

  input[type="email"],
button {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;  /* ✅ NEW - prevents off-screen padding overflow */
}
}

</style>

        </head>

        <body>
        <header>
  ${
    landingPage.logo_url
      ? `<img src="${landingPage.logo_url}" alt="Brand Logo" class="logo" />`
      : ""
  }

  
</header>
  <main>
  ${
    landingPage.cover_image_url
      ? `<img src="${landingPage.cover_image_url}" alt="Cover" class="cover-image" />`
      : ""
  }

    ${
      contentHTML ||
      "<h1>Welcome to My Page</h1><p>Start customizing your content.</p>"
    }

    <form id="leadForm">
  <input type="hidden" name="landingPageId" value="${landingPage.id}" />
  <input type="email" name="email" placeholder="Email address" required />
  <button type="submit">Download Now</button>
</form>

<p id="thankyou" 
   style="display:none;color:white;margin-top:30px;font-size:1.1rem;text-align:center;">
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
      ${
        landingPage.email_thank_you_msg
          ? `<footer><em>${landingPage.email_thank_you_msg}</em></footer>`
          : ""
      }
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

    // 🧩 If content_blocks exist, validate URLs inside them
    if (Array.isArray(req.body.content_blocks)) {
      req.body.content_blocks = await Promise.all(
        req.body.content_blocks.map(async (block) => {
          if (block.type === "button" && !isSafeUrl(block.url)) {
            console.warn("⚠️ Unsafe URL blocked:", block.url);

            // ⚠️ 1️⃣ Send alert email to admin
            try {
              await sendOutLookMail({
                to: "business@aluredigital.com",
                subject: "🚨 Unsafe URL Blocked in Landing Page Update",
                html: `
                  <div style="font-family:Arial,Helvetica,sans-serif; background:#fff; padding:20px; border-radius:10px; border:1px solid #eee; max-width:600px;">
                    <h2 style="color:#e74c3c;">🚨 Suspicious URL Blocked</h2>
                    <p><strong>User ID:</strong> ${req.user?.id || "Unknown"}</p>
                    <p><strong>Landing Page ID:</strong> ${id}</p>
                    <p><strong>URL Attempted:</strong> ${block.url}</p>
                    <p style="color:#555;">
                      This URL was automatically blocked and replaced with "#".
                      Please review this user's activity for potential abuse.
                    </p>
                    <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
                    <p style="font-size:12px;color:#888;">Sent automatically by Cre8tly Studio Security System</p>
                  </div>
                `,
              });
              console.log("📧 Security alert email sent for unsafe URL:", block.url);
            } catch (mailErr) {
              console.error("❌ Failed to send security email:", mailErr);
            }

            // 2️⃣ Neutralize URL before saving
            block.url = "#";
          }

          return block;
        })
      );
    }

    const result = await updateLandingPage(id, req.body);

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

router.post("/upload-logo", async (req, res) => {
  try {
    const { landingId } = req.body;
    const logo = req.files?.logo;

    if (!landingId || !logo) {
      return res.status(400).json({
        success: false,
        message: "Missing landingId or logo file",
      });
    }

    // Build filename and upload to Spaces
    const ext = logo.name.split(".").pop();
    const fileName = `landing_logos/${landingId}-${Date.now()}.${ext}`;
    const result = await uploadFileToSpaces(logo.data, fileName, logo.mimetype);

    // Save URL to DB
    await updateLandingLogo(landingId, result.Location);

    res.json({ success: true, logo_url: result.Location });
  } catch (err) {
    console.error("❌ Error uploading logo:", err);
    res.status(500).json({
      success: false,
      message: "Failed to upload logo",
    });
  }
});

router.get("/lead-magnets/cover", async (req, res) => {
  try {
    const { pdfUrl } = req.query;
    if (!pdfUrl) {
      return res
        .status(400)
        .json({ success: false, message: "Missing pdfUrl" });
    }

    const cover = await getCoverImageByPdfUrl(pdfUrl);
    if (!cover) {
      return res.json({ success: false, message: "No cover found" });
    }

    res.json({ success: true, cover_image: cover });
  } catch (err) {
    console.error("❌ Error in /lead-magnets/cover route:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
