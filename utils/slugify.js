export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove symbols
    .replace(/\s+/g, "-") // spaces → dashes
    .replace(/-+/g, "-"); // collapse dashes
}
