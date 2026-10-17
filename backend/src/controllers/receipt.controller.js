import { receiptService } from '../services/receipt.service.js';
import { telegramService } from '../services/telegram.service.js';

export const receiptController = {
  /**
   * POST /api/v1/receipts
   * Shop operator confirms the grain quantity received from a dispatch.
   * Automatically detects and records any weight discrepancy on-chain.
   */
  async createReceipt(req, res, next) {
    try {
      const result = await receiptService.createReceipt(req.body);

      // Asynchronously trigger Telegram alert if discrepancy detected
      if (result.discrepancy?.detected) {
        setImmediate(async () => {
          try {
            await telegramService.notifyDiscrepancyRecorded({
              discrepancyId: `DISC-${result.receiptId}-${result.dispatchId}`,
              shopId: result.shopId,
              severity: result.discrepancy.status,
              discrepancyKg: result.discrepancy.discrepancyKg,
              discrepancyPercent: result.discrepancy.discrepancyPercent,
              dispatchedQuantityKg: result.discrepancy.dispatchedQuantityKg,
              receivedQuantityKg: result.discrepancy.receivedQuantityKg,
              entityKey: result.discrepancy.entityKey,
              txHash: result.discrepancy.txHash,
              receiptId: result.receiptId,
              dispatchId: result.dispatchId,
            });
          } catch (tgErr) {
            console.warn('[ReceiptController] Telegram alert skipped/failed:', tgErr.message);
          }
        });
      }

      const discrepancyMsg =
        result.discrepancy.detected
          ? ` ⚠️ Discrepancy detected: ${result.discrepancy.discrepancyKg}kg (${result.discrepancy.discrepancyPercent}%) — status: ${result.discrepancy.status}`
          : ' No discrepancy detected.';

      return res.status(201).json({
        success: true,
        message:
          `Receipt '${result.receiptId}' confirmed on Arkiv Tiramisu.${discrepancyMsg}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/receipts/:id
   * Retrieve a receipt record by Arkiv entity key or receiptId.
   */
  async getReceiptById(req, res, next) {
    try {
      const { id } = req.params;
      const receipt = await receiptService.getReceiptById(id);

      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Receipt record '${id}' was not found on Arkiv database`,
        });
      }

      return res.status(200).json({ success: true, data: receipt });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/receipts
   * List receipt records with optional filters (shopId, dispatchId, status).
   */
  async listReceipts(req, res, next) {
    try {
      const { shopId, dispatchId, status, limit } = req.query;
      const result = await receiptService.listReceipts({
        shopId,
        dispatchId,
        status,
        limit: Number(limit) || 20,
      });

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};
