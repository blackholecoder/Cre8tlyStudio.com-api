import { resolveTenantByHost } from "../db/landing/dbLanding.js";

export async function attachTenant(req, res, next) {
  const userId = await resolveTenantByHost({
    subdomain: req.subdomain,
    customDomain: req.customDomain,
  });

  req.tenantUserId = userId || null;
  next();
}
