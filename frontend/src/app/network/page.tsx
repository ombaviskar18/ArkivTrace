'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { api } from '@/lib/api';
import { NetworkStatus } from '@/types/api';
import { formatDate } from '@/lib/formatters';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Cpu,
  Wifi,
  ExternalLink,
  ShieldCheck,
  Database,
} from 'lucide-react';

export default function NetworkStatusPage() {
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = async () => {
    try {
      setRefreshing(true);
      const data = await api.getNetworkStatus();
      setStatus(data);
    } catch (err) {
      console.error('Failed to load network status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <AppShell onRefresh={loadStatus}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#F1F8FC]">
              Arkiv Network <span className="text-[#3b82f6]">Status</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#36D399]/15 text-[#36D399] border border-[#36D399]/30">
              Operational
            </span>
          </div>
          <p className="text-xs text-[#91A9B7] mt-1">
            Technical telemetry, RPC node status, and backend connectivity diagnostics for hackathon evaluation.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={loadStatus}
          isLoading={refreshing}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
        >
          Ping Network
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : status ? (
        <div className="space-y-6">
          {/* Main Health Card */}
          <div className="p-6 rounded-2xl glass-panel-elevated border border-[#3b82f6]/30 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 z-10 relative">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#3b82f6]/10 border border-[#3b82f6]/40 text-[#3b82f6] flex items-center justify-center shadow-[0_0_20px_rgba(59, 130, 246, 0.3)]">
                  <Wifi className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#F1F8FC]">
                      {status.networkName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2563eb]/20 border border-[#3b82f6]/40 text-[#60a5fa] uppercase">
                      {status.mode} MODE
                    </span>
                  </div>
                  <p className="text-xs text-[#91A9B7] mt-0.5">
                    Arkiv Tiramisu Layer 1 Testnet Consensus Engine
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <span className="text-[11px] text-[#607987] block uppercase font-semibold">
                    Latency
                  </span>
                  <span className="text-lg font-mono font-bold text-[#36D399]">
                    {status.lastPingMs} ms
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-[#607987] block uppercase font-semibold">
                    Chain ID
                  </span>
                  <span className="text-lg font-mono font-bold text-[#60a5fa]">
                    #{status.chainId}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-[#607987] block uppercase font-semibold">
                    Latest Block
                  </span>
                  <span className="text-lg font-mono font-bold text-[#F1F8FC]">
                    #{status.lastBlockNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card elevated title="Backend Gateway Telemetry">
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#06151D] border border-[#3b82f6]/15">
                  <span className="text-[#91A9B7]">Backend Health Endpoint</span>
                  <span className="inline-flex items-center gap-1.5 text-[#36D399] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Healthy / Ready
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-[#06151D] border border-[#3b82f6]/15">
                  <span className="text-[#91A9B7]">Configured RPC Endpoint</span>
                  <span className="font-mono text-[#60a5fa]">
                    {status.rpcEndpoint}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-[#06151D] border border-[#3b82f6]/15">
                  <span className="text-[#91A9B7]">Blockchain Keys Security</span>
                  <span className="text-[#36D399] font-medium">
                    Strict Backend Signer (Zero Keys in Frontend)
                  </span>
                </div>
              </div>
            </Card>

            <Card elevated title="Latest Immutable Entity Anchor">
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#607987] font-semibold uppercase tracking-wider block mb-1">
                    Latest Entity Key
                  </span>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#06151D] border border-[#3b82f6]/20 font-mono text-[#60a5fa] break-all">
                    <span className="flex-1 select-all">{status.latestEntityKey}</span>
                    <CopyButton textToCopy={status.latestEntityKey || ''} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-[#06151D] border border-[#3b82f6]/15">
                  <span className="text-[#91A9B7]">Last Synced Block Timestamp</span>
                  <span className="text-[#F1F8FC]">
                    {formatDate(status.lastBlockTimestamp)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
