import { eq } from '@arkiv-network/sdk/query';
import { arkivService } from './arkiv.service.js';
import { shopService } from './shop.service.js';
import { receiptService } from './receipt.service.js';
import { dispatchService } from './dispatch.service.js';

// ---------------------------------------------------------------------------
// Stock-status determination
// ---------------------------------------------------------------------------

/**
 * Tolerance band: differences ≤ this absolute value in kg are considered a MATCH.
 * Set to 0 for exact match; raise slightly to allow rounding noise if needed.
 */
const STOCK_TOLERANCE_KG = 0;

/**
 * Stock and Distribution Reporting Service  (Module 4)
 *
 * Monthly cycle:
 *  1. Admin/operator submits report for a shop+grainType+period.
 *  2. Service fetches all confirmed receipts for that shop+grain in the period.
 *  3. Calculates:
 *       totalReceivedKg       = sum of receivedQuantityKg from receipts
 *       expectedClosingKg     = openingStockKg + totalReceivedKg - distributedKg
 *       stockDifferenceKg     = closingStockKg - expectedClosingKg
 *  4. Determines stockStatus:
 *       MATCH             – difference is within tolerance
 *       MISMATCH          – difference exceeds tolerance (creates discrepancy entity)
 *       INSUFFICIENT_DATA – reporting period cannot be verified from receipts yet
 *  5. Writes a stock_report entity on Arkiv with full evidence.
 *  6. If MISMATCH, writes a discrepancy entity referencing the report.
 *
 * Requirement note (§9): "Missing data must not be treated as zero."
 * An *explicit* period with confirmed zero receipts IS valid zero-received data.
 * If the period is current/future and no matching receipts are recorded yet,
 * the report is marked INSUFFICIENT_DATA instead of silently treating the gap as 0.
 */
class StockReportService {
  // -------------------------------------------------------------------------
  //  createStockReport
  // -------------------------------------------------------------------------

