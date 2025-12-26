export function renderOfferCard(children, offerBg) {
  return `
    <div style="
      max-width:620px;
      opacity:0.9;
      margin:24px auto 0;
      padding:28px;
      background:${offerBg};
      border:1px solid rgba(255,255,255,0.12);
      border-radius:18px;
    ">
      ${children}
    </div>
  `;
}
