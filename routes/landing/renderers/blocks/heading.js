export function renderHeadingBlock(block, landingPage) {
  const paddingTop = block.paddingTop ?? 14;

  return `<h1 style="
    display:block;
    width:100%;
    max-width:700px;
    margin:0 auto;
    padding-top:${paddingTop}px;
    padding-bottom:6px;
    text-align:center;
    user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
  ">
    ${block.text || ""}
  </h1>`;
}
