export function renderSocialLinksBlock(block, landingPage) {
  const align = block.alignment || "center";
  const iconStyle = block.icon_style || "color";
  const iconColor = block.icon_color || "#ffffff";
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
  };

  const renderedIcons = Object.entries(links)
    .filter(([platform, url]) => url && iconSet[platform])
    .map(
      ([platform, url]) => `
<a href="${url}" target="_blank" rel="noopener noreferrer"
  style="
    display:inline-block;
    width:24px;
    height:24px;
    margin:0 10px;
    transition:transform 0.2s ease, opacity 0.2s ease;
    text-decoration:none;
  "
  onmouseover="this.style.transform='scale(1.1)';this.style.opacity='0.9';"
  onmouseout="this.style.transform='scale(1)';this.style.opacity='1';"
>
  <div
    style="
      width:100%;
      height:100%;
      -webkit-mask:url(${iconSet[platform]}) no-repeat center / contain;
      mask:url(${iconSet[platform]}) no-repeat center / contain;
      background-color:${iconStyle === "mono" ? "#ffffff" : iconColor};
      transition:transform 0.2s ease;
    "
  ></div>
</a>`
    )
    .join("");

  return `
<div style="
  text-align:${align};
  padding:40px 0 60px;
">
  ${renderedIcons}
</div>
`;
}
