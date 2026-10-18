'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Plus, Menu, ShieldCheck, Store, LogIn, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { UserButton } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useUserRole } from '@/lib/auth';

interface TopbarProps {
  onOpenMobileMenu: () => void;
  onOpenSubmitModal: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileMenu,
  onOpenSubmitModal,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { isSignedIn, role, shopId, isAdmin, isOperator } = useUserRole();

  const getPageInfo = () => {
    if (pathname === '/') return { title: 'Public Transparency Portal' };
    if (pathname.startsWith('/dispatches')) return { title: 'Depot Dispatches' };
    if (pathname.startsWith('/shops/')) return { title: 'Fair Price Shop Audit Timeline' };
    if (pathname.startsWith('/shops')) return { title: 'Shop Receipts & Deliveries' };
    if (pathname.startsWith('/stock-reports')) return { title: 'Inventory & Stock Reconciliation' };
    if (pathname.startsWith('/discrepancies')) return { title: 'Discrepancy Investigation' };
    if (pathname.startsWith('/records/')) return { title: 'Arkiv Immutable Record Inspection' };
    if (pathname.startsWith('/evidence')) return { title: 'Arkiv Evidence Explorer' };
    if (pathname.startsWith('/network')) return { title: 'Network & Tiramisu Status' };
    if (pathname.startsWith('/settings')) return { title: 'Preferences & System Settings' };
    if (pathname.startsWith('/unauthorized')) return { title: 'Access Control Violation' };
    return { title: 'Operations Dashboard' };
  };

  const { title } = getPageInfo();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/evidence?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="h-16 border-b border-[#3b82f6]/20 bg-[#02090D]/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile trigger & Brand Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-[#91A9B7] hover:text-[#60a5fa] hover:bg-[#071B25] rounded-lg focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center p-0.5 bg-gradient-to-br from-[#3b82f6]/20 to-[#2563eb]/20 border border-[#3b82f6]/30 shadow-[0_0_15px_rgba(59,130,246,0.3)] group-hover:border-[#3b82f6]/60 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all">
              <Image
                src="/images/logo.png"
                alt="ArkivTrace Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain rounded-md"
                priority
              />
            </div>
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#F1F8FC]">
              Arkiv<span className="text-[#3b82f6]">Trace</span>
            </span>
          </Link>
          <span className="text-[#3b82f6]/30 hidden sm:inline">|</span>
          <span className="text-xs sm:text-sm font-semibold text-[#91A9B7] tracking-wide truncate max-w-[200px] sm:max-w-xs md:max-w-md hidden sm:block">
            {title}
          </span>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="hidden md:flex flex-1 max-w-md mx-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="w-4 h-4 text-[#607987] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search delivery ID, shop, or Arkiv entity key..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] placeholder-[#607987] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/40 transition-all font-sans"
          />
        </form>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {!isSignedIn ? (
          <>
            <Link href="/sign-in">
              <Button variant="secondary" size="sm" icon={<LogIn className="w-3.5 h-3.5" />}>
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up" className="hidden sm:inline-flex">
              <Button variant="primary" size="sm">
                Register
              </Button>
            </Link>
          </>
        ) : (
          <>
            {isAdmin && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#3b82f6]/15 border border-[#3b82f6]/40 text-[10px] font-bold text-[#60a5fa] font-mono tracking-wider shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3b82f6]" />
                <span>OFFICER [ADMIN]</span>
              </div>
            )}

            {isOperator && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2563eb]/15 border border-[#3b82f6]/40 text-[10px] font-bold text-[#60a5fa] font-mono tracking-wider">
                <Store className="w-3.5 h-3.5 text-[#60a5fa]" />
                <span>DEALER [{shopId || 'UNASSIGNED'}]</span>
              </div>
            )}

            {!isAdmin && !isOperator && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1E293B] border border-[#334155] text-[10px] font-bold text-[#91A9B7] font-mono tracking-wider">
                <span>CITIZEN</span>
              </div>
            )}

            {/* Quick Submit Record Button */}
            <Button
              onClick={onOpenSubmitModal}
              size="sm"
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">Submit</span> Record
            </Button>

            {/* Clerk User Button Profile */}
            <div className="p-0.5 rounded-full border border-[#3b82f6]/30 hover:border-[#3b82f6] transition-all flex items-center justify-center">
              <UserButton
                appearance={{
                  theme: dark,
                  variables: {
                    colorPrimary: '#3b82f6',
                    colorPrimaryForeground: '#FFFFFF',
                    colorBackground: '#041017',
                    colorForeground: '#FFFFFF',
                    colorMutedForeground: '#91A9B7',
                    colorNeutral: '#FFFFFF',
                  },
                  elements: {
                    avatarBox: 'w-7 h-7 sm:w-8 sm:h-8',
                    userButtonPopoverCard: 'bg-[#041017] border border-[#3b82f6]/30 text-white shadow-2xl p-1',
                    userPreviewMainIdentifier: 'text-white font-bold text-sm',
                    userPreviewSecondaryIdentifier: 'text-[#91A9B7] text-xs',
                    userButtonPopoverActionButton: 'text-white hover:bg-[#3b82f6]/15 hover:text-white rounded-lg transition-colors',
                    userButtonPopoverActionButtonText: 'text-white font-medium text-sm',
                    userButtonPopoverActionButtonIcon: 'text-[#60a5fa]',
                    userButtonPopoverFooter: 'border-t border-[#3b82f6]/20 text-[#91A9B7]',
                  },
                }}
              />
            </div>
          </>
        )}
      </div>
    </header>
  );
};
