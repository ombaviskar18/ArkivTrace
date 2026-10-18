import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { CreateShopInput } from '@/types/api';
import { api } from '@/lib/api';
import { Store, CheckCircle2, AlertCircle, ShieldAlert, ExternalLink } from 'lucide-react';
import { useUserRole } from '@/lib/auth';

interface ShopFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ShopForm: React.FC<ShopFormProps> = ({ onSuccess, onCancel }) => {
  const { isAdmin } = useUserRole();

  const [formData, setFormData] = useState<CreateShopInput>({
    shopId: 'FPS-MH-482',
    name: 'Fair Price Shop',
    operatorName: 'Ramesh Patil',
    operatorAddress: '0x1234567890123456789012345678901234567890',
    district: 'Pune',
    state: 'Maharashtra',
    address: 'Main Market Road, Pune',
    allocatedBeneficiaries: 1200,
    monthlyQuotaKg: {
      wheat: 5000,
      rice: 4000,
      coarseGrains: 1000,
    },
    status: 'active',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    shopId: string;
    entityKey: string;
    txHash: string;
    explorerUrl: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.shopId.trim()) {
      setError('Shop ID is required.');
      return;
    }
    if (!formData.name.trim()) {
      setError('Shop name is required.');
      return;
    }
    if (!formData.operatorName.trim()) {
      setError('Operator name is required.');
      return;
    }
    if (!formData.district.trim() || !formData.state.trim()) {
      setError('District and State are required.');
      return;
    }
    if (!formData.address.trim()) {
      setError('Address is required.');
      return;
    }
    if (!formData.allocatedBeneficiaries || formData.allocatedBeneficiaries < 1) {
      setError('Beneficiaries must be at least 1.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.createShop(formData);
      setCreatedResult(res);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register shop entity on Arkiv.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#FF5861]/15 text-[#FF5861] flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-[#F1F8FC]">Admin Permission Required</h4>
        <p className="text-xs text-[#91A9B7]">
          Only authenticated Supply Chain Admins can register and authorize new Fair Price Shops on the Arkiv blockchain.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {createdResult ? (
        <div className="p-4 rounded-xl bg-[#36D399]/10 border border-[#36D399]/30 text-center space-y-2.5">
          <div className="w-10 h-10 rounded-full bg-[#36D399]/20 text-[#36D399] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#F1F8FC]">Shop Registered on Arkiv!</h4>
          <p className="text-xs text-[#91A9B7]">
            Ration Shop <strong className="text-[#36D399] font-mono">{createdResult.shopId}</strong> has been written to Arkiv Tiramisu.
          </p>
          <div className="pt-2">
            <a
              href={`https://tiramisu.explorer.arkiv.network/tx/${createdResult.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#00C8FF] hover:underline font-mono"
            >
              Verify Tx on Arkiv Explorer <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : null}

      {error && (
        <div className="p-3 rounded-xl bg-[#FF5861]/15 border border-[#FF5861]/30 flex items-start gap-2.5 text-xs text-[#FF5861]">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Shop ID */}
        <div>
          <label className="block text-[11px] font-semibold text-[#91A9B7] mb-1">
            Shop ID (Unique Identifier) *
          </label>
          <input
            type="text"
            value={formData.shopId}
            onChange={(e) => setFormData({ ...formData, shopId: e.target.value.toUpperCase() })}
            placeholder="e.g. FPS-MH-402"
            required
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none font-mono"
          />
        </div>

        {/* Shop Name */}
        <div>
          <label className="block text-[11px] font-semibold text-[#91A9B7] mb-1">
            Fair Price Shop Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Hadapsar Ward #4 Fair Price Shop"
            required
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none"
          />
        </div>

        {/* Operator Name */}
        <div>
          <label className="block text-[11px] font-semibold text-[#91A9B7] mb-1">
            Assigned Operator Name *
          </label>
          <input
            type="text"
            value={formData.operatorName}
            onChange={(e) => setFormData({ ...formData, operatorName: e.target.value })}
            placeholder="e.g. Ramesh Patil"
            required
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none"
          />
        </div>

        {/* Beneficiaries Count */}
        <div>
          <label className="block text-[11px] font-semibold text-[#91A9B7] mb-1">
            Allocated Beneficiaries *
          </label>
          <input
            type="number"
            min="1"
            value={formData.allocatedBeneficiaries}
            onChange={(e) => setFormData({ ...formData, allocatedBeneficiaries: parseInt(e.target.value) || 0 })}
            required
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none font-mono"
          />
        </div>

        {/* District */}
        <div>
          <label className="block text-[11px] font-semibold text-[#91A9B7] mb-1">
            District *
          </label>
          <input
            type="text"
            value={formData.district}
            onChange={(e) => setFormData({ ...formData, district: e.target.value })}
            placeholder="e.g. Pune"
            required
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none"
          />
        </div>

        {/* State */}
        <div>
          <label className="block text-[11px] font-semibold text-[#91A9B7] mb-1">
            State *
          </label>
          <input
            type="text"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            placeholder="e.g. Maharashtra"
            required
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none"
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="block text-[11px] font-semibold text-[#91A9B7] mb-1">
          Physical Shop Address *
        </label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="e.g. Shop #12, Market Yard, Hadapsar, Pune - 411028"
          required
          className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none"
        />
      </div>

      {/* Monthly Quota */}
      <div className="p-3 rounded-lg bg-[#06151D] border border-[#00C8FF]/15 space-y-2">
        <label className="block text-[11px] font-semibold text-[#55E5FF]">
          Monthly Statutory Grain Quota (Kg)
        </label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="text-[10px] text-[#91A9B7] block mb-0.5">Wheat (kg)</span>
            <input
              type="number"
              min="0"
              value={formData.monthlyQuotaKg?.wheat || 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  monthlyQuotaKg: {
                    ...formData.monthlyQuotaKg,
                    wheat: parseFloat(e.target.value) || 0,
                  },
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-[#030B10] border border-[#00C8FF]/20 rounded text-[#F1F8FC] font-mono focus:border-[#00C8FF] focus:outline-none"
            />
          </div>
          <div>
            <span className="text-[10px] text-[#91A9B7] block mb-0.5">Rice (kg)</span>
            <input
              type="number"
              min="0"
              value={formData.monthlyQuotaKg?.rice || 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  monthlyQuotaKg: {
                    ...formData.monthlyQuotaKg,
                    rice: parseFloat(e.target.value) || 0,
                  },
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-[#030B10] border border-[#00C8FF]/20 rounded text-[#F1F8FC] font-mono focus:border-[#00C8FF] focus:outline-none"
            />
          </div>
          <div>
            <span className="text-[10px] text-[#91A9B7] block mb-0.5">Coarse (kg)</span>
            <input
              type="number"
              min="0"
              value={formData.monthlyQuotaKg?.coarseGrains || 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  monthlyQuotaKg: {
                    ...formData.monthlyQuotaKg,
                    coarseGrains: parseFloat(e.target.value) || 0,
                  },
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-[#030B10] border border-[#00C8FF]/20 rounded text-[#F1F8FC] font-mono focus:border-[#00C8FF] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2.5 pt-2 border-t border-[#00C8FF]/15">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="sm"
          isLoading={isLoading}
          icon={<Store className="w-3.5 h-3.5" />}
        >
          Publish Shop to Arkiv
        </Button>
      </div>
    </form>
  );
};
