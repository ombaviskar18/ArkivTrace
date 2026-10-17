import 'dotenv/config';
import app from '../app.js';

/**
 * ArkivTrace — Module 3: Shop Receipt Confirmation Test Suite
 *
 * Tests:
 *  Step 0 — Role-based auth: public user cannot POST receipt
 *  Step 1 — Zod validation: reject bad input
 *  Step 2 — Resolve a known dispatch from Module 2 tests
 *  Step 3 — Confirm receipt (no discrepancy — received == dispatched)
 *  Step 4 — Retrieve receipt by receiptId and by entityKey
 *  Step 5 — List receipts by shopId
 *  Step 6 — Confirm a second receipt with a discrepancy (major gap)
 *  Step 7 — Confirm a third receipt with a critical discrepancy
 *  Step 8 — List receipts by dispatchId
 */

async function runReceiptTests() {
  console.log('====================================================');
  console.log('   ArkivTrace — Module 3: Receipt Confirmation');
  console.log('====================================================\n');

  const TEST_PORT = 5078;
  const server = app.listen(TEST_PORT);
  const base = `http://localhost:${TEST_PORT}`;

  try {
    // -----------------------------------------------------------------
    // Step 0: Auth check — public user must not be able to POST receipt
    // -----------------------------------------------------------------
    console.log('Step 0: Auth check — unauthenticated POST /api/v1/receipts...');
    const resUnauth = await fetch(`${base}/api/v1/receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptId: 'RCP-001' }),
    });
    console.log(`   Status: ${resUnauth.status} (Expected 401)`);
    if (resUnauth.status !== 401 && resUnauth.status !== 403) {
      throw new Error(`Expected 401 or 403, got ${resUnauth.status}`);
    }
    console.log('   ✅ Unauthenticated user correctly blocked.\n');

    // -----------------------------------------------------------------
    // Step 1: Zod validation — missing required fields
    // -----------------------------------------------------------------
    console.log('Step 1: Zod validation — missing fields...');
    const resBad = await fetch(`${base}/api/v1/receipts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-role': 'operator' },
      body: JSON.stringify({ receiptId: 'bad id!' }),  // spaces/! invalid + missing fields
    });
    const jsonBad = await resBad.json();
    console.log(`   Status: ${resBad.status} (Expected 400)`);
    console.log(`   Validation errors count: ${jsonBad.details?.length || 0}`);
    if (resBad.status !== 400) {
      throw new Error(`Expected 400, got ${resBad.status}`);
    }
    console.log('   ✅ Bad input rejected by Zod.\n');

    // -----------------------------------------------------------------
    // Step 2: Create a fresh shop + dispatch so we have clean IDs
    // -----------------------------------------------------------------
    console.log('Step 2: Creating prerequisite shop and dispatch on Arkiv...');

    const shopId = `FPS-RCP-${Math.floor(1000 + Math.random() * 9000)}`;
    const dispatchId = `DISP-RCP-${Math.floor(10000 + Math.random() * 90000)}`;
    const receiptIdNoDisc = `RCP-${Math.floor(10000 + Math.random() * 90000)}`;
    const receiptIdMajor  = `RCP-${Math.floor(10000 + Math.random() * 90000)}`;
    const receiptIdCrit   = `RCP-${Math.floor(10000 + Math.random() * 90000)}`;
    const dispatchIdCrit  = `DISP-CRIT-${Math.floor(10000 + Math.random() * 90000)}`;

    // Create shop
    const resShop = await fetch(`${base}/api/v1/shops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-role': 'admin' },
      body: JSON.stringify({
        shopId,
        name: `Receipt Test Shop ${shopId}`,
        operatorName: 'Priya Nair',
        operatorAddress: '0x1234567890123456789012345678901234567890',
        district: 'South Delhi',
        state: 'Delhi',
        address: '5, Link Road, Lajpat Nagar',
        allocatedBeneficiaries: 800,
        monthlyQuotaKg: { wheat: 4000, rice: 6000, coarseGrains: 400 },
        status: 'active',
      }),
    });
    if (resShop.status !== 201) {
      throw new Error(`Failed to create shop: ${await resShop.text()}`);
    }
    console.log(`   ✅ Shop created: ${shopId}`);

    // Create dispatch (dispatched 1000 kg)
    const resDispatch = await fetch(`${base}/api/v1/dispatches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-role': 'admin' },
      body: JSON.stringify({
        dispatchId,
        shopId,
        sourceDepot: 'FCI Depot, Okhla Phase 2',
        grainType: 'wheat',
        dispatchedQuantityKg: 1000,
        truckNumber: 'DL-5Z-0001',
        driverName: 'Ramesh Kumar',
        driverPhone: '+91-9000000001',
        dispatchDate: new Date().toISOString(),
        remarks: 'Module 3 test batch',
      }),
    });
    if (resDispatch.status !== 201) {
      throw new Error(`Failed to create dispatch: ${await resDispatch.text()}`);
    }
    console.log(`   ✅ Dispatch created: ${dispatchId} (1000 kg)`);

    // Create a second dispatch for critical discrepancy test
    const resDispCrit = await fetch(`${base}/api/v1/dispatches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-role': 'admin' },
      body: JSON.stringify({
        dispatchId: dispatchIdCrit,
        shopId,
        sourceDepot: 'FCI Depot, Okhla Phase 2',
        grainType: 'rice',
        dispatchedQuantityKg: 500,
        truckNumber: 'DL-5Z-0002',
        driverName: 'Suresh Yadav',
        driverPhone: '+91-9000000002',
        dispatchDate: new Date().toISOString(),
        remarks: 'Critical discrepancy test batch',
      }),
    });
    if (resDispCrit.status !== 201) {
      throw new Error(`Failed to create critical dispatch: ${await resDispCrit.text()}`);
    }
    console.log(`   ✅ Critical-test dispatch created: ${dispatchIdCrit} (500 kg)\n`);

    // -----------------------------------------------------------------
    // Step 3: Confirm receipt — NO discrepancy (received 1000 == dispatched 1000)
    // -----------------------------------------------------------------
    console.log(`Step 3: Confirming receipt (no discrepancy) — ${receiptIdNoDisc}...`);
    const resRcpOk = await fetch(`${base}/api/v1/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'operator',
        'x-shop-id': shopId,
      },
      body: JSON.stringify({
        receiptId: receiptIdNoDisc,
        dispatchId,
        shopId,
        receivedQuantityKg: 1000,          // exactly matches dispatch
        receivedDate: new Date().toISOString(),
        receiverName: 'Priya Nair',
        remarks: 'All bags intact',
      }),
    });
    const jsonRcpOk = await resRcpOk.json();
    console.log(`   Status: ${resRcpOk.status}`);
    if (resRcpOk.status !== 201) {
      throw new Error(`Expected 201, got ${resRcpOk.status}: ${JSON.stringify(jsonRcpOk)}`);
    }
    const receiptEntityKey = jsonRcpOk.data.entityKey;
    console.log('   ✅ Receipt confirmed on Arkiv Tiramisu!');
    console.log(`   - Entity Key:         ${receiptEntityKey}`);
    console.log(`   - Tx Hash:            ${jsonRcpOk.data.txHash}`);
    console.log(`   - Discrepancy:        ${JSON.stringify(jsonRcpOk.data.discrepancy)}\n`);

    if (jsonRcpOk.data.discrepancy.detected !== false) {
      throw new Error('Expected no discrepancy, but one was detected');
    }

    // -----------------------------------------------------------------
    // Step 4: Retrieve receipt by receiptId and by entityKey
    // -----------------------------------------------------------------
    console.log(`Step 4: Retrieving receipt by receiptId (${receiptIdNoDisc})...`);
    const resGet = await fetch(`${base}/api/v1/receipts/${receiptIdNoDisc}`);
    const jsonGet = await resGet.json();
    console.log(`   Status: ${resGet.status}`);
    if (resGet.status !== 200) {
      throw new Error(`Expected 200, got ${resGet.status}: ${JSON.stringify(jsonGet)}`);
    }
    console.log(`   - receivedQuantityKg: ${jsonGet.data.payload.receivedQuantityKg} kg`);

    console.log(`\n   Retrieving by Arkiv entityKey (${receiptEntityKey})...`);
    const resGetKey = await fetch(`${base}/api/v1/receipts/${receiptEntityKey}`);
    const jsonGetKey = await resGetKey.json();
    console.log(`   Status: ${resGetKey.status}`);
    if (resGetKey.status !== 200) {
      throw new Error(`Expected 200 by key, got ${resGetKey.status}`);
    }
    console.log('   ✅ Receipt retrieved by both receiptId and entityKey!\n');

    // -----------------------------------------------------------------
    // Step 5: List receipts by shopId
    // -----------------------------------------------------------------
    console.log(`Step 5: Listing receipts for shopId=${shopId}...`);
    const resList = await fetch(`${base}/api/v1/receipts?shopId=${shopId}`);
    const jsonList = await resList.json();
    console.log(`   Status: ${resList.status}`);
    if (resList.status !== 200) {
      throw new Error(`Expected 200, got ${resList.status}: ${JSON.stringify(jsonList)}`);
    }
    console.log(`   Receipts found: ${jsonList.data.count}`);
    console.log('   ✅ List receipts by shopId succeeded.\n');

    // -----------------------------------------------------------------
    // Step 6: Receipt with MAJOR discrepancy (received 940, dispatched 1000 → 6%)
    // -----------------------------------------------------------------
    console.log(`Step 6: Confirming receipt with MAJOR discrepancy — ${receiptIdMajor}...`);
    const resRcpMajor = await fetch(`${base}/api/v1/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'operator',
        'x-shop-id': shopId,
      },
      body: JSON.stringify({
        receiptId: receiptIdMajor,
        dispatchId,
        shopId,
        receivedQuantityKg: 940,           // 60 kg short = 6% gap → major
        receivedDate: new Date().toISOString(),
        receiverName: 'Priya Nair',
        remarks: 'Two bags appeared damaged in transit',
      }),
    });
    const jsonRcpMajor = await resRcpMajor.json();
    console.log(`   Status: ${resRcpMajor.status}`);
    if (resRcpMajor.status !== 201) {
      throw new Error(`Expected 201, got ${resRcpMajor.status}: ${JSON.stringify(jsonRcpMajor)}`);
    }
    const disc = jsonRcpMajor.data.discrepancy;
    console.log('   ✅ Receipt with major discrepancy recorded!');
    console.log(`   - Discrepancy status:  ${disc.status}`);
    console.log(`   - Gap:                 ${disc.discrepancyKg} kg (${disc.discrepancyPercent}%)`);
    console.log(`   - Discrepancy txHash:  ${disc.txHash}`);
    console.log(`   - Discrepancy Explorer: ${disc.explorerUrl}\n`);

    if (disc.detected !== true || disc.status !== 'major') {
      throw new Error(`Expected major discrepancy, got: ${JSON.stringify(disc)}`);
    }

    // -----------------------------------------------------------------
    // Step 7: Receipt with CRITICAL discrepancy (received 400, dispatched 500 → 20%)
    // -----------------------------------------------------------------
    console.log(`Step 7: Confirming receipt with CRITICAL discrepancy — ${receiptIdCrit}...`);
    const resRcpCrit = await fetch(`${base}/api/v1/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'operator',
        'x-shop-id': shopId,
      },
      body: JSON.stringify({
        receiptId: receiptIdCrit,
        dispatchId: dispatchIdCrit,
        shopId,
        receivedQuantityKg: 400,           // 100 kg short = 20% gap → critical
        receivedDate: new Date().toISOString(),
        receiverName: 'Priya Nair',
        remarks: 'Multiple bags missing',
      }),
    });
    const jsonRcpCrit = await resRcpCrit.json();
    console.log(`   Status: ${resRcpCrit.status}`);
    if (resRcpCrit.status !== 201) {
      throw new Error(`Expected 201, got ${resRcpCrit.status}: ${JSON.stringify(jsonRcpCrit)}`);
    }
    const discCrit = jsonRcpCrit.data.discrepancy;
    console.log('   ✅ Receipt with critical discrepancy recorded!');
    console.log(`   - Discrepancy status:  ${discCrit.status}`);
    console.log(`   - Gap:                 ${discCrit.discrepancyKg} kg (${discCrit.discrepancyPercent}%)`);
    console.log(`   - Discrepancy txHash:  ${discCrit.txHash}`);
    console.log(`   - Discrepancy Explorer: ${discCrit.explorerUrl}\n`);

    if (discCrit.detected !== true || discCrit.status !== 'critical') {
      throw new Error(`Expected critical discrepancy, got: ${JSON.stringify(discCrit)}`);
    }

    // -----------------------------------------------------------------
    // Step 8: List receipts by dispatchId
    // -----------------------------------------------------------------
    console.log(`Step 8: Listing receipts for dispatchId=${dispatchId}...`);
    const resListByDisp = await fetch(`${base}/api/v1/receipts?dispatchId=${dispatchId}`);
    const jsonListByDisp = await resListByDisp.json();
    console.log(`   Status: ${resListByDisp.status}`);
    if (resListByDisp.status !== 200) {
      throw new Error(`Expected 200, got ${resListByDisp.status}: ${JSON.stringify(jsonListByDisp)}`);
    }
    console.log(`   Receipts found for that dispatch: ${jsonListByDisp.data.count}`);
    console.log('   ✅ List receipts by dispatchId succeeded.\n');

    console.log('====================================================');
    console.log('🎉 All Module 3 Receipt Tests Passed On Arkiv Tiramisu!');
    console.log('====================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Module 3 Test Failed:', error);
    process.exit(1);
  } finally {
    server.close();
  }
}

runReceiptTests();
