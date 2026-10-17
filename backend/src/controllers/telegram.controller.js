import { telegramStore } from '../services/telegram.store.js';
import { telegramService } from '../services/telegram.service.js';

export const telegramController = {
  /**
   * POST /api/v1/telegram/link-code
   * Generate a one-time code to link the authenticated Clerk user's Telegram chat
   */
  async createLinkCode(req, res, next) {
    try {
      const clerkUserId = req.clerkUserId || 'demo-user';
      const role = req.userRole;
      const assignedShopIds = req.assignedShopIds || [];

      const { code, expiresAt } = telegramStore.createLinkCode({
        clerkUserId,
        role,
        assignedShopIds,
        ttlMinutes: 15,
      });

      return res.status(201).json({
        success: true,
        message: 'Telegram link code generated successfully',
        data: {
          code,
          expiresAt,
          instructions: `Open Telegram, search for your ArkivTrace bot, and send: /link ${code}`,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/telegram/status
   * Check if current authenticated user has a linked Telegram chat
   */
  async getLinkStatus(req, res, next) {
    try {
      const clerkUserId = req.clerkUserId;
      const chatId = clerkUserId ? telegramStore.getChatIdByClerkUserId(clerkUserId) : null;

      return res.status(200).json({
        success: true,
        data: {
          isLinked: Boolean(chatId),
          telegramChatId: chatId || null,
          role: req.userRole,
          assignedShopIds: req.assignedShopIds || [],
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/telegram/check-reminders
   * Trigger pending dispatch reminder checks (Admin only or scheduled job)
   */
  async checkReminders(req, res, next) {
    try {
      const result = await telegramService.checkPendingDispatchesAndSendReminders();
      return res.status(200).json({
        success: true,
        message: 'Pending dispatch reminders check complete',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/telegram/webhook (Optional Webhook support)
   */
  async handleWebhook(req, res, next) {
    try {
      const update = req.body;
      if (update && update.update_id) {
        // Asynchronously process without blocking Telegram response
        setImmediate(async () => {
          await telegramService.processUpdate(update);
        });
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
};
