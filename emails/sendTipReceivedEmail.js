import { sendOutLookMail } from "../utils/sendOutllokMail.js";

export async function sendTipReceivedEmail({
  to,
  amount_cents,
  postUrl = `${process.env.FRONTEND_URL}/community`,
}) {
  try {
    const tipAmountFormatted = `$${(amount_cents / 100).toFixed(2)}`;

    const emailHtml = `
<div style="
  font-family: Helvetica, Arial, sans-serif;
  background-color: #f9fafb;
  padding: 40px 20px;
">
  <div style="
    max-width: 520px;
    margin: 0 auto;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 32px;
    box-shadow: 0 20px 30px rgba(0,0,0,0.06);
  ">

    <!-- HEADER -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
      <img 
        src="https://cre8tlystudio.com/cre8tly-logo.png"
        style="width:48px;height:48px;object-fit:contain;"
      />
      <div style="line-height:1.1;">
        <div style="font-size:18px;font-weight:600;color:#111827;">
          Cre8tly Studio
        </div>
      </div>
    </div>

    <h1 style="
      font-size:26px;
      font-weight:700;
      color:#111827;
      margin-bottom:8px;
    ">
      You got a tip 💖
    </h1>

    <p style="
      font-size:14px;
      color:#4b5563;
      margin-bottom:24px;
    ">
      Someone appreciated your writing and sent you a tip of
      <strong>${tipAmountFormatted}</strong>.
    </p>

    <!-- BUTTON -->
    <a
      href="${postUrl}"
      style="
        display:block;
        width:100%;
        text-align:center;
        background:#111827;
        color:#ffffff;
        padding:14px 0;
        border-radius:10px;
        text-decoration:none;
        font-weight:600;
        font-size:15px;
        margin-top:16px;
      "
    >
      View your post
    </a>

    <!-- FOOTER -->
    <p style="
      margin-top:32px;
      text-align:center;
      font-size:12px;
      color:#9ca3af;
    ">
      © ${new Date().getFullYear()} Cre8tly Studio · Alure Digital
    </p>
  </div>
</div>
`;

    await sendOutLookMail({
      to,
      subject: "💖 You received a tip on Cre8tly",
      html: emailHtml,
    });
  } catch (err) {
    console.error("❌ Failed to send tip received email", err);
    throw err;
  }
}
