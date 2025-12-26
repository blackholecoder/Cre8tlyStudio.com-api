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
        ← Back
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

    <!-- DESCRIPTION -->
    <!-- DESCRIPTION -->
<div style="
  font-size:1.15rem;
  line-height:1.65;
  opacity:0.95;
  margin-bottom:24px;
  color:${textColor};
  padding:40px 20px;
  text-align:left;
  max-width:650px;
  margin-left:auto;
  margin-right:auto;
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


    <!-- PRICE -->
    

    <!-- BUY NOW BUTTON -->
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
        border-radius:10px;
        font-size:1.2rem;
        font-weight:700;
        cursor:pointer;
        margin-bottom:20px;
      "
    >
      ${block.button_text || "Buy Now"}
    </button>

    ${
      price > 0
        ? `
        <div style="
          font-size:1rem;
          font-weight:400;
          margin-bottom:20px;
          color:${textColor};
        ">
          $${price.toFixed(2)}
        </div>`
        : ""
    }

  </main>

  ${renderLegalFooter({ footerTextColor: "#ffffff" })}
  ${renderStripeCheckoutScript()}
  ${renderLandingAnalyticsScript({ landingPage })}

</body>
</html>
  `;
}
