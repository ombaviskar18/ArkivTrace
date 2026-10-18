export type RecordType =
  | 'depot_dispatch'
  | 'shop_receipt'
  | 'stock_report'
  | 'discrepancy_report'
  | 'audit_event';

export type ReconciliationStatus =
  | 'MATCH'
  | 'MISMATCH'
  | 'INSUFFICIENT_DATA'
  | 'PENDING';

export type VerificationStatus =
  | 'Verified'
  | 'Recorded'
  | 'Pending'
  | 'Unavailable'
  | 'Demo Data';

export interface DepotDispatch {
  id: string;
  deliveryId: string;
  depotId: string;
  depotName?: string;
  destinationShopId: string;
  shopName?: string;
  district: string;
  reportingPeriod: string;
  commodity: 'Wheat' | 'Rice' | 'Coarse Grains' | 'Pulses';
  quantityKg: number;
  dispatchTimestamp: string;
  truckNumber?: string;
  sealNumber?: string;
  entityKey: string;
  txHash?: string;
  verificationStatus: VerificationStatus;
  reconciliationStatus: ReconciliationStatus;
}

export interface ShopReceipt {
  id: string;
  deliveryId: string;
  shopId: string;
  shopName?: string;
  district: string;
  reportingPeriod: string;
  commodity: 'Wheat' | 'Rice' | 'Coarse Grains' | 'Pulses';
  receivedQuantityKg: number;
  dispatchedQuantityKg?: number;
  receivedTimestamp: string;
  challanReference?: string;
  conditionStatus: 'Good' | 'Damaged Packaging' | 'Moisture Detected';
  entityKey: string;
  txHash?: string;
  verificationStatus: VerificationStatus;
  reconciliationStatus: ReconciliationStatus;
}

export interface StockReport {
  id: string;
  shopId: string;
  shopName?: string;
  district: string;
  reportingPeriod: string;
  commodity: 'Wheat' | 'Rice' | 'Coarse Grains' | 'Pulses';
  openingStockKg: number;
  receivedQuantityKg?: number;
  distributedQuantityKg: number;
  reportedClosingStockKg: number;
  expectedClosingStockKg?: number;
  differenceKg?: number;
  entityKey: string;
  txHash?: string;
  verificationStatus: VerificationStatus;
  reconciliationStatus: ReconciliationStatus;
  reportTimestamp: string;
}

export interface Discrepancy {
  id: string;
  caseId: string;
  relatedDeliveryId?: string;
  shopId?: string;
  shopName?: string;
  district: string;
  reportingPeriod: string;
  commodity: 'Wheat' | 'Rice' | 'Coarse Grains' | 'Pulses';
  dispatchedQuantityKg?: number;
  receivedQuantityKg?: number;
  quantityDifferenceKg: number;
  category: 'Transit Loss' | 'Weighing Discrepancy' | 'Stock Mismatch' | 'Delayed Receipt';
  status: 'Open' | 'Under Investigation' | 'Resolved' | 'Escalated';
  entityKey: string;
  txHash?: string;
  description: string;
  reportedAt: string;
  verificationStatus: VerificationStatus;
  investigationNotes?: string;
}

export interface ArkivRecord {
  key: string;
  recordType: RecordType;
  businessIdentifier: string;
  timestamp: string;
  quantityKg?: number;
  commodity?: string;
  district?: string;
  entityKey: string;
  txHash?: string;
  blockNumber?: number;
  network: string;
  verificationStatus: VerificationStatus;
  payload: Record<string, unknown>;
  relationships: {
    label: string;
    targetKey: string;
    targetType: RecordType;
  }[];
}

export interface ShopTimelineEvent {
  id: string;
  timestamp: string;
  eventType: RecordType;
  title: string;
  description: string;
  quantityKg?: number;
  status: ReconciliationStatus | 'INVESTIGATING' | 'COMPLETED';
  entityKey: string;
  referenceId: string;
  missingEvidence?: boolean;
}

export interface DashboardSummary {
  totalDispatches: number;
  totalGrainDispatchedKg: number;
  totalReceipts: number;
  totalGrainReceivedKg: number;
  totalDiscrepancies: number;
  resolvedDiscrepancies: number;
  matchRatePercentage: number;
  activeShopsCount: number;
  trends: {
    date: string;
    dispatchedKg: number;
    receivedKg: number;
  }[];
  reconciliationBreakdown: {
    name: string;
    value: number;
    color: string;
  }[];
  lastRefreshed: string;
  isDemoData: boolean;
  network: string;
  backendHealthy: boolean;
}

export interface NetworkStatus {
  networkName: string;
  chainId: number;
  status: 'Connected' | 'Connecting' | 'Unavailable' | 'Unknown';
  backendHealthy: boolean;
  rpcEndpoint: string;
  lastBlockNumber?: number;
  lastBlockTimestamp?: string;
  latestEntityKey?: string;
  lastPingMs: number;
  mode: 'DEMO' | 'TESTNET' | 'MAINNET';
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    timestamp?: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface CreateDispatchInput {
  deliveryId: string;
  depotId: string;
  destinationShopId: string;
  district: string;
  reportingPeriod: string;
  commodity: 'Wheat' | 'Rice' | 'Coarse Grains' | 'Pulses';
  quantityKg: number;
  truckNumber?: string;
  sealNumber?: string;
}

export interface CreateReceiptInput {
  deliveryId: string;
  shopId: string;
  district: string;
  reportingPeriod: string;
  commodity: 'Wheat' | 'Rice' | 'Coarse Grains' | 'Pulses';
  receivedQuantityKg: number;
  receivedTimestamp: string;
  conditionStatus: 'Good' | 'Damaged Packaging' | 'Moisture Detected';
}

export interface CreateStockReportInput {
  shopId: string;
  district: string;
  reportingPeriod: string;
  commodity: 'Wheat' | 'Rice' | 'Coarse Grains' | 'Pulses';
  openingStockKg: number;
  distributedQuantityKg: number;
  reportedClosingStockKg: number;
}

export interface CreateDiscrepancyInput {
  relatedDeliveryId?: string;
  shopId?: string;
  district: string;
  reportingPeriod: string;
  commodity: 'Wheat' | 'Rice' | 'Coarse Grains' | 'Pulses';
  category: 'Transit Loss' | 'Weighing Discrepancy' | 'Stock Mismatch' | 'Delayed Receipt';
  description: string;
  reportedQuantityDiffKg?: number;
}

export interface Shop {
  id: string;
  shopId: string;
  name: string;
  operatorName: string;
  operatorEmail?: string;
  operatorAddress?: string;
  district: string;
  state: string;
  address: string;
  allocatedBeneficiaries: number;
  monthlyQuotaKg: {
    wheat: number;
    rice: number;
    coarseGrains?: number;
  };
  status: 'active' | 'suspended' | 'inactive';
  entityKey: string;
  txHash?: string;
  createdAt?: string;
  verificationStatus?: string;
}

export interface CreateShopInput {
  shopId: string;
  name: string;
  operatorName: string;
  operatorEmail?: string;
  operatorAddress?: string;
  district: string;
  state: string;
  address: string;
  allocatedBeneficiaries: number;
  monthlyQuotaKg?: {
    wheat?: number;
    rice?: number;
    coarseGrains?: number;
  };
  status?: 'active' | 'suspended' | 'inactive';
}


