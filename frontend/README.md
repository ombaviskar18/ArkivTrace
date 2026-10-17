# ArkivTrace — Public Distribution System Transparency & Reconciliation

> **Every grain accounted for. Every discrepancy traceable.**

ArkivTrace is an open-source ration-distribution transparency and reconciliation platform. It provides auditable public records across the public food-distribution supply chain by recording and reconciling depot dispatches, transport deliveries, fair-price shop receipts, inventory declarations, and community discrepancy reports anchored to the **Arkiv Tiramisu** blockchain.

---

## 🌌 Visual Design System

The interface recreates a futuristic Web3 cyber-analytics aesthetic with:
- **Palette**: Deep navy/black background (`#02090D`, `#06151D`), elevated glass surfaces (`#071B25`, `#09232F`), electric cyan (`#00C8FF`), bright cyan (`#55E5FF`), deep blue (`#087DEB`), with semantic indicators for success (`#36D399`), warning (`#FBBF24`), and error (`#FB7185`).
- **Cards & Glows**: Translucent glass panels with fine cyan borders (`rgba(0, 200, 255, 0.16)`), subtle radial spotlights, and glowing buttons.
- **Typography & Layout**: Bold modern typography with electric cyan highlights, sticky desktop sidebar, mobile drawer, and responsive data tables.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Library**: React 19, TypeScript
- **Styling**: Tailwind CSS v4 + Custom Cyber Utilities
- **Charts**: Recharts (Responsive grain dispatch vs receipt area trends & reconciliation donut)
- **Icons**: Lucide React
- **Architecture**: Modular client with LocalStorage persistence for static demo testing, seamlessly swappable with the Express backend.

---

## 🚀 Getting Started

### 1. Installation

```bash
cd frontend
npm install
```

### 2. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### 3. Production Build

```bash
npm run build
npm run start
```

---

## 📱 Application Routes & Features

| Route | Page | Key Features |
|---|---|---|
| `/` | **Supply Chain Overview** | KPI statistics cards, Recharts outflow vs receipt trends, reconciliation donut, recent activity table, recent discrepancy panel, live network status banner |
| `/dispatches` | **Depot Dispatches** | Search by delivery ID/depot/shop, district & period filters, dispatch creation modal, copyable Arkiv entity keys |
| `/shops` | **Shop Receipts** | Weighed delivery acknowledgments, condition tags, delivery challan references, receipt submission form |
| `/shops/[shopId]` | **Shop Audit Timeline** | Chronological visual audit trail of dispatches, weighbridge receipts, and monthly declarations for a Fair Price Shop |
| `/stock-reports` | **Stock Reports** | Authoritative formula: `Expected = Opening + Receipts − Quota Distributed`, variance calculation, stock report form |
| `/discrepancies` | **Discrepancy Investigation** | Difference visualizer (Dispatched vs Weighed), audit metrics, factual observation narrative, zero beneficiary personal data collection |
| `/evidence` | **Arkiv Evidence Explorer** | Search by entity key, delivery ID, or shop; copyable hashes, payload inspection |
| `/records/[key]` | **Record Detail** | Full immutable Arkiv entity proof, structured JSON viewer, linked upstream/downstream evidence entities |
| `/network` | **Network Status** | Technical RPC telemetry, latency ping, chain ID (`#8291`), and security verification |
| `/settings` | **Settings & Preferences** | Table page size, row density, and one-click demo data reset |

---

## 🔒 Core Principles

1. **Zero Personal Data**: Never collects or stores ration card numbers, beneficiary identities, or biometrics.
2. **Objective Variances**: Mismatches represent reasons to audit and inspect weighbridge calibrations, not automatic allegations of fraud.
3. **Secure Signer**: Blockchain private keys remain exclusively on the secure backend service, never exposed in client bundles.
