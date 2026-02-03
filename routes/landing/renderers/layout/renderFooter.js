export function renderFooter({ landingPage, footerTextColor }) {
  return `
<footer>
      ${
        landingPage.show_download_button
          ? `<p id="thankyou" style="display:none;">${
              landingPage.email_thank_you_msg || ""
            }</p>`
          : ""
      }
     <p class="powered" style="color:${footerTextColor}">
  Powered by 
  <a 
    href="https://themessyattic.com" 
    target="_blank" 
    rel="noopener noreferrer"
    style="color:${footerTextColor};text-decoration:none;font-weight:bold;"
  >
    The Messy Attic
  </a>
</p>

    </footer>
`;
}
