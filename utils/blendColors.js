export function blendColors(bgHex, overlayRgba = "rgba(255,255,255,0.04)") {
  // Parse hex
  const hex = bgHex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Parse rgba overlay
  const match = overlayRgba.match(/rgba?\(([^)]+)\)/);
  if (!match) return bgHex;

  const [or, og, ob, oa = 1] = match[1].split(",").map((v) => parseFloat(v.trim()));
  const alpha = oa || 0.04;

  // Blend: newColor = overlay + base*(1-alpha)
  const nr = Math.round(or * alpha + r * (1 - alpha));
  const ng = Math.round(og * alpha + g * (1 - alpha));
  const nb = Math.round(ob * alpha + b * (1 - alpha));

  return `rgb(${nr}, ${ng}, ${nb})`;
}
