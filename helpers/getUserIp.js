export function getUserIp(req) {
  // Highest priority: Cloudflare
  let ip =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    null;

  if (!ip) return null;

  // If x-forwarded-for contains multiple, take first — but DO NOT parse IPv4 from IPv6
  if (ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }


  return ip.trim(); // return exact raw IP (IPv4 or IPv6)
}
