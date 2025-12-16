export function renderSubheadingBlock(block, landingPage) {
  const paddingTop = block.paddingTop ?? 12;
  const alignment = block.alignment || "left";

  const containerStyle =
    alignment === "right" ? "margin:0 0 0 auto;" : "margin:0 auto;";

  return `<h2 style="
    display:block;
    width:100%;
    max-width:700px;
    ${containerStyle}
    padding-top:${paddingTop}px;
    padding-bottom:4px;
    text-align:${alignment};
    user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
  ">
    ${block.text || ""}
  </h2>`;
}
