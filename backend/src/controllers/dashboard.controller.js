import { dashboardService } from '../services/dashboard.service.js';

export const dashboardController = {
  /**
   * GET /api/v1/dashboard/summary
   */
  async getSummary(req, res, next) {
    try {
      const { district, period, limit } = req.query;
      const result = await dashboardService.getSummary({
        district,
        period,
        limit: Number(limit) || 10,
      });

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};
