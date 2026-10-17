'use client';

import React from 'react';
import { Button } from './Button';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="py-14 px-6 text-center flex flex-col items-center justify-center rounded-xl border border-dashed border-[#00C8FF]/20 bg-[#071B25]/40">
      <div className="p-4 rounded-2xl bg-[#00C8FF]/10 text-[#00C8FF] border border-[#00C8FF]/20 shadow-[0_0_20px_rgba(0,200,255,0.15)] mb-4">
        {icon || <PackageOpen className="w-8 h-8" />}
      </div>
      <h4 className="text-base font-semibold text-[#F1F8FC] mb-1.5">{title}</h4>
      <p className="text-xs text-[#91A9B7] max-w-sm mb-5 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="w-full space-y-3 animate-pulse">
      <div className="h-9 bg-[#071B25] border border-[#00C8FF]/10 rounded-lg w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 bg-[#071B25]/60 border border-[#00C8FF]/10 rounded-lg w-full flex items-center px-4 justify-between"
        >
          <div className="h-4 bg-[#00C8FF]/10 rounded w-1/4" />
          <div className="h-4 bg-[#00C8FF]/10 rounded w-1/6" />
          <div className="h-4 bg-[#00C8FF]/10 rounded w-1/6" />
          <div className="h-6 bg-[#00C8FF]/15 rounded-full w-20" />
        </div>
      ))}
    </div>
  );
};
