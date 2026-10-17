import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {
  requireRole,
  requireShopScope,
  readClerkRole,
  readClerkAssignedShopIds,
  normalizedRole,
} from '../src/middlewares/auth.middleware.js';

function listen(appInstance) {
  return new Promise((resolve, reject) => {
    const server = appInstance.listen(0, () => resolve(server));
    server.on('error', reject);
  });
}

async function requestJson(server, path, options = {}) {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, options);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { response, data };
}

// Helper to create a test app with simulated Clerk auth middleware
function createTestApp(authSimulator = null) {
  const app = express();
  app.use(express.json());

  if (authSimulator) {
    app.use(authSimulator);
  }

  // Admin-only route
  app.post('/api/admin-only', requireRole(['admin']), (req, res) => {
    res.status(200).json({ success: true, message: 'Admin access granted', userRole: req.userRole });
  });

  // Operator-only route with shop scope
  app.post(
    '/api/receipts',
    requireRole(['admin', 'operator']),
    requireShopScope((req) => req.body?.shopId),
    (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Receipt written',
        userRole: req.userRole,
        shopId: req.body?.shopId,
      });
    }
  );

  // Stock report route with shop scope
  app.post(
    '/api/stock-reports',
    requireRole(['admin', 'operator']),
    requireShopScope((req) => req.body?.shopId),
    (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Stock report written',
        userRole: req.userRole,
        shopId: req.body?.shopId,
      });
    }
  );

  return app;
}

test('1. Helper functions extract roles and shop IDs strictly from Clerk claims', () => {
  // Never derive from headers
  assert.equal(normalizedRole(' ADMIN '), 'admin');
  assert.equal(normalizedRole(null), null);
  assert.equal(normalizedRole(undefined), null);

  // readClerkRole extraction
  assert.equal(readClerkRole({ sessionClaims: { publicMetadata: { role: 'Admin' } } }), 'admin');
  assert.equal(readClerkRole({ sessionClaims: { metadata: { role: 'Operator' } } }), 'operator');
  assert.equal(readClerkRole({ sessionClaims: { role: 'operator' } }), 'operator');
  assert.equal(readClerkRole({ orgRole: 'org:admin' }), 'admin');
  assert.equal(readClerkRole({ orgRole: 'operator' }), 'operator');
  assert.equal(readClerkRole({ sessionClaims: {} }), null);
  assert.equal(readClerkRole(null), null);

  // readClerkAssignedShopIds extraction
  assert.deepEqual(
    readClerkAssignedShopIds({ sessionClaims: { publicMetadata: { shopId: 'FPS-DEL-101' } } }),
    ['FPS-DEL-101']
  );
  assert.deepEqual(
    readClerkAssignedShopIds({ sessionClaims: { publicMetadata: { shop_id: 'FPS-DEL-102' } } }),
    ['FPS-DEL-102']
  );
  assert.deepEqual(
    readClerkAssignedShopIds({ sessionClaims: { publicMetadata: { shopIds: ['FPS-1', 'FPS-2'] } } }),
    ['FPS-1', 'FPS-2']
  );
  assert.deepEqual(readClerkAssignedShopIds({ sessionClaims: {} }), []);
  assert.deepEqual(readClerkAssignedShopIds(null), []);
});

