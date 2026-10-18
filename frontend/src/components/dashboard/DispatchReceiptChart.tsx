'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface ChartDataPoint {
  date: string;
  dispatchedKg: number;
  receivedKg: number;
}

interface DispatchReceiptChartProps {
  data: ChartDataPoint[];
}

export const DispatchReceiptChart: React.FC<DispatchReceiptChartProps> = ({ data }) => {
  return (
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
        >
          <defs>
            <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(59, 130, 246,  0.08)"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            stroke="#607987"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'rgba(59, 130, 246,  0.15)' }}
          />
          <YAxis
            stroke="#607987"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'rgba(59, 130, 246,  0.15)' }}
            tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: '#071B25',
              borderColor: 'rgba(59, 130, 246,  0.3)',
              borderRadius: '8px',
              fontSize: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              color: '#F1F8FC',
            }}
            formatter={(value: any, name: any) => [
              `${Number(value).toLocaleString('en-IN')} kg`,
              name === 'dispatchedKg' ? 'Dispatched' : 'Received',
            ]}
            labelFormatter={(label) => `Cycle: ${label}`}
          />

          <Area
            type="monotone"
            dataKey="dispatchedKg"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#cyanGradient)"
            name="dispatchedKg"
          />
          <Area
            type="monotone"
            dataKey="receivedKg"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="4 4"
            fillOpacity={1}
            fill="url(#blueGradient)"
            name="receivedKg"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
