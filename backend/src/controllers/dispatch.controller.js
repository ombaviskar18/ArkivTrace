import { dispatchService } from '../services/dispatch.service.js';

export const dispatchController = {
  /**
   * POST /api/v1/dispatches
   * Create a new grain dispatch record (Admin only)
   */
  async createDispatch(req, res, next) {
    try {
      const result = await dispatchService.createDispatch(req.body);
      return res.status(201).json({
        success: true,
        message: `Grain dispatch '${result.dispatchId}' successfully recorded on Arkiv Tiramisu database`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/dispatches/:id
   * Retrieve dispatch by Arkiv entity key or dispatchId
   */
  async getDispatchById(req, res, next) {
    try {
      const { id } = req.params;
      const dispatch = await dispatchService.getDispatchById(id);

      if (!dispatch) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Grain dispatch record '${id}' was not found on Arkiv database`,
        });
      }

      return res.status(200).json({
        success: true,
        data: dispatch,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/dispatches
   * List grain dispatch records with optional filters
   */
  async listDispatches(req, res, next) {
    try {
      const { shopId, status, grainType, limit } = req.query;
      const result = await dispatchService.listDispatches({
        shopId,
        status,
        grainType,
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
};
