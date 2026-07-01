'use client';
import * as React from 'react';
import { cn } from '~/lib/utils';

interface StudyChartProps {
  data: { day: string; minutes: number }[];
  className?: string;
}

/**
 * Lightweight inline SVG sparkline/bar chart. Avoids recharts dependency
 * for the dashboard hero; the heavier analytics charts will use recharts
 * in their own slice.
 */
export function StudyChart({ data, className }: StudyChartProps) {
  const max = Math.max(1, ...data.map((d) => d.minutes));
  const weekMax = Math.max(...data.slice(-7).map((d) => d.minutes));
  const total = data.reduce((s, d) => s + d.minutes, 0);

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-3xl font-semibold tracking-tight">
            {Math.round(total / 60)}h {total % 60}m
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">Last 14 days · {data.length} days</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--color-muted-foreground)]">7-day peak</p>
          <p className="text-sm font-medium">{weekMax}m</p>
        </div>
      </div>

      <div className="mt-4 flex h-32 items-end gap-1">
        {data.map((d) => {
          const h = (d.minutes / max) * 100;
          const isToday = d.day === new Date().toISOString().slice(5, 10);
          return (
            <div key={d.day} className="group flex flex-1 flex-col items-center gap-1">
              <div className="relative w-full flex-1 overflow-hidden rounded-sm bg-[var(--color-muted)]">
                <div
                  className={cn(
                    'absolute inset-x-0 bottom-0 rounded-sm transition-all',
                    isToday
                      ? 'bg-[var(--color-primary)]'
                      : 'bg-[var(--color-primary)]/40 group-hover:bg-[var(--color-primary)]/70',
                  )}
                  style={{ height: `${h}%`, minHeight: d.minutes > 0 ? '4px' : '0px' }}
                />
                <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-[var(--color-foreground)] px-1.5 py-0.5 text-[10px] text-[var(--color-background)] opacity-0 transition-opacity group-hover:opacity-100">
                  {d.minutes}m
                </div>
              </div>
              <span className="text-[10px] text-[var(--color-muted-foreground)]">{d.day.slice(-2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}