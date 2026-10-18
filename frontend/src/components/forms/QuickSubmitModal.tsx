import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { DispatchForm } from './DispatchForm';
import { ReceiptForm } from './ReceiptForm';
import { StockReportForm } from './StockReportForm';
import { DiscrepancyForm } from './DiscrepancyForm';
import { ShopForm } from './ShopForm';
import { Truck, PackageCheck, Warehouse, AlertTriangle, Store, Lock } from 'lucide-react';
import { useUserRole } from '@/lib/auth';

interface QuickSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QuickSubmitModal: React.FC<QuickSubmitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { role, isAdmin, isOperator, shopId } = useUserRole();

  const [activeTab, setActiveTab] = useState<'dispatch' | 'receipt' | 'stock' | 'discrepancy' | 'shop'>(
    isAdmin ? 'dispatch' : isOperator ? 'receipt' : 'discrepancy'
  );

  useEffect(() => {
    if (isAdmin) setActiveTab('dispatch');
    else if (isOperator) setActiveTab('receipt');
    else setActiveTab('discrepancy');
  }, [isAdmin, isOperator, isOpen]);

  const allTabs = [
    {
      id: 'shop',
      label: 'Register Shop',
      icon: <Store className="w-3.5 h-3.5" />,
      allowedRoles: ['admin'],
    },
    {
      id: 'dispatch',
      label: 'Depot Dispatch',
      icon: <Truck className="w-3.5 h-3.5" />,
      allowedRoles: ['admin'],
    },
    {
      id: 'receipt',
      label: 'Shop Receipt',
      icon: <PackageCheck className="w-3.5 h-3.5" />,
      allowedRoles: ['admin', 'operator'],
    },
    {
      id: 'stock',
      label: 'Stock Report',
      icon: <Warehouse className="w-3.5 h-3.5" />,
      allowedRoles: ['admin', 'operator'],
    },
    {
      id: 'discrepancy',
      label: 'Discrepancy',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      allowedRoles: ['admin', 'operator', 'public'],
    },
  ];

  const tabs = allTabs.filter((t) => t.allowedRoles.includes(role));

  const handleSuccess = () => {
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Supply-Chain Record"
      subtitle={
        isOperator && shopId
          ? `Authenticated Dealer for Shop [${shopId}] • Verified On-Chain Submission`
          : isAdmin
          ? 'Civil Supplies Depot Officer • Cryptographic Dispatch & Declaration Authority'
          : 'Public Whistleblower Portal • Anchor Auditable Discrepancy'
      }
      maxWidth="2xl"
    >
      {/* Tab Selector */}
      <div className="flex border-b border-[#3b82f6]/15 gap-2 mb-5 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-[#3b82f6]/15 text-[#60a5fa] border border-[#3b82f6]/40 shadow-[0_0_12px_rgba(59, 130, 246, 0.2)]'
                : 'text-[#91A9B7] hover:text-[#F1F8FC] hover:bg-[#071B25]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-1">
        {activeTab === 'shop' && (
          <ShopForm onSuccess={handleSuccess} onCancel={onClose} />
        )}
        {activeTab === 'dispatch' && (
          <DispatchForm onSuccess={handleSuccess} onCancel={onClose} />
        )}
        {activeTab === 'receipt' && (
          <ReceiptForm onSuccess={handleSuccess} onCancel={onClose} />
        )}
        {activeTab === 'stock' && (
          <StockReportForm onSuccess={handleSuccess} onCancel={onClose} />
        )}
        {activeTab === 'discrepancy' && (
          <DiscrepancyForm onSuccess={handleSuccess} onCancel={onClose} />
        )}
      </div>
    </Modal>
  );
};
