'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { DispatchForm } from './DispatchForm';
import { ReceiptForm } from './ReceiptForm';
import { StockReportForm } from './StockReportForm';
import { DiscrepancyForm } from './DiscrepancyForm';
import { Truck, PackageCheck, Warehouse, AlertTriangle } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'dispatch' | 'receipt' | 'stock' | 'discrepancy'>(
    'dispatch'
  );

  const tabs = [
    {
      id: 'dispatch',
      label: 'Depot Dispatch',
      icon: <Truck className="w-3.5 h-3.5" />,
    },
    {
      id: 'receipt',
      label: 'Shop Receipt',
      icon: <PackageCheck className="w-3.5 h-3.5" />,
    },
    {
      id: 'stock',
      label: 'Stock Report',
      icon: <Warehouse className="w-3.5 h-3.5" />,
    },
    {
      id: 'discrepancy',
      label: 'Discrepancy',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
  ];

  const handleSuccess = () => {
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Supply-Chain Record"
      subtitle="Anchor auditable grain movement or report variance on the Arkiv testnet"
      maxWidth="2xl"
    >
      {/* Tab Selector */}
      <div className="flex border-b border-[#00C8FF]/15 gap-2 mb-5 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-[#00C8FF]/15 text-[#55E5FF] border border-[#00C8FF]/40 shadow-[0_0_12px_rgba(0,200,255,0.2)]'
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
