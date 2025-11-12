// utils/base64url.js
export function encodeBase64URL(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeBase64URL(base64url) {
  if (!base64url || typeof base64url !== "string") {
    return Buffer.alloc(0); // prevents ERR_INVALID_ARG_TYPE
  }
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}
