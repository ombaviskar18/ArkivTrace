import { dashboardService } from '../services/dashboard.service.js';

export const recordsController = {
  /**
   * GET /api/v1/records
   */
  async listRecords(req, res, next) {
    try {
      const { shopId, district, period, recordType, limit } = req.query;
      const result = await dashboardService.listRecords({
        shopId,
        district,
        period,
        recordType,
        limit: Number(limit) || 50,
      });

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};
