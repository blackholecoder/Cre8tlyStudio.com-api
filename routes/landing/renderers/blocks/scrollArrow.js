export function renderScrollArrowBlock(block) {
  const {
    alignment = "center",
    color = "#ffffff",
    size = 36,
    animation_type = "bounce", // bounce | float | pulse
    animation_speed = 1.2,
    arrow_style = "single", // single | double | triple
  } = block;

  const styleMap = {
    single: { count: 1, stagger: 0 },
    double: { count: 2, stagger: 0.15 },
    triple: { count: 3, stagger: 0.18 },
  };

  const { count, stagger } = styleMap[arrow_style] || styleMap.single;

  return `
<div
  style="
    margin:32px 0;
    display:flex;
    justify-content:${
      alignment === "left"
        ? "flex-start"
        : alignment === "right"
        ? "flex-end"
        : "center"
    };
    user-select:none;
  "
>
  <div
    style="
      width:${size}px;
      display:flex;
      flex-direction:column;
      align-items:center;
      cursor:pointer;
      touch-action:manipulation;
      --arrow-speed:${animation_speed}s;
    "
  >
    ${Array.from({ length: count })
      .map(
        (_, i) => `
      <svg
        class="scroll-arrow-item ${animation_type}"
        viewBox="0 0 24 24"
        fill="none"
        stroke="${color}"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        width="100%"
        height="100%"
        aria-hidden="true"
        style="
          display:block;
          margin-top:${i === 0 ? 0 : "-10"}px;
          animation-delay:${i * stagger}s;
          animation-duration:${animation_speed}s;
        "
      >
        <path d="M19 12l-7 7-7-7" />
      </svg>
    `
      )
      .join("")}
  </div>
</div>
`;
}
