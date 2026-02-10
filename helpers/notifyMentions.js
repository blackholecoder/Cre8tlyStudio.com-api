import { saveNotification } from "../db/community/notifications/notifications.js";
import { resolveMentionedUsers } from "../db/mentions/dbMentions.js";
import { extractMentions } from "./extractMentions.js";

export async function notifyMentions({
  body,
  authorId,
  authorUsername,
  postId = null,
  fragmentId = null,
}) {
  try {
    if (!body) return;

    const mentionedUsernames = extractMentions(body);
    if (!mentionedUsernames.length) return;

    const users = await resolveMentionedUsers(mentionedUsernames);
    if (!users.length) return;

    for (const user of users) {
      // 🚫 do not notify yourself
      if (user.id === authorId) continue;

      await saveNotification({
        userId: user.id,
        actorId: authorId,
        type: postId ? "post_mention" : "fragment_mention",
        postId,
        fragmentId,
        message: `${authorUsername} mentioned you`,
      });
    }
  } catch (err) {
    console.error("❌ notifyMentions failed:", err);
    throw err;
  }
}
