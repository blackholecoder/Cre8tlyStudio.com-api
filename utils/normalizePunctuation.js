export function normalizePunctuation(text) {
  if (!text || typeof text !== "string") return text;

  return (
    text
      // em dash — (handle with spacing)
      .replace(/\s*\u2014\s*/g, ", ")
      // en dash –
      .replace(/\s*\u2013\s*/g, ", ")
      // double hyphen --
      .replace(/\s*--\s*/g, ", ")
      // spaced dash " - "
      .replace(/\s-\s/g, ", ")
      // cleanup double commas
      .replace(/,\s*,/g, ", ")
      // normalize spacing
      .replace(/\s+,/g, ", ")
      .replace(/,\s+/g, ", ")
  );
}
