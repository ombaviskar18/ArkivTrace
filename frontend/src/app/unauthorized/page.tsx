'use client';

import React from 'react';
import Link from 'next/link';
import { useUserRole } from '@/lib/auth';
import { useClerk } from '@clerk/nextjs';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldAlert, ArrowLeft, LogOut, KeyRound } from 'lucide-react';

export default function UnauthorizedPage() {
  const { role, shopId, isSignedIn, userName, userEmail } = useUserRole();
  const { signOut } = useClerk();

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card elevated className="border-[#FB7185]/30 shadow-[0_0_35px_rgba(251,113,133,0.15)] text-center p-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FB7185]/15 border border-[#FB7185]/30 flex items-center justify-center text-[#FB7185] mb-5 shadow-[0_0_20px_rgba(251,113,133,0.3)]">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FB7185]/15 text-[#FB7185] border border-[#FB7185]/30 inline-block mb-3">
            Access Restricted (403)
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F1F8FC] mb-2">
            Authorization Required
          </h1>

          <p className="text-xs sm:text-sm text-[#91A9B7] max-w-md mx-auto mb-6">
            You do not have the necessary cryptographic role permissions to access this supply-chain operational section.
          </p>

          {/* Current Identity Details Box */}
          <div className="p-4 rounded-xl bg-[#06151D] border border-[#3b82f6]/15 text-left max-w-md mx-auto mb-6 text-xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-[#3b82f6]/10">
              <span className="text-[#607987]">Current Session:</span>
              <span className="font-semibold text-[#F1F8FC]">
                {isSignedIn ? userName || userEmail : 'Unauthenticated (Public)'}
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#3b82f6]/10">
              <span className="text-[#607987]">Assigned Role:</span>
              <span className="font-mono uppercase font-bold text-[#60a5fa]">
                {role}
              </span>
            </div>
            {shopId && (
              <div className="flex items-center justify-between">
                <span className="text-[#607987]">Assigned Shop:</span>
                <span className="font-mono text-[#F1F8FC]">{shopId}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/evidence">
              <Button variant="secondary" size="md" icon={<ArrowLeft className="w-4 h-4" />}>
                Public Evidence Explorer
              </Button>
            </Link>

            {isSignedIn ? (
              <Button
                variant="danger"
                size="md"
                onClick={() => signOut({ redirectUrl: '/sign-in' })}
                icon={<LogOut className="w-4 h-4" />}
              >
                Switch Account
              </Button>
            ) : (
              <Link href="/sign-in">
                <Button variant="primary" size="md" icon={<KeyRound className="w-4 h-4" />}>
                  Sign In with Credentials
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
