export function renderSpacerBlock(block) {
  const dividerHeight = block.height || 40;
  const dividerStyle = block.style || "line";
  const dividerColor = block.color || "rgba(255,255,255,0.2)";
  const dividerWidth = block.width || "60%";

  if (dividerStyle === "space") {
    return `<div style="height:${dividerHeight}px;"></div>`;
  }

  return `
    <hr style="
      border: none;
      border-top: 1px solid ${dividerColor};
      width: ${dividerWidth};
      margin: ${dividerHeight / 2}px auto;
      opacity: 0.6;
    " />
  `;
}
