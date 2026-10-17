import { getAuth } from '@clerk/express';

/**
 * Normalizes a role string to lowercase and trimmed.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
export const normalizedRole = (value) => {
  if (value === null || value === undefined) return null;
  const result = value.toString().toLowerCase().trim();
  return result || null;
};

/**
 * Extracts a user's role ONLY from verified Clerk session claims and organization metadata.
 * Never inspects request headers (x-role, x-demo-role, or Authorization text).
 *
 * @param {Object} auth - Clerk auth object
 * @returns {string|null}
 */
export const readClerkRole = (auth) => {
  if (!auth) return null;
  const claims = auth.sessionClaims || {};

  // Standard Clerk metadata locations for user role
  const rawRole =
    claims.publicMetadata?.role ||
    claims.public_metadata?.role ||
    claims.metadata?.role ||
    claims.role ||
    (auth.orgRole ? String(auth.orgRole).replace(/^org:/, '') : null);

  return normalizedRole(rawRole);
};

/**
 * Extracts a user's assigned shop ID(s) ONLY from verified Clerk session claims.
 * Never inspects request headers (x-shop-id, x-demo-shop-id, etc.).
 *
 * @param {Object} auth - Clerk auth object
 * @returns {string[]} Array of assigned shop ID strings
 */
export const readClerkAssignedShopIds = (auth) => {
  if (!auth) return [];
  const claims = auth.sessionClaims || {};

  const raw =
    claims.publicMetadata?.shopId ??
    claims.publicMetadata?.shop_id ??
    claims.publicMetadata?.assignedShopId ??
    claims.publicMetadata?.assigned_shop_id ??
    claims.publicMetadata?.shopIds ??
    claims.publicMetadata?.assignedShops ??
    claims.public_metadata?.shopId ??
    claims.public_metadata?.shop_id ??
    claims.metadata?.shopId ??
    claims.metadata?.shop_id ??
    claims.metadata?.assignedShopId ??
    claims.shopId ??
    claims.shop_id;

  if (raw === null || raw === undefined) return [];

  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }

  const str = String(raw).trim();
  return str ? [str] : [];
};

/**
 * Role-Based Authorization Middleware
 *
 * Enforces role restrictions using verified Clerk authentication by default.
 * Demo headers (x-role, x-demo-role) are only allowed in non-production environments
 * when explicitly opted into via ALLOW_DEMO_ROLE_HEADERS=true, and are never applied
 * to authenticated Clerk requests.
 *
 * Returns:
 * - 401 Unauthorized: missing or invalid authentication credentials.
 * - 403 Forbidden: authenticated user has insufficient role permissions.
 *
 * @param {string[]} allowedRoles - List of allowed roles, e.g. ['admin'], ['admin', 'operator']
 */
export const requireRole = (allowedRoles = []) => (req, res, next) => {
  let clerkAuth = null;
  try {
    clerkAuth = getAuth(req);
  } catch {
    // getAuth throws if clerkMiddleware was not run before this handler
  }

  // Fallback to req.auth object if getAuth threw or was unpopulated
  if (!clerkAuth || !clerkAuth.userId) {
    if (req.auth && typeof req.auth === 'object' && req.auth.userId) {
      clerkAuth = req.auth;
    } else if (typeof req.auth === 'function') {
      try {
        const authObj = req.auth();
        if (authObj && authObj.userId) {
          clerkAuth = authObj;
        }
      } catch {
        // ignore function invocation errors
      }
    }
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const allowDemoOptIn = process.env.ALLOW_DEMO_ROLE_HEADERS === 'true';
  const demoHeadersEnabled = !isProduction && allowDemoOptIn;

  let role = null;
  let authSource = 'none';
  let isAuthenticated = false;
  let assignedShopIds = [];

  const isClerkAuthenticated = Boolean(clerkAuth && clerkAuth.userId);

  if (isClerkAuthenticated) {
    isAuthenticated = true;
    authSource = 'clerk';
    req.clerkUserId = clerkAuth.userId;
    req.clerkSessionId = clerkAuth.sessionId || null;

    // Strict: derive role and assigned shops ONLY from verified Clerk claims
    role = readClerkRole(clerkAuth) || 'public';
    assignedShopIds = readClerkAssignedShopIds(clerkAuth);
  } else if (demoHeadersEnabled) {
    // Only in development with explicit opt-in, accept demo headers for unauthenticated requests
    const headerRole = req.headers['x-role'] || req.headers['x-demo-role'];
    if (headerRole) {
      isAuthenticated = true;
      authSource = 'demo-header';
      role = normalizedRole(headerRole);

      const demoShop =
        req.headers['x-shop-id'] ||
        req.headers['x-demo-shop-id'] ||
        req.headers['x-operator-shop-id'];
      if (demoShop) {
        assignedShopIds = [String(demoShop).trim()];
      }
    }
  }

  req.isAuthenticated = isAuthenticated;
  req.authSource = authSource;
  req.userRole = role || 'public';
  req.assignedShopIds = assignedShopIds;
  req.assignedShopId = assignedShopIds[0] || null;

  if (allowedRoles.length > 0) {
    // 1. Missing or invalid authentication -> 401 Unauthorized
    if (!isAuthenticated) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required. Please provide valid authentication credentials.',
      });
    }

    // 2. Authenticated but insufficient role -> 403 Forbidden
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Action requires one of the following role(s): [${allowedRoles.join(', ')}]. Provided role: '${req.userRole}'.`,
      });
    }
  }

  next();
};

/**
 * Ensure an operator can only act on the shop(s) they are assigned to.
 * Admins bypass this check.
 *
 * For Clerk users, assigned shop IDs are read ONLY from verified claims/metadata.
 * Operators cannot spoof shop access via x-shop-id headers.
 *
 * @param {Function} [getShopId] - Custom extractor for the target shop ID from request
 */
export const requireShopScope = (
  getShopId = (req) => req.body?.shopId ?? req.query?.shopId ?? req.params?.shopId
) => (req, res, next) => {
  // 1. Admins have system-wide access across all shops
  if (req.userRole === 'admin') {
    return next();
  }

  // 2. Only operators (or admins) are permitted on shop-scoped write operations
  if (req.userRole !== 'operator') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Access denied. Only admin or operator roles can access shop-scoped operations.',
    });
  }

  // 3. Extract the requested target shop ID
  const requestedShopId =
    typeof getShopId === 'function'
      ? getShopId(req)
      : (req.body?.shopId ?? req.query?.shopId ?? req.params?.shopId);

  if (!requestedShopId) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Shop ID is required for shop-scoped operations.',
    });
  }

  // 4. Validate that requestedShopId is in the operator's verified assigned shops
  const assignedShopIds = Array.isArray(req.assignedShopIds) ? req.assignedShopIds : [];

  const isAssigned = assignedShopIds.some(
    (id) => String(id).trim().toLowerCase() === String(requestedShopId).trim().toLowerCase()
  );

  if (!isAssigned) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: `Operator shop scope mismatch. You are not assigned to shop '${requestedShopId}'.`,
    });
  }

  next();
};
