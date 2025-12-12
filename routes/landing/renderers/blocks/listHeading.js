export function renderListHeadingBlock(block, landingPage) {
  const padding = block.padding || 20;

  return `<p style="
    padding-bottom:${padding / 2}px;
    font-weight:${landingPage.font_weight_label || 700};
    font-size:1.15rem;
    text-align:${block.alignment || "left"};
    color:${landingPage.font_color_p || "#FFFFFF"};
    max-width:700px;
    margin:0 auto;
    user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
  ">
    ${block.text || ""}
  </p>`;
}
