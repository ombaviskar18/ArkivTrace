'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CopyButton } from '@/components/ui/CopyButton';
import { Modal } from '@/components/ui/Modal';
import { ReceiptForm } from '@/components/forms/ReceiptForm';
import { ShopForm } from '@/components/forms/ShopForm';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useUserRole } from '@/lib/auth';
import { ShopReceipt, Shop } from '@/types/api';
import { formatSimpleKg, formatDate, shortenIdentifier } from '@/lib/formatters';
import {
  PackageCheck,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  History,
  Store,
  Mail,
  MapPin,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function ShopsPage() {
  const { role, shopId, assignedShopIds, isAdmin, isOperator } = useUserRole();
  const [activeTab, setActiveTab] = useState<'shops' | 'receipts'>('shops');

  const [shops, setShops] = useState<Shop[]>([]);
  const [receipts, setReceipts] = useState<ShopReceipt[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(true);

  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('All');

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);

  const loadShops = async () => {
    try {
      setLoadingShops(true);
      const data = await api.getShops({
        search,
        district: districtFilter,
      });
      setShops(data);
    } catch (err) {
      console.error('Failed to load shops:', err);
    } finally {
      setLoadingShops(false);
    }
  };

  const loadReceipts = async () => {
    try {
      setLoadingReceipts(true);
      const data = await api.getReceipts({
        search,
        district: districtFilter,
        period: periodFilter,
      });
      setReceipts(data);
    } catch (err) {
      console.error('Failed to load shop receipts:', err);
    } finally {
      setLoadingReceipts(false);
    }
  };

  const loadAllData = () => {
    loadShops();
    loadReceipts();
  };

  useEffect(() => {
    loadShops();
  }, [search, districtFilter]);

  useEffect(() => {
    loadReceipts();
  }, [search, districtFilter, periodFilter]);

  // For operators:
  // If the user has no assigned shop, display a banner:
  // “You have not been assigned to any shop yet. Ask your admin to add you.”
  // Otherwise, list only the shop(s) whose IDs appear in assignedShopIds.
  const visibleShops = useMemo(() => {
    let list = shops;
    if (isOperator) {
      if (!assignedShopIds || assignedShopIds.length === 0) {
        return [];
      }
      list = shops.filter((s) => assignedShopIds.includes(s.shopId.toUpperCase()));
    }

    // Deduplicate by shopId, keeping newest entry / entry with operator email
    const map = new Map<string, Shop>();
    for (const s of list) {
      const key = s.shopId.toUpperCase().trim();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, s);
      } else {
        const curTime = new Date(s.createdAt || 0).getTime();
        const exTime = new Date(existing.createdAt || 0).getTime();
        if (curTime > exTime || (s.operatorEmail && !existing.operatorEmail)) {
          map.set(key, s);
        }
      }
    }
    return Array.from(map.values());
  }, [shops, isOperator, assignedShopIds]);

  const visibleReceipts = useMemo(() => {
    if (isOperator) {
      if (!assignedShopIds || assignedShopIds.length === 0) {
        return [];
      }
      return receipts.filter((r) => assignedShopIds.includes(r.shopId.toUpperCase()));
    }
    return receipts;
  }, [receipts, isOperator, assignedShopIds]);

  // Calculate unique districts from available data for dropdown
  const uniqueDistricts = useMemo(() => {
    const set = new Set<string>();
    shops.forEach((s) => s.district && set.add(s.district));
    receipts.forEach((r) => r.district && set.add(r.district));
    return Array.from(set);
  }, [shops, receipts]);

  // Aggregate stats
  const totalBeneficiaries = useMemo(
    () => visibleShops.reduce((sum, s) => sum + (s.allocatedBeneficiaries || 0), 0),
    [visibleShops]
  );
  const totalMonthlyQuota = useMemo(
    () =>
      visibleShops.reduce(
        (sum, s) =>
          sum +
          (s.monthlyQuotaKg?.wheat || 0) +
          (s.monthlyQuotaKg?.rice || 0) +
          (s.monthlyQuotaKg?.coarseGrains || 0),
        0
      ),
    [visibleShops]
  );

  return (
    <AppShell onRefresh={loadAllData}>
      <RoleGuard allowedRoles={['admin', 'operator']}>
        {/* Operator scope notification banner */}
        {isOperator && (
          assignedShopIds.length === 0 ? (
            <div className="mb-4 p-4 rounded-xl bg-[#eab308]/15 border border-[#eab308]/40 flex items-center justify-between text-xs shadow-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-[#eab308] shrink-0" />
                <div>
                  <p className="font-semibold text-[#fef08a]">No Shop Assigned</p>
                  <p className="text-[#fef9c3] text-[11px] mt-0.5">
                    You have not been assigned to any shop yet. Ask your admin to add you.
                  </p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded bg-[#eab308]/20 text-[#fef08a] border border-[#eab308]/40 font-bold">
                Pending Assignment
              </span>
            </div>
          ) : (
            <div className="mb-4 p-3 rounded-xl bg-[#2563eb]/15 border border-[#3b82f6]/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-[#3b82f6]" />
                <span className="text-[#F1F8FC]">
                  Dealer Scoped: Logged in for Fair Price Shop{' '}
                  <strong className="text-[#60a5fa] font-mono">
                    {assignedShopIds.join(', ')}
                  </strong>
                </span>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#3b82f6]/15 text-[#60a5fa] border border-[#3b82f6]/30 font-bold">
                Dealer Scope
              </span>
            </div>
          )
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#F1F8FC]">
                Total <span className="text-[#3b82f6]">Fair Price Shops</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#36D399]/15 text-[#36D399] border border-[#36D399]/30 font-mono">
                {visibleShops.length} Registered Outlets
              </span>
            </div>
            <p className="text-xs text-[#91A9B7] mt-1">
              Inspect all ration shops created by admin, verified on Arkiv Tiramisu blockchain with assigned dealer credentials and statutory grain allocations.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <Button
                variant="primary"
                onClick={() => setIsShopModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Register New Shop
              </Button>
            )}
            {isOperator && (
              <Button
                variant="secondary"
                onClick={() => setIsReceiptModalOpen(true)}
                icon={<PackageCheck className="w-4 h-4 text-[#3b82f6]" />}
              >
                Acknowledge Receipt
              </Button>
            )}
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-[#06151D] border border-[#3b82f6]/20">
            <div className="flex items-center justify-between text-[#91A9B7] text-xs mb-1">
              <span>Total Active Shops</span>
              <Store className="w-4 h-4 text-[#3b82f6]" />
            </div>
            <div className="text-xl font-extrabold text-[#F1F8FC] font-mono">
              {visibleShops.length}
            </div>
            <div className="text-[10px] text-[#36D399] mt-0.5">Anchored on Arkiv Web3</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#06151D] border border-[#3b82f6]/20">
            <div className="flex items-center justify-between text-[#91A9B7] text-xs mb-1">
              <span>Beneficiaries</span>
              <Users className="w-4 h-4 text-[#60a5fa]" />
            </div>
            <div className="text-xl font-extrabold text-[#F1F8FC] font-mono">
              {totalBeneficiaries.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#91A9B7] mt-0.5">Enrolled Ration Households</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#06151D] border border-[#3b82f6]/20">
            <div className="flex items-center justify-between text-[#91A9B7] text-xs mb-1">
              <span>Monthly Quotas</span>
              <PackageCheck className="w-4 h-4 text-[#FBBF24]" />
            </div>
            <div className="text-xl font-extrabold text-[#F1F8FC] font-mono">
              {formatSimpleKg(totalMonthlyQuota)}
            </div>
            <div className="text-[10px] text-[#91A9B7] mt-0.5">Allocated Grain Target</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#06151D] border border-[#3b82f6]/20">
            <div className="flex items-center justify-between text-[#91A9B7] text-xs mb-1">
              <span>Delivery Receipts</span>
              <ShieldCheck className="w-4 h-4 text-[#36D399]" />
            </div>
            <div className="text-xl font-extrabold text-[#F1F8FC] font-mono">
              {visibleReceipts.length}
            </div>
            <div className="text-[10px] text-[#36D399] mt-0.5">On-Chain Acknowledged</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#3b82f6]/20 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('shops')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'shops'
                ? 'border-[#3b82f6] text-[#60a5fa] bg-[#3b82f6]/10'
                : 'border-transparent text-[#91A9B7] hover:text-[#F1F8FC] hover:bg-[#06151D]'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Total Shops ({visibleShops.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receipts')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'receipts'
                ? 'border-[#3b82f6] text-[#60a5fa] bg-[#3b82f6]/10'
                : 'border-transparent text-[#91A9B7] hover:text-[#F1F8FC] hover:bg-[#06151D]'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Delivery Receipts ({visibleReceipts.length})</span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <Card>
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#607987] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeTab === 'shops'
                    ? 'Search by Shop ID, Shop Name, Dealer Name, or Dealer Email...'
                    : 'Search by delivery ID, shop ID, or challan reference...'
                }
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] placeholder-[#607987] focus:border-[#3b82f6] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-[#91A9B7]">
                <Filter className="w-3.5 h-3.5 text-[#3b82f6]" />
                <span>District:</span>
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none"
                >
                  <option value="All">All Districts</option>
                  {uniqueDistricts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                  {uniqueDistricts.length === 0 && (
                    <>
                      <option value="Pune Central">Pune Central</option>
                      <option value="Raigad">Raigad</option>
                      <option value="Central Delhi">Central Delhi</option>
                      <option value="South Delhi">South Delhi</option>
                    </>
                  )}
                </select>
              </div>

              {activeTab === 'receipts' && (
                <div className="flex items-center gap-1.5 text-xs text-[#91A9B7]">
                  <span>Cycle:</span>
                  <select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none"
                  >
                    <option value="All">All Cycles</option>
                    <option value="October 2026">October 2026</option>
                    <option value="September 2026">September 2026</option>
                  </select>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={activeTab === 'shops' ? loadShops : loadReceipts}
                title="Refresh Table"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </Card>

        {/* TAB 1: Total Shops Table */}
        {activeTab === 'shops' && (
          <Card>
            {loadingShops ? (
              <LoadingSkeleton rows={5} />
            ) : visibleShops.length === 0 ? (
              <EmptyState
                title="No Fair Price Shops Found"
                description={
                  isAdmin
                    ? "No ration shops match your active query. Click 'Register New Shop' to authorize a new shop on Arkiv blockchain."
                    : "No ration shops are registered under this filter."
                }
                icon={<Store className="w-8 h-8" />}
                actionLabel={isAdmin ? 'Register New Shop' : undefined}
                onAction={isAdmin ? () => setIsShopModalOpen(true) : undefined}
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#3b82f6]/15">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#06151D] border-b border-[#3b82f6]/15 text-[#91A9B7] uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Fair Price Shop ID</th>
                      <th className="py-3 px-4">Shop Name & Outlet</th>
                      <th className="py-3 px-4">Assigned Dealer / Operator</th>
                      <th className="py-3 px-4">Dealer Login Email</th>
                      <th className="py-3 px-4">District / State</th>
                      <th className="py-3 px-4">Beneficiaries</th>
                      <th className="py-3 px-4">Monthly Quota (Kg)</th>
                      <th className="py-3 px-4">Arkiv Key</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3b82f6]/10">
                    {visibleShops.map((s, idx) => (
                      <tr
                        key={s.entityKey ? `${s.shopId}-${s.entityKey}` : `${s.shopId || s.id}-${idx}`}
                        className="hover:bg-[#071B25]/80 transition-colors group"
                      >
                        {/* Shop ID */}
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/shops/${s.shopId}`}
                            className="text-[#3b82f6] hover:text-[#60a5fa] font-bold hover:underline inline-flex items-center gap-1.5 font-mono"
                          >
                            <span>{s.shopId}</span>
                            <History className="w-3 h-3 text-[#60a5fa]" />
                          </Link>
                          <div className="flex items-center gap-1 text-[10px] text-[#36D399] mt-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active Outlet</span>
                          </div>
                        </td>

                        {/* Shop Name & Address */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#F1F8FC] max-w-[200px] truncate" title={s.name}>
                            {s.name}
                          </div>
                          <div className="text-[11px] text-[#607987] flex items-center gap-1 mt-0.5 truncate max-w-[200px]" title={s.address}>
                            <MapPin className="w-3 h-3 text-[#607987] shrink-0" />
                            <span>{s.address}</span>
                          </div>
                        </td>

                        {/* Assigned Dealer */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#F1F8FC]">{s.operatorName}</div>
                          <div className="text-[10px] text-[#91A9B7]">Authorized Dealer</div>
                        </td>

                        {/* Dealer Login Email */}
                        <td className="py-3.5 px-4">
                          {s.operatorEmail ? (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-[#3b82f6] shrink-0" />
                              <a
                                href={`mailto:${s.operatorEmail}`}
                                className="font-mono text-xs text-[#60a5fa] hover:underline"
                                title={`Dealer Login Email: ${s.operatorEmail}`}
                              >
                                {s.operatorEmail}
                              </a>
                              <CopyButton textToCopy={s.operatorEmail} />
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#607987] italic">Not Configured</span>
                          )}
                        </td>

                        {/* District / State */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#F1F8FC]">{s.district}</div>
                          <div className="text-[10px] text-[#607987]">{s.state}</div>
                        </td>

                        {/* Beneficiaries */}
                        <td className="py-3.5 px-4 font-mono font-semibold text-[#F1F8FC]">
                          <span className="px-2 py-0.5 rounded bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/20">
                            {s.allocatedBeneficiaries.toLocaleString()}
                          </span>
                        </td>

                        {/* Monthly Quota */}
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <div className="space-y-0.5">
                            <span className="text-[#F1F8FC] block">
                              Wheat: <strong>{s.monthlyQuotaKg?.wheat || 0} kg</strong>
                            </span>
                            <span className="text-[#91A9B7] block">
                              Rice: <strong>{s.monthlyQuotaKg?.rice || 0} kg</strong>
                            </span>
                          </div>
                        </td>

                        {/* Arkiv Key */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-[#91A9B7]">
                              {shortenIdentifier(s.entityKey, 4)}
                            </span>
                            <CopyButton textToCopy={s.entityKey} />
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/shops/${s.shopId}`}
                              className="px-2 py-1 text-xs font-semibold bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 text-[#60a5fa] rounded border border-[#3b82f6]/30 inline-flex items-center gap-1"
                              title="Inspect full audit timeline"
                            >
                              <span>Timeline</span>
                              <History className="w-3 h-3" />
                            </Link>
                            <Link
                              href={`/records/${encodeURIComponent(s.entityKey)}`}
                              className="p-1 text-[#91A9B7] hover:text-[#60a5fa] hover:bg-[#3b82f6]/10 rounded"
                              title="View on-chain proof record"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* TAB 2: Delivery Receipts Table */}
        {activeTab === 'receipts' && (
          <Card>
            {loadingReceipts ? (
              <LoadingSkeleton rows={5} />
            ) : visibleReceipts.length === 0 ? (
              <EmptyState
                title="No Shop Receipts Found"
                description="No shop delivery receipts match your active query. Record a new shop arrival using the button above."
                icon={<PackageCheck className="w-8 h-8" />}
                actionLabel="Acknowledge Receipt"
                onAction={() => setIsReceiptModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#3b82f6]/15">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#06151D] border-b border-[#3b82f6]/15 text-[#91A9B7] uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Fair Price Shop</th>
                      <th className="py-3 px-4">Delivery Consignment</th>
                      <th className="py-3 px-4">Commodity</th>
                      <th className="py-3 px-4">Received Wt</th>
                      <th className="py-3 px-4">Dispatched Wt</th>
                      <th className="py-3 px-4">Condition</th>
                      <th className="py-3 px-4">Received Time</th>
                      <th className="py-3 px-4">Reconciliation</th>
                      <th className="py-3 px-4">Arkiv Key</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3b82f6]/10">
                    {visibleReceipts.map((rcpt) => (
                      <tr
                        key={rcpt.id}
                        className="hover:bg-[#071B25]/80 transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/shops/${rcpt.shopId}`}
                            className="text-[#3b82f6] hover:text-[#60a5fa] font-bold hover:underline inline-flex items-center gap-1 font-mono"
                          >
                            <span>{rcpt.shopId}</span>
                            <History className="w-3 h-3 text-[#60a5fa]" />
                          </Link>
                          <div className="text-[11px] text-[#607987]">
                            {rcpt.shopName || rcpt.district}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-[#60a5fa]">
                          {rcpt.deliveryId}
                          {rcpt.challanReference && (
                            <div className="text-[10px] text-[#607987]">
                              Ref: {rcpt.challanReference}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#F1F8FC]">
                          {rcpt.commodity}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#F1F8FC]">
                          {formatSimpleKg(rcpt.receivedQuantityKg)}
                        </td>
                        <td className="py-3.5 px-4 text-[#91A9B7]">
                          {rcpt.dispatchedQuantityKg
                            ? formatSimpleKg(rcpt.dispatchedQuantityKg)
                            : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              rcpt.conditionStatus === 'Good'
                                ? 'bg-[#36D399]/10 text-[#36D399] border border-[#36D399]/20'
                                : 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/20'
                            }`}
                          >
                            {rcpt.conditionStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#91A9B7]">
                          {formatDate(rcpt.receivedTimestamp)}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={rcpt.reconciliationStatus} size="sm" />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-[#91A9B7]">
                              {shortenIdentifier(rcpt.entityKey, 4)}
                            </span>
                            <CopyButton textToCopy={rcpt.entityKey} />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/shops/${rcpt.shopId}`}
                              className="p-1 text-[#91A9B7] hover:text-[#60a5fa] hover:bg-[#3b82f6]/10 rounded"
                              title="View shop full timeline"
                            >
                              <History className="w-3.5 h-3.5" />
                            </Link>
                            <Link
                              href={`/records/${encodeURIComponent(rcpt.entityKey)}`}
                              className="inline-flex items-center gap-0.5 text-xs text-[#3b82f6] hover:text-[#60a5fa] hover:underline"
                            >
                              <span>Proof</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Acknowledge Receipt Modal */}
        <Modal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          title="Acknowledge Fair Price Shop Receipt"
          subtitle="Record arrival scale weight and anchor delivery challan verification on Arkiv"
          maxWidth="lg"
        >
          <ReceiptForm
            onSuccess={() => {
              setIsReceiptModalOpen(false);
              loadReceipts();
            }}
            onCancel={() => setIsReceiptModalOpen(false)}
          />
        </Modal>

        {/* Register Shop Modal (Admin Only) */}
        <Modal
          isOpen={isShopModalOpen}
          onClose={() => setIsShopModalOpen(false)}
          title="Register Fair Price Shop on Arkiv"
          subtitle="Authorize a new ration shop entity and anchor allocation quotas on Arkiv Tiramisu"
          maxWidth="xl"
        >
          <ShopForm
            onSuccess={() => {
              setIsShopModalOpen(false);
              loadShops();
            }}
            onCancel={() => setIsShopModalOpen(false)}
          />
        </Modal>
      </RoleGuard>
    </AppShell>
  );
}
