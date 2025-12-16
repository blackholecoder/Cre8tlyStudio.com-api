export function renderSubsubheadingBlock(block, landingPage) {
  const padding = block.padding || 20;
  const paddingTop = block.paddingTop || 20;
  const alignment = block.alignment || "left";

  const containerStyle =
    alignment === "right" ? "margin:0 0 0 auto;" : "margin:0 auto;";

  return `<h3 style="
    display:block;
    width:100%;
    max-width:700px;
    ${containerStyle}
    padding-top:${paddingTop}px;
    padding-bottom:${padding}px;
    text-align:${alignment};
    user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
  ">
    ${block.text || ""}
  </h3>`;
}
