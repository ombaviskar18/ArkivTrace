import 'dotenv/config';
import { createPublicClient, createWalletClient } from '@arkiv-network/sdk';
import { tiramisu } from '@arkiv-network/sdk/chains';
import { http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Arkiv Network Configuration & Client Setup
 * Target Network: Arkiv Tiramisu (Chain ID: 7738577)
 * Official RPC: https://rpc.tiramisu.db-chain.testnet.arkiv.network
 */

export const RPC_URL = process.env.ARKIV_RPC_URL || tiramisu.rpcUrls.default.http[0];
export const CHAIN_ID = parseInt(process.env.ARKIV_CHAIN_ID, 10) || tiramisu.id;
export const RPC_TIMEOUT_MS = parseInt(process.env.ARKIV_RPC_TIMEOUT_MS, 10) || 35000;

/**
 * Mask sensitive data (such as private keys or long hex secrets) from logs
 */
export const sanitizeLog = (str) => {
  if (str === null || str === undefined) return '';
  const text = typeof str === 'object' ? JSON.stringify(str) : String(str);
  // Redact 64-character hex strings (private keys)
  return text.replace(/(?:0x)?[0-9a-fA-F]{64}/g, (match) => {
    return `${match.slice(0, 6)}...[REDACTED_KEY]...${match.slice(-4)}`;
  });
};

/**
 * Custom Error for Arkiv RPC rate limiting (HTTP 429 / ANON_COST_LIMITED).
 */
export class ArkivRateLimitedError extends Error {
  constructor(message = 'Arkiv Tiramisu RPC rate limit reached', options = {}) {
    super(message);
    this.name = 'ArkivRateLimitedError';
    this.code = 'ARKIV_RPC_RATE_LIMITED';
    this.statusCode = 429;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
    this.cause = options.cause;
  }
}

/**
 * Custom Error for Arkiv RPC unavailability or timeouts
 */
export class ArkivRpcUnavailableError extends Error {
  constructor(message = 'Arkiv Tiramisu RPC is temporarily unavailable or timed out', options = {}) {
    super(message);
    this.name = 'ArkivRpcUnavailableError';
    this.code = 'ARKIV_RPC_UNAVAILABLE';
    this.statusCode = 503;
    this.cause = options.cause;
    this.retriesAttempted = options.retriesAttempted ?? 0;
  }
}

/**
 * Checks whether an error is a transient network/RPC error suitable for read retry
 */
export const isTransientRpcError = (error) => {
  if (!error) return false;
  if (
    error instanceof ArkivRpcUnavailableError ||
    error.code === 'ARKIV_RPC_UNAVAILABLE'
  ) {
    return true;
  }
  if (error.name === 'TimeoutError' || error.name === 'HttpRequestError') {
    return true;
  }

  const msg = (error.message || '').toLowerCase();
  const details = (error.details || '').toLowerCase();
  const full = `${msg} ${details}`;

  return (
    full.includes('timeout') ||
    full.includes('timed out') ||
    full.includes('took too long') ||
    full.includes('econnreset') ||
    full.includes('etimedout') ||
    full.includes('econnrefused') ||
    full.includes('fetch failed') ||
    full.includes('502') ||
    full.includes('503') ||
    full.includes('504') ||
    full.includes('bad gateway') ||
    full.includes('service unavailable') ||
    full.includes('network error') ||
    full.includes('aborted')
  );
};

export const isRateLimitedRpcError = (error) => {
  if (!error) return false;

  if (error.code === 'ARKIV_RPC_RATE_LIMITED' || error.statusCode === 429 || error.status === 429) {
    return true;
  }

  const msg = (error.message || '').toLowerCase();
  const details = (error.details || '').toLowerCase();
  const full = `${msg} ${details}`;

  return (
    full.includes('429') ||
    full.includes('too many requests') ||
    full.includes('rate limit') ||
    full.includes('anon_cost_limited')
  );
};

export const getRetryAfterSeconds = (error) => {
  const direct = error?.retryAfterSeconds ?? error?.retryAfter ?? error?.cause?.retryAfterSeconds ?? null;
  if (typeof direct === 'number' && Number.isFinite(direct)) return Math.max(1, Math.ceil(direct));

  const headers =
    error?.cause?.headers ||
    error?.headers ||
    error?.cause?.response?.headers ||
    error?.response?.headers ||
    null;

  const headerValue =
    headers?.get?.('retry-after') ||
    headers?.['retry-after'] ||
    headers?.RetryAfter ||
    headers?.retryAfter ||
    null;

  if (!headerValue) return null;

  const parsed = Number(headerValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Helper to execute read-only RPC operations with maximum 2 retries and exponential backoff.
 * NOTE: DO NOT use this for mutations (createEntity) to prevent duplicate transactions.
 *
 * @param {string} operationName - Label for logging
 * @param {Function} fn - Async operation to execute
 * @param {Object} [options]
 * @param {number} [options.maxRetries=2] - Maximum retries (default: 2 retries, 3 total attempts)
 * @param {number} [options.baseDelayMs=300] - Initial delay before backoff
 */
export async function executeWithRetry(operationName, fn, { maxRetries = 2, baseDelayMs = 300 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;

      if (isRateLimitedRpcError(error)) {
        const retryAfterSeconds = getRetryAfterSeconds(error);
        console.error(
          `[Arkiv RPC] Rate limited for ${operationName}: ${sanitizeLog(error.message)}${
            retryAfterSeconds ? ` Retry-After: ${retryAfterSeconds}s` : ''
          }`
        );

        throw new ArkivRateLimitedError(
          `Arkiv Tiramisu RPC rate limited on ${operationName}: ${error.message || 'Too many requests'}`,
          { cause: error, retryAfterSeconds }
        );
      }

      const isTransient = isTransientRpcError(error);

      if (isTransient && attempt <= maxRetries) {
        // Short exponential backoff: 300ms * 2^(attempt - 1) + jitter
        const jitter = Math.floor(Math.random() * 50);
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;

        console.warn(
          `[Arkiv RPC] Transient issue on ${operationName} (attempt ${attempt}/${maxRetries + 1}): ` +
          `${sanitizeLog(error.message)}. Retrying in ${delay}ms...`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // If exhausted retries or non-transient, handle accordingly
      if (isTransient) {
        console.error(
          `[Arkiv RPC] Unavailable or timed out for ${operationName} after ${attempt} attempt(s): ${sanitizeLog(error.message)}`
        );
        throw new ArkivRpcUnavailableError(
          `Arkiv Tiramisu RPC request failed on ${operationName}: ${error.message || 'Request timed out'}`,
          { cause: error, retriesAttempted: attempt - 1 }
        );
      }

      throw error;
    }
  }
}

// Custom chain configuration ensuring RPC match
export const arkivChain = {
  ...tiramisu,
  id: CHAIN_ID,
  rpcUrls: {
    ...tiramisu.rpcUrls,
    default: {
      http: [RPC_URL],
      webSocket: tiramisu.rpcUrls.default.webSocket,
    },
  },
};

// Shared transport fetch options with API key authentication if provided
const getTransportOptions = () => {
  const options = {
    timeout: RPC_TIMEOUT_MS,
    retryCount: 0,
  };
  if (process.env.ARKIV_API_KEY) {
    options.fetchOptions = {
      headers: {
        Authorization: `Bearer ${process.env.ARKIV_API_KEY}`,
        'x-api-key': process.env.ARKIV_API_KEY,
      },
    };
  }
  return options;
};

/**
 * Public client for read-only querying of entities, block status, and events.
 * Configured with timeout. retryCount is 0 on transport so we control read retries explicitly.
 */
export const publicClient = createPublicClient({
  chain: arkivChain,
  transport: http(RPC_URL, getTransportOptions()),
});

/**
 * Helper to get the operator wallet account from server environment variables
 */
export const getWalletAccount = () => {
  const rawKey = process.env.ARKIV_PRIVATE_KEY?.trim();
  if (!rawKey) {
    throw new Error(
      'ARKIV_PRIVATE_KEY is not configured in server environment variables (.env).'
    );
  }

  // Ensure 0x prefix
  const formattedKey = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`;

  if (!/^0x[0-9a-fA-F]{64}$/.test(formattedKey)) {
    throw new Error(
      'Invalid ARKIV_PRIVATE_KEY in .env. Expected a 32-byte hex string (64 hex characters starting with 0x). ' +
      'If you need a new key, run: npm run generate-wallet'
    );
  }

  return privateKeyToAccount(formattedKey);
};

/**
 * Helper to get public address of the configured wallet
 */
export const getWalletAddress = () => {
  try {
    const account = getWalletAccount();
    return account.address;
  } catch {
    return null;
  }
};

/**
 * Wallet client for state mutations (createEntity, patchEntity, deleteEntity, etc.).
 * Configured with timeout and retryCount: 0 to prevent duplicate on-chain submissions.
 */
export const getWalletClient = () => {
  const account = getWalletAccount();
  return createWalletClient({
    chain: arkivChain,
    transport: http(RPC_URL, getTransportOptions()),
    account,
  });
};
