export function renderFeatureOffers3Block(block, landingPage) {
  const bg = block.use_no_bg
    ? "transparent"
    : block.use_gradient
    ? `linear-gradient(${block.gradient_direction || "90deg"}, ${
        block.gradient_start || "#F285C3"
      }, ${block.gradient_end || "#7bed9f"})`
    : block.match_main_bg
    ? mainOverlayColor
    : block.bg_color || "rgba(0,0,0,0.3)";

  const buttonTextColor = block.button_text_color || "#000000";

  const cardsHTML = (block.items || [])
    .map((item) => {
      const price = Number(item.price || 0);
      const priceCents = Math.round(price * 100);

      // PRIORITY: PDF cover → uploaded image → nothing
      let imageSrc = "";

      if (item.use_pdf_cover && item.cover_url) {
        imageSrc = item.cover_url;
      } else if (item.image_url) {
        imageSrc = item.image_url;
      } else if (item.cover_url) {
        imageSrc = item.cover_url;
      }

      let imageHTML = "";

      if (imageSrc) {
        imageHTML = `
    <div style="
      width: 100%;
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
      flex: 0 0 auto;
    ">
      <img src="${imageSrc}" style="
        width: 100%;
        max-width: 350px;
        border-radius: 12px;
      " />
    </div>
  `;
      } else {
        imageHTML = `
    <div style="
      width:100%;
      height:160px;
      background:rgba(255,255,255,0.05);
      border-radius:12px;
      margin-bottom:16px;
      display:flex;
      align-items:center;
      justify-content:center;
      color:rgba(255,255,255,0.4);
      font-size:0.85rem;
    ">
      No Image
    </div>
  `;
      }

      const pdfUrl = item.pdf_url || "";

      return `
  <div style="
    background: rgba(0,0,0,0.45);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 16px;
    padding: 28px 28px 36px;
    text-align: center;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    height: 100%;
  ">

    ${imageHTML}

    <div style="
      flex: 1 0 auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    ">
      <h3 style="
        color:white;
        font-size:1.25rem;
        font-weight:700;
      ">
        ${item.title || "Offer Title"}
      </h3>

      <p style="
        color:rgba(255,255,255,0.75);
        font-size:0.95rem;
      ">
        ${item.text || ""}
      </p>

      ${
        price
          ? `<p style="
               color:white;
               font-weight:800;
               font-size:1.3rem;
             ">$${price.toFixed(2)}</p>`
          : ""
      }
    </div>

    <button 
      onclick="startSellerCheckout(
        '${landingPage.id}',
        '${landingPage.user_id}',
        '${pdfUrl}',
        ${priceCents}
      )"
      style="
        margin-top: 18px;
        align-self: center;
        padding:12px 30px;
        border-radius:8px;
        font-weight:700;
        border:none;
        cursor:pointer;
        background:${item.button_color || "#22c55e"};
        color:${buttonTextColor};
        font-size:1rem;
      "
    >
      ${item.button_text || "Buy Now"}
    </button>
  </div>
`;
    })
    .join("");

  return `
    <div style="
      background:${bg};
      padding:40px 40px;
      border-radius:20px;
      margin-top:40px;
      max-width:1100px;
      margin-left:auto;
      margin-right:auto;
    ">
      <div style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(320px,1fr));
        gap:24px;
      ">
        ${cardsHTML}
      </div>
    </div>
  `;
}
