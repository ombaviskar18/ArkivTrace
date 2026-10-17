import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Truck,
  PackageCheck,
  Warehouse,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Settings,
  ChevronRight,
  Database,
} from 'lucide-react';
import { useUserRole } from '@/lib/auth';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const pathname = usePathname();
  const { role, isAdmin } = useUserRole();

  const allNavGroups = [
    {
      label: 'OVERVIEW',
      items: [
        {
          name: 'Dashboard',
          href: '/',
          icon: <LayoutDashboard className="w-4 h-4" />,
          roles: ['admin', 'operator'],
        },
      ],
    },
    {
      label: 'SUPPLY CHAIN',
      items: [
        {
          name: 'Dispatches',
          href: '/dispatches',
          icon: <Truck className="w-4 h-4" />,
          roles: ['admin', 'operator'],
        },
        {
          name: 'Shop Receipts',
          href: '/shops',
          icon: <PackageCheck className="w-4 h-4" />,
          roles: ['admin', 'operator'],
        },
        {
          name: 'Stock Reports',
          href: '/stock-reports',
          icon: <Warehouse className="w-4 h-4" />,
          roles: ['admin', 'operator'],
        },
      ],
    },
    {
      label: 'INVESTIGATION',
      items: [
        {
          name: 'Discrepancies',
          href: '/discrepancies',
          icon: <AlertTriangle className="w-4 h-4" />,
          roles: ['admin', 'operator', 'public'],
        },
        {
          name: 'Evidence Explorer',
          href: '/evidence',
          icon: <ShieldCheck className="w-4 h-4" />,
          roles: ['admin', 'operator', 'public'],
        },
      ],
    },
    {
      label: 'SYSTEM',
      items: [
        {
          name: 'Network Status',
          href: '/network',
          icon: <Activity className="w-4 h-4" />,
          roles: ['admin', 'operator', 'public'],
        },
        {
          name: 'Settings',
          href: '/settings',
          icon: <Settings className="w-4 h-4" />,
          roles: ['admin', 'operator'],
        },
      ],
    },
  ];

  const navGroups = allNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        isAdmin ? true : item.roles.includes(role)
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className="w-64 shrink-0 bg-[#041017] border-r border-[#00C8FF]/15 flex flex-col h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#00C8FF]/15">
        <Link
          href="/"
          onClick={onCloseMobile}
          className="flex items-center gap-3 group"
        >
          {/* Futuristic Grain + Blockchain Node Logo */}
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#00C8FF] to-[#087DEB] flex items-center justify-center p-0.5 shadow-[0_0_15px_rgba(0,200,255,0.4)] group-hover:shadow-[0_0_25px_rgba(0,200,255,0.6)] transition-all">
            <div className="w-full h-full bg-[#041017] rounded-[10px] flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-5 h-5 text-[#00C8FF] drop-shadow-[0_0_8px_rgba(0,200,255,0.8)]"
              >
                {/* Grain Kernel Node */}
                <path
                  d="M12 2C8 6 6 10 6 15C6 18.5 8.5 21 12 21C15.5 21 18 18.5 18 15C18 10 16 6 12 2Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 2V21"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
                {/* Connected Network Nodes */}
                <circle cx="12" cy="7" r="1.5" fill="#55E5FF" />
                <circle cx="12" cy="14" r="1.5" fill="#55E5FF" />
                <circle cx="9" cy="11" r="1" fill="#00C8FF" />
                <circle cx="15" cy="11" r="1" fill="#00C8FF" />
              </svg>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-[#F1F8FC] group-hover:text-[#55E5FF] transition-colors">
                Arkiv<span className="text-[#00C8FF]">Trace</span>
              </span>
            </div>
            <p className="text-[9px] tracking-wider font-semibold text-[#00C8FF]/80 uppercase">
              Distribution Intel
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-2 text-[10px] font-bold text-[#607987] tracking-wider uppercase">
              {group.label}
            </div>
            <nav className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-[#00C8FF]/15 text-[#55E5FF] border border-[#00C8FF]/40 shadow-[0_0_15px_rgba(0,200,255,0.15)]'
                        : 'text-[#91A9B7] hover:text-[#F1F8FC] hover:bg-[#071B25]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`transition-colors ${
                          isActive
                            ? 'text-[#00C8FF] drop-shadow-[0_0_6px_rgba(0,200,255,0.7)]'
                            : 'text-[#607987] group-hover:text-[#91A9B7]'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-[#00C8FF]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom Network & Role Status Widget */}
      <div className="p-3 border-t border-[#00C8FF]/15 bg-[#02090D]/50">
        <div className="p-3 rounded-xl bg-[#071B25] border border-[#00C8FF]/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00C8FF] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00C8FF]" />
            </span>
            <div>
              <div className="text-[11px] font-bold text-[#F1F8FC] flex items-center gap-1">
                Arkiv Tiramisu
              </div>
              <div className="text-[10px] text-[#55E5FF] font-medium flex items-center gap-1">
                <Database className="w-2.5 h-2.5" />
                <span className="uppercase font-mono text-[9px]">
                  {role === 'admin' ? 'Officer [Admin]' : role === 'operator' ? 'Dealer [Operator]' : 'Public Observer'}
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/network"
            className="text-[10px] text-[#00C8FF] hover:underline font-mono"
          >
            #7738577
          </Link>
        </div>
      </div>
    </aside>
  );
};
