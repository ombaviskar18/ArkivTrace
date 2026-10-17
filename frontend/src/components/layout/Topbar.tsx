'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Plus, Menu, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

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

  const getPageInfo = () => {
    if (pathname === '/') return { title: 'Supply Chain Overview', section: 'Overview' };
    if (pathname.startsWith('/dispatches')) return { title: 'Depot Dispatches', section: 'Supply Chain' };
    if (pathname.startsWith('/shops/')) return { title: 'Fair Price Shop Audit Timeline', section: 'Supply Chain' };
    if (pathname.startsWith('/shops')) return { title: 'Shop Receipts & Deliveries', section: 'Supply Chain' };
    if (pathname.startsWith('/stock-reports')) return { title: 'Inventory & Stock Reconciliation', section: 'Supply Chain' };
    if (pathname.startsWith('/discrepancies')) return { title: 'Discrepancy Investigation', section: 'Investigation' };
    if (pathname.startsWith('/records/')) return { title: 'Arkiv Immutable Record Inspection', section: 'Evidence' };
    if (pathname.startsWith('/evidence')) return { title: 'Arkiv Evidence Explorer', section: 'Investigation' };
    if (pathname.startsWith('/network')) return { title: 'Network & Tiramisu Status', section: 'System' };
    if (pathname.startsWith('/settings')) return { title: 'Preferences & System Settings', section: 'System' };
    return { title: 'ArkivTrace', section: 'Portal' };
  };

  const { title, section } = getPageInfo();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/evidence?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="h-16 border-b border-[#00C8FF]/15 bg-[#02090D]/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile trigger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-[#91A9B7] hover:text-[#55E5FF] hover:bg-[#071B25] rounded-lg focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#607987] font-medium">
            <span>ArkivTrace</span>
            <span>/</span>
            <span className="text-[#00C8FF]">{section}</span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-[#F1F8FC] tracking-wide truncate max-w-[200px] sm:max-w-xs md:max-w-md">
            {title}
          </h1>
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
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] placeholder-[#607987] focus:outline-none focus:border-[#00C8FF] focus:ring-1 focus:ring-[#00C8FF]/40 transition-all font-sans"
          />
        </form>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Environment Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#087DEB]/15 border border-[#00C8FF]/30 text-[11px] font-semibold text-[#55E5FF]">
          <Sparkles className="w-3 h-3 text-[#00C8FF]" />
          <span>Tiramisu Demo</span>
        </div>

        {/* Quick Submit Record Button */}
        <Button
          onClick={onOpenSubmitModal}
          size="sm"
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
        >
          <span className="hidden sm:inline">Submit</span> Record
        </Button>
      </div>
    </header>
  );
};
