'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface BreakdownItem {
  name: string;
  value: number;
  color: string;
}

interface ReconciliationChartProps {
  data: BreakdownItem[];
}

export const ReconciliationChart: React.FC<ReconciliationChartProps> = ({ data }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 h-64 sm:h-72">
      <div className="relative w-48 h-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={{
                backgroundColor: '#071B25',
                borderColor: 'rgba(59, 130, 246,  0.3)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#F1F8FC',
              }}
              formatter={(value: any) => [`${value} Records`, 'Count']}
            />
            <Pie
              data={data}
              innerRadius={55}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-[#F1F8FC] tracking-tight">
            {total}
          </span>
          <span className="text-[10px] text-[#91A9B7] uppercase font-semibold">
            Evaluated
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2.5 w-full">
        {data.map((item) => {
          const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
          return (
            <div
              key={item.name}
              className="flex items-center justify-between p-2 rounded-lg bg-[#06151D]/60 border border-[#3b82f6]/10 text-xs"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[#91A9B7] font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#F1F8FC]">{item.value}</span>
                <span className="text-[10px] text-[#607987]">({percent}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
