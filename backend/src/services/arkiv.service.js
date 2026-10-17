import {
  jsonToPayload,
  ExpirationTime,
} from '@arkiv-network/sdk';
import { eq } from '@arkiv-network/sdk/query';
import { formatEther } from 'viem';
import {
  publicClient,
  getWalletClient,
  getWalletAddress,
  arkivChain,
  executeWithRetry,
  isTransientRpcError,
  ArkivRpcUnavailableError,
  sanitizeLog,
} from '../config/arkiv.js';
import { serializeBigInt } from '../utils/serializer.js';

/**
 * Arkiv Service
 * Dedicated service encapsulating all interaction with the Arkiv Tiramisu Web3 Database.
 * - Transient read-only RPC operations are retried up to 2 times with exponential backoff.
 * - Entity-creation transactions are NOT automatically retried to prevent duplicate records.
 */
class ArkivService {
  /**
   * Check connection to Arkiv Tiramisu network and inspect wallet status
   * Read-only: uses executeWithRetry (max 2 retries on transient timeout/RPC errors)
   */
  async getNetworkHealth() {
    try {
      const [blockNumber, entityCount] = await executeWithRetry(
        'getNetworkHealth (blockNumber & entityCount)',
        () =>
          Promise.all([
            publicClient.getBlockNumber(),
            publicClient.getEntityCount(),
          ])
      );

      const walletAddress = getWalletAddress();
      let walletBalance = null;
      let walletBalanceFormatted = null;

      if (walletAddress) {
        try {
          walletBalance = await executeWithRetry('getWalletBalance', () =>
            publicClient.getBalance({ address: walletAddress })
          );
          walletBalanceFormatted = `${formatEther(walletBalance)} GLM`;
        } catch (balErr) {
          console.warn(
            `[Arkiv Service] Could not fetch wallet balance: ${sanitizeLog(balErr.message)}`
          );
        }
      }

      return serializeBigInt({
        status: 'connected',
        network: arkivChain.name,
        chainId: arkivChain.id,
        blockNumber,
        totalEntities: entityCount,
        wallet: {
          configured: Boolean(walletAddress),
          address: walletAddress,
          balance: walletBalanceFormatted,
          hasFunds: walletBalance ? walletBalance > 0n : false,
        },
      });
    } catch (error) {
      if (isTransientRpcError(error) || error.code === 'ARKIV_RPC_UNAVAILABLE') {
        throw new ArkivRpcUnavailableError(
          `Failed to connect to Arkiv Tiramisu RPC: ${error.message || 'Request timed out'}`,
          { cause: error }
        );
      }
      throw error;
    }
  }

  /**
   * Create an entity on Arkiv Tiramisu
   * Mutation: DOES NOT retry automatically to avoid duplicate submissions on-chain.
   *
   * @param {Object} params
   * @param {Object} params.payload - JSON-serializable record details
   * @param {Object} params.attributes - Typed or primitive indexing attributes
   * @param {number} [params.expiresDays=30] - Expiration time in days (defaults to 30 days)
   * @returns {Promise<{ entityKey: string, txHash: string, expiresAt: bigint }>}
   */
  async createEntity({ payload, attributes = {}, expiresDays = 30 }) {
    const walletClient = getWalletClient();
    const walletAddress = getWalletAddress();

    // Verify balance before attempting transaction (read-only balance check can be retried)
    const balance = await executeWithRetry('checkBalanceBeforeCreate', () =>
      publicClient.getBalance({ address: walletAddress })
    );

    if (balance === 0n) {
      throw new Error(
        `Operator wallet (${walletAddress}) has 0 GLM balance on Arkiv Tiramisu. ` +
        `Please request testnet tokens from the faucet at: https://hub.arkiv.network/faucet`
      );
    }

    const encodedPayload = jsonToPayload(payload);
    const expires = ExpirationTime.fromDays(Math.max(1, Number(expiresDays) || 30));

    // Submit mutation to Arkiv — NOT wrapped in retry loop to prevent duplicate transactions
    try {
      const result = await walletClient.createEntity({
        payload: encodedPayload,
        contentType: 'application/json',
        attributes,
        expires,
      });

      return serializeBigInt({
        entityKey: result.entityKey,
        txHash: result.txHash,
        expiresAt: result.expiresAt,
      });
    } catch (txError) {
      if (isTransientRpcError(txError)) {
        console.error(
          `[Arkiv Mutation] createEntity RPC timeout/error: ${sanitizeLog(txError.message)}. ` +
          `Transaction was NOT retried automatically to prevent duplicate on-chain submissions.`
        );
        throw new ArkivRpcUnavailableError(
          `Entity creation transaction timed out or failed on Arkiv RPC. ` +
          `Automatic retry was skipped to prevent duplicate records. Details: ${txError.message}`,
          { cause: txError }
        );
      }
      throw txError;
    }
  }

