import { dashboardService } from '../services/dashboard.service.js';
import { arkivService } from '../services/arkiv.service.js';
import { dispatchService } from '../services/dispatch.service.js';
import { receiptService } from '../services/receipt.service.js';
import { stockReportService } from '../services/stock-report.service.js';
import { discrepancyService } from '../services/discrepancy.service.js';
import { shopService } from '../services/shop.service.js';

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

  /**
   * GET /api/v1/records/:key
   * Retrieve an individual record by 32-byte Arkiv entity key or business identifier
   */
  async getRecordByIdentifier(req, res, next) {
    try {
      const { key } = req.params;
      if (!key) {
        return res.status(400).json({ success: false, error: 'Key is required' });
      }

      const cleanKey = key
        .trim()
        .replace(/^arkiv:[^:]+:entity:/i, '')
        .replace(/^arkiv:entity:/i, '');

      // 1. Direct Arkiv 32-byte hex entity lookup
      const targetHash = /^0x[0-9a-fA-F]{64}$/.test(cleanKey)
        ? cleanKey
        : /^0x[0-9a-fA-F]{64}$/.test(key)
        ? key
        : null;

      if (targetHash) {
        try {
          const entity = await arkivService.getEntityByKey(targetHash);
          if (entity) {
            return res.status(200).json({ success: true, data: entity });
          }
        } catch {
          // If not found or error, continue trying domain services
        }
      }

      // Check both cleanKey and original key across domain services
      const candidates = Array.from(new Set([cleanKey, key].filter(Boolean)));
      for (const candidate of candidates) {
        // 2. Dispatch by dispatchId
        try {
          const dispatch = await dispatchService.getDispatchById(candidate);
          if (dispatch) return res.status(200).json({ success: true, data: dispatch });
        } catch {}

        // 3. Receipt by receiptId
        try {
          const receipt = await receiptService.getReceiptById(candidate);
          if (receipt) return res.status(200).json({ success: true, data: receipt });
        } catch {}

        // 4. Stock report by reportId
        try {
          const report = await stockReportService.getStockReportById(candidate);
          if (report) return res.status(200).json({ success: true, data: report });
        } catch {}

        // 5. Discrepancy by discrepancyId
        try {
          const discrepancy = await discrepancyService.getDiscrepancyById(candidate);
          if (discrepancy) return res.status(200).json({ success: true, data: discrepancy });
        } catch {}

        // 6. Shop by shopId
        try {
          const shop = await shopService.getShopById(candidate);
          if (shop) return res.status(200).json({ success: true, data: shop });
        } catch {}
      }

      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Record '${key}' was not found on Arkiv database`,
      });
    } catch (error) {
      next(error);
    }
  },
};
