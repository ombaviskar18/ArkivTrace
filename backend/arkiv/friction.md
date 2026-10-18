# Arkiv Developer Friction & Feedback Report

This document records the technical friction, edge cases, and architectural observations encountered while building **ArkivTrace** using the Arkiv developer ecosystem during the *Arkiv: Global Tour Stop (Pre-Devcon Mumbai)*.

---

## Environment & Versions

| Component | Version | Role in Project |
|---|---|---|
| `@arkiv-network/sdk` | `^0.8.1` | Primary data layer SDK (entity creation, querying, schema decoding) |
| `viem` | `^2.57.7` | EVM client, wallet management, transaction signing |
| `Node.js` | `v20.x / v22.x` | Runtime environment (ES Modules) |
| `Next.js` | `16.0.3` | React 19 Frontend Dashboard & Evidence Portal |
| Network | **Tiramisu Testnet** | Chain ID `7738577`, RPC: `https://rpc.tiramisu.db-chain.testnet.arkiv.network` |

---

## 1. Surface: `@arkiv-network/sdk` (Query & Entity Serialization)

### Issue 1.1: Native JavaScript BigInt Serialization in REST APIs
- **Arkiv Surface:** `@arkiv-network/sdk` / `publicClient.getEntity()` & `queryEntities()`
- **Expected Behavior:** Decoded entities returned by SDK query methods can be directly serialized by standard application frameworks (e.g. Express `res.json(entity)` or Next.js API routes).
- **Actual Behavior:** Blockchain response metadata (e.g., block numbers, timestamps, gas values) inside entity objects contain native JavaScript `BigInt` values. Calling `JSON.stringify(entity)` throws:
  ```text
  TypeError: Do not know how to serialize a BigInt
  ```
- **Steps to Reproduce:**
  1. Fetch any live entity: `const entity = await publicClient.getEntity('0x...');`
  2. Attempt `JSON.stringify(entity)` without a custom replacer.
- **ArkivTrace Workaround:** We built a recursive `serializeBigInt` utility ([backend/src/utils/serializer.js](file:///c:/Users/M.T.S/Desktop/ArkivTrace/backend/src/utils/serializer.js)) that converts values $\le \text{Number.MAX\_SAFE\_INTEGER}$ to native numbers and larger integers to strings before returning to web clients.
- **Suggested Improvement:** Include a `.toSafeJson()` helper on SDK entity instances that handles BigInt normalization out of the box.

---

### Issue 1.2: Attribute Indexing Case Conventions
- **Arkiv Surface:** `@arkiv-network/sdk/query` (`eq`, `in`)
- **Expected Behavior:** Query expressions either support case-insensitive matching or clearly specify whether index attributes are case-folded by the Arkiv indexer.
- **Actual Behavior:** Attributes like `shop_id` are stored with exact case (e.g., `FPS-MH-401`). If a client queries `fps-mh-401` in lowercase, the indexer returns zero records without an error.
- **Steps to Reproduce:**
  1. Create entity with attribute `{ shop_id: 'FPS-MH-401' }`.
  2. Query using `eq('shop_id', 'fps-mh-401')`.
  3. Result is empty.
- **ArkivTrace Workaround:** Standardized all backend search arguments to `.trim().toUpperCase()` before passing to `eq()`.
- **Suggested Improvement:** Add documentation clarifying that string attribute indexing is case-sensitive, or support a `caseInsensitive: true` flag in query expressions.

---

## 2. Surface: Tiramisu RPC Gateway (`rpc.tiramisu.db-chain.testnet.arkiv.network`)

### Issue 2.1: `ANON_COST_LIMITED` (HTTP 429) During Automated Test Suites
- **Arkiv Surface:** Direct JSON-RPC Gateway
- **Expected Behavior:** Testnet developer gateways allow bursts of read-only queries during local automated testing suites without dropping connections.
- **Actual Behavior:** When running regression test suites (e.g., querying 4–6 consecutive shop timelines), the RPC occasionally returns HTTP 429 with the error code:
  ```text
  ANON_COST_LIMITED: anonymous request cost quota exceeded
  ```
- **Steps to Reproduce:**
  1. Execute 10 consecutive `queryEntities()` calls in parallel or quick succession without an `ARKIV_ACCESS_KEY`.
- **ArkivTrace Workaround:**
  1. Built an `executeWithRetry` wrapper with exponential backoff and jitter for transient transport failures.
  2. Configured non-blocking retry suppression so that external rate limits never lock web requests or Telegram bot command loops.
  3. Added support for authenticated access keys via `ARKIV_ACCESS_KEY` header `X-API-KEY`.
- **Suggested Improvement:** Return standard `Retry-After: <seconds>` headers with 429 responses to enable deterministic client backoff.

---

## 3. Surface: Arkiv Hub & Faucet (`hub.arkiv.network`)

### Issue 3.1: Developer Wallet Onboarding Friction
- **Arkiv Surface:** Web-based Faucet & Testnet Explorer
- **Expected Behavior:** Easy automation for CI/CD test runners to request testnet gas tokens.
- **Actual Behavior:** Faucet requires manual human interaction through the browser UI, making automated testnet pipelines dependent on pre-funded static wallets.
- **ArkivTrace Workaround:** Generated a dedicated developer wallet (`0xeB67b74c8bA7959899f266D3a9C593EF424B047F`) funded once via the web faucet and reused across integration runs.
- **Suggested Improvement:** Offer an authenticated faucet API endpoint for developers holding an Arkiv Hub API key.

---

## 4. Overall Developer Experience Summary

| Category | Rating | Notes |
|---|:---:|---|
| **Query Expressiveness** | ⭐⭐⭐⭐⭐ | Querying by typed attributes without writing smart contracts or deploying custom subgraphs is a game changer for Web3 apps. |
| **SDK Ergonomics** | ⭐⭐⭐⭐☆ | Clean viem-compatible architecture; minor friction around BigInt and case handling. |
| **Explorer & Verification** | ⭐⭐⭐⭐⭐ | Entity explorer links (`/entity/0x...`) provide instant, transparent proof for citizens and administrators. |
| **Performance** | ⭐⭐⭐⭐☆ | Fast block times; occasional latency under heavy testnet bursts handled via retries. |

**Top 1 Improvement Recommendation:**
Provide an out-of-the-box JSON serializer utility in `@arkiv-network/sdk` and formalize standard pagination cursors in `queryEntities`.
