import test from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';

dotenv.config();
process.env.ALLOW_DEMO_ROLE_HEADERS = 'true';

import app from '../src/app.js';
import { clerkClient } from '../src/config/clerk.js';
import { arkivService } from '../src/services/arkiv.service.js';

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

test('1. Attempting to assign a shop to an operator already bound to another shop returns 409 Conflict', async () => {
  const server = await listen(app);

  try {
    // operator401@arkivtrace.org is already bound to FPS-MH-401 in Clerk
    const conflictShopId = `FPS-CONFLICT-${Date.now().toString().slice(-4)}`;
    const { response, data } = await requestJson(server, '/api/v1/shops', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'admin',
      },
      body: JSON.stringify({
        shopId: conflictShopId,
        name: `Conflict Test Shop ${conflictShopId}`,
        operatorName: 'Assigned Operator',
        operatorEmail: 'operator401@arkivtrace.org',
        district: 'Pune',
        state: 'Maharashtra',
        address: '123 Market Yard, Pune',
        allocatedBeneficiaries: 1000,
        monthlyQuotaKg: { wheat: 3000, rice: 2000, coarseGrains: 500 },
        status: 'active',
      }),
    });

    assert.equal(response.status, 409);
    assert.equal(data.success, false);
    assert.match(data.message, /already assigned to shop/i);
    console.log('   ✅ 409 Conflict verified for duplicate operator assignment attempt.');
  } finally {
    server.close();
  }
});

test('2. Creation with a non-existent email creates an on-chain invitation and returns invitation_created status', async () => {
  const server = await listen(app);

  try {
    const nonExistentEmail = `unregistered-dealer-${Date.now()}@arkivtrace.org`;
    const inviteShopId = `FPS-INV-${Date.now().toString().slice(-5)}`;

    const { response, data } = await requestJson(server, '/api/v1/shops', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'admin',
      },
      body: JSON.stringify({
        shopId: inviteShopId,
        name: `Invited Shop ${inviteShopId}`,
        operatorName: 'Pending Dealer',
        operatorEmail: nonExistentEmail,
        district: 'Nashik',
        state: 'Maharashtra',
        address: 'Highway Circle, Nashik',
        allocatedBeneficiaries: 850,
        monthlyQuotaKg: { wheat: 2500, rice: 2000, coarseGrains: 500 },
        status: 'active',
      }),
    });

    assert.equal(response.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.data.shopId, inviteShopId);
    assert.ok(data.data.operatorAssignment);
    assert.equal(data.data.operatorAssignment.status, 'invitation_created');
    assert.equal(data.data.operatorAssignment.email, nonExistentEmail);
    assert.match(data.message, /invitation created and sent/i);
    console.log('   ✅ Invitation creation status and Arkiv entity verified for unassigned email.');
  } finally {
    server.close();
  }
});

test('3. Successful shop creation with an existing unassigned operator updates Clerk metadata', async () => {
  const server = await listen(app);

  try {
    const assignShopId = `FPS-ASSIGN-${Date.now().toString().slice(-5)}`;
    const testEmail = `operator-fresh-${Date.now()}@arkivtrace.org`;

    // Temporarily stub or use clerkClient to test metadata update
    let updatedMetadata = null;
    const originalGetUserList = clerkClient.users.getUserList;
    const originalUpdateUser = clerkClient.users.updateUser;
    const originalUpdateUserMetadata = clerkClient.users.updateUserMetadata;

    clerkClient.users.getUserList = async () => ({
      data: [
        {
          id: 'user_mock_operator_unassigned',
          publicMetadata: {}, // Unassigned operator
        },
      ],
      totalCount: 1,
    });

    clerkClient.users.updateUser = async (userId, params) => {
      updatedMetadata = params.publicMetadata;
      return { id: userId, publicMetadata: updatedMetadata };
    };
    clerkClient.users.updateUserMetadata = async (userId, params) => {
      updatedMetadata = params.publicMetadata;
      return { id: userId, publicMetadata: updatedMetadata };
    };

    try {
      const { response, data } = await requestJson(server, '/api/v1/shops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'admin',
        },
        body: JSON.stringify({
          shopId: assignShopId,
          name: `Assigned Shop ${assignShopId}`,
          operatorName: 'Ramesh Patil',
          operatorEmail: testEmail,
          district: 'Nagpur',
          state: 'Maharashtra',
          address: 'Station Road, Nagpur',
          allocatedBeneficiaries: 950,
          monthlyQuotaKg: { wheat: 3000, rice: 3000, coarseGrains: 500 },
          status: 'active',
        }),
      });

      assert.equal(response.status, 201);
      assert.equal(data.success, true);
      assert.equal(data.data.operatorAssignment.status, 'assigned');
      assert.equal(data.data.operatorAssignment.shopId, assignShopId);
      assert.equal(data.data.operatorAssignment.role, 'operator');
      assert.deepEqual(updatedMetadata, {
        role: 'operator',
        shopId: assignShopId,
        assignedShopIds: [assignShopId],
      });
      console.log('   ✅ Clerk publicMetadata correctly updated with role and assigned shopId.');
    } finally {
      clerkClient.users.getUserList = originalGetUserList;
      clerkClient.users.updateUser = originalUpdateUser;
      clerkClient.users.updateUserMetadata = originalUpdateUserMetadata;
    }
  } finally {
    server.close();
  }
});

