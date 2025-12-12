export function renderFaqBlock(block, landingPage, ctx) {
  const items = Array.isArray(block.items) ? block.items : [];

  const bg = block.use_no_bg
    ? "transparent"
    : block.use_gradient
    ? `linear-gradient(${block.gradient_direction || "90deg"}, ${
        block.gradient_start || "#F285C3"
      }, ${block.gradient_end || "#7bed9f"})`
    : block.match_main_bg
    ? ctx.mainOverlayColor
    : block.bg_color || "rgba(0,0,0,0.3)";

  const textColor = block.text_color || "#ffffff";
  const align = block.alignment || "left";

  return `
<div style="
  background:${bg};
  color:${textColor};
  padding:40px;
  border-radius:${block.use_no_bg ? "0px" : "12px"};
  margin-top:40px;
  text-align:${align};
  max-width:700px;
  margin-left:auto;
  margin-right:auto;
  box-shadow:${block.use_no_bg ? "none" : "0 8px 25px rgba(0,0,0,0.25)"};
  user-select:none;
  -webkit-user-select:none;
  -ms-user-select:none;
">
  <h2 style="
    font-size:1.8rem;
    font-weight:700;
    margin-bottom:20px;
    text-align:${align};
    color:${textColor};
  ">
    ${block.title || "Frequently Asked Questions"}
  </h2>

  ${items
    .map((item, i) => {
      const id = `faq-${i}-${Math.random().toString(36).substring(2, 8)}`;

      return `
    <div style="
      margin-bottom:20px;
      border-bottom:1px solid ${
        block.use_no_bg ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.15)"
      };
      padding-bottom:16px;
      cursor:pointer;
      user-select:none;
    " onclick="toggleFaq('${id}')">

      <div style="
        display:flex;
        justify-content:space-between;
        font-weight:700;
        font-size:1.1rem;
      ">
        <span>${item.q || ""}</span>
        <span class="faq-icon" style="margin-left:12px;">+</span>
      </div>

      <div id="${id}" style="
        height:0px;
        overflow:hidden;
        transition:height 0.4s ease;
      ">
        <p style="
          color:${textColor}CC;
          font-size:0.95rem;
          margin-top:12px;
          user-select:none;
        ">
          ${item.a || ""}
        </p>
      </div>
    </div>
  `;
    })
    .join("")}
</div>

<script>
function toggleFaq(id){
  const el = document.getElementById(id);
  if (!el) return;

  const icon = el.parentElement.querySelector('.faq-icon');

  const isOpen = el.style.height && el.style.height !== "0px";

  if (isOpen) {
    el.style.height = "0px";
    if (icon) icon.textContent = "+";
  } else {
    el.style.height = el.scrollHeight + "px";
    if (icon) icon.textContent = "x";
  }
}
</script>
`;
}
