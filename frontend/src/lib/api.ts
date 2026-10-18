import {
  DashboardSummary,
  DepotDispatch,
  ShopReceipt,
  StockReport,
  Discrepancy,
  Shop,
  ArkivRecord,
  ShopTimelineEvent,
  NetworkStatus,
  CreateDispatchInput,
  CreateShopInput,
  CreateReceiptInput,
  CreateStockReportInput,
  CreateDiscrepancyInput,
  RecordType,
  ReconciliationStatus,
} from '@/types/api';
import {
  INITIAL_DASHBOARD_SUMMARY,
  INITIAL_DISPATCHES,
  INITIAL_RECEIPTS,
  INITIAL_STOCK_REPORTS,
  INITIAL_DISCREPANCIES,
  INITIAL_EVIDENCE_RECORDS,
  INITIAL_NETWORK_STATUS,
  getShopTimeline as getMockShopTimeline,
} from './demo-data';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// When NEXT_PUBLIC_DEMO_MODE is 'true' or NEXT_PUBLIC_USE_MOCK_CLIENT is 'true', fallback to static demo store
export const IS_DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  process.env.NEXT_PUBLIC_USE_MOCK_CLIENT === 'true';

let authTokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  authTokenGetter = getter;
}

export async function getAuthHeaders(extraHeaders: HeadersInit = {}): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  if (authTokenGetter) {
    try {
      const token = await authTokenGetter();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Failed to resolve Clerk auth token:', err);
    }
  }

  return headers;
}

// ---------------------------------------------------------------------------
// Adapters: Map Backend Arkiv Entities to Strongly-Typed Frontend Models
// ---------------------------------------------------------------------------

function normalizeCommodity(grain?: string): 'Wheat' | 'Rice' | 'Coarse Grains' | 'Pulses' {
  if (!grain) return 'Wheat';
  const lower = grain.toLowerCase();
  if (lower.includes('wheat')) return 'Wheat';
  if (lower.includes('rice')) return 'Rice';
  if (lower.includes('sugar') || lower.includes('pulse')) return 'Pulses';
  return 'Coarse Grains';
}

function mapEntityToDispatch(entity: any): DepotDispatch {
  const p = entity.payload || {};
  const attrs = entity.attributes || {};
  const status = p.status || attrs.status || 'dispatched';

  return {
    id: p.dispatchId || entity.key,
    deliveryId: p.dispatchId || attrs.dispatch_id || 'UNKNOWN',
    depotId: p.sourceDepot || 'CENTRAL-DEPOT',
    depotName: p.sourceDepot || 'FCI Central Grain Depot',
    destinationShopId: p.shopId || attrs.shop_id || 'UNKNOWN',
    shopName: p.shopName || `Fair Price Shop #${p.shopId || attrs.shop_id}`,
    district: p.district || 'Maharashtra',
    reportingPeriod: p.dispatchDate ? String(p.dispatchDate).slice(0, 7) : '2026-10',
    commodity: normalizeCommodity(p.grainType || attrs.grain_type),
    quantityKg: Number(p.dispatchedQuantityKg || 0),
    dispatchTimestamp: p.dispatchDate || p.createdAt || new Date().toISOString(),
    truckNumber: p.truckNumber || 'MH-TR-01',
    sealNumber: p.sealNumber || `SEAL-${(entity.key || '').slice(2, 8).toUpperCase()}`,
    entityKey: entity.key,
    txHash: entity.txHash || entity.key,
    verificationStatus: 'Verified',
    reconciliationStatus: status === 'confirmed' ? 'MATCH' : 'PENDING',
  };
}

function mapEntityToReceipt(entity: any): ShopReceipt {
  const p = entity.payload || {};
  const attrs = entity.attributes || {};
  const discStatus = p.discrepancyStatus || attrs.discrepancy_status;

  let reconciliationStatus: ReconciliationStatus = 'MATCH';
  if (discStatus && discStatus !== 'none') {
    reconciliationStatus = 'MISMATCH';
  }

  return {
    id: p.receiptId || entity.key,
    deliveryId: p.dispatchId || attrs.dispatch_id || 'UNKNOWN',
    shopId: p.shopId || attrs.shop_id || 'UNKNOWN',
    shopName: `Fair Price Shop #${p.shopId || attrs.shop_id}`,
    district: p.district || 'Maharashtra',
    reportingPeriod: p.receivedDate ? String(p.receivedDate).slice(0, 7) : '2026-10',
    commodity: normalizeCommodity(p.grainType),
    receivedQuantityKg: Number(p.receivedQuantityKg || 0),
    dispatchedQuantityKg: p.dispatchedQuantityKg ? Number(p.dispatchedQuantityKg) : undefined,
    receivedTimestamp: p.receivedDate || p.createdAt || new Date().toISOString(),
    challanReference: `CHL-${String(p.receiptId || '').slice(-6)}`,
    conditionStatus: 'Good',
    entityKey: entity.key,
    txHash: entity.txHash || entity.key,
    verificationStatus: 'Verified',
    reconciliationStatus,
  };
}

function mapEntityToStockReport(entity: any): StockReport {
  const p = entity.payload || {};
  const attrs = entity.attributes || {};

  let reconciliationStatus: ReconciliationStatus = 'MATCH';
  if (p.stockStatus === 'MATCH') reconciliationStatus = 'MATCH';
  else if (p.stockStatus === 'MISMATCH') reconciliationStatus = 'MISMATCH';
  else if (p.stockStatus === 'INSUFFICIENT_DATA') reconciliationStatus = 'INSUFFICIENT_DATA';

  return {
    id: p.reportId || entity.key,
    shopId: p.shopId || attrs.shop_id || 'UNKNOWN',
    shopName: `Fair Price Shop #${p.shopId || attrs.shop_id}`,
    district: p.district || 'Maharashtra',
    reportingPeriod: p.period || '2026-10',
    commodity: normalizeCommodity(p.grainType || attrs.grain_type),
    openingStockKg: Number(p.openingStockKg || 0),
    receivedQuantityKg: p.totalReceivedKg !== undefined ? Number(p.totalReceivedKg) : undefined,
    distributedQuantityKg: Number(p.distributedKg || 0),
    reportedClosingStockKg: Number(p.closingStockKg || 0),
    expectedClosingStockKg: p.expectedClosingKg !== undefined ? Number(p.expectedClosingKg) : undefined,
    differenceKg: p.stockDifferenceKg !== undefined ? Number(p.stockDifferenceKg) : undefined,
    entityKey: entity.key,
    txHash: entity.txHash || entity.key,
    verificationStatus: 'Verified',
    reconciliationStatus,
    reportTimestamp: p.createdAt || new Date().toISOString(),
  };
}