test('2. Missing authentication returns 401 Unauthorized', async () => {
  // Ensure demo headers are disabled for this test
  const oldEnv = process.env.ALLOW_DEMO_ROLE_HEADERS;
  process.env.ALLOW_DEMO_ROLE_HEADERS = 'false';

  const app = createTestApp();
  const server = await listen(app);

  try {
    const res = await requestJson(server, '/api/admin-only', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(res.response.status, 401);
    assert.equal(res.data.success, false);
    assert.equal(res.data.error, 'Unauthorized');
  } finally {
    process.env.ALLOW_DEMO_ROLE_HEADERS = oldEnv;
    server.close();
  }
});

test('3. Authenticated user with insufficient permissions returns 403 Forbidden', async () => {
  // Simulate Clerk user authenticated with role 'operator'
  const authSimulator = (req, res, next) => {
    req.auth = {
      userId: 'user_operator_123',
      sessionId: 'sess_123',
      sessionClaims: {
        publicMetadata: { role: 'operator', shopId: 'FPS-SHOP-A' },
      },
    };
    next();
  };

  const app = createTestApp(authSimulator);
  const server = await listen(app);

  try {
    // Attempting admin-only route
    const res = await requestJson(server, '/api/admin-only', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(res.response.status, 403);
    assert.equal(res.data.success, false);
    assert.equal(res.data.error, 'Forbidden');
    assert.match(res.data.message, /Action requires one of the following role\(s\): \[admin\]/);
  } finally {
    server.close();
  }
});

test('4. Role spoofing: Authenticated Clerk user cannot escalate privileges with x-role or Authorization header', async () => {
  // Simulate Clerk user with role 'operator'
  const authSimulator = (req, res, next) => {
    req.auth = {
      userId: 'user_operator_123',
      sessionId: 'sess_123',
      sessionClaims: {
        publicMetadata: { role: 'operator', shopId: 'FPS-SHOP-A' },
      },
    };
    next();
  };

  const app = createTestApp(authSimulator);
  const server = await listen(app);

  try {
    // Attack 1: Sending x-role: admin header
    const res1 = await requestJson(server, '/api/admin-only', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'admin',
      },
      body: JSON.stringify({}),
    });
    assert.equal(res1.response.status, 403, 'x-role: admin header must be ignored for authenticated user');

    // Attack 2: Sending x-demo-role: admin header
    const res2 = await requestJson(server, '/api/admin-only', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-role': 'admin',
      },
      body: JSON.stringify({}),
    });
    assert.equal(res2.response.status, 403, 'x-demo-role header must be ignored for authenticated user');

    // Attack 3: Sending Authorization: Bearer admin
    const res3 = await requestJson(server, '/api/admin-only', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin',
      },
      body: JSON.stringify({}),
    });
    assert.equal(res3.response.status, 403, 'Authorization text must not escalate authenticated user');
  } finally {
    server.close();
  }
});

test('5. Shop-scope protection: Operator cannot access or spoof unassigned shops', async () => {
  // Clerk operator assigned ONLY to 'FPS-SHOP-A'
  const authSimulator = (req, res, next) => {
    req.auth = {
      userId: 'user_operator_123',
      sessionClaims: {
        publicMetadata: { role: 'operator', shopId: 'FPS-SHOP-A' },
      },
    };
    next();
  };

  const app = createTestApp(authSimulator);
  const server = await listen(app);

  try {
    // 1. Success on assigned shop
    const okRes = await requestJson(server, '/api/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId: 'FPS-SHOP-A' }),
    });
    assert.equal(okRes.response.status, 200);
    assert.equal(okRes.data.success, true);

    // 2. Failure on unassigned shop
    const crossShopRes = await requestJson(server, '/api/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId: 'FPS-SHOP-B' }),
    });
    assert.equal(crossShopRes.response.status, 403);
    assert.match(crossShopRes.data.message, /Operator shop scope mismatch/);

    // 3. Spoofing attempt using x-shop-id header for unassigned shop
    const spoofHeaderRes = await requestJson(server, '/api/receipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shop-id': 'FPS-SHOP-B',
        'x-operator-shop-id': 'FPS-SHOP-B',
      },
      body: JSON.stringify({ shopId: 'FPS-SHOP-B' }),
    });
    assert.equal(spoofHeaderRes.response.status, 403, 'x-shop-id must not bypass Clerk assigned shop');
    assert.match(spoofHeaderRes.data.message, /Operator shop scope mismatch/);

    // 4. Same protection applies to stock reports
    const stockCrossRes = await requestJson(server, '/api/stock-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-shop-id': 'FPS-SHOP-B' },
      body: JSON.stringify({ shopId: 'FPS-SHOP-B' }),
    });
    assert.equal(stockCrossRes.response.status, 403);
  } finally {
    server.close();
  }
});

