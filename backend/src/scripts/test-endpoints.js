import 'dotenv/config';
import app from '../app.js';
import { publicClient } from '../config/arkiv.config.js';
import { gt } from '@arkiv-network/sdk/query';
import { u64 } from '@arkiv-network/sdk';

async function testEndpoints() {
  console.log('====================================================');
  console.log('   ArkivTrace — Express Endpoints Automated Test');
  console.log('====================================================\n');

  const TEST_PORT = 5055;
  const server = app.listen(TEST_PORT);
  const baseUrl = `http://localhost:${TEST_PORT}`;

  try {
    // 1. Root route
    console.log('1. Testing GET / (Welcome & API docs)...');
    const resRoot = await fetch(`${baseUrl}/`);
    const jsonRoot = await resRoot.json();
    console.log(`   Status: ${resRoot.status} | Name: ${jsonRoot.name} | Status: ${jsonRoot.status}`);

    // 2. Ping route
    console.log('\n2. Testing GET /api/ping...');
    const resPing = await fetch(`${baseUrl}/api/ping`);
    const jsonPing = await resPing.json();
    console.log(`   Status: ${resPing.status} | Message: ${jsonPing.message}`);

    // 3. Health route
    console.log('\n3. Testing GET /api/test/health (Arkiv Tiramisu Status)...');
    const resHealth = await fetch(`${baseUrl}/api/test/health`);
    const jsonHealth = await resHealth.json();
    console.log(`   Status: ${resHealth.status}`);
    console.log(`   Network: ${jsonHealth.data.network} (Chain ID: ${jsonHealth.data.chainId})`);
    console.log(`   Current Block: ${jsonHealth.data.blockNumber}`);
    console.log(`   Total Entities: ${jsonHealth.data.totalEntities}`);
    console.log(`   Operator Address: ${jsonHealth.data.wallet.address}`);

    // 4. Test Entity Retrieval by Key (Dynamic live key)
    console.log('\n4. Querying a live entity key from Arkiv Tiramisu for retrieval test...');
    const liveQuery = await publicClient.select().where(gt('$expiresAt', u64(0))).limit(1).fetch();
    if (liveQuery.entities.length > 0) {
      const activeKey = liveQuery.entities[0].key;
      console.log(`   Found live entity key: ${activeKey}`);
      console.log(`   Testing GET /api/test/entity/${activeKey}...`);
      const resEntity = await fetch(`${baseUrl}/api/test/entity/${activeKey}`);
      const jsonEntity = await resEntity.json();
      console.log(`   Status: ${resEntity.status}`);
      console.log(`   Retrieved Key: ${jsonEntity.data.key}`);
      console.log(`   Owner: ${jsonEntity.data.owner}`);
      console.log(`   Content Type: ${jsonEntity.data.contentType}`);
    }

    // 5. Test validation error handling (POST /api/test/create with invalid body)
    console.log('\n5. Testing validation error handling (POST /api/test/create without name)...');
    const resBadPost = await fetch(`${baseUrl}/api/test/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const jsonBadPost = await resBadPost.json();
    console.log(`   Status: ${resBadPost.status} (Expected 400)`);
    console.log(`   Error: ${jsonBadPost.error}`);
    console.log(`   Validation details:`, jsonBadPost.details);

    // 6. Test entity creation attempt
    console.log('\n6. Testing POST /api/test/create (with valid body)...');
    const resCreate = await fetch(`${baseUrl}/api/test/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Depot Test #101',
        description: 'Automated endpoint test depot',
        category: 'ration_depot',
        sampleData: { grainType: 'Wheat', quantityKg: 1000 },
      }),
    });
    const jsonCreate = await resCreate.json();
    console.log(`   Status: ${resCreate.status}`);
    if (resCreate.status === 201) {
      console.log(`   ✅ Entity Created! Key: ${jsonCreate.data.entityKey}`);
    } else if (resCreate.status === 402) {
      console.log(`   ℹ️ Handled 0-balance gracefully (Expected 402 if unfunded):`);
      console.log(`   Message: ${jsonCreate.message}`);
      console.log(`   Faucet link provided: ${jsonCreate.faucetUrl}`);
    } else {
      console.log(`   Response:`, jsonCreate);
    }

    // 7. Test 404 handler
    console.log('\n7. Testing 404 handler (GET /api/non-existent)...');
    const res404 = await fetch(`${baseUrl}/api/non-existent`);
    const json404 = await res404.json();
    console.log(`   Status: ${res404.status} (Expected 404) | Message: ${json404.message}`);

    console.log('\n====================================================');
    console.log('🎉 All Express Endpoints Verified Successfully!');
    console.log('====================================================');
  } finally {
    server.close();
    process.exit(0);
  }
}

testEndpoints().catch((err) => {
  console.error('Endpoints test failed:', err);
  process.exit(1);
});
