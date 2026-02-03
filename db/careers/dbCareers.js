import connect from "../connect.js";
import { v4 as uuidv4 } from "uuid";
import { sendOutLookMail } from "../../utils/sendOutllokMail.js";

async function sendCareerApplicationReceivedEmail({ name, email }) {
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
              Application Received
            </h2>
            <p style="font-size:15px;color:#555;margin:0;">
              Thank you for applying to join The Messy Attic
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
          <td style="padding:0 50px 30px 50px;">
            <p style="font-size:15px;color:#333;line-height:1.8;margin:0;">
              Hello <strong>${name}</strong>,
              <br><br>
              We have received your application and it is now under review. Our team will
              evaluate your experience, qualifications, and availability to determine if
              there is a potential fit for the position.
              <br><br>
              If we decide to move forward, we will contact you directly with next steps.
              <br><br>
              Thank you for your interest in working with The Messy Attic.
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 50px;">
            <div style="height:1px;background:#e5e5e5;margin:25px 0;"></div>
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
    subject: "Your Application Has Been Received",
    html,
  });
}

export async function submitCareerApplication({
  name,
  email,
  position,
  experience,
  message,
}) {
  const db = connect();
  const id = uuidv4();

  try {
    const [existing] = await db.query(
      `SELECT id FROM careers_applications WHERE email = ? LIMIT 1`,
      [email],
    );

    if (existing.length > 0) {
      return {
        success: false,
        duplicate: true,
        message: "This email has already submitted an application.",
      };
    }

    await db.query(
      `
      INSERT INTO careers_applications
      (id, name, email, position, experience, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [id, name, email, position, experience, message],
    );

    // Send email notification to you
    await sendOutLookMail({
      to: "business@aluredigital.com",
      subject: `New Career Application – ${name}`,
      html: `
  <div style="background:#0b0b0b;padding:45px 0;font-family:Arial,sans-serif;">
  <table align="center" width="600" cellpadding="0" cellspacing="0"
    style="background:#111;border-radius:16px;color:#f2f2f2;
    box-shadow:0 0 35px rgba(0,0,0,0.7);padding:0;">

    <!-- Header -->
    <tr>
      <td align="center" style="padding:40px 40px 20px 40px;">
        <img src="https://themessyattic.com/themessyattic-logo.png" width="65" style="opacity:0.95;" />
        
        <h2 style="color:#7bed9f;font-size:28px;margin:22px 0 6px 0;font-weight:bold;">
          New Career Application
        </h2>

        <p style="font-size:15px;color:#bbb;margin:0;">
          Someone just applied to join the Cre8tly team
        </p>
      </td>
    </tr>

    <!-- Divider -->
    <tr>
      <td style="padding:0 60px;">
        <div style="height:1px;background:#222;margin:30px 0;"></div>
      </td>
    </tr>

    <!-- Overview -->
    <tr>
      <td style="padding:0 50px 30px 50px;">
        <p style="font-size:16px;color:#e5e5e5;text-align:center;line-height:1.8;margin:0;">
          A new applicant has submitted a form on the Cre8tly Careers page.
          <br>
          Here are their details:
        </p>
      </td>
    </tr>

    <!-- Applicant Details Box -->
    <tr>
      <td align="center" style="padding:0 50px 40px 50px;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#0e0e0e;border-radius:12px;padding:20px;
          border:1px solid #1e1e1e;">

          <tr>
            <td style="font-size:15px;padding:10px;color:#7bed9f;font-weight:bold;width:40%;">Name</td>
            <td style="font-size:15px;padding:10px;color:#ccc;text-align:left;">${name}</td>
          </tr>

          <tr>
            <td style="font-size:15px;padding:10px;color:#7bed9f;font-weight:bold;">Email</td>
            <td style="font-size:15px;padding:10px;color:#ccc;text-align:left;">${email}</td>
          </tr>

          <tr>
            <td style="font-size:15px;padding:10px;color:#7bed9f;font-weight:bold;">Position</td>
            <td style="font-size:15px;padding:10px;color:#ccc;text-align:left;">${position}</td>
          </tr>

          <tr>
            <td style="font-size:15px;padding:10px;color:#7bed9f;font-weight:bold;vertical-align:top;">
              Experience
            </td>
            <td style="font-size:15px;padding:10px;color:#ccc;text-align:left;white-space:pre-wrap;">
              ${experience}
            </td>
          </tr>

          <tr>
            <td style="font-size:15px;padding:10px;color:#7bed9f;font-weight:bold;vertical-align:top;">
              Message
            </td>
            <td style="font-size:15px;padding:10px;color:#ccc;text-align:left;white-space:pre-wrap;">
              ${message}
            </td>
          </tr>

        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center" style="font-size:13px;color:#777;padding:0 0 35px 0;">
        Notification sent automatically from The Messy Attic Careers
      </td>
    </tr>

  </table>
</div>

`,
    });

    await sendCareerApplicationReceivedEmail({ name, email });

    return { success: true, message: "Application submitted successfully." };
  } catch (err) {
    console.error("❌ submitCareerApplication error:", err);
    throw err;
  }
}
