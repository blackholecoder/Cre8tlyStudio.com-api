import express from "express";
import {
  flattenBlocks,
  getLandingPageById,
} from "../../db/landing/dbLanding.js";
import { blendColors } from "../../utils/blendColors.js";
import { renderOfferPreviewPage } from "./renderers/layout/renderOfferPreviewPage.js";

const router = express.Router();

router.get("/:landingId/:blockId", async (req, res) => {
  try {
    const { landingId, blockId } = req.params;

    const landingPage = await getLandingPageById(landingId);
    if (!landingPage) return res.send("<h1>Preview not found</h1>");

    const rawBlocks = Array.isArray(landingPage.content_blocks)
      ? landingPage.content_blocks
      : [];

    const blocks = flattenBlocks(rawBlocks);
    const block = blocks.find((b) => b.id === blockId);

    if (!block) return res.send("<h1>Offer block not found</h1>");

    const mainOverlayColor = blendColors(
      landingPage.bg_theme?.includes("#") ? landingPage.bg_theme : "#1e0033"
    );

    // RENDER THE SEPARATE HTML PAGE
    const html = renderOfferPreviewPage({
      landingPage,
      block,
      mainOverlayColor,
    });

    res.send(html);
  } catch (err) {
    console.error("Offer preview route error:", err);
    res.status(500).send("Error rendering preview");
  }
});

export default router;
