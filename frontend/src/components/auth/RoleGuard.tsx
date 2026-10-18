'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useUserRole, UserRole } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { ShieldAlert, KeyRound, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireShop?: boolean;
  targetShopId?: string;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles = ['admin', 'operator'],
  requireShop = false,
  targetShopId,
  fallback,
}) => {
  const router = useRouter();
  const { isLoaded, isSignedIn, role, shopId, isAdmin } = useUserRole();

  if (!isLoaded) {
    return (
      <div className="space-y-4 py-8">
        <div className="flex items-center gap-2 text-xs text-[#3b82f6] animate-pulse mb-2">
          <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
          <span>Verifying cryptographic credentials with Clerk...</span>
        </div>
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    if (fallback) return <>{fallback}</>;

    return (
      <Card elevated className="border-[#3b82f6]/20 text-center p-8 my-6">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#2563eb]/15 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6] mb-4">
          <KeyRound className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-[#F1F8FC] mb-2">
          Authentication Required
        </h3>
        <p className="text-xs text-[#91A9B7] max-w-md mx-auto mb-5">
          This supply chain dashboard section is restricted to registered Fair Price Shop operators and Civil Supplies Officers.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/evidence">
            <Button variant="secondary" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Public Evidence
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="primary" size="sm" icon={<KeyRound className="w-3.5 h-3.5" />}>
              Sign In to Continue
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  // Check role authorization
  const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(role);
  if (!roleAllowed) {
    if (fallback) return <>{fallback}</>;

    return (
      <Card elevated className="border-[#FB7185]/30 text-center p-8 my-6">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#FB7185]/15 border border-[#FB7185]/30 flex items-center justify-center text-[#FB7185] mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-[#F1F8FC] mb-2">
          Insufficient Role Privileges
        </h3>
        <p className="text-xs text-[#91A9B7] max-w-md mx-auto mb-2">
          Your current account has the role <strong className="text-[#60a5fa] uppercase font-mono">{role}</strong>.
          This section requires: <span className="font-mono text-[#F1F8FC]">{allowedRoles.join(', ')}</span>.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/unauthorized">
            <Button variant="danger" size="sm">
              View Access Details
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  // Check shop scope if required for operators (admins bypass)
  if (requireShop && !isAdmin && targetShopId) {
    const isMatchingShop = shopId && shopId.toUpperCase() === targetShopId.toUpperCase();
    if (!isMatchingShop) {
      return (
        <Card elevated className="border-[#FB7185]/30 text-center p-8 my-6">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#FB7185]/15 border border-[#FB7185]/30 flex items-center justify-center text-[#FB7185] mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#F1F8FC] mb-2">
            Cross-Shop Scope Blocked
          </h3>
          <p className="text-xs text-[#91A9B7] max-w-md mx-auto mb-2">
            You are authorized only for Fair Price Shop <strong className="text-[#60a5fa] font-mono">{shopId || 'None'}</strong>.
            Access to shop <strong className="text-[#FB7185] font-mono">{targetShopId}</strong> is denied.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/shops">
              <Button variant="secondary" size="sm">
                Return to Shop List
              </Button>
            </Link>
          </div>
        </Card>
      );
    }
  }

  return <>{children}</>;
};
