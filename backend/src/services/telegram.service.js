import { telegramStore } from './telegram.store.js';
import { shopService } from './shop.service.js';
import { dispatchService } from './dispatch.service.js';
import { arkivService } from './arkiv.service.js';
import { dashboardService } from './dashboard.service.js';

const EXPLORER_BASE = 'https://tiramisu.explorer.arkiv.network';

/**
 * Telegram Bot Service
 * Handles outbound Telegram notifications, public bot commands,
 * secure one-time code linking, and reminder scheduling.
 */
class TelegramService {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN || null;
    this.isPolling = false;
    this.pollingOffset = 0;
    this.pollingInterval = null;
    this.reminderInterval = null;
  }

  // --- Telegram API HTTP wrapper ---
  async _callApi(method, body = {}) {
    if (!this.token) {
      return { ok: false, description: 'TELEGRAM_BOT_TOKEN not configured' };
    }
    const url = `https://api.telegram.org/bot${this.token}/${method}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn(`[TelegramService] API call failed for ${method}:`, err.message);
      return { ok: false, error: err.message };
    }
  }

  async sendMessage(chatId, text, options = {}) {
    if (!chatId || !text) return false;
    try {
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...options,
      };
      const res = await this._callApi('sendMessage', payload);
      return res.ok === true;
    } catch (err) {
      console.warn(`[TelegramService] Could not send message to ${chatId}:`, err.message);
      return false;
    }
  }

  // --- Feature 1: Notify assigned shop operator after dispatch persisted on Arkiv ---
  async notifyDispatchCreated(dispatchRecord) {
    try {
      const { dispatchId, shopId, grainType, dispatchedQuantityKg, truckNumber, entityKey, txHash } = dispatchRecord;

      if (!dispatchId || !shopId) return;
      if (telegramStore.hasNotifiedDispatch(dispatchId)) {
        return; // Prevent duplicate notification
      }

      const operatorChatIds = telegramStore.getOperatorChatIdsForShop(shopId);
      const subscriberChatIds = telegramStore.getSubscribersForShop(shopId);
      const allRecipientChats = Array.from(new Set([...operatorChatIds, ...subscriberChatIds]));

      const explorerTx = txHash ? `${EXPLORER_BASE}/tx/${txHash}` : null;
      const explorerEntity = entityKey ? `${EXPLORER_BASE}/entity/${entityKey}` : null;

      const operatorMsg = [
        `🚚 <b>New Grain Dispatch Alert</b>`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `📍 <b>Destination Shop:</b> <code>${shopId}</code>`,
        `📦 <b>Dispatch ID:</b> <code>${dispatchId}</code>`,
        `🌾 <b>Grain Type:</b> ${grainType || 'wheat'}`,
        `⚖️ <b>Quantity:</b> <b>${dispatchedQuantityKg} kg</b>`,
        truckNumber ? `🚛 <b>Truck No:</b> ${truckNumber}` : '',
        `━━━━━━━━━━━━━━━━━━━━`,
        `🔗 <b>Arkiv Evidence:</b>`,
        explorerEntity ? `• <a href="${explorerEntity}">View Entity on Arkiv</a>` : '',
        explorerTx ? `• <a href="${explorerTx}">View On-Chain Tx</a>` : '',
        `\n⚠️ <i>Please inspect upon arrival and submit receipt confirmation via the ArkivTrace portal.</i>`,
      ].filter(Boolean).join('\n');

      for (const chatId of allRecipientChats) {
        await this.sendMessage(chatId, operatorMsg);
      }

      telegramStore.markDispatchNotified(dispatchId);
    } catch (err) {
      console.warn('[TelegramService] Error in notifyDispatchCreated:', err.message);
    }
  }

  // --- Feature 2: Alert admins when a major/critical discrepancy is recorded ---
  async notifyDiscrepancyRecorded(discrepancyRecord) {
    try {
      const {
        discrepancyId,
        shopId,
        discrepancyStatus,
        severity,
        discrepancyKg,
        discrepancyPercent,
        dispatchedQuantityKg,
        receivedQuantityKg,
        stockDifferenceKg,
        entityKey,
        txHash,
        evidenceEntityKeys,
        receiptId,
        dispatchId,
        reportId,
      } = discrepancyRecord;

      const caseSeverity = (severity || discrepancyStatus || 'major').toLowerCase();
      // Only alert on major or critical discrepancies
      if (!['major', 'critical', 'stock_mismatch'].includes(caseSeverity)) {
        return;
      }

      const uniqueId = discrepancyId || `DISC-${entityKey || Date.now()}`;
      if (telegramStore.hasNotifiedDiscrepancy(uniqueId)) {
        return; // Prevent duplicate alerts
      }

      const adminChatIds = telegramStore.getAdminChatIds();
      if (!adminChatIds.length) {
        telegramStore.markDiscrepancyNotified(uniqueId);
        return;
      }

      const isCritical = caseSeverity === 'critical';
      const icon = isCritical ? '🚨 CRITICAL' : '⚠️ MAJOR';

      const explorerTx = txHash ? `${EXPLORER_BASE}/tx/${txHash}` : null;
      const explorerEntity = entityKey ? `${EXPLORER_BASE}/entity/${entityKey}` : null;

      const lines = [
        `${icon} <b>DISCREPANCY ALERT</b>`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🆔 <b>Case ID:</b> <code>${uniqueId}</code>`,
        shopId ? `📍 <b>Shop ID:</b> <code>${shopId}</code>` : '',
        `⚡ <b>Severity:</b> <b>${caseSeverity.toUpperCase()}</b>`,
      ];

      if (discrepancyKg !== undefined && discrepancyPercent !== undefined) {
        lines.push(`📉 <b>Transit Gap:</b> <b>${discrepancyKg} kg</b> (${discrepancyPercent}%)`);
        if (dispatchedQuantityKg !== undefined && receivedQuantityKg !== undefined) {
          lines.push(`📦 Dispatched: ${dispatchedQuantityKg} kg | Received: ${receivedQuantityKg} kg`);
        }
      } else if (stockDifferenceKg !== undefined) {
        lines.push(`📉 <b>Stock Difference:</b> <b>${stockDifferenceKg} kg</b>`);
      }

      if (dispatchId) lines.push(`🚚 Linked Dispatch: <code>${dispatchId}</code>`);
      if (receiptId) lines.push(`📥 Linked Receipt: <code>${receiptId}</code>`);
      if (reportId) lines.push(`📊 Linked Stock Report: <code>${reportId}</code>`);

      lines.push(`━━━━━━━━━━━━━━━━━━━━`);
      lines.push(`🔗 <b>On-Chain Evidence:</b>`);
      if (explorerEntity) lines.push(`• <a href="${explorerEntity}">Discrepancy Entity</a>`);
      if (explorerTx) lines.push(`• <a href="${explorerTx}">Transaction Hash</a>`);

      if (Array.isArray(evidenceEntityKeys) && evidenceEntityKeys.length > 0) {
        lines.push(`• Evidence Keys: <code>${evidenceEntityKeys.slice(0, 3).join(', ')}</code>`);
      }

      lines.push(`\n🛡️ <i>Log into the Admin Portal to review and publish resolution events.</i>`);

      const adminMsg = lines.filter(Boolean).join('\n');
      for (const chatId of adminChatIds) {
        await this.sendMessage(chatId, adminMsg);
      }

      telegramStore.markDiscrepancyNotified(uniqueId);
    } catch (err) {
      console.warn('[TelegramService] Error in notifyDiscrepancyRecorded:', err.message);
    }
  }

  // --- Feature 3: Send limited reminders for dispatches awaiting receipt confirmation ---
  async checkPendingDispatchesAndSendReminders({ maxReminders = 3 } = {}) {
    try {
      // Find dispatches with status 'dispatched'
      const dispatchResult = await dispatchService.listDispatches({ status: 'dispatched', limit: 20 });
      const pendingDispatches = dispatchResult.entities || [];

      let remindersCount = 0;

      for (const entity of pendingDispatches) {
        const payload = entity.payload || {};
        const dispatchId = payload.dispatchId || entity.attributes?.dispatch_id;
        const shopId = payload.shopId || entity.attributes?.shop_id;

        if (!dispatchId || !shopId) continue;

        // Check reminder count to avoid reminder spam
        const sentCount = telegramStore.getReminderCount(dispatchId);
        if (sentCount >= maxReminders) {
          continue;
        }

        // Check if a receipt already exists for this dispatch
        const receipts = await arkivService.queryEntities({
          expressions: [
            { type: 'eq', field: 'project', value: 'arkivtrace' },
            { type: 'eq', field: 'type', value: 'receipt' },
            { type: 'eq', field: 'dispatch_id', value: dispatchId },
          ],
          limit: 1,
        });

        if (receipts.entities && receipts.entities.length > 0) {
          continue; // Already confirmed
        }

        const operatorChats = telegramStore.getOperatorChatIdsForShop(shopId);
        if (!operatorChats.length) continue;

        const reminderMsg = [
          `⏰ <b>Receipt Confirmation Reminder (${sentCount + 1}/${maxReminders})</b>`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `📍 <b>Shop ID:</b> <code>${shopId}</code>`,
          `📦 <b>Dispatch ID:</b> <code>${dispatchId}</code>`,
          `🌾 <b>Grain:</b> ${payload.grainType || 'Grain'} (${payload.dispatchedQuantityKg || 0} kg)`,
          `📅 <b>Dispatched:</b> ${payload.dispatchDate ? new Date(payload.dispatchDate).toLocaleDateString() : 'Recent'}`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `⚠️ <i>This dispatch is awaiting physical receipt confirmation. Please confirm upon delivery.</i>`,
        ].join('\n');

        for (const chatId of operatorChats) {
          await this.sendMessage(chatId, reminderMsg);
        }

        telegramStore.incrementReminderCount(dispatchId);
        remindersCount++;
      }

      return { checked: pendingDispatches.length, remindersSent: remindersCount };
    } catch (err) {
      console.warn('[TelegramService] Error in checkPendingDispatchesAndSendReminders:', err.message);
      return { checked: 0, remindersSent: 0, error: err.message };
    }
  }

  // --- Feature 4: Public /shop SHOP_ID command handler ---
  async handleShopCommand(chatId, shopIdArg) {
    if (!shopIdArg) {
      return await this.sendMessage(
        chatId,
        `❌ <b>Usage:</b> <code>/shop SHOP_ID</code>\n\nExample: <code>/shop FPS-DEL-1001</code>`
      );
    }

    const shopId = shopIdArg.trim().toUpperCase();
    const shop = await shopService.getShopById(shopId);
    const timelineData = await dashboardService.getShopTimeline(shopId, { limit: 5 });
    const items = timelineData?.items || [];

    if (!shop && items.length === 0) {
      return await this.sendMessage(
        chatId,
        `🔍 <b>Shop Not Found:</b>\nNo ration shop with ID <code>${shopId}</code> was found registered on Arkiv Tiramisu.`
      );
    }

    const p = shop?.payload || {};
    const districtText = p.district || items[0]?.district || 'N/A';
    const stateText = p.state || 'N/A';

    // Filter recent dispatches, stock reports, and discrepancies
    const recentDispatches = items.filter((i) => i.recordType === 'dispatch').slice(0, 3);
    const recentStockReports = items.filter((i) => i.recordType === 'stock_report').slice(0, 2);
    const recentDiscrepancies = items.filter((i) => i.recordType === 'discrepancy').slice(0, 2);

    const msgLines = [
      `🏛️ <b>Fair Price Shop Overview</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🏷️ <b>Name:</b> ${p.name || `Fair Price Shop (${shopId})`}`,
      `📍 <b>ID:</b> <code>${shopId}</code>`,
      `🗺️ <b>District:</b> ${districtText}${stateText !== 'N/A' ? `, ${stateText}` : ''}`,
      `👥 <b>Beneficiaries:</b> ${p.allocatedBeneficiaries || 'N/A'}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🚚 <b>Recent Dispatches:</b>`,
    ];

    if (recentDispatches.length === 0) {
      msgLines.push(`• No recent dispatches recorded on-chain`);
    } else {
      for (const d of recentDispatches) {
        msgLines.push(`• ${d.grainType || 'Grain'}: <b>${d.quantityKg || 0} kg</b> (ID: <code>${d.identifier || d.entityKey.slice(0, 10)}...</code>)`);
      }
    }

    msgLines.push(`\n📊 <b>Reported Stock Balances:</b>`);
    if (recentStockReports.length === 0) {
      msgLines.push(`• No stock reports recorded`);
    } else {
      for (const sr of recentStockReports) {
        const statusIcon = sr.stockStatus === 'MATCH' ? '✅' : '⚠️';
        msgLines.push(`• Period ${sr.period || 'N/A'}: ${statusIcon} <b>${sr.stockStatus}</b> (Distributed: ${sr.distributedKg || 0} kg)`);
      }
    }

    msgLines.push(`\n⚠️ <b>Discrepancy Status:</b>`);
    if (recentDiscrepancies.length === 0) {
      msgLines.push(`• ✅ No open discrepancies on record`);
    } else {
      for (const dc of recentDiscrepancies) {
        msgLines.push(`• 🚨 <b>${(dc.severity || dc.discrepancyStatus || 'mismatch').toUpperCase()}</b> (Status: ${dc.caseStatus || 'open'})`);
      }
    }

    const explorerKey = shop?.key || items[0]?.entityKey;
    if (explorerKey) {
      msgLines.push(`\n🔗 <a href="${EXPLORER_BASE}/entity/${explorerKey}">View Shop on Arkiv Explorer</a>`);
    }
    msgLines.push(`\n<i>Tip: Use <code>/subscribe ${shopId}</code> to receive updates for this shop.</i>`);

    await this.sendMessage(chatId, msgLines.join('\n'));
  }

  // --- Feature 5: Public /proof RECORD_ID command handler ---
  async handleProofCommand(chatId, recordIdArg) {
    if (!recordIdArg) {
      return await this.sendMessage(
        chatId,
        `❌ <b>Usage:</b> <code>/proof RECORD_ID</code>\n\nProvide an Arkiv 0x entity key, dispatch ID, receipt ID, or report ID.\nExample: <code>/proof 0x189763...</code> or <code>/proof DISP-12345</code>`
      );
    }

    const id = recordIdArg.trim();
    let entity = null;

    // 1. Direct hex key check
    if (/^0x[0-9a-fA-F]{64}$/.test(id)) {
      entity = await arkivService.getEntityByKey(id);
    } else {
      // 2. Query by attribute
      const query = await arkivService.queryEntities({
        expressions: [
          { type: 'eq', field: 'project', value: 'arkivtrace' },
        ],
        limit: 20,
      });

      const found = (query.entities || []).find((e) => {
        const attrs = e.attributes || {};
        return (
          attrs.dispatch_id === id ||
          attrs.receipt_id === id ||
          attrs.report_id === id ||
          attrs.discrepancy_id === id ||
          attrs.shop_id === id
        );
      });
      entity = found || null;
    }

    if (!entity) {
      return await this.sendMessage(
        chatId,
        `🔍 <b>Record Not Found on Arkiv</b>\nNo verified on-chain supply-chain record was found matching <code>${id}</code>.`
      );
    }

    const type = entity.attributes?.type || 'record';
    const payload = entity.payload || {};
    const explorerLink = `${EXPLORER_BASE}/entity/${entity.key}`;

    const lines = [
      `📜 <b>ArkivTrace Web3 Supply-Chain Proof</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🏷️ <b>Record Type:</b> <b>${type.toUpperCase()}</b>`,
      `🔑 <b>Arkiv Entity Key:</b> <code>${entity.key}</code>`,
      entity.owner ? `👤 <b>Owner:</b> <code>${entity.owner}</code>` : '',
      `━━━━━━━━━━━━━━━━━━━━`,
      `📋 <b>Record Details:</b>`,
    ];

    if (type === 'dispatch') {
      lines.push(`• Dispatch ID: <code>${payload.dispatchId}</code>`);
      lines.push(`• Destination Shop: <code>${payload.shopId}</code>`);
      lines.push(`• Grain Type: ${payload.grainType}`);
      lines.push(`• Dispatched: <b>${payload.dispatchedQuantityKg} kg</b>`);
      lines.push(`• Status: ${payload.status}`);
    } else if (type === 'receipt') {
      lines.push(`• Receipt ID: <code>${payload.receiptId}</code>`);
      lines.push(`• Dispatch Ref: <code>${payload.dispatchId}</code>`);
      lines.push(`• Received: <b>${payload.receivedQuantityKg} kg</b>`);
      lines.push(`• Discrepancy: ${payload.discrepancyStatus || 'none'}`);
    } else if (type === 'stock_report') {
      lines.push(`• Report ID: <code>${payload.reportId}</code>`);
      lines.push(`• Period: ${payload.period}`);
      lines.push(`• Stock Status: <b>${payload.stockStatus}</b>`);
      lines.push(`• Closing Stock: ${payload.closingStockKg} kg`);
    } else if (type === 'discrepancy') {
      lines.push(`• Discrepancy ID: <code>${payload.discrepancyId}</code>`);
      lines.push(`• Severity: <b>${payload.severity || payload.discrepancyStatus}</b>`);
      lines.push(`• Resolution: ${payload.resolutionStatus || payload.caseStatus}`);
    } else {
      lines.push(`• Status: Active on Arkiv`);
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🌐 <b>Immutable Blockchain Explorer Proof:</b>`);
    lines.push(`• <a href="${explorerLink}">Verify on Arkiv Explorer</a>`);

    await this.sendMessage(chatId, lines.filter(Boolean).join('\n'));
  }

  // --- Feature 6 (Bonus): Citizen Shop Subscriptions ---
  async handleSubscribeCommand(chatId, shopIdArg) {
    if (!shopIdArg) {
      return await this.sendMessage(
        chatId,
        `❌ <b>Usage:</b> <code>/subscribe SHOP_ID</code>\n\nExample: <code>/subscribe FPS-DEL-1001</code>`
      );
    }
    const shopId = shopIdArg.trim().toUpperCase();
    const shop = await shopService.getShopById(shopId);
    let shopName = shop?.payload?.name;

    if (!shop) {
      const timelineData = await dashboardService.getShopTimeline(shopId, { limit: 1 });
      if (!timelineData?.items?.length) {
        return await this.sendMessage(
          chatId,
          `🔍 <b>Shop Not Found:</b> No shop with ID <code>${shopId}</code> registered on Arkiv.`
        );
      }
      shopName = `Fair Price Shop (${shopId})`;
    }

    const added = telegramStore.subscribeCitizen(shopId, chatId);
    if (added) {
      await this.sendMessage(
        chatId,
        `🔔 <b>Subscribed!</b>\nYou will receive public dispatch updates for shop <code>${shopId}</code> (${shopName || 'Fair Price Shop'}).\n\nTo unsubscribe anytime, send: <code>/unsubscribe ${shopId}</code>`
      );
    } else {
      await this.sendMessage(chatId, `ℹ️ You are already subscribed to updates for shop <code>${shopId}</code>.`);
    }
  }

  async handleUnsubscribeCommand(chatId, shopIdArg) {
    if (!shopIdArg) {
      return await this.sendMessage(
        chatId,
        `❌ <b>Usage:</b> <code>/unsubscribe SHOP_ID</code>`
      );
    }
    const shopId = shopIdArg.trim().toUpperCase();
    const removed = telegramStore.unsubscribeCitizen(shopId, chatId);
    if (removed) {
      await this.sendMessage(chatId, `🔕 <b>Unsubscribed!</b>\nYou will no longer receive updates for shop <code>${shopId}</code>.`);
    } else {
      await this.sendMessage(chatId, `ℹ️ You were not subscribed to shop <code>${shopId}</code>.`);
    }
  }

  // --- Secure Account Linking with One-Time Codes ---
  async handleLinkCommand(chatId, codeArg) {
    if (!codeArg) {
      return await this.sendMessage(
        chatId,
        `🔑 <b>Account Linking:</b>\nTo link this Telegram chat with your verified Clerk role, generate a one-time code from the ArkivTrace portal and send:\n\n<code>/link 123456</code>`
      );
    }

    const code = codeArg.trim();
    const result = telegramStore.consumeLinkCode(code, chatId);

    if (!result) {
      return await this.sendMessage(chatId, `❌ <b>Invalid Code:</b> The code is invalid or has already been used.`);
    }
    if (result.error === 'EXPIRED') {
      return await this.sendMessage(chatId, `⏳ <b>Code Expired:</b> This linking code has expired. Please generate a new one.`);
    }

    const roleName = result.role === 'admin' ? 'Supply Chain Admin' : 'Shop Operator';
    const shopInfo = result.assignedShopIds?.length
      ? `\n📍 <b>Assigned Shop(s):</b> <code>${result.assignedShopIds.join(', ')}</code>`
      : '';

    await this.sendMessage(
      chatId,
      `✅ <b>Account Successfully Linked!</b>\n━━━━━━━━━━━━━━━━━━━━\n👤 <b>Role:</b> <b>${roleName}</b>${shopInfo}\n\nYou will now receive direct notifications for dispatches, reminders, and alerts based on your verified Clerk credentials.`
    );
  }

  // --- Handle Incoming Telegram Updates ---
  async processUpdate(update) {
    const msg = update.message;
    if (!msg || !msg.text) return;

    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const parts = text.split(/\s+/);
    const command = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    if (command === '/start' || command === '/help') {
      const welcome = [
        `🌾 <b>Welcome to ArkivTrace Bot</b>`,
        `<i>Blockchain-Powered Ration Distribution Transparency System for India</i>`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `<b>Public Citizen Commands:</b>`,
        `• <code>/shop SHOP_ID</code> — Inspect recent dispatches, stock & discrepancies`,
        `• <code>/proof RECORD_ID</code> — View verified on-chain Arkiv evidence & explorer link`,
        `• <code>/subscribe SHOP_ID</code> — Subscribe to public updates for a ration shop`,
        `• <code>/unsubscribe SHOP_ID</code> — Unsubscribe from shop updates`,
        ``,
        `<b>Operator / Admin Commands:</b>`,
        `• <code>/link CODE</code> — Link your Telegram with your verified Clerk account`,
        `• <code>/status</code> — Check your current linking status`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `🔒 <i>All supply-chain records are permanently verifiable on Arkiv Tiramisu testnet.</i>`,
      ].join('\n');
      return await this.sendMessage(chatId, welcome);
    }

    if (command === '/shop') {
      return await this.handleShopCommand(chatId, arg);
    }

    if (command === '/proof') {
      return await this.handleProofCommand(chatId, arg);
    }

    if (command === '/subscribe') {
      return await this.handleSubscribeCommand(chatId, arg);
    }

    if (command === '/unsubscribe') {
      return await this.handleUnsubscribeCommand(chatId, arg);
    }

    if (command === '/link') {
      return await this.handleLinkCommand(chatId, arg);
    }

    if (command === '/status') {
      const linked = telegramStore.getLinkedUserByChatId(chatId);
      if (!linked) {
        return await this.sendMessage(
          chatId,
          `ℹ️ <b>Status:</b> Public citizen (Unlinked)\nUse <code>/link CODE</code> with a one-time code from the ArkivTrace portal to link your operator or admin account.`
        );
      }
      return await this.sendMessage(
        chatId,
        `✅ <b>Linked Account:</b>\n• Role: <b>${linked.role}</b>\n• Shops: <code>${linked.assignedShopIds?.join(', ') || 'All / None'}</code>`
      );
    }

    // Default unrecognized command
    await this.sendMessage(
      chatId,
      `❓ Unrecognized command. Send <code>/help</code> for available commands.`
    );
  }

  // --- Polling Engine ---
  startPolling({ intervalMs = 2500 } = {}) {
    if (!this.token || this.isPolling) return;
    this.isPolling = true;

    console.log('[TelegramService] Telegram long-polling service started.');

    this.pollingInterval = setInterval(async () => {
      try {
        const res = await this._callApi('getUpdates', {
          offset: this.pollingOffset,
          timeout: 2,
        });

        if (res.ok && Array.isArray(res.result)) {
          for (const update of res.result) {
            this.pollingOffset = update.update_id + 1;
            await this.processUpdate(update);
          }
        }
      } catch (err) {
        console.warn('[TelegramService] Error during poll cycle:', err.message);
      }
    }, intervalMs);

    // Periodic reminder check (every 30 minutes in production, or manually triggered)
    this.reminderInterval = setInterval(async () => {
      await this.checkPendingDispatchesAndSendReminders();
    }, 30 * 60 * 1000);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
    this.isPolling = false;
    console.log('[TelegramService] Telegram polling stopped.');
  }
}

export const telegramService = new TelegramService();
