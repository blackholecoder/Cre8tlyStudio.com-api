import express from "express";
import nodemailer from "nodemailer";
import { saveContactMessage } from "../db/dbContact.js";
const router = express.Router();

router.post("/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ error: "Please fill out all required fields." });
    }

    // 💾 Save contact message
    await saveContactMessage({ name, email, subject, message });

    // 💌 Create a Gmail transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_FROM_ADDRESS_NEW, // e.g. support@themessyattic.com
        pass: process.env.GMAIL_APP_PASSWORD, // your Gmail App Password
      },
    });

    // 📨 Send the message
    await transporter.sendMail({
      from: `"Cre8tly Studio Support" <${process.env.MAIL_FROM_ADDRESS_NEW}>`,
      to: process.env.MAIL_FROM_ADDRESS_NEW, // send to your support inbox
      subject: `📬 Support Request: ${subject || "No Subject"}`,
      html: `
  <div style="
    font-family: 'Montserrat', Arial, sans-serif;
    background-color: #0a0a0a;
    color: #f1f1f1;
    border: 1px solid #222;
    border-radius: 10px;
    padding: 32px;
    max-width: 640px;
    margin: 0 auto;
    box-shadow: 0 0 20px rgba(0, 224, 122, 0.15);
  ">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="
        color: #00E07A;
        font-size: 24px;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      ">
        💬 New Support Request
      </h1>
      <p style="color: #aaa; font-size: 14px;">From Cre8tly Studio Contact Form</p>
    </div>

    <!-- User Details -->
    <div style="
      background: #111;
      border: 1px solid #222;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 20px;
    ">
      <p style="margin: 6px 0;">
        <strong style="color: #00E07A;">Name:</strong> ${name}
      </p>
      <p style="margin: 6px 0;">
        <strong style="color: #00E07A;">Email:</strong> ${email}
      </p>
    </div>

    <!-- Message Section -->
    <div style="
      background: #111;
      border: 1px solid #222;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
    ">
      <p style="margin: 0 0 10px; font-weight: 600; color: #00E07A;">Message:</p>
      <p style="
        white-space: pre-line;
        line-height: 1.6;
        color: #f1f1f1;
        font-size: 15px;
      ">
        ${message}
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 30px; color: #666; font-size: 13px;">
      <p>
        This message was automatically sent from the 
        <strong style="color: #00E07A;">Cre8tly Studio</strong> support form.
      </p>
      <p>© ${new Date().getFullYear()} Cre8tly Studio — All Rights Reserved</p>
    </div>
  </div>
`,
    });

    res.json({ success: true, message: "Support request sent successfully!" });
  } catch (error) {
    console.error("❌ Error sending contact form:", error);
    res
      .status(500)
      .json({ error: "Failed to send message. Please try again later." });
  }
});

export default router;
