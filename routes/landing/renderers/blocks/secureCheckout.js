export function renderSecureCheckoutBlock(block) {
  const title = block.title || "Secure Checkout";
  const subtext = block.subtext || "";
  const trust = block.trust_items || [];
  const guarantee = block.guarantee || "";
  const badge = block.payment_badge || "";

  const trustHTML = trust
    .map((item) => {
      return `
        <li style="
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          margin:4px 0;
          color:#ffffff;
          font-size:1rem;
          list-style:none;
          user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
        ">
          <span style="color:#22c55e;font-weight:700;">✔</span>
          <span>${item}</span>
        </li>
      `;
    })
    .join("");

  return `
    <div style="
      width:100%;
      text-align:center;
      margin:20px auto 6px auto;
    ">

      <!-- TITLE -->
      <h2 style="
        font-size:1rem;
        font-weight:700;
        color:white;
        margin-bottom:2px;
        display:flex;
        justify-content:center;
        align-items:center;
        gap:10px;
        user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
      ">
        <span style="color:#f1c40f;">🔒</span>
        ${title}
      </h2>

      <!-- SUBTEXT -->
      ${
        subtext
          ? `
        <p style="
          color:rgba(255,255,255,0.75);
          font-size:1rem;
          max-width:600px;
          margin:0 auto 14px auto;
          line-height:1.5;
          user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
        ">
          ${subtext}
        </p>
        `
          : ""
      }

      <!-- TRUST ITEMS -->
      ${
        trust.length
          ? `
      <ul style="margin:14px auto; padding:0; max-width:400px;
      user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
      ">
        ${trustHTML}
      </ul>
      `
          : ""
      }

      <!-- GUARANTEE -->
      ${
        guarantee
          ? `
      <p style="
        margin-top:8px;
        color:rgba(255,255,255,0.7);
        font-size:0.9rem;
        user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
      ">
        ${guarantee}
      </p>
      `
          : ""
      }

      <!-- PAYMENT BADGE -->
      ${
        badge
          ? `
      <div style="margin-top:16px;">
        <img 
          src="${badge}" 
          style="width:150px;opacity:0.85;
          user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
          "
        />
      </div>
      `
          : ""
      }

    </div>
  `;
}
