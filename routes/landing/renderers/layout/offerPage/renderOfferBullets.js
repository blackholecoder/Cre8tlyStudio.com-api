export function renderBullets(bullets = [], textColor = "#ffffff") {
  if (!Array.isArray(bullets) || bullets.length === 0) return "";

  const cleaned = bullets
    .map((b) => (typeof b === "string" ? b.trim() : ""))
    .filter(Boolean);

  if (!cleaned.length) return "";

  return `
    <div style="
      padding-left:16px;
      padding-right:16px;
      opacity:0.9;
    ">

      <div style="
        margin-bottom:0.6rem;
        font-size:1rem;
        font-weight:600;
        color:${textColor};
        text-align:left;
      ">
        In this guide, you’ll learn:
      </div>

      <ul style="
        list-style:disc;
        padding-left:1.25rem;
        margin:0;
        color:${textColor};
        font-size:1rem;
        line-height:1.6;
        text-align:left;
      ">
        ${cleaned
          .map(
            (item) => `
              <li style="
                margin-bottom:0.4rem;
                opacity:0.9;
              ">
                ${item}
              </li>
            `
          )
          .join("")}
      </ul>
    </div>
  `;
}
