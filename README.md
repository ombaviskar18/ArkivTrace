# ArkivTrace 🌾🛡️
### Decentralized Public Distribution System (PDS) & Grain Supply-Chain Integrity Platform for India

Built on **Arkiv Network** (Tiramisu Testnet) for the **Arkiv: Global Tour Stop (Road to Devcon Mumbai 2026)**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Track](https://img.shields.io/badge/Track-Best%20Indian%20Use%20Case-green.svg)](https://arkiv.network)
[![Network](https://img.shields.io/badge/Network-Arkiv%20Tiramisu%20(7738577)-orange.svg)](https://docs.arkiv.network/networks/tiramisu/)

---

## 📌 Executive Summary

India operates the **world's largest food security welfare program** — the Targeted Public Distribution System (TPDS) — providing subsidized grains (wheat, rice, coarse grains) to over **800 million citizens** across **540,000+ Fair Price Shops (FPS)**.

However, the system faces severe systemic challenges:
- **Transit Diversion & Pilferage:** Grains leave FCI/State warehouses but "vanish" before reaching the village ration shop.
- **Weighbridge Discrepancies:** Discrepancies between depot dispatch weights and store received weights are hidden in closed, siloed databases.
- **Centralized Database Vulnerability:** Administrative records can be silently edited, backdated, or expunged without leaving a tamper-evident audit trail.
- **Asymmetric Transparency:** Citizens have no neutral, tamper-proof way to verify whether grains assigned to their local shop were actually dispatched or delivered.

**ArkivTrace** uses **Arkiv as an append-only, queryable Web3 data layer**. Depot dispatches, shop receipts, monthly stock balances, and discrepancy cases are stored as indexed entities with type-specific expiration (180 or 365 days). Citizens and shop operators can inspect evidence through the portal and Telegram bot without requiring crypto wallets or paying gas fees.

---

## 💡 Why Arkiv? (Why Not Postgres, IPFS, or Subgraphs?)

| Technology | What Breaks if Used Instead of Arkiv? |
|---|---|
| **Traditional SQL (Postgres / MySQL)** | **No Byzantine fault tolerance.** A corrupt system administrator or database operator can silently update quantities, alter dates, or delete discrepancy records without an audit trail. Arkiv guarantees append-only immutability. |
| **IPFS / Arweave / Filecoin** | **No structured queryability.** IPFS is a flat content-addressed blob store. Finding *"all receipts for shop `FPS-MH-401` in period `2026-10` with discrepancy > 0"* requires downloading and scanning every CID off-chain. Arkiv provides native server-side attribute indexing (`eq`, `in`, `and`). |
| **EVM Smart Contracts + Subgraphs** | **Excessive cost & architectural overhead.** Storing detailed supply chain telemetry (driver details, truck IDs, inspection notes) directly in EVM storage slots is prohibitively expensive. Deploying custom subgraphs adds external indexing lag and centralized indexing dependencies. |
| **Arkiv Network (Our Solution)** | **The sweet spot:** Native queryable indexing, zero smart contract overhead, cryptographic verifiability, deterministic point lookups (`getEntityByKey`), and built-in statutory data expirations. |

---

## ⛓️ On-Chain Evidence & Verification

All supply-chain mutations are signed and written to the **Arkiv Tiramisu Testnet** by our backend service wallet:

- **Network:** Arkiv Tiramisu (`Chain ID: 7738577`)
- **RPC Gateway:** `https://rpc.tiramisu.db-chain.testnet.arkiv.network`
- **Backend Signer Wallet:** [`0xeB67b74c8bA7959899f266D3a9C593EF424B047F`](https://tiramisu.explorer.arkiv.network/address/0xeB67b74c8bA7959899f266D3a9C593EF424B047F)
- **Live Example Entity on Arkiv Explorer:**
  - **Shop Entity (`FPS-MH-401`):** [`0x12bf79fbeb31b46674e1f80f220f21eefd42c4d324ed6a106bcc4614f4cb7a0b`](https://tiramisu.explorer.arkiv.network/entity/0x12bf79fbeb31b46674e1f80f220f21eefd42c4d324ed6a106bcc4614f4cb7a0b)
  - **Dispatch Entity (`DSP-MH-031422`):** [`0x662c5761b197894b8cf53c9489b31581e4c086687bdf089de3c6dd05cd8ba31f`](https://tiramisu.explorer.arkiv.network/entity/0x662c5761b197894b8cf53c9489b31581e4c086687bdf089de3c6dd05cd8ba31f)
  - **Confirmed Receipt Entity:** [`0x7542f78e5395828a8f05c194c487e497ac5fed9b9c2c2c05c744e401b6c249c5`](https://tiramisu.explorer.arkiv.network/entity/0x7542f78e5395828a8f05c194c487e497ac5fed9b9c2c2c05c744e401b6c249c5)

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph UI ["User & Citizen Interfaces"]
        FE["Next.js Evidence Portal (React 19)"]
        TG["Telegram Bot (@ArkivTraceAlert_Bot)"]
    end

    subgraph Auth ["Security & RBAC Layer"]
        CK["Clerk JWT Authentication"]
        MW["auth.middleware.js (Shop-Scoped Protection)"]
    end

    subgraph Backend ["ArkivTrace Core Engine (Node.js/Express)"]
        API["REST Controllers (Zod Validated)"]
        D_SVC["Dispatch & Receipt Reconciliation"]
        S_SVC["Stock & Variance Math"]
        T_SVC["Telegram Polling & Notification Engine"]
    end

    subgraph Arkiv ["Arkiv Tiramisu Blockchain"]
        RPC["Tiramisu JSON-RPC (Chain ID 7738577)"]
        ENT["Typed Entities (shop, dispatch, receipt, discrepancy)"]
        EXP["Arkiv Block Explorer"]
    end

    FE -->|Clerk Bearer Token| API
    TG -->|Public Commands & /link| T_SVC
    API --> MW
    MW --> CK
    API --> D_SVC
    API --> S_SVC
    D_SVC -->|@arkiv-network/sdk| RPC
    S_SVC -->|@arkiv-network/sdk| RPC
    T_SVC -->|Asynchronous setImmediate| RPC
    RPC --> ENT
    ENT --> EXP
```

---

## 🚀 Quickstart & Setup Instructions

### Prerequisites
- Node.js (v20 or v22 LTS)
- npm (v10+)
- Free Arkiv Testnet Wallet (or reuse test configuration)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/ombaviskar18/ArkivTrace.git
cd ArkivTrace

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install --legacy-peer-deps
```

### 2. Configure Environment Variables
Copy the provided `.env.example` templates:

```bash
# In backend/
cp .env.example .env

# In frontend/
cp .env.example .env.local
```

Set `ARKIV_PRIVATE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_PUBLISHABLE_KEY` in `backend/.env`. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `NEXT_PUBLIC_API_URL` in `frontend/.env.local`. Configure `TELEGRAM_BOT_TOKEN` only if enabling Telegram polling.

### 3. Run the Backend & Test Suite
```bash
cd backend
npm run dev
```
*(Starts on `http://localhost:5000` and initializes Telegram bot long-polling)*

Run the offline regression tests:
```bash
npm run test:auth
npm run test:telegram
npm run test:module5
npm run test:module6
```

`npm test` and the live module scripts make Arkiv RPC requests. The public Tiramisu gateway has returned HTTP 429 (`ANON_COST_LIMITED`); these live checks are not offline regression tests.

### 4. Run the Next.js Frontend
```bash
cd frontend
npm run dev
```
*(Available on `http://localhost:3000`)*

---

## 🤖 Telegram Bot Integration (`@ArkivTraceAlert_Bot`)

The Telegram Bot bridges Web3 on-chain supply-chain records to ordinary citizens and ration shop operators:

- **Public Citizen Commands:**
  - `/shop <SHOP_ID>` — Displays shop overview, recent dispatches, stock balance, and discrepancy status (e.g. `/shop FPS-MH-401`).
  - `/proof <RECORD_ID>` — Displays concise on-chain proof and direct explorer URL.
  - `/subscribe <SHOP_ID>` — Subscribes to public arrival alerts for a specific ration shop.
  - `/unsubscribe <SHOP_ID>` — Unsubscribes from shop alerts.
- **Operator / Admin Verification:**
  - One-time 6-digit link code generated securely via authenticated web app (`/settings`).
  - Send `/link <CODE>` to bind verified Clerk permissions to your Telegram chat.
  - Automated receipt confirmation reminders sent to operators when dispatches arrive.

---

## 🔍 Reproducibility & Exact Queries Judges Can Run

Judges can verify our Arkiv integration and query live records using the Node.js CLI:

```bash
cd backend
node -e "
import('./src/services/arkiv.service.js').then(async ({ arkivService }) => {
  const { eq } = await import('@arkiv-network/sdk/query');
  
  // 1. Query verified shop on Arkiv
  const shops = await arkivService.queryEntities({
    expressions: [eq('project', 'arkivtrace'), eq('type', 'shop'), eq('shop_id', 'FPS-MH-401')],
    limit: 5
  });
  console.log('Verified Arkiv Records for FPS-MH-401:');
  console.log(shops.entities.map(e => ({ key: e.key, type: e.attributes.type })));
});
"
```

---

## 📂 Project Repository Structure

```text
ArkivTrace/
├── LICENSE                    # Official MIT License
├── README.md                  # Comprehensive Documentation & Reproducibility Guide
├── .gitignore                 # Root Git Ignore
├── arkiv/
│   ├── schema.md              # Entity schemas, attributes, expirations, queries
│   └── friction.md            # Developer friction, SDK edge cases & feedback
├── backend/                   # Express, Node.js, @arkiv-network/sdk, Clerk RBAC
│   ├── src/
│   │   ├── controllers/       # API endpoints (dispatch, receipt, stock, telegram)
│   │   ├── services/          # arkiv.service.js, shop.service.js, telegram.service.js
│   │   ├── middlewares/       # Clerk RBAC & anti-spoofing authorization
│   │   └── schemas/           # Zod input validation schemas
│   └── test/                  # Automated test suites for modules 1-6 & Telegram
└── frontend/                  # Next.js 16, React 19, Tailwind CSS, Recharts
    └── src/
        ├── app/               # App Router pages (/dashboard, /shops, /records, /settings)
        ├── components/        # TelegramLinkCard, RoleGuard, DispatchReceiptChart
        └── lib/               # api.ts (REST client with automatic Clerk JWT auth)
```

---

## ⚖️ License

This project is licensed under the [MIT License](LICENSE).
