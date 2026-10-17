'use client';

import React from 'react';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  accentColor?: 'cyan' | 'blue' | 'warning' | 'error' | 'success';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  accentColor = 'cyan',
}) => {
  const accentBorder = {
    cyan: 'hover:border-[#00C8FF]/50 border-[#00C8FF]/20',
    blue: 'hover:border-[#087DEB]/50 border-[#087DEB]/20',
    warning: 'hover:border-[#FBBF24]/50 border-[#FBBF24]/20',
    error: 'hover:border-[#FB7185]/50 border-[#FB7185]/20',
    success: 'hover:border-[#36D399]/50 border-[#36D399]/20',
  }[accentColor];

  const iconBg = {
    cyan: 'bg-[#00C8FF]/10 text-[#00C8FF] border border-[#00C8FF]/30 shadow-[0_0_12px_rgba(0,200,255,0.25)]',
    blue: 'bg-[#087DEB]/10 text-[#55E5FF] border border-[#087DEB]/30 shadow-[0_0_12px_rgba(8,125,235,0.25)]',
    warning: 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/30 shadow-[0_0_12px_rgba(251,191,36,0.25)]',
    error: 'bg-[#FB7185]/10 text-[#FB7185] border border-[#FB7185]/30 shadow-[0_0_12px_rgba(251,113,133,0.25)]',
    success: 'bg-[#36D399]/10 text-[#36D399] border border-[#36D399]/30 shadow-[0_0_12px_rgba(54,211,153,0.25)]',
  }[accentColor];

  return (
    <Card elevated className={`group relative transition-all duration-300 ${accentBorder}`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-[#91A9B7] uppercase tracking-wider">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[#F1F8FC] mt-2 tracking-tight group-hover:text-[#55E5FF] transition-colors">
            {value}
          </div>
          {subtitle && (
            <p className="text-xs text-[#607987] mt-1.5 font-medium">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110 ${iconBg}`}>
          {icon}
        </div>
      </div>

      {trend && (
        <div className="mt-4 pt-3 border-t border-[#00C8FF]/10 flex items-center text-xs">
          <span
            className={`font-semibold mr-1.5 ${
              trend.isNeutral
                ? 'text-[#91A9B7]'
                : trend.isPositive
                ? 'text-[#36D399]'
                : 'text-[#FB7185]'
            }`}
          >
            {trend.value}
          </span>
          <span className="text-[#607987]">vs previous cycle</span>
        </div>
      )}
    </Card>
  );
};
