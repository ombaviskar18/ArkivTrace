import { discrepancyService } from '../services/discrepancy.service.js';
import { telegramService } from '../services/telegram.service.js';

export const discrepancyController = {
  async listDiscrepancies(req, res, next) {
    try {
      const { shopId, period, caseStatus, severity, limit } = req.query;
      const result = await discrepancyService.listDiscrepancies({
        shopId,
        period,
        caseStatus,
        severity,
        limit: Number(limit) || 20,
      });

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async getDiscrepancyById(req, res, next) {
    try {
      const { id } = req.params;
      const discrepancy = await discrepancyService.getDiscrepancyById(id);

      if (!discrepancy) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Discrepancy '${id}' was not found on Arkiv database`,
        });
      }

      return res.status(200).json({ success: true, data: discrepancy });
    } catch (error) {
      next(error);
    }
  },

  async createPublicDiscrepancy(req, res, next) {
    try {
      const result = await discrepancyService.createPublicDiscrepancyReport(req.body);

      if (!result.duplicate && ['major', 'critical'].includes(result.severity)) {
        setImmediate(async () => {
          try {
            await telegramService.notifyDiscrepancyRecorded({
              discrepancyId: result.discrepancyId,
              shopId: result.shopId,
              severity: result.severity,
              entityKey: result.entityKey,
              txHash: result.txHash,
              evidenceEntityKeys: result.evidenceEntityKeys,
            });
          } catch (tgErr) {
            console.warn('[DiscrepancyController] Telegram alert skipped/failed:', tgErr.message);
          }
        });
      }

      return res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate,
        message: result.duplicate
          ? `Discrepancy report '${result.discrepancyId}' already exists on Arkiv.`
          : `Discrepancy report '${result.discrepancyId}' created on Arkiv.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async reviewDiscrepancy(req, res, next) {
    try {
      const { id } = req.params;
      const result = await discrepancyService.reviewDiscrepancy(id, req.body, req.userRole || 'admin');

      return res.status(result.duplicate ? 200 : 201).json({
        success: true,
        duplicate: result.duplicate,
        message: result.duplicate
          ? `Review for '${result.discrepancyId}' already recorded.`
          : `Review for '${result.discrepancyId}' recorded on Arkiv.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
