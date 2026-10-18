import { eq } from '@arkiv-network/sdk/query';
import { arkivService } from './arkiv.service.js';
import { dispatchService } from './dispatch.service.js';

/**
 * Discrepancy thresholds
 *
 * TOLERANCE_PERCENT  – differences within this range are considered normal
 *                      transit loss (e.g. 2 % of dispatched weight).
 * CRITICAL_PERCENT   – differences at or above this threshold are flagged
 *                      as critical (potential diversion / theft).
 */
const TOLERANCE_PERCENT = 2;
const CRITICAL_PERCENT = 10;

/**
 * Shop Receipt Confirmation Service
 *
 * Shop operators call this after grain physically arrives.
 * The service:
 *   1. Records the confirmed received quantity on Arkiv Tiramisu.
 *   2. Automatically calculates any discrepancy vs the linked dispatch.
 *   3. Persists a `discrepancy` entity on-chain when the gap is outside
 *      the tolerance band.
 */
class ReceiptService {
  // -----------------------------------------------------------------------
  //  createReceipt
  // -----------------------------------------------------------------------

  /**
   * Confirm grain receipt and optionally flag a discrepancy.
   *
   * @param {Object} receiptData - Validated receipt payload
   * @returns {Promise<Object>} Created receipt + discrepancy (if any)
   */
  async createReceipt(receiptData) {
    // 1. Prevent duplicate receipt IDs
    const existing = await this.getReceiptById(receiptData.receiptId);
    if (existing) {
      const error = new Error(
        `A receipt record with ID '${receiptData.receiptId}' already exists on Arkiv.`,
      );
      error.statusCode = 409;
      throw error;
    }

    // 2. Look up the linked dispatch to get dispatched quantity
    const dispatch = await dispatchService.getDispatchById(receiptData.dispatchId);
    if (!dispatch) {
      const error = new Error(
        `Dispatch record '${receiptData.dispatchId}' not found on Arkiv. ` +
          'Cannot confirm receipt for an unregistered dispatch.',
      );
      error.statusCode = 404;
      throw error;
    }

    const dispatchedQty = dispatch.payload?.dispatchedQuantityKg ?? 0;
    const receivedQty = receiptData.receivedQuantityKg;

    // 3. Discrepancy calculation
    const { discrepancyKg, discrepancyPercent, discrepancyStatus } =
      this._calculateDiscrepancy(dispatchedQty, receivedQty);

    const grainType = dispatch.payload?.grainType || dispatch.payload?.grain_type || dispatch.attributes?.grain_type || 'wheat';

    // 4. Arkiv attributes (snake_case — Arkiv rejects camelCase bytes on-chain)
    const attributes = {
      project: 'arkivtrace',
      type: 'receipt',
      receipt_id: receiptData.receiptId,
      dispatch_id: receiptData.dispatchId,
      shop_id: receiptData.shopId,
      grain_type: grainType,
      status: 'confirmed',
      discrepancy_status: discrepancyStatus, // none | minor | major | critical
    };

    // 5. Full payload stored as JSON on Arkiv
    const payload = { ...receiptData };
    delete payload.receiverName;
    Object.assign(payload, {
      project: 'arkivtrace',
      entityType: 'receipt',
      dispatchEntityKey: dispatch.key,
      grainType,
      dispatchedQuantityKg: dispatchedQty,
      discrepancyKg,
      discrepancyPercent,
      discrepancyStatus,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    });

    // 6. Write receipt entity to Arkiv (do NOT retry — mutation must not be duplicated)
    const receiptResult = await arkivService.createEntity({
      payload,
      attributes,
      expiresDays: 365,
    });

    // 7. Persist discrepancy entity when gap exceeds tolerance (major or critical only; minor transit loss is recorded on receipt only)
    let discrepancyResult = null;
    if (discrepancyStatus === 'major' || discrepancyStatus === 'critical') {
      discrepancyResult = await this._recordDiscrepancy({
        receiptId: receiptData.receiptId,
        dispatchId: receiptData.dispatchId,
        shopId: receiptData.shopId,
        receiptEntityKey: receiptResult.entityKey,
        dispatchEntityKey: dispatch.key,
        dispatchedQuantityKg: dispatchedQty,
        receivedQuantityKg: receivedQty,
        discrepancyKg,
        discrepancyPercent,
        discrepancyStatus,
      });
    }

    return {
      entityKey: receiptResult.entityKey,
      txHash: receiptResult.txHash,
      expiresAt: receiptResult.expiresAt,
      receiptId: receiptData.receiptId,
      dispatchId: receiptData.dispatchId,
      shopId: receiptData.shopId,
      attributes,
      payload,
      discrepancy: discrepancyResult
        ? {
            detected: true,
            status: discrepancyStatus,
            dispatchedQuantityKg: dispatchedQty,
            receivedQuantityKg: receivedQty,
            discrepancyKg,
            discrepancyPercent,
            entityKey: discrepancyResult.entityKey,
            txHash: discrepancyResult.txHash,
            explorerUrl: `https://tiramisu.explorer.arkiv.network/tx/${discrepancyResult.txHash}`,
          }
        : {
            detected: false,
            status: 'none',
            dispatchedQuantityKg: dispatchedQty,
            receivedQuantityKg: receivedQty,
            discrepancyKg,
            discrepancyPercent,
          },
      explorerUrl: `https://tiramisu.explorer.arkiv.network/tx/${receiptResult.txHash}`,
    };
  }

