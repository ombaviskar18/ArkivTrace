'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { QuickSubmitModal } from '../forms/QuickSubmitModal';
import { X } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  onRefresh?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, onRefresh }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#02090D] flex text-[#F1F8FC] relative">
      {/* Desktop Sticky Sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#02090D]/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full bg-[#041017] border-r border-[#00C8FF]/20 shadow-2xl z-10 flex flex-col">
            <div className="p-3 border-b border-[#00C8FF]/15 flex items-center justify-end">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-[#91A9B7] hover:text-[#55E5FF] hover:bg-[#071B25] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenSubmitModal={() => setSubmitModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-[#00C8FF]/10 py-6 px-4 sm:px-8 text-center text-xs text-[#607987] bg-[#02090D]/60">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00C8FF] inline-block animate-pulse" />
              <span className="font-semibold text-[#91A9B7]">ArkivTrace</span> —
              <span>Public Distribution System Intelligence</span>
            </div>
            <div className="text-[11px] text-[#607987]">
              Immutable audit verification anchored to Arkiv Tiramisu testnet. Synthetic demo data mode.
            </div>
          </div>
        </footer>
      </div>

      {/* Quick Submit Record Modal */}
      <QuickSubmitModal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onSuccess={onRefresh}
      />
    </div>
  );
};
