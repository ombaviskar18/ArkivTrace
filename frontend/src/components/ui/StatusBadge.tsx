'use client';

import React from 'react';
import { ReconciliationStatus, VerificationStatus } from '@/types/api';
import { getStatusBadgeProps, getVerificationBadgeProps } from '@/lib/formatters';
import { CheckCircle2, AlertTriangle, HelpCircle, Clock, ShieldCheck, Database } from 'lucide-react';

interface StatusBadgeProps {
  status: ReconciliationStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const { label, className, borderClass } = getStatusBadgeProps(status);

  const icons = {
    MATCH: <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />,
    MISMATCH: <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" />,
    INSUFFICIENT_DATA: <HelpCircle className="w-3.5 h-3.5 mr-1 shrink-0" />,
    PENDING: <Clock className="w-3.5 h-3.5 mr-1 shrink-0" />,
  };

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${className} ${borderClass}`}
    >
      {icons[status] || <Clock className="w-3.5 h-3.5 mr-1" />}
      {label}
    </span>
  );
};

interface VerificationBadgeProps {
  status: VerificationStatus;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ status }) => {
  const { label, className, dotColor } = getVerificationBadgeProps(status);

  return (
    <span
      className={`inline-flex items-center text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColor}`} />
      {status === 'Verified' ? (
        <ShieldCheck className="w-3 h-3 mr-1 text-[#36D399]" />
      ) : status === 'Demo Data' ? (
        <Database className="w-3 h-3 mr-1 text-[#60a5fa]" />
      ) : null}
      {label}
    </span>
  );
};
