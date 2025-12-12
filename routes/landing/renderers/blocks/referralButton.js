export function renderReferralButtonBlock(block, landingPage) {
  const buttonText = block.button_text || "Sign Up Now";
  const buttonColor = block.button_color || "#10b981";
  const textColor = block.text_color || "#000";
  const alignment = block.alignment || "center";

  const referralUrl = `https://cre8tlystudio.com/r/${landingPage.slug}`;

  return `
<div style="
  text-align:${alignment};
  margin:60px auto;
">
  <a 
    href="${referralUrl}"
    target="_blank"
    rel="noopener noreferrer"
    class="btn"
    style="
      display:inline-block;
      background:${buttonColor};
      color:${textColor};
      font-weight:700;
      padding:14px 36px;
      border-radius:8px;
      text-decoration:none;
      cursor:pointer;
      box-shadow:0 4px 12px rgba(0,0,0,0.3);
      transition:transform 0.2s ease, box-shadow 0.3s ease;
    "
    onmouseover="this.style.transform='scale(1.05)';this.style.boxShadow='0 6px 18px rgba(0,0,0,0.4)';"
    onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)';"
  >
    ${buttonText}
  </a>

  <p style="
    margin-top:12px;
    color:#aaa;
    font-size:0.9rem;
    text-align:${alignment};
  ">
  </p>
</div>
`;
}
