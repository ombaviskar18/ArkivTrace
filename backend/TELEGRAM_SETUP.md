# ArkivTrace — Telegram Bot Integration Setup & Architecture Guide

ArkivTrace integrates a Telegram Bot (`@ArkivTraceAlert_Bot`) to provide instant supply-chain notifications for grain dispatches, critical discrepancy alerts, pending delivery reminders, and citizen public verification tools.

---

## 1. Architecture & Security Principles

1. **Decoupled & Asynchronous:** Telegram notifications are dispatched via `setImmediate` only **after** supply chain records are successfully persisted on Arkiv Tiramisu. Telegram outages, rate limits, or network timeouts will **never** fail or delay dispatch, receipt, or discrepancy operations.
2. **Strict Identity Linking:** 
   - Operators and admins generate single-use 6-digit one-time codes through Clerk-authenticated endpoints (`POST /api/v1/telegram/link-code`).
   - The user claims this code in Telegram via `/link <code>`.
   - Telegram usernames, client-provided headers, and unverified chat IDs are **never trusted**. Roles and shop permissions come exclusively from verified Clerk claims.
3. **Read-Only Telegram Commands:** Supply-chain mutations (receipt confirmations, stock reports, discrepancy reviews) remain strictly inside the authenticated ArkivTrace Web Portal.
4. **Deduplication & Spam Prevention:**
   - Every dispatch and discrepancy notification is tracked in persistent state.
   - Pending receipt reminders have strict ceilings (default max 3 reminders per dispatch) to prevent spamming operators.
5. **Citizen Transparency:**
   - Public commands (`/shop SHOP_ID` and `/proof RECORD_ID`) return verifiable, sanitized summaries with direct links to immutable records on the Arkiv Tiramisu Explorer.
   - Citizens can opt into shop-level notifications via `/subscribe SHOP_ID` and `/unsubscribe SHOP_ID`.

---

## 2. Configuration & Environment Variables

Add the following to your `backend/.env` file:

```env
# Telegram Bot Token (from @BotFather)
TELEGRAM_BOT_TOKEN=8942440607:AAFQ8VvObGgwITd_ZW5hpCXz_pvzq9NVB2E

# Enable/disable long-polling daemon in development or production
TELEGRAM_POLLING=true
```

---

## 3. Telegram Bot Commands

| Command | Audience | Description |
| :--- | :--- | :--- |
| `/start` or `/help` | Public / All | Bot welcome message, usage instructions, and command directory |
| `/shop <SHOP_ID>` | Public / Citizens | Look up a shop's details, recent dispatches, reported stock, and discrepancy status |
| `/proof <RECORD_ID>` | Public / Citizens | View immutable on-chain evidence details and Arkiv block explorer proof link |
| `/subscribe <SHOP_ID>` | Citizens | Subscribe this Telegram chat to public dispatch events for a specific shop |
| `/unsubscribe <SHOP_ID>` | Citizens | Stop receiving public updates for a shop |
| `/link <CODE>` | Operators / Admins | Securely link Telegram chat to Clerk credentials using a single-use code |
| `/status` | Operators / Admins | Inspect current linking state, verified role, and assigned shop ID(s) |

---

## 4. REST API Endpoints for Account Linking

- **`POST /api/v1/telegram/link-code`**
  - **Auth:** Clerk-authenticated (`admin` or `operator`)
  - **Description:** Generates a 6-digit one-time linking code valid for 15 minutes.
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Telegram link code generated successfully",
      "data": {
        "code": "849201",
        "expiresAt": "2026-10-17T18:45:00.000Z",
        "instructions": "Open Telegram, search for your ArkivTrace bot, and send: /link 849201"
      }
    }
    ```

- **`GET /api/v1/telegram/status`**
  - **Auth:** Clerk-authenticated (`admin` or `operator`)
  - **Description:** Checks if current user's Clerk ID has an associated Telegram chat.

- **`POST /api/v1/telegram/check-reminders`**
  - **Auth:** Clerk-authenticated (`admin`)
  - **Description:** Manually triggers reminder checks for pending dispatches awaiting receipt confirmation.

- **`POST /api/v1/telegram/webhook`**
  - **Description:** Webhook receiver endpoint if utilizing Telegram webhooks instead of long polling.

---

## 5. Example Notification Messages

### 5.1 New Grain Dispatch Notification (to Assigned Shop Operator & Subscribers)
```text
🚚 New Grain Dispatch Alert
━━━━━━━━━━━━━━━━━━━━
📍 Destination Shop: FPS-DEL-6780
📦 Dispatch ID: DISP-12014
🌾 Grain Type: wheat
⚖️ Quantity: 1000 kg
🚛 Truck No: DL-1AA-9876
━━━━━━━━━━━━━━━━━━━━
🔗 Arkiv Evidence:
• View Entity on Arkiv: https://tiramisu.explorer.arkiv.network/entity/0x9ed3...
• View On-Chain Tx: https://tiramisu.explorer.arkiv.network/tx/0x53a4...

⚠️ Please inspect upon arrival and submit receipt confirmation via the ArkivTrace portal.
```

### 5.2 Critical / Major Discrepancy Alert (to Admins)
```text
🚨 CRITICAL DISCREPANCY ALERT
━━━━━━━━━━━━━━━━━━━━
🆔 Case ID: DISC-RCP-25775-DISP-62761
📍 Shop ID: FPS-RCP-6453
⚡ Severity: CRITICAL
📉 Transit Gap: 100 kg (20%)
📦 Dispatched: 500 kg | Received: 400 kg
🚚 Linked Dispatch: DISP-62761
📥 Linked Receipt: RCP-25775
━━━━━━━━━━━━━━━━━━━━
🔗 On-Chain Evidence:
• Discrepancy Entity: https://tiramisu.explorer.arkiv.network/entity/0xac6c...
• Transaction Hash: https://tiramisu.explorer.arkiv.network/tx/0xac6c...

🛡️ Log into the Admin Portal to review and publish resolution events.
```

### 5.3 Receipt Confirmation Reminder (to Shop Operator)
```text
⏰ Receipt Confirmation Reminder (1/3)
━━━━━━━━━━━━━━━━━━━━
📍 Shop ID: FPS-DEL-6780
📦 Dispatch ID: DISP-12014
🌾 Grain: wheat (1000 kg)
📅 Dispatched: 10/17/2026
━━━━━━━━━━━━━━━━━━━━
⚠️ This dispatch is awaiting physical receipt confirmation. Please confirm upon delivery.
```

### 5.4 Public /proof Output (to Citizen)
```text
📜 ArkivTrace Web3 Supply-Chain Proof
━━━━━━━━━━━━━━━━━━━━
🏷️ Record Type: DISPATCH
🔑 Arkiv Entity Key: 0x9ed30b3821e9602b40664a17a11320566fd23c9b6257f259e198224e37e0281c
👤 Owner: 0xeB67b74c8bA7959899f266D3a9C593EF424B047F
━━━━━━━━━━━━━━━━━━━━
📋 Record Details:
• Dispatch ID: DISP-12014
• Destination Shop: FPS-DEL-6780
• Grain Type: wheat
• Dispatched: 1000 kg
• Status: dispatched
━━━━━━━━━━━━━━━━━━━━
🌐 Immutable Blockchain Explorer Proof:
• Verify on Arkiv Explorer: https://tiramisu.explorer.arkiv.network/entity/0x9ed3...
```

---

## 6. Running Tests

Run the Telegram Bot test suite:
```bash
npm run test:telegram
```

Run all unit and integration tests across the backend:
```bash
npm run test:auth
npm run test:module5
npm run test:module6
npm test
```
