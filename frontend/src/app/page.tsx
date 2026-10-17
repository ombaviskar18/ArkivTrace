'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DispatchReceiptChart } from '@/components/dashboard/DispatchReceiptChart';
import { ReconciliationChart } from '@/components/dashboard/ReconciliationChart';
import { RecentActivityTable } from '@/components/dashboard/RecentActivityTable';
import { RecentDiscrepancies } from '@/components/dashboard/RecentDiscrepancies';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { api } from '@/lib/api';
import {
  DashboardSummary,
  DepotDispatch,
  ShopReceipt,
  Discrepancy,
} from '@/types/api';
import { formatWeight, formatDate } from '@/lib/formatters';
import {
  Truck,
  Package,
  PackageCheck,
  AlertTriangle,
  ShieldCheck,
  Activity,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dispatches, setDispatches] = useState<DepotDispatch[]>([]);
  const [receipts, setReceipts] = useState<ShopReceipt[]>([]);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [sum, disp, rcpt, disc] = await Promise.all([
        api.getDashboardSummary(),
        api.getDispatches(),
        api.getReceipts(),
        api.getDiscrepancies(),
      ]);
      setSummary(sum);
      setDispatches(disp);
      setReceipts(rcpt);
      setDiscrepancies(disc);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <AppShell onRefresh={loadData}>
      {/* Network & Verification Status Banner */}
      <div className="p-4 rounded-xl glass-panel-elevated border border-[#00C8FF]/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#00C8FF]/10 to-transparent pointer-events-none" />

        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-[#00C8FF]/10 border border-[#00C8FF]/30 flex items-center justify-center text-[#00C8FF] shadow-[0_0_15px_rgba(0,200,255,0.25)]">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#F1F8FC] uppercase tracking-wider">
                Arkiv Network:
              </span>
              <span className="text-xs font-mono font-semibold text-[#55E5FF]">
                tiramisu testnet (#8291)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#087DEB]/20 border border-[#00C8FF]/40 text-[10px] font-bold text-[#55E5FF] uppercase tracking-wider">
                DEMO DATA MODE
              </span>
            </div>

            <p className="text-xs text-[#91A9B7] mt-0.5">
              Every grain accounted for. Every discrepancy traceable via immutable cryptographic anchors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10 self-end sm:self-auto">
          {summary && (
            <span className="text-[11px] text-[#607987] hidden md:inline" suppressHydrationWarning>
              Refreshed: {formatDate(summary.lastRefreshed)}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={refreshing}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Hero Headline matching reference screenshot */}
      <div className="relative py-6 sm:py-8 px-6 rounded-2xl glass-panel border border-[#00C8FF]/20 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-radial from-[#00C8FF]/15 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-3xl space-y-3 z-10 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00C8FF]/10 border border-[#00C8FF]/30 text-xs font-semibold text-[#55E5FF]">
            <Sparkles className="w-3.5 h-3.5 text-[#00C8FF]" />
            <span>Public Distribution System Transparency</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#F1F8FC] leading-tight">
            Traceable Grain Movement Across <span className="text-[#00C8FF]">Depots</span> & <span className="text-[#55E5FF]">Ration Shops</span>
          </h2>

          <p className="text-xs sm:text-sm text-[#91A9B7] leading-relaxed">
            ArkivTrace anchors bulk grain dispatches, electronic weighbridge confirmations, and fair-price shop receipts to the Arkiv blockchain. Compare declared stock against community distribution records to reconcile variances instantly.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/evidence">
              <Button variant="primary" icon={<ShieldCheck className="w-4 h-4" />}>
                Explore Arkiv Evidence
              </Button>
            </Link>
            <Link href="/discrepancies">
              <Button variant="secondary" icon={<AlertTriangle className="w-4 h-4" />}>
                Audit Discrepancies
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      {loading ? (
        <LoadingSkeleton rows={2} />
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Dispatches"
            value={summary.totalDispatches}
            subtitle="Active depot delivery consignments"
            icon={<Truck className="w-5 h-5" />}
            trend={{ value: '+14%', isPositive: true }}
            accentColor="cyan"
          />

          <StatCard
            title="Grain Dispatched"
            value={formatWeight(summary.totalGrainDispatchedKg)}
            subtitle="FCI & SWC depot release volume"
            icon={<Package className="w-5 h-5" />}
            accentColor="blue"
          />

          <StatCard
            title="Shop Receipts"
            value={`${summary.totalReceipts} Receipts`}
            subtitle={`${summary.matchRatePercentage}% full weight match rate`}
            icon={<PackageCheck className="w-5 h-5" />}
            trend={{ value: '97.4% Match', isPositive: true }}
            accentColor="success"
          />

          <StatCard
            title="Active Discrepancies"
            value={summary.totalDiscrepancies}
            subtitle={`${summary.resolvedDiscrepancies} resolved upon field audit`}
            icon={<AlertTriangle className="w-5 h-5" />}
            trend={{ value: '4 Cases Open', isNeutral: true }}
            accentColor="error"
          />
        </div>
      ) : null}

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Dispatch vs Receipt Trends */}
        <div className="lg:col-span-2">
          <Card
            elevated
            title="Grain Dispatch vs Shop Receipt Trends"
            subtitle="7-day comparison of depot outflow vs Fair Price Shop acknowledged weight (kg)"
            headerAction={
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-[#55E5FF]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00C8FF]" />
                  Dispatched
                </span>
                <span className="flex items-center gap-1.5 text-[#91A9B7]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#087DEB]" />
                  Received
                </span>
              </div>
            }
          >
            {summary ? (
              <DispatchReceiptChart data={summary.trends} />
            ) : (
              <LoadingSkeleton rows={4} />
            )}
          </Card>
        </div>

        {/* Right 1 Col: Reconciliation Donut Chart */}
        <div className="lg:col-span-1">
          <Card
            elevated
            title="Reconciliation Audit Status"
            subtitle="Cryptographically verified weight reconciliation"
          >
            {summary ? (
              <ReconciliationChart data={summary.reconciliationBreakdown} />
            ) : (
              <LoadingSkeleton rows={4} />
            )}
          </Card>
        </div>
      </div>

      {/* Bottom Operational Grid: Recent Activity & Discrepancies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Activity Table */}
        <div className="lg:col-span-2">
          <Card
            title="Recent Supply Chain Activity"
            subtitle="Latest depot dispatch batches and fair-price shop confirmations"
            headerAction={
              <Link
                href="/dispatches"
                className="text-xs font-semibold text-[#00C8FF] hover:text-[#55E5FF] hover:underline inline-flex items-center gap-1"
              >
                <span>View Dispatches</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <RecentActivityTable dispatches={dispatches} receipts={receipts} />
          </Card>
        </div>

        {/* Right 1 Col: Recent Discrepancies */}
        <div className="lg:col-span-1">
          <Card
            title="Open Discrepancy Audits"
            subtitle="Unresolved quantity variances requiring inspection"
            headerAction={
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FB7185]/20 text-[#FB7185] border border-[#FB7185]/30">
                {discrepancies.length} Active
              </span>
            }
          >
            <RecentDiscrepancies discrepancies={discrepancies} />
          </Card>
        </div>
      </div>

      {/* 4 Pillars Section matching Reference Screenshot */}
      <div className="pt-4">
        <div className="text-center max-w-xl mx-auto mb-6">
          <span className="text-xs font-bold text-[#00C8FF] uppercase tracking-wider">
            Public Distribution Architecture
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-[#F1F8FC] mt-1">
            Why Blockchain for Food Security?
          </h3>
          <p className="text-xs text-[#91A9B7] mt-1">
            Redefining trust and transparency in the public distribution system through immutable data records.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl glass-panel border border-[#00C8FF]/15 hover:border-[#00C8FF]/40 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#00C8FF]/10 text-[#00C8FF] border border-[#00C8FF]/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(0,200,255,0.2)]">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#F1F8FC] group-hover:text-[#55E5FF] transition-colors">
              Depot Dispatches
            </h4>
            <p className="text-xs text-[#91A9B7] mt-1.5 leading-relaxed">
              Every truck dispatch from FCI/SWC silos is signed with tamper-proof seal and quantity metadata.
            </p>
          </div>

          <div className="p-5 rounded-xl glass-panel border border-[#00C8FF]/15 hover:border-[#00C8FF]/40 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#087DEB]/10 text-[#55E5FF] border border-[#087DEB]/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(8,125,235,0.2)]">
              <PackageCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#F1F8FC] group-hover:text-[#55E5FF] transition-colors">
              Receipt Reconciliation
            </h4>
            <p className="text-xs text-[#91A9B7] mt-1.5 leading-relaxed">
              Fair price shops acknowledge electronic weighbridge scale readings, automatically flagging transit loss.
            </p>
          </div>

          <div className="p-5 rounded-xl glass-panel border border-[#00C8FF]/15 hover:border-[#00C8FF]/40 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#36D399]/10 text-[#36D399] border border-[#36D399]/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(54,211,153,0.2)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#F1F8FC] group-hover:text-[#55E5FF] transition-colors">
              Anonymized Audits
            </h4>
            <p className="text-xs text-[#91A9B7] mt-1.5 leading-relaxed">
              Distribution records protect citizen privacy without collecting ration card numbers or personal identities.
            </p>
          </div>

          <div className="p-5 rounded-xl glass-panel border border-[#00C8FF]/15 hover:border-[#00C8FF]/40 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-[#FB7185]/10 text-[#FB7185] border border-[#FB7185]/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(251,113,133,0.2)]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[#F1F8FC] group-hover:text-[#55E5FF] transition-colors">
              Discrepancy Tracing
            </h4>
            <p className="text-xs text-[#91A9B7] mt-1.5 leading-relaxed">
              Variances generate verifiable audit cases with immutable timestamps for fast administrative resolution.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
