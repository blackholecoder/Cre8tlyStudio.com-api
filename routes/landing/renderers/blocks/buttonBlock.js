export function renderButtonBlock(block, landingPage) {
  if (!block.text) return "";

  const {
    text,
    url,
    open_new_tab = true,

    width = 220,
    height = 48,
    padding_x = 24,
    padding_y = 12,

    radius = 8,
    stroke_width = 0,
    stroke_color = "#000000",

    use_gradient = false,
    bg_color = "#22c55e",
    gradient_start = "#22c55e",
    gradient_end = "#3b82f6",
    gradient_direction = "90deg",

    text_color = "#000000",
    font_size = 16,
    font_weight = 600,

    // NEW SHADOW MODEL
    shadow_offset_x = 0,
    shadow_offset_y = 8,
    shadow_blur = 20,
    shadow_opacity = 35,
    shadow_color = "#000000",
  } = block;

  const background = use_gradient
    ? `linear-gradient(${gradient_direction}, ${gradient_start}, ${gradient_end})`
    : bg_color;

  const shadow = `${shadow_offset_x}px ${shadow_offset_y}px ${shadow_blur}px rgba(0,0,0,${
    shadow_opacity / 100
  })`;

  const targetAttr = open_new_tab
    ? `target="_blank" rel="noopener noreferrer"`
    : "";

  return `
<div style="
  display:flex;
  justify-content:center;
  margin:40px auto;
">
  <a
    href="${url || "#"}"
    ${targetAttr}
    style="
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:${width}px;
      height:${height}px;
      padding:${padding_y}px ${padding_x}px;
      background:${background};
      color:${text_color};
      font-size:${font_size}px;
      font-weight:${font_weight};
      text-decoration:none;
      border-radius:${radius}px;
      border:${stroke_width}px solid ${stroke_color};
      box-shadow:${shadow};
      cursor:pointer;
      transition:opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
    "
    onmouseover="this.style.opacity='0.9'"
    onmouseout="this.style.opacity='1'"
  >
    ${text}
  </a>
</div>
`;
}
