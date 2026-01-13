export function countWords(text = "") {
  return text
    .replace(/<[^>]*>/g, " ") // strip HTML
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
}
