export function renderParagraphBlock(block, landingPage) {
  const padding = block.padding || 20;
  const alignment = block.alignment || "left";
  const lines = (block.text || "").split(/\n/);
  const hasBullets = lines.some((line) => line.trim().startsWith("•"));

  const labelLine =
    lines[0] && !lines[0].trim().startsWith("•") ? lines[0] : null;

  const contentLines = labelLine ? lines.slice(1) : lines;

  const containerStyle =
    alignment === "center"
      ? "margin:0 auto;"
      : alignment === "right"
      ? "margin:0 0 0 auto;"
      : "margin:0 auto 0 0;";

  // ✅ Explicit bullet list
  if (block.bulleted) {
    const listItems = lines
      .filter((line) => line.trim() !== "")
      .map(
        (line) =>
          `<li style="margin-bottom:0.35rem;">
      ${line.replace(/^•\s*/, "")}
    </li>`
      )
      .join("");

    return `
<div style="
  max-width:700px;
  ${containerStyle}
  padding-bottom:${padding}px;
  line-height:1.8;

">
  <ul style="
    list-style: disc;
    padding-left:1.25rem;
    margin:0;
    text-align:left;
    color:${landingPage.font_color_p || rgba(255, 255, 255, 0.92)};
    line-height:1.8;
    user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
  ">
    ${listItems}
  </ul>
</div>
`;
  }

  // 🟡 Auto-detect legacy bullets
  if (hasBullets) {
    return `
<div style="
  max-width:700px;
  ${containerStyle}
  padding-bottom:${padding}px;
  text-align:left;
  line-height:1.8;
  user-select:none;
  -webkit-user-select:none;
  -ms-user-select:none;
">
  ${
    labelLine
      ? `<p style="
          font-weight:${landingPage.font_weight_label || 600};
          font-size:1.15rem;
          margin-bottom:6px;
          color:${landingPage.font_color_p || rgba(255, 255, 255, 0.92)};
          user-select:none;
          -webkit-user-select:none;
          -ms-user-select:none;
        ">${labelLine}</p>`
      : ""
  }
  <ul style="
    list-style: disc;
    padding-left:1.5rem;
    color:${landingPage.font_color_p || rgba(255, 255, 255, 0.92)};
  ">
    ${contentLines
      .map((line) =>
        line.trim().startsWith("•")
          ? `<li>${line.replace(/^•\s*/, "")}</li>`
          : ""
      )
      .join("")}
  </ul>
</div>
`;
  }

  // 🧾 Normal paragraph fallback
  return `<p style="
    padding-bottom:${padding}px;
    white-space:pre-line;
    text-align:${block.alignment || "left"};
    max-width:700px;
    margin:0 auto;
    line-height:1.8;
    color:${landingPage.font_color_p || rgba(255, 255, 255, 0.92)};
    user-select:none;
    -webkit-user-select:none;
    -ms-user-select:none;
  ">
    ${block.text}
  </p>`;
}
