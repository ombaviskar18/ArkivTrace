'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { api } from '@/lib/api';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Clock,
  Shield,
  Smartphone,
} from 'lucide-react';

interface TelegramStatus {
  isLinked: boolean;
  telegramChatId: string | null;
  role: string;
  assignedShopIds: string[];
}

export const TelegramLinkCard: React.FC = () => {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [codeData, setCodeData] = useState<{
    code: string;
    expiresAt: string;
    instructions: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    setError(null);
    try {
      const data = await api.getTelegramStatus();
      setStatus(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve Telegram status';
      setError(msg);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleGenerateCode = async () => {
    setGenerating(true);
    setError(null);
    try {
      const data = await api.getTelegramLinkCode();
      setCodeData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate link code';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const botUsername = 'ArkivTraceAlert_Bot';
  const telegramBotUrl = `https://t.me/${botUsername}`;

  return (
    <Card elevated title="Telegram Dispatch Alerts & Push Notifications">
      <div className="space-y-4 text-xs">
        <p className="text-[#91A9B7] leading-relaxed">
          Link your Telegram chat with your verified ArkivTrace role to receive real-time dispatch alerts, 
          discrepancy reports, and confirmation reminders directly on your mobile device.
        </p>

        {/* Current Connection Status */}
        <div className="p-3.5 rounded-xl bg-[#06151D] border border-[#00C8FF]/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[#91A9B7] flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#00C8FF]" />
              Connection Status:
            </span>
            {loadingStatus ? (
              <span className="text-[#91A9B7] animate-pulse">Checking...</span>
            ) : status?.isLinked ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#36D399]/15 text-[#36D399] border border-[#36D399]/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Linked (Chat ID: {status.telegramChatId})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                <AlertCircle className="w-3.5 h-3.5" />
                Not Connected
              </span>
            )}
          </div>

          {status?.isLinked && (
            <div className="pt-2 border-t border-[#00C8FF]/10 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[#91A9B7]">Verified Role:</span>{' '}
                <span className="text-[#55E5FF] font-semibold capitalize">{status.role}</span>
              </div>
              {status.assignedShopIds && status.assignedShopIds.length > 0 && (
                <div>
                  <span className="text-[#91A9B7]">Assigned Shop:</span>{' '}
                  <span className="text-[#F1F8FC] font-mono">{status.assignedShopIds.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-[#91A9B7] pt-1">
            <span>Bot Username:</span>
            <a
              href={telegramBotUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#00C8FF] hover:underline flex items-center gap-1 font-mono"
            >
              @{botUsername}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3 rounded-lg bg-[#FF5861]/10 border border-[#FF5861]/30 text-[#FF5861] text-xs">
            {error}
          </div>
        )}

        {/* Active Link Code Box */}
        {codeData && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#071E2D] to-[#041018] border border-[#00C8FF]/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F1F8FC] flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#00C8FF]" />
                Your One-Time Link Code
              </span>
              <span className="text-[11px] text-[#91A9B7] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#F59E0B]" />
                Valid for 15 mins
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#030B10] p-3 rounded-lg border border-[#00C8FF]/30">
              <div className="font-mono text-2xl font-black tracking-widest text-[#00C8FF]">
                {codeData.code}
              </div>
              <CopyButton textToCopy={`/link ${codeData.code}`} label="Copy /link" />
            </div>

            <div className="space-y-1 text-[11px] text-[#91A9B7] leading-relaxed">
              <p className="font-semibold text-[#F1F8FC]">Instructions:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Open Telegram and search for{' '}
                  <a
                    href={telegramBotUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#00C8FF] underline inline-flex items-center gap-0.5"
                  >
                    @{botUsername}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </li>
                <li>
                  Send the message:{' '}
                  <code className="text-[#55E5FF] font-mono bg-[#06151D] px-1.5 py-0.5 rounded border border-[#00C8FF]/20">
                    /link {codeData.code}
                  </code>
                </li>
                <li>Once the bot confirms, click the button below to verify connection.</li>
              </ol>
            </div>

            <div className="pt-2 flex gap-2">
              <a
                href={telegramBotUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center py-2 px-3 text-xs font-semibold rounded-lg bg-[#00C8FF] text-[#02090D] hover:brightness-110 flex items-center justify-center gap-1.5 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                Open Bot in Telegram
              </a>
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchStatus}
                isLoading={loadingStatus}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Verify Connection
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={handleGenerateCode}
            isLoading={generating}
            icon={<Send className="w-4 h-4" />}
            className="flex-1"
          >
            {codeData ? 'Generate New Code' : 'Generate Telegram Link Code'}
          </Button>

          <Button
            variant="outline"
            onClick={fetchStatus}
            isLoading={loadingStatus}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh Status
          </Button>
        </div>
      </div>
    </Card>
  );
};
