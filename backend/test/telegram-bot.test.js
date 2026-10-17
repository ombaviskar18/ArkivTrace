import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { telegramStore } from '../src/services/telegram.store.js';
import { telegramService } from '../src/services/telegram.service.js';
import app from '../src/app.js';

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

test('Telegram Module: One-time linking code generation and consumption', async () => {
  telegramStore.clear();

  // 1. Generate one-time code for an operator with shop assignment
  const { code, expiresAt } = telegramStore.createLinkCode({
    clerkUserId: 'user_operator_101',
    role: 'operator',
    assignedShopIds: ['FPS-DEL-999'],
  });

  assert.ok(code && code.length === 6, 'Generated code should be 6 digits');
  assert.ok(new Date(expiresAt).getTime() > Date.now(), 'Expiration should be in future');

  // 2. Consume link code from Telegram chat 12345
  const consumed = telegramStore.consumeLinkCode(code, 12345);
  assert.equal(consumed.clerkUserId, 'user_operator_101');
  assert.equal(consumed.role, 'operator');
  assert.deepEqual(consumed.assignedShopIds, ['FPS-DEL-999']);

  // 3. Code must be single-use (subsequent consumption fails)
  const reuse = telegramStore.consumeLinkCode(code, 12345);
  assert.equal(reuse, null, 'Code must not be reusable');

  // 4. Verify lookup by chatId and shopId
  const user = telegramStore.getLinkedUserByChatId(12345);
  assert.equal(user.clerkUserId, 'user_operator_101');

  const operatorChats = telegramStore.getOperatorChatIdsForShop('FPS-DEL-999');
  assert.deepEqual(operatorChats, ['12345']);

  const unassignedChats = telegramStore.getOperatorChatIdsForShop('OTHER-SHOP');
  assert.deepEqual(unassignedChats, []);
});

test('Telegram Module: Expired one-time link codes are rejected', async () => {
  telegramStore.clear();

  // Generate code with negative TTL (already expired)
  const { code } = telegramStore.createLinkCode({
    clerkUserId: 'user_operator_expired',
    role: 'operator',
    assignedShopIds: ['FPS-DEL-1'],
    ttlMinutes: -1,
  });

  const res = telegramStore.consumeLinkCode(code, 99999);
  assert.deepEqual(res, { error: 'EXPIRED' });
  assert.equal(telegramStore.getLinkedUserByChatId(99999), null);
});

test('Telegram Module: Admin alert chat lookup and deduplication', () => {
  telegramStore.clear();

  // Link an admin
  const adminCode = telegramStore.createLinkCode({
    clerkUserId: 'admin_1',
    role: 'admin',
  });
  telegramStore.consumeLinkCode(adminCode.code, 88888);

  const adminChats = telegramStore.getAdminChatIds();
  assert.deepEqual(adminChats, ['88888']);

  // Deduplication check
  assert.equal(telegramStore.hasNotifiedDiscrepancy('DISC-TEST-1'), false);
  telegramStore.markDiscrepancyNotified('DISC-TEST-1');
  assert.equal(telegramStore.hasNotifiedDiscrepancy('DISC-TEST-1'), true);

  assert.equal(telegramStore.hasNotifiedDispatch('DISP-TEST-1'), false);
  telegramStore.markDispatchNotified('DISP-TEST-1');
  assert.equal(telegramStore.hasNotifiedDispatch('DISP-TEST-1'), true);
});

test('Telegram Module: Citizen shop subscription and unsubscription', () => {
  telegramStore.clear();

  // Subscribe
  const sub1 = telegramStore.subscribeCitizen('FPS-SUB-101', 54321);
  assert.equal(sub1, true);

  // Duplicate subscription returns false
  const sub2 = telegramStore.subscribeCitizen('FPS-SUB-101', 54321);
  assert.equal(sub2, false);

  const subs = telegramStore.getSubscribersForShop('FPS-SUB-101');
  assert.deepEqual(subs, ['54321']);

  // Unsubscribe
  const unsub = telegramStore.unsubscribeCitizen('FPS-SUB-101', 54321);
  assert.equal(unsub, true);
  assert.deepEqual(telegramStore.getSubscribersForShop('FPS-SUB-101'), []);
});

test('Telegram Module: Reminder count increment and limit tracking', () => {
  telegramStore.clear();

  assert.equal(telegramStore.getReminderCount('DISP-REMIND-1'), 0);
  telegramStore.incrementReminderCount('DISP-REMIND-1');
  assert.equal(telegramStore.getReminderCount('DISP-REMIND-1'), 1);
  telegramStore.incrementReminderCount('DISP-REMIND-1');
  assert.equal(telegramStore.getReminderCount('DISP-REMIND-1'), 2);
});

