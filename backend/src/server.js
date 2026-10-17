import 'dotenv/config';
import app from './app.js';
import { arkivService } from './services/arkiv.service.js';
import { sanitizeLog } from './config/arkiv.js';
import { telegramService } from './services/telegram.service.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    const server = app.listen(PORT, async () => {
      console.log('====================================================');
      console.log(`🚀 ArkivTrace Backend Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔐 Clerk Auth: ${process.env.CLERK_SECRET_KEY ? 'configured' : 'not configured'}`);
      console.log(`🤖 Telegram Bot: ${process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'not configured'}`);
      console.log('====================================================');

      // Start Telegram Bot polling if configured and enabled
      if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_POLLING !== 'false') {
        telegramService.startPolling();
      }

      // Test Arkiv connection on startup gracefully
      try {
        const health = await arkivService.getNetworkHealth();
        console.log(`✅ Arkiv Network: ${health.network} (Chain ID: ${health.chainId})`);
        console.log(`📦 Current Block: ${health.blockNumber}`);
        console.log(`📊 Total Stored Entities: ${health.totalEntities}`);
        console.log(`🔑 Operator Wallet: ${health.wallet.address || 'Not Configured'}`);
        console.log(`💰 Wallet Balance: ${health.wallet.balance || '0 GLM'}`);
        if (!health.wallet.hasFunds) {
          console.warn('⚠️  Wallet has 0 GLM. Claim testnet tokens at https://hub.arkiv.network/faucet to enable writes.');
        }
      } catch (arkivErr) {
        console.warn(
          `⚠️  Arkiv Tiramisu RPC was unreachable on startup: ${sanitizeLog(arkivErr.message)}. ` +
          `Server will retry automatically on requests.`
        );
      }
      console.log('====================================================');
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('\nGracefully shutting down server...');
      telegramService.stopPolling();
      server.close(() => {
        console.log('Server terminated.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
};

startServer();
