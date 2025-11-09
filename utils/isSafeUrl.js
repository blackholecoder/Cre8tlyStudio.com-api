export function isSafeUrl(url) {
  if (!url) return true;
  try {
    const parsed = new URL(url, "https://cre8tlystudio.com");

    // Only allow http/https
    if (!["http:", "https:"].includes(parsed.protocol)) return false;

    // Optional: disallow localhost or internal IPs
    if (
      parsed.hostname === "localhost" ||
      /^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname) // blocks 127.0.0.1 etc
    ) {
      return false;
    }

    // Block suspicious query parameters (like embedded scripts)
    const suspiciousPatterns = ["<script", "javascript:", "data:text"];
    if (suspiciousPatterns.some((p) => url.toLowerCase().includes(p))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
