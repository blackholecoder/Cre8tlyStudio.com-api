import nodemailer from "nodemailer";

export async function sendMail({ to, subject, html }) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_FROM_ADDRESS,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"The Messy Attic" <${process.env.MAIL_FROM_ADDRESS}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent successfully to: ${to}`);
    return true;
  } catch (err) {
    console.error("❌ sendMail error:", err);
    throw new Error("Failed to send email");
  }
}