  /**
   * Create a monthly stock/distribution report and auto-detect mismatches.
   *
   * @param {Object} data  - Validated report payload from Zod
   * @param {string} data.reportId
   * @param {string} data.shopId
   * @param {string} data.grainType
   * @param {string} data.period      - "YYYY-MM"
   * @param {number} data.openingStockKg
   * @param {number} data.distributedKg
   * @param {number} data.closingStockKg
   * @param {string} [data.remarks]
   * @returns {Promise<Object>}
   */
  async createStockReport(data) {
    const { reportId, shopId, grainType, period } = data;

    // 1. Duplicate prevention: one active report per shop+grain+period
    const duplicate = await this._findExistingReport(shopId, grainType, period);
    if (duplicate) {
      const error = new Error(
        `An active stock report for shop '${shopId}', grain '${grainType}', ` +
          `period '${period}' already exists on Arkiv (entity key: ${duplicate.key}).`,
      );
      error.statusCode = 409;
      throw error;
    }

    // 2. Also check by reportId to prevent re-submission of same report ID
    const existingById = await this.getStockReportById(reportId);
    if (existingById) {
      const error = new Error(
        `A stock report with ID '${reportId}' already exists on Arkiv.`,
      );
      error.statusCode = 409;
      throw error;
    }

    // 3. Verify the shop exists on Arkiv
    const shop = await shopService.getShopById(shopId);
    if (!shop) {
      const error = new Error(
        `Shop '${shopId}' is not registered on Arkiv Tiramisu. ` +
          `Register the shop first via POST /api/v1/shops.`,
      );
      error.statusCode = 404;
      throw error;
    }

    // 4. Fetch confirmed receipts for this shop + grain in the reporting period
    const receiptResult = await this._fetchPeriodReceipts(shopId, grainType, period);
    const {
      receipts,
      receiptEntityKeys,
      totalReceivedKg,
      receiptDataComplete,
      unresolvedReceiptEntityKeys,
    } = receiptResult;

    // 5. Compute stock balance
    const { openingStockKg, distributedKg, closingStockKg } = data;
    const expectedClosingKg = receiptDataComplete
      ? openingStockKg + totalReceivedKg - distributedKg
      : null;
    const stockDifferenceKg = receiptDataComplete
      ? parseFloat((closingStockKg - expectedClosingKg).toFixed(2))
      : null;

    // 6. Flag if distributed > available stock (opening + received)
    const availableStockKg = receiptDataComplete ? openingStockKg + totalReceivedKg : null;
    const distributedExceedsAvailable = receiptDataComplete
      ? distributedKg > availableStockKg
      : null;

    // 7. Determine overall stock status
    const stockStatus = this._determineStockStatus({
      stockDifferenceKg,
      receiptDataComplete,
    });

    // 8. Arkiv attributes — snake_case, all queryable
    const attributes = {
      project: 'arkivtrace',
      type: 'stock_report',
      report_id: reportId,
      shop_id: shopId,
      grain_type: grainType,
      period,                      // "YYYY-MM" — indexable as a string attribute
      stock_status: stockStatus,   // MATCH | MISMATCH | INSUFFICIENT_DATA
    };

    // 9. Full evidence payload
    const payload = {
      ...data,
      project: 'arkivtrace',
      entityType: 'stock_report',
      shopEntityKey: shop.key,
      shopName: shop.payload?.name || null,
      totalReceivedKg,
      expectedClosingKg,
      stockDifferenceKg,
      stockStatus,
      distributedExceedsAvailable,
      receiptDataComplete,
      receiptCount: receipts.length,
      receiptEntityKeys,       // evidence: array of on-chain receipt entity keys
      createdAt: new Date().toISOString(),
    };

    // 10. Write stock_report entity to Arkiv (no retry — mutation is idempotent-protected above)
    const reportResult = await arkivService.createEntity({
      payload,
      attributes,
      expiresDays: 365,
    });

    console.log(
      `[StockReport] Created '${reportId}' for shop=${shopId} grain=${grainType} ` +
        `period=${period} → status=${stockStatus} diff=${stockDifferenceKg}kg`,
    );

    // 11. If MISMATCH, create a linked discrepancy entity
    let discrepancyResult = null;
    if (stockStatus === 'MISMATCH') {
      discrepancyResult = await this._recordStockDiscrepancy({
        reportId,
        shopId,
        grainType,
        period,
        reportEntityKey: reportResult.entityKey,
        shopEntityKey: shop.key,
        openingStockKg,
        totalReceivedKg,
        distributedKg,
        expectedClosingKg,
        closingStockKg,
        stockDifferenceKg,
        distributedExceedsAvailable,
        receiptEntityKeys,
      });
    }

    return {
      entityKey: reportResult.entityKey,
      txHash: reportResult.txHash,
      expiresAt: reportResult.expiresAt,
      reportId,
      shopId,
      grainType,
      period,
      attributes,
      payload,
      stockAnalysis: {
        openingStockKg,
        totalReceivedKg,
        distributedKg,
        expectedClosingKg,
        closingStockKg,
        stockDifferenceKg,
        stockStatus,
        distributedExceedsAvailable,
        receiptDataComplete,
        receiptCount: receipts.length,
        receiptEntityKeys,
        unresolvedReceiptEntityKeys,
      },
      discrepancy: discrepancyResult
        ? {
            detected: true,
            stockDifferenceKg,
            entityKey: discrepancyResult.entityKey,
            txHash: discrepancyResult.txHash,
            explorerUrl: `https://tiramisu.explorer.arkiv.network/tx/${discrepancyResult.txHash}`,
          }
        : { detected: false },
      explorerUrl: `https://tiramisu.explorer.arkiv.network/tx/${reportResult.txHash}`,
    };
  }

  // -------------------------------------------------------------------------
  //  getStockReportById
  // -------------------------------------------------------------------------

