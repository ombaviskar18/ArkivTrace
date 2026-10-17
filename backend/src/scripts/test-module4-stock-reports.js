import 'dotenv/config';
import app from '../app.js';

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function createShop(baseUrl, suffix) {
  const shopId = `FPS-STOCK-${suffix}`;
  const response = await fetch(`${baseUrl}/api/v1/shops`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-role': 'admin',
    },
    body: JSON.stringify({
      shopId,
      name: `Stock Test Shop ${suffix}`,
      operatorName: 'Stock Operator',
      operatorAddress: '0x1234567890123456789012345678901234567890',
      district: 'Central Delhi',
      state: 'Delhi',
      address: `Shop ${suffix}, Test Market, New Delhi`,
      allocatedBeneficiaries: 1000,
      monthlyQuotaKg: { wheat: 5000, rice: 3000, coarseGrains: 500 },
      status: 'active',
    }),
  });

  const data = await readJson(response);
  if (response.status !== 201) {
    throw new Error(`Failed to create shop ${shopId}: ${JSON.stringify(data)}`);
  }

  return { shopId, entityKey: data.data.entityKey };
}

async function createDispatch(baseUrl, shopId, suffix, grainType, dispatchedQuantityKg) {
  const dispatchId = `DISP-STOCK-${suffix}`;
  const response = await fetch(`${baseUrl}/api/v1/dispatches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-role': 'admin',
    },
    body: JSON.stringify({
      dispatchId,
      shopId,
      sourceDepot: 'FCI Central Grain Depot, Okhla Phase 1',
      grainType,
      dispatchedQuantityKg,
      truckNumber: `DL-${suffix}-9876`,
      driverName: 'Mohan Lal',
      driverPhone: '+91-9876543210',
      dispatchDate: new Date().toISOString(),
      remarks: 'Module 4 integration test dispatch',
    }),
  });

  const data = await readJson(response);
  if (response.status !== 201) {
    throw new Error(`Failed to create dispatch ${dispatchId}: ${JSON.stringify(data)}`);
  }

  return { dispatchId, entityKey: data.data.entityKey };
}

async function createReceipt(baseUrl, shopId, dispatchId, suffix, receivedQuantityKg) {
  const receiptId = `RCP-STOCK-${suffix}`;
  const response = await fetch(`${baseUrl}/api/v1/receipts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-role': 'operator',
    },
    body: JSON.stringify({
      receiptId,
      dispatchId,
      shopId,
      receivedQuantityKg,
      receivedDate: new Date().toISOString(),
      receiverName: 'Stock Operator',
      remarks: 'Module 4 receipt confirmation',
    }),
  });

  const data = await readJson(response);
  if (response.status !== 201) {
    throw new Error(`Failed to create receipt ${receiptId}: ${JSON.stringify(data)}`);
  }

  return { receiptId, entityKey: data.data.entityKey };
}

