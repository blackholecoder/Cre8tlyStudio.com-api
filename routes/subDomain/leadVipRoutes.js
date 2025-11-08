import express from "express";
import { leadSchema } from "../../middleware/emailValidation.js";
import { leadRateLimiter } from "../../middleware/leadRateLimiter.js";
import { v4 as uuidv4 } from "uuid";
import { saveLead } from "../../db/subDomain/dbLeads.js";
import path from "path";
import { fileURLToPath } from "url";
import { sendOutLookMail } from "../../utils/sendOutllokMail.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.post("/vip-leads", leadRateLimiter, async (req, res) => {
  try {
    const { error, value } = leadSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((d) => d.message).join(", "),
      });
    }

    const { email, source } = value;
    const id = uuidv4();
    const result = await saveLead(id, email, source);

    // ✅ PDF path for the free guide
    const guidePath = path.join(__dirname, "../../public/downloads/AI_That_Understands_You_See_the_Difference_for_Yourself.pdf");

    // ✅ Send confirmation email to the user
    await sendOutLookMail({
      to: email,
      subject: "🎁 Your Free Cre8tly VIP Prompt Guide",
      html: `
  <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #ffffff; padding: 40px 30px; border-radius: 12px; border: 1px solid #f1f1f1; max-width: 600px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 25px;">
      <img src="https://cre8tlystudio.com/cre8tly-fav-white.svg" alt="Cre8tly Studio" style="width: 120px; height: auto; margin-bottom: 15px;" />
      <h1 style="color: #F285C3; font-size: 26px; margin: 0;">Welcome to Cre8tly VIP!</h1>
    </div>

    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      We're thrilled to have you here! 🎉
    </p>

    <p style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
      Inside this exclusive <strong>VIP Creator Guide</strong>, you’ll discover how to write, design, and publish like a professional — all while keeping your authentic voice intact.
    </p>

    <p style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
      <strong>Click the attached PDF</strong> to download your free guide instantly.
    </p>

    <div style="text-align: center; margin-top: 30px;">
      <a href="https://cre8tlystudio.com"
        style="background-color: #F285C3; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        Visit Cre8tly Studio
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #f1f1f1; margin: 40px 0;" />

    <p style="color: #555; font-size: 14px; line-height: 1.6; text-align: center;">
      Welcome to a new era of authentic creation.<br/>
      <strong>— The VIP Cre8tly Studio Team</strong>
    </p>

    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
      © ${new Date().getFullYear()} Cre8tly Studio, Alure Digital<br/>
      You received this email because you joined the Cre8tly VIP list.
    </p>
  </div>
`,

      attachments: [
        {
          filename: "Cre8tly_VIP_Guide.pdf",
          path: guidePath,
          contentType: "application/pdf",
        },
      ],
    });

    // ✅ Send internal notification to your team
    await sendOutLookMail({
      to: "business@aluredigital.com",
      cc: ["chrischilodesigns@gmail.com", "femmebizdesigns@gmail.com"],
      subject: `📬 New VIP Lead from ${source}`,
      html: `
  <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #fdfdfd; padding: 30px; border-radius: 12px; border: 1px solid #f1f1f1; max-width: 600px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 25px;">
      <img src="https://cre8tlystudio.com/cre8tly-fav-white.svg" alt="Cre8tly Studio" style="width: 120px; height: auto; margin-bottom: 10px;" />
      <h2 style="color: #F285C3; font-size: 22px; margin: 0;">New VIP Lead Notification</h2>
    </div>

    <p style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
      A new VIP subscriber just joined from your <strong>${source}</strong> campaign.
    </p>

    <table style="width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="background: #F285C3; color: #fff; font-weight: bold; padding: 12px 16px;">Lead Details</td>
      </tr>
      <tr>
        <td style="padding: 16px; border: 1px solid #f3f3f3;">
          <ul style="list-style: none; padding: 0; margin: 0; color: #333; font-size: 15px; line-height: 1.6;">
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Source:</strong> ${source}</li>
            <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
          </ul>
        </td>
      </tr>
    </table>

    <p style="margin-top: 25px; color: #666; font-size: 14px; text-align: center;">
      <em>Stay on top of every new VIP sign-up, your marketing funnel is working!</em>
    </p>

    <div style="text-align: center; margin-top: 30px;">
      <a href="https://admin.cre8tlystudio.com"
        style="background-color: #E93CAC; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
        View in Admin Dashboard
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #f1f1f1; margin: 30px 0;" />

    <p style="font-size: 12px; color: #999; text-align: center;">
      © ${new Date().getFullYear()} Cre8tly Studio — Alure Digital<br/>
      This notification was sent automatically from your VIP lead capture system.
    </p>
  </div>
`,

    });

    res.status(200).json({ success: true, message: "Lead saved and email sent!" });
  } catch (err) {
    console.error("Error saving lead:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});




export default router;