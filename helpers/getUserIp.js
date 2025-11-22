export function getUserIp(req) {
  let ip =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    null;

  if (!ip) return null;

  // Remove IPv6 prefix ::ffff:
  if (ip.includes("::ffff:")) {
    ip = ip.split("::ffff:")[1];
  }

  // Sometimes x-forwarded-for contains multiple IPs
  if (ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  // If IPv6 but mapped IPv4 exists (most ISPs do)
  const ipv4Match = ip.match(/(\d+\.\d+\.\d+\.\d+)/);
  if (ipv4Match) {
    return ipv4Match[1];
  }

  return ip; // fallback IPv6 if no IPv4 found
}
