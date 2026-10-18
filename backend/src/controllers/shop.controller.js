import { shopService } from '../services/shop.service.js';
import { dashboardService } from '../services/dashboard.service.js';

export const shopController = {
  /**
   * POST /api/v1/shops
   * Register a new Fair Price Shop (Admin only)
   */
  async createShop(req, res, next) {
    try {
      const result = await shopService.createShop(req.body);
      const isInvited = result.operatorAssignment?.status === 'invitation_created';
      const message = isInvited
        ? `Ration shop '${result.shopId}' registered on Arkiv. Invitation created and sent to '${req.body.operatorEmail}'.`
        : `Ration shop '${result.shopId}' successfully registered on Arkiv Tiramisu database with operator assigned.`;
      return res.status(201).json({
        success: true,
        message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/shops/:id
   * Get shop by Arkiv entity key or shopId
   */
  async getShopById(req, res, next) {
    try {
      const { id } = req.params;
      const shop = await shopService.getShopById(id);

      if (!shop) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Ration shop with identifier '${id}' was not found on Arkiv database`,
        });
      }

      return res.status(200).json({
        success: true,
        data: shop,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/shops
   * List ration shops with optional filters
   */
  async listShops(req, res, next) {
    try {
      const { district, state, shopId, limit } = req.query;
      const result = await shopService.listShops({
        district,
        state,
        shopId,
        limit: Number(limit) || 20,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/shops/:id/timeline
   * Returns a combined evidence timeline for a single shop.
   */
  async getShopTimeline(req, res, next) {
    try {
      const { id } = req.params;
      const { period, limit } = req.query;
      const result = await dashboardService.getShopTimeline(id, {
        period,
        limit: Number(limit) || 50,
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Shop '${id}' was not found on Arkiv database`,
        });
      }

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/shops/:id/operator
   * Assign or update operator email for an existing shop (Admin only)
   */
  async assignOperator(req, res, next) {
    try {
      const { id } = req.params;
      const { operatorEmail } = req.body;
      const result = await shopService.assignOperatorToShop(id, operatorEmail);
      return res.status(200).json({
        success: true,
        message: `Operator '${operatorEmail}' successfully assigned to shop '${id}'.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