test('6. Operator with no assigned shop is rejected from shop-scoped writes', async () => {
  // Clerk operator with NO shop assigned
  const authSimulator = (req, res, next) => {
    req.auth = {
      userId: 'user_operator_no_shop',
      sessionClaims: {
        publicMetadata: { role: 'operator' },
      },
    };
    next();
  };

  const app = createTestApp(authSimulator);
  const server = await listen(app);

  try {
    const res = await requestJson(server, '/api/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-shop-id': 'FPS-ANY' },
      body: JSON.stringify({ shopId: 'FPS-ANY' }),
    });

    assert.equal(res.response.status, 403);
    assert.match(res.data.message, /Operator shop scope mismatch/);
  } finally {
    server.close();
  }
});

test('7. Admin bypasses shop-scope check', async () => {
  const authSimulator = (req, res, next) => {
    req.auth = {
      userId: 'user_admin_123',
      sessionClaims: {
        publicMetadata: { role: 'admin' },
      },
    };
    next();
  };

  const app = createTestApp(authSimulator);
  const server = await listen(app);

  try {
    const res = await requestJson(server, '/api/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId: 'FPS-ANY-SHOP' }),
    });

    assert.equal(res.response.status, 200);
    assert.equal(res.data.success, true);
  } finally {
    server.close();
  }
});

test('8. Production mode hardening: Demo headers are NEVER enabled in production', async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldOptIn = process.env.ALLOW_DEMO_ROLE_HEADERS;

  process.env.NODE_ENV = 'production';
  process.env.ALLOW_DEMO_ROLE_HEADERS = 'true'; // Even if explicitly set

  const app = createTestApp();
  const server = await listen(app);

  try {
    const res = await requestJson(server, '/api/admin-only', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'admin',
      },
      body: JSON.stringify({}),
    });

    assert.equal(
      res.response.status,
      401,
      'Production mode must reject x-role headers and return 401 Unauthorized'
    );
  } finally {
    process.env.NODE_ENV = oldNodeEnv;
    process.env.ALLOW_DEMO_ROLE_HEADERS = oldOptIn;
    server.close();
  }
});

test('9. Development mode without explicit opt-in rejects demo headers', async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldOptIn = process.env.ALLOW_DEMO_ROLE_HEADERS;

  process.env.NODE_ENV = 'development';
  process.env.ALLOW_DEMO_ROLE_HEADERS = 'false';

  const app = createTestApp();
  const server = await listen(app);

  try {
    const res = await requestJson(server, '/api/admin-only', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'admin',
      },
      body: JSON.stringify({}),
    });

    assert.equal(res.response.status, 401);
  } finally {
    process.env.NODE_ENV = oldNodeEnv;
    process.env.ALLOW_DEMO_ROLE_HEADERS = oldOptIn;
    server.close();
  }
});

test('10. Development mode with opt-in enforces shop scope for demo operators', async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldOptIn = process.env.ALLOW_DEMO_ROLE_HEADERS;

  process.env.NODE_ENV = 'development';
  process.env.ALLOW_DEMO_ROLE_HEADERS = 'true';

  const app = createTestApp();
  const server = await listen(app);

  try {
    // Cross-shop mismatch in demo mode
    const denied = await requestJson(server, '/api/receipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'operator',
        'x-shop-id': 'FPS-DEMO-A',
      },
      body: JSON.stringify({ shopId: 'FPS-DEMO-B' }),
    });
    assert.equal(denied.response.status, 403);
    assert.match(denied.data.message, /Operator shop scope mismatch/);

    // Matching shop scope in demo mode
    const allowed = await requestJson(server, '/api/receipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'operator',
        'x-shop-id': 'FPS-DEMO-A',
      },
      body: JSON.stringify({ shopId: 'FPS-DEMO-A' }),
    });
    assert.equal(allowed.response.status, 200);
    assert.equal(allowed.data.success, true);
  } finally {
    process.env.NODE_ENV = oldNodeEnv;
    process.env.ALLOW_DEMO_ROLE_HEADERS = oldOptIn;
    server.close();
  }
});
