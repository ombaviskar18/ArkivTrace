import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { CreateReceiptInput } from '@/types/api';
import { api } from '@/lib/api';
import { PackageCheck, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { useUserRole } from '@/lib/auth';

interface ReceiptFormProps {
  initialDeliveryId?: string;
  initialShopId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ReceiptForm: React.FC<ReceiptFormProps> = ({
  initialDeliveryId = 'DEL-2026-9044',
  initialShopId = 'FPS-4402',
  onSuccess,
  onCancel,
}) => {
  const { isOperator, shopId: operatorShopId } = useUserRole();

  const [formData, setFormData] = useState<CreateReceiptInput>({
    deliveryId: initialDeliveryId,
    shopId: isOperator && operatorShopId ? operatorShopId : initialShopId,
    district: 'Thane Rural',
    reportingPeriod: 'October 2026',
    commodity: 'Wheat',
    receivedQuantityKg: 12500,
    receivedTimestamp: new Date().toISOString().slice(0, 16),
    conditionStatus: 'Good',
  });

  useEffect(() => {
    if (isOperator && operatorShopId) {
      setFormData((prev) => ({ ...prev, shopId: operatorShopId }));
    }
  }, [isOperator, operatorShopId]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.deliveryId.trim()) {
      setError('Associated delivery ID is required.');
      return;
    }
    if (!formData.shopId.trim()) {
      setError('Fair Price Shop ID is required.');
      return;
    }
    if (!formData.receivedQuantityKg || formData.receivedQuantityKg <= 0) {
      setError('Received quantity must be a positive integer in kilograms.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.createReceipt(formData);
      setCreatedKey(res.entityKey);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record shop receipt.');
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
          Shop Receipt Acknowledged!
        </h4>
        <p className="text-xs text-[#91A9B7] max-w-sm mx-auto">
          Weighed quantity reconciled with depot consignment and logged to Arkiv:
        </p>
        <div className="p-2.5 bg-[#06151D] border border-[#00C8FF]/30 rounded-lg text-xs font-mono text-[#55E5FF] break-all">
          {createdKey}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-[#FB7185]/15 border border-[#FB7185]/30 text-xs text-[#FB7185] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            Associated Delivery ID *
          </label>
          <input
            type="text"
            value={formData.deliveryId}
            onChange={(e) => setFormData({ ...formData, deliveryId: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none font-mono"
            placeholder="e.g. DEL-2026-9041"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-[#91A9B7]">
              Fair Price Shop ID *
            </label>
            {isOperator && operatorShopId && (
              <span className="flex items-center gap-1 text-[10px] text-[#00C8FF] font-mono">
                <Lock className="w-2.5 h-2.5" /> Authenticated Assignment
              </span>
            )}
          </div>
          <input
            type="text"
            value={formData.shopId}
            onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
            disabled={isOperator && Boolean(operatorShopId)}
            className={`w-full px-3 py-2 text-xs bg-[#06151D] border rounded-lg text-[#F1F8FC] focus:outline-none ${
              isOperator && operatorShopId
                ? 'border-[#00C8FF]/40 bg-[#071B25]/60 cursor-not-allowed text-[#55E5FF] font-mono'
                : 'border-[#00C8FF]/20 focus:border-[#00C8FF]'
            }`}
            placeholder="e.g. FPS-2041"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            District
          </label>
          <select
            value={formData.district}
            onChange={(e) => setFormData({ ...formData, district: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none"
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
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none"
          >
            <option value="Wheat">Wheat</option>
            <option value="Rice">Rice</option>
            <option value="Coarse Grains">Coarse Grains</option>
            <option value="Pulses">Pulses</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            Weighed Received Quantity (kg) *
          </label>
          <input
            type="number"
            min="10"
            step="1"
            value={formData.receivedQuantityKg}
            onChange={(e) =>
              setFormData({ ...formData, receivedQuantityKg: Number(e.target.value) })
            }
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none"
            placeholder="e.g. 9880"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            Grain Condition Status
          </label>
          <select
            value={formData.conditionStatus}
            onChange={(e) =>
              setFormData({
                ...formData,
                conditionStatus: e.target.value as 'Good' | 'Damaged Packaging' | 'Moisture Detected',
              })
            }
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none"
          >
            <option value="Good">Good (Intact Seal & Dry)</option>
            <option value="Damaged Packaging">Damaged Packaging</option>
            <option value="Moisture Detected">Moisture Detected</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#00C8FF]/15">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          icon={<PackageCheck className="w-4 h-4" />}
        >
          Acknowledge Shop Receipt
        </Button>
      </div>
    </form>
  );
};
