import 'dotenv/config';
import app from '../app.js';
import { arkivService } from '../services/arkiv.service.js';

async function runV1Tests() {
  console.log('====================================================');
  console.log('   ArkivTrace — v1 Shops & Dispatches Test Suite');
  console.log('====================================================\n');

  const TEST_PORT = 5077;
  const server = app.listen(TEST_PORT);
  const baseUrl = `http://localhost:${TEST_PORT}`;

  try {
    // -----------------------------------------------------------------
    // Step 0: Verify retrieval of the newly created test entity by key
    // -----------------------------------------------------------------
    const testEntityKey = '0xf95887d9c9e0f1aea47a9f25d4627067abfb40895043365da5a17f235cea5848';
    console.log(`Step 0: Verifying retrieval of user's newly created entity (${testEntityKey})...`);
    const resTestEntity = await fetch(`${baseUrl}/api/test/entity/${testEntityKey}`);
    const jsonTestEntity = await resTestEntity.json();

    if (resTestEntity.status === 200 && jsonTestEntity.success) {
      console.log('   ✅ Successfully retrieved entity by key from Arkiv Tiramisu!');
      console.log(`   - Entity Key: ${jsonTestEntity.data.key}`);
      console.log(`   - Owner:      ${jsonTestEntity.data.owner}`);
      console.log(`   - Attributes: `, jsonTestEntity.data.attributes);
      console.log(`   - Payload:    `, jsonTestEntity.data.payload);
    } else {
      console.warn(`   ⚠️ Test entity query returned status ${resTestEntity.status}:`, jsonTestEntity);
    }

    // -----------------------------------------------------------------
    // Step 1: Authorization Checks (Role-based access control)
    // -----------------------------------------------------------------
    console.log('\nStep 1: Testing Role Authorization on Write Endpoints...');

    // 1a. POST /api/v1/shops without admin role
    const resUnauthorizedShop = await fetch(`${baseUrl}/api/v1/shops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId: 'FPS-TEST-001' }),
    });
    console.log(`   POST /api/v1/shops (No role) -> Status: ${resUnauthorizedShop.status} (Expected 401)`);
    if (resUnauthorizedShop.status !== 401 && resUnauthorizedShop.status !== 403) {
      throw new Error(`Expected 401 or 403, got ${resUnauthorizedShop.status}`);
    }

    // 1b. POST /api/v1/dispatches with operator role
    const resUnauthorizedDispatch = await fetch(`${baseUrl}/api/v1/dispatches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'operator',
      },
      body: JSON.stringify({ dispatchId: 'DISP-TEST-001' }),
    });
    console.log(`   POST /api/v1/dispatches (x-role: operator) -> Status: ${resUnauthorizedDispatch.status} (Expected 403)`);
    if (resUnauthorizedDispatch.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${resUnauthorizedDispatch.status}`);
    }
    console.log('   ✅ Role-based authorization working as expected.\n');

    // -----------------------------------------------------------------
    // Step 2: Zod Validation Checks
    // -----------------------------------------------------------------
    console.log('Step 2: Testing Zod Input Validation...');
    const resBadShop = await fetch(`${baseUrl}/api/v1/shops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'admin',
      },
      body: JSON.stringify({
        shopId: 'bad id with spaces!',
      }),
    });
    const jsonBadShop = await resBadShop.json();
    console.log(`   POST /api/v1/shops (Invalid input) -> Status: ${resBadShop.status} (Expected 400)`);
    console.log(`   Validation details count: ${jsonBadShop.details?.length || 0}`);
    if (resBadShop.status !== 400) {
      throw new Error(`Expected 400 Bad Request, got ${resBadShop.status}`);
    }
    console.log('   ✅ Zod validation rejected malformed request.\n');

    // -----------------------------------------------------------------
    // Step 3: Register Ration Shop on Arkiv Tiramisu (POST /api/v1/shops)
    // -----------------------------------------------------------------
    const uniqueShopId = `FPS-DEL-${Math.floor(1000 + Math.random() * 9000)}`;
    console.log(`Step 3: Registering Fair Price Shop on Arkiv Tiramisu (${uniqueShopId})...`);

    const shopPayload = {
      shopId: uniqueShopId,
      name: `Fair Price Shop #${uniqueShopId.slice(-4)}`,
      operatorName: 'Sunita Sharma',
      operatorAddress: '0x1234567890123456789012345678901234567890',
      district: 'Central Delhi',
      state: 'Delhi',
      address: 'Shop 12, Main Bazar, Daryaganj, New Delhi',
      allocatedBeneficiaries: 1250,
      monthlyQuotaKg: {
        wheat: 5000,
        rice: 7500,
        coarseGrains: 500,
      },
      status: 'active',
    };

    const resCreateShop = await fetch(`${baseUrl}/api/v1/shops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'admin',
      },
      body: JSON.stringify(shopPayload),
    });

    const jsonCreateShop = await resCreateShop.json();
    console.log(`   Status: ${resCreateShop.status}`);
    if (resCreateShop.status !== 201) {
      throw new Error(`Failed to create shop on Arkiv: ${JSON.stringify(jsonCreateShop)}`);
    }

    const shopEntityKey = jsonCreateShop.data.entityKey;
    const shopTxHash = jsonCreateShop.data.txHash;
    console.log('   ✅ Shop Created On-Chain Successfully!');
    console.log(`   - Entity Key:  ${shopEntityKey}`);
    console.log(`   - Tx Hash:     ${shopTxHash}`);
    console.log(`   - Explorer:    https://tiramisu.explorer.arkiv.network/tx/${shopTxHash}`);
    console.log(`   - Attributes: `, jsonCreateShop.data.attributes);

    // -----------------------------------------------------------------
    // Step 4: Retrieve Shop by shopId and by entityKey
    // -----------------------------------------------------------------
    console.log(`\nStep 4: Retrieving Shop by shopId (${uniqueShopId})...`);
    const resGetShopById = await fetch(`${baseUrl}/api/v1/shops/${uniqueShopId}`);
    const jsonGetShopById = await resGetShopById.json();
    console.log(`   Status: ${resGetShopById.status}`);
    if (resGetShopById.status !== 200) {
      throw new Error(`Failed to get shop by ID: ${JSON.stringify(jsonGetShopById)}`);
    }
    console.log(`   - Name:     ${jsonGetShopById.data.payload.name}`);
    console.log(`   - District: ${jsonGetShopById.data.payload.district}`);
    console.log(`   - Quota:   `, jsonGetShopById.data.payload.monthlyQuotaKg);

    console.log(`\n   Retrieving Shop by Arkiv Entity Key (${shopEntityKey})...`);
    const resGetShopByKey = await fetch(`${baseUrl}/api/v1/shops/${shopEntityKey}`);
    const jsonGetShopByKey = await resGetShopByKey.json();
    console.log(`   Status: ${resGetShopByKey.status}`);
    if (resGetShopByKey.status !== 200) {
      throw new Error(`Failed to get shop by key: ${JSON.stringify(jsonGetShopByKey)}`);
    }
    console.log('   ✅ Shop successfully retrieved by both shopId and entityKey!\n');

    // -----------------------------------------------------------------
    // Step 5: List Shops (GET /api/v1/shops)
    // -----------------------------------------------------------------
    console.log('Step 5: Querying Shops List (GET /api/v1/shops?district=Central+Delhi)...');
    const resListShops = await fetch(`${baseUrl}/api/v1/shops?district=Central%20Delhi`);
    const jsonListShops = await resListShops.json();
    console.log(`   Status: ${resListShops.status}`);
    if (resListShops.status !== 200) {
      throw new Error(`Expected 200 for shops list, got ${resListShops.status}: ${JSON.stringify(jsonListShops)}`);
    }
    console.log(`   Total Shops Found: ${jsonListShops.data?.count || 0}`);
    console.log('   ✅ Query by project=arkivtrace & district succeeded.\n');

    // -----------------------------------------------------------------
    // Step 6: Create Grain Dispatch on Arkiv Tiramisu (POST /api/v1/dispatches)
    // -----------------------------------------------------------------
    const uniqueDispatchId = `DISP-${Math.floor(10000 + Math.random() * 90000)}`;
    console.log(`Step 6: Recording Grain Dispatch on Arkiv Tiramisu (${uniqueDispatchId})...`);

    const dispatchPayload = {
      dispatchId: uniqueDispatchId,
      shopId: uniqueShopId,
      sourceDepot: 'FCI Central Grain Depot, Okhla Phase 1',
      grainType: 'wheat',
      dispatchedQuantityKg: 1000,
      truckNumber: 'DL-1AA-9876',
      driverName: 'Mohan Lal',
      driverPhone: '+91-9876543210',
      dispatchDate: new Date().toISOString(),
      remarks: 'Monthly wheat allocation batch A-1',
    };

    const resCreateDispatch = await fetch(`${baseUrl}/api/v1/dispatches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-role': 'admin',
      },
      body: JSON.stringify(dispatchPayload),
    });

    const jsonCreateDispatch = await resCreateDispatch.json();
    console.log(`   Status: ${resCreateDispatch.status}`);
    if (resCreateDispatch.status !== 201) {
      throw new Error(`Failed to create dispatch on Arkiv: ${JSON.stringify(jsonCreateDispatch)}`);
    }

    const dispatchEntityKey = jsonCreateDispatch.data.entityKey;
    const dispatchTxHash = jsonCreateDispatch.data.txHash;
    console.log('   ✅ Grain Dispatch Recorded On-Chain Successfully!');
    console.log(`   - Entity Key:  ${dispatchEntityKey}`);
    console.log(`   - Tx Hash:     ${dispatchTxHash}`);
    console.log(`   - Explorer:    https://tiramisu.explorer.arkiv.network/tx/${dispatchTxHash}`);
    console.log(`   - Attributes: `, jsonCreateDispatch.data.attributes);

    // -----------------------------------------------------------------
    // Step 7: Retrieve Dispatch by dispatchId and by entityKey
    // -----------------------------------------------------------------
    console.log(`\nStep 7: Retrieving Dispatch by dispatchId (${uniqueDispatchId})...`);
    const resGetDispatchById = await fetch(`${baseUrl}/api/v1/dispatches/${uniqueDispatchId}`);
    const jsonGetDispatchById = await resGetDispatchById.json();
    console.log(`   Status: ${resGetDispatchById.status}`);
    if (resGetDispatchById.status !== 200) {
      throw new Error(`Failed to get dispatch by ID: ${JSON.stringify(jsonGetDispatchById)}`);
    }
    console.log(`   - Depot:     ${jsonGetDispatchById.data.payload.sourceDepot}`);
    console.log(`   - Grain:     ${jsonGetDispatchById.data.payload.grainType}`);
    console.log(`   - Quantity:  ${jsonGetDispatchById.data.payload.dispatchedQuantityKg} kg`);
    console.log(`   - Truck:     ${jsonGetDispatchById.data.payload.truckNumber}`);

    console.log(`\n   Retrieving Dispatch by Arkiv Entity Key (${dispatchEntityKey})...`);
    const resGetDispatchByKey = await fetch(`${baseUrl}/api/v1/dispatches/${dispatchEntityKey}`);
    const jsonGetDispatchByKey = await resGetDispatchByKey.json();
    console.log(`   Status: ${resGetDispatchByKey.status}`);
    if (resGetDispatchByKey.status !== 200) {
      throw new Error(`Failed to get dispatch by key: ${JSON.stringify(jsonGetDispatchByKey)}`);
    }
    console.log('   ✅ Dispatch successfully retrieved by both dispatchId and entityKey!\n');

    // -----------------------------------------------------------------
    // Step 8: List Dispatches (GET /api/v1/dispatches?shopId=...)
    // -----------------------------------------------------------------
    console.log(`Step 8: Querying Dispatches List for shopId=${uniqueShopId}...`);
    const resListDispatches = await fetch(`${baseUrl}/api/v1/dispatches?shopId=${uniqueShopId}`);
    const jsonListDispatches = await resListDispatches.json();
    console.log(`   Status: ${resListDispatches.status}`);
    if (resListDispatches.status !== 200) {
      throw new Error(`Expected 200 for dispatches list, got ${resListDispatches.status}: ${JSON.stringify(jsonListDispatches)}`);
    }
    console.log(`   Total Dispatches Found: ${jsonListDispatches.data?.count || 0}`);
    console.log('   ✅ Query by project=arkivtrace, type=dispatch, shopId succeeded.\n');

    console.log('====================================================');
    console.log('🎉 All Shop and Dispatch Tests Passed On Arkiv Tiramisu!');
    console.log('====================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ v1 Modules Test Failed:', error);
    process.exit(1);
  } finally {
    server.close();
  }
}

runV1Tests();