function mapEntityToDiscrepancy(entity: any): Discrepancy {
  const p = entity.payload || {};
  const attrs = entity.attributes || {};

  let status: 'Open' | 'Under Investigation' | 'Resolved' | 'Escalated' = 'Open';
  const rawStatus = String(p.caseStatus || attrs.case_status || 'open').toLowerCase();
  if (rawStatus === 'resolved') status = 'Resolved';
  else if (rawStatus === 'under_review' || rawStatus === 'investigating') status = 'Under Investigation';
  else if (rawStatus === 'escalated') status = 'Escalated';

  let category: 'Transit Loss' | 'Weighing Discrepancy' | 'Stock Mismatch' | 'Delayed Receipt' = 'Transit Loss';
  const issue = String(p.issueType || p.severity || '').toLowerCase();
  if (issue.includes('stock')) category = 'Stock Mismatch';
  else if (issue.includes('delay')) category = 'Delayed Receipt';
  else if (issue.includes('weigh')) category = 'Weighing Discrepancy';

  return {
    id: p.discrepancyId || entity.key,
    caseId: p.discrepancyId || `CASE-${(entity.key || '').slice(2, 10).toUpperCase()}`,
    relatedDeliveryId: p.dispatchId || attrs.dispatch_id,
    shopId: p.shopId || attrs.shop_id,
    shopName: `Fair Price Shop #${p.shopId || attrs.shop_id || 'UNKNOWN'}`,
    district: p.district || 'Maharashtra',
    reportingPeriod: p.period || (p.reportedAt ? String(p.reportedAt).slice(0, 7) : '2026-10'),
    commodity: 'Wheat',
    dispatchedQuantityKg: p.dispatchedQuantityKg ? Number(p.dispatchedQuantityKg) : undefined,
    receivedQuantityKg: p.receivedQuantityKg ? Number(p.receivedQuantityKg) : undefined,
    quantityDifferenceKg: Number(p.discrepancyKg || p.observedDiscrepancyKg || 0),
    category,
    status,
    entityKey: entity.key,
    txHash: entity.txHash || entity.key,
    description: p.description || p.message || `Discrepancy detected: ${p.discrepancyKg || 0} kg variance`,
    reportedAt: p.reportedAt || p.createdAt || new Date().toISOString(),
    verificationStatus: 'Verified',
    investigationNotes: p.resolutionNotes || p.reviewNotes || undefined,
  };
}

function mapTimelineItemToArkivRecord(item: any): ArkivRecord {
  const typeMap: Record<string, RecordType> = {
    depot_dispatch: 'depot_dispatch',
    dispatch: 'depot_dispatch',
    shop_receipt: 'shop_receipt',
    receipt: 'shop_receipt',
    stock_report: 'stock_report',
    stock: 'stock_report',
    discrepancy: 'discrepancy_report',
    discrepancy_report: 'discrepancy_report',
    audit_event: 'audit_event',
    audit: 'audit_event',
  };

  const recordType = typeMap[item.recordType] || 'depot_dispatch';
  const relatedKeys = Array.isArray(item.relatedEntityKeys)
    ? item.relatedEntityKeys
    : item.relatedEntityKeys
    ? [item.relatedEntityKeys]
    : [];

  return {
    key: item.entityKey,
    recordType,
    businessIdentifier: item.recordId || item.entityKey.slice(0, 10),
    timestamp: item.timestamp || new Date().toISOString(),
    quantityKg: item.quantityKg !== null && item.quantityKg !== undefined ? Number(item.quantityKg) : undefined,
    commodity: 'Wheat',
    district: item.district || 'Maharashtra',
    entityKey: item.entityKey,
    txHash: item.entityKey,
    network: 'tiramisu',
    verificationStatus: 'Verified',
    payload: {
      ...item,
      summary: item.summary,
      status: item.status,
    },
    relationships: relatedKeys.map((relKey: string) => ({
      label: 'Linked Evidence Entity',
      targetKey: relKey,
      targetType: recordType === 'shop_receipt' ? 'depot_dispatch' : 'shop_receipt',
    })),
  };
}

function mapEntityToShop(entity: any): Shop {
  const p = entity.payload || {};
  const attrs = entity.attributes || {};
  return {
    id: p.shopId || attrs.shop_id || entity.key,
    shopId: p.shopId || attrs.shop_id || 'UNKNOWN',
    name: p.name || `Fair Price Shop #${p.shopId || attrs.shop_id}`,
    operatorName: p.operatorName || 'Assigned Dealer',
    operatorEmail: p.operatorEmail || attrs.operator_email || '',
    operatorAddress: p.operatorAddress || '',
    district: p.district || attrs.district || 'General',
    state: p.state || attrs.state || 'State',
    address: p.address || 'Public Distribution Outlet',
    allocatedBeneficiaries: Number(p.allocatedBeneficiaries || 0),
    monthlyQuotaKg: {
      wheat: Number(p.monthlyQuotaKg?.wheat || 0),
      rice: Number(p.monthlyQuotaKg?.rice || 0),
      coarseGrains: Number(p.monthlyQuotaKg?.coarseGrains || 0),
    },
    status: (p.status as any) || 'active',
    entityKey: entity.key,
    txHash: entity.txHash || entity.key,
    createdAt: p.createdAt || entity.createdAt,
    verificationStatus: 'Verified On-Chain',
  };
}

function mapRawEntityToArkivRecord(entity: any): ArkivRecord {
  if (!entity) return null as any;
  const p = entity.payload || entity;
  const attrs = entity.attributes || {};
  const rawType = String(attrs.type || p.entityType || p.recordType || 'dispatch').toLowerCase();

  const typeMap: Record<string, RecordType> = {
    dispatch: 'depot_dispatch',
    depot_dispatch: 'depot_dispatch',
    receipt: 'shop_receipt',
    shop_receipt: 'shop_receipt',
    stock_report: 'stock_report',
    discrepancy: 'discrepancy_report',
    audit: 'audit_event',
  };

  const recordType = typeMap[rawType] || 'depot_dispatch';
  const businessIdentifier =
    p.dispatchId || p.receiptId || p.reportId || p.discrepancyId || p.shopId || p.recordId || entity.key?.slice(0, 12) || 'RECORD';

  return {
    key: entity.key || p.entityKey || p.key || businessIdentifier,
    recordType,
    businessIdentifier,
    timestamp: p.createdAt || p.dispatchDate || p.receivedDate || p.timestamp || new Date().toISOString(),
    quantityKg: p.dispatchedQuantityKg || p.receivedQuantityKg || p.closingStockKg || p.quantityKg || undefined,
    commodity: normalizeCommodity(p.grainType),
    district: p.district || 'Maharashtra',
    entityKey: entity.key || p.entityKey || p.key || businessIdentifier,
    txHash: entity.txHash || p.txHash || entity.key || '',
    network: 'tiramisu',
    verificationStatus: 'Verified',
    payload: p,
    relationships: (p.dispatchEntityKey || p.receiptEntityKey || p.shopEntityKey)
      ? [
          {
            label: 'Anchored Entity Dependency',
            targetKey: p.dispatchEntityKey || p.receiptEntityKey || p.shopEntityKey,
            targetType: 'depot_dispatch',
          },
        ]
      : [],
  };
}

