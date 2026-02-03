import nodemailer from "nodemailer";

export async function sendOutLookMail({
  to,
  subject,
  html,
  attachments = [],
  cc = [],
}) {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false, // must be false for STARTTLS
      auth: {
        user: process.env.OUTLOOK_FROM_ADDRESS, // your Outlook address
        pass: process.env.OUTLOOK_APP_PASSWORD, // your Outlook app password
      },
      tls: {
        ciphers: "SSLv3",
      },
    });

    await transporter.sendMail({
      from: `"The Messy Attic" <${process.env.OUTLOOK_FROM_ADDRESS}>`,
      to,
      cc,
      subject,
      html,
      attachments,
    });

    console.log(`✅ Email sent successfully to: ${to}`);
    return true;
  } catch (err) {
    console.error("❌ send Outlook Mail error:", err);
    throw new Error("Failed to send email");
  }
}
