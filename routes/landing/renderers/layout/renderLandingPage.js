import { renderHead } from "./renderHead.js";
import { renderHeader } from "./renderHeader.js";
import { renderFooter } from "./renderFooter.js";
import { renderScripts } from "./renderScripts.js";

export function renderLandingPageLayout({
  title,
  font,
  bg,
  mainOverlayColor,
  bannerHTML,
  contentHTML,
  landingPage,
  footerTextColor,
}) {
  return `
<!DOCTYPE html>
<html lang="en">
  ${renderHead({ title, font, bg, mainOverlayColor, landingPage })}
  <body>
    ${renderHeader({ landingPage })}

    <main>
      ${bannerHTML || ""}
      ${renderCoverImage({ landingPage })}
      ${contentHTML || defaultContent()}
      ${renderLeadForm({ landingPage })}
    </main>

    ${renderFooter({ landingPage, footerTextColor })}
    ${renderScripts({ landingPage })}
  </body>
</html>
`;
}
