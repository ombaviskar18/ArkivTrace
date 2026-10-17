import { Router } from 'express';
import { telegramController } from '../controllers/telegram.controller.js';
import { requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// 1. Generate one-time code to link Telegram (Clerk-authenticated operator or admin)
router.post('/link-code', requireRole(['admin', 'operator']), telegramController.createLinkCode);

// 2. Check current user's linking status
router.get('/status', requireRole(['admin', 'operator']), telegramController.getLinkStatus);

// 3. Trigger pending dispatch reminder check (Admin only)
router.post('/check-reminders', requireRole(['admin']), telegramController.checkReminders);

// 4. Webhook endpoint for Telegram updates (when using webhooks instead of polling)
router.post('/webhook', telegramController.handleWebhook);

export default router;
