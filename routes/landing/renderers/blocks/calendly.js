export function renderCalendlyBlock(block, landingPage) {
  if (!block.calendly_url) return "";

  const padding = block.padding || 40;
  const calendlyHeight = block.height || 700;
  const title = block.title || "Book a Call";
  const titleColor = block.title_color || "#FFFFFF";

  return `
<div style="
  text-align:center;
  padding-bottom:${padding}px;
  margin-top:40px;
">
  <p style="
    margin-bottom:16px;
    font-size:1.5rem;
    font-weight:700;
    color:${titleColor};
    text-align:center;
    text-transform:none;
  ">
    ${title}
  </p>
  <iframe
    src="${block.calendly_url}"
    title="Calendly Booking"
    style="
      width:100%;
      max-width:400px;
      height:${calendlyHeight}px;
      border:none;
      border-radius:12px;
      box-shadow:0 4px 20px rgba(0,0,0,0.35);
    "
    loading="lazy"
  ></iframe>
</div>
`;
}
