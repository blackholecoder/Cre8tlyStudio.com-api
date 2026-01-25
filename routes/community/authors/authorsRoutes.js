import express from "express";
import {
  getAuthorEmailTemplateByType,
  getAuthorPostsPreview,
  getAuthorProfile,
  getNotificationPreferences,
  getUserEmailAndNameById,
  updateAuthorProfile,
  updateNotificationPreferences,
  upsertAuthorEmailTemplate,
} from "../../../db/community/authors/dbAuthors.js";
import { authenticateToken } from "../../../middleware/authMiddleware.js";
import { renderAuthorEmailTemplate } from "../../../emails/renderAuthorEmailTemplate.js";
import { sendOutLookMail } from "../../../utils/sendOutllokMail.js";

const router = express.Router();

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const profile = await getAuthorProfile(req.user.id);
    const posts = await getAuthorPostsPreview(req.user.id, 10);

    res.json({
      profile: {
        ...profile,
        posts,
      },
    });
  } catch (err) {
    console.error("Get my author profile error:", err);
    res.status(400).json({ error: err.message });
  }
});

router.post("/me", authenticateToken, async (req, res) => {
  try {
    await updateAuthorProfile(req.user.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const profile = await getAuthorProfile(req.params.id);
    if (!profile) return res.status(404).json({});

    const posts = await getAuthorPostsPreview(req.params.id, 10);

    res.json({
      profile: {
        ...profile,
        posts,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load profile" });
  }
});

router.get("/me/notifications", authenticateToken, async (req, res) => {
  try {
    const preferences = await getNotificationPreferences(req.user.id);
    res.json({ success: true, preferences });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to load notification preferences",
    });
  }
});

router.post("/me/update-notifications", authenticateToken, async (req, res) => {
  try {
    await updateNotificationPreferences(req.user.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to save notification preferences",
    });
  }
});

// Email templating

router.get("/me/email-templates/:type", authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.id;

    const template = await getAuthorEmailTemplateByType(userId, type);

    res.json({ template });
  } catch (err) {
    console.error("get author email template route error:", err);
    res.status(500).json({ error: "Failed to fetch email template" });
  }
});

router.post("/me/email-templates", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, subject, body_html } = req.body;

    if (!type || !subject || !body_html) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await upsertAuthorEmailTemplate({
      userId,
      type,
      subject,
      bodyHtml: body_html,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("save author email template route error:", err);
    res.status(500).json({ error: "Failed to save email template" });
  }
});

router.post("/test", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.body;

    const user = await getUserEmailAndNameById(userId);

    if (!user?.email) {
      return res.status(400).json({ error: "User email not found" });
    }

    const template = await getAuthorEmailTemplateByType(userId, type);

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    const rendered = renderAuthorEmailTemplate(template, {
      subscriber_name: "Test Subscriber",
      author_name: req.user.name,
    });

    if (!rendered) {
      return res.status(400).json({ error: "Failed to render template" });
    }

    await sendOutLookMail({
      to: user.email,
      subject: rendered.subject,
      html: rendered.html,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("test author email template error:", err);
    res.status(500).json({ error: "Failed to send test email" });
  }
});

export default router;
