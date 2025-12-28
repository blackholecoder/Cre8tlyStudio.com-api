export function renderOfferBannerBlock(block, ctx = {}) {
  const { mainOverlayColor, hasStripeCheckout } = ctx;

  const bannerBg = block.match_main_bg
    ? mainOverlayColor
    : block.use_gradient
    ? `linear-gradient(${block.gradient_direction || "90deg"}, ${
        block.gradient_start || "#F285C3"
      }, ${block.gradient_end || "#7bed9f"})`
    : block.bg_color || "#F285C3";

  const shouldShowButton =
    (block.offer_type === "paid" && hasStripeCheckout) ||
    block.offer_type !== "paid";

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
 onclick="
  const el = document.getElementById('buy-now');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
"
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
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:${shouldShowButton ? "flex-start" : "center"};
">
  <p style="
    font-size:1.5rem;
    font-weight:700;
    margin-bottom:${shouldShowButton ? "20px" : "0"};
  ">
    ${block.text || "🔥 Limited Time Offer!"}
  </p>
  ${shouldShowButton ? buttonHTML : ""}
</div>
`;
}