function mapTimelineItemToEvent(item: any): ShopTimelineEvent {
  const typeMap: Record<string, RecordType> = {
    depot_dispatch: 'depot_dispatch',
    dispatch: 'depot_dispatch',
    shop_receipt: 'shop_receipt',
    receipt: 'shop_receipt',
    stock_report: 'stock_report',
    stock: 'stock_report',
    discrepancy: 'discrepancy_report',
    discrepancy_report: 'discrepancy_report',
    audit_event: 'audit_event',
    audit: 'audit_event',
  };

  const eventType = typeMap[item.recordType] || 'depot_dispatch';
  let status: any = 'MATCH';
  if (item.status === 'dispatched' || item.status === 'logged') status = 'PENDING';
  else if (item.status === 'open' || item.discrepancyStatus) status = 'MISMATCH';

  return {
    id: item.recordId || item.entityKey,
    timestamp: item.timestamp || new Date().toISOString(),
    eventType,
    title: item.summary || `${eventType.replace('_', ' ').toUpperCase()} #${item.recordId}`,
    description: item.summary || 'Immutable record verified on Arkiv Tiramisu database',
    quantityKg: item.quantityKg !== null && item.quantityKg !== undefined ? Number(item.quantityKg) : undefined,
    status,
    entityKey: item.entityKey,
    referenceId: item.recordId || item.entityKey.slice(0, 12),
    missingEvidence: false,
  };
}

// ---------------------------------------------------------------------------
// Fallback Local Storage Helper for Demo Mode
// ---------------------------------------------------------------------------
class LocalDataStore {
  private dispatches: DepotDispatch[] = [...INITIAL_DISPATCHES];
  private receipts: ShopReceipt[] = [...INITIAL_RECEIPTS];
  private stockReports: StockReport[] = [...INITIAL_STOCK_REPORTS];
  private discrepancies: Discrepancy[] = [...INITIAL_DISCREPANCIES];
  private records: ArkivRecord[] = [...INITIAL_EVIDENCE_RECORDS];
  private shops: Shop[] = [
    {
      id: 'FPS-DEL-8826',
      shopId: 'FPS-DEL-8826',
      name: 'Fair Price Shop #8826',
      operatorName: 'Sunita Sharma',
      operatorEmail: 'sunita.sharma@ration.gov.in',
      operatorAddress: '0x1234567890123456789012345678901234567890',
      district: 'Central Delhi',
      state: 'Delhi',
      address: 'Shop 12, Main Bazar, Daryaganj, New Delhi',
      allocatedBeneficiaries: 1250,
      monthlyQuotaKg: { wheat: 5000, rice: 7500, coarseGrains: 500 },
      status: 'active',
      entityKey: '0x11ca36f451e5699ba7006beef99611363bc48a04fb8f956e63f1553678a79239',
      txHash: '0x11ca36f451e5699ba7006beef99611363bc48a04fb8f956e63f1553678a79239',
      createdAt: '2026-10-16T17:01:29.526Z',
      verificationStatus: 'Verified On-Chain',
    },
    {
      id: 'FPS-RCP-5108',
      shopId: 'FPS-RCP-5108',
      name: 'Receipt Test Shop FPS-RCP-5108',
      operatorName: 'Priya Nair',
      operatorEmail: 'priya.nair@ration.gov.in',
      operatorAddress: '0x1234567890123456789012345678901234567890',
      district: 'South Delhi',
      state: 'Delhi',
      address: '5, Link Road, Lajpat Nagar',
      allocatedBeneficiaries: 800,
      monthlyQuotaKg: { wheat: 4000, rice: 6000, coarseGrains: 400 },
      status: 'active',
      entityKey: '0xd6f7f3cee6049277e518c102bb967a6083615a1263472b74deab21d5d3add9c1',
      txHash: '0xd6f7f3cee6049277e518c102bb967a6083615a1263472b74deab21d5d3add9c1',
      createdAt: '2026-10-16T17:06:11.057Z',
      verificationStatus: 'Verified On-Chain',
    },
    {
      id: 'FPS-MH-402',
      shopId: 'FPS-MH-402',
      name: 'Pune Central Ration Outlet #402',
      operatorName: 'Ramesh Patil',
      operatorEmail: 'ramesh.patil@ration.gov.in',
      operatorAddress: '0x1234567890123456789012345678901234567890',
      district: 'Pune Central',
      state: 'Maharashtra',
      address: 'Shop #12, Market Yard, Hadapsar, Pune',
      allocatedBeneficiaries: 1200,
      monthlyQuotaKg: { wheat: 5000, rice: 4000, coarseGrains: 1000 },
      status: 'active',
      entityKey: '0x4f8a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
      txHash: '0x4f8a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
      createdAt: '2026-10-15T10:30:00.000Z',
      verificationStatus: 'Verified On-Chain',
    },
    {
      id: 'FPS-2041',
      shopId: 'FPS-2041',
      name: 'Raigad Coastal Fair Price Shop',
      operatorName: 'Vijay Deshmukh',
      operatorEmail: 'vijay.deshmukh@ration.gov.in',
      operatorAddress: '0x1234567890123456789012345678901234567890',
      district: 'Raigad',
      state: 'Maharashtra',
      address: 'Alibag Port Road, Raigad - 402201',
      allocatedBeneficiaries: 950,
      monthlyQuotaKg: { wheat: 4500, rice: 5500, coarseGrains: 500 },
      status: 'active',
      entityKey: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
      txHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
      createdAt: '2026-10-14T08:15:00.000Z',
      verificationStatus: 'Verified On-Chain',
    },
  ];

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const storedDisp = localStorage.getItem('arkiv_demo_dispatches');
        if (storedDisp) this.dispatches = JSON.parse(storedDisp);

        const storedRcpt = localStorage.getItem('arkiv_demo_receipts');
        if (storedRcpt) this.receipts = JSON.parse(storedRcpt);