  /**
   * Retrieve a stock report by Arkiv entityKey or reportId.
   *
   * @param {string} identifier
   * @returns {Promise<Object|null>}
   */
  async getStockReportById(identifier) {
    if (!identifier) return null;

    if (/^0x[0-9a-fA-F]{64}$/.test(identifier)) {
      const entity = await arkivService.getEntityByKey(identifier);
      if (entity && entity.attributes?.type === 'stock_report') return entity;
      return null;
    }

    const result = await arkivService.queryEntities({
      expressions: [
        eq('project', 'arkivtrace'),
        eq('type', 'stock_report'),
        eq('report_id', identifier),
      ],
      limit: 1,
    });

    return result.entities.length > 0 ? result.entities[0] : null;
  }

  // -------------------------------------------------------------------------
  //  listStockReports
  // -------------------------------------------------------------------------

  /**
   * List stock reports with optional filters.
   *
   * @param {Object} filters
   * @param {string} [filters.shopId]
   * @param {string} [filters.period]      - "YYYY-MM"
   * @param {string} [filters.grainType]
   * @param {string} [filters.stockStatus] - MATCH | MISMATCH | INSUFFICIENT_DATA
   * @param {number} [filters.limit=20]
   * @returns {Promise<{ count: number, entities: Array<Object> }>}
   */
  async listStockReports({ shopId, period, grainType, stockStatus, limit = 20 } = {}) {
    const expressions = [
      eq('project', 'arkivtrace'),
      eq('type', 'stock_report'),
    ];

    if (shopId) expressions.push(eq('shop_id', shopId));
    if (period) expressions.push(eq('period', period));
    if (grainType) expressions.push(eq('grain_type', grainType));
    if (stockStatus) expressions.push(eq('stock_status', stockStatus));

    return await arkivService.queryEntities({ expressions, limit });
  }

  // -------------------------------------------------------------------------
  //  Private helpers
  // -------------------------------------------------------------------------

  /**
   * Check whether an active stock_report already exists for the given
   * shop + grain + period combination.
   *
   * @returns {Promise<Object|null>}
   */
  async _findExistingReport(shopId, grainType, period) {
    const result = await arkivService.queryEntities({
      expressions: [
        eq('project', 'arkivtrace'),
        eq('type', 'stock_report'),
        eq('shop_id', shopId),
        eq('grain_type', grainType),
        eq('period', period),
      ],
      limit: 1,
    });
    return result.entities.length > 0 ? result.entities[0] : null;
  }

  /**
   * Fetch confirmed receipts for a shop+grain+period and sum received quantities.
   *
   * The period filter is applied client-side because Arkiv does not support range
   * queries — we filter by shop_id and grain_type on-chain (2 attributes), then
   * verify the receipt's receivedDate falls within the period month in JavaScript.
   *
   * @param {string} shopId
   * @param {string} grainType
   * @param {string} period  - "YYYY-MM"
   * @returns {Promise<{ receipts, receiptEntityKeys, totalReceivedKg, receiptDataComplete }>}
   */
  async _fetchPeriodReceipts(shopId, grainType, period) {
    // Fetch confirmed receipts for this shop, then resolve the linked dispatches
    // to filter by grain type and reporting period.
    const result = await receiptService.listReceipts({
      shopId,
      status: 'confirmed',
      limit: 100,
    });

    const allReceipts = result.entities || [];
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const periodIsVerifiedHistoricalMonth = period < currentPeriod;

    const receiptChecks = await Promise.all(
      allReceipts.map(async (receipt) => {
        const payload = receipt.payload || {};
        const receivedDate = payload.receivedDate ?? payload.createdAt ?? '';

        if (!receivedDate.startsWith(period)) {
          return null;
        }

        const dispatchId = payload.dispatchId ?? payload.dispatch_id ?? null;
        if (!dispatchId) {
          return { matched: false, unresolved: true, key: receipt.key };
        }

        const dispatch = await dispatchService.getDispatchById(dispatchId);
        if (!dispatch) {
          return { matched: false, unresolved: true, key: receipt.key };
        }

        const dispatchGrain =
          dispatch.payload?.grainType ?? dispatch.payload?.grain_type ?? dispatch.attributes?.grain_type ?? null;

        if (dispatchGrain !== grainType) {
          return null;
        }

        return { matched: true, receipt };
      })
    );

    const unresolvedReceiptEntityKeys = receiptChecks
      .filter((check) => check?.unresolved)
      .map((check) => check.key)
      .filter(Boolean);

    const periodReceipts = receiptChecks
      .filter((check) => check?.matched)
      .map((check) => check.receipt)
      .filter(Boolean);

    const receiptEntityKeys = periodReceipts.map((r) => r.key).filter(Boolean);

    const receiptDataComplete =
      unresolvedReceiptEntityKeys.length === 0 &&
      (periodReceipts.length > 0 || periodIsVerifiedHistoricalMonth);

    const totalReceivedKg = receiptDataComplete
      ? periodReceipts.reduce((sum, r) => {
          return sum + (r.payload?.receivedQuantityKg ?? 0);
        }, 0)
      : null;

    return {
      receipts: periodReceipts,
      receiptEntityKeys,
      totalReceivedKg,
      receiptDataComplete,
      unresolvedReceiptEntityKeys,
    };
  }

