'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  textToCopy: string;
  label?: string;
  showTextPreview?: boolean;
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  textToCopy,
  label,
  showTextPreview = false,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      title="Copy to clipboard"
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono rounded bg-[#071B25] border border-[#3b82f6]/20 text-[#91A9B7] hover:text-[#60a5fa] hover:border-[#3b82f6]/50 transition-all ${className}`}
    >
      {showTextPreview && (
        <span className="truncate max-w-[140px] text-[11px] text-[#60a5fa]">
          {textToCopy}
        </span>
      )}
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-[#36D399]" />
          <span className="text-[10px] text-[#36D399] font-sans font-medium">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          {label && <span className="font-sans text-[11px]">{label}</span>}
        </>
      )}
    </button>
  );
};
