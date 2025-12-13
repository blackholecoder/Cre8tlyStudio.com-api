export function renderSubsubheadingBlock(block, landingPage) {
  const padding = block.padding || 20;
  const paddingTop = block.paddingTop || 20;

  return `<h3 style="
  padding-top:${paddingTop}px;
    padding-bottom:${padding}px;
    user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
  ">
    ${block.text || ""}
  </h3>`;
}
