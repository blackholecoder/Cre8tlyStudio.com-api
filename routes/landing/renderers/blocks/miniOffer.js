// export function renderMiniOfferBlock(block, landingPage) {
//   if (!block) return "";

//   const textColor = block.text_color || "#ffffff";
//   const buttonTextColor = block.button_text_color || "#000000";

//   const price = Number(block.price || 0);

//   const imageSrc = block.use_pdf_cover
//     ? block.cover_url || block.image_url
//     : block.image_url || block.cover_url;

//   const rightBg = block.use_gradient
//     ? `linear-gradient(${block.gradient_direction || "135deg"},
//         ${block.gradient_start || "#a855f7"},
//         ${block.gradient_end || "#ec4899"})`
//     : block.bg_color || "#111827";

//   const fullPreviewText = (block.description || "").replace(/•/g, "");

//   // Split into words
//   const previewWords = fullPreviewText.trim().split(/\s+/);

//   // Check if longer than ~2 lines
//   const isLongPreview = previewWords.length > 20;

//   // ---------- IMAGE PANEL ----------
//   const imagePanelHTML = imageSrc
//     ? `
//      <div class="mini-offer-image" style="
//     flex: 0 0 300px;
//     height:300px;
//     overflow:hidden;
//     flex-shrink:0;
//     display:block;
//     border-radius:20px 0 0 20px;
//   ">
//   <img src="${imageSrc}" style="
//     width:100%;
//     height:100%;
//     object-fit:cover;
//     display:block;              /* removes unwanted gaps */
//     border-radius:20px 0 0 20px; /* ensure perfect clipping */
//   ">
// </div>

//     `
//     : `
//       <div style="
//         background:#000;
//         min-height:320px;
//         display:flex;
//         align-items:center;
//         justify-content:center;
//         color:rgba(255,255,255,0.4);
//         font-size:0.85rem;
//       ">
//         No Image
//       </div>
//     `;

//   const responsiveStyle = `
// <style>
// @media (max-width: 768px) {

//   /* wrapper stays full width */
//   .mini-offer-scale-wrap {
//     width: 100% !important;
//     display: flex !important;
//     justify-content: center !important;
//     overflow: visible !important;
//   }

//   /* this fixes the clipping — TRUE physical width on mobile */
//   .mini-offer-card {
//     width: 600px !important;   /* instead of 700px */
//     height: 300px !important;
//     transform: scale(0.90) !important;
//     transform-origin: top center !important;
//   }

//   /* image panel scales proportionally */
//   .mini-offer-image {
//     flex: 0 0 125px !important;
//   }

// }
// </style>

// `;

//   return `
// ${responsiveStyle}

// <!-- OUTER LAYOUT WRAPPER (no scaling here) -->
// <div style="
//   background: transparent;
//   padding:40px 20px;
//   margin-top:40px;
//   max-width:1100px;
//   margin-left:auto;
//   margin-right:auto;

// ">

//   <!-- SCALE WRAPPER (THIS is what gets transform: scale) -->
//   <div class="mini-offer-scale-wrap">

//     <!-- CARD (unchanged desktop layout) -->
//     <div class="mini-offer-card" style="
//       display:flex;
//       border-radius:20px;
//       overflow:hidden;
//       border:1px solid rgba(255,255,255,0.12);
//       box-shadow:0 25px 60px rgba(0,0,0,0.45);
//       width:700px;
//       height:300px;
//       margin-left:auto;
//       margin-right:auto;
//     ">

//       <!-- LEFT PANEL -->
//       ${imagePanelHTML}

//       <!-- RIGHT PANEL -->
// <div class="mini-offer-content" style="
//   flex:1;
//   height:100%;
//   background:${rightBg};
//   color:${textColor};
//   padding:24px 20px;

//   display:flex;
//   flex-direction:column;
//   box-sizing:border-box;

// ">

//   <!-- TOP STACK (content) -->
//   <div style="
//     width:100%;
//     display:flex;
//     flex-direction:column;
//   ">
//     <h1 style="
//       font-size:1.2rem;
//       font-weight:800;
//       margin-bottom:8px;
//     ">
//       ${block.title || "Offer Title"}
//     </h1>

//     <!-- PREVIEW WITH SEE MORE -->
//     <div style="
//       font-size:1rem;
//       line-height:1.5;
//       margin-bottom:14px;
//       color:${textColor};
//     ">
//       <span style="
//         display:-webkit-box;
//         -webkit-line-clamp:2;
//         -webkit-box-orient:vertical;
//         overflow:hidden;
//         text-overflow:ellipsis;
//       ">
//         ${fullPreviewText || " "}
//       </span>

//       ${
//         isLongPreview
//           ? `
//       <span
//         onclick="window.location.href='/preview/${landingPage.id}/${block.id}'"
//         style="
//           color:${textColor};
//           margin-top:4px;
//           font-weight:700;
//           text-decoration:underline;
//           cursor:pointer;
//           display:block;
//         "
//       >See more</span>
//       `
//           : ""
//       }
//     </div>

//   </div>

//   <!-- BOTTOM STACK (independent footer area holding only the button) -->
//   <div style="
//     width:100%;
//     margin-top:auto;
//   ">
//     <button
//       onclick="window.location.href='/preview/${landingPage.id}/${block.id}'"
//       style="
//         width:100%;
//         padding:14px;
//         border-radius:10px;
//         font-weight:700;
//         border:none;
//         cursor:pointer;
//         background:${block.button_color || "#22c55e"};
//         color:${buttonTextColor};
//         font-size:1.05rem;
//         transition:transform 0.2s ease;
//       "
//       onmouseover="this.style.transform='scale(1.04)'"
//       onmouseout="this.style.transform='scale(1)'"
//     >
//       ${block.button_text || "Buy Now"}
//     </button>
//     ${
//       price
//         ? `<div style="
//             font-size:1.05rem;
//             font-weight:300;
//             margin-top:10px;
//           ">
//             $${price.toFixed(2)}
//           </div>`
//         : ""
//     }
//   </div>

// </div>

//     </div>
//   </div>
// </div>
// `;
// }
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

  const fullPreviewText = (block.description || "").replace(/•/g, "");
  const isLongPreview = fullPreviewText.trim().split(/\s+/).length > 20;

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
          onclick="window.location.href='/preview/${landingPage.id}/${
    block.id
  }'"
          style="
            width:100%;
            max-width:260px;
            padding:14px;
            border-radius:10px;
            font-weight:700;
            border:none;
            cursor:pointer;
            background:${block.button_color || "#22c55e"};
            color:${buttonTextColor};
            font-size:1.05rem;
          "
        >
          ${block.button_text || "Buy Now"}
        </button>

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
