import { renderHead } from "./renderHead.js";
import { renderHeader } from "./renderHeader.js";
import { renderLegalFooter } from "./renderLegalFooter.js";
import { renderStripeCheckoutScript } from "../scripts/renderStripeCheckoutScript.js";
import { renderLandingAnalyticsScript } from "../scripts/renderLandingAnalyticsScript.js";

export function renderOfferPreviewPage({
  landingPage,
  block,
  mainOverlayColor,
}) {
  const description = block.description || "";
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
          padding:6px 14px;
          background:#000;
          color:#fff;
          border:solid;
          border-color: #fefefe
          border-radius:8px;
          font-size:0.9rem;
          font-weight:500;
          cursor:pointer;
          width:auto;
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
  Instant access · Secure checkout · Download included
</p>

<p style="
  font-size:0.9rem;
  opacity:0.75;
  text-align:center;
  max-width:520px;
  margin:0 auto 24px auto;
">
  Designed to give you immediate, actionable insights.
</p>

<h3 style="
  font-size:1.25rem;
  font-weight:700;
  margin-bottom:12px;
  color:${textColor};
">
  Product details
</h3>

    <!-- DESCRIPTION -->
<div style="
  font-size:1rem;
  line-height:1.6;
  opacity:0.9;
  margin-bottom:24px;
  color:${textColor};
  padding:24px;
  text-align:left;
  max-width:620px;
  margin-left:auto;
  margin-right:auto;
  white-space:pre-wrap;
  background:rgba(0,0,0,0.25);
  border:1px solid rgba(255,255,255,0.12);
  border-radius:12px;
  white-space:pre-wrap;
">
  ${
    block.description_type === "bullets"
      ? `<ul style="
            padding-left:22px;
            margin:0;
          ">
          ${description
            .split("\n")
            .filter(Boolean)
            .map(
              (line) =>
                `<li style="margin-bottom:10px;">
                  ${line.replace(/^[•*-]\s*/, "")}
                </li>`
            )
            .join("")}
        </ul>`
      : description
  }

</div>

    

   <!-- PURCHASE BOX -->
<div style="
max-width:620px;
  margin:32px auto 0 auto;
  padding:24px;
  background:rgba(0,0,0,0.35);
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
        margin-bottom:6px;
        color:${textColor};
      ">
        $${price.toFixed(2)}
      </div>
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
        margin-bottom:18px;
        color:${textColor};
      ">
        Free Download
      </div>
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

  <div style="
    margin-top:12px;
    font-size:0.8rem;
    opacity:0.7;
    color:${textColor};
  ">
    Secure Stripe checkout · Instant digital delivery
  </div>
</div>


  </main>

  ${renderLegalFooter({ footerTextColor: "#ffffff" })}
  ${renderStripeCheckoutScript()}
  ${renderLandingAnalyticsScript({ landingPage })}

</body>
</html>
  `;
}
