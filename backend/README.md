# ArkivTrace Backend

Blockchain-powered ration distribution transparency system for India, using **Arkiv Tiramisu** as its Web3 database.

## Architecture

- **Runtime**: Node.js (ES Modules, `"type": "module"`)
- **Framework**: Express.js (MVC Pattern: Routes -> Controllers -> Services)
- **Web3 Database**: Arkiv SDK 0.8.x (`@arkiv-network/sdk`) on Arkiv Tiramisu (`Chain ID: 7738577`)
- **Crypto & Accounts**: Viem
- **Validation**: Zod

## Directory Structure

```
backend/
├── .env.example
├── .env
├── package.json
└── src/
    ├── config/
    │   └── arkiv.config.js       # Arkiv Tiramisu chain configuration and client setup
    ├── services/
    │   └── arkiv.service.js      # Dedicated Arkiv SDK operations (create, read, query, health)
    ├── controllers/
    │   └── testEntity.controller.js # Test entity and health controller
    ├── middlewares/
    │   ├── errorHandler.middleware.js # Centralized error & 404 handler
    │   └── validate.middleware.js     # Zod schema request validation
    ├── routes/
    │   ├── testEntity.routes.js  # /api/test routes
    │   └── index.js              # Aggregated API router
    ├── schemas/
    │   └── testEntity.schema.js  # Zod validation schemas
    ├── scripts/
    │   ├── generate-wallet.js    # Utility to generate operator private key & address
    │   ├── test-arkiv.js         # Direct Arkiv Tiramisu connection & read/write test
    │   └── test-endpoints.js     # Automated HTTP endpoints integration test
    ├── utils/
    │   └── serializer.js         # BigInt-safe JSON serialization
    ├── app.js                    # Express app configuration & middleware
    └── server.js                 # Server entrypoint
```

## Quick Start

### 1. Configure Environment

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

If you need a new operator wallet key, run:
```bash
npm run generate-wallet
```
Then claim testnet tokens from the faucet at:
[https://hub.arkiv.network/faucet](https://hub.arkiv.network/faucet)

### 2. Run Direct Arkiv Connection & Entity Test

```bash
npm run test:arkiv
```

### 3. Run Automated Endpoints Integration Test

```bash
npm test
```

### 4. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:5000`.

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | API status and overview |
| `GET` | `/api/ping` | Simple health check |
| `GET` | `/api/test/health` | Arkiv Tiramisu block number, entity count, and wallet status |
| `POST` | `/api/test/create` | Create a test entity on Arkiv Tiramisu |
| `GET` | `/api/test/entity/:key` | Retrieve an entity by its 32-byte hex key |
| `GET` | `/api/test/list` | Query test entities |
