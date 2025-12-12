export function renderCoverImage({ landingPage }) {
  if (!landingPage.cover_image_url) return "";

  return `
<div class="cover-wrapper"
     style="position:relative; user-select:none;"
     oncontextmenu="return false">

  <!-- 🔒 Invisible blocking layer -->
  <div style="
    position:absolute;
    top:0;
    left:0;
    width:100%;
    height:100%;
    z-index:3;
    pointer-events:none;
    background:rgba(0,0,0,0);
  "></div>

  <img
    src="${landingPage.cover_image_url}"
    alt="Cover"
    class="cover-image"
    draggable="false"
    style="pointer-events:none;"
  />
</div>
`;
}
