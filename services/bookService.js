import { sendOutLookMail } from "../utils/sendOutllokMail.js";

// EMAIL SENT AFTER COMPLETION OF BOOK
export async function sendContentReadyEmail({
  name,
  email,
  label = "content",
}) {
  const html = `
    <div style="background:#f5f5f5;padding:40px 0;font-family:Arial, sans-serif;">
      <table align="center" width="620" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:8px;color:#000000;
        padding:0;border:1px solid #e0e0e0;">

        <!-- Header -->
        <tr>
          <td align="center" style="padding:40px 40px 10px 40px;">
            <img src="https://themessyattic.com/themessyattic-logo.png" width="65" style="opacity:0.95;" />
            <h2 style="font-size:24px;margin:25px 0 10px 0;font-weight:600;color:#111;">
              Your ${label} is ready
            </h2>
            <p style="font-size:15px;color:#555;margin:0;">
              Everything is complete and available in The Messy Attic
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 50px;">
            <div style="height:1px;background:#e5e5e5;margin:30px 0;"></div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:0 50px 10px 50px;">
            <p style="font-size:15px;color:#333;line-height:1.8;margin:0;">
              Hello <strong>${name}</strong>,
              <br><br>
              We’ve finished preparing your ${label}. You can return to your
              dashboard at any time to continue.
            </p>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td align="center" style="padding:20px 50px 35px 50px;">
            <a
              href="https://themessyattic.com/login"
              style="
                display:inline-block;
                padding:14px 26px;
                border-radius:999px;
                background:#7bed9f;
                color:#000000;
                font-size:14px;
                font-weight:600;
                text-decoration:none;
              "
            >
              Log in to The Messy Attic
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="font-size:13px;color:#777;padding:0 0 35px 0;">
            © ${new Date().getFullYear()} The Messy Attic • All rights reserved
          </td>
        </tr>

      </table>
    </div>
  `;

  await sendOutLookMail({
    to: email,
    subject: "Your content is ready in The Messy Attic",
    html,
  });
}
