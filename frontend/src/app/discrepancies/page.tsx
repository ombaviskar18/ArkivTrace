'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { Modal } from '@/components/ui/Modal';
import { DiscrepancyForm } from '@/components/forms/DiscrepancyForm';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useUserRole } from '@/lib/auth';
import { Discrepancy } from '@/types/api';
import { formatSimpleKg, formatDate, shortenIdentifier } from '@/lib/formatters';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ArrowRight,
  Scale,
  Store,
} from 'lucide-react';

export default function DiscrepanciesPage() {
  const { role, shopId, isAdmin, isOperator } = useUserRole();
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Discrepancy | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getDiscrepancies({
        search,
        category: categoryFilter,
        status: statusFilter,
      });
      setDiscrepancies(data);
    } catch (err) {
      console.error('Failed to load discrepancies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, categoryFilter, statusFilter]);

  const visibleDiscrepancies = isOperator && shopId
    ? discrepancies.filter((d) => !d.shopId || d.shopId.toUpperCase() === shopId.toUpperCase())
    : discrepancies;

  const totalCases = visibleDiscrepancies.length;
  const openCases = visibleDiscrepancies.filter((d) => d.status === 'Open').length;
  const underInvestigation = visibleDiscrepancies.filter((d) => d.status === 'Under Investigation').length;
  const resolvedCases = visibleDiscrepancies.filter((d) => d.status === 'Resolved').length;

  return (
    <AppShell onRefresh={loadData}>
      <RoleGuard allowedRoles={['admin', 'operator', 'public']}>
        {/* Operator scope notification banner */}
        {isOperator && (
          <div className="mb-4 p-3 rounded-xl bg-[#087DEB]/15 border border-[#00C8FF]/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#00C8FF]" />
              <span className="text-[#F1F8FC]">
                Dealer Scoped: Displaying audit cases involving Fair Price Shop <strong className="text-[#55E5FF] font-mono">{shopId || 'Assigned Shop'}</strong>
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
              Discrepancy <span className="text-[#FB7185]">Investigation</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FB7185]/15 text-[#FB7185] border border-[#FB7185]/30">
              {totalCases} Audit Tickets
            </span>
          </div>
          <p className="text-xs text-[#91A9B7] mt-1">
            Reconcile physical grain mismatches between depot dispatches and shop receipts without personal identity data.
          </p>
        </div>

        <Button
          variant="danger"
          onClick={() => setIsModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Flag Discrepancy
        </Button>
      </div>

      {/* Case Metrics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl glass-panel border border-[#00C8FF]/20">
          <span className="text-[11px] font-semibold text-[#91A9B7] uppercase tracking-wider">
            Total Cases
          </span>
          <div className="text-2xl font-bold text-[#F1F8FC] mt-1">
            {totalCases}
          </div>
          <span className="text-[10px] text-[#607987]">Historical flagged audits</span>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-[#FB7185]/30 bg-[#FB7185]/5">
          <span className="text-[11px] font-semibold text-[#FB7185] uppercase tracking-wider">
            Open Mismatches
          </span>
          <div className="text-2xl font-bold text-[#FB7185] mt-1">
            {openCases}
          </div>
          <span className="text-[10px] text-[#FB7185]/80">Awaiting field inspection</span>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-[#FBBF24]/30 bg-[#FBBF24]/5">
          <span className="text-[11px] font-semibold text-[#FBBF24] uppercase tracking-wider">
            Under Investigation
          </span>
          <div className="text-2xl font-bold text-[#FBBF24] mt-1">
            {underInvestigation}
          </div>
          <span className="text-[10px] text-[#FBBF24]/80">Weighbridge logs requested</span>
        </div>

        <div className="p-4 rounded-xl glass-panel border border-[#36D399]/30 bg-[#36D399]/5">
          <span className="text-[11px] font-semibold text-[#36D399] uppercase tracking-wider">
            Resolved Audits
          </span>
          <div className="text-2xl font-bold text-[#36D399] mt-1">
            {resolvedCases}
          </div>
          <span className="text-[10px] text-[#36D399]/80">Calibrated & cleared</span>
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
              placeholder="Search by Case ID, delivery ID, or shop ID..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] placeholder-[#607987] focus:border-[#00C8FF] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#91A9B7]">
              <Filter className="w-3.5 h-3.5 text-[#00C8FF]" />
              <span>Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none"
              >
                <option value="All">All Categories</option>
                <option value="Transit Loss">Transit Loss</option>
                <option value="Weighing Discrepancy">Weighing Discrepancy</option>
                <option value="Stock Mismatch">Stock Mismatch</option>
                <option value="Delayed Receipt">Delayed Receipt</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#91A9B7]">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Under Investigation">Under Investigation</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <Button variant="ghost" size="sm" onClick={loadData}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Discrepancies Table */}
      <Card>
        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : visibleDiscrepancies.length === 0 ? (
          <EmptyState
            title="No Discrepancies Logged"
            description="No active discrepancies match your criteria. All grain movements currently match recorded declarations."
            icon={<ShieldAlert className="w-8 h-8 text-[#36D399]" />}
            actionLabel="Flag Discrepancy"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#00C8FF]/15">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#06151D] border-b border-[#00C8FF]/15 text-[#91A9B7] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Case ID</th>
                  <th className="py-3 px-4">Entity Reference</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Dispatched vs Received Comparison</th>
                  <th className="py-3 px-4">Variance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reported Time</th>
                  <th className="py-3 px-4 text-right">Case Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#00C8FF]/10">
                {visibleDiscrepancies.map((disc) => (
                  <tr
                    key={disc.id}
                    className="hover:bg-[#071B25]/80 transition-colors group cursor-pointer"
                    onClick={() => setSelectedCase(disc)}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[#FB7185]">
                      {disc.caseId}
                    </td>
                    <td className="py-3.5 px-4">
                      {disc.relatedDeliveryId && (
                        <div className="font-mono text-[#55E5FF] font-semibold">
                          {disc.relatedDeliveryId}
                        </div>
                      )}
                      <div className="text-[11px] text-[#91A9B7]">
                        {disc.shopId ? `Shop: ${disc.shopId}` : disc.district}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#071B25] border border-[#00C8FF]/20 text-[#91A9B7]">
                        {disc.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {disc.dispatchedQuantityKg && disc.receivedQuantityKg ? (
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-[#91A9B7]">
                            Disp: <strong className="text-[#F1F8FC]">{disc.dispatchedQuantityKg.toLocaleString()}</strong> kg
                          </span>
                          <span className="text-[#607987]">→</span>
                          <span className="text-[#91A9B7]">
                            Rcpt: <strong className="text-[#55E5FF]">{disc.receivedQuantityKg.toLocaleString()}</strong> kg
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#91A9B7] line-clamp-1 max-w-xs">
                          {disc.description}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#FB7185]">
                      {disc.quantityDifferenceKg > 0 ? `+${disc.quantityDifferenceKg}` : disc.quantityDifferenceKg} kg
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase ${
                          disc.status === 'Resolved'
                            ? 'bg-[#36D399]/15 text-[#36D399] border border-[#36D399]/30'
                            : disc.status === 'Under Investigation'
                            ? 'bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30'
                            : 'bg-[#FB7185]/15 text-[#FB7185] border border-[#FB7185]/30'
                        }`}
                      >
                        {disc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#91A9B7]">
                      {formatDate(disc.reportedAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCase(disc);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-[#00C8FF] hover:text-[#55E5FF] hover:underline"
                      >
                        <span>Investigate</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Case Detail Inspection Modal */}
      {selectedCase && (
        <Modal
          isOpen={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          title={`Investigation Audit: ${selectedCase.caseId}`}
          subtitle={`Audit category: ${selectedCase.category}`}
          maxWidth="xl"
        >
          <div className="space-y-4">
            {/* Visual Side-by-Side Comparison Box */}
            <div className="p-4 rounded-xl bg-[#06151D] border border-[#FB7185]/30">
              <span className="text-xs font-semibold text-[#91A9B7] uppercase tracking-wider block mb-2">
                Reconciliation Comparison
              </span>

              <div className="grid grid-cols-3 gap-2 text-center py-2">
                <div className="p-3 rounded-lg bg-[#071B25] border border-[#00C8FF]/20">
                  <div className="text-[11px] text-[#91A9B7]">Dispatched Weight</div>
                  <div className="text-base font-bold text-[#F1F8FC] mt-1">
                    {selectedCase.dispatchedQuantityKg
                      ? formatSimpleKg(selectedCase.dispatchedQuantityKg)
                      : 'N/A'}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#071B25] border border-[#00C8FF]/20">
                  <div className="text-[11px] text-[#91A9B7]">Shop Weighed</div>
                  <div className="text-base font-bold text-[#55E5FF] mt-1">
                    {selectedCase.receivedQuantityKg
                      ? formatSimpleKg(selectedCase.receivedQuantityKg)
                      : 'N/A'}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#FB7185]/10 border border-[#FB7185]/30">
                  <div className="text-[11px] text-[#FB7185] font-semibold">Variance</div>
                  <div className="text-base font-extrabold text-[#FB7185] mt-1">
                    {selectedCase.quantityDifferenceKg > 0 ? `+${selectedCase.quantityDifferenceKg}` : selectedCase.quantityDifferenceKg} kg
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-[#91A9B7] mt-2 italic">
                * Note: A quantity variance warrants administrative and weighbridge verification. It does not automatically assert theft or fraud.
              </p>
            </div>

            {/* Description Narrative */}
            <div>
              <span className="text-xs font-semibold text-[#91A9B7] block mb-1">
                Factual Narrative
              </span>
              <p className="p-3 rounded-lg bg-[#06151D] border border-[#00C8FF]/20 text-xs text-[#F1F8FC] leading-relaxed">
                {selectedCase.description}
              </p>
            </div>

            {/* Field Notes */}
            {selectedCase.investigationNotes && (
              <div>
                <span className="text-xs font-semibold text-[#91A9B7] block mb-1">
                  Investigation & Calibration Logs
                </span>
                <p className="p-3 rounded-lg bg-[#06151D] border border-[#36D399]/20 text-xs text-[#36D399] leading-relaxed">
                  {selectedCase.investigationNotes}
                </p>
              </div>
            )}

            {/* Cryptographic Key */}
            <div>
              <span className="text-xs font-semibold text-[#91A9B7] block mb-1">
                Arkiv Immutable Entity Key
              </span>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#06151D] border border-[#00C8FF]/20">
                <span className="font-mono text-xs text-[#55E5FF] break-all flex-1">
                  {selectedCase.entityKey}
                </span>
                <CopyButton textToCopy={selectedCase.entityKey} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#00C8FF]/15">
              <Link
                href={`/records/${encodeURIComponent(selectedCase.entityKey)}`}
                className="text-xs text-[#00C8FF] hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>View Full On-Chain Payload</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Button variant="secondary" size="sm" onClick={() => setSelectedCase(null)}>
                Close Audit View
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Flag Discrepancy Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Flag Supply-Chain Discrepancy"
        subtitle="Report transit loss, tare scale variance, or stock declaration mismatch for audit"
        maxWidth="lg"
      >
        <DiscrepancyForm
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
