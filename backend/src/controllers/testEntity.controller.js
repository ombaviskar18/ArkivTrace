import { arkivService } from '../services/arkiv.service.js';
import { sanitizeLog } from '../config/arkiv.js';

/**
 * Controller for Arkiv connectivity and test entity operations
 */
export const testEntityController = {
  /**
   * GET /api/test/health
   * Network health check for Arkiv Tiramisu RPC and operator wallet.
   * Fails gracefully with HTTP 503 if RPC is unreachable, without printing an unhandled application error.
   */
  async getHealth(req, res) {
    try {
      const health = await arkivService.getNetworkHealth();
      return res.status(200).json({
        success: true,
        data: health,
      });
    } catch (error) {
      console.warn(`[Arkiv Health] Health check degraded/unavailable: ${sanitizeLog(error.message)}`);
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        code: 'ARKIV_RPC_UNAVAILABLE',
        message: 'Arkiv Tiramisu RPC is temporarily unavailable or timed out.',
        data: {
          status: 'unavailable',
          network: 'Tiramisu',
          chainId: 7738577,
          details: sanitizeLog(error.message),
        },
      });
    }
  },

  /**
   * POST /api/test/create
   * Creates a new test entity on the Arkiv Tiramisu blockchain database
   */
  async createTestEntity(req, res, next) {
    try {
      const { name, description, category, sampleData, expiresDays } = req.body;

      const payload = {
        name,
        description: description || 'Test entity for ArkivTrace backend initialization',
        category,
        sampleData: sampleData || {},
        system: 'ArkivTrace',
        timestamp: new Date().toISOString(),
      };

      const attributes = {
        type: 'test_entity',
        category,
        name,
      };

      const result = await arkivService.createEntity({
        payload,
        attributes,
        expiresDays,
      });

      return res.status(201).json({
        success: true,
        message: 'Test entity successfully created on Arkiv Tiramisu database',
        data: {
          entityKey: result.entityKey,
          txHash: result.txHash,
          expiresAt: result.expiresAt,
          attributes,
          payload,
          explorerUrl: `https://tiramisu.explorer.arkiv.network/tx/${result.txHash}`,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/test/entity/:key
   * Retrieves an entity by its 32-byte hex key from Arkiv Tiramisu
   */
  async getEntity(req, res, next) {
    try {
      const { key } = req.params;
      const entity = await arkivService.getEntityByKey(key);

      if (!entity) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `No active Arkiv entity found with key: ${key}`,
        });
      }

      return res.status(200).json({
        success: true,
        data: entity,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/test/list
   * Queries existing test entities from Arkiv Tiramisu
   */
  async listTestEntities(req, res, next) {
    try {
      const limit = Number(req.query.limit) || 10;
      const result = await arkivService.queryEntitiesByAttribute({
        attributeName: 'type',
        value: 'test_entity',
        limit,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
