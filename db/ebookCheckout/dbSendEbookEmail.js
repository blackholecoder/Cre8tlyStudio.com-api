import nodemailer from "nodemailer";
import connect from "../connect.js";

export async function sendEbookEmail({ email, title, productType }) {
  const db = await connect();

  try {
    // ✅ Fetch ebook info from database
    const [ebooks] = await db.query(
      "SELECT title, image_url, description FROM ebooks WHERE product_type = ? LIMIT 1",
      [productType]
    );

    let ebook = ebooks[0];

    // 🔸 If no match in DB, fallback to Stripe metadata title
    if (!ebook) {
      console.warn("⚠️ Ebook not found in DB for:", productType);
      ebook = {
        title: title || "Your Ebook",
        image_url: "https://cre8tlystudio.com/images/default-ebook-cover.jpg",
        description: "Thank you for your purchase! Click below to download your ebook.",
      };
    }

    // ✅ Configure nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_FROM_ADDRESS,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // ✅ Build and send the email
    await transporter.sendMail({
      from: `"Cre8tly Studio" <${process.env.MAIL_FROM_ADDRESS}>`,
      to: email,
      subject: `📘 Your Ebook: ${ebook.title}`,
      html: `
  <div style="font-family: Montserrat, Arial, sans-serif; background-color:#0a0a0a; color:#f5f5f5; padding:48px 32px; border-radius:16px; max-width:640px; margin:0 auto;">

    <!-- Logo -->
    <!-- Logo -->
<div style="text-align:center; margin-bottom:30px;">
  <img 
    src="https://cre8tlystudio.com/robot.png"
    alt="Cre8tly Studio Logo"
    style="max-width:140px; opacity:0.95; filter:drop-shadow(0 0 6px rgba(0,224,122,0.3));" 
  />
</div>


    <!-- Header -->
    <h1 style="color:#00E07A; text-align:center; margin-bottom:25px; font-size:28px; letter-spacing:0.5px;">
      Your Purchase is Confirmed 🎉
    </h1>

    <!-- Body Text -->
    <p style="font-size:16px; line-height:1.7; margin-bottom:20px; text-align:center;">
      Thank you for purchasing <strong style="color:#00E07A;">${ebook.title}</strong> from 
      <strong>Cre8tly Studio</strong>. We're thrilled to have you learning and growing with us.
    </p>

    <p style="font-size:16px; line-height:1.7; text-align:center; margin-bottom:30px;">
      You can download your ebook instantly using the secure link below.
    </p>

    <!-- CTA Button -->
    <div style="text-align:center; margin-bottom:40px;">
      <a href="https://cre8tlystudio.com/api/static/downloads/${productType}.pdf"
         style="background:#00E07A; color:#000; padding:14px 32px; border-radius:8px; font-weight:700; text-decoration:none; font-size:17px; letter-spacing:0.4px; display:inline-block;">
         📥 Download ${ebook.title}
      </a>
    </div>

    <!-- Image -->
    <div style="text-align:center; margin-bottom:35px;">
      <img src="${ebook.image_url}" 
           alt="${ebook.title}" 
           style="max-width:240px; border-radius:10px; border:1px solid #222; box-shadow:0 0 20px rgba(0,224,122,0.15);" />
    </div>

    <p style="font-size:14px; color:#ccc; text-align:center;">
      If you have any issues accessing your download, simply reply to this email and we’ll help you right away.
    </p>

    <!-- Divider -->
    <hr style="border:none; height:1px; background:#222; margin:40px 0;" />

    <!-- Secondary CTA / Footer -->
    <div style="text-align:center;">
      <h2 style="color:#00E07A; font-size:20px; margin-bottom:12px;">
        Loved this ebook?
      </h2>
      <p style="font-size:15px; line-height:1.6; color:#ddd; max-width:500px; margin:0 auto 22px;">
        You can create your own lead magnet or marketing guide in minutes using 
        <strong>Cre8tly Studio</strong>, the same software that built this ebook.
      </p>

      <a href="https://cre8tlystudio.com"
         style="background:linear-gradient(90deg,#00E07A,#6A5ACD); color:#fff; padding:12px 28px; border-radius:6px; text-decoration:none; font-weight:600; font-size:16px; display:inline-block;">
         🚀 Try Cre8tly Studio today!
      </a>
    </div>

    <div style="margin-top:40px; text-align:center; font-size:13px; color:#666;">
      © ${new Date().getFullYear()} Cre8tly Studio. All rights reserved.
    </div>
  </div>
`

    });

    console.log(`✅ Ebook email sent successfully to ${email}`);
    await db.end();
  } catch (err) {
    console.error("❌ Failed to send ebook email:", err.message);
    await db.end();
  }
}
