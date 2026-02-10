import express from "express";
import { authenticateAdminToken } from "../../middleware/authMiddleware.js";
import {
  createEmailCampaign,
  createEmailTemplate,
  getEmailCampaigns,
  getEmailTemplateById,
  getEmailTemplates,
  searchUsersByEmailOrName,
  updateEmailTemplate,
  sendEmailCampaign,
  countEmailRecipients,
  getEmailCampaignById,
  getCampaignTemplateHtml,
} from "../../db/admin/dbEmailTemplates.js";
import { getUserById } from "../../db/dbUser.js";
import { renderEmailTemplate } from "../../helpers/renderEmailtemplate.js";
import { sendOutLookMail } from "../../utils/sendOutlookMail.js";

const router = express.Router();

/**
 * GET email templates
 */
router.get("/templates", authenticateAdminToken, async (req, res) => {
  try {
    const templates = await getEmailTemplates();
    res.json(templates);
  } catch (err) {
    console.error("GET /admin/email/templates error", err);
    res.status(500).json({ error: "Failed to load email templates" });
  }
});

router.post("/templates", authenticateAdminToken, async (req, res) => {
  try {
    const { name, html_body } = req.body;

    if (!name || !html_body) {
      return res.status(400).json({
        error: "Template name and HTML are required",
      });
    }

    await createEmailTemplate({ name, html_body });

    res.json({ success: true });
  } catch (err) {
    console.error("POST /admin/email/templates error", err);
    res.status(500).json({ error: "Failed to create email template" });
  }
});

/**
 * CREATE email campaign
 * Does NOT send
 */
router.post("/campaigns", authenticateAdminToken, async (req, res) => {
  try {
    const { template_id, subject, target } = req.body;

    if (!template_id || !subject || !target) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const campaignId = await createEmailCampaign({
      template_id,
      subject,
      target,
      status: "draft",
    });

    res.json({ success: true, id: campaignId });
  } catch (err) {
    console.error("POST /admin/email/campaigns error", err);
    res.status(500).json({ error: "Failed to create email campaign" });
  }
});

/**
 * GET email campaigns
 */
router.get("/campaigns", authenticateAdminToken, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 20);
    const offset = Number(req.query.offset || 0);

    const campaigns = await getEmailCampaigns(limit, offset);
    res.json(campaigns);
  } catch (err) {
    console.error("GET /admin/email/campaigns error", err);
    res.status(500).json({ error: "Failed to load email campaigns" });
  }
});

// SEARCH AND SEND

router.get("/users/search", authenticateAdminToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const users = await searchUsersByEmailOrName(q);
    res.json(users);
  } catch (err) {
    console.error("GET /users/search error", err);
    res.status(500).json({ error: "Failed to search users" });
  }
});

router.post("/send-single", authenticateAdminToken, async (req, res) => {
  try {
    const { user_id, template_id, subject } = req.body;

    if (!user_id || !template_id || !subject) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const user = await getUserById(user_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const template = await getEmailTemplateById(template_id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    const html = renderEmailTemplate(template.html_body, {
      NAME: user.name,
      EMAIL: user.email,
      EXPIRES_AT: user.free_trial_expires_at
        ? new Date(user.free_trial_expires_at).toDateString()
        : "",
    });

    await sendOutLookMail({
      to: user.email,
      subject,
      html,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("POST /send-single error", err);
    res.status(500).json({ error: "Failed to send email" });
  }
});

router.put("/templates/:id", authenticateAdminToken, async (req, res) => {
  try {
    const { name, html_body } = req.body;

    if (!name || !html_body) {
      return res.status(400).json({ error: "Missing fields" });
    }

    await updateEmailTemplate(req.params.id, { name, html_body });
    res.json({ success: true });
  } catch (err) {
    console.error("PUT /templates/:id error", err);
    res.status(500).json({ error: "Failed to update template" });
  }
});

router.get("/templates/:id", authenticateAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    const template = await getEmailTemplateById(id);

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json(template);
  } catch (err) {
    console.error("GET /templates/:id error", err);
    res.status(500).json({ error: "Failed to load template" });
  }
});

// CAMPAIGNS BATCH SENDS
router.post("/campaigns/:id/send", authenticateAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    await sendEmailCampaign(id);

    res.json({ success: true });
  } catch (err) {
    console.error("SEND CAMPAIGN error", err);
    res.status(500).json({ error: "Failed to send campaign" });
  }
});

router.get(
  "/campaigns/:id/recipient-count",
  authenticateAdminToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      const campaign = await getEmailCampaignById(id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      const count = await countEmailRecipients(campaign.target);

      res.json({ count });
    } catch (err) {
      console.error("GET /campaigns/:id/recipient-count error", err);
      res.status(500).json({ error: "Failed to get recipient count" });
    }
  },
);

router.get(
  "/campaigns/:id/preview",
  authenticateAdminToken,
  async (req, res) => {
    try {
      const html = await getCampaignTemplateHtml(req.params.id);
      res.json({ html });
    } catch (err) {
      console.error("PREVIEW CAMPAIGN error", err);
      res.status(500).json({ error: "Failed to load preview" });
    }
  },
);

export default router;
