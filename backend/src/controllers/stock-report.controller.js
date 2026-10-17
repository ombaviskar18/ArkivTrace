import { stockReportService } from '../services/stock-report.service.js';

export const stockReportController = {
  /**
   * POST /api/v1/stock-reports
   * Admin or operator submits a monthly stock and distribution report.
   */
  async createStockReport(req, res, next) {
    try {
      const result = await stockReportService.createStockReport(req.body);

      const { stockStatus, stockDifferenceKg, receiptCount } = result.stockAnalysis;

      const statusMsg =
        stockStatus === 'MATCH'
          ? 'Stock balances MATCH — no discrepancy detected.'
          : stockStatus === 'MISMATCH'
            ? `Stock MISMATCH detected: difference of ${stockDifferenceKg} kg.`
            : 'INSUFFICIENT_DATA — report recorded but receipt data may be incomplete.';

      return res.status(201).json({
        success: true,
        message:
          `Stock report '${result.reportId}' created for shop '${result.shopId}', ` +
          `grain '${result.grainType}', period '${result.period}'. ` +
          `Receipts found: ${receiptCount}. ${statusMsg}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/stock-reports/:id
   * Retrieve a stock report by its reportId or Arkiv entity key.
   */
  async getStockReportById(req, res, next) {
    try {
      const { id } = req.params;
      const report = await stockReportService.getStockReportById(id);

      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Stock report '${id}' was not found on Arkiv database`,
        });
      }

      return res.status(200).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/stock-reports
   * List stock reports, filterable by shopId, period, grainType, stockStatus.
   */
  async listStockReports(req, res, next) {
    try {
      const { shopId, period, grainType, stockStatus, limit } = req.query;
      const result = await stockReportService.listStockReports({
        shopId,
        period,
        grainType,
        stockStatus,
        limit: Number(limit) || 20,
      });

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};
