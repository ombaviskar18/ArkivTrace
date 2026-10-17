import 'dotenv/config';
import { formatEther } from 'viem';
import { u64 } from '@arkiv-network/sdk';
import { gt } from '@arkiv-network/sdk/query';
import { arkivService } from '../services/arkiv.service.js';
import {
  publicClient,
  getWalletAddress,
} from '../config/arkiv.config.js';

async function main() {
  console.log('====================================================');
  console.log('      ArkivTrace — Arkiv Tiramisu Test Script');
  console.log('====================================================\n');

  try {
    // 1. Check network connectivity
    console.log('1. Checking connection to Arkiv Tiramisu RPC...');
    const health = await arkivService.getNetworkHealth();
    console.log(`   Connected to: ${health.network} (Chain ID: ${health.chainId})`);
    console.log(`   Current Block: ${health.blockNumber}`);
    console.log(`   Total Stored Entities: ${health.totalEntities}`);

    // 2. Inspect wallet status
    console.log('\n2. Inspecting Operator Wallet...');
    const walletAddress = getWalletAddress();
    console.log(`   Address: ${walletAddress || 'None configured'}`);

    if (!walletAddress) {
      console.warn('   ⚠️ No private key configured in .env.');
      return;
    }

    const balance = await publicClient.getBalance({ address: walletAddress });
    console.log(`   Balance: ${formatEther(balance)} GLM`);

    if (balance === 0n) {
      console.warn('\n   ⚠️  Wallet balance is 0 GLM (write transactions require gas).');
      console.warn('   👉 Request free testnet tokens from the faucet:');
      console.warn(`      URL:     https://hub.arkiv.network/faucet`);
      console.warn(`      Address: ${walletAddress}\n`);

      console.log('3. Demonstrating Entity Retrieval (Read Path) using live testnet data...');
      const queryResult = await publicClient.select().where(gt('$expiresAt', u64(0))).limit(1).fetch();
      
      if (queryResult.entities.length > 0) {
        const liveKey = queryResult.entities[0].key;
        console.log(`   Fetching existing live entity: ${liveKey}`);
        const retrieved = await arkivService.getEntityByKey(liveKey);

        console.log('   ✅ Live Entity Retrieved Successfully via arkivService.getEntityByKey()!');
        console.log('   Decoded Data:');
        console.log(`   - Key:          ${retrieved.key}`);
        console.log(`   - Owner:        ${retrieved.owner}`);
        console.log(`   - Content-Type: ${retrieved.contentType}`);
        console.log(`   - Attributes:  `, retrieved.attributes);
        console.log(`   - Payload:     `, retrieved.payload);
      }

      console.log('\n====================================================');
      console.log('💡 Once funded from the faucet, run this script again');
      console.log('   to test on-chain entity creation and write operations:');
      console.log('   npm run test:arkiv');
      console.log('====================================================');
      return;
    }

    // 3. Create a test entity on Arkiv (when balance > 0)
    console.log('\n3. Creating a test entity on Arkiv Tiramisu (On-Chain Write)...');
    const testPayload = {
      name: 'Delhi FPS Depot #402',
      location: 'Central Delhi',
      allocatedGrainKg: 5000,
      system: 'ArkivTrace MVP',
      verified: true,
      timestamp: new Date().toISOString(),
    };

    const testAttributes = {
      type: 'test_entity',
      category: 'ration_depot',
      name: 'Delhi FPS Depot #402',
    };

    const createResult = await arkivService.createEntity({
      payload: testPayload,
      attributes: testAttributes,
      expiresDays: 30,
    });

    console.log('   ✅ Entity Created Successfully on Arkiv Tiramisu!');
    console.log(`   Entity Key:  ${createResult.entityKey}`);
    console.log(`   Tx Hash:     ${createResult.txHash}`);
    console.log(`   Expires At:  Block #${createResult.expiresAt}`);
    console.log(`   Explorer:    https://tiramisu.explorer.arkiv.network/tx/${createResult.txHash}`);

    // 4. Retrieve the newly created entity by key
    console.log('\n4. Retrieving newly created entity by key from Arkiv (Read Path)...');
    const retrieved = await arkivService.getEntityByKey(createResult.entityKey);

    console.log('   ✅ Entity Retrieved Successfully!');
    console.log('   Decoded Data:');
    console.log(`   - Key:          ${retrieved.key}`);
    console.log(`   - Owner:        ${retrieved.owner}`);
    console.log(`   - Content-Type: ${retrieved.contentType}`);
    console.log(`   - Attributes:  `, retrieved.attributes);
    console.log(`   - Payload:     `, retrieved.payload);

    console.log('\n====================================================');
    console.log('🎉 Arkiv connection, mutation, and read tests passed!');
    console.log('====================================================');
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

main();
