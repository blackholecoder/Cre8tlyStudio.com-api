export function renderListHeadingBlock(block, landingPage) {
  const padding = block.padding || 20;
  const alignment = block.alignment || "left";

  const containerStyle =
    alignment === "center"
      ? "margin:0 auto;"
      : alignment === "right"
      ? "margin:0 0 0 auto;"
      : "margin:0 auto 0;";

  return `<p style="
    ${containerStyle}
    padding:${padding}px 24px;
    padding-bottom: 5px;
    font-weight:${landingPage.font_weight_label || 700};
    font-size:1.15rem;
    text-align:${alignment};
    color:${landingPage.font_color_p || "#FFFFFF"};
    max-width:700px;
    user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
  ">
    ${block.text || ""}
  </p>`;
}
