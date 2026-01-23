export function getCommentPreview(text, maxLength = 120) {
  if (!text) return "";

  const cleaned = text
    .replace(/<[^>]*>/g, "") // strip HTML
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLength) return cleaned;

  return cleaned.slice(0, maxLength).trim() + "…";
}
