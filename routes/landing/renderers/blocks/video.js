export function renderVideoBlock(block, landingPage) {
  const videoPadding = block.padding || 20;
  const videoUrl = block.url || "";
  const caption = block.caption || "";
  const autoplay = block.autoplay ? "autoplay" : "";
  const loop = block.loop ? "loop" : "";
  const muted = block.muted ? "muted" : "";

  if (!videoUrl) return "";

  let embedHTML = "";

  if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
    embedHTML = `<iframe 
      src="${videoUrl.replace("watch?v=", "embed/")}" 
      title="YouTube video" 
      style="width:100%;aspect-ratio:16/9;border:none;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.35);" 
      allow="autoplay; fullscreen"
      allowfullscreen
    ></iframe>`;
  } else if (videoUrl.includes("vimeo.com")) {
    embedHTML = `<iframe 
      src="${videoUrl.replace("vimeo.com", "player.vimeo.com/video")}" 
      title="Vimeo video" 
      style="width:100%;aspect-ratio:16/9;border:none;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.35);" 
      allow="autoplay; fullscreen"
      allowfullscreen
    ></iframe>`;
  } else {
    embedHTML = `<video 
      src="${videoUrl}" 
      ${autoplay} ${loop} ${muted} 
      controls 
      style="width:100%;max-width:800px;display:block;margin:0 auto;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.35);" 
    ></video>`;
  }

  return `
<div style="
  text-align:center;
  padding-bottom:${videoPadding}px;
  margin-top:40px;
">
  ${
    caption
      ? `<p style="
          margin-bottom:16px;
          font-size:1.1rem;
          color:${landingPage.font_color_h1 || "#FFFFFF"};
          font-weight:700;
          text-transform:uppercase;
          text-align:center;
          letter-spacing:0.5px;
        ">${caption}</p>`
      : ""
  }
  ${embedHTML}
</div>
`;
}
