'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import {
  Settings as SettingsIcon,
  RotateCcw,
  Sliders,
  Database,
  ShieldCheck,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const [pageSize, setPageSize] = useState('10');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [resetDone, setResetDone] = useState(false);

  const handleResetData = () => {
    api.resetDemoData();
    setResetDone(true);
    setTimeout(() => setResetDone(false), 2500);
  };

  return (
    <AppShell>
      {/* Header */}
      <div className="pb-2">
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#F1F8FC]">
          Preferences & <span className="text-[#00C8FF]">Settings</span>
        </h2>
        <p className="text-xs text-[#91A9B7] mt-1">
          Configure table display properties, inspect environment configuration, and manage demonstration datasets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Display Settings */}
        <Card elevated title="Interface & Table Preferences">
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-[#91A9B7] mb-1.5">
                Default Table Page Size
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#06151D] border border-[#00C8FF]/20 rounded-lg text-[#F1F8FC] focus:border-[#00C8FF] focus:outline-none"
              >
                <option value="10">10 records per page</option>
                <option value="25">25 records per page</option>
                <option value="50">50 records per page</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#91A9B7] mb-1.5">
                Row Density
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDensity('comfortable')}
                  className={`p-2.5 rounded-lg border text-center font-medium transition-all ${
                    density === 'comfortable'
                      ? 'bg-[#00C8FF]/15 border-[#00C8FF]/50 text-[#55E5FF]'
                      : 'bg-[#06151D] border-[#00C8FF]/15 text-[#91A9B7]'
                  }`}
                >
                  Comfortable
                </button>
                <button
                  type="button"
                  onClick={() => setDensity('compact')}
                  className={`p-2.5 rounded-lg border text-center font-medium transition-all ${
                    density === 'compact'
                      ? 'bg-[#00C8FF]/15 border-[#00C8FF]/50 text-[#55E5FF]'
                      : 'bg-[#06151D] border-[#00C8FF]/15 text-[#91A9B7]'
                  }`}
                >
                  Compact
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Demo Data Management */}
        <Card elevated title="Demonstration Data Engine">
          <div className="space-y-4 text-xs">
            <p className="text-[#91A9B7] leading-relaxed">
              ArkivTrace is currently running in synthetic demonstration mode with client-side persistence. You can reset the dataset back to its default seed values at any time.
            </p>

            <div className="p-3.5 rounded-xl bg-[#06151D] border border-[#00C8FF]/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#91A9B7]">Data Mode:</span>
                <span className="font-semibold text-[#55E5FF]">Client LocalStorage Cache</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#91A9B7]">Network:</span>
                <span className="font-mono text-[#F1F8FC]">Arkiv Tiramisu (#8291)</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleResetData}
              icon={
                resetDone ? (
                  <Check className="w-4 h-4 text-[#36D399]" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )
              }
              className="w-full"
            >
              {resetDone ? 'Demo Data Restored!' : 'Reset Demo Data to Initial Seed'}
            </Button>
          </div>
        </Card>

        {/* Architecture & Security Principles */}
        <div className="md:col-span-2">
          <Card elevated title="Public Food Security Architecture Principles">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#91A9B7]">
              <div className="p-4 rounded-xl bg-[#06151D] border border-[#00C8FF]/15">
                <h5 className="font-bold text-[#F1F8FC] mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#36D399]" />
                  Zero Personal Data
                </h5>
                <p className="leading-relaxed">
                  Never collects beneficiary names or ration card numbers. Only tracks grain weights and shop quotas.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#06151D] border border-[#00C8FF]/15">
                <h5 className="font-bold text-[#F1F8FC] mb-1 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-[#00C8FF]" />
                  Secure Backend Signer
                </h5>
                <p className="leading-relaxed">
                  Blockchain private keys remain strictly in the secure Express backend service, never exposed to the frontend.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#06151D] border border-[#00C8FF]/15">
                <h5 className="font-bold text-[#F1F8FC] mb-1 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#55E5FF]" />
                  Objective Variances
                </h5>
                <p className="leading-relaxed">
                  Discrepancies indicate quantities warranting audit and weighbridge calibration, not automatic allegations of fraud.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
