import { eq } from '@arkiv-network/sdk/query';
import { arkivService } from './arkiv.service.js';

/**
 * Shop Management Service
 * Manages ration shop entities stored on the Arkiv Tiramisu Web3 Database.
 */
class ShopService {
  /**
   * Register a new Fair Price Shop on Arkiv Tiramisu
   *
   * @param {Object} shopData - Validated shop data
   * @returns {Promise<Object>} Created entity details including on-chain transaction hash
   */
  async createShop(shopData) {
    // 1. Check if shopId already registered to prevent duplicates
    const existing = await this.getShopById(shopData.shopId);
    if (existing) {
      const error = new Error(`A ration shop with ID '${shopData.shopId}' is already registered on Arkiv.`);
      error.statusCode = 409;
      throw error;
    }

    // 2. Queryable indexing attributes (Arkiv on-chain indexing uses snake_case lowercase)
    const attributes = {
      project: 'arkivtrace',
      type: 'shop',
      shop_id: shopData.shopId,
      district: shopData.district,
      state: shopData.state,
    };

    // 3. Full record payload
    const payload = { ...shopData };
    delete payload.operatorName;
    delete payload.operatorAddress;
    Object.assign(payload, {
      project: 'arkivtrace',
      entityType: 'shop',
      createdAt: new Date().toISOString(),
    });

    // 4. Submit to Arkiv (stores for 180 days by default)
    const result = await arkivService.createEntity({
      payload,
      attributes,
      expiresDays: 180,
    });

    return {
      entityKey: result.entityKey,
      txHash: result.txHash,
      expiresAt: result.expiresAt,
      shopId: shopData.shopId,
      attributes,
      payload,
      explorerUrl: `https://tiramisu.explorer.arkiv.network/tx/${result.txHash}`,
    };
  }

  /**
   * Retrieve a shop by its 32-byte Arkiv entityKey or its shopId
   *
   * @param {string} identifier - 32-byte hex key or unique shopId
   * @returns {Promise<Object|null>}
   */
  async getShopById(identifier) {
    if (!identifier) return null;

    // Check if identifier is an Arkiv 32-byte hex entity key
    if (/^0x[0-9a-fA-F]{64}$/.test(identifier)) {
      const entity = await arkivService.getEntityByKey(identifier);
      if (entity && entity.attributes?.type === 'shop') {
        return entity;
      }
      return null;
    }

    // Otherwise, query by shop_id attribute
    const result = await arkivService.queryEntities({
      expressions: [
        eq('project', 'arkivtrace'),
        eq('type', 'shop'),
        eq('shop_id', identifier),
      ],
      limit: 1,
    });

    return result.entities.length > 0 ? result.entities[0] : null;
  }

  /**
   * List shops from Arkiv with optional filters
   *
   * @param {Object} filters
   * @param {string} [filters.district]
   * @param {string} [filters.state]
   * @param {string} [filters.shopId]
   * @param {number} [filters.limit=20]
   * @returns {Promise<{ count: number, entities: Array<Object> }>}
   */
  async listShops({ district, state, shopId, limit = 20 } = {}) {
    const expressions = [
      eq('project', 'arkivtrace'),
      eq('type', 'shop'),
    ];

    if (district) {
      expressions.push(eq('district', district));
    }
    if (state) {
      expressions.push(eq('state', state));
    }
    if (shopId) {
      expressions.push(eq('shop_id', shopId));
    }

    return await arkivService.queryEntities({
      expressions,
      limit,
    });
  }
}

export const shopService = new ShopService();
