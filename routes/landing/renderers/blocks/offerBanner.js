export function renderOfferBannerBlock(block, landingPage) {
  const bannerBg = block.use_gradient
    ? `linear-gradient(${block.gradient_direction || "90deg"}, ${
        block.gradient_start || "#F285C3"
      }, ${block.gradient_end || "#7bed9f"})`
    : block.bg_color || "#F285C3";

  const buttonText = block.button_text || "Claim Offer";
  const offerType = block.offer_type || "free"; // "free" or "paid"

  const buttonHTML =
    offerType === "paid"
      ? `
<button 
  class="btn"
  style="background:${bannerBg};color:${
          block.button_text_color || "#fff"
        };font-weight:700;padding:14px 36px;border-radius:10px;"
  onclick="document.getElementById('buy-now').scrollIntoView({ behavior: 'smooth' })"
>
  ${buttonText}
</button>
`
      : `
<button 
  class="btn"
  style="background:${bannerBg};color:${
          block.button_text_color || "#fff"
        };font-weight:700;padding:14px 36px;border-radius:10px;"
  onclick="showEmailDownloadForm()"
>
  ${buttonText}
</button>
`;

  return `
<div style="
  background:${bannerBg};
  color:${block.text_color || "#fff"};
  padding:40px;
  text-align:center;
  border-radius:20px;
">
  <p style="
    font-size:1.5rem;
    font-weight:700;
    margin-bottom:20px;
  ">
    ${block.text || "🔥 Limited Time Offer!"}
  </p>
  ${buttonHTML}
</div>
`;
}
