export function extractMentions(html) {
  if (!html) return [];

  // Strip HTML first so links don’t double-count
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const matches = text.match(/@([a-zA-Z0-9_]+)/g);

  if (!matches) return [];

  // unique, lowercase usernames
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}
