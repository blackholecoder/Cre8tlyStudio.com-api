export function renderMiniOfferBlock(block, landingPage) {
  if (!block) return "";

  const textColor = block.text_color || "#ffffff";
  const buttonTextColor = block.button_text_color || "#000000";
  const price = Number(block.price || 0);

  const imageSrc = block.use_pdf_cover
    ? block.cover_url || block.image_url
    : block.image_url || block.cover_url;

  const rightBg = block.use_gradient
    ? `linear-gradient(${block.gradient_direction || "135deg"},
        ${block.gradient_start || "#a855f7"},
        ${block.gradient_end || "#ec4899"})`
    : block.bg_color || "#111827";

  const fullPreviewText = (
    block.offer_page?.blocks?.map((b) => b.text)?.join(" ") || ""
  ).replace(/•/g, "");

  const hasDescription = fullPreviewText.trim().length > 0;
  const isLongPreview =
    hasDescription && fullPreviewText.trim().split(/\s+/).length > 20;

  return `

  <style>
/* Desktop */
.mini-offer-card {
  display: flex;
}

.mini-offer-image {
  flex: 0 0 30%;
}

.mini-offer-content {
  flex: 1;
}

/* Mobile */
@media (max-width: 768px) {

  .mini-offer-card {
    height: auto !important;
    align-items: stretch;
  }

  /* 🔑 REMOVE Safari-breaking heights */
  .mini-offer-image,
  .mini-offer-content {
    height: auto !important;
  }

  /* give image a visible mobile height */
  .mini-offer-image {
    min-height: 180px;
  }

  /* breathing room for text */
  .mini-offer-content {
    padding-top: 32px;
    padding-bottom: 32px;
    justify-content: center;
  }
}
</style>





<div style="
  padding:40px 20px;
  max-width:1100px;
  margin:40px auto;
">

  <!-- CARD -->
  <div class="mini-offer-card" style="
    display:flex;
    width:100%;
    max-width:700px;
    height:300px;

    border-radius:20px;
    overflow:hidden;

    border:1px solid rgba(255,255,255,0.12);
    box-shadow:0 25px 60px rgba(0,0,0,0.45);
    background:${rightBg};
    margin:0 auto;
  ">

    <!-- LEFT: IMAGE (30%) -->
    <div class="mini-offer-image" style="
      flex-shrink:0;
      background:${rightBg};
    ">
      ${
        imageSrc
          ? `<img src="${imageSrc}" style="
              width:100%;
              height:100%;
              object-fit:cover;
              display:block;
            ">`
          : ""
      }
    </div>

    <!-- RIGHT: CONTENT (70%) -->
    <div class="mini-offer-content" style="
      padding:28px 32px;
      color:${textColor};

      display:flex;
      flex-direction:column;
      justify-content:center;
      box-sizing:border-box;
    ">

      <h1 style="
        font-size:1.2rem;
        font-weight:800;
        margin-bottom:10px;
      ">
        ${block.title || "Offer Title"}
      </h1>

      <div style="
        font-size:1rem;
        line-height:1.5;
        margin-bottom:14px;
        max-width:420px;
      ">
        <span style="
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          overflow:hidden;
          text-overflow:ellipsis;
        ">
          ${fullPreviewText || ""}
        </span>

        ${
          isLongPreview
            ? `<span
                onclick="window.location.href='/preview/${landingPage.id}/${block.id}'"
                style="
                  display:block;
                  margin-top:6px;
                  font-weight:700;
                  text-decoration:underline;
                  cursor:pointer;
                "
              >See more</span>`
            : ""
        }
      </div>

      <div style="margin-top:16px;">
  <button
    ${
      hasDescription
        ? `onclick="window.location.href='/preview/${landingPage.id}/${block.id}'"`
        : ""
    }
    style="
      width:100%;
      max-width:260px;
      padding:14px;
      border-radius:10px;
      font-weight:700;
      border:none;
      font-size:1.05rem;

      background:${block.button_color || "#22c55e"};
      color:${buttonTextColor};

      cursor:${hasDescription ? "pointer" : "not-allowed"};
      opacity:${hasDescription ? "1" : "0.6"};
    "
  >
    ${block.button_text || "Buy Now"}
  </button>

  ${
    !hasDescription
      ? `
  <div style="margin-top:6px;font-size:0.85rem;opacity:0.7;">
    Preview unavailable
  </div>
`
      : ""
  }

        ${
          price
            ? `<div style="
                margin-top:10px;
                font-size:1.05rem;
                font-weight:300;
              ">
                $${price.toFixed(2)}
              </div>`
            : ""
        }
      </div>

    </div>
  </div>
</div>
`;
}
