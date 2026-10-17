'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { ShopTimelineEvent } from '@/types/api';
import { formatDate, formatSimpleKg, shortenIdentifier } from '@/lib/formatters';
import {
  History,
  ArrowLeft,
  Truck,
  PackageCheck,
  Warehouse,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ shopId: string }>;
}

export default function ShopTimelinePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const shopId = resolvedParams.shopId;

  const [events, setEvents] = useState<ShopTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('October 2026');

  useEffect(() => {
    async function fetchTimeline() {
      try {
        setLoading(true);
        const data = await api.getShopTimeline(shopId);
        setEvents(data);
      } catch (err) {
        console.error('Failed to load shop timeline:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTimeline();
  }, [shopId]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'depot_dispatch':
        return <Truck className="w-4 h-4 text-[#00C8FF]" />;
      case 'shop_receipt':
        return <PackageCheck className="w-4 h-4 text-[#36D399]" />;
      case 'stock_report':
        return <Warehouse className="w-4 h-4 text-[#55E5FF]" />;
      case 'discrepancy_report':
        return <AlertTriangle className="w-4 h-4 text-[#FB7185]" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-[#FBBF24]" />;
    }
  };

  return (
    <AppShell>
      {/* Navigation & Header */}
      <div className="space-y-4 pb-2">
        <Link
          href="/shops"
          className="inline-flex items-center gap-1.5 text-xs text-[#91A9B7] hover:text-[#55E5FF] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Shop Receipts</span>
        </Link>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#00C8FF]/15 text-[#55E5FF] border border-[#00C8FF]/30 font-bold">
                {shopId}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#F1F8FC]">
                Supply Chain <span className="text-[#00C8FF]">Audit Timeline</span>
              </h2>
            </div>
            <p className="text-xs text-[#91A9B7] mt-1">
              Chronological cryptographic supply chain history of dispatches, weighbridge receipts, and community quota distribution declarations.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#06151D] px-3 py-1.5 rounded-lg border border-[#00C8FF]/20 text-xs text-[#91A9B7]">
            <Calendar className="w-3.5 h-3.5 text-[#00C8FF]" />
            <span>Audit Cycle:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-[#F1F8FC] font-semibold focus:outline-none"
            >
              <option value="October 2026" className="bg-[#071B25]">October 2026</option>
              <option value="September 2026" className="bg-[#071B25]">September 2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline Card */}
      <Card elevated>
        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : events.length === 0 ? (
          <EmptyState
            title="No Timeline Events Recorded"
            description={`No supply chain dispatch or receipt records have been anchored yet for ${shopId}.`}
            icon={<History className="w-8 h-8" />}
          />
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-[#00C8FF] before:via-[#087DEB] before:to-transparent">
            {events.map((event, idx) => (
              <div key={event.id} className="relative group">
                {/* Node Dot */}
                <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-[#041017] border-2 border-[#00C8FF] flex items-center justify-center shadow-[0_0_12px_rgba(0,200,255,0.4)] group-hover:scale-110 transition-transform">
                  <div className="w-2 h-2 rounded-full bg-[#55E5FF]" />
                </div>

                {/* Event Card */}
                <div className="p-4 sm:p-5 rounded-xl bg-[#06151D] border border-[#00C8FF]/20 hover:border-[#00C8FF]/45 transition-all">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 mb-3 border-b border-[#00C8FF]/10">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#071B25] border border-[#00C8FF]/20">
                        {getEventIcon(event.eventType)}
                      </div>
                      <h4 className="text-sm font-bold text-[#F1F8FC]">
                        {event.title}
                      </h4>
                      <span className="text-[10px] uppercase font-mono font-bold text-[#00C8FF] px-2 py-0.5 rounded bg-[#00C8FF]/10">
                        {event.referenceId}
                      </span>
                    </div>

                    <span className="text-xs text-[#607987] font-medium">
                      {formatDate(event.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-[#91A9B7] leading-relaxed mb-3">
                    {event.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                    <div className="flex items-center gap-4">
                      {event.quantityKg !== undefined && (
                        <div>
                          <span className="text-[#607987] mr-1">Quantity:</span>
                          <span className="font-bold text-[#F1F8FC]">
                            {formatSimpleKg(event.quantityKg)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-[#607987] mr-1">Status:</span>
                        <span
                          className={`font-semibold ${
                            event.status === 'MATCH' || event.status === 'COMPLETED'
                              ? 'text-[#36D399]'
                              : event.status === 'MISMATCH'
                              ? 'text-[#FB7185]'
                              : 'text-[#FBBF24]'
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CopyButton
                        textToCopy={event.entityKey}
                        label="Entity Key"
                        className="text-[11px]"
                      />
                      <Link
                        href={`/records/${encodeURIComponent(event.entityKey)}`}
                        className="inline-flex items-center gap-1 text-xs text-[#00C8FF] hover:text-[#55E5FF] hover:underline ml-1"
                      >
                        <span>Evidence</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
