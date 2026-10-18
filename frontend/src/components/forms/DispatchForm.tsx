import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { CreateDispatchInput, Shop } from '@/types/api';
import { api } from '@/lib/api';
import { Truck, CheckCircle2, AlertCircle, ShieldAlert, Store } from 'lucide-react';
import { useUserRole } from '@/lib/auth';

interface DispatchFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const DispatchForm: React.FC<DispatchFormProps> = ({ onSuccess, onCancel }) => {
  const { role, isAdmin } = useUserRole();
  const [formData, setFormData] = useState<CreateDispatchInput>({
    deliveryId: 'DEL-2026-8492',
    depotId: 'DEP-FCI-04',
    destinationShopId: '',
    district: 'Raigad',
    reportingPeriod: 'October 2026',
    commodity: 'Wheat',
    quantityKg: 10000,
    truckNumber: 'MH-06-BW-4821',
    sealNumber: 'SEAL-ARK-9421',
  });

  const [availableShops, setAvailableShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadShops() {
      try {
        const list = await api.getShops();
        if (isMounted && list.length > 0) {
          setAvailableShops(list);
          setFormData((prev) => ({
            ...prev,
            destinationShopId: prev.destinationShopId || list[0].shopId,
            district: list[0].district || prev.district,
          }));
        }
      } catch (err) {
        console.warn('Failed to load shops for dispatch form dropdown:', err);
      } finally {
        if (isMounted) setLoadingShops(false);
      }
    }
    loadShops();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.deliveryId.trim()) {
      setError('Delivery ID is required.');
      return;
    }
    if (!formData.depotId.trim()) {
      setError('Depot ID is required.');
      return;
    }
    if (!formData.destinationShopId.trim()) {
      setError('Destination Fair Price Shop ID is required.');
      return;
    }
    if (!formData.quantityKg || formData.quantityKg <= 0) {
      setError('Quantity must be a positive integer in kilograms.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.createDispatch(formData);
      setCreatedKey(res.entityKey);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create dispatch record.');
    } finally {
      setIsLoading(false);
    }
  };

  if (createdKey) {
    return (
      <div className="py-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#36D399]/15 border border-[#36D399]/40 text-[#36D399] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-[#F1F8FC]">
          Dispatch Recorded Successfully!
        </h4>
        <p className="text-xs text-[#91A9B7] max-w-sm mx-auto">
          Consignment anchored with synthetic Arkiv evidence key:
        </p>
        <div className="p-2.5 bg-[#06151D] border border-[#3b82f6]/30 rounded-lg text-xs font-mono text-[#60a5fa] break-all">
          {createdKey}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isAdmin && (
        <div className="p-3 rounded-lg bg-[#FB7185]/15 border border-[#FB7185]/30 text-xs text-[#FB7185] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            Civil Supplies Officer credentials required. You are currently authenticated as{' '}
            <strong className="uppercase font-mono text-[#F1F8FC]">{role}</strong>. Creating grain dispatches is restricted to Admins.
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-[#FB7185]/15 border border-[#FB7185]/30 text-xs text-[#FB7185] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            Delivery ID *
          </label>
          <input
            type="text"
            value={formData.deliveryId}
            onChange={(e) => setFormData({ ...formData, deliveryId: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none"
            placeholder="e.g. DEL-2026-9041"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            Origin Depot ID *
          </label>
          <input
            type="text"
            value={formData.depotId}
            onChange={(e) => setFormData({ ...formData, depotId: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none"
            placeholder="e.g. DEP-FCI-04"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1 flex items-center justify-between">
            <span>Destination Shop *</span>
            {loadingShops ? (
              <span className="text-[10px] text-[#607987]">Loading shops...</span>
            ) : availableShops.length > 0 ? (
              <span className="text-[10px] text-[#36D399] font-mono">{availableShops.length} Registered</span>
            ) : null}
          </label>
          {availableShops.length > 0 ? (
            <select
              value={formData.destinationShopId}
              onChange={(e) => {
                const selectedId = e.target.value;
                const found = availableShops.find((s) => s.shopId === selectedId);
                setFormData((prev) => ({
                  ...prev,
                  destinationShopId: selectedId,
                  district: found?.district || prev.district,
                }));
              }}
              className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none"
              required
            >
              <option value="">-- Select Destination Shop --</option>
              {availableShops.map((s) => (
                <option key={s.shopId} value={s.shopId}>
                  {s.name} ({s.shopId}) — {s.district} [{s.operatorName}]
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={formData.destinationShopId}
              onChange={(e) => setFormData({ ...formData, destinationShopId: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none font-mono"
              placeholder="e.g. FPS-2041"
              required
            />
          )}
          {formData.destinationShopId && (
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#60a5fa] font-mono">
              <Store className="w-3 h-3 text-[#3b82f6]" />
              <span>Selected ID: <strong>{formData.destinationShopId}</strong></span>
              {availableShops.find((s) => s.shopId === formData.destinationShopId)?.operatorEmail && (
                <span className="text-[#91A9B7]">
                  • Dealer: {availableShops.find((s) => s.shopId === formData.destinationShopId)?.operatorEmail}
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            District
          </label>
          <select
            value={formData.district}
            onChange={(e) => setFormData({ ...formData, district: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none"
          >
            <option value="Raigad">Raigad</option>
            <option value="Pune Central">Pune Central</option>
            <option value="Nashik North">Nashik North</option>
            <option value="Thane Rural">Thane Rural</option>
            <option value="Nagpur East">Nagpur East</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            Commodity
          </label>
          <select
            value={formData.commodity}
            onChange={(e) =>
              setFormData({
                ...formData,
                commodity: e.target.value as 'Wheat' | 'Rice' | 'Coarse Grains' | 'Pulses',
              })
            }
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none"
          >
            <option value="Wheat">Wheat</option>
            <option value="Rice">Rice</option>
            <option value="Coarse Grains">Coarse Grains</option>
            <option value="Pulses">Pulses</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            Quantity (Kilograms) *
          </label>
          <input
            type="number"
            min="10"
            step="10"
            value={formData.quantityKg}
            onChange={(e) => setFormData({ ...formData, quantityKg: Number(e.target.value) })}
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none"
            placeholder="e.g. 10000"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            Truck Transport #
          </label>
          <input
            type="text"
            value={formData.truckNumber}
            onChange={(e) => setFormData({ ...formData, truckNumber: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none"
            placeholder="e.g. MH-06-BW-4821"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            Security Seal ID
          </label>
          <input
            type="text"
            value={formData.sealNumber}
            onChange={(e) => setFormData({ ...formData, sealNumber: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none"
            placeholder="e.g. SEAL-ARK-9812"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#3b82f6]/15">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          disabled={!isAdmin || isLoading}
          icon={<Truck className="w-4 h-4" />}
        >
          {isAdmin ? 'Anchor Depot Dispatch' : 'Officer Authorization Required'}
        </Button>
      </div>
    </form>
  );
};
