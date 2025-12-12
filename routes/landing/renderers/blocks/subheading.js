export function renderSubheadingBlock(block, landingPage) {
  const padding = block.padding || 20;

  return `<h2 style="
    padding-bottom:${padding}px;
    user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
  ">
    ${block.text || ""}
  </h2>`;
}
