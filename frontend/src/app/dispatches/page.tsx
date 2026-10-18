'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, VerificationBadge } from '@/components/ui/StatusBadge';
import { CopyButton } from '@/components/ui/CopyButton';
import { Modal } from '@/components/ui/Modal';
import { DispatchForm } from '@/components/forms/DispatchForm';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useUserRole } from '@/lib/auth';
import { DepotDispatch } from '@/types/api';
import { formatSimpleKg, formatDate, shortenIdentifier } from '@/lib/formatters';
import {
  Truck,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  Shield,
  Store,
} from 'lucide-react';

export default function DispatchesPage() {
  const { role, shopId, isAdmin, isOperator } = useUserRole();
  const [dispatches, setDispatches] = useState<DepotDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getDispatches({
        search,
        district: districtFilter,
        period: periodFilter,
      });
      setDispatches(data);
    } catch (err) {
      console.error('Failed to load dispatches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, districtFilter, periodFilter]);

  const visibleDispatches = isOperator && shopId
    ? dispatches.filter((d) => d.destinationShopId.toUpperCase() === shopId.toUpperCase())
    : dispatches;

  return (
    <AppShell onRefresh={loadData}>
      <RoleGuard allowedRoles={['admin', 'operator']}>
        {/* Operator scope notification banner */}
        {isOperator && (
          <div className="mb-4 p-3 rounded-xl bg-[#2563eb]/15 border border-[#3b82f6]/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#3b82f6]" />
              <span className="text-[#F1F8FC]">
                Dealer Filter: Displaying incoming consignments for Fair Price Shop <strong className="text-[#60a5fa] font-mono">{shopId || 'Assigned Shop'}</strong>
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#3b82f6]/15 text-[#60a5fa] border border-[#3b82f6]/30 font-bold">
              Operator View
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#F1F8FC]">
                Depot <span className="text-[#3b82f6]">Dispatches</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#3b82f6]/15 text-[#60a5fa] border border-[#3b82f6]/30">
                {visibleDispatches.length} Consignments
              </span>
            </div>
            <p className="text-xs text-[#91A9B7] mt-1">
              Track grain consignments leaving FCI and state warehouses and follow their associated cryptographic proof.
            </p>
          </div>

          {isAdmin ? (
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Create Dispatch
            </Button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#06151D] border border-[#3b82f6]/20 text-xs text-[#91A9B7]">
              <Shield className="w-3.5 h-3.5 text-[#3b82f6]" />
              <span>Officer Authority Required for Outbound Dispatches</span>
            </div>
          )}
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
              placeholder="Search by delivery ID, depot ID, shop ID, or depot name..."
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
                className="px-2.5 py-1.5 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none"
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

      {/* Dispatches Table */}
      <Card>
        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : visibleDispatches.length === 0 ? (
          <EmptyState
            title="No Depot Dispatches Found"
            description="No consignment records match your active search or district filters. Create a new dispatch record to populate this view."
            icon={<Truck className="w-8 h-8" />}
            actionLabel={isAdmin ? "Create Dispatch" : undefined}
            onAction={isAdmin ? () => setIsModalOpen(true) : undefined}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#3b82f6]/15">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#06151D] border-b border-[#3b82f6]/15 text-[#91A9B7] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Delivery ID</th>
                  <th className="py-3 px-4">Depot Origin</th>
                  <th className="py-3 px-4">Dest. Shop</th>
                  <th className="py-3 px-4">Commodity</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Dispatched At</th>
                  <th className="py-3 px-4">Seal & Truck</th>
                  <th className="py-3 px-4">Reconciliation</th>
                  <th className="py-3 px-4">Arkiv Key</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3b82f6]/10">
                {visibleDispatches.map((disp) => (
                  <tr
                    key={disp.id}
                    className="hover:bg-[#071B25]/80 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[#60a5fa]">
                      {disp.deliveryId}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#F1F8FC]">
                        {disp.depotId}
                      </div>
                      <div className="text-[11px] text-[#607987] truncate max-w-[140px]">
                        {disp.depotName || disp.district}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/shops/${disp.destinationShopId}`}
                        className="text-[#3b82f6] hover:text-[#60a5fa] font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        <span>{disp.destinationShopId}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      <div className="text-[11px] text-[#607987]">
                        {disp.district}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#F1F8FC]">
                      {disp.commodity}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#F1F8FC]">
                      {formatSimpleKg(disp.quantityKg)}
                    </td>
                    <td className="py-3.5 px-4 text-[#91A9B7]">
                      {formatDate(disp.dispatchTimestamp)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] font-mono text-[#F1F8FC]">
                        {disp.truckNumber || '—'}
                      </div>
                      <div className="text-[10px] font-mono text-[#3b82f6]/80">
                        {disp.sealNumber || '—'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={disp.reconciliationStatus} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-[#91A9B7]">
                          {shortenIdentifier(disp.entityKey, 4)}
                        </span>
                        <CopyButton textToCopy={disp.entityKey} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/records/${encodeURIComponent(disp.entityKey)}`}
                        className="inline-flex items-center gap-1 text-xs text-[#3b82f6] hover:text-[#60a5fa] hover:underline"
                      >
                        <span>Evidence</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Dispatch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Depot Dispatch Consignment"
        subtitle="Anchor physical grain departure and issue security seal verification on Arkiv"
        maxWidth="lg"
      >
        <DispatchForm
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
