'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CopyButton } from '@/components/ui/CopyButton';
import { Modal } from '@/components/ui/Modal';
import { StockReportForm } from '@/components/forms/StockReportForm';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useUserRole } from '@/lib/auth';
import { StockReport } from '@/types/api';
import { formatSimpleKg, formatDate, shortenIdentifier } from '@/lib/formatters';
import {
  Warehouse,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  RefreshCw,
  Calculator,
  HelpCircle,
  Store,
} from 'lucide-react';

export default function StockReportsPage() {
  const { role, shopId, isAdmin, isOperator } = useUserRole();
  const [reports, setReports] = useState<StockReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getStockReports({
        search,
        district: districtFilter,
        period: periodFilter,
      });
      setReports(data);
    } catch (err) {
      console.error('Failed to load stock reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, districtFilter, periodFilter]);

  const visibleReports = isOperator && shopId
    ? reports.filter((r) => r.shopId.toUpperCase() === shopId.toUpperCase())
    : reports;

  return (
    <AppShell onRefresh={loadData}>
      <RoleGuard allowedRoles={['admin', 'operator']}>
        {/* Operator scope notification banner */}
        {isOperator && (
          <div className="mb-4 p-3 rounded-xl bg-[#2563eb]/15 border border-[#3b82f6]/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#3b82f6]" />
              <span className="text-[#F1F8FC]">
                Dealer Scoped: Displaying monthly stock declarations for Fair Price Shop <strong className="text-[#60a5fa] font-mono">{shopId || 'Assigned Shop'}</strong>
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#3b82f6]/15 text-[#60a5fa] border border-[#3b82f6]/30 font-bold">
              Shop Scope
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#F1F8FC]">
                Inventory & <span className="text-[#3b82f6]">Stock Reports</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#3b82f6]/15 text-[#60a5fa] border border-[#3b82f6]/30">
                {visibleReports.length} Declarations
              </span>
            </div>
            <p className="text-xs text-[#91A9B7] mt-1">
              Compare reported shop closing stock against expected balance calculated as Opening + Receipts − Quota Distributed.
            </p>
          </div>

          {isOperator && (
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Submit Stock Report
            </Button>
          )}
        </div>

      {/* Reconciliation Formula Banner */}
      <div className="p-4 rounded-xl glass-panel border border-[#3b82f6]/20 flex items-start gap-3 text-xs text-[#91A9B7]">
        <div className="p-2 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/30 shrink-0">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[#F1F8FC]">
            Authoritative Inventory Reconciliation Formula
          </h4>
          <p className="mt-1 leading-relaxed">
            <code className="text-[#60a5fa] font-mono bg-[#06151D] px-2 py-0.5 rounded border border-[#3b82f6]/20">
              Expected Closing Stock = Opening Stock + Weighed Receipts − Distributed Quota
            </code>
          </p>
          <p className="text-[11px] text-[#607987] mt-1">
            When delivery receipts are missing or unverified, the system marks reconciliation as{' '}
            <span className="text-[#FBBF24] font-semibold">Insufficient Data</span> rather than assuming zero.
          </p>
        </div>
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
              placeholder="Search by shop ID or shop name..."
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

      {/* Stock Reports Table */}
      <Card>
        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : visibleReports.length === 0 ? (
          <EmptyState
            title="No Stock Declarations Found"
            description="No inventory declarations match your active filter. Submit a monthly distribution declaration to begin."
            icon={<Warehouse className="w-8 h-8" />}
            actionLabel="Submit Stock Report"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#3b82f6]/15">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#06151D] border-b border-[#3b82f6]/15 text-[#91A9B7] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Fair Price Shop</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Commodity</th>
                  <th className="py-3 px-4">Opening</th>
                  <th className="py-3 px-4">Receipts</th>
                  <th className="py-3 px-4">Distributed</th>
                  <th className="py-3 px-4">Reported Closing</th>
                  <th className="py-3 px-4">Expected Closing</th>
                  <th className="py-3 px-4">Variance</th>
                  <th className="py-3 px-4">Reconciliation</th>
                  <th className="py-3 px-4 text-right">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3b82f6]/10">
                {visibleReports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-[#071B25]/80 transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/shops/${report.shopId}`}
                        className="text-[#3b82f6] hover:text-[#60a5fa] font-bold hover:underline font-mono"
                      >
                        {report.shopId}
                      </Link>
                      <div className="text-[11px] text-[#607987]">
                        {report.shopName || report.district}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#91A9B7] font-medium">
                      {report.reportingPeriod}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#F1F8FC]">
                      {report.commodity}
                    </td>
                    <td className="py-3.5 px-4 text-[#91A9B7]">
                      {formatSimpleKg(report.openingStockKg)}
                    </td>
                    <td className="py-3.5 px-4 text-[#F1F8FC] font-medium">
                      {report.receivedQuantityKg !== undefined ? (
                        formatSimpleKg(report.receivedQuantityKg)
                      ) : (
                        <span className="text-[#FBBF24] inline-flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" />
                          <span>Missing</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#91A9B7]">
                      {formatSimpleKg(report.distributedQuantityKg)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#60a5fa]">
                      {formatSimpleKg(report.reportedClosingStockKg)}
                    </td>
                    <td className="py-3.5 px-4 text-[#F1F8FC]">
                      {report.expectedClosingStockKg !== undefined ? (
                        formatSimpleKg(report.expectedClosingStockKg)
                      ) : (
                        <span className="text-[#607987]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      {report.differenceKg !== undefined ? (
                        report.differenceKg === 0 ? (
                          <span className="text-[#36D399]">0 kg (Exact)</span>
                        ) : (
                          <span className="text-[#FB7185]">
                            {report.differenceKg > 0 ? `+${report.differenceKg}` : report.differenceKg} kg
                          </span>
                        )
                      ) : (
                        <span className="text-[#FBBF24]">Uncalculated</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={report.reconciliationStatus} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/records/${encodeURIComponent(report.entityKey)}`}
                        className="inline-flex items-center gap-1 text-xs text-[#3b82f6] hover:text-[#60a5fa] hover:underline"
                      >
                        <span>Proof</span>
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

      {/* Submit Stock Report Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Submit Fair Price Shop Stock Declaration"
        subtitle="Anchor physical inventory count and community distribution quota on Arkiv"
        maxWidth="lg"
      >
        <StockReportForm
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