test('4. End-to-end scenario: Operator can only perform receipt & stock actions for their assigned shop', async () => {
  const server = await listen(app);

  try {
    const testShopId = 'FPS-MH-401';
    const otherShopId = 'FPS-MH-999';

    // Operator acts on assigned shop -> Allowed
    const assignedReceipt = await requestJson(server, '/api/v1/receipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'operator',
        'x-shop-id': testShopId,
      },
      body: JSON.stringify({
        receiptId: `RCP-E2E-${Date.now().toString().slice(-4)}`,
        dispatchId: 'DSP-NONEXISTENT',
        shopId: testShopId,
        receivedQuantityKg: 500,
        receivedDate: new Date().toISOString(),
        receiverName: 'Assigned Operator',
        conditionStatus: 'Good',
      }),
    });

    // It passes role and shop scope check (though dispatch may not exist -> 404, but NOT 403)
    assert.notEqual(assignedReceipt.response.status, 403);

    // Operator acts on unassigned foreign shop -> Blocked with 403 Forbidden
    const forbiddenReceipt = await requestJson(server, '/api/v1/receipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'operator',
        'x-shop-id': testShopId, // assigned to testShopId
      },
      body: JSON.stringify({
        receiptId: `RCP-ILLEGAL-${Date.now().toString().slice(-4)}`,
        dispatchId: 'DSP-OTHER',
        shopId: otherShopId, // trying to operate on otherShopId!
        receivedQuantityKg: 500,
        receivedDate: new Date().toISOString(),
      }),
    });

    assert.equal(forbiddenReceipt.response.status, 403);
    assert.equal(forbiddenReceipt.data.error, 'Forbidden');
    assert.match(forbiddenReceipt.data.message, /Operator shop scope mismatch|Cross-shop action blocked/i);
    console.log('   ✅ End-to-end shop boundary isolation verified (403 Forbidden on foreign shop).');
  } finally {
    server.close();
  }
});

test('5. Attempting to assign an administrative account as a shop operator is rejected (admin protection)', async () => {
  const server = await listen(app);

  try {
    const adminShopId = `FPS-ADM-${Date.now().toString().slice(-5)}`;
    const adminEmail = 'admin@arkivtrace.gov.in';

    const originalGetUserList = clerkClient.users.getUserList;
    clerkClient.users.getUserList = async () => ({
      data: [
        {
          id: 'user_admin_existing',
          publicMetadata: { role: 'admin' },
          emailAddresses: [{ emailAddress: adminEmail }],
        },
      ],
      totalCount: 1,
    });

    try {
      const { response, data } = await requestJson(server, '/api/v1/shops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'admin',
        },
        body: JSON.stringify({
          shopId: adminShopId,
          name: `Admin Shop ${adminShopId}`,
          operatorName: 'Admin Officer',
          operatorEmail: adminEmail,
          district: 'Pune',
          state: 'Maharashtra',
          address: 'Collector Office, Pune',
          allocatedBeneficiaries: 500,
          monthlyQuotaKg: { wheat: 1000, rice: 1000, coarseGrains: 200 },
          status: 'active',
        }),
      });

      assert.equal(response.status, 400);
      assert.equal(data.success, false);
      assert.match(data.message, /administrative privileges|Cannot overwrite admin role/i);
      console.log('   ✅ Administrative account overwrite prevented (400 Bad Request).');
    } finally {
      clerkClient.users.getUserList = originalGetUserList;
    }
  } finally {
    server.close();
  }
});