async function submitStockReport(baseUrl, payload, role = 'operator', scopedShopId = payload.shopId) {
  const response = await fetch(`${baseUrl}/api/v1/stock-reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-role': role,
      'x-shop-id': scopedShopId,
    },
    body: JSON.stringify(payload),
  });

  const data = await readJson(response);
  return { response, data };
}

async function run() {
  console.log('====================================================');
  console.log('   ArkivTrace — Module 4: Stock and Distribution Reporting');
  console.log('====================================================\n');

  const TEST_PORT = 5081;
  const server = app.listen(TEST_PORT);
  const baseUrl = `http://localhost:${TEST_PORT}`;
  const period = currentPeriod();
  const previousMonth = (() => {
    const now = new Date();
    const prior = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    return prior.toISOString().slice(0, 7);
  })();

  try {
    console.log('Step 0: Auth and validation checks...');
    const blocked = await fetch(`${baseUrl}/api/v1/stock-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: 'X' }),
    });
    if (blocked.status !== 403) {
      throw new Error(`Expected 403 for unauthenticated stock report, got ${blocked.status}`);
    }

    const badValidation = await submitStockReport(baseUrl, {
      reportId: 'BAD-ID',
      shopId: 'bad id with spaces!',
      grainType: 'wheat',
      period,
      openingStockKg: -1,
      distributedKg: 1,
      closingStockKg: 1,
    }, 'admin');
    if (badValidation.response.status !== 400) {
      throw new Error(`Expected 400 for invalid stock report, got ${badValidation.response.status}`);
    }

    console.log('Step 1: Create prerequisite shops, dispatches and receipts...');
    const matchShop = await createShop(baseUrl, 'MATCH');
    const mismatchShop = await createShop(baseUrl, 'MISMATCH');
    const emptyShop = await createShop(baseUrl, 'EMPTY');

    const matchDispatch = await createDispatch(baseUrl, matchShop.shopId, 'MATCH', 'wheat', 1000);
    await createReceipt(baseUrl, matchShop.shopId, matchDispatch.dispatchId, 'MATCH', 1000);

    const mismatchDispatch = await createDispatch(baseUrl, mismatchShop.shopId, 'MISMATCH', 'rice', 500);
    await createReceipt(baseUrl, mismatchShop.shopId, mismatchDispatch.dispatchId, 'MISMATCH', 450);

    console.log('Step 2: Authorization at shop scope...');
    const shopScopeDenied = await submitStockReport(baseUrl, {
      reportId: 'SR-FAIL-SCOPE',
      shopId: matchShop.shopId,
      grainType: 'wheat',
      period,
      openingStockKg: 0,
      distributedKg: 0,
      closingStockKg: 0,
    }, 'operator', 'DIFFERENT-SHOP');
    if (shopScopeDenied.response.status !== 403) {
      throw new Error(`Expected 403 for shop scope mismatch, got ${shopScopeDenied.response.status}`);
    }

    console.log('Step 3: Matching stock report...');
    const matchReportPayload = {
      reportId: `SR-MATCH-${Date.now()}`,
      shopId: matchShop.shopId,
      grainType: 'wheat',
      period,
      openingStockKg: 0,
      distributedKg: 0,
      closingStockKg: 1000,
      remarks: 'Perfect balance test',
    };
    const matchReport = await submitStockReport(baseUrl, matchReportPayload, 'operator', matchShop.shopId);
    if (matchReport.response.status !== 201 || matchReport.data.data.stockAnalysis.stockStatus !== 'MATCH') {
      throw new Error(`Expected MATCH report, got ${matchReport.response.status}: ${JSON.stringify(matchReport.data)}`);
    }
    const matchReportKey = matchReport.data.data.entityKey;

    console.log('Step 4: Retrieve matching report by ID and entity key...');
    const byId = await fetch(`${baseUrl}/api/v1/stock-reports/${matchReportPayload.reportId}`);
    const byKey = await fetch(`${baseUrl}/api/v1/stock-reports/${matchReportKey}`);
    if (byId.status !== 200 || byKey.status !== 200) {
      throw new Error(`Failed to retrieve stock report by ID/key: ${byId.status}/${byKey.status}`);
    }

    console.log('Step 5: List reports by shopId and period...');
    const listMatch = await fetch(`${baseUrl}/api/v1/stock-reports?shopId=${encodeURIComponent(matchShop.shopId)}&period=${period}`);
    const listMatchJson = await readJson(listMatch);
    if (listMatch.status !== 200 || (listMatchJson.data?.count || 0) < 1) {
      throw new Error(`Expected filtered stock report list to return at least one record: ${JSON.stringify(listMatchJson)}`);
    }

    console.log('Step 6: Mismatching stock report with discrepancy entity...');
    const mismatchReportPayload = {
      reportId: `SR-MISMATCH-${Date.now()}`,
      shopId: mismatchShop.shopId,
      grainType: 'rice',
      period,
      openingStockKg: 0,
      distributedKg: 0,
      closingStockKg: 400,
      remarks: 'Mismatch test',
    };
    const mismatchReport = await submitStockReport(baseUrl, mismatchReportPayload, 'operator', mismatchShop.shopId);
    if (mismatchReport.response.status !== 201 || mismatchReport.data.data.stockAnalysis.stockStatus !== 'MISMATCH') {
      throw new Error(`Expected MISMATCH report, got ${mismatchReport.response.status}: ${JSON.stringify(mismatchReport.data)}`);
    }
    if (!mismatchReport.data.data.discrepancy?.detected) {
      throw new Error('Expected discrepancy entity for mismatching stock report');
    }

    console.log('Step 7: Duplicate report prevention...');
    const duplicateReport = await submitStockReport(baseUrl, {
      ...matchReportPayload,
      reportId: `SR-DUPE-${Date.now()}`,
    }, 'operator', matchShop.shopId);
    if (duplicateReport.response.status !== 409) {
      throw new Error(`Expected 409 for duplicate active report, got ${duplicateReport.response.status}`);
    }

    console.log('Step 8: Missing data returns INSUFFICIENT_DATA...');
    const insufficient = await submitStockReport(baseUrl, {
      reportId: `SR-MISSING-${Date.now()}`,
      shopId: emptyShop.shopId,
      grainType: 'wheat',
      period,
      openingStockKg: 0,
      distributedKg: 0,
      closingStockKg: 0,
      remarks: 'No receipts recorded yet',
    }, 'operator', emptyShop.shopId);
    if (insufficient.response.status !== 201 || insufficient.data.data.stockAnalysis.stockStatus !== 'INSUFFICIENT_DATA') {
      throw new Error(`Expected INSUFFICIENT_DATA report, got ${insufficient.response.status}: ${JSON.stringify(insufficient.data)}`);
    }

    console.log('Step 9: Historical zero-receipt period is allowed...');
    const historical = await submitStockReport(baseUrl, {
      reportId: `SR-HIST-${Date.now()}`,
      shopId: emptyShop.shopId,
      grainType: 'wheat',
      period: previousMonth,
      openingStockKg: 0,
      distributedKg: 0,
      closingStockKg: 0,
      remarks: 'Verified zero-receipt month',
    }, 'operator', emptyShop.shopId);
    if (historical.response.status !== 201 || historical.data.data.stockAnalysis.stockStatus !== 'MATCH') {
      throw new Error(`Expected MATCH for historical zero-receipt period, got ${historical.response.status}: ${JSON.stringify(historical.data)}`);
    }

    console.log('====================================================');
    console.log('🎉 Module 4 Stock and Distribution Tests Passed On Arkiv Tiramisu!');
    console.log('====================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Module 4 Test Failed:', error);
    process.exit(1);
  } finally {
    server.close();
  }
}

run();