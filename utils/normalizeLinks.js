export function normalizeLink(value) {
  if (!value) return null;

  const trimmed = value.trim();

  // allow mailto
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(trimmed)) {
    return trimmed;
  }

  // plain email → mailto
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return `mailto:${trimmed}`;
  }

  // allow http(s)
  if (/^https?:\/\/[^\s]+$/i.test(trimmed)) {
    return trimmed;
  }

  throw new Error("Invalid link format");
}