test('Telegram Module: Outbound notification methods are resilient and never throw', async () => {
  // Stub _callApi so tests don't make real external Telegram requests
  const sentMessages = [];
  telegramService._callApi = async (method, body) => {
    sentMessages.push({ method, body });
    return { ok: true, result: { message_id: 123 } };
  };

  telegramStore.clear();
  const opCode = telegramStore.createLinkCode({
    clerkUserId: 'op_user_1',
    role: 'operator',
    assignedShopIds: ['FPS-NOTIFY-SHOP'],
  });
  telegramStore.consumeLinkCode(opCode.code, 11111);

  const adminCode = telegramStore.createLinkCode({
    clerkUserId: 'admin_user_1',
    role: 'admin',
  });
  telegramStore.consumeLinkCode(adminCode.code, 22222);

  // 1. Dispatch Notification
  await telegramService.notifyDispatchCreated({
    dispatchId: 'DISP-NOTIFY-1',
    shopId: 'FPS-NOTIFY-SHOP',
    grainType: 'wheat',
    dispatchedQuantityKg: 1000,
    truckNumber: 'DL-TEST-01',
    entityKey: '0x12345',
    txHash: '0xabcde',
  });

  assert.ok(sentMessages.length >= 1);
  const dispatchMsg = sentMessages.find((m) => m.body.chat_id === '11111');
  assert.ok(dispatchMsg);
  assert.match(dispatchMsg.body.text, /New Grain Dispatch Alert/);
  assert.match(dispatchMsg.body.text, /DISP-NOTIFY-1/);

  // 2. Discrepancy Notification
  await telegramService.notifyDiscrepancyRecorded({
    discrepancyId: 'DISC-NOTIFY-1',
    shopId: 'FPS-NOTIFY-SHOP',
    severity: 'critical',
    discrepancyKg: 150,
    discrepancyPercent: 15,
    dispatchedQuantityKg: 1000,
    receivedQuantityKg: 850,
    entityKey: '0xdisc',
    txHash: '0xdisctx',
  });

  const adminMsg = sentMessages.find((m) => m.body.chat_id === '22222');
  assert.ok(adminMsg);
  assert.match(adminMsg.body.text, /CRITICAL/);
  assert.match(adminMsg.body.text, /DISC-NOTIFY-1/);
  assert.match(adminMsg.body.text, /150 kg/);

  // 3. Network Outage Resilience: API failure does not throw or break callers
  telegramService._callApi = async () => {
    throw new Error('Telegram network connection timeout');
  };

  // Calling notification during outage must gracefully complete
  await assert.doesNotReject(async () => {
    await telegramService.notifyDispatchCreated({
      dispatchId: 'DISP-FAIL-SAFE',
      shopId: 'FPS-NOTIFY-SHOP',
      dispatchedQuantityKg: 500,
    });
  });
});

test('Telegram Module: Public bot command handlers format responses properly', async () => {
  const sentMessages = [];
  telegramService._callApi = async (method, body) => {
    sentMessages.push({ method, body });
    return { ok: true, result: {} };
  };

  // 1. /start command
  await telegramService.processUpdate({
    update_id: 1,
    message: { chat: { id: 77777 }, text: '/start' },
  });
  const startMsg = sentMessages.find((m) => m.body.chat_id === 77777);
  assert.ok(startMsg);
  assert.match(startMsg.body.text, /Welcome to ArkivTrace Bot/);

  // 2. /shop without arg
  sentMessages.length = 0;
  await telegramService.processUpdate({
    update_id: 2,
    message: { chat: { id: 77777 }, text: '/shop' },
  });
  assert.match(sentMessages[0].body.text, /Usage.*\/shop SHOP_ID/);

  // 3. /proof without arg
  sentMessages.length = 0;
  await telegramService.processUpdate({
    update_id: 3,
    message: { chat: { id: 77777 }, text: '/proof' },
  });
  assert.match(sentMessages[0].body.text, /Usage.*\/proof RECORD_ID/);
});

test('Telegram Module: Express API routes for link-code generation and status', async () => {
  const server = await listen(app);

  try {
    // 1. Unauthenticated request to /api/v1/telegram/link-code returns 401
    const unauth = await requestJson(server, '/api/v1/telegram/link-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(unauth.response.status, 401);

    // 2. Authenticated operator generating link code
    const authRes = await requestJson(server, '/api/v1/telegram/link-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'operator',
        'x-shop-id': 'FPS-DEL-001',
      },
    });

    assert.equal(authRes.response.status, 201);
    assert.equal(authRes.data.success, true);
    assert.ok(authRes.data.data.code);
    assert.ok(authRes.data.data.instructions);

    // 3. Checking status
    const statusRes = await requestJson(server, '/api/v1/telegram/status', {
      method: 'GET',
      headers: {
        'x-role': 'operator',
        'x-shop-id': 'FPS-DEL-001',
      },
    });

    assert.equal(statusRes.response.status, 200);
    assert.equal(statusRes.data.success, true);
  } finally {
    server.close();
  }
});
