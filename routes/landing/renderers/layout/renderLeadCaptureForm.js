export function renderLeadCaptureForm({ landingPage }) {
  if (!landingPage.show_download_button) return "";

  return `
  <div style="
    max-width:360px;
    margin:40px auto;
    padding:28px 24px;
    background:rgba(0,0,0,0.55);
    backdrop-filter:blur(8px);
    border-radius:16px;
    box-shadow:0 20px 40px rgba(0,0,0,0.35);
  ">
    <form id="leadForm"
      onsubmit="handleLeadSubmit(event)"
      style="display:flex;flex-direction:column;gap:14px;"
    >
      <input type="hidden" name="landingPageId" value="${landingPage.id}" />
      <div style="text-align:center;margin-bottom:10px;">
  <span style="font-size:2rem;">🎁</span>
</div>
      <h3 style="
  margin-bottom:12px;
  font-size:1.25rem;
  font-weight:800;
  color:white;
  text-align:center;
">
  Fill out the form<br/> to get your free ebook
</h3>

      <label style="
        font-size:0.9rem;
        color:#e5e7eb;
        font-weight:600;
      ">
        Email address
      </label>

      <input
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        style="
          width:100%;
          padding:14px 16px;
          border-radius:10px;
          border:1px solid rgba(255,255,255,0.15);
          background:rgba(255,255,255,0.08);
          color:white;
          font-size:1rem;
          outline:none;
        "
      />

      <button
        id="submitBtn"
        type="submit"
        style="
          margin-top:8px;
          width:100%;
          padding:14px;
          border-radius:12px;
          border:none;
          background:linear-gradient(135deg,#22c55e,#16a34a);
          color:white;
          font-size:1rem;
          font-weight:700;
          cursor:pointer;
          transition:opacity 0.2s ease;
          box-shadow:0 10px 25px rgba(34,197,94,0.35);
        "
      >
        Download Now
      </button>

      <div id="loadingState" style="
        display:none;
        margin-top:6px;
        font-size:0.85rem;
        color:#d1fae5;
        text-align:center;
      ">
        <span style="
          display:inline-block;
          width:16px;
          height:16px;
          border:2px solid rgba(255,255,255,0.3);
          border-top-color:#22c55e;
          border-radius:50%;
          animation:spin 1s linear infinite;
          vertical-align:middle;
          margin-right:8px;
        "></span>
        Sending your download…
      </div>
    </form>

    <p id="thankyou"
      style="
        display:none;
        margin-top:18px;
        color:#e5ffe9;
        font-size:0.95rem;
        text-align:center;
      ">
      🎁 Check your inbox for the download link
    </p>
  </div>

  <style>
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>

  <script>
    async function handleLeadSubmit(e) {
      e.preventDefault();

      const form = document.getElementById("leadForm");
      const btn = document.getElementById("submitBtn");
      const loading = document.getElementById("loadingState");
      const thankyou = document.getElementById("thankyou");

      btn.disabled = true;
      btn.style.opacity = "0.6";
      loading.style.display = "block";

      const formData = new FormData(form);

      try {
        await fetch("/landing/lead-capture", {
          method: "POST",
          body: formData,
        });

        form.style.display = "none";
        thankyou.style.display = "block";
      } catch (err) {
        btn.disabled = false;
        btn.style.opacity = "1";
        loading.style.display = "none";
        alert("Something went wrong. Please try again.");
      }
    }
  </script>
  `;
}