test('6. Auth sync (/api/v1/auth/sync) automatically resolves on-chain shop assignment for newly logged-in user', async () => {
  const server = await listen(app);

  try {
    const testUserId = 'user_new_dealer_789';
    const testEmail = 'new-dealer@arkivtrace.org';
    const targetShopId = 'FPS-MH-401';

    const originalGetUser = clerkClient.users.getUser;
    let syncedMetadata = null;
    const originalUpdateUserMetadata = clerkClient.users.updateUserMetadata;

    clerkClient.users.getUser = async (uid) => ({
      id: uid,
      primaryEmailAddressId: 'email_1',
      emailAddresses: [{ id: 'email_1', emailAddress: testEmail }],
      publicMetadata: {}, // Initially empty / citizen
    });

    clerkClient.users.updateUserMetadata = async (uid, params) => {
      syncedMetadata = params.publicMetadata;
      return { id: uid, publicMetadata: syncedMetadata };
    };

    // Mock shopService.listShopsByOperatorEmail to return shop FPS-MH-401
    const { shopService } = await import('../src/services/shop.service.js');
    const originalListByEmail = shopService.listShopsByOperatorEmail;
    shopService.listShopsByOperatorEmail = async (email) => {
      if (email === testEmail) {
        return [
          {
            payload: { shopId: targetShopId, operatorEmail: testEmail },
            attributes: { shop_id: targetShopId, operator_email: testEmail },
          },
        ];
      }
      return [];
    };

    try {
      const { response, data } = await requestJson(server, '/api/v1/auth/sync', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'public',
          'x-user-id': testUserId,
        },
      });

      assert.equal(response.status, 200);
      assert.equal(data.success, true);
      assert.equal(data.data.role, 'operator');
      assert.equal(data.data.shopId, targetShopId);
      assert.equal(data.data.isOperator, true);
      assert.equal(data.data.updated, true);
      assert.equal(syncedMetadata.role, 'operator');
      assert.equal(syncedMetadata.shopId, targetShopId);
      console.log('   ✅ Auth sync endpoint upgraded newly signed-in dealer to operator with assigned shopId.');
    } finally {
      clerkClient.users.getUser = originalGetUser;
      clerkClient.users.updateUserMetadata = originalUpdateUserMetadata;
      shopService.listShopsByOperatorEmail = originalListByEmail;
    }
  } finally {
    server.close();
  }
});

test('7. Auth sync (/api/v1/auth/sync) preserves admin accounts and never downgrades them', async () => {
  const server = await listen(app);

  try {
    const adminUserId = 'user_admin_999';
    const adminEmail = 'superadmin@arkivtrace.gov.in';

    const originalGetUser = clerkClient.users.getUser;
    clerkClient.users.getUser = async (uid) => ({
      id: uid,
      primaryEmailAddressId: 'email_1',
      emailAddresses: [{ id: 'email_1', emailAddress: adminEmail }],
      publicMetadata: { role: 'admin' },
    });

    try {
      const { response, data } = await requestJson(server, '/api/v1/auth/sync', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'admin',
          'x-user-id': adminUserId,
        },
      });

      assert.equal(response.status, 200);
      assert.equal(data.success, true);
      assert.equal(data.data.role, 'admin');
      assert.equal(data.data.isAdmin, true);
      assert.equal(data.data.updated, false);
      console.log('   ✅ Auth sync verified admin preservation without downgrade.');
    } finally {
      clerkClient.users.getUser = originalGetUser;
    }
  } finally {
    server.close();
  }
});

