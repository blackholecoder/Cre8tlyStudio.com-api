// middleware/detectDomain.js
export function detectTenantFromHost(req, res, next) {
  const host = req.headers.host?.toLowerCase() || "";

  // Strip port if present
  const hostname = host.split(":")[0];

  // Ignore main app domains
  if (
    hostname === "themessyattic.com" ||
    hostname === "www.themessyattic.com" ||
    hostname === "api.themessyattic.com"
  ) {
    req.subdomain = null;
    req.customDomain = null;
    return next();
  }

  // Handle subdomains (*.themessyattic.com)
  if (hostname.endsWith(".themessyattic.com")) {
    const sub = hostname.replace(".themessyattic.com", "");

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
