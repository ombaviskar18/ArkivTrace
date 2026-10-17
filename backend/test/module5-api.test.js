import test from 'node:test';
import assert from 'node:assert/strict';

import app from '../src/app.js';
import { dashboardService } from '../src/services/dashboard.service.js';

function listen(appInstance) {
  return new Promise((resolve, reject) => {
    const server = appInstance.listen(0, () => resolve(server));
    server.on('error', reject);
  });
}

async function requestJson(server, path) {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { response, data };
}

async function withStub(target, methodName, stub, callback) {
  const original = target[methodName];
  target[methodName] = stub;

  try {
    return await callback();
  } finally {
    target[methodName] = original;
  }
}

test('Module 5 routes respond with dashboard summary data', async () => {
  const server = await listen(app);

  await withStub(dashboardService, 'getSummary', async () => ({
    scope: { district: 'Dashboard District', period: '2026-10', shopCount: 3, shopLimitReached: false },
    totals: {
      totalRegisteredShops: 3,
      totalDispatchedKg: 2250,
      totalConfirmedReceivedKg: 2200,
      totalReportedDistributionKg: 2200,
      matchingRecords: 2,
      mismatches: 1,
      unresolvedDiscrepancies: 1,
    },
    recentActivity: [{ recordType: 'dispatch', entityKey: '0xabc', timestamp: '2026-10-16T00:00:00.000Z' }],
    meta: { period: '2026-10', district: 'Dashboard District', recentActivityLimit: 10, evidenceTruncated: false },
  }), async () => {
    const { response, data } = await requestJson(server, '/api/v1/dashboard/summary?district=Dashboard%20District&period=2026-10&limit=10');

    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.totals.totalRegisteredShops, 3);
    assert.equal(data.data.totals.mismatches, 1);
  });

  server.close();
});

test('Module 5 routes respond with a shop evidence timeline', async () => {
  const server = await listen(app);

  await withStub(dashboardService, 'getShopTimeline', async (id) => ({
    shop: {
      entityKey: id,
      shopId: 'FPS-DASH-A',
      name: 'Dashboard Shop A',
      district: 'Dashboard District',
      state: 'Delhi',
    },
    items: [
      { recordType: 'dispatch', entityKey: '0x1', timestamp: '2026-10-16T00:00:00.000Z' },
      { recordType: 'receipt', entityKey: '0x2', timestamp: '2026-10-16T00:05:00.000Z' },
      { recordType: 'stock_report', entityKey: '0x3', timestamp: '2026-10-16T00:10:00.000Z' },
    ],
    meta: { period: '2026-10', limit: 20, evidenceTruncated: false, eventCount: 3 },
  }), async () => {
    const { response, data } = await requestJson(server, '/api/v1/shops/0xabc/timeline?period=2026-10&limit=20');

    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.items.length, 3);
    assert.equal(data.data.shop.entityKey, '0xabc');
  });

  server.close();
});

test('Module 5 records endpoint returns combined evidence feeds', async () => {
  const server = await listen(app);

  await withStub(dashboardService, 'listRecords', async () => ({
    items: [
      { recordType: 'dispatch', entityKey: '0x1', timestamp: '2026-10-16T00:00:00.000Z' },
      { recordType: 'receipt', entityKey: '0x2', timestamp: '2026-10-16T00:05:00.000Z' },
    ],
    meta: { shopId: null, district: 'Dashboard District', period: '2026-10', recordType: 'all', limit: 25, evidenceTruncated: false, count: 2 },
  }), async () => {
    const { response, data } = await requestJson(server, '/api/v1/records?district=Dashboard%20District&period=2026-10&limit=25');

    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.items.length, 2);
    assert.equal(data.data.meta.district, 'Dashboard District');
  });

  server.close();
});

test('Module 5 query validation rejects malformed periods', async () => {
  const server = await listen(app);

  const { response, data } = await requestJson(server, '/api/v1/dashboard/summary?period=2026-13');

  assert.equal(response.status, 400);
  assert.equal(data.success, false);
  assert.equal(data.error, 'Validation Error');

  server.close();
});
