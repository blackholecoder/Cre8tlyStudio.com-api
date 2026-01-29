export function renderLandingAnalyticsScript({ landingPage }) {
  const landingPageId = landingPage?.id || "";

  return `
<script>
  const ownerPreview = new URLSearchParams(window.location.search).get("owner_preview");

  async function trackEvent(eventType, meta = {}) {
    try {
      await fetch("https://themessyattic.com/api/landing-analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landing_page_id: "${landingPageId}",
          event_type: eventType,
          owner_preview: ownerPreview,
          meta
        }),
      });
    } catch (err) {
      console.error("❌ Analytics error:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    // VIEW
    trackEvent("view");

    // GLOBAL CLICK LISTENER
    document.addEventListener("click", (e) => {
      const el = e.target.closest("a, button");
      if (!el) return;

      // Track ALL CTA-like clicks
      if (
        el.tagName === "BUTTON" ||
        el.classList.contains("btn") ||
        el.getAttribute("role") === "button"
      ) {
        trackEvent("click", {
          tag: el.tagName,
          text: el.innerText?.slice(0, 50) || null
        });
      }

      // Track file downloads
      const href = el.getAttribute("href");
      if (href && href.toLowerCase().endsWith(".pdf")) {
        trackEvent("download", { href });
      }
    });
  });
</script>
`;
}
