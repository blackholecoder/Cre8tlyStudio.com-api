// middleware/detectDomain.js
export function detectTenantFromHost(req, res, next) {
  const host = req.headers.host?.toLowerCase() || "";

  // Strip port if present
  const hostname = host.split(":")[0];

  // Ignore main app domains
  if (
    hostname === "cre8tlystudio.com" ||
    hostname === "www.cre8tlystudio.com" ||
    hostname === "api.cre8tlystudio.com"
  ) {
    req.subdomain = null;
    req.customDomain = null;
    return next();
  }

  // Handle subdomains (*.cre8tlystudio.com)
  if (hostname.endsWith(".cre8tlystudio.com")) {
    const sub = hostname.replace(".cre8tlystudio.com", "");

    if (!["www", "api"].includes(sub)) {
      req.subdomain = sub;
      req.customDomain = null;
      return next();
    }
  }

  // Everything else is a custom domain
  req.subdomain = null;
  req.customDomain = hostname;

  next();
}
