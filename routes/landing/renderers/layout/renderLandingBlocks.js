import { renderAudioPlayerBlock } from "../blocks/audioPlayer.js";
import { renderCalendlyBlock } from "../blocks/calendly.js";
import { renderCountdownBlock } from "../blocks/countdown.js";
import { renderFaqBlock } from "../blocks/faq.js";
import { renderFeatureOffers3Block } from "../blocks/featureOffers3.js";
import { renderHeadingBlock } from "../blocks/heading.js";
import { renderImageBlock } from "../blocks/image.js";
import { renderListHeadingBlock } from "../blocks/listHeading.js";
import { renderOfferBannerBlock } from "../blocks/offerBanner.js";
import { renderParagraphBlock } from "../blocks/paragraph.js";
import { renderReferralButtonBlock } from "../blocks/referralButton.js";
import { renderSecureCheckoutBlock } from "../blocks/secureCheckout.js";
import { renderSocialLinksBlock } from "../blocks/socialLinks.js";
import { renderSpacerBlock } from "../blocks/spacer.js";
import { renderStripeCheckoutBlock } from "../blocks/stripeCheckout.js";
import { renderSubheadingBlock } from "../blocks/subheading.js";
import { renderSubsubheadingBlock } from "../blocks/subsubheading.js";
import { renderVerifiedReviewsBlock } from "../blocks/verifiedReviews.js";
import { renderVideoBlock } from "../blocks/video.js";

export function renderLandingBlocks({
  blocks = [],
  landingPage,
  mainOverlayColor,
}) {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return renderHeadingBlock(block, landingPage);

        case "subheading":
          return renderSubheadingBlock(block, landingPage);
        case "subsubheading":
          return renderSubsubheadingBlock(block, landingPage);

        case "list_heading":
          return renderListHeadingBlock(block, landingPage);

        case "paragraph":
          return renderParagraphBlock(block, landingPage);

        case "video":
          return renderVideoBlock(block, landingPage);

        case "spacer":
          return renderSpacerBlock(block);

        case "offer_banner":
          return renderOfferBannerBlock(block, landingPage);

        case "calendly":
          return renderCalendlyBlock(block, landingPage);

        case "social_links":
          return renderSocialLinksBlock(block, landingPage);

        case "countdown":
          return renderCountdownBlock(block, landingPage);

        case "stripe_checkout":
          return renderStripeCheckoutBlock(block, landingPage);

        case "referral_button":
          return renderReferralButtonBlock(block, landingPage);

        case "verified_reviews":
          return renderVerifiedReviewsBlock(block, landingPage);

        case "faq":
          return renderFaqBlock(block, landingPage, { mainOverlayColor });

        case "image":
          return renderImageBlock(block);

        case "feature_offers_3":
          return renderFeatureOffers3Block(block, landingPage, {
            mainOverlayColor,
          });

        case "secure_checkout":
          return renderSecureCheckoutBlock(block);

        case "audio_player":
          return renderAudioPlayerBlock(block, landingPage);

        default:
          return "";
      }
    })
    .join("");
}
