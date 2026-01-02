import express from "express";
import nodemailer from "nodemailer";
import axios from "axios";

import dotenv from "dotenv";
import { pdfLeads } from "../db/dbPdf.js";
import { incrementLeadMagnetExportCount } from "../db/dbLeadMagnet.js";
dotenv.config();

const router = express.Router();

router.post("/free-pdf", async (req, res) => {
  const { email } = req.body;

  try {
    await pdfLeads(email);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "hitwritertv@gmail.com",
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // 📨 Send the guide to user
    await transporter.sendMail({
      from: '"Cre8tly Studio" <hitwritertv@gmail.com>',
      to: email,
      subject: "The Secret Formula To Grow Your Email List 🚀",
      html: `
  <div style="font-family:Montserrat,Arial,sans-serif;background:#0b0f1a;color:#f5f5f5;padding:40px 20px;text-align:center;border-radius:12px;">
    
    <!-- Header Logo -->
    <div style="text-align:center;margin-bottom:25px;">
      <img src="https://cre8tlystudio.com/robot.png"
           alt="Cre8tly Studio Logo"
           style="max-width:120px;opacity:0.95;filter:drop-shadow(0 0 6px rgba(0,224,122,0.4));" />
    </div>

    <h2 style="color:#00E07A;margin-bottom:20px;">Your Growth Formula Has Arrived 🚀</h2>
    <p style="font-size:16px;line-height:1.6;max-width:540px;margin:0 auto 30px auto;">
      Thanks for grabbing <strong>“The Secret Formula to Grow Your Email List.”</strong><br>
      Inside, you’ll discover proven steps to attract, capture, and nurture your perfect audience, the same system Cre8tly uses to help businesses scale effortlessly.
    </p>

    <a href="https://cre8tlystudio.com/api/static/downloads/The_Secret_Formula_To_Grow_Your_Email_List.pdf"
      style="display:inline-block;background:linear-gradient(90deg,#00E07A,#6a5acd);
      color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin-bottom:30px;">
      📥 Download Your Free Guide
    </a>

    <p style="font-size:14px;color:#bbb;line-height:1.5;max-width:520px;margin:20px auto 0 auto;">
      Keep an eye on your inbox for bonus strategies from the Cre8tly team on automation, funnels, and design systems that convert.
      <br/><br/>
      <strong>– The Cre8tly Studio Team</strong>
    </p>
  </div>
  `,
    });

    // 🔔 Internal notification
    await transporter.sendMail({
      from: '"Cre8tly Studio Notifications" <hitwritertv@gmail.com>',
      to: ["hitwritertv@gmail.com", "chrischilodesigns@gmail.com"],
      subject: "📥 New PDF Download (Cre8tly Studio)",
      html: `
  <div style="font-family:Montserrat,Arial,sans-serif;background:#0a0a0a;color:#f5f5f5;padding:40px 20px;text-align:center;border-radius:12px;">
    
    <!-- Header Logo -->
    <div style="text-align:center;margin-bottom:25px;">
      <img src="https://cre8tlystudio.com/robot.png"
           alt="Cre8tly Studio Logo"
           style="max-width:120px;opacity:0.95;filter:drop-shadow(0 0 6px rgba(0,224,122,0.4));" />
    </div>

    <h2 style="color:#00E07A;margin-bottom:20px;">New Lead Captured</h2>
    <p style="font-size:16px;">A visitor just downloaded the free guide:</p>
    <p style="font-size:18px;color:#6a5acd;margin-bottom:10px;">“The Secret Formula to Grow Your Email List”</p>

    <div style="background:#111;padding:15px 20px;border-radius:6px;max-width:500px;margin:0 auto 30px auto;">
      <p style="font-size:16px;margin:0;"><strong>Email:</strong> ${email}</p>
    </div>

    <p style="font-size:14px;color:#ccc;">Follow up with this lead — they’re warm and conversion-ready 🔥</p>
  </div>
  `,
    });

    res.json({ success: true, message: "PDF sent successfully!" });
  } catch (e) {
    console.error("❌ Error sending Cre8tly PDF:", e);
    res.status(500).json({ errorMessage: e.message });
  }
});

router.get("/proxy", async (req, res) => {
  let { url, title, preview, magnetId } = req.query; // accept title and preview flags

  if (!url || typeof url !== "string") {
    console.error("❌ Missing or invalid ?url:", url);
    return res.status(400).send("Invalid or missing ?url parameter");
  }

  try {
    url = decodeURIComponent(url);

    // ✅ Ensure full HTTPS URL
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    const response = await axios.get(url, { responseType: "arraybuffer" });

    // ✅ Determine clean filename
    let filename = "Cre8tly_Download.pdf";
    const match = url.match(/\/([^\/?#]+\.pdf)(?:[?#]|$)/i);
    if (match) filename = match[1];

    // If ?title is provided (like from your lead_magnets table)
    if (title) {
      filename = `${title.replace(/[^a-z0-9_\-]+/gi, "_")}.pdf`;
    }

    // ✅ Decide inline (preview) vs attachment (download)
    const dispositionType = preview === "1" ? "inline" : "attachment";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Disposition",
      `${dispositionType}; filename="${filename}"`
    );

    if (preview !== "1" && magnetId) {
      incrementLeadMagnetExportCount(magnetId);
    }

    res.send(response.data);
  } catch (err) {
    console.error("❌ Proxy error fetching:", url, err.message);
    res.status(500).send("Failed to fetch PDF");
  }
});

export default router;
