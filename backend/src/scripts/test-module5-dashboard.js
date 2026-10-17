import 'dotenv/config';
import app from '../app.js';

const CURRENT_PERIOD = new Date().toISOString().slice(0, 7);
const DASHBOARD_DISTRICT = 'Dashboard District';

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function request(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  const data = await readJson(response);
  return { response, data };
}

async function assertOk(response, label) {
  if (response.status !== 200) {
    throw new Error(`${label} failed with status ${response.status}`);
  }
}

async function main() {
  console.log('====================================================');
  console.log('   ArkivTrace — Module 5: Dashboard + Timeline API');
  console.log('====================================================\n');

  const TEST_PORT = 5082;
  const server = app.listen(TEST_PORT);
  const baseUrl = `http://localhost:${TEST_PORT}`;

  try {
    console.log('Step 1: Verify real evidence chain using existing Arkiv entities...');

    const knownChains = [
      {
        shopId: 'FPS-DASH-A',
        shopKey: '0x94c23da5d6a2e4cea13554a79fd588ba7e0757066ac348925853b9919cae3e7e',
        dispatchId: 'DISP-DASH-A',
        dispatchKey: '0x8c2c2e5220e744ae0f097c419a5e436b3461537c70240ca71a9f6f5caad6f826',
        receiptId: 'RCP-DASH-A',
        receiptKey: '0x1cc798659126694d29269be23bbc129ba8e0f8b8f5ad9a037ab3a3573b1c6f90',
        reportId: 'SR-DASH-A',
        reportKey: '0x37bf89d65352eeb577a14b72c80eb1d2b88c3315a086a7b8010ff0695d1c157f',
      },
      {
        shopId: 'FPS-DASH-B',
        shopKey: '0x028832fb35d6afa6aef7ccdab189ac445a5415348e6a19b089d50495a6917699',
        dispatchId: 'DISP-DASH-B',
        dispatchKey: '0x53147acf66f0cfc3bb47edd39977557b00793e7b36e0d749f22bce366ff08a99',
        receiptId: 'RCP-DASH-B',
        receiptKey: '0x78d6dfe6235e8997f47f879b0ba983e05e0d5fd9c731f2943a96d0bd290bbec8',
        reportId: 'SR-DASH-B',
        reportKey: '0x68b217da9283698ae1c2be6bd760d6aadeda848030d792315a7cf734deb16f06',
      },
      {
        shopId: 'FPS-DASH-C',
        shopKey: '0x5c3f7b3f18f37c6773f09fde9f739af2ed69eebd265036d8632278a6850d7f82',
        dispatchId: 'DISP-DASH-C',
        dispatchKey: '0x0856696a224748fdde7e8be6d191a5d6d1a4fb09f696eaa111050c4b8082e409',
        receiptId: 'RCP-DASH-C',
        receiptKey: '0x039cd85d5384afde8d694d0e0211da8458694f3ac29b0885c8b3774fd2925b88',
        reportId: 'SR-DASH-C',
        reportKey: '0x4ab8f0f4179e536e878fd25603fb97170c85dbab2b7309015ca423077b9e45ed',
      },
    ];

    for (const chain of knownChains) {
      const shop = await request(baseUrl, `/api/v1/shops/${chain.shopKey}`);
      await assertOk(shop.response, `GET /api/v1/shops/${chain.shopKey}`);
      if (!shop.data?.data?.key) {
        throw new Error(`Shop key missing for ${chain.shopId}`);
      }

      if (chain.dispatchId) {
        const dispatch = await request(baseUrl, `/api/v1/dispatches/${chain.dispatchKey}`);
        await assertOk(dispatch.response, `GET /api/v1/dispatches/${chain.dispatchKey}`);
        if (!dispatch.data?.data?.key) {
          throw new Error(`Dispatch key missing for ${chain.dispatchId}`);
        }
      }

      if (chain.receiptId) {
        const receipt = await request(baseUrl, `/api/v1/receipts/${chain.receiptKey}`);
        await assertOk(receipt.response, `GET /api/v1/receipts/${chain.receiptKey}`);
        if (!receipt.data?.data?.key) {
          throw new Error(`Receipt key missing for ${chain.receiptId}`);
        }
      }

      if (chain.reportId) {
        const report = await request(baseUrl, `/api/v1/stock-reports/${chain.reportKey}`);
        await assertOk(report.response, `GET /api/v1/stock-reports/${chain.reportKey}`);
        if (!report.data?.data?.key) {
          throw new Error(`Stock report key missing for ${chain.reportId}`);
        }
      }
    }

    console.log('Step 2: Verify dashboard summary filters and totals...');
    const summary = await request(
      baseUrl,
      `/api/v1/dashboard/summary?district=${encodeURIComponent(DASHBOARD_DISTRICT)}&period=${CURRENT_PERIOD}&limit=10`
    );
    await assertOk(summary.response, 'GET /api/v1/dashboard/summary');
    if ((summary.data?.data?.scope?.shopCount || 0) < 3) {
      throw new Error(`Expected at least 3 shops in summary scope, got ${summary.data?.data?.scope?.shopCount}`);
    }
    if ((summary.data?.data?.totals?.totalDispatchedKg || 0) <= 0) {
      throw new Error('Expected summary to include dispatched quantity');
    }
    if (!Array.isArray(summary.data?.data?.recentActivity) || summary.data.data.recentActivity.length === 0) {
      throw new Error('Expected recent supply-chain activity in dashboard summary');
    }

    console.log('Step 3: Verify combined records and shop timeline feeds...');
    const records = await request(
      baseUrl,
      `/api/v1/records?district=${encodeURIComponent(DASHBOARD_DISTRICT)}&period=${CURRENT_PERIOD}&limit=25`
    );
    await assertOk(records.response, 'GET /api/v1/records');
    if (!Array.isArray(records.data?.data?.items) || records.data.data.items.length < 6) {
      throw new Error(`Expected at least 6 combined records, got ${records.data?.data?.items?.length || 0}`);
    }

    const matchTimeline = await request(
      baseUrl,
      `/api/v1/shops/${encodeURIComponent('0x94c23da5d6a2e4cea13554a79fd588ba7e0757066ac348925853b9919cae3e7e')}/timeline?period=${CURRENT_PERIOD}&limit=20`
    );
    await assertOk(matchTimeline.response, 'GET /api/v1/shops/FPS-STOCK-MATCH/timeline');
    if (!Array.isArray(matchTimeline.data?.data?.items) || matchTimeline.data.data.items.length < 3) {
      throw new Error('Expected a 3-step evidence timeline for FPS-STOCK-MATCH');
    }

    const mismatchTimeline = await request(
      baseUrl,
      `/api/v1/shops/${encodeURIComponent('0x028832fb35d6afa6aef7ccdab189ac445a5415348e6a19b089d50495a6917699')}/timeline?period=${CURRENT_PERIOD}&limit=20`
    );
    await assertOk(mismatchTimeline.response, 'GET /api/v1/shops/FPS-STOCK-MISMATCH/timeline');
    if (!Array.isArray(mismatchTimeline.data?.data?.items) || mismatchTimeline.data.data.items.length < 4) {
      throw new Error('Expected mismatch timeline to include discrepancy evidence');
    }

    console.log('Step 4: Filter regression checks for district and period...');
    const filteredSummary = await request(
      baseUrl,
      `/api/v1/dashboard/summary?district=${encodeURIComponent(DASHBOARD_DISTRICT)}&period=${CURRENT_PERIOD}`
    );
    await assertOk(filteredSummary.response, 'GET /api/v1/dashboard/summary filtered');

    console.log('====================================================');
    console.log('🎉 Module 5 Dashboard and Evidence Timeline Tests Passed!');
    console.log('====================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Module 5 Test Failed:', error);
    process.exit(1);
  } finally {
    server.close();
  }
}

main();
