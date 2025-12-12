export function renderLeadCaptureForm({ landingPage }) {
  if (!landingPage.show_download_button) return "";

  return `
<form id="leadForm">
    <input type="hidden" name="landingPageId" value="${landingPage.id}" />
    <input type="email" name="email" placeholder="Email address" required />
    <button type="submit">Download Now</button>
  </form>

  <p id="thankyou" 
     style="display:none;color:white;margin-top:30px;font-size:1.1rem;text-align:center;">
    🎁 Check your inbox for the download link!
  </p>
`;
}
