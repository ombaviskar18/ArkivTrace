'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { VerificationBadge } from '@/components/ui/StatusBadge';
import { CopyButton } from '@/components/ui/CopyButton';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { ArkivRecord } from '@/types/api';
import { formatDate, formatSimpleKg } from '@/lib/formatters';
import {
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  Code2,
  Layers,
  Database,
  Link as LinkIcon,
  CheckCircle2,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ key: string }>;
}

export default function RecordDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const recordKey = decodeURIComponent(resolvedParams.key);

  const [record, setRecord] = useState<ArkivRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'structured' | 'raw'>('structured');

  useEffect(() => {
    async function fetchRecord() {
      try {
        setLoading(true);
        const data = await api.getRecordByKey(recordKey);
        setRecord(data);
      } catch (err) {
        console.error('Failed to load record details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecord();
  }, [recordKey]);

  return (
    <AppShell>
      {/* Navigation */}
      <div className="space-y-4 pb-2">
        <Link
          href="/evidence"
          className="inline-flex items-center gap-1.5 text-xs text-[#91A9B7] hover:text-[#55E5FF] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Evidence Explorer</span>
        </Link>

        {record && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm px-2.5 py-0.5 rounded bg-[#00C8FF]/15 text-[#55E5FF] border border-[#00C8FF]/30 font-bold">
                  {record.businessIdentifier}
                </span>
                <span className="text-xs uppercase font-mono text-[#91A9B7]">
                  {record.recordType.replace('_', ' ')}
                </span>
                <VerificationBadge status={record.verificationStatus} />
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-[#F1F8FC] mt-1.5">
                Arkiv Cryptographic <span className="text-[#00C8FF]">Entity Proof</span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://explorer.arkiv.network/entity/${record.entityKey}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#071B25] border border-[#00C8FF]/30 text-[#55E5FF] hover:bg-[#09232F]"
              >
                <span>Arkiv Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : !record ? (
        <Card elevated>
          <EmptyState
            title="Entity Record Not Found"
            description={`Could not find an Arkiv record matching key: "${recordKey}". It may not have synced to the local test store yet.`}
            icon={<ShieldCheck className="w-8 h-8 text-[#FB7185]" />}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Header Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card elevated title="Cryptographic Identifiers">
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#607987] font-semibold uppercase tracking-wider block mb-1">
                    Arkiv Entity Key
                  </span>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#06151D] border border-[#00C8FF]/20 font-mono text-[#55E5FF] break-all">
                    <span className="flex-1 select-all">{record.entityKey}</span>
                    <CopyButton textToCopy={record.entityKey} />
                  </div>
                </div>

                {record.txHash && (
                  <div>
                    <span className="text-[#607987] font-semibold uppercase tracking-wider block mb-1">
                      Transaction Hash
                    </span>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#06151D] border border-[#00C8FF]/20 font-mono text-[#91A9B7] break-all">
                      <span className="flex-1 select-all">{record.txHash}</span>
                      <CopyButton textToCopy={record.txHash} />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card elevated title="Blockchain Block & Network Context">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#06151D] border border-[#00C8FF]/15">
                  <span className="text-[#607987] block mb-1">Network</span>
                  <span className="font-bold text-[#F1F8FC] uppercase">
                    {record.network}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#06151D] border border-[#00C8FF]/15">
                  <span className="text-[#607987] block mb-1">Block Number</span>
                  <span className="font-bold text-[#55E5FF] font-mono">
                    #{record.blockNumber || 489240}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#06151D] border border-[#00C8FF]/15">
                  <span className="text-[#607987] block mb-1">Anchored Timestamp</span>
                  <span className="font-medium text-[#F1F8FC]">
                    {formatDate(record.timestamp)}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#06151D] border border-[#00C8FF]/15">
                  <span className="text-[#607987] block mb-1">Chain ID</span>
                  <span className="font-mono text-[#F1F8FC]">8291 (Tiramisu)</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Record Payload Viewer */}
          <Card
            elevated
            title="Entity Payload Data"
            subtitle="Decoded schema attributes anchored into Arkiv storage"
            headerAction={
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setViewMode('structured')}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    viewMode === 'structured'
                      ? 'bg-[#00C8FF]/20 text-[#55E5FF] border border-[#00C8FF]/30'
                      : 'text-[#91A9B7] hover:text-[#F1F8FC]'
                  }`}
                >
                  Table View
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    viewMode === 'raw'
                      ? 'bg-[#00C8FF]/20 text-[#55E5FF] border border-[#00C8FF]/30'
                      : 'text-[#91A9B7] hover:text-[#F1F8FC]'
                  }`}
                >
                  JSON Viewer
                </button>
              </div>
            }
          >
            {viewMode === 'structured' ? (
              <div className="overflow-x-auto rounded-xl border border-[#00C8FF]/15">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#06151D] border-b border-[#00C8FF]/15 text-[#91A9B7] uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-4 w-1/3">Field Name</th>
                      <th className="py-2.5 px-4">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#00C8FF]/10">
                    {Object.entries(record.payload).map(([k, v]) => (
                      <tr key={k} className="hover:bg-[#071B25]/60 font-mono">
                        <td className="py-2.5 px-4 text-[#55E5FF] font-semibold">
                          {k}
                        </td>
                        <td className="py-2.5 px-4 text-[#F1F8FC] break-all">
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <pre className="p-4 rounded-xl bg-[#06151D] border border-[#00C8FF]/20 font-mono text-xs text-[#55E5FF] overflow-x-auto">
                {JSON.stringify(record.payload, null, 2)}
              </pre>
            )}
          </Card>

          {/* Related Evidence Records */}
          {record.relationships.length > 0 && (
            <Card
              elevated
              title="Related Supply-Chain Evidences"
              subtitle="Linked upstream/downstream cryptographic relationships"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {record.relationships.map((rel, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#06151D] border border-[#00C8FF]/20 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#00C8FF] block mb-1">
                        {rel.label}
                      </span>
                      <span className="font-mono text-xs text-[#F1F8FC] break-all">
                        {rel.targetKey}
                      </span>
                    </div>

                    <Link
                      href={`/records/${encodeURIComponent(rel.targetKey)}`}
                      className="p-2 text-[#00C8FF] hover:text-[#55E5FF] hover:bg-[#00C8FF]/10 rounded-lg shrink-0"
                      title="Inspect related record"
                    >
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}
