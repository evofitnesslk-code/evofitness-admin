'use client';

import { useState } from 'react';
import { formatLKR } from '@/lib/utils';

interface ChartItem {
  label: string;
  total: number;
  cash: number;
  card: number;
  bank: number;
  count: number;
}

interface RevenueBarChartProps {
  title: string;
  subtitle: string;
  data: ChartItem[];
}

export function RevenueBarChart({ title, subtitle, data }: RevenueBarChartProps) {
  const [hoveredItem, setHoveredItem] = useState<ChartItem | null>(null);

  if (!data || data.length === 0) {
    return null;
  }

  // Calculate maximum value for scale (ensure min 10,000 for aesthetics)
  const maxVal = Math.max(...data.map((d) => d.total), 10000);

  return (
    <div className="card-luxury rounded-2xl p-5 bg-[#121214] border border-[#27272A] space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#F4F4F5]">
            {title}
          </h3>
          <p className="text-[11px] text-[#A1A1AA]">{subtitle}</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] font-medium text-[#A1A1AA]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" /> Cash
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#E5B842]" /> Card
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]" /> Bank
          </span>
        </div>
      </div>

      {/* Bar Chart Area */}
      <div className="relative pt-6 pb-2">
        {/* Tooltip Overlay */}
        {hoveredItem && (
          <div className="absolute top-0 right-0 z-20 px-3 py-1.5 rounded-lg bg-[#18181B] border border-[#E5B842]/40 text-xs shadow-xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="font-semibold text-[#F4F4F5]">{hoveredItem.label}</span>
              <span className="font-bold text-[#E5B842]">{formatLKR(hoveredItem.total)}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-[#A1A1AA]">
              <span>Cash: <strong className="text-[#10B981]">{formatLKR(hoveredItem.cash)}</strong></span>
              <span>Card: <strong className="text-[#E5B842]">{formatLKR(hoveredItem.card)}</strong></span>
              <span>Bank: <strong className="text-[#3B82F6]">{formatLKR(hoveredItem.bank)}</strong></span>
            </div>
          </div>
        )}

        {/* Chart Bars Container */}
        <div className="h-44 w-full flex items-end gap-2 sm:gap-3 px-2 border-b border-[#27272A] relative">
          {/* Subtle Gridlines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
            <div className="border-b border-[#3F3F46] w-full" />
            <div className="border-b border-[#3F3F46] w-full" />
            <div className="border-b border-[#3F3F46] w-full" />
          </div>

          {data.map((item, idx) => {
            const heightPercent = Math.max(4, Math.round((item.total / maxVal) * 100));
            const cashRatio = item.total > 0 ? (item.cash / item.total) * 100 : 0;
            const cardRatio = item.total > 0 ? (item.card / item.total) * 100 : 0;
            const bankRatio = item.total > 0 ? (item.bank / item.total) * 100 : 0;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredItem(item)}
                onMouseLeave={() => setHoveredItem(null)}
                className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
              >
                {/* Stacked Bar */}
                <div
                  className="w-full max-w-[36px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all duration-200 group-hover:brightness-125 group-hover:scale-y-[1.02] origin-bottom shadow-lg"
                  style={{ height: `${heightPercent}%` }}
                >
                  <div
                    style={{ height: `${cashRatio}%` }}
                    className="w-full bg-[#10B981]"
                    title={`Cash: ${formatLKR(item.cash)}`}
                  />
                  <div
                    style={{ height: `${cardRatio}%` }}
                    className="w-full bg-[#E5B842]"
                    title={`Card: ${formatLKR(item.card)}`}
                  />
                  <div
                    style={{ height: `${bankRatio}%` }}
                    className="w-full bg-[#3B82F6]"
                    title={`Bank: ${formatLKR(item.bank)}`}
                  />
                </div>

                {/* X-Axis Label */}
                <span className="text-[9px] text-[#71717A] mt-2 truncate max-w-full group-hover:text-[#F4F4F5] transition-colors">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
