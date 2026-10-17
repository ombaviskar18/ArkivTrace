import { getAuth, createClerkClient } from '@clerk/express';

const clerkClient = process.env.CLERK_SECRET_KEY
  ? createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    })
  : null;

const userMetadataCache = new Map();

async function getUserMetadata(userId) {
  if (!userId || !clerkClient) return {};
  const cached = userMetadataCache.get(userId);
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.metadata;
  }
  try {
    const user = await clerkClient.users.getUser(userId);
    const metadata = user.publicMetadata || {};
    userMetadataCache.set(userId, { metadata, timestamp: Date.now() });
    return metadata;
  } catch (err) {
    console.warn(`Failed to fetch Clerk user metadata for ${userId}:`, err?.message || err);
    return {};
  }
}

const normalizedRole = (value) => {
  if (value === null || value === undefined) return null;
  const result = value.toString().toLowerCase().trim();
  return result || null;
};

export const requireRole = (allowedRoles = []) => async (req, res, next) => {
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
    let metadata = clerkAuth.sessionClaims?.publicMetadata;
    if (!metadata || Object.keys(metadata).length === 0) {
      metadata = await getUserMetadata(clerkAuth.userId);
    }

    const publicMetadataRole = normalizedRole(metadata?.role);
    const organizationRole = normalizedRole(clerkAuth.orgRole);
    role = organizationRole || publicMetadataRole || 'public';

    req.clerkUserId = clerkAuth.userId || null;
    req.clerkSessionId = clerkAuth.sessionId || null;
    req.clerkShopId = metadata?.shopId ? String(metadata.shopId).trim().toUpperCase() : null;
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
 * Scoped shop is read primarily from trusted Clerk publicMetadata.shopId,
 * with fallback headers for offline/demo tests.
 */
export const requireShopScope = (getShopId = (req) => req.body?.shopId ?? req.query?.shopId ?? req.params?.shopId) => (req, res, next) => {
  if (req.userRole === 'admin') {
    return next();
  }

  if (req.userRole !== 'operator') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Access denied. Only admin or operator roles can perform this action.',
    });
  }

  const requestedShopId = getShopId(req);
  let clerkShopId = req.clerkShopId;
  if (!clerkShopId) {
    try {
      const auth = getAuth(req);
      clerkShopId =
        auth.sessionClaims?.publicMetadata?.shopId ||
        auth.sessionClaims?.metadata?.shopId ||
        auth.sessionClaims?.shopId ||
        null;
    } catch {
      clerkShopId = null;
    }
  }

  const scopedShopId =
    clerkShopId ||
    req.headers['x-shop-id'] ||
    req.headers['x-demo-shop-id'] ||
    req.headers['x-operator-shop-id'];

  if (!requestedShopId || !scopedShopId || String(scopedShopId).trim().toUpperCase() !== String(requestedShopId).trim().toUpperCase()) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message:
        `Operator shop scope mismatch. Operator is scoped to shop '${scopedShopId || 'NONE'}', but requested action for '${requestedShopId}'. Cross-shop action blocked.`,
    });
  }

  next();
};
