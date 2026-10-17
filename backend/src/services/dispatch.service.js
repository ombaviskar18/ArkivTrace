import { eq } from '@arkiv-network/sdk/query';
import { arkivService } from './arkiv.service.js';
import { shopService } from './shop.service.js';

/**
 * Grain Dispatch Management Service
 * Manages government depot grain dispatch records on Arkiv Tiramisu.
 */
class DispatchService {
  /**
   * Create and record a new grain dispatch on Arkiv Tiramisu
   *
   * @param {Object} dispatchData - Validated dispatch record
   * @returns {Promise<Object>} Created dispatch details
   */
  async createDispatch(dispatchData) {
    // 1. Prevent duplicate dispatch IDs
    const existing = await this.getDispatchById(dispatchData.dispatchId);
    if (existing) {
      const error = new Error(`A dispatch record with ID '${dispatchData.dispatchId}' already exists on Arkiv.`);
      error.statusCode = 409;
      throw error;
    }

    // 2. Validate destination shop existence
    const targetShop = await shopService.getShopById(dispatchData.shopId);
    if (!targetShop) {
      console.warn(`[Dispatch] Destination shop '${dispatchData.shopId}' not found on Arkiv yet. Proceeding with registration.`);
    }

    // 3. Queryable indexing attributes (Arkiv on-chain indexing uses snake_case lowercase)
    const attributes = {
      project: 'arkivtrace',
      type: 'dispatch',
      dispatch_id: dispatchData.dispatchId,
      shop_id: dispatchData.shopId,
      grain_type: dispatchData.grainType,
      status: 'dispatched',
    };

    // 4. Record payload
    const payload = {
      ...dispatchData,
      project: 'arkivtrace',
      entityType: 'dispatch',
      shopEntityKey: targetShop?.key || null,
      shopName: targetShop?.payload?.name || null,
      status: 'dispatched',
      createdAt: new Date().toISOString(),
    };

    // 5. Submit to Arkiv
    const result = await arkivService.createEntity({
      payload,
      attributes,
      expiresDays: 180,
    });

    return {
      entityKey: result.entityKey,
      txHash: result.txHash,
      expiresAt: result.expiresAt,
      dispatchId: dispatchData.dispatchId,
      shopId: dispatchData.shopId,
      attributes,
      payload,
      explorerUrl: `https://tiramisu.explorer.arkiv.network/tx/${result.txHash}`,
    };
  }

  /**
   * Retrieve a dispatch by its Arkiv entityKey or dispatchId
   *
   * @param {string} identifier - 32-byte hex key or dispatchId
   * @returns {Promise<Object|null>}
   */
  async getDispatchById(identifier) {
    if (!identifier) return null;

    if (/^0x[0-9a-fA-F]{64}$/.test(identifier)) {
      const entity = await arkivService.getEntityByKey(identifier);
      if (entity && entity.attributes?.type === 'dispatch') {
        return entity;
      }
      return null;
    }

    const result = await arkivService.queryEntities({
      expressions: [
        eq('project', 'arkivtrace'),
        eq('type', 'dispatch'),
        eq('dispatch_id', identifier),
      ],
      limit: 1,
    });

    return result.entities.length > 0 ? result.entities[0] : null;
  }

  /**
   * List dispatch records with optional filters
   *
   * @param {Object} filters
   * @param {string} [filters.shopId]
   * @param {string} [filters.status]
   * @param {string} [filters.grainType]
   * @param {number} [filters.limit=20]
   * @returns {Promise<{ count: number, entities: Array<Object> }>}
   */
  async listDispatches({ shopId, status, grainType, limit = 20 } = {}) {
    const expressions = [
      eq('project', 'arkivtrace'),
      eq('type', 'dispatch'),
    ];

    if (shopId) {
      expressions.push(eq('shop_id', shopId));
    }
    if (status) {
      expressions.push(eq('status', status));
    }
    if (grainType) {
      expressions.push(eq('grain_type', grainType));
    }

    return await arkivService.queryEntities({
      expressions,
      limit,
    });
  }
}

export const dispatchService = new DispatchService();
