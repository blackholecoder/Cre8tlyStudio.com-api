import { sendOutLookMail } from "../utils/sendOutllokMail";

// Post email for Subscribers
export async function sendNewPostEmail({
  to,
  authorName,
  postTitle,
  excerpt,
  postImageUrl,
  postUrl,
}) {
  if (!to) {
    throw new Error("No email recipient provided to sendNewPostEmail");
  }

  const html = `
<div style="min-height:100%;background:#ffffff;padding:60px 20px;font-family:Arial,sans-serif;">
  <div style="
    max-width:420px;
    margin:0 auto;
    background:#ffffff;
    padding:32px;
    border-radius:16px;
    border:1px solid #e5e7eb;
    box-shadow:0 20px 40px rgba(0,0,0,0.08);
  ">
    <!-- Brand -->
    <div style="margin-bottom:32px;">
      <table align="center" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="padding-right:10px;vertical-align:middle;">
            <img
              src="https://themessyattic.com/themessyattic-logo.png"
              width="36"
              height="36"
              alt="Cre8tly Studio"
              style="display:block;"
            />
          </td>
          <td style="vertical-align:middle;">
            <div style="
              font-size:20px;
              font-weight:700;
              color:#111827;
              line-height:1;
            ">
              Cre8tly Studio
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Heading -->
    <h2 style="font-size:26px;font-weight:700;color:#111827;margin:8px 0;">
      New post published
    </h2>

    <p style="font-size:14px;color:#4b5563;margin-bottom:20px;">
      From ${authorName}
    </p>

    ${
      postImageUrl
        ? `
      <img
        src="${postImageUrl}"
        alt=""
        style="
          width:100%;
          border-radius:12px;
          margin-bottom:20px;
          object-fit:cover;
        "
      />
    `
        : ""
    }

    <!-- Post title -->
    <h3 style="
      font-size:18px;
      font-weight:700;
      color:#111827;
      margin-bottom:12px;
    ">
      ${postTitle}
    </h3>

    <!-- Body preview -->
    <p style="
      font-size:14px;
      color:#374151;
      line-height:1.6;
      margin-bottom:24px;
    ">
      ${excerpt}${excerpt?.length >= 220 ? "…" : ""}
    </p>

    <!-- CTA -->
    <div style="text-align:center;margin:30px 0;">
      <a
        href="${postUrl}"
        target="_blank"
        style="
          background:#7bed9f;
          color:#000;
          padding:14px 36px;
          border-radius:8px;
          text-decoration:none;
          font-weight:700;
          display:inline-block;
        "
      >
        Read the post
      </a>
    </div>

    <!-- Footer -->
    <p style="font-size:13px;color:#6b7280;text-align:center;">
      You’re receiving this because you’re subscribed to ${authorName}.
    </p>

    <p style="font-size:13px;color:#6b7280;text-align:center;margin-top:12px;">
      — Cre8tly Studio
    </p>
  </div>
</div>
`;

  await sendOutLookMail({
    to,
    subject: `${authorName} posted: ${postTitle}`,
    html,
  });
}
