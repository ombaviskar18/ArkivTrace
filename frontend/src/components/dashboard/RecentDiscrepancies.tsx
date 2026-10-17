'use client';

import React from 'react';
import Link from 'next/link';
import { Discrepancy } from '@/types/api';
import { AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatSimpleKg } from '@/lib/formatters';

interface RecentDiscrepanciesProps {
  discrepancies: Discrepancy[];
}

export const RecentDiscrepancies: React.FC<RecentDiscrepanciesProps> = ({
  discrepancies,
}) => {
  if (discrepancies.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-[#91A9B7]">
        <ShieldCheck className="w-8 h-8 text-[#36D399] mx-auto mb-2 opacity-80" />
        <p className="font-semibold text-[#F1F8FC]">No Active Discrepancies</p>
        <p className="text-[#607987] mt-1">All recorded stock declarations match delivery receipts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {discrepancies.slice(0, 3).map((disc) => (
        <div
          key={disc.id}
          className="p-3.5 rounded-xl bg-[#06151D] border border-[#FB7185]/20 hover:border-[#FB7185]/40 transition-all flex items-start justify-between gap-3 group"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#FB7185]/10 text-[#FB7185] border border-[#FB7185]/20 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#FB7185]">
                  {disc.caseId}
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#071B25] border border-[#00C8FF]/20 text-[#91A9B7]">
                  {disc.category}
                </span>
              </div>

              <p className="text-xs text-[#F1F8FC] mt-1 font-medium line-clamp-1">
                {disc.shopName || disc.shopId || disc.relatedDeliveryId}
              </p>

              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#91A9B7]">
                <span>Variance:</span>
                <span className="font-bold text-[#FB7185]">
                  {disc.quantityDifferenceKg > 0 ? `+${disc.quantityDifferenceKg}` : disc.quantityDifferenceKg} kg
                </span>
                <span>•</span>
                <span className="text-[#607987]">{disc.status}</span>
              </div>
            </div>
          </div>

          <Link
            href="/discrepancies"
            className="p-2 text-[#91A9B7] group-hover:text-[#55E5FF] group-hover:bg-[#00C8FF]/10 rounded-lg transition-colors shrink-0"
            title="Investigate discrepancy case"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ))}

      <div className="pt-2 text-right">
        <Link
          href="/discrepancies"
          className="text-xs font-semibold text-[#00C8FF] hover:text-[#55E5FF] hover:underline inline-flex items-center gap-1"
        >
          <span>View All Discrepancy Audits</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