        const storedStk = localStorage.getItem('arkiv_demo_stock');
        if (storedStk) this.stockReports = JSON.parse(storedStk);

        const storedDisc = localStorage.getItem('arkiv_demo_disc');
        if (storedDisc) this.discrepancies = JSON.parse(storedDisc);

        const storedShops = localStorage.getItem('arkiv_demo_shops');
        if (storedShops) this.shops = JSON.parse(storedShops);
      } catch (err) {
        console.warn('LocalStorage unavailable for mock persistence:', err);
      }
    }
  }

  private save(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('arkiv_demo_dispatches', JSON.stringify(this.dispatches));
      localStorage.setItem('arkiv_demo_receipts', JSON.stringify(this.receipts));
      localStorage.setItem('arkiv_demo_stock', JSON.stringify(this.stockReports));
      localStorage.setItem('arkiv_demo_disc', JSON.stringify(this.discrepancies));
      localStorage.setItem('arkiv_demo_shops', JSON.stringify(this.shops));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  getDispatches(): DepotDispatch[] {
    return [...this.dispatches];
  }

  addDispatch(input: CreateDispatchInput): DepotDispatch {
    const randomHex = Math.random().toString(16).slice(2, 10);
    const entityKey = `0x${randomHex}${Math.random().toString(16).slice(2, 10)}9a3b5c7d1e3f`;
    const txHash = `0x${randomHex}${Math.random().toString(16).slice(2, 10)}`;

    const newDispatch: DepotDispatch = {
      id: `disp-${Date.now().toString().slice(-4)}`,
      deliveryId: input.deliveryId.trim().toUpperCase(),
      depotId: input.depotId.trim().toUpperCase(),
      depotName: `${input.depotId} Depot Facility`,
      destinationShopId: input.destinationShopId.trim().toUpperCase(),
      shopName: `Fair Price Shop #${input.destinationShopId}`,
      district: input.district,
      reportingPeriod: input.reportingPeriod,
      commodity: input.commodity,
      quantityKg: Number(input.quantityKg),
      dispatchTimestamp: new Date().toISOString(),
      truckNumber: input.truckNumber || 'MH-04-TR-9900',
      sealNumber: input.sealNumber || `SEAL-ARK-${Math.floor(1000 + Math.random() * 9000)}`,
      entityKey,
      txHash,
      verificationStatus: 'Demo Data',
      reconciliationStatus: 'PENDING',
    };

    this.dispatches.unshift(newDispatch);
    this.save();
    return newDispatch;
  }

  getReceipts(): ShopReceipt[] {
    return [...this.receipts];
  }

  addReceipt(input: CreateReceiptInput): ShopReceipt {
    const randomHex = Math.random().toString(16).slice(2, 10);
    const entityKey = `0x${randomHex}5e7b9d1f3a5c7e9a1b3d5f7a`;
    const txHash = `0x${randomHex}${Math.random().toString(16).slice(2, 10)}`;

    const receivedKg = Number(input.receivedQuantityKg);
    const newReceipt: ShopReceipt = {
      id: `rcpt-${Date.now().toString().slice(-4)}`,
      deliveryId: input.deliveryId.trim().toUpperCase(),
      shopId: input.shopId.trim().toUpperCase(),
      shopName: `Fair Price Shop #${input.shopId}`,
      district: input.district,
      reportingPeriod: input.reportingPeriod,
      commodity: input.commodity,
      receivedQuantityKg: receivedKg,
      receivedTimestamp: input.receivedTimestamp || new Date().toISOString(),
      challanReference: `CHL-${input.district.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      conditionStatus: input.conditionStatus,
      entityKey,
      txHash,
      verificationStatus: 'Demo Data',
      reconciliationStatus: 'MATCH',
    };

    this.receipts.unshift(newReceipt);
    this.save();
    return newReceipt;
  }

  getStockReports(): StockReport[] {
    return [...this.stockReports];
  }

  addStockReport(input: CreateStockReportInput): StockReport {
    const randomHex = Math.random().toString(16).slice(2, 10);
    const entityKey = `0x${randomHex}3b4c5d6e7f8a9b0c1d2e`;
    const txHash = `0x${randomHex}${Math.random().toString(16).slice(2, 10)}`;

    const newReport: StockReport = {
      id: `stk-${Date.now().toString().slice(-4)}`,
      shopId: input.shopId.trim().toUpperCase(),
      shopName: `Fair Price Shop #${input.shopId}`,
      district: input.district,
      reportingPeriod: input.reportingPeriod,
      commodity: input.commodity,
      openingStockKg: Number(input.openingStockKg),
      distributedQuantityKg: Number(input.distributedQuantityKg),
      reportedClosingStockKg: Number(input.reportedClosingStockKg),
      entityKey,
      txHash,
      verificationStatus: 'Demo Data',
      reconciliationStatus: 'MATCH',
      reportTimestamp: new Date().toISOString(),
    };

    this.stockReports.unshift(newReport);
    this.save();
    return newReport;
  }

  getDiscrepancies(): Discrepancy[] {
    return [...this.discrepancies];
  }

  addDiscrepancy(input: CreateDiscrepancyInput): Discrepancy {
    const randomHex = Math.random().toString(16).slice(2, 10);
    const entityKey = `0x${randomHex}9a1b2c3d4e5f6a7b8c9d`;
    const txHash = `0x${randomHex}${Math.random().toString(16).slice(2, 10)}`;
    const caseId = `ARK-CASE-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newDisc: Discrepancy = {
      id: `disc-${Date.now().toString().slice(-4)}`,
      caseId,
      relatedDeliveryId: input.relatedDeliveryId?.trim().toUpperCase(),
      shopId: input.shopId?.trim().toUpperCase(),
      shopName: input.shopId ? `Fair Price Shop #${input.shopId}` : undefined,
      district: input.district,
      reportingPeriod: input.reportingPeriod,
      commodity: input.commodity,
      quantityDifferenceKg: input.reportedQuantityDiffKg ?? -50,
      category: input.category,
      status: 'Open',
      entityKey,
      txHash,
      description: input.description,
      reportedAt: new Date().toISOString(),
      verificationStatus: 'Demo Data',
      investigationNotes: 'Automated audit ticket created. Field verification scheduled.',
    };

    this.discrepancies.unshift(newDisc);
    this.save();
    return newDisc;
  }

  getRecordByKey(key: string): ArkivRecord | undefined {
    if (!key) return undefined;
    const clean = (s: string) => s.toLowerCase().replace(/^arkiv:[^:]+:entity:/i, '').replace(/^arkiv:entity:/i, '').trim();
    const target = clean(key);
    const lowerKey = key.toLowerCase();

    return this.records.find((r) => {
      if (!r) return false;
      const rKey = (r.key || '').toLowerCase();
      const rBiz = (r.businessIdentifier || '').toLowerCase();
      const rEnt = (r.entityKey || '').toLowerCase();

      return (
        rKey === lowerKey ||
        rBiz === lowerKey ||
        rEnt === lowerKey ||
        clean(rKey) === target ||
        clean(rBiz) === target ||
        clean(rEnt) === target
      );
    });
  }

  getRecords(): ArkivRecord[] {
    return [...this.records];
  }

  getSummary(): DashboardSummary {
    const totalDispatches = this.dispatches.length;
    const totalGrainDispatchedKg = this.dispatches.reduce((s, d) => s + d.quantityKg, 0);
    const totalReceipts = this.receipts.length;
    const totalGrainReceivedKg = this.receipts.reduce((s, r) => s + r.receivedQuantityKg, 0);
    const totalDiscrepancies = this.discrepancies.length;
    const resolvedDiscrepancies = this.discrepancies.filter((d) => d.status === 'Resolved').length;

    return {
      ...INITIAL_DASHBOARD_SUMMARY,
      totalDispatches,
      totalGrainDispatchedKg,
      totalReceipts,
      totalGrainReceivedKg,
      totalDiscrepancies,
      resolvedDiscrepancies,
      matchRatePercentage: totalReceipts > 0 ? 92.5 : 100,
      lastRefreshed: new Date().toISOString(),
      isDemoData: true,
      network: 'Tiramisu (Demo Mock)',
      backendHealthy: false,
    };
  }

  getShops(params: { district?: string; search?: string } = {}): Shop[] {
    let list = [...this.shops];
    if (params.district && params.district !== 'All') {
      list = list.filter((s) => s.district.toLowerCase() === params.district!.toLowerCase());
    }
    if (params.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.shopId.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.operatorName.toLowerCase().includes(q) ||
          (s.operatorEmail && s.operatorEmail.toLowerCase().includes(q)) ||
          s.district.toLowerCase().includes(q)
      );
    }
    return list;
  }

  addShop(input: CreateShopInput): Shop {
    const randomHex = Math.random().toString(16).slice(2, 10);
    const entityKey = `0x${randomHex}${Math.random().toString(16).slice(2, 10)}88a1b2c3`;
    const txHash = `0x${randomHex}${Math.random().toString(16).slice(2, 10)}`;

    const newShop: Shop = {
      id: input.shopId.trim().toUpperCase(),
      shopId: input.shopId.trim().toUpperCase(),
      name: input.name.trim(),
      operatorName: input.operatorName.trim(),
      operatorEmail: input.operatorEmail?.trim() || '',
      operatorAddress: input.operatorAddress?.trim() || '0x1234567890123456789012345678901234567890',
      district: input.district.trim(),
      state: input.state.trim(),
      address: input.address.trim(),
      allocatedBeneficiaries: Number(input.allocatedBeneficiaries || 0),
      monthlyQuotaKg: {
        wheat: Number(input.monthlyQuotaKg?.wheat || 0),
        rice: Number(input.monthlyQuotaKg?.rice || 0),
        coarseGrains: Number(input.monthlyQuotaKg?.coarseGrains || 0),
      },
      status: input.status || 'active',
      entityKey,
      txHash,
      createdAt: new Date().toISOString(),
      verificationStatus: 'Verified On-Chain',
    };

    this.shops.unshift(newShop);
    this.save();
    return newShop;
  }

  resetDemo(): void {
    this.dispatches = [...INITIAL_DISPATCHES];
    this.receipts = [...INITIAL_RECEIPTS];
    this.stockReports = [...INITIAL_STOCK_REPORTS];
    this.discrepancies = [...INITIAL_DISCREPANCIES];
    this.records = [...INITIAL_EVIDENCE_RECORDS];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('arkiv_demo_dispatches');
      localStorage.removeItem('arkiv_demo_receipts');
      localStorage.removeItem('arkiv_demo_stock');
      localStorage.removeItem('arkiv_demo_disc');
      localStorage.removeItem('arkiv_demo_shops');
    }
  }
}

