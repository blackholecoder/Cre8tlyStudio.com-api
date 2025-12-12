export function renderCountdownScript() {
  return `
<script>
function initCountdowns() {
  const elements = document.querySelectorAll('[id^="countdown-"]');
  elements.forEach(el => {
    const targetDate = new Date(el.dataset.target);
    if (!targetDate) return;

    const update = () => {
      const now = new Date();
      const diff = targetDate - now;

      if (diff <= 0) {
        el.textContent = "00:00:00:00";
        el.style.opacity = "0.5";
        el.style.transition = "opacity 1.5s ease";
        setTimeout(() => {
          if (el.parentElement) el.parentElement.style.display = "none";
        }, 2000);
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      el.textContent =
        String(d).padStart(2, "0") + ":" +
        String(h).padStart(2, "0") + ":" +
        String(m).padStart(2, "0") + ":" +
        String(s).padStart(2, "0");
    };

    update();
    setInterval(update, 1000);
  });
}

document.addEventListener("DOMContentLoaded", initCountdowns);
</script>
`;
}
