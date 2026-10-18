'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { VerificationBadge } from '@/components/ui/StatusBadge';
import { CopyButton } from '@/components/ui/CopyButton';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { ArkivRecord } from '@/types/api';
import { formatDate, formatSimpleKg, shortenIdentifier } from '@/lib/formatters';
import {
  ShieldCheck,
  Search,
  Filter,
  ArrowUpRight,
  RefreshCw,
  Layers,
  Database,
  Link as LinkIcon,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

function EvidenceExplorerContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [records, setRecords] = useState<ArkivRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState('All');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getEvidenceRecords({
        search,
        recordType: typeFilter,
      });
      setRecords(data);
    } catch (err) {
      console.error('Failed to load evidence records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#F1F8FC]">
              Arkiv <span className="text-[#3b82f6]">Evidence Explorer</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#2563eb]/20 text-[#60a5fa] border border-[#3b82f6]/30">
              {records.length} Anchored Entities
            </span>
          </div>
          <p className="text-xs text-[#91A9B7] mt-1">
            Search and inspect cryptographic entities, consignment metadata, and relationship hashes on the Arkiv Tiramisu network.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/network">
            <Button variant="secondary" size="sm" icon={<Database className="w-3.5 h-3.5" />}>
              Network Status
            </Button>
          </Link>
        </div>
      </div>

      {/* Cyber Search Banner */}
      <div className="p-5 rounded-2xl glass-panel-elevated border border-[#3b82f6]/30 shadow-[0_0_25px_rgba(59, 130, 246, 0.15)] relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 z-10 relative">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#3b82f6] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Arkiv Entity Key (0x...), Delivery ID (DEL-...), or District..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#06151D] border border-[#3b82f6]/30 rounded-xl text-[#F1F8FC] placeholder-[#607987] focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] focus:outline-none font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2.5 text-xs bg-[#06151D] border border-[#3b82f6]/30 rounded-xl text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none"
            >
              <option value="All">All Entity Types</option>
              <option value="depot_dispatch">Depot Dispatches</option>
              <option value="shop_receipt">Shop Receipts</option>
              <option value="stock_report">Stock Reports</option>
              <option value="discrepancy_report">Discrepancy Cases</option>
            </select>

            <Button variant="primary" size="md" onClick={loadData}>
              Search Evidence
            </Button>
          </div>
        </div>
      </div>

      {/* Evidence Cards List */}
      <Card elevated>
        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : records.length === 0 ? (
          <EmptyState
            title="No Cryptographic Entities Found"
            description="No Arkiv entities match your current query or type filter."
            icon={<ShieldCheck className="w-8 h-8" />}
          />
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <div
                key={record.key}
                className="p-4 sm:p-5 rounded-xl bg-[#06151D] border border-[#3b82f6]/15 hover:border-[#3b82f6]/45 transition-all group"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#3b82f6]/10">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-[#60a5fa]">
                      {record.businessIdentifier}
                    </span>
                    <span className="text-[10px] uppercase font-mono font-bold text-[#3b82f6] px-2 py-0.5 rounded bg-[#3b82f6]/10 border border-[#3b82f6]/20">
                      {record.recordType.replace('_', ' ')}
                    </span>
                    <VerificationBadge status={record.verificationStatus} />
                  </div>

                  <span className="text-xs text-[#607987]">
                    {formatDate(record.timestamp)}
                  </span>
                </div>

                {/* Entity Key Box */}
                <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-[#071B25] border border-[#3b82f6]/15 text-xs font-mono">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[#607987] shrink-0">Entity Key:</span>
                    <span className="text-[#F1F8FC] truncate select-all">
                      {record.entityKey}
                    </span>
                  </div>
                  <CopyButton textToCopy={record.entityKey} label="Copy Key" />
                </div>

                {/* Relationships & Meta */}
                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3 text-[#91A9B7]">
                    {record.quantityKg !== undefined && (
                      <div>
                        <span>Quantity: </span>
                        <strong className="text-[#F1F8FC]">
                          {formatSimpleKg(record.quantityKg)}
                        </strong>
                      </div>
                    )}
                    {record.district && (
                      <div>
                        <span>District: </span>
                        <strong className="text-[#F1F8FC]">{record.district}</strong>
                      </div>
                    )}
                    {record.relationships.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[#60a5fa]">
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>{record.relationships.length} linked entity</span>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/records/${encodeURIComponent(record.key)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#3b82f6]/15 text-[#60a5fa] hover:bg-[#3b82f6]/25 border border-[#3b82f6]/30 transition-all self-end sm:self-auto"
                  >
                    <span>Inspect Record Payload</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function EvidenceExplorerPage() {
  return (
    <AppShell>
      <Suspense fallback={<LoadingSkeleton rows={4} />}>
        <EvidenceExplorerContent />
      </Suspense>
    </AppShell>
  );
}
