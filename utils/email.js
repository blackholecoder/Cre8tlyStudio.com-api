import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, html, from = process.env.MAIL_FROM_ADDRESS }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_FROM_ADDRESS,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({ from, to, subject, html });
  console.log("✅ Email sent successfully to:", to);
};