  // -----------------------------------------------------------------------
  //  getReceiptById
  // -----------------------------------------------------------------------

  /**
   * Retrieve a receipt by its Arkiv entityKey or receiptId.
   *
   * @param {string} identifier - 32-byte hex key or receiptId string
   * @returns {Promise<Object|null>}
   */
  async getReceiptById(identifier) {
    if (!identifier) return null;

    // Direct entity key lookup (faster — single RPC call)
    if (/^0x[0-9a-fA-F]{64}$/.test(identifier)) {
      const entity = await arkivService.getEntityByKey(identifier);
      if (entity && entity.attributes?.type === 'receipt') return entity;
      return null;
    }

    // Query by receipt_id attribute
    const result = await arkivService.queryEntities({
      expressions: [
        eq('project', 'arkivtrace'),
        eq('type', 'receipt'),
        eq('receipt_id', identifier),
      ],
      limit: 1,
    });

    return result.entities.length > 0 ? result.entities[0] : null;
  }

  // -----------------------------------------------------------------------
  //  listReceipts
  // -----------------------------------------------------------------------

  /**
   * List receipt records with optional filters.
   *
   * @param {Object} filters
   * @param {string} [filters.shopId]
   * @param {string} [filters.dispatchId]
   * @param {string} [filters.status]
   * @param {number} [filters.limit=20]
   * @returns {Promise<{ count: number, entities: Array<Object> }>}
   */
  async listReceipts({ shopId, dispatchId, status, limit = 20 } = {}) {
    const expressions = [eq('project', 'arkivtrace'), eq('type', 'receipt')];

    if (shopId) expressions.push(eq('shop_id', shopId));
    if (dispatchId) expressions.push(eq('dispatch_id', dispatchId));
    if (status) expressions.push(eq('status', status));

    return await arkivService.queryEntities({ expressions, limit });
  }

  // -----------------------------------------------------------------------
  //  Private helpers
  // -----------------------------------------------------------------------

  /**
   * Calculate discrepancy between dispatched and received quantities.
   *
   * @param {number} dispatched
   * @param {number} received
   * @returns {{ discrepancyKg: number, discrepancyPercent: number, discrepancyStatus: string }}
   */
  _calculateDiscrepancy(dispatched, received) {
    const discrepancyKg = parseFloat((dispatched - received).toFixed(2));
    const discrepancyPercent =
      dispatched > 0 ? parseFloat(((discrepancyKg / dispatched) * 100).toFixed(2)) : 0;

    let discrepancyStatus = 'none';
    const absPercent = Math.abs(discrepancyPercent);

    if (absPercent > 0 && absPercent <= TOLERANCE_PERCENT) {
      discrepancyStatus = 'minor'; // normal transit loss
    } else if (absPercent > TOLERANCE_PERCENT && absPercent < CRITICAL_PERCENT) {
      discrepancyStatus = 'major'; // significant — needs investigation
    } else if (absPercent >= CRITICAL_PERCENT) {
      discrepancyStatus = 'critical'; // potential diversion / theft
    }

    return { discrepancyKg, discrepancyPercent, discrepancyStatus };
  }

  /**
   * Persist a `discrepancy` entity on Arkiv Tiramisu.
   * Generates a deterministic discrepancy ID from receipt + dispatch IDs.
   *
   * @param {Object} data
   * @returns {Promise<Object>} Arkiv createEntity result
   */
  async _recordDiscrepancy(data) {
    const discrepancyId = `DISC-${data.receiptId}-${data.dispatchId}`.slice(0, 32);

    const attributes = {
      project: 'arkivtrace',
      type: 'discrepancy',
      discrepancy_id: discrepancyId,
      receipt_id: data.receiptId,
      dispatch_id: data.dispatchId,
      shop_id: data.shopId,
      discrepancy_status: data.discrepancyStatus, // major | critical
      resolution_status: 'open',                  // open | resolved
    };

    const payload = {
      ...data,
      project: 'arkivtrace',
      entityType: 'discrepancy',
      discrepancyId,
      resolutionStatus: 'open',
      createdAt: new Date().toISOString(),
    };

    console.log(
      `[Receipt] 🚨 Discrepancy detected (${data.discrepancyStatus}): ` +
        `dispatched=${data.dispatchedQuantityKg}kg, received=${data.receivedQuantityKg}kg, ` +
        `gap=${data.discrepancyKg}kg (${data.discrepancyPercent}%)`,
    );

    return await arkivService.createEntity({
      payload,
      attributes,
      expiresDays: 365,
    });
  }
}

export const receiptService = new ReceiptService();
