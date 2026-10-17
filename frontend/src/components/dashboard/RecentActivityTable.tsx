'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DepotDispatch, ShopReceipt } from '@/types/api';
import { StatusBadge } from '../ui/StatusBadge';
import { CopyButton } from '../ui/CopyButton';
import { formatSimpleKg, formatDate, shortenIdentifier } from '@/lib/formatters';
import { ArrowUpRight, Search, Filter, Truck, PackageCheck } from 'lucide-react';

interface RecentActivityTableProps {
  dispatches: DepotDispatch[];
  receipts: ShopReceipt[];
}

export const RecentActivityTable: React.FC<RecentActivityTableProps> = ({
  dispatches,
  receipts,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DISPATCH' | 'RECEIPT'>('ALL');

  // Combine activity rows
  const combined = [
    ...dispatches.slice(0, 5).map((d) => ({
      id: d.id,
      recordId: d.deliveryId,
      type: 'Depot Dispatch' as const,
      facility: `${d.depotId} → ${d.destinationShopId}`,
      quantity: d.quantityKg,
      date: d.dispatchTimestamp,
      status: d.reconciliationStatus,
      entityKey: d.entityKey,
      shopId: d.destinationShopId,
    })),
    ...receipts.slice(0, 5).map((r) => ({
      id: r.id,
      recordId: r.deliveryId,
      type: 'Shop Receipt' as const,
      facility: `${r.shopId} (${r.district})`,
      quantity: r.receivedQuantityKg,
      date: r.receivedTimestamp,
      status: r.reconciliationStatus,
      entityKey: r.entityKey,
      shopId: r.shopId,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = combined.filter((item) => {
    const matchesSearch =
      item.recordId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.facility.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      typeFilter === 'ALL' ||
      (typeFilter === 'DISPATCH' && item.type === 'Depot Dispatch') ||
      (typeFilter === 'RECEIPT' && item.type === 'Shop Receipt');
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-[#607987] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter records or facility..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] placeholder-[#607987] focus:border-[#00C8FF] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-[#607987] mr-1" />
          {(['ALL', 'DISPATCH', 'RECEIPT'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTypeFilter(filter)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                typeFilter === filter
                  ? 'bg-[#00C8FF]/20 text-[#55E5FF] border border-[#00C8FF]/40'
                  : 'text-[#91A9B7] hover:text-[#F1F8FC] hover:bg-[#071B25]'
              }`}
            >
              {filter === 'ALL'
                ? 'All'
                : filter === 'DISPATCH'
                ? 'Dispatches'
                : 'Receipts'}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-[#00C8FF]/15">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#06151D] border-b border-[#00C8FF]/15 text-[#91A9B7] uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Record ID</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Depot / Shop</th>
              <th className="py-3 px-4">Quantity</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Reconciliation</th>
              <th className="py-3 px-4">Arkiv Key</th>
              <th className="py-3 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#00C8FF]/10">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[#91A9B7]">
                  No matching supply-chain activity found.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={`${item.type}-${item.id}`}
                  className="hover:bg-[#071B25]/80 transition-colors group"
                >
                  <td className="py-3 px-4 font-mono font-semibold text-[#55E5FF]">
                    {item.recordId}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-[#91A9B7]">
                      {item.type === 'Depot Dispatch' ? (
                        <Truck className="w-3.5 h-3.5 text-[#00C8FF]" />
                      ) : (
                        <PackageCheck className="w-3.5 h-3.5 text-[#36D399]" />
                      )}
                      <span>{item.type}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#F1F8FC] font-medium">
                    {item.facility}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#F1F8FC]">
                    {formatSimpleKg(item.quantity)}
                  </td>
                  <td className="py-3 px-4 text-[#607987]">
                    {formatDate(item.date)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={item.status} size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-[#91A9B7]">
                        {shortenIdentifier(item.entityKey, 4)}
                      </span>
                      <CopyButton textToCopy={item.entityKey} />
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/records/${encodeURIComponent(item.entityKey)}`}
                      className="inline-flex items-center gap-1 text-xs text-[#00C8FF] hover:text-[#55E5FF] hover:underline"
                    >
                      <span>Detail</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
