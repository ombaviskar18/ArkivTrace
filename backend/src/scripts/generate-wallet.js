import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

console.log('====================================================');
console.log('      ArkivTrace — Wallet Generator');
console.log('====================================================');

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log('Generated New Wallet for Arkiv Tiramisu Testnet:');
console.log(`\nAddress:     ${account.address}`);
console.log(`Private Key: ${privateKey}\n`);
console.log('Next Steps:');
console.log('1. Copy the private key above and paste it into backend/.env:');
console.log(`   ARKIV_PRIVATE_KEY=${privateKey}`);
console.log('2. Request free testnet GLM tokens to pay for gas:');
console.log(`   Faucet URL: https://hub.arkiv.network/faucet`);
console.log(`   Recipient:  ${account.address}`);
console.log('====================================================');
