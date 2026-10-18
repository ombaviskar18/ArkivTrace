'use client';

import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="w-full space-y-3 animate-pulse">
      <div className="h-9 bg-[#071B25] border border-[#3b82f6]/10 rounded-lg w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 bg-[#071B25]/60 border border-[#3b82f6]/10 rounded-lg w-full flex items-center px-4 justify-between"
        >
          <div className="h-4 bg-[#3b82f6]/10 rounded w-1/4" />
          <div className="h-4 bg-[#3b82f6]/10 rounded w-1/6" />
          <div className="h-4 bg-[#3b82f6]/10 rounded w-1/6" />
          <div className="h-6 bg-[#3b82f6]/15 rounded-full w-20" />
        </div>
      ))}
    </div>
  );
};
