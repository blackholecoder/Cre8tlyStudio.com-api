export function renderHeadingBlock(block, landingPage) {
  const padding = block.padding || 20;

  return `<h1 style="
    padding-bottom:${padding}px;
    user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
  ">
    ${block.text || ""}
  </h1>`;
}
