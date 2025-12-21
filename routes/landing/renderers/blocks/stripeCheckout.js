export function renderStripeCheckoutBlock(block, landingPage) {
  const price = block.price || 10;
  const buttonText = block.button_text || "Buy & Download PDF";
  const buttonColor = block.button_color || "#10b981";
  const textColor = block.text_color || "#000";
  const alignment = block.alignment || "center";

  const productSource = block.product_source || "internal";

  return `
<div id="buy-now" style="
  text-align:${alignment};
  margin:20px auto 0 auto;
">
  <button 
    class="btn" 
    onclick="startSellerCheckout(
      '${landingPage.id}',
      '${block.id}',
      '${productSource}',
      '${landingPage.user_id}',
      ${Math.round(price * 100)}
    )"
    style="
      background:${buttonColor};
      color:${textColor};
      font-weight:700;
      padding:22px 36px;
      width:80%;
      max-width:340px;
      border-radius:8px;
      cursor:pointer;
      box-shadow:0 4px 12px rgba(0,0,0,0.3);
    "
  >
    ${buttonText}
  </button>

  <p style="
    margin-top:12px;
    color:#fff;
    font-size:0.9rem;
    text-align:${alignment};
  ">
    Price:
    <span style="font-weight:700;">
      $${(Number(price) || 10).toFixed(2)}
    </span>
  </p>
</div>
`;
}
