export function renderSingleOfferBlock(block, landingPage) {
  if (!block) return "";

  const textColor = block.text_color || "#ffffff";
  const buttonTextColor = block.button_text_color || "#000000";

  const price = Number(block.price || 0);
  const priceCents = Math.round(price * 100);

  const productSource = block.product_source || "internal";

  const imageSrc = block.use_pdf_cover
    ? block.cover_url || block.image_url
    : block.image_url || block.cover_url;

  const fullPreviewText =
    block.use_long_description && block.long_text
      ? block.long_text.replace(/•/g, "")
      : block.text || "";

  const previewWords = fullPreviewText.trim().split(/\s+/);
  const isLongPreview = previewWords.length > 50; // 5 lines ≈ 50 words

  const imageHTML = imageSrc
    ? `
    <div style="
      width:100%;
      height:250px;
      margin-bottom:16px;
      margin-top:16px;
      border-radius:12px;
      display:flex;
      justify-content:center;
      align-items:center;
    ">
      <img
        src="${imageSrc}"
        style="
          width:100%;
          height:100%;
          object-fit:cover;
          display:block;
        "
      />
    </div>
  `
    : ``;

  let longDescriptionHTML = "";
  if (block.use_long_description && block.long_text) {
    if (block.description_type === "bullets") {
      longDescriptionHTML = `
        <ul style="
          text-align:left;
          margin-top:12px;
          margin-bottom:16px;
          padding-left:18px;
          color:${textColor};
          font-size:0.95rem;
        ">
          ${block.long_text
            .split("\n")
            .filter(Boolean)
            .map(
              (line) =>
                `<li style="margin-bottom:6px">${line.replace(
                  /^•\s*/,
                  ""
                )}</li>`
            )
            .join("")}
        </ul>`;
    } else {
      longDescriptionHTML = `
        <div style="
          margin-top:16px;
          margin-bottom:16px;
          color:${textColor};
          font-size:0.95rem;
          line-height:1.8;
          text-align:left;
          opacity:0.9;
        ">
          ${block.long_text}
        </div>`;
    }
  }

  const cardHTML = `
    <div style="
      background:rgba(0,0,0,0.45);
      border:1px solid rgba(255,255,255,0.12);
      border-radius:16px;
      padding:28px;
      display:flex;
      flex-direction:column;
      color:${textColor};
      width:${block.card_width ? `${block.card_width}px` : "500px"};
      height:${
        block.card_height === "auto"
          ? "auto"
          : block.card_height
          ? `${block.card_height}px`
          : "auto"
      };
      overflow:${block.card_height === "auto" ? "visible" : "auto"};
    ">

      ${imageHTML}

      <h3 style="
        font-size:1.25rem;
        font-weight:700;
        margin-bottom:8px;
      ">
        ${block.title || "Offer"}
      </h3>

      <!-- MATCH MINI OFFER STYLE BUT WITH 5 LINES -->
<!-- MATCH MINI OFFER STYLE BUT WITH 5 LINES -->
<div style="
  font-size:1rem;
  line-height:1.5;
  margin-bottom:14px;
  color:${textColor};
  width:100%;
  position:relative;
  text-align:left;
">

  <!-- Clamp to 5 lines -->
  <span style="
    display:-webkit-box;
    -webkit-line-clamp:5;
    -webkit-box-orient:vertical;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:pre-wrap;
  ">
    ${fullPreviewText}
  </span>

  ${
    isLongPreview
      ? `
      <button 
        onclick="window.location.href='/preview/${landingPage.id}/${block.id}'"
        style="
          background:none;
          border:none;
          margin:6px auto 0;
          padding:0;
          margin-top:6px;
          color:${textColor};
          font-weight:700;
          text-decoration:underline;
          cursor:pointer;
          display:block;
        "
      >
        See more
      </button>
      `
      : ""
  }
</div>



      ${
        price
          ? `<p style="
               font-size:1.3rem;
               font-weight:800;
               margin-bottom:16px;
               margin-top:16px;
             ">
               $${price.toFixed(2)}
             </p>`
          : ""
      }

      <div style="
  margin-top:auto;
  display:flex;
  justify-content:center;
">
  <button
   onclick="window.location.href='/preview/${landingPage.id}/${block.id}'"
    style="
      width: 100%;
      padding:14px 0;
      border-radius:8px;
      font-weight:700;
      border:none;
      cursor:pointer;
      background:${block.button_color || "#22c55e"};
      color:${buttonTextColor};
      font-size:1rem;
      
    "
  >
    ${block.button_text || "Buy Now"}
  </button>
</div>
 </div>

  `;

  return `
    <div style="
      padding:40px 20px;
      margin-top:40px;
      max-width:1100px;
      margin-left:auto;
      margin-right:auto;
    ">
      <div style="display:flex;justify-content:center">
        ${cardHTML}
      </div>
    </div>
  `;
}
