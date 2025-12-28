import { renderAudioPlayerBlock } from "../blocks/audioPlayer.js";
import { renderButtonBlock } from "../blocks/buttonBlock.js";
import { renderCalendlyBlock } from "../blocks/calendly.js";
import { renderCountdownBlock } from "../blocks/countdown.js";
import { renderFaqBlock } from "../blocks/faq.js";
import { renderHeadingBlock } from "../blocks/heading.js";
import { renderImageBlock } from "../blocks/image.js";
import { renderListHeadingBlock } from "../blocks/listHeading.js";
import { renderMiniOfferBlock } from "../blocks/miniOffer.js";
// import { renderOfferBannerBlock } from "../blocks/offerBanner.js";
import { renderParagraphBlock } from "../blocks/paragraph.js";
import { renderReferralButtonBlock } from "../blocks/referralButton.js";
import { renderSecureCheckoutBlock } from "../blocks/secureCheckout.js";
import { renderSingleOfferBlock } from "../blocks/singleOffer.js";
import { renderSocialLinksBlock } from "../blocks/socialLinks.js";
import { renderSpacerBlock } from "../blocks/spacer.js";
import { renderStripeCheckoutBlock } from "../blocks/stripeCheckout.js";
import { renderSubheadingBlock } from "../blocks/subheading.js";
import { renderSubsubheadingBlock } from "../blocks/subsubheading.js";
import { renderVerifiedReviewsBlock } from "../blocks/verifiedReviews.js";
import { renderVideoBlock } from "../blocks/video.js";

function getMotionAttributes({ block, index, motionSettings }) {
  if (!motionSettings?.enabled) return "";
  if (block.motion?.disabled === true) return "";

  const delay =
    (motionSettings.delay ?? 0) + index * (motionSettings.stagger ?? 0.12);

  return `
    data-motion="true"
    data-motion-preset="${motionSettings.preset || "fade-up"}"
    data-motion-delay="${delay}"
    data-motion-duration="${motionSettings.duration ?? 0.5}"
  `;
}

export function renderLandingBlocks({
  blocks = [],
  landingPage,
  mainOverlayColor,
}) {
  return blocks
    .map((block, index) => {
      let html = "";

      switch (block.type) {
        case "heading":
          html = renderHeadingBlock(block, landingPage);
          break;

        case "subheading":
          html = renderSubheadingBlock(block, landingPage);
          break;

        case "subsubheading":
          html = renderSubsubheadingBlock(block, landingPage);
          break;

        case "list_heading":
          html = renderListHeadingBlock(block, landingPage);
          break;

        case "paragraph":
          html = renderParagraphBlock(block, landingPage);
          break;

        case "video":
          html = renderVideoBlock(block, landingPage);
          break;

        case "divider":
          html = renderSpacerBlock(block);
          break;

        // case "offer_banner":
        //    html = renderOfferBannerBlock(block, landingPage);
        //    break;

        case "calendly":
          html = renderCalendlyBlock(block, landingPage);
          break;

        case "social_links":
          html = renderSocialLinksBlock(block, landingPage);
          break;

        case "countdown":
          html = renderCountdownBlock(block, landingPage);
          break;

        case "stripe_checkout":
          html = renderStripeCheckoutBlock(block, landingPage);
          break;

        case "referral_button":
          html = renderReferralButtonBlock(block, landingPage);
          break;

        case "button_url":
          html = renderButtonBlock(block, landingPage);
          break;

        case "verified_reviews":
          html = renderVerifiedReviewsBlock(block, landingPage);
          break;

        case "faq":
          html = renderFaqBlock(block, landingPage, { mainOverlayColor });
          break;

        case "image":
          html = renderImageBlock(block);
          break;

        case "secure_checkout":
          html = renderSecureCheckoutBlock(block);
          break;

        case "audio_player":
          html = renderAudioPlayerBlock(block, landingPage);
          break;

        case "single_offer":
          html = renderSingleOfferBlock(block, landingPage);
          break;

        case "mini_offer":
          html = renderMiniOfferBlock(block, landingPage);
          break;

        default:
          html = "";
      }

      if (!html) return "";

      const motionAttrs = getMotionAttributes({
        block,
        index,
        motionSettings: landingPage.motion_settings,
      });

      return `
  <div class="lp-block" ${motionAttrs}>
    <div class="lp-motion">
      ${html}
    </div>
  </div>
`;
    })
    .join("");
}
