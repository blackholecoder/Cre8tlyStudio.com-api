import { sendOutLookMail } from "../../utils/sendOutllokMail.js";
import connect from "../connect.js";

export async function getEmailTemplates() {
  const db = connect();
  try {
    const [rows] = await db.query(
      `SELECT id, name
       FROM email_templates
       ORDER BY created_at DESC`
    );
    return rows;
  } catch (err) {
    console.error("getEmailTemplates error", err);
    throw err;
  }
}

export async function createEmailCampaign(data) {
  const db = connect();
  try {
    const { template_id, subject, target, status = "draft" } = data;

    const [result] = await db.query(
      `INSERT INTO email_campaigns
       (template_id, subject, target, status)
       VALUES (?, ?, ?, ?)`,
      [template_id, subject, target, status]
    );

    return result.insertId; // 👈 IMPORTANT
  } catch (err) {
    console.error("createEmailCampaign error", err);
    throw err;
  }
}

export async function getEmailCampaigns(limit = 20, offset = 0) {
  const db = connect();
  try {
    const [rows] = await db.query(
      `SELECT 
         ec.id,
         ec.template_id,
         ec.subject,
         ec.target,
         ec.status,
         ec.sent_at,
         ec.created_at,
         et.name AS template_name
       FROM email_campaigns ec
       JOIN email_templates et ON ec.template_id = et.id
       ORDER BY ec.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return rows;
  } catch (err) {
    console.error("getEmailCampaigns error", err);
    throw err;
  }
}

export async function getTrialUsers() {
  const db = connect();
  try {
    const [rows] = await db.query(
      `SELECT id, email, name
       FROM users
       WHERE free_trial_expires_at IS NOT NULL
       AND free_trial_expires_at > NOW()
       AND pro_status = 'inactive'`
    );

    return rows;
  } catch (err) {
    console.error("getTrialUsers error", err);
    throw err;
  }
}

export async function getPaidUsers() {
  const db = connect();
  try {
    const [rows] = await db.query(
      `SELECT id, email, name
       FROM users
       WHERE pro_status = 'active'
       AND status = 'active'`
    );

    return rows;
  } catch (err) {
    console.error("getPaidUsers error", err);
    throw err;
  }
}

export async function getAllUsers() {
  const db = connect();
  try {
    const [rows] = await db.query(
      `SELECT id, email, name
       FROM users
       WHERE status = 'active'`
    );

    return rows;
  } catch (err) {
    console.error("getAllUsers error", err);
    throw err;
  }
}

// EMAIL

export async function createEmailTemplate({ name, html_body }) {
  const db = connect();
  try {
    await db.query(
      `INSERT INTO email_templates (name, html_body)
       VALUES (?, ?)`,
      [name, html_body]
    );
  } catch (err) {
    console.error("createEmailTemplate error", err);
    throw err;
  }
}

export function renderEmailTemplate(html, variables) {
  try {
    let rendered = html;

    for (const key in variables) {
      rendered = rendered.replaceAll(`{{${key}}}`, variables[key] ?? "");
    }

    return rendered;
  } catch (err) {
    console.error("renderEmailTemplate error", err);
    throw err;
  }
}

export async function searchUsersByEmailOrName(query) {
  const db = connect();
  try {
    const [rows] = await db.query(
      `SELECT id, email, name
       FROM users
       WHERE email LIKE ? OR name LIKE ?
       LIMIT 10`,
      [`%${query}%`, `%${query}%`]
    );
    return rows;
  } catch (err) {
    console.error("searchUsersByEmailOrName error", err);
    throw err;
  }
}

export async function getEmailTemplateById(templateId) {
  const db = connect();
  try {
    const [rows] = await db.query(
      `SELECT id, html_body, name
       FROM email_templates
       WHERE id = ?
       LIMIT 1`,
      [templateId]
    );
    return rows[0] || null;
  } catch (err) {
    console.error("getEmailTemplateById error", err);
    throw err;
  }
}

export async function updateEmailTemplate(id, { name, html_body }) {
  const db = connect();
  try {
    await db.query(
      `UPDATE email_templates
       SET name = ?, html_body = ?
       WHERE id = ?`,
      [name, html_body, id]
    );
  } catch (err) {
    console.error("updateEmailTemplate error", err);
    throw err;
  }
}

// EMAIL BATCH SEND
export async function sendEmailCampaign(campaignId) {
  const db = connect();

  // 1. Load campaign
  const [[campaign]] = await db.query(
    `SELECT * FROM email_campaigns WHERE id = ?`,
    [campaignId]
  );

  if (!campaign) throw new Error("Campaign not found");

  // 2. Load template
  const [[template]] = await db.query(
    `SELECT html_body FROM email_templates WHERE id = ?`,
    [campaign.template_id]
  );

  if (!template) throw new Error("Template not found");

  // 3. Select users based on target
  let usersQuery = "";
  if (campaign.target === "trial_users") {
    usersQuery = `SELECT id, email, name, trial_expires_at FROM users WHERE is_trial = 1`;
  } else if (campaign.target === "paid_users") {
    usersQuery = `SELECT id, email, name FROM users WHERE is_paid = 1`;
  } else {
    usersQuery = `SELECT id, email, name FROM users`;
  }

  const [users] = await db.query(usersQuery);

  // 4. Mark campaign as sending
  await db.query(`UPDATE email_campaigns SET status = 'sending' WHERE id = ?`, [
    campaignId,
  ]);

  // 5. Send emails (reuse single-send logic)
  for (const user of users) {
    try {
      const html = template.html_body
        .replace(/{{NAME}}/g, user.name || "there")
        .replace(/{{EXPIRES_AT}}/g, user.trial_expires_at || "");

      await sendOutLookMail({
        to: user.email,
        subject: campaign.subject,
        html,
      });

      // optional but recommended
      await db.query(
        `INSERT INTO email_campaign_sends (campaign_id, user_id, status)
         VALUES (?, ?, 'sent')`,
        [campaignId, user.id]
      );
    } catch (err) {
      console.error("Email send failed for", user.email, err);

      await db.query(
        `INSERT INTO email_campaign_sends (campaign_id, user_id, status)
         VALUES (?, ?, 'failed')`,
        [campaignId, user.id]
      );
    }
  }

  // 6. Mark campaign completed
  await db.query(`UPDATE email_campaigns SET status = 'sent' WHERE id = ?`, [
    campaignId,
  ]);
}

export async function countEmailRecipients(target) {
  const db = connect();

  try {
    let query = "";
    let params = [];

    if (target === "trial_users") {
      query = `
        SELECT COUNT(*) AS count
        FROM users
        WHERE plan = 'trial'
      `;
    }

    if (target === "paid_users") {
      query = `
        SELECT COUNT(*) AS count
        FROM users
        WHERE plan != 'trial'
      `;
    }

    if (target === "all_users") {
      query = `
        SELECT COUNT(*) AS count
        FROM users
      `;
    }

    const [[row]] = await db.query(query, params);
    return row.count || 0;
  } catch (err) {
    console.error("countEmailRecipients error", err);
    throw err;
  }
}

export async function getEmailCampaignById(id) {
  const db = connect();

  try {
    const [[row]] = await db.query(
      `SELECT id, target
       FROM email_campaigns
       WHERE id = ?`,
      [id]
    );

    return row || null;
  } catch (err) {
    console.error("getEmailCampaignById error", err);
    throw err;
  }
}

export async function getCampaignTemplateHtml(campaignId) {
  const db = connect();

  try {
    const [[row]] = await db.query(
      `SELECT et.html_body
       FROM email_campaigns ec
       JOIN email_templates et ON ec.template_id = et.id
       WHERE ec.id = ?`,
      [campaignId]
    );

    return row?.html_body || "";
  } catch (err) {
    console.error("getCampaignTemplateHtml error", err);
    throw err;
  }
}
