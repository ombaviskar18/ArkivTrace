'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  glow?: boolean;
  headerAction?: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  elevated = false,
  glow = false,
  title,
  subtitle,
  headerAction,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`rounded-xl transition-all duration-300 relative overflow-hidden ${
        elevated ? 'glass-panel-elevated' : 'glass-panel'
      } ${glow ? 'glow-cyan-sm' : ''} ${className}`}
      {...props}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#3b82f6]/15">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-[#F1F8FC] tracking-wide">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-[#91A9B7] mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};
