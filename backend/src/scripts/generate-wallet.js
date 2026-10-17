import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log('====================================================');
console.log('   ArkivTrace — New Arkiv Wallet Generated');
console.log('====================================================');
console.log(`Private Key:   ${privateKey}`);
console.log(`Address:       ${account.address}`);
console.log('====================================================');
console.log('1. Add this private key to backend/.env:');
console.log(`   ARKIV_PRIVATE_KEY=${privateKey}`);
console.log('2. Fund this address with free testnet tokens:');
console.log('   https://hub.arkiv.network/faucet');
console.log('====================================================');