  /**
   * Determine stockStatus from the computed difference.
   *
   * INSUFFICIENT_DATA: callers set receiptDataComplete=false when they want this.
   * MATCH:             |stockDifferenceKg| ≤ STOCK_TOLERANCE_KG.
   * MISMATCH:          everything else.
   *
   * @param {{ stockDifferenceKg, receiptDataComplete, receiptsCount }}
   * @returns {'MATCH'|'MISMATCH'|'INSUFFICIENT_DATA'}
   */
  _determineStockStatus({ stockDifferenceKg, receiptDataComplete }) {
    if (!receiptDataComplete || stockDifferenceKg === null || stockDifferenceKg === undefined) {
      return 'INSUFFICIENT_DATA';
    }
    if (Math.abs(stockDifferenceKg) <= STOCK_TOLERANCE_KG) return 'MATCH';
    return 'MISMATCH';
  }

  /**
   * Persist a discrepancy entity for a stock mismatch.
   * The discrepancy ID is deterministically derived from reportId to prevent duplicates.
   *
   * @param {Object} data
   * @returns {Promise<Object>} Arkiv createEntity result
   */
  async _recordStockDiscrepancy(data) {
    // Deterministic ID: truncate to 32 chars to respect Arkiv attribute limits
    const discrepancyId = `SDISC-${data.reportId}`.slice(0, 32);

    const attributes = {
      project: 'arkivtrace',
      type: 'discrepancy',
      discrepancy_id: discrepancyId,
      report_id: data.reportId,
      shop_id: data.shopId,
      grain_type: data.grainType,
      period: data.period,
      discrepancy_status: 'stock_mismatch',
      resolution_status: 'open',
      stock_report_entity_key: data.reportEntityKey,
    };

    const payload = {
      ...data,
      project: 'arkivtrace',
      entityType: 'discrepancy',
      discrepancyId,
      discrepancyType: 'stock_mismatch',
      resolutionStatus: 'open',
      stockReportEntityKey: data.reportEntityKey,
      receiptEntityKeys: data.receiptEntityKeys,
      createdAt: new Date().toISOString(),
    };

    console.log(
      `[StockReport] 🚨 Stock mismatch for shop=${data.shopId} grain=${data.grainType} ` +
        `period=${data.period}: expected=${data.expectedClosingKg}kg, ` +
        `actual=${data.closingStockKg}kg, diff=${data.stockDifferenceKg}kg`,
    );

    return await arkivService.createEntity({
      payload,
      attributes,
      expiresDays: 365,
    });
  }
}

export const stockReportService = new StockReportService();
