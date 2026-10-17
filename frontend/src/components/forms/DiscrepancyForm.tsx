'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { CreateDiscrepancyInput } from '@/types/api';
import { api } from '@/lib/api';
import { AlertTriangle, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

interface DiscrepancyFormProps {
  initialDeliveryId?: string;
  initialShopId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const DiscrepancyForm: React.FC<DiscrepancyFormProps> = ({
  initialDeliveryId = '',
  initialShopId = '',
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateDiscrepancyInput>({
    relatedDeliveryId: initialDeliveryId,
    shopId: initialShopId,
    district: 'Raigad',
    reportingPeriod: 'October 2026',
    commodity: 'Wheat',
    category: 'Transit Loss',
    description: '',
    reportedQuantityDiffKg: -50,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.description.trim()) {
      setError('A descriptive narrative of the physical observation is required.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.createDiscrepancy(formData);
      setCreatedCaseId(res.caseId);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit discrepancy report.');
    } finally {
      setIsLoading(false);
    }
  };

  if (createdCaseId) {
    return (
      <div className="py-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#FB7185]/15 border border-[#FB7185]/40 text-[#FB7185] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-[#F1F8FC]">
          Investigation Case Opened!
        </h4>
        <p className="text-xs text-[#91A9B7] max-w-sm mx-auto">
          Discrepancy logged for field audit reconciliation without personal identity data:
        </p>
        <div className="p-2.5 bg-[#06151D] border border-[#FB7185]/30 rounded-lg text-xs font-mono text-[#FB7185] font-bold">
          {createdCaseId}
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

      {/* Privacy Guarantee Note */}
      <div className="p-3 rounded-lg bg-[#071B25] border border-[#00C8FF]/20 flex items-start gap-2 text-xs text-[#91A9B7]">
        <ShieldAlert className="w-4 h-4 text-[#55E5FF] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#55E5FF]">Auditable & Anonymized:</span>{' '}
          Reports target supply-chain grain movement only. Do not provide ration card numbers or beneficiary identities.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            Related Delivery ID (Optional)
          </label>
          <input
            type="text"
            value={formData.relatedDeliveryId}
            onChange={(e) =>
              setFormData({ ...formData, relatedDeliveryId: e.target.value })
            }
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none font-mono"
            placeholder="e.g. DEL-2026-9041"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            Fair Price Shop ID (Optional)
          </label>
          <input
            type="text"
            value={formData.shopId}
            onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none"
            placeholder="e.g. FPS-2041"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            Discrepancy Category
          </label>
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({
                ...formData,
                category: e.target.value as
                  | 'Transit Loss'
                  | 'Weighing Discrepancy'
                  | 'Stock Mismatch'
                  | 'Delayed Receipt',
              })
            }
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none"
          >
            <option value="Transit Loss">Transit Loss (Depot vs Delivery Weight)</option>
            <option value="Weighing Discrepancy">Weighing / Scale Calibration Discrepancy</option>
            <option value="Stock Mismatch">Monthly Declaration Stock Mismatch</option>
            <option value="Delayed Receipt">Delayed Receipt / Unacknowledged Delivery</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            Observed Quantity Variance (kg)
          </label>
          <input
            type="number"
            value={formData.reportedQuantityDiffKg}
            onChange={(e) =>
              setFormData({
                ...formData,
                reportedQuantityDiffKg: Number(e.target.value),
              })
            }
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#FB7185] focus:border-[#00C8FF] focus:outline-none font-semibold"
            placeholder="e.g. -120"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-[#91A9B7] mb-1">
            Factual Description / Audit Observation *
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none placeholder-[#607987]"
            placeholder="State observed weights, seal conditions, scale reading variance, or timing anomalies..."
            required
          />
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
          variant="danger"
          isLoading={isLoading}
          icon={<AlertTriangle className="w-4 h-4" />}
        >
          Flag Discrepancy for Audit
        </Button>
      </div>
    </form>
  );
};
