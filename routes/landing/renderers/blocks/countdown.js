export function renderCountdownBlock(block, landingPage) {
  const label = block.text || "Offer Ends In:";
  const variant = block.style_variant || "minimal";
  const targetDate = block.target_date || null;
  const textColor = block.text_color || landingPage.font_color_h1 || "#fff";
  const glowColor = block.glow_color || null;

  if (!targetDate) return "";

  // Determine accent color from bg_theme
  const getAccentColor = () => {
    const theme = landingPage.bg_theme || "";
    if (theme.includes("emerald")) return "#10b981";
    if (theme.includes("purple") || theme.includes("royal")) return "#8b5cf6";
    if (theme.includes("pink") || theme.includes("rose")) return "#ec4899";
    if (theme.includes("yellow") || theme.includes("amber")) return "#facc15";
    if (theme.includes("blue")) return "#3b82f6";
    if (theme.includes("red")) return "#ef4444";
    return "#10b981";
  };

  const accent = getAccentColor();
  const finalGlowColor = glowColor || accent;

  const styleMap = {
    minimal: `
    font-size:2rem;
    font-family:monospace;
    letter-spacing:2px;
    color:${textColor};
  `,
    boxed: `
    display:inline-block;
    background:rgba(15,23,42,0.85);
    border:1px solid rgba(255,255,255,0.2);
    border-radius:12px;
    padding:12px 24px;
    font-size:2rem;
    font-family:monospace;
    letter-spacing:2px;
    color:${textColor};
  `,
    glow: `
    font-size:2rem;
    font-family:monospace;
    letter-spacing:2px;
    color:${textColor};
    text-shadow:
      0 0 6px ${finalGlowColor},
      0 0 14px ${finalGlowColor},
      0 0 28px ${finalGlowColor};
    animation:pulseGlow 2s infinite;
  `,
  };

  return `
<div style="text-align:center;padding:50px 0;">
  <p style="
    font-weight:700;
    font-size:1.3rem;
    color:${landingPage.font_color_h1 || "#fff"};
    margin-bottom:10px;
    text-align:center;
    display:block;
    width:100%;
  ">
    ${label}
  </p>

  <div 
    id="countdown-${block.id || Math.random().toString(36).substring(2, 8)}" 
    style="${styleMap[variant] || styleMap.minimal}"
    data-target="${targetDate}"
  >
    00:00:00:00
  </div>

  <div style="
    color:${landingPage.font_color_p || "#ccc"};
    font-size:0.9rem;
    margin-top:8px;
    letter-spacing:1px;
  ">
    DAYS&nbsp;&nbsp;|&nbsp;&nbsp;HRS&nbsp;&nbsp;|&nbsp;&nbsp;MIN&nbsp;&nbsp;|&nbsp;&nbsp;SEC
  </div>
</div>
`;
}
