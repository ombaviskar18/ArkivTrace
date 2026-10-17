import { getAuth } from '@clerk/express';

const normalizedRole = (value) => {
  if (value === null || value === undefined) return null;
  const result = value.toString().toLowerCase().trim();
  return result || null;
};

const readClerkRole = (auth, req) => {
  const publicMetadataRole = normalizedRole(auth.sessionClaims?.publicMetadata?.role);
  const organizationRole = normalizedRole(auth.orgRole);
  const headerRole = normalizedRole(
    req.headers['x-role'] ||
      req.headers['x-demo-role'] ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : req.headers.authorization)
  );

  return organizationRole || publicMetadataRole || headerRole || 'public';
};

export const requireRole = (allowedRoles = []) => (req, res, next) => {
  let clerkAuth = { isAuthenticated: false };
  try {
    clerkAuth = getAuth(req);
  } catch {
    clerkAuth = { isAuthenticated: false };
  }
  const clerkFallbackEnabled = process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_ROLE_HEADERS === 'true';

  let role = 'public';
  let authSource = 'clerk';

  if (clerkAuth.isAuthenticated) {
    role = readClerkRole(clerkAuth, req);
    req.clerkUserId = clerkAuth.userId || null;
    req.clerkSessionId = clerkAuth.sessionId || null;
  } else if (clerkFallbackEnabled) {
    const headerRole = req.headers['x-role'] || req.headers['x-demo-role'];
    role = normalizedRole(headerRole);
    authSource = 'demo-header';
  }

  role = role || 'public';

  req.userRole = role;
  req.authSource = authSource;

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: `Access denied. Action requires one of the following role(s): [${allowedRoles.join(', ')}].`,
    });
  }

  next();
};

/**
 * Ensure an operator can only act on the shop they are scoped to.
 * Admins bypass this check.
 *
 * The demo client can provide the shop scope through x-shop-id,
 * x-demo-shop-id, or x-operator-shop-id.
 */
export const requireShopScope = (getShopId = (req) => req.body?.shopId ?? req.query?.shopId ?? req.params?.shopId) => (req, res, next) => {
  if (req.userRole === 'admin') {
    return next();
  }

  if (req.userRole !== 'operator') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Access denied. Only admin or operator roles can submit stock reports.',
    });
  }

  const requestedShopId = getShopId(req);
  const scopedShopId =
    req.headers['x-shop-id'] ||
    req.headers['x-demo-shop-id'] ||
    req.headers['x-operator-shop-id'];

  if (!requestedShopId || !scopedShopId || String(scopedShopId).trim() !== String(requestedShopId).trim()) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message:
        `Operator shop scope mismatch. Provide x-shop-id matching '${requestedShopId}' to submit stock reports for this shop.`,
    });
  }

  next();
};
