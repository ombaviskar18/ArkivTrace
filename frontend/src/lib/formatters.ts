import { ReconciliationStatus, VerificationStatus } from '@/types/api';

export function formatWeight(kg: number | undefined | null): string {
  if (kg === undefined || kg === null) return 'N/A';
  if (kg >= 1000) {
    const tonnes = (kg / 1000).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    });
    return `${kg.toLocaleString('en-IN')} kg (${tonnes} MT)`;
  }
  return `${kg.toLocaleString('en-IN')} kg`;
}

export function formatSimpleKg(kg: number | undefined | null): string {
  if (kg === undefined || kg === null) return 'N/A';
  return `${kg.toLocaleString('en-IN')} kg`;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function shortenIdentifier(id: string | undefined | null, chars = 6): string {
  if (!id) return '';
  if (id.length <= chars * 2 + 2) return id;
  return `${id.slice(0, chars + 2)}...${id.slice(-chars)}`;
}

export function getStatusBadgeProps(status: ReconciliationStatus): {
  label: string;
  className: string;
  borderClass: string;
} {
  switch (status) {
    case 'MATCH':
      return {
        label: 'Match',
        className: 'bg-[#36D399]/10 text-[#36D399]',
        borderClass: 'border-[#36D399]/30',
      };
    case 'MISMATCH':
      return {
        label: 'Mismatch',
        className: 'bg-[#FB7185]/10 text-[#FB7185]',
        borderClass: 'border-[#FB7185]/30',
      };
    case 'INSUFFICIENT_DATA':
      return {
        label: 'Insufficient Data',
        className: 'bg-[#FBBF24]/10 text-[#FBBF24]',
        borderClass: 'border-[#FBBF24]/30',
      };
    case 'PENDING':
    default:
      return {
        label: 'Pending',
        className: 'bg-[#3b82f6]/10 text-[#60a5fa]',
        borderClass: 'border-[#3b82f6]/30',
      };
  }
}

export function getVerificationBadgeProps(status: VerificationStatus): {
  label: string;
  className: string;
  dotColor: string;
} {
  switch (status) {
    case 'Verified':
      return {
        label: 'Verified on Arkiv',
        className: 'bg-[#36D399]/10 text-[#36D399] border-[#36D399]/30',
        dotColor: 'bg-[#36D399]',
      };
    case 'Recorded':
      return {
        label: 'Recorded (Unverified)',
        className: 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30',
        dotColor: 'bg-[#3b82f6]',
      };
    case 'Pending':
      return {
        label: 'Pending Sync',
        className: 'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/30',
        dotColor: 'bg-[#FBBF24]',
      };
    case 'Demo Data':
      return {
        label: 'DEMO DATA',
        className: 'bg-[#3b82f6]/20 text-[#60a5fa] border-[#3b82f6]/40',
        dotColor: 'bg-[#3b82f6] animate-pulse',
      };
    case 'Unavailable':
    default:
      return {
        label: 'Evidence Unavailable',
        className: 'bg-[#607987]/20 text-[#91A9B7] border-[#607987]/30',
        dotColor: 'bg-[#607987]',
      };
  }
}