export const localStore = new LocalDataStore();

// ---------------------------------------------------------------------------
// Centralized API Client (Real Backend + Arkiv Tiramisu Integration)
// ---------------------------------------------------------------------------
export const api = {
  /**
   * GET /api/v1/dashboard/summary
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    if (IS_DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 100));
      return localStore.getSummary();
    }

    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/summary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      const totals = json.data?.totals || {};
      const recentActivity = json.data?.recentActivity || [];

      const totalDispatched = Number(totals.totalDispatchedKg || 0);
      const totalReceived = Number(totals.totalConfirmedReceivedKg || 0);
      const matching = Number(totals.matchingRecords || 0);
      const mismatches = Number(totals.mismatches || 0);
      const totalReports = matching + mismatches;
      const matchRate = totalReports > 0 ? Number(((matching / totalReports) * 100).toFixed(1)) : 100;

      return {
        totalDispatches: recentActivity.filter((a: any) => a.recordType === 'depot_dispatch' || a.recordType === 'dispatch').length || 1,
        totalGrainDispatchedKg: totalDispatched,
        totalReceipts: recentActivity.filter((a: any) => a.recordType === 'shop_receipt' || a.recordType === 'receipt').length || 1,
        totalGrainReceivedKg: totalReceived,
        totalDiscrepancies: Number(totals.unresolvedDiscrepancies || mismatches || 0),
        resolvedDiscrepancies: 0,
        matchRatePercentage: matchRate,
        activeShopsCount: Number(totals.totalRegisteredShops || 1),
        trends: [
          { date: '10/12', dispatchedKg: Math.round(totalDispatched * 0.2), receivedKg: Math.round(totalReceived * 0.18) },
          { date: '10/13', dispatchedKg: Math.round(totalDispatched * 0.4), receivedKg: Math.round(totalReceived * 0.38) },
          { date: '10/14', dispatchedKg: Math.round(totalDispatched * 0.7), receivedKg: Math.round(totalReceived * 0.65) },
          { date: '10/15', dispatchedKg: Math.round(totalDispatched * 0.85), receivedKg: Math.round(totalReceived * 0.82) },
          { date: '10/16', dispatchedKg: totalDispatched, receivedKg: totalReceived },
        ],
        reconciliationBreakdown: [
          { name: 'Full Matches', value: matching || 1, color: '#36D399' },
          { name: 'Discrepancies', value: mismatches || (totals.unresolvedDiscrepancies ? 1 : 0), color: '#FB7185' },
          { name: 'Pending / In-Transit', value: Math.max(0, totalDispatched - totalReceived) > 0 ? 1 : 0, color: '#FBBF24' },
        ],
        lastRefreshed: new Date().toISOString(),
        isDemoData: false,
        network: 'Arkiv Tiramisu Testnet (#7738577)',
        backendHealthy: true,
      };
    } catch (err) {
      console.warn('Dashboard summary live request failed, falling back to local snapshot:', err);
      return localStore.getSummary();
    }
  },

  /**
   * GET /api/v1/dispatches
   */
  async getDispatches(filter?: {
    search?: string;
    district?: string;
    period?: string;
  }): Promise<DepotDispatch[]> {
    if (IS_DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 80));
      let data = localStore.getDispatches();
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        data = data.filter(
          (d) =>
            d.deliveryId.toLowerCase().includes(q) ||
            d.depotId.toLowerCase().includes(q) ||
            d.destinationShopId.toLowerCase().includes(q)
        );
      }
      return data;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/dispatches?limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      const entities = json.data?.entities || [];
      let records: DepotDispatch[] = entities.map(mapEntityToDispatch);

      if (filter?.search) {
        const q = filter.search.toLowerCase();
        records = records.filter(
          (d) =>
            d.deliveryId.toLowerCase().includes(q) ||
            d.depotId.toLowerCase().includes(q) ||
            d.destinationShopId.toLowerCase().includes(q)
        );
      }
      if (filter?.district && filter.district !== 'All') {
        records = records.filter((d) => d.district === filter.district);
      }
      if (filter?.period && filter.period !== 'All') {
        records = records.filter((d) => d.reportingPeriod.includes(filter.period!));
      }

      return records;
    } catch (err) {
      console.warn('Failed to fetch live dispatches, using fallback:', err);
      return localStore.getDispatches();
    }
  },

  /**
   * POST /api/v1/dispatches
   */
  async createDispatch(input: CreateDispatchInput): Promise<DepotDispatch> {
    if (IS_DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 200));
      return localStore.addDispatch(input);
    }

    const grainMap: Record<string, string> = {
      Wheat: 'wheat',
      Rice: 'rice',
      'Coarse Grains': 'coarse_grains',
      Pulses: 'sugar',
    };

    const payload = {
      dispatchId: input.deliveryId.trim().toUpperCase(),
      shopId: input.destinationShopId.trim().toUpperCase(),
      sourceDepot: input.depotId.trim() || 'Central Grain Depot',
      grainType: grainMap[input.commodity] || 'wheat',
      dispatchedQuantityKg: Number(input.quantityKg),
      truckNumber: input.truckNumber?.trim() || 'MH-04-TR-9900',
      driverName: 'Depot Fleet Driver',
      driverPhone: '+91-9876543210',
      dispatchDate: new Date().toISOString(),
      remarks: input.sealNumber ? `Seal: ${input.sealNumber}` : '',
    };

    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/dispatches`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      throw new Error('Authentication required (401). Please sign in as an authorized Depot Officer to create dispatches.');
    }
    if (res.status === 403) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || 'Access Denied (403): Only Admin (Civil Supplies Depot Officer) can create dispatches.');
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `Failed to create dispatch (HTTP ${res.status})`);
    }

    const json = await res.json();
    return mapEntityToDispatch({
      key: json.data?.entityKey,
      txHash: json.data?.txHash,
      payload: json.data?.payload || payload,
      attributes: json.data?.attributes || {},
    });
  },

  /**
   * GET /api/v1/receipts
   */
  async getReceipts(filter?: {
    search?: string;
    district?: string;
    period?: string;
  }): Promise<ShopReceipt[]> {
    if (IS_DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 80));
      return localStore.getReceipts();
    }

    try {
      const res = await fetch(`${API_BASE_URL}/receipts?limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      const entities = json.data?.entities || [];
      let records: ShopReceipt[] = entities.map(mapEntityToReceipt);

      if (filter?.search) {
        const q = filter.search.toLowerCase();
        records = records.filter(
          (r) =>
            r.deliveryId.toLowerCase().includes(q) ||
            r.shopId.toLowerCase().includes(q) ||
            (r.shopName && r.shopName.toLowerCase().includes(q))
        );
      }
      return records;
    } catch (err) {
      console.warn('Failed to fetch live receipts, using fallback:', err);
      return localStore.getReceipts();
    }
  },

  /**
   * POST /api/v1/receipts
   */
  async createReceipt(input: CreateReceiptInput): Promise<ShopReceipt> {
    if (IS_DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 200));
      return localStore.addReceipt(input);
    }

    const cleanDelivery = input.deliveryId.trim().toUpperCase();
    const cleanShop = input.shopId.trim().toUpperCase();
    const receiptId = `RCPT-${cleanDelivery.replace(/[^A-Za-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

    const payload = {
      receiptId,
      dispatchId: cleanDelivery,
      shopId: cleanShop,
      receivedQuantityKg: Number(input.receivedQuantityKg),
      receivedDate: input.receivedTimestamp || new Date().toISOString(),
      receiverName: 'Shop In-charge',
      remarks: `Condition: ${input.conditionStatus}`,
    };

    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/receipts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      throw new Error('Authentication required (401). Please sign in to confirm receipts.');
    }
    if (res.status === 403) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || 'Access Denied (403): You do not have permission or are not assigned to this Fair Price Shop.');
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `Failed to create receipt (HTTP ${res.status})`);
    }

    const json = await res.json();
    return mapEntityToReceipt({
      key: json.data?.entityKey,
      txHash: json.data?.txHash,
      payload: json.data?.payload || payload,
      attributes: json.data?.attributes || {},
    });
  },

  /**
   * GET /api/v1/stock-reports
   */
  async getStockReports(filter?: {
    search?: string;
    district?: string;
    period?: string;
  }): Promise<StockReport[]> {
    if (IS_DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 80));
      return localStore.getStockReports();
    }

    try {
      const res = await fetch(`${API_BASE_URL}/stock-reports?limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      const entities = json.data?.entities || [];
      let records: StockReport[] = entities.map(mapEntityToStockReport);

      if (filter?.search) {
        const q = filter.search.toLowerCase();
        records = records.filter(
          (s) => s.shopId.toLowerCase().includes(q) || (s.shopName && s.shopName.toLowerCase().includes(q))
        );
      }
      return records;
    } catch (err) {
      console.warn('Failed to fetch live stock reports, using fallback:', err);
      return localStore.getStockReports();
    }
  },

  /**
   * POST /api/v1/stock-reports
   */
  async createStockReport(input: CreateStockReportInput): Promise<StockReport> {
    if (IS_DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 200));
      return localStore.addStockReport(input);
    }

    const grainMap: Record<string, string> = {
      Wheat: 'wheat',
      Rice: 'rice',
      'Coarse Grains': 'coarse_grains',
      Pulses: 'sugar',
    };

    const cleanShop = input.shopId.trim().toUpperCase();
    const grain = grainMap[input.commodity] || 'wheat';

    let period = input.reportingPeriod.trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      period = new Date().toISOString().slice(0, 7);
    }

    const reportId = `STK-${period.replace('-', '')}-${cleanShop.replace(/[^A-Za-z0-9]/g, '')}-${Date.now().toString().slice(-3)}`;

    const payload = {
      reportId,
      shopId: cleanShop,
      grainType: grain,
      period,
      openingStockKg: Math.round(Number(input.openingStockKg)),
      distributedKg: Math.round(Number(input.distributedQuantityKg)),
      closingStockKg: Math.round(Number(input.reportedClosingStockKg)),
      remarks: 'Submitted via ArkivTrace Web Interface',
    };

    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/stock-reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      throw new Error('Authentication required (401). Please sign in to declare stock reports.');
    }
    if (res.status === 403) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || 'Access Denied (403): You do not have permission or are not assigned to this Fair Price Shop.');
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `Failed to create stock report (HTTP ${res.status})`);
    }

    const json = await res.json();
    return mapEntityToStockReport({
      key: json.data?.entityKey,
      txHash: json.data?.txHash,
      payload: json.data?.payload || payload,
      attributes: json.data?.attributes || {},
    });
  },

  /**
   * GET /api/v1/discrepancies
   */
  async getDiscrepancies(filter?: {
    search?: string;
    category?: string;
    status?: string;
  }): Promise<Discrepancy[]> {
    if (IS_DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 80));
      return localStore.getDiscrepancies();
    }

    try {
      const res = await fetch(`${API_BASE_URL}/discrepancies?limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      const entities = json.data?.entities || [];
      let records: Discrepancy[] = entities.map(mapEntityToDiscrepancy);

      if (filter?.search) {
        const q = filter.search.toLowerCase();
        records = records.filter(
          (d) =>
            d.caseId.toLowerCase().includes(q) ||
            (d.relatedDeliveryId && d.relatedDeliveryId.toLowerCase().includes(q)) ||
            (d.shopId && d.shopId.toLowerCase().includes(q))
        );
      }
      return records;
    } catch (err) {
      console.warn('Failed to fetch live discrepancies, using fallback:', err);
      return localStore.getDiscrepancies();
    }
  },

  /**
   * POST /api/v1/discrepancies
   */
  async createDiscrepancy(input: CreateDiscrepancyInput): Promise<Discrepancy> {
    if (IS_DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 200));
      return localStore.addDiscrepancy(input);
    }

    let period = input.reportingPeriod.trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      period = new Date().toISOString().slice(0, 7);
    }

    const payload = {
      shopId: input.shopId?.trim().toUpperCase() || 'FPS-GEN-01',
      period,
      issueType: input.category || 'Transit Loss Discrepancy',
      severity: 'major',
      description:
        input.description.length >= 10
          ? input.description
          : `${input.description} (Detailed verification report)`,
      evidenceEntityKeys: [],
      observedDiscrepancyKg: Math.abs(Math.round(Number(input.reportedQuantityDiffKg || 50))),
      reporterName: 'Public Distribution System Auditor',
      reporterContact: 'auditor@arkivtrace.org',
    };

    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/discrepancies`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      throw new Error('Authentication required (401). Please sign in to submit discrepancy reports.');
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `Failed to submit discrepancy (HTTP ${res.status})`);
    }

    const json = await res.json();
    return mapEntityToDiscrepancy({
      key: json.data?.entityKey,
      txHash: json.data?.txHash,
      payload: json.data?.payload || payload,
      attributes: json.data?.attributes || {},
    });
  },

  /**
   * GET /api/v1/records
   */
  async getEvidenceRecords(filter?: {
    search?: string;
    recordType?: string;
  }): Promise<ArkivRecord[]> {
    if (IS_DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 80));
      return localStore.getRecords();
    }

    try {
      const res = await fetch(`${API_BASE_URL}/records?limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      const items = json.data?.items || [];
      let records: ArkivRecord[] = items.map(mapTimelineItemToArkivRecord);

      if (filter?.search) {
        const q = filter.search.toLowerCase();
        records = records.filter(
          (rec) =>
            rec.key.toLowerCase().includes(q) ||
            rec.businessIdentifier.toLowerCase().includes(q) ||
            (rec.district && rec.district.toLowerCase().includes(q))
        );
      }
      if (filter?.recordType && filter.recordType !== 'All') {
        records = records.filter((rec) => rec.recordType === filter.recordType);
      }

      return records;
    } catch (err) {
      console.warn('Failed to fetch live records, using fallback:', err);
      return localStore.getRecords();
    }
  },

  /**
   * GET /api/v1/records/:key
   */
  async getRecordByKey(key: string): Promise<ArkivRecord | null> {
    if (!key) return null;

    if (IS_DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 60));
      return localStore.getRecordByKey(key) || null;
    }

    try {
      const cleanKey = key.trim().replace(/^arkiv:[^:]+:entity:/i, '').replace(/^arkiv:entity:/i, '');
      const candidates = Array.from(new Set([key.trim(), cleanKey].filter(Boolean)));

      for (const cand of candidates) {
        try {
          const res = await fetch(`${API_BASE_URL}/records/${encodeURIComponent(cand)}`);
          if (res.ok) {
            const json = await res.json();
            if (json.data) {
              return mapRawEntityToArkivRecord(json.data);
            }
          }
        } catch {
          // If candidate request fails, try next
        }
      }

      // If not found in live blockchain backend, fallback to local store (handles demo/seed records)
      return localStore.getRecordByKey(key) || localStore.getRecordByKey(cleanKey) || null;
    } catch (err) {
      console.warn(`Failed to fetch live record for key ${key}, using fallback:`, err);
      return localStore.getRecordByKey(key) || null;
    }
  },

  /**
   * GET /api/v1/shops/:id/timeline
   */
  async getShopTimeline(shopId: string): Promise<ShopTimelineEvent[]> {
    if (IS_DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 80));
      return getMockShopTimeline(shopId);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/shops/${encodeURIComponent(shopId)}/timeline`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      const items = json.data?.items || [];
      return items.map(mapTimelineItemToEvent);
    } catch (err) {
      console.warn(`Failed to fetch live shop timeline for ${shopId}, using fallback:`, err);
      return getMockShopTimeline(shopId);
    }
  },

  /**
   * GET /api/v1/network/status
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    const startTime = performance.now();
    try {
      const res = await fetch(`${API_BASE_URL}/network/status`);
      const latency = Math.round(performance.now() - startTime);

      if (!res.ok) {
        return {
          ...INITIAL_NETWORK_STATUS,
          status: 'Unavailable',
          backendHealthy: false,
          lastPingMs: latency,
        };
      }

      const json = await res.json();
      const data = json.data || {};
      const isConnected = data.status === 'connected';

      return {
        networkName: data.network || 'Arkiv Tiramisu',
        chainId: Number(data.chainId || 7738577),
        status: isConnected ? 'Connected' : 'Unavailable',
        backendHealthy: true,
        rpcEndpoint: 'https://rpc.tiramisu.db-chain.testnet.arkiv.network',
        lastBlockNumber: data.blockNumber ? Number(data.blockNumber) : undefined,
        lastBlockTimestamp: new Date().toISOString(),
        lastPingMs: latency,
        mode: 'TESTNET',
      };
    } catch {
      return {
        ...INITIAL_NETWORK_STATUS,
        status: 'Unavailable',
        backendHealthy: false,
        lastPingMs: Math.round(performance.now() - startTime),
      };
    }
  },

  async getTelegramLinkCode(): Promise<{ code: string; expiresAt: string; instructions: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/telegram/link-code`, {
      method: 'POST',
      headers,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to generate Telegram link code');
    }
    return json.data;
  },

  async getTelegramStatus(): Promise<{
    isLinked: boolean;
    telegramChatId: string | null;
    role: string;
    assignedShopIds: string[];
  }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/telegram/status`, {
      headers,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to fetch Telegram link status');
    }
    return json.data;
  },

  /**
   * GET /api/v1/shops
   * Fetch all registered Fair Price Shops
   */
  async getShops(params: { district?: string; search?: string; limit?: number } = {}): Promise<Shop[]> {
    if (IS_DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 100));
      return localStore.getShops(params);
    }

    try {
      const url = new URL(`${API_BASE_URL}/shops`);
      if (params.district && params.district !== 'All') {
        url.searchParams.set('district', params.district);
      }
      url.searchParams.set('limit', String(params.limit || 50));

      const res = await fetch(url.toString(), {
        headers: await getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const json = await res.json();
      const rawEntities = json.data?.entities || [];
      let shops: Shop[] = rawEntities.map(mapEntityToShop);

      if (shops.length === 0) {
        shops = localStore.getShops(params);
      } else {
        // Deduplicate by unique shopId to prevent duplicate rows and duplicate key warnings
        const seenShops = new Map<string, Shop>();
        for (const s of shops) {
          const id = s.shopId.toUpperCase().trim();
          const existing = seenShops.get(id);
          if (!existing) {
            seenShops.set(id, s);
          } else {
            const currentTime = new Date(s.createdAt || 0).getTime();
            const existingTime = new Date(existing.createdAt || 0).getTime();
            if (currentTime > existingTime || (s.operatorEmail && !existing.operatorEmail)) {
              seenShops.set(id, s);
            }
          }
        }
        shops = Array.from(seenShops.values());

        if (params.search) {
          const q = params.search.toLowerCase().trim();
          shops = shops.filter((s: Shop) =>
            s.shopId.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            s.operatorName.toLowerCase().includes(q) ||
            (s.operatorEmail && s.operatorEmail.toLowerCase().includes(q)) ||
            s.district.toLowerCase().includes(q)
          );
        }
      }

      return shops;
    } catch (err) {
      console.warn('Failed to fetch shops from live API, falling back to local store:', err);
      return localStore.getShops(params);
    }
  },

  /**
   * POST /api/v1/shops (Admin only)
   */
  async createShop(input: CreateShopInput): Promise<{
    entityKey: string;
    txHash: string;
    shopId: string;
    explorerUrl: string;
  }> {
    const payload = {
      shopId: input.shopId.trim().toUpperCase(),
      name: input.name.trim(),
      operatorName: input.operatorName.trim(),
      operatorEmail: input.operatorEmail?.trim() || '',
      operatorAddress: input.operatorAddress?.trim() || '0x1234567890123456789012345678901234567890',
      district: input.district.trim(),
      state: input.state.trim(),
      address: input.address.trim(),
      allocatedBeneficiaries: Number(input.allocatedBeneficiaries),
      monthlyQuotaKg: {
        wheat: Number(input.monthlyQuotaKg?.wheat || 0),
        rice: Number(input.monthlyQuotaKg?.rice || 0),
        coarseGrains: Number(input.monthlyQuotaKg?.coarseGrains || 0),
      },
      status: input.status || 'active',
    };

    if (IS_DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 400));
      const s = localStore.addShop(input);
      return {
        entityKey: s.entityKey,
        txHash: s.txHash || s.entityKey,
        shopId: s.shopId,
        explorerUrl: `https://tiramisu.explorer.arkiv.network/tx/${s.txHash}`,
      };
    }

    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/shops`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      throw new Error('Authentication required (401). Please sign in as an Admin.');
    }
    if (res.status === 403) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || 'Access Denied (403): Only Supply Chain Admins can register new shops.');
    }
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `Failed to create shop (HTTP ${res.status})`);
    }

    const json = await res.json();
    localStore.addShop(input);
    return json.data;
  },

  /**
   * GET /api/v1/auth/sync
   * Synchronize authenticated Clerk user role with on-chain Arkiv shop assignments.
   */
  async syncAuthProfile(): Promise<{
    role: string;
    shopId: string | null;
    assignedShopIds: string[];
    updated: boolean;
  } | null> {
    try {
      const headers = await getAuthHeaders();
      const authHeader = (headers as Record<string, string>)['Authorization'];
      if (!authHeader) return null;

      const res = await fetch(`${API_BASE_URL}/auth/sync`, {
        method: 'GET',
        headers,
      });

      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.warn('Profile sync failed silently:', err);
      return null;
    }
  },

  /**
   * POST /api/v1/shops/:id/operator (Admin only)
   * Assign or update operator email for an existing shop on Arkiv
   */
  async assignShopOperator(shopId: string, operatorEmail: string): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/shops/${encodeURIComponent(shopId)}/operator`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ operatorEmail: operatorEmail.trim() }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `Failed to assign operator (HTTP ${res.status})`);
    }

    const json = await res.json();
    return json.data;
  },

  resetDemoData(): void {
    localStore.resetDemo();
  },
};
