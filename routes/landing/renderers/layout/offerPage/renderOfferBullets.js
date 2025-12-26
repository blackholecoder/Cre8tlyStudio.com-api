export function renderBullets(bullets = [], textColor = "#ffffff") {
  if (!Array.isArray(bullets) || bullets.length === 0) return "";

  const cleaned = bullets
    .map((b) => (typeof b === "string" ? b.trim() : ""))
    .filter(Boolean);

  if (!cleaned.length) return "";

  return `
    <div style="
      padding-left:28px;
      padding-right:28px;
      opacity:0.9;
    ">
      <ul style="
        list-style:disc;
        padding-left:2rem;
        margin:0;
        color:${textColor};
        font-size:1rem;
        line-height:1.7;
        text-align:left;
      ">
        ${cleaned
          .map(
            (item) => `
              <li style="
                margin-bottom:0.6rem;
                opacity: 0.9;
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
