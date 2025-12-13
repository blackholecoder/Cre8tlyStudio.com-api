export function renderSubheadingBlock(block, landingPage) {
  const paddingTop = block.paddingTop ?? 12;

  return `<h2 style="
    display:block;
    width:100%;
    max-width:700px;
    margin:0 auto;
    padding-top:${paddingTop}px;
    padding-bottom:4px;
    text-align:center;
    user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
  ">
    ${block.text || ""}
  </h2>`;
}
