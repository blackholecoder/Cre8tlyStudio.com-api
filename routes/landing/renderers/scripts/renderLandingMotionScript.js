export function renderLandingMotionScript() {
  return `
  <script>
  (function () {
    const blocks = document.querySelectorAll('.lp-block[data-motion="true"]');

    if (!blocks.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const block = entry.target;
          const motionEl = block.querySelector('.lp-motion');
          if (!motionEl) return;

          const delay = parseFloat(block.dataset.motionDelay || "0");
          const duration = parseFloat(block.dataset.motionDuration || "0.5");

          motionEl.style.transitionDuration = duration + "s";
          motionEl.style.transitionDelay = delay + "s";

          block.classList.add("motion-visible");
          observer.unobserve(block);
        });
      },
      { threshold: 0.15 }
    );

    blocks.forEach((el) => observer.observe(el));
  })();
</script>
  `;
}