  /**
   * Retrieve an entity by its 32-byte hex key
   * Read-only: uses executeWithRetry (max 2 retries on transient RPC errors)
   *
   * @param {string} entityKey - 32-byte hex string (with 0x prefix)
   * @returns {Promise<Object|null>} Decoded entity details
   */
  async getEntityByKey(entityKey) {
    if (!entityKey || !/^0x[0-9a-fA-F]{64}$/.test(entityKey)) {
      throw new Error('Invalid Arkiv entity key. Must be a 32-byte hex string starting with 0x.');
    }

    try {
      const entity = await executeWithRetry(`getEntityByKey(${entityKey})`, () =>
        publicClient.getEntity(entityKey)
      );

      // Decode payload
      let parsedPayload = null;
      try {
        parsedPayload = entity.toJson();
      } catch {
        try {
          parsedPayload = entity.toText();
        } catch {
          parsedPayload = entity.payload;
        }
      }

      // Convert attributes object to a plain key-value map for convenience
      const simplifiedAttributes = {};
      if (entity.attributes) {
        for (const [k, v] of Object.entries(entity.attributes)) {
          simplifiedAttributes[k] = v?.value !== undefined ? v.value : v;
        }
      }

      return serializeBigInt({
        key: entity.key,
        owner: entity.owner,
        contentType: entity.contentType,
        payload: parsedPayload,
        attributes: simplifiedAttributes,
        rawAttributes: entity.attributes,
        createdAt: entity.createdAt,
        expiresAt: entity.expiresAt,
      });
    } catch (error) {
      if (error.name === 'NoEntityFoundError' || error.message?.includes('No live entity')) {
        return null;
      }
      if (isTransientRpcError(error) || error.code === 'ARKIV_RPC_UNAVAILABLE') {
        throw new ArkivRpcUnavailableError(
          `Failed to retrieve entity ${entityKey} from Arkiv: ${error.message || 'Request timed out'}`,
          { cause: error }
        );
      }
      throw error;
    }
  }

  /**
   * Query entities by a single attribute equality match
   * Read-only: uses executeWithRetry (max 2 retries on transient RPC errors)
   *
   * @param {Object} params
   * @param {string} params.attributeName - Attribute name (e.g. 'type')
   * @param {string|number|boolean} params.value - Value to filter on (e.g. 'shop')
   * @param {number} [params.limit=20] - Number of results to return
   * @returns {Promise<{ count: number, entities: Array<Object> }>}
   */
  async queryEntitiesByAttribute({ attributeName, value, limit = 20 }) {
    const pageLimit = Math.min(Math.max(1, limit), 100);

    const result = await executeWithRetry(
      `queryEntitiesByAttribute(${attributeName}=${value})`,
      () =>
        publicClient
          .select()
          .where(eq(attributeName, value))
          .limit(pageLimit)
          .fetch()
    );

    const formattedEntities = (result.entities || []).map((entity) => {
      let parsedPayload = null;
      try {
        parsedPayload = entity.toJson();
      } catch {
        try {
          parsedPayload = entity.toText();
        } catch {
          parsedPayload = null;
        }
      }

      const simplifiedAttributes = {};
      if (entity.attributes) {
        for (const [k, v] of Object.entries(entity.attributes)) {
          simplifiedAttributes[k] = v?.value !== undefined ? v.value : v;
        }
      }

      return {
        key: entity.key,
        owner: entity.owner,
        contentType: entity.contentType,
        payload: parsedPayload,
        attributes: simplifiedAttributes,
        createdAt: entity.createdAt,
        expiresAt: entity.expiresAt,
      };
    });

    return serializeBigInt({
      count: formattedEntities.length,
      blockNumber: result.blockNumber,
      cursor: result.cursor || null,
      entities: formattedEntities,
    });
  }

  /**
   * Query entities using multiple compound filter expressions
   * Read-only: uses executeWithRetry (max 2 retries on transient RPC errors)
   *
   * @param {Object} params
   * @param {Array} params.expressions - Array of SDK filter expressions (e.g. [eq('project', 'arkivtrace'), eq('type', 'shop')])
   * @param {number} [params.limit=20] - Number of results to return
   * @returns {Promise<{ count: number, blockNumber: string, cursor: string|null, entities: Array<Object> }>}
   */
  async queryEntities({ expressions = [], limit = 20 }) {
    const pageLimit = Math.min(Math.max(1, limit), 100);

    const result = await executeWithRetry(
      `queryEntities(${expressions.length} expressions)`,
      () => {
        let builder = publicClient.select();
        if (expressions.length > 0) {
          builder = builder.where(expressions);
        }
        return builder.limit(pageLimit).fetch();
      }
    );

    const formattedEntities = (result.entities || []).map((entity) => {
      let parsedPayload = null;
      try {
        parsedPayload = entity.toJson();
      } catch {
        try {
          parsedPayload = entity.toText();
        } catch {
          parsedPayload = null;
        }
      }

      const simplifiedAttributes = {};
      if (entity.attributes) {
        for (const [k, v] of Object.entries(entity.attributes)) {
          simplifiedAttributes[k] = v?.value !== undefined ? v.value : v;
        }
      }

      return {
        key: entity.key,
        owner: entity.owner,
        contentType: entity.contentType,
        payload: parsedPayload,
        attributes: simplifiedAttributes,
        createdAt: entity.createdAt,
        expiresAt: entity.expiresAt,
      };
    });

    return serializeBigInt({
      count: formattedEntities.length,
      blockNumber: result.blockNumber,
      cursor: result.cursor || null,
      entities: formattedEntities,
    });
  }
}

export const arkivService = new ArkivService();
