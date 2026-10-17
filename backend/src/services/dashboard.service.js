import { eq } from '@arkiv-network/sdk/query';
import { arkivService } from './arkiv.service.js';
import { shopService } from './shop.service.js';
import { dispatchService } from './dispatch.service.js';
import { receiptService } from './receipt.service.js';
import { stockReportService } from './stock-report.service.js';

const QUERY_LIMIT = 100;
const AUDIT_TYPES = ['audit_event', 'audit', 'audit_log'];

function parseTimestamp(value) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatTimestamp(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function matchesPeriod(value, period) {
  if (!period) return true;
  if (!value) return false;
  return String(value).startsWith(period);
}

function uniqueLatestBy(items, keyFn) {
  const map = new Map();

  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;

    const nextTs = parseTimestamp(item.timestamp);
    const prev = map.get(key);
    if (!prev || nextTs >= parseTimestamp(prev.timestamp)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}

class DashboardService {
  async getSummary({ district, period, limit = 10 } = {}) {
    const scope = await this._resolveShopScope({ district });
    const evidence = await this._collectEvidence({
      shopIds: scope.shopIds,
      district,
      period,
      includeAudit: true,
    });

    const recentActivity = [...evidence.timeline]
      .sort((a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp))
      .slice(0, limit);

    return {
      scope: {
        district: district || null,
        period: period || null,
        shopCount: scope.shopIds.length,
        shopLimitReached: scope.truncated,
      },
      totals: {
        totalRegisteredShops: scope.shopIds.length,
        totalDispatchedKg: this._sumQuantity(evidence.dispatches, 'dispatchedQuantityKg'),
        totalConfirmedReceivedKg: this._sumQuantity(evidence.receipts, 'receivedQuantityKg'),
        totalReportedDistributionKg: this._sumQuantity(evidence.stockReports, 'distributedKg'),
        matchingRecords: evidence.stockReports.filter((item) => item.stockStatus === 'MATCH').length,
        mismatches: evidence.stockReports.filter((item) => item.stockStatus === 'MISMATCH').length,
        unresolvedDiscrepancies: evidence.discrepancies.filter((item) => item.resolutionStatus === 'open').length,
      },
      recentActivity,
      meta: {
        period,
        district,
        recentActivityLimit: limit,
        evidenceTruncated: evidence.truncated,
      },
    };
  }

  async getShopTimeline(identifier, { period, limit = 50 } = {}) {
    const shop = await shopService.getShopById(identifier);
    if (!shop) return null;

    const shopId = shop.payload?.shopId || shop.attributes?.shop_id || identifier;
    const evidence = await this._collectEvidence({
      shopIds: [shopId],
      period,
      includeAudit: true,
    });

    const items = evidence.timeline.slice(0, limit);

    return {
      shop: {
        entityKey: shop.key,
        shopId,
        name: shop.payload?.name || shop.attributes?.name || null,
        district: shop.payload?.district || shop.attributes?.district || null,
        state: shop.payload?.state || shop.attributes?.state || null,
      },
      items,
      meta: {
        period: period || null,
        limit,
        evidenceTruncated: evidence.truncated,
        eventCount: items.length,
      },
    };
  }

  async listRecords({ shopId, district, period, recordType = 'all', limit = 50 } = {}) {
    const scope = await this._resolveShopScope({ district, shopId });
    const evidence = await this._collectEvidence({
      shopIds: scope.shopIds,
      period,
      includeAudit: true,
    });

    let items = evidence.timeline;
    if (recordType !== 'all') {
      items = items.filter((item) => item.recordType === recordType);
    }

    if (shopId) {
      items = items.filter((item) => item.shopId === shopId);
    }

    if (district) {
      items = items.filter((item) => item.district === district);
    }

    items = items
      .sort((a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp))
      .slice(0, limit);

    return {
      items,
      meta: {
        shopId: shopId || null,
        district: district || null,
        period: period || null,
        recordType,
        limit,
        evidenceTruncated: evidence.truncated,
        count: items.length,
      },
    };
  }

  async _resolveShopScope({ district, shopId } = {}) {
    if (shopId) {
      const shop = await shopService.getShopById(shopId);
      if (!shop) {
        const error = new Error(`Shop '${shopId}' not found on Arkiv.`);
        error.statusCode = 404;
        throw error;
      }
      return {
        shopIds: [shop.payload?.shopId || shop.attributes?.shop_id || shopId],
        truncated: false,
      };
    }

    const shops = await shopService.listShops({ district, limit: QUERY_LIMIT });
    const shopIds = uniqueLatestBy(shops.entities || [], (shop) => shop.payload?.shopId || shop.attributes?.shop_id || shop.key)
      .map((shop) => shop.payload?.shopId || shop.attributes?.shop_id || shop.key)
      .filter(Boolean);

    return {
      shopIds,
      truncated: (shops.entities || []).length >= QUERY_LIMIT,
    };
  }

  async _collectEvidence({ shopIds = [], period = null, includeAudit = true } = {}) {
    if (shopIds.length === 0) {
      return {
        dispatches: [],
        receipts: [],
        stockReports: [],
        discrepancies: [],
        audits: [],
        timeline: [],
        truncated: false,
      };
    }

    const dispatches = [];
    const receipts = [];
    const stockReports = [];
    const discrepancies = [];
    const audits = [];
    let truncated = false;

    const shopIdSet = new Set(shopIds.filter(Boolean));
    const useGlobalQueries = shopIds.length !== 1;

    if (useGlobalQueries) {
      const [dispatchResult, receiptResult, stockReportResult, discrepancyResult] = await Promise.all([
        dispatchService.listDispatches({ limit: QUERY_LIMIT }),
        receiptService.listReceipts({ status: 'confirmed', limit: QUERY_LIMIT }),
        stockReportService.listStockReports({ period: period || undefined, limit: QUERY_LIMIT }),
        arkivService.queryEntities({
          expressions: [eq('project', 'arkivtrace'), eq('type', 'discrepancy')],
          limit: QUERY_LIMIT,
        }),
      ]);

      const auditResult = includeAudit ? await this._queryAuditEvents() : { entities: [] };

      truncated ||=
        (dispatchResult.entities || []).length >= QUERY_LIMIT ||
        (receiptResult.entities || []).length >= QUERY_LIMIT ||
        (stockReportResult.entities || []).length >= QUERY_LIMIT ||
        (discrepancyResult.entities || []).length >= QUERY_LIMIT ||
        (auditResult.entities || []).length >= QUERY_LIMIT;

      dispatches.push(
        ...this._normalizeDispatches(dispatchResult.entities || [], { period, allowedShopIds: shopIdSet })
      );
      receipts.push(
        ...this._normalizeReceipts(receiptResult.entities || [], { period, allowedShopIds: shopIdSet })
      );
      stockReports.push(
        ...this._normalizeStockReports(stockReportResult.entities || [], { period, allowedShopIds: shopIdSet })
      );
      discrepancies.push(
        ...this._normalizeDiscrepancies(discrepancyResult.entities || [], { period, allowedShopIds: shopIdSet })
      );
      audits.push(
        ...this._normalizeAudits(auditResult.entities || [], { period, allowedShopIds: shopIdSet })
      );
    } else {
      for (const currentShopId of shopIds) {
        const [dispatchResult, receiptResult, stockReportResult, discrepancyResult] = await Promise.all([
          dispatchService.listDispatches({ shopId: currentShopId, limit: QUERY_LIMIT }),
          receiptService.listReceipts({ shopId: currentShopId, status: 'confirmed', limit: QUERY_LIMIT }),
          stockReportService.listStockReports({ shopId: currentShopId, period: period || undefined, limit: QUERY_LIMIT }),
          arkivService.queryEntities({
            expressions: [
              eq('project', 'arkivtrace'),
              eq('type', 'discrepancy'),
              eq('shop_id', currentShopId),
            ],
            limit: QUERY_LIMIT,
          }),
        ]);

        const auditResult = includeAudit
          ? await this._queryAuditEvents(currentShopId)
          : { entities: [] };

        truncated ||=
          (dispatchResult.entities || []).length >= QUERY_LIMIT ||
          (receiptResult.entities || []).length >= QUERY_LIMIT ||
          (stockReportResult.entities || []).length >= QUERY_LIMIT ||
          (discrepancyResult.entities || []).length >= QUERY_LIMIT ||
          (auditResult.entities || []).length >= QUERY_LIMIT;

        dispatches.push(
          ...this._normalizeDispatches(dispatchResult.entities || [], { period, allowedShopIds: shopIdSet })
        );
        receipts.push(
          ...this._normalizeReceipts(receiptResult.entities || [], { period, allowedShopIds: shopIdSet })
        );
        stockReports.push(
          ...this._normalizeStockReports(stockReportResult.entities || [], { period, allowedShopIds: shopIdSet })
        );
        discrepancies.push(
          ...this._normalizeDiscrepancies(discrepancyResult.entities || [], { period, allowedShopIds: shopIdSet })
        );
        audits.push(
          ...this._normalizeAudits(auditResult.entities || [], { period, allowedShopIds: shopIdSet })
        );
      }
    }

    const dedupedDispatches = uniqueLatestBy(dispatches, (item) => item.recordId);
    const dedupedReceipts = uniqueLatestBy(receipts, (item) => item.recordId);
    const dedupedStockReports = uniqueLatestBy(stockReports, (item) => item.recordId);
    const dedupedDiscrepancies = uniqueLatestBy(discrepancies, (item) => item.recordId);
    const dedupedAudits = uniqueLatestBy(audits, (item) => item.recordId);

    const timeline = [
      ...dedupedDispatches,
      ...dedupedReceipts,
      ...dedupedStockReports,
      ...dedupedDiscrepancies,
      ...dedupedAudits,
    ]
      .filter((item) => matchesPeriod(item.period || item.timestamp, period))
      .sort((a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp));

    return {
      dispatches: dedupedDispatches,
      receipts: dedupedReceipts,
      stockReports: dedupedStockReports,
      discrepancies: dedupedDiscrepancies,
      audits: dedupedAudits,
      timeline,
      truncated,
    };
  }

  _sumQuantity(items, fieldName) {
    return items.reduce((sum, item) => sum + Number(item[fieldName] || 0), 0);
  }

  _normalizeDispatches(entities, { period, allowedShopIds = new Set() } = {}) {
    return entities
      .map((entity) => {
        const payload = entity.payload || {};
        const timestamp = formatTimestamp(payload.dispatchDate || payload.createdAt || entity.createdAt);
        if (period && !matchesPeriod(timestamp, period)) return null;

        return {
          recordType: 'dispatch',
          entityType: 'dispatch',
          entityKey: entity.key,
          recordId: payload.dispatchId || entity.attributes?.dispatch_id || entity.key,
          shopId: payload.shopId || entity.attributes?.shop_id || null,
          district: payload.district || entity.attributes?.district || null,
          period: timestamp ? timestamp.slice(0, 7) : null,
          timestamp,
          quantityKg: payload.dispatchedQuantityKg ?? null,
          status: payload.status || entity.attributes?.status || 'dispatched',
          summary: `${payload.dispatchedQuantityKg || 0} kg dispatched from ${payload.sourceDepot || 'unknown depot'}`,
          relatedEntityKeys: payload.shopEntityKey ? [payload.shopEntityKey] : [],
        };
      })
      .filter(Boolean)
      .filter((item) => allowedShopIds.size === 0 || allowedShopIds.has(item.shopId));
  }

  _normalizeReceipts(entities, { period, allowedShopIds = new Set() } = {}) {
    return entities
      .map((entity) => {
        const payload = entity.payload || {};
        const timestamp = formatTimestamp(payload.receivedDate || payload.createdAt || entity.createdAt);
        if (period && !matchesPeriod(timestamp, period)) return null;

        return {
          recordType: 'receipt',
          entityType: 'receipt',
          entityKey: entity.key,
          recordId: payload.receiptId || entity.attributes?.receipt_id || entity.key,
          shopId: payload.shopId || entity.attributes?.shop_id || null,
          district: payload.district || entity.attributes?.district || null,
          period: timestamp ? timestamp.slice(0, 7) : null,
          timestamp,
          quantityKg: payload.receivedQuantityKg ?? null,
          status: payload.status || entity.attributes?.status || 'confirmed',
          summary: `${payload.receivedQuantityKg || 0} kg received for dispatch ${payload.dispatchId || 'unknown'}`,
          relatedEntityKeys: payload.dispatchEntityKey ? [payload.dispatchEntityKey] : [],
        };
      })
      .filter(Boolean)
      .filter((item) => allowedShopIds.size === 0 || allowedShopIds.has(item.shopId));
  }

  _normalizeStockReports(entities, { period, allowedShopIds = new Set() } = {}) {
    return entities
      .map((entity) => {
        const payload = entity.payload || {};
        const timestamp = formatTimestamp(payload.createdAt || entity.createdAt);
        const reportPeriod = payload.period || entity.attributes?.period || timestamp?.slice(0, 7) || null;
        if (period && reportPeriod !== period) return null;

        return {
          recordType: 'stock_report',
          entityType: 'stock_report',
          entityKey: entity.key,
          recordId: payload.reportId || entity.attributes?.report_id || entity.key,
          shopId: payload.shopId || entity.attributes?.shop_id || null,
          district: payload.district || entity.attributes?.district || null,
          period: reportPeriod,
          timestamp,
          quantityKg: payload.distributedKg ?? null,
          status: payload.stockStatus || entity.attributes?.stock_status || null,
          stockStatus: payload.stockStatus || entity.attributes?.stock_status || null,
          summary: `Stock report ${payload.reportId || entity.key} marked ${payload.stockStatus || 'unknown'}`,
          relatedEntityKeys: [
            ...(payload.receiptEntityKeys || []),
            ...(payload.discrepancy?.entityKey ? [payload.discrepancy.entityKey] : []),
          ].filter(Boolean),
        };
      })
      .filter(Boolean)
      .filter((item) => allowedShopIds.size === 0 || allowedShopIds.has(item.shopId));
  }

  _normalizeDiscrepancies(entities, { period, allowedShopIds = new Set() } = {}) {
    return entities
      .map((entity) => {
        const payload = entity.payload || {};
        const timestamp = formatTimestamp(payload.createdAt || entity.createdAt);
        const reportPeriod = payload.period || entity.attributes?.period || timestamp?.slice(0, 7) || null;
        if (period && reportPeriod !== period) return null;

        return {
          recordType: 'discrepancy',
          entityType: 'discrepancy',
          entityKey: entity.key,
          recordId: payload.discrepancyId || entity.attributes?.discrepancy_id || entity.key,
          shopId: payload.shopId || entity.attributes?.shop_id || null,
          district: payload.district || entity.attributes?.district || null,
          period: reportPeriod,
          timestamp,
          quantityKg: payload.stockDifferenceKg ?? payload.discrepancyKg ?? null,
          status: payload.resolutionStatus || entity.attributes?.resolution_status || 'open',
          discrepancyStatus: payload.discrepancyType || entity.attributes?.discrepancy_status || 'stock_mismatch',
          summary: `Discrepancy ${payload.discrepancyId || entity.key} for report ${payload.reportId || 'unknown'}`,
          relatedEntityKeys: [
            ...(payload.reportEntityKey ? [payload.reportEntityKey] : []),
            ...(payload.receiptEntityKey ? [payload.receiptEntityKey] : []),
          ],
        };
      })
      .filter(Boolean)
      .filter((item) => allowedShopIds.size === 0 || allowedShopIds.has(item.shopId));
  }

  _normalizeAudits(entities, { period, allowedShopIds = new Set() } = {}) {
    return entities
      .map((entity) => {
        const payload = entity.payload || {};
        const timestamp = formatTimestamp(payload.createdAt || entity.createdAt);
        const auditPeriod = payload.period || timestamp?.slice(0, 7) || null;
        if (period && auditPeriod !== period) return null;

        return {
          recordType: 'audit_event',
          entityType: entity.attributes?.type || 'audit_event',
          entityKey: entity.key,
          recordId: payload.auditId || entity.attributes?.audit_id || entity.key,
          shopId: payload.shopId || entity.attributes?.shop_id || null,
          district: payload.district || entity.attributes?.district || null,
          period: auditPeriod,
          timestamp,
          quantityKg: null,
          status: payload.status || entity.attributes?.status || 'logged',
          summary: payload.message || 'Audit event recorded on Arkiv',
          relatedEntityKeys: [payload.relatedEntityKey].filter(Boolean),
        };
      })
      .filter(Boolean)
      .filter((item) => allowedShopIds.size === 0 || allowedShopIds.has(item.shopId));
  }

  async _queryAuditEvents(shopId = null) {
    const queries = await Promise.all(
      AUDIT_TYPES.map((type) => {
        const expressions = [eq('project', 'arkivtrace'), eq('type', type)];
        if (shopId) expressions.push(eq('shop_id', shopId));

        return arkivService.queryEntities({
          expressions,
          limit: QUERY_LIMIT,
        });
      })
    );

    const entities = [];
    for (const result of queries) {
      entities.push(...(result.entities || []));
    }

    return { entities };
  }
}

export const dashboardService = new DashboardService();
