import connect from "../connect.js";

import {
  getAllUsers,
  getPaidUsers,
  getTrialUsers,
} from "./dbEmailTemplates.js";

export async function sendEmailCampaign(campaign, sendEmail) {
  const db = connect();
  try {
    let users = [];

    if (campaign.target === "trial_users") {
      users = await getTrialUsers(db);
    }

    if (campaign.target === "paid_users") {
      users = await getPaidUsers(db);
    }

    if (campaign.target === "all_users") {
      users = await getAllUsers(db);
    }

    return users;
  } catch (err) {
    console.error("sendEmailCampaign error", err);
    throw err;
  }
}
