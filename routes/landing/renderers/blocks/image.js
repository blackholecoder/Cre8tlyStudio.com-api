export function renderImageBlock(block) {
  const {
    image_url,
    caption = "",
    padding = 20,
    alignment = "center",
    full_width = false,
    width = 100,
    radius = 0,
    shadow = false,
    shadow_color = "rgba(0,0,0,0.5)",
    shadow_depth = 25,
    shadow_offset = 10,
    shadow_angle = 135,
  } = block;

  if (!image_url) return "";

  const angleRad = (shadow_angle * Math.PI) / 180;
  const offsetX = Math.round(Math.cos(angleRad) * shadow_offset);
  const offsetY = Math.round(Math.sin(angleRad) * shadow_offset);

  return `
<div style="
  text-align:${alignment};
  padding:${padding}px 0;
  margin:40px 0;
  position:relative;
  user-select:none;
" oncontextmenu="return false">

  <!-- 🔒 Anti-save overlay -->
  <div style="
    position:absolute;
    top:0;
    left:0;
    width:100%;
    height:100%;
    z-index:3;
    background:rgba(0,0,0,0);
    pointer-events:none;
  "></div>

  <img 
    src="${image_url}" 
    alt="Landing Image"
    draggable="false"
    style="
      padding-top:20px;
      max-width:${full_width ? "100%" : width + "%"};
      width:100%;
      height:auto;
      display:block;
      margin:0 auto;
      border-radius:${radius}px;
      box-shadow:${
        shadow
          ? `${offsetX}px ${offsetY}px ${shadow_depth}px ${shadow_color}`
          : "none"
      };
      transition:box-shadow 0.3s ease;
      pointer-events:none;
    "
  />

  ${
    caption
      ? `<p style="
          margin-top:12px;
          color:#ccc;
          font-size:0.95rem;
          font-style:italic;
          text-align:${alignment};
          user-select:none;
        ">${caption}</p>`
      : ""
  }
</div>
`;
}
