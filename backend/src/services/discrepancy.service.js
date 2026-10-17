import crypto from 'node:crypto';
import { eq } from '@arkiv-network/sdk/query';
import { arkivService } from './arkiv.service.js';
import { shopService } from './shop.service.js';

const QUERY_LIMIT = 100;
const FINAL_STATUSES = new Set(['resolved', 'rejected']);

function sortNewestFirst(items) {
  return [...items].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

function normalizeStatus(value) {
  return (value || '').toString().trim().toLowerCase();
}

function makePublicDiscrepancyId(payload) {
  const digest = crypto
    .createHash('sha256')
    .update(JSON.stringify({
      shopId: payload.shopId,
      period: payload.period,
      issueType: payload.issueType,
      severity: payload.severity,
      description: payload.description,
      evidenceEntityKeys: payload.evidenceEntityKeys,
      observedDiscrepancyKg: payload.observedDiscrepancyKg ?? null,
      reporterName: payload.reporterName,
      reporterContact: payload.reporterContact,
    }))
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();

  return `DISC-PUB-${digest}`.slice(0, 32);
}

class DiscrepancyService {
  async listDiscrepancies({ shopId, period, caseStatus, severity, limit = 20 } = {}) {
    const expressions = [eq('project', 'arkivtrace'), eq('type', 'discrepancy')];
    if (shopId) expressions.push(eq('shop_id', shopId));
    if (period) expressions.push(eq('period', period));
    if (severity) expressions.push(eq('discrepancy_status', severity));

    const result = await arkivService.queryEntities({ expressions, limit: Math.min(limit, QUERY_LIMIT) });
    const audits = await this._loadReviewAudits(result.entities || []);
    const items = (result.entities || []).map((entity) => this._normalizeDiscrepancy(entity, audits));

    const filtered = items.filter((item) => {
      if (caseStatus && item.caseStatus !== caseStatus) return false;
      if (severity && item.severity !== severity && item.discrepancyType !== severity) return false;
      return true;
    });

    return {
      count: filtered.length,
      entities: sortNewestFirst(filtered).slice(0, limit),
      cursor: result.cursor || null,
    };
  }

  async getDiscrepancyById(identifier) {
    if (!identifier) return null;

    if (/^0x[0-9a-fA-F]{64}$/.test(identifier)) {
      const entity = await arkivService.getEntityByKey(identifier);
      if (entity && entity.attributes?.type === 'discrepancy') {
        return this._normalizeDiscrepancy(entity, await this._loadReviewAudits([entity]));
      }
      return null;
    }

    const result = await arkivService.queryEntities({
      expressions: [eq('project', 'arkivtrace'), eq('type', 'discrepancy'), eq('discrepancy_id', identifier)],
      limit: 1,
    });

    if (!result.entities?.length) return null;
    return this._normalizeDiscrepancy(result.entities[0], await this._loadReviewAudits(result.entities));
  }

  async createPublicDiscrepancyReport(payload) {
    const shop = await shopService.getShopById(payload.shopId);
    if (!shop) {
      const error = new Error(`Shop '${payload.shopId}' is not registered on Arkiv.`);
      error.statusCode = 404;
      throw error;
    }

    const discrepancyId = payload.reportId || makePublicDiscrepancyId(payload);
    const existing = await this.getDiscrepancyById(discrepancyId);
    if (existing) {
      return { duplicate: true, ...existing };
    }

    const attributes = {
      project: 'arkivtrace',
      type: 'discrepancy',
      discrepancy_id: discrepancyId,
      report_id: discrepancyId,
      shop_id: payload.shopId,
      period: payload.period,
      discrepancy_status: payload.severity,
      resolution_status: 'open',
      report_source: 'public',
      issue_type: payload.issueType,
    };

    const record = {
      ...payload,
      project: 'arkivtrace',
      entityType: 'discrepancy',
      discrepancyId,
      discrepancyType: 'public_report',
      resolutionStatus: 'open',
      caseStatus: 'open',
      reporterScope: 'public',
      shopEntityKey: shop.key,
      shopName: shop.payload?.name || null,
      evidenceEntityKeys: payload.evidenceEntityKeys || [],
      createdAt: new Date().toISOString(),
    };

    const result = await arkivService.createEntity({ payload: record, attributes, expiresDays: 365 });

    return {
      duplicate: false,
      entityKey: result.entityKey,
      txHash: result.txHash,
      expiresAt: result.expiresAt,
      discrepancyId,
      caseStatus: 'open',
      severity: payload.severity,
      shopId: payload.shopId,
      evidenceEntityKeys: payload.evidenceEntityKeys || [],
      attributes,
      payload: record,
      explorerUrl: `https://tiramisu.explorer.arkiv.network/tx/${result.txHash}`,
    };
  }

  async reviewDiscrepancy(identifier, reviewData, reviewerRole = 'admin') {
    const discrepancy = await this.getDiscrepancyById(identifier);
    if (!discrepancy) {
      const error = new Error(`Discrepancy '${identifier}' was not found on Arkiv.`);
      error.statusCode = 404;
      throw error;
    }

    const currentCaseStatus = normalizeStatus(discrepancy.caseStatus || discrepancy.payload?.resolutionStatus || 'open');
    const desiredCaseStatus = normalizeStatus(reviewData.decision);

    if (FINAL_STATUSES.has(currentCaseStatus)) {
      const error = new Error(`Discrepancy '${discrepancy.discrepancyId}' is already final (${currentCaseStatus}).`);
      error.statusCode = 409;
      throw error;
    }

    const allowedTransitions = {
      open: new Set(['under_review', 'resolved', 'rejected']),
      under_review: new Set(['resolved', 'rejected']),
    };

    if (!allowedTransitions[currentCaseStatus]?.has(desiredCaseStatus)) {
      const error = new Error(
        `Invalid review transition from '${currentCaseStatus}' to '${desiredCaseStatus}'.`
      );
      error.statusCode = 400;
      throw error;
    }

    const reviewId = `AREV-${discrepancy.discrepancyId}-${currentCaseStatus}-${desiredCaseStatus}`.slice(0, 32);
    const existingReview = await this._findReviewAudit(reviewId);
    if (existingReview) {
      return { duplicate: true, ...existingReview };
    }

    const evidenceEntityKeys = [discrepancy.entityKey, ...(discrepancy.evidenceEntityKeys || [])].filter(Boolean);
    const attributes = {
      project: 'arkivtrace',
      type: 'audit_event',
      audit_id: reviewId,
      event_type: 'discrepancy_review',
      shop_id: discrepancy.shopId,
      discrepancy_id: discrepancy.discrepancyId,
      previous_case_status: currentCaseStatus,
      new_case_status: desiredCaseStatus,
      review_decision: reviewData.decision,
      reviewer_role: reviewerRole,
      resolution_status: desiredCaseStatus,
      case_status: desiredCaseStatus,
    };

    const payload = {
      project: 'arkivtrace',
      entityType: 'audit_event',
      auditId: reviewId,
      eventType: 'discrepancy_review',
      discrepancyId: discrepancy.discrepancyId,
      discrepancyEntityKey: discrepancy.entityKey,
      previousCaseStatus: currentCaseStatus,
      newCaseStatus: desiredCaseStatus,
      reviewDecision: reviewData.decision,
      reviewerRole,
      notes: reviewData.notes || '',
      reviewerName: reviewData.reviewerName || 'admin',
      evidenceEntityKeys,
      shopId: discrepancy.shopId,
      period: discrepancy.period || null,
      createdAt: new Date().toISOString(),
    };

    const result = await arkivService.createEntity({ payload, attributes, expiresDays: 365 });

    return {
      duplicate: false,
      entityKey: result.entityKey,
      txHash: result.txHash,
      expiresAt: result.expiresAt,
      auditId: reviewId,
      discrepancyId: discrepancy.discrepancyId,
      previousCaseStatus: currentCaseStatus,
      caseStatus: desiredCaseStatus,
      reviewDecision: reviewData.decision,
      evidenceEntityKeys,
      attributes,
      payload,
      explorerUrl: `https://tiramisu.explorer.arkiv.network/tx/${result.txHash}`,
    };
  }

  async _loadReviewAudits(discrepancies) {
    const ids = discrepancies
      .map((item) => item.attributes?.discrepancy_id || item.payload?.discrepancyId)
      .filter(Boolean);

    if (!ids.length) return [];

    const result = await arkivService.queryEntities({
      expressions: [eq('project', 'arkivtrace'), eq('type', 'audit_event'), eq('event_type', 'discrepancy_review')],
      limit: QUERY_LIMIT,
    });

    return (result.entities || []).filter((entity) => {
      const payload = entity.payload || {};
      const attrs = entity.attributes || {};
      const discrepancyId = payload.discrepancyId || attrs.discrepancy_id;
      return ids.includes(discrepancyId);
    });
  }

  async _findReviewAudit(reviewId) {
    const result = await arkivService.queryEntities({
      expressions: [eq('project', 'arkivtrace'), eq('type', 'audit_event'), eq('audit_id', reviewId)],
      limit: 1,
    });

    if (!result.entities?.length) return null;
    const entity = result.entities[0];
    return this._normalizeReviewAudit(entity);
  }

  _normalizeDiscrepancy(entity, reviewAudits = []) {
    const payload = entity.payload || {};
    const attrs = entity.attributes || {};
    const discrepancyId = payload.discrepancyId || attrs.discrepancy_id || entity.key;
    const latestReview = sortNewestFirst(
      reviewAudits.filter((audit) => {
        const auditPayload = audit.payload || {};
        const auditAttrs = audit.attributes || {};
        return (auditPayload.discrepancyId || auditAttrs.discrepancy_id) === discrepancyId;
      })
    )[0] || null;

    return {
      recordType: 'discrepancy',
      entityType: 'discrepancy',
      entityKey: entity.key,
      discrepancyId,
      shopId: payload.shopId || attrs.shop_id || null,
      period: payload.period || attrs.period || null,
      severity: payload.discrepancyType === 'public_report' ? 'public_report' : (attrs.discrepancy_status || payload.discrepancyStatus || 'unknown'),
      discrepancyType: payload.discrepancyType || attrs.discrepancy_status || 'unknown',
      caseStatus: normalizeStatus(latestReview?.payload?.newCaseStatus || latestReview?.attributes?.new_case_status || attrs.resolution_status || payload.resolutionStatus || 'open'),
      resolutionStatus: attrs.resolution_status || payload.resolutionStatus || 'open',
      evidenceEntityKeys: payload.evidenceEntityKeys || [],
      relatedEntityKeys: [payload.reportEntityKey, payload.receiptEntityKey, payload.stockReportEntityKey].filter(Boolean),
      notes: payload.description || payload.notes || '',
      createdAt: payload.createdAt || entity.createdAt,
      updatedAt: latestReview?.payload?.createdAt || entity.createdAt,
      payload,
      attributes: attrs,
      latestReview: latestReview ? this._normalizeReviewAudit(latestReview) : null,
    };
  }

  _normalizeReviewAudit(entity) {
    const payload = entity.payload || {};
    const attrs = entity.attributes || {};
    return {
      entityKey: entity.key,
      auditId: payload.auditId || attrs.audit_id || entity.key,
      discrepancyId: payload.discrepancyId || attrs.discrepancy_id || null,
      previousCaseStatus: normalizeStatus(payload.previousCaseStatus || attrs.previous_case_status),
      caseStatus: normalizeStatus(payload.newCaseStatus || attrs.new_case_status),
      reviewDecision: payload.reviewDecision || attrs.review_decision || null,
      reviewerRole: payload.reviewerRole || attrs.reviewer_role || null,
      evidenceEntityKeys: payload.evidenceEntityKeys || [],
      notes: payload.notes || '',
      createdAt: payload.createdAt || entity.createdAt,
      payload,
      attributes: attrs,
    };
  }
}

export const discrepancyService = new DiscrepancyService();
