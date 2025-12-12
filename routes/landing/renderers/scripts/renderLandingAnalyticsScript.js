export function renderLandingAnalyticsScript({ landingPage }) {
  const landingPageId = landingPage?.id || "";

  return `
<script>
  const ownerPreview = new URLSearchParams(window.location.search).get("owner_preview");

  async function trackEvent(eventType) {
    try {
      await fetch("https://cre8tlystudio.com/api/landing-analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landing_page_id: "${landingPageId}",
          event_type: eventType,
          owner_preview: ownerPreview
        }),
      });
    } catch (err) {
      console.error("❌ Analytics error:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    trackEvent("view");

    document.querySelectorAll("a.btn").forEach(btn => {
      btn.addEventListener("click", () => trackEvent("click"));
    });

    document.querySelectorAll('a[href$=".pdf"]').forEach(link => {
      link.addEventListener("click", () => trackEvent("download"));
    });

    const leadForm = document.getElementById("leadForm");
    if (leadForm) {
      leadForm.addEventListener("submit", async () => {
        await trackEvent("click");
        await trackEvent("download");
      });
    }
  });
</script>
`;
}
