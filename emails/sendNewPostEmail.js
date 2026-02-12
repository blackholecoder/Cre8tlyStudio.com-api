import { sendOutLookMail } from "../utils/sendOutlookMail.js";

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
<div style="min-height:100%;background:#f9fafb;padding:60px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="
    max-width:460px;
    margin:0 auto;
    background:#ffffff;
    padding:40px 32px;
    border-radius:18px;
    border:1px solid #e5e7eb;
    box-shadow:0 25px 60px rgba(0,0,0,0.06);
  ">

    <!-- Brand -->
    <div style="text-align:center;margin-bottom:36px;">
      <img
        src="https://themessyattic.com/themessyattic-logo.png"
        width="56"
        height="56"
        alt="The Messy Attic"
        style="display:block;margin:0 auto 14px;"
      />
      <div style="
        font-size:20px;
        font-weight:700;
        color:#111827;
        letter-spacing:0.3px;
      ">
        The Messy Attic
      </div>
      <div style="
        width:40px;
        height:2px;
        background:#e5e7eb;
        margin:16px auto 0;
        border-radius:2px;
      "></div>
    </div>

    <!-- Heading -->
    <h2 style="
      font-size:22px;
      font-weight:700;
      color:#111827;
      margin:0 0 8px;
      text-align:center;
    ">
      New post published
    </h2>

    <p style="
      font-size:14px;
      color:#6b7280;
      margin:0 0 28px;
      text-align:center;
    ">
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
          border-radius:14px;
          margin-bottom:24px;
          object-fit:cover;
          display:block;
        "
      />
    `
        : ""
    }

    <!-- Post Title -->
    <h3 style="
      font-size:18px;
      font-weight:700;
      color:#111827;
      margin:0 0 14px;
    ">
      ${postTitle}
    </h3>

    <!-- Excerpt -->
    <div style="
      margin:0 0 32px;
      padding:18px 20px;
      background:#f9fafb;
      border-radius:12px;
      border:1px solid #e5e7eb;
      font-size:14px;
      color:#374151;
      line-height:1.7;
    ">
      ${excerpt}${excerpt?.length >= 220 ? "…" : ""}
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:32px 0;">
      <a
        href="${postUrl}"
        target="_blank"
        style="
          background:#7bed9f;
          color:#000000;
          padding:14px 38px;
          border-radius:10px;
          text-decoration:none;
          font-weight:700;
          font-size:14px;
          display:inline-block;
        "
      >
        Read the post
      </a>
    </div>

    <!-- Footer -->
    <div style="
      margin-top:36px;
      padding-top:20px;
      border-top:1px solid #f1f5f9;
      text-align:center;
      font-size:13px;
      color:#6b7280;
      line-height:1.6;
    ">
      You’re receiving this because you’re subscribed to ${authorName}.
      <br/>
      <span style="display:inline-block;margin-top:8px;">
        — The Messy Attic
      </span>
    </div>

  </div>
</div>
`;

  await sendOutLookMail({
    to,
    subject: `${authorName} posted: ${postTitle}`,
    html,
  });
}
