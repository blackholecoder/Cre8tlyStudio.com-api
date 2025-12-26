const ICON_MAP = {
  lock: "🔒",
  shield: "🛡️",
  bolt: "⚡",
  download: "⬇️",
  check: "✓",
  star: "⭐",
  "credit-card": "💳",
};

export function renderTrustItems(trustItems = [], textColor = "#ffffff") {
  if (!Array.isArray(trustItems) || trustItems.length === 0) return "";

  const cleaned = trustItems.filter(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.label === "string" &&
      item.label.trim()
  );

  if (cleaned.length === 0) return "";

  return `
    <div style="
      margin-top:12px;
      font-size:0.8rem;
      opacity:0.7;
      color:${textColor};
      text-align:center;
      line-height:1.5;
      max-width:520px;
      margin-left:auto;
      margin-right:auto;
      display:flex;
      flex-wrap:wrap;
      justify-content:center;
      gap:8px;
    ">
      ${cleaned
        .map((item) => {
          const icon = item.icon && ICON_MAP[item.icon];

          return `
            <span style="display:inline-flex;align-items:center;gap:6px;">
              ${icon ? `<span>${icon}</span>` : ""}
              <span>${item.label.trim()}</span>
            </span>
          `;
        })
        .join('<span style="opacity:0.5;">·</span>')}
    </div>
  `;
}
