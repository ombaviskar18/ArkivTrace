import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.resolve(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'telegram_store.json');

class TelegramStore {
  constructor() {
    this.state = {
      linkCodes: {},        // code -> { clerkUserId, role, assignedShopIds, createdAt, expiresAt }
      linkedUsers: {},      // clerkUserId -> { telegramChatId, role, assignedShopIds, linkedAt }
      chatToUser: {},       // telegramChatId -> { clerkUserId, role, assignedShopIds }
      shopSubscriptions: {},// shopId -> Set of chatIds (saved as array)
      notifiedDispatches: {}, // dispatchId -> ISO timestamp
      notifiedDiscrepancies: {}, // discrepancyId -> ISO timestamp
      remindersSent: {},    // dispatchId -> count
    };
    this._load();
  }

  _load() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.state = {
          ...this.state,
          ...parsed,
        };
      }
    } catch (err) {
      console.warn('[TelegramStore] Warning: Failed to load state from disk, using in-memory store:', err.message);
    }
  }

  _save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[TelegramStore] Warning: Failed to persist state to disk:', err.message);
    }
  }

  // --- One-Time Code Management ---
  createLinkCode({ clerkUserId, role, assignedShopIds, ttlMinutes = 15 }) {
    // Generate secure random alphanumeric 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();
    const expiresAt = now + ttlMinutes * 60 * 1000;

    this.state.linkCodes[code] = {
      clerkUserId,
      role,
      assignedShopIds: Array.isArray(assignedShopIds) ? assignedShopIds : (assignedShopIds ? [assignedShopIds] : []),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
    };
    this._save();

    return { code, expiresAt: new Date(expiresAt).toISOString() };
  }

  consumeLinkCode(code, chatId) {
    const entry = this.state.linkCodes[code];
    if (!entry) return null;

    const now = Date.now();
    if (new Date(entry.expiresAt).getTime() < now) {
      delete this.state.linkCodes[code];
      this._save();
      return { error: 'EXPIRED' };
    }

    const { clerkUserId, role, assignedShopIds } = entry;

    // Link the chat ID with Clerk user
    const chatIdStr = String(chatId);
    this.state.linkedUsers[clerkUserId] = {
      telegramChatId: chatIdStr,
      role,
      assignedShopIds,
      linkedAt: new Date().toISOString(),
    };

    this.state.chatToUser[chatIdStr] = {
      clerkUserId,
      role,
      assignedShopIds,
    };

    // Single-use code consumed
    delete this.state.linkCodes[code];
    this._save();

    return { clerkUserId, role, assignedShopIds };
  }

  getLinkedUserByChatId(chatId) {
    return this.state.chatToUser[String(chatId)] || null;
  }

  getChatIdByClerkUserId(clerkUserId) {
    return this.state.linkedUsers[clerkUserId]?.telegramChatId || null;
  }

  getOperatorChatIdsForShop(shopId) {
    if (!shopId) return [];
    const normalized = String(shopId).trim().toLowerCase();
    const chatIds = [];

    for (const [chatId, user] of Object.entries(this.state.chatToUser)) {
      if (user.role === 'operator') {
        const hasShop = (user.assignedShopIds || []).some(
          (id) => String(id).trim().toLowerCase() === normalized
        );
        if (hasShop) {
          chatIds.push(chatId);
        }
      }
    }
    return chatIds;
  }

  getAdminChatIds() {
    const chatIds = [];
    for (const [chatId, user] of Object.entries(this.state.chatToUser)) {
      if (user.role === 'admin') {
        chatIds.push(chatId);
      }
    }
    return chatIds;
  }

  // --- Subscriptions (Feature 6 Bonus) ---
  subscribeCitizen(shopId, chatId) {
    const sId = String(shopId).trim().toUpperCase();
    const cId = String(chatId);
    if (!this.state.shopSubscriptions[sId]) {
      this.state.shopSubscriptions[sId] = [];
    }
    if (!this.state.shopSubscriptions[sId].includes(cId)) {
      this.state.shopSubscriptions[sId].push(cId);
      this._save();
      return true;
    }
    return false;
  }

  unsubscribeCitizen(shopId, chatId) {
    const sId = String(shopId).trim().toUpperCase();
    const cId = String(chatId);
    if (!this.state.shopSubscriptions[sId]) return false;
    const initialLen = this.state.shopSubscriptions[sId].length;
    this.state.shopSubscriptions[sId] = this.state.shopSubscriptions[sId].filter((id) => id !== cId);
    const removed = this.state.shopSubscriptions[sId].length < initialLen;
    if (removed) this._save();
    return removed;
  }

  getSubscribersForShop(shopId) {
    const sId = String(shopId).trim().toUpperCase();
    return this.state.shopSubscriptions[sId] || [];
  }

  // --- Deduplication & Reminder Tracking ---
  hasNotifiedDispatch(dispatchId) {
    return Boolean(this.state.notifiedDispatches[dispatchId]);
  }

  markDispatchNotified(dispatchId) {
    this.state.notifiedDispatches[dispatchId] = new Date().toISOString();
    this._save();
  }

  hasNotifiedDiscrepancy(discrepancyId) {
    return Boolean(this.state.notifiedDiscrepancies[discrepancyId]);
  }

  markDiscrepancyNotified(discrepancyId) {
    this.state.notifiedDiscrepancies[discrepancyId] = new Date().toISOString();
    this._save();
  }

  getReminderCount(dispatchId) {
    return this.state.remindersSent[dispatchId] || 0;
  }

  incrementReminderCount(dispatchId) {
    const cur = this.state.remindersSent[dispatchId] || 0;
    this.state.remindersSent[dispatchId] = cur + 1;
    this._save();
    return cur + 1;
  }

  clear() {
    this.state = {
      linkCodes: {},
      linkedUsers: {},
      chatToUser: {},
      shopSubscriptions: {},
      notifiedDispatches: {},
      notifiedDiscrepancies: {},
      remindersSent: {},
    };
    this._save();
  }
}

export const telegramStore = new TelegramStore();
