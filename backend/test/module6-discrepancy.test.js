import test from 'node:test';
import assert from 'node:assert/strict';

import app from '../src/app.js';
import { discrepancyService } from '../src/services/discrepancy.service.js';

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

test('Module 6 discrepancy routes list and retrieve records', async () => {
  const server = await listen(app);

  await withStub(discrepancyService, 'listDiscrepancies', async () => ({
    count: 1,
    entities: [
      {
        entityKey: '0x1',
        discrepancyId: 'DISC-1',
        shopId: 'FPS-1',
        caseStatus: 'open',
        severity: 'major',
      },
    ],
  }), async () => {
    const { response, data } = await requestJson(server, '/api/v1/discrepancies?shopId=FPS-1&period=2026-10');
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.entities.length, 1);
  });

  await withStub(discrepancyService, 'getDiscrepancyById', async (id) => ({
    entityKey: id,
    discrepancyId: 'DISC-1',
    caseStatus: 'open',
    severity: 'major',
  }), async () => {
    const { response, data } = await requestJson(server, '/api/v1/discrepancies/DISC-1');
    assert.equal(response.status, 200);
    assert.equal(data.data.discrepancyId, 'DISC-1');
  });

  server.close();
});

test('Module 6 public reports are rate-limited and validate payloads', async () => {
  const server = await listen(app);

  const invalid = await requestJson(server, '/api/v1/discrepancies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shopId: 'bad id' }),
  });
  assert.equal(invalid.response.status, 400);

  await withStub(discrepancyService, 'createPublicDiscrepancyReport', async () => ({
    duplicate: false,
    entityKey: '0x2',
    txHash: '0x3',
    discrepancyId: 'DISC-PUB-1',
    caseStatus: 'open',
  }), async () => {
    const { response, data } = await requestJson(server, '/api/v1/discrepancies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId: 'FPS-1',
        period: '2026-10',
        issueType: 'shortage',
        severity: 'major',
        description: 'Possible shortage reported by beneficiary',
        evidenceEntityKeys: ['0x1'],
      }),
    });

    assert.equal(response.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.data.discrepancyId, 'DISC-PUB-1');
  });

  server.close();
});

test('Module 6 review endpoint requires admin role', async () => {
  const server = await listen(app);

  const denied = await requestJson(server, '/api/v1/discrepancies/DISC-1/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: 'resolved' }),
  });
  assert.equal(denied.response.status, 403);

  await withStub(discrepancyService, 'reviewDiscrepancy', async () => ({
    duplicate: false,
    entityKey: '0x4',
    txHash: '0x5',
    discrepancyId: 'DISC-1',
    caseStatus: 'resolved',
  }), async () => {
    const { response, data } = await requestJson(server, '/api/v1/discrepancies/DISC-1/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-role': 'admin' },
      body: JSON.stringify({ decision: 'resolved', notes: 'Reviewed and closed' }),
    });

    assert.equal(response.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.data.caseStatus, 'resolved');
  });

  server.close();
});
