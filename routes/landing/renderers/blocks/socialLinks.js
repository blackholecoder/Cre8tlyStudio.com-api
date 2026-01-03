// export function renderSocialLinksBlock(block, landingPage) {
//   const align = block.alignment || "center";
//   const iconStyle = block.icon_style || "color";
//   const iconColor = block.icon_color || "#ffffff";
//   const showBorders = !!block.show_borders && iconStyle === "mono";
//   const links = block.links || {};

//   const iconSet = {
//     instagram:
//       "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/instagram.svg",
//     threads:
//       "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/threads.svg",
//     twitter:
//       "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg",
//     youtube:
//       "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg",
//     linkedin:
//       "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/linkedin.svg",
//     facebook:
//       "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/facebook.svg",
//     tiktok:
//       "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/tiktok.svg",
//     pinterest:
//       "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/pinterest.svg",
//     substack:
//       "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/substack.svg",
//   };

//   const renderedIcons = Object.entries(links)
//     .filter(([platform, url]) => url && iconSet[platform])
//     .map(([platform, url]) => {
//       const color = iconStyle === "mono" ? "rgba(255,255,255,0.75)" : iconColor;

//       return `
// <a href="${url}" target="_blank" rel="noopener noreferrer"
//   style="
//     display:inline-flex;
//     align-items:center;
//     justify-content:center;
//     width:${showBorders ? "34px" : "26px"};
//     height:${showBorders ? "34px" : "26px"};
//     margin:0 10px;
//     border-radius:${showBorders ? "10px" : "0"};
//     border:${showBorders ? `1.25px solid ${color}` : "none"};
//     transition:transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease;
//     text-decoration:none;
//   "
//   onmouseover="this.style.transform='scale(1.1)';this.style.opacity='0.9';this.style.boxShadow='0 0 12px rgba(255,255,255,0.35)';"
//   onmouseout="this.style.transform='scale(1)';this.style.opacity='1';this.style.boxShadow='none';"
// >
//   <div
//     style="
//       width:20px;
//       height:20px;
//       -webkit-mask:url(${iconSet[platform]}) no-repeat center / contain;
//       mask:url(${iconSet[platform]}) no-repeat center / contain;
//       background-color:${color};
//     "
//   ></div>
// </a>`;
//     })
//     .join("");

//   return `
// <div style="
//   text-align:${align};
//   padding:40px 0 60px;
// ">
//   ${renderedIcons}
// </div>
// `;
// }

export function renderSocialLinksBlock(block, landingPage) {
  const align = block.alignment || "center";
  const iconStyle = block.icon_style || "color";
  const iconColor = block.icon_color || "#ffffff";
  const showBorders = !!block.show_borders && iconStyle === "mono";
  const links = block.links || {};

  const iconSet = {
    instagram:
      "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/instagram.svg",
    threads:
      "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/threads.svg",
    twitter:
      "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg",
    youtube:
      "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg",
    linkedin:
      "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/linkedin.svg",
    facebook:
      "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/facebook.svg",
    tiktok:
      "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/tiktok.svg",
    pinterest:
      "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/pinterest.svg",
    substack:
      "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/substack.svg",
  };

  const color = iconStyle === "mono" ? "rgba(255,255,255,0.75)" : iconColor;

  const renderedIcons = Object.entries(links)
    .filter(([platform, url]) => url && iconSet[platform])
    .map(
      ([platform, url]) => `
<a href="${url}" target="_blank" rel="noopener noreferrer" class="social-icon"
  style="
    display:flex;
    align-items:center;
    justify-content:center;
    width:${showBorders ? "34px" : "26px"};
    height:${showBorders ? "34px" : "26px"};
    border-radius:${showBorders ? "10px" : "0"};
    border:${showBorders ? `1.25px solid ${color}` : "none"};
    text-decoration:none;
    transition:transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease;
  "
  onmouseover="this.style.transform='scale(1.1)';this.style.opacity='0.9';this.style.boxShadow='0 0 12px rgba(255,255,255,0.35)';"
  onmouseout="this.style.transform='scale(1)';this.style.opacity='1';this.style.boxShadow='none';"
>
  <div
    style="
      width:20px;
      height:20px;
      -webkit-mask:url(${iconSet[platform]}) no-repeat center / contain;
      mask:url(${iconSet[platform]}) no-repeat center / contain;
      background-color:${color};
    "
  ></div>
</a>`
    )
    .join("");

  return `
<style>
@media (max-width: 480px) {
  .social-links-row {
    gap:12px !important;
  }
  .social-icon {
    width:${showBorders ? "28px" : "22px"} !important;
    height:${showBorders ? "28px" : "22px"} !important;
    border-radius:${showBorders ? "8px" : "0"} !important;
  }
}
</style>

<div
  class="social-links-row"
  style="
    display:flex;
    justify-content:${
      align === "center"
        ? "center"
        : align === "right"
        ? "flex-end"
        : "flex-start"
    };
    gap:16px;
    flex-wrap:wrap;
    margin:40px 0 60px;
  "
>
  ${renderedIcons}
</div>
`;
}
