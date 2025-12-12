export function renderLeadFormScript() {
  return `
<script>
document.addEventListener("DOMContentLoaded", () => {
  const leadForm = document.getElementById("leadForm");
  if (!leadForm) return;

  leadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = leadForm.email.value;
    const landingPageId = leadForm.landingPageId.value;

    try {
      const res = await fetch("https://cre8tlystudio.com/api/landing/landing-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landingPageId, email }),
      });

      const data = await res.json();

      if (data.success) {
        leadForm.style.display = "none";
        const thankyou = document.getElementById("thankyou");
        if (thankyou) thankyou.style.display = "block";
      } else {
        alert(data.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert("Server error. Please try again later.");
    }
  });
});
</script>
`;
}
