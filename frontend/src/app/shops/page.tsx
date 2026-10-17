'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CopyButton } from '@/components/ui/CopyButton';
import { Modal } from '@/components/ui/Modal';
import { ReceiptForm } from '@/components/forms/ReceiptForm';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useUserRole } from '@/lib/auth';
import { ShopReceipt } from '@/types/api';
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
} from 'lucide-react';

export default function ShopReceiptsPage() {
  const { role, shopId, isAdmin, isOperator } = useUserRole();
  const [receipts, setReceipts] = useState<ShopReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getReceipts({
        search,
        district: districtFilter,
        period: periodFilter,
      });
      setReceipts(data);
    } catch (err) {
      console.error('Failed to load shop receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, districtFilter, periodFilter]);

  const visibleReceipts = isOperator && shopId
    ? receipts.filter((r) => r.shopId.toUpperCase() === shopId.toUpperCase())
    : receipts;

  return (
    <AppShell onRefresh={loadData}>
      <RoleGuard allowedRoles={['admin', 'operator']}>
        {/* Operator scope notification banner */}
        {isOperator && (
          <div className="mb-4 p-3 rounded-xl bg-[#087DEB]/15 border border-[#00C8FF]/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#00C8FF]" />
              <span className="text-[#F1F8FC]">
                Dealer Scoped: Displaying receipts acknowledged for Fair Price Shop <strong className="text-[#55E5FF] font-mono">{shopId || 'Assigned Shop'}</strong>
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#00C8FF]/15 text-[#55E5FF] border border-[#00C8FF]/30 font-bold">
              Shop Scope
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#F1F8FC]">
                Shop <span className="text-[#00C8FF]">Receipts</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#36D399]/15 text-[#36D399] border border-[#36D399]/30">
                {visibleReceipts.length} Acknowledged Deliveries
              </span>
            </div>
            <p className="text-xs text-[#91A9B7] mt-1">
              Inspect recorded deliveries received by fair-price shops and reconciled against depot dispatches.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Acknowledge Receipt
          </Button>
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
              placeholder="Search by shop ID, delivery ID, or shop name..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] placeholder-[#607987] focus:border-[#00C8FF] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#91A9B7]">
              <Filter className="w-3.5 h-3.5 text-[#00C8FF]" />
              <span>District:</span>
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none"
              >
                <option value="All">All Districts</option>
                <option value="Raigad">Raigad</option>
                <option value="Pune Central">Pune Central</option>
                <option value="Nashik North">Nashik North</option>
                <option value="Thane Rural">Thane Rural</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#91A9B7]">
              <span>Period:</span>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none"
              >
                <option value="All">All Cycles</option>
                <option value="October 2026">October 2026</option>
                <option value="September 2026">September 2026</option>
              </select>
            </div>

            <Button variant="ghost" size="sm" onClick={loadData}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Receipts Table */}
      <Card>
        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : visibleReceipts.length === 0 ? (
          <EmptyState
            title="No Shop Receipts Found"
            description="No shop delivery receipts match your active query. Record a new shop arrival using the button above."
            icon={<PackageCheck className="w-8 h-8" />}
            actionLabel="Acknowledge Receipt"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#00C8FF]/15">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#06151D] border-b border-[#00C8FF]/15 text-[#91A9B7] uppercase tracking-wider font-semibold">
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
              <tbody className="divide-y divide-[#00C8FF]/10">
                {visibleReceipts.map((rcpt) => (
                  <tr
                    key={rcpt.id}
                    className="hover:bg-[#071B25]/80 transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/shops/${rcpt.shopId}`}
                        className="text-[#00C8FF] hover:text-[#55E5FF] font-bold hover:underline inline-flex items-center gap-1 font-mono"
                      >
                        <span>{rcpt.shopId}</span>
                        <History className="w-3 h-3 text-[#55E5FF]" />
                      </Link>
                      <div className="text-[11px] text-[#607987]">
                        {rcpt.shopName || rcpt.district}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#55E5FF]">
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
                          className="p-1 text-[#91A9B7] hover:text-[#55E5FF] hover:bg-[#00C8FF]/10 rounded"
                          title="View shop full timeline"
                        >
                          <History className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/records/${encodeURIComponent(rcpt.entityKey)}`}
                          className="inline-flex items-center gap-0.5 text-xs text-[#00C8FF] hover:text-[#55E5FF] hover:underline"
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

      {/* Acknowledge Receipt Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Acknowledge Fair Price Shop Receipt"
        subtitle="Record arrival scale weight and anchor delivery challan verification on Arkiv"
        maxWidth="lg"
      >
        <ReceiptForm
          onSuccess={() => {
            setIsModalOpen(false);
            loadData();
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
      </RoleGuard>
    </AppShell>
  );
}
