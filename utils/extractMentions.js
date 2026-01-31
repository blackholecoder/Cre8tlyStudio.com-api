export function extractMentions(text) {
  try {
    if (!text || typeof text !== "string") return [];

    const regex = /@([a-zA-Z0-9_]+)/g;
    const matches = [...text.matchAll(regex)];

    return [...new Set(matches.map((m) => m[1].toLowerCase()))];
  } catch (error) {
    console.error("❌ extractMentions error:", error);
    return [];
  }
}
