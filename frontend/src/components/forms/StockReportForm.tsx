import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { CreateStockReportInput } from '@/types/api';
import { api } from '@/lib/api';
import { Warehouse, CheckCircle2, AlertCircle, Calculator, Lock } from 'lucide-react';
import { useUserRole } from '@/lib/auth';

interface StockReportFormProps {
  initialShopId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const StockReportForm: React.FC<StockReportFormProps> = ({
  initialShopId = 'FPS-2041',
  onSuccess,
  onCancel,
}) => {
  const { isOperator, shopId: operatorShopId } = useUserRole();

  const [formData, setFormData] = useState<CreateStockReportInput>({
    shopId: isOperator && operatorShopId ? operatorShopId : initialShopId,
    district: 'Raigad',
    reportingPeriod: 'October 2026',
    commodity: 'Wheat',
    openingStockKg: 1200,
    distributedQuantityKg: 8600,
    reportedClosingStockKg: 2480,
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

    if (!formData.shopId.trim()) {
      setError('Fair Price Shop ID is required.');
      return;
    }
    if (formData.openingStockKg < 0) {
      setError('Opening stock cannot be negative.');
      return;
    }
    if (formData.distributedQuantityKg < 0) {
      setError('Distributed quantity cannot be negative.');
      return;
    }
    if (formData.reportedClosingStockKg < 0) {
      setError('Reported closing stock cannot be negative.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.createStockReport(formData);
      setCreatedKey(res.entityKey);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit stock declaration.');
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
          Stock Declaration Submitted!
        </h4>
        <p className="text-xs text-[#91A9B7] max-w-sm mx-auto">
          Inventory declaration audited against receipt inflows and anchored on Arkiv:
        </p>
        <div className="p-2.5 bg-[#06151D] border border-[#3b82f6]/30 rounded-lg text-xs font-mono text-[#60a5fa] break-all">
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

      {/* Formula explanation banner */}
      <div className="p-3 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/20 flex items-start gap-2 text-xs text-[#91A9B7]">
        <Calculator className="w-4 h-4 text-[#3b82f6] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#60a5fa]">Reconciliation Formula:</span>{' '}
          Expected Closing Stock = Opening Stock + Recorded Receipts − Quota Distributed.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-[#91A9B7]">
              Fair Price Shop ID *
            </label>
            {isOperator && operatorShopId && (
              <span className="flex items-center gap-1 text-[10px] text-[#3b82f6] font-mono">
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
                ? 'border-[#3b82f6]/40 bg-[#071B25]/60 cursor-not-allowed text-[#60a5fa] font-mono'
                : 'border-[#3b82f6]/20 focus:border-[#3b82f6]'
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
            Reporting Period
          </label>
          <input
            type="text"
            value={formData.reportingPeriod}
            onChange={(e) => setFormData({ ...formData, reportingPeriod: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none"
            placeholder="e.g. October 2026"
            required
          />
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
            Opening Stock (kg) *
          </label>
          <input
            type="number"
            min="0"
            value={formData.openingStockKg}
            onChange={(e) =>
              setFormData({ ...formData, openingStockKg: Number(e.target.value) })
            }
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            Distributed Quota (kg) *
          </label>
          <input
            type="number"
            min="0"
            value={formData.distributedQuantityKg}
            onChange={(e) =>
              setFormData({ ...formData, distributedQuantityKg: Number(e.target.value) })
            }
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            Physical Count Closing Stock (kg) *
          </label>
          <input
            type="number"
            min="0"
            value={formData.reportedClosingStockKg}
            onChange={(e) =>
              setFormData({ ...formData, reportedClosingStockKg: Number(e.target.value) })
            }
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#3b82f6]/20 rounded-lg text-[#F1F8FC] focus:border-[#3b82f6] focus:outline-none font-semibold text-[#60a5fa]"
            required
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
          icon={<Warehouse className="w-4 h-4" />}
        >
          Submit Stock Declaration
        </Button>
      </div>
    </form>
  );
};
