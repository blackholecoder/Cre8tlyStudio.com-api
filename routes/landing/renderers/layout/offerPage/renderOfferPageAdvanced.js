import { renderOfferCard } from "./renderOfferCard.js";
import { renderOfferBlock } from "./renderOfferBlock.js";
import { renderBullets } from "./renderOfferBullets.js";

export function renderOfferPageAdvanced(offerPage, textColor, offerBg) {
  if (!offerPage?.enabled) return "";

  let html = "";

  // 1️⃣ Render paragraph blocks
  if (Array.isArray(offerPage.blocks)) {
    html += offerPage.blocks
      .map((block) =>
        renderOfferCard(renderOfferBlock(block, textColor), offerBg)
      )
      .join("");
  }

  // 2️⃣ Render bullets as their own section
  if (Array.isArray(offerPage.bullets) && offerPage.bullets.length > 0) {
    html += renderOfferCard(
      renderBullets(offerPage.bullets, textColor),
      offerBg
    );
  }

  return html;
}
