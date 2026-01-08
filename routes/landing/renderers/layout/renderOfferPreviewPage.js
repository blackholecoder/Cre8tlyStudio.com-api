import { renderHead } from "./renderHead.js";
import { renderHeader } from "./renderHeader.js";
import { renderLegalFooter } from "./renderLegalFooter.js";
import { renderStripeCheckoutScript } from "../scripts/renderStripeCheckoutScript.js";
import { renderLandingAnalyticsScript } from "../scripts/renderLandingAnalyticsScript.js";
import { renderOfferPageAdvanced } from "./offerPage/renderOfferPageAdvanced.js";
import { renderTrustItems } from "./offerPage/renderOfferTrustItems.js";

export function renderOfferPreviewPage({
  landingPage,
  block,
  mainOverlayColor,
}) {
  const pageCount =
    block.page_count !== null && block.page_count !== undefined
      ? Number(block.page_count)
      : null;

  const offerBg = block.use_gradient
    ? `linear-gradient(${block.gradient_direction || "135deg"},
        ${block.gradient_start || "#a855f7"},
        ${block.gradient_end || "#ec4899"})`
    : block.bg_color || "#111827";

  const productSource = block.product_source || "internal";

  const imageSrc =
    block.image_url || block.cover_url || block.pdf_cover_image || "";

  const textColor = block.text_color || "#ffffff";
  const buttonTextColor = block.button_text_color || "#000000";

  const price = Number(block.price || 0);
  const priceCents = Math.round(price * 100);

  return `
<!DOCTYPE html>
<html lang="en">

${renderHead({
  title: block.title || "Offer Preview",
  font: landingPage.font || "Montserrat",
  bg: landingPage.bg_theme,
  mainOverlayColor,
  landingPage,
})}

<body style="margin:0;padding:0;">

  ${renderHeader({ landingPage })}

  <main style="padding:20px;max-width:900px;margin:0 auto;">

  <!-- TOP BACK BUTTON -->
    <div style="width:100%; display:flex; justify-content:flex-start; margin-bottom:20px;">
      <button
  onclick="window.history.back()"
  style="
    display:inline-flex;
    align-items:center;
    gap:6px;
    background:transparent;
    border:none;
    color:${textColor};
    font-size:0.9rem;
    font-weight:600;
    opacity:0.85;
    cursor:pointer;
    padding:6px 0;
  "
>
  ← Back to offers
</button>
    </div>


    <!-- HERO BANNER -->
    ${
      imageSrc
        ? `
      <div style="
        width:100%;
        height:auto;
        overflow:hidden;
        border-radius:12px;
        margin-bottom:24px;
      ">
        <img src="${imageSrc}" 
             style="width:100%;height:100%;object-fit:cover;" />
      </div>`
        : ""
    }

    <!-- TITLE -->
    <h1 style="
      font-size:2.2rem;
      font-weight:800;
      margin-bottom:16px;
      color:${textColor};
    ">
      ${block.title || ""}
    </h1>

    <p style="
  font-size:1rem;
  opacity:0.85;
  margin:0 auto 24px auto;
  color:${textColor};
  text-align:center;
  max-width:620px;
">
  Instant access · Secure checkout · <br/>Download included
</p>


${renderOfferPageAdvanced(block.offer_page, textColor, offerBg)}

    

   <!-- PURCHASE BOX -->
<div style="
max-width:620px;
  margin:32px auto 0 auto;
  padding:24px;
  background:${offerBg};
  border:1px solid rgba(255,255,255,0.15);
  border-radius:16px;
  text-align:center;
">

  ${
    price > 0
      ? `
    <div style="
      font-size:2rem;
      font-weight:800;
      margin-bottom:4px;
      color:${textColor};
    ">
      $${price.toFixed(2)}
    </div>

    ${
      pageCount
        ? `
        <div style="
          font-size:0.9rem;
          opacity:0.85;
          margin-bottom:6px;
          color:${textColor};
          font-weight:600;
        ">
          ${pageCount} page PDF
        </div>
        `
        : ""
    }

    <div style="
      font-size:0.9rem;
      opacity:0.75;
      margin-bottom:18px;
      color:${textColor};
    ">
      One time payment · No subscription
    </div>
    `
      : `
    <div style="
      font-size:1.4rem;
      font-weight:700;
      margin-bottom:6px;
      color:${textColor};
    ">
      Free Download
    </div>

    ${
      pageCount
        ? `
        <div style="
          font-size:0.9rem;
          opacity:0.75;
          margin-bottom:18px;
          color:${textColor};
        ">
          ${pageCount} page PDF
        </div>
        `
        : ""
    }
    `
  }


  <button
    onclick="startSellerCheckout(
      '${landingPage.id}',
      '${block.id}',
      '${productSource}',
      '${landingPage.user_id}',
      ${priceCents}
    )"
    style="
      width:100%;
      padding:16px;
      background:${block.button_color || "#22c55e"};
      color:${buttonTextColor};
      border:none;
      border-radius:12px;
      font-size:1.25rem;
      font-weight:800;
      cursor:pointer;
    "
  >
    ${block.button_text || "Buy Now"}
  </button>
  ${renderTrustItems(block.offer_page?.trust_items, textColor)}
</div>


  </main>

  ${renderLegalFooter({ footerTextColor: "#ffffff" })}
  ${renderStripeCheckoutScript()}
  ${renderLandingAnalyticsScript({ landingPage })}

</body>
</html>
  `;
}
