// middleware/detectSubdomain.js
export function detectSubdomain(req, res, next) {
  const subdomain = req.headers["x-subdomain"];

  if (subdomain && !["www", "api"].includes(subdomain.toLowerCase())) {
    req.subdomain = subdomain.toLowerCase();
  } else {
    req.subdomain = null;
  }

  next();
}
