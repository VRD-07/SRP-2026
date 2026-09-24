import React from 'react';
import clsx from 'clsx';
import { GlassCard } from './GlassCard';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  mobilePriority?: boolean; // If true, highlighted on mobile card
}

interface GlassTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function GlassTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found.',
  isLoading = false,
}: GlassTableProps<T>) {
  if (isLoading) {
    return (
      <GlassCard className="p-12 text-center">
        <div className="inline-flex items-center gap-3 text-sm text-muted">
          <div className="w-5 h-5 border-2 border-olive-600 border-t-transparent rounded-full animate-spin"></div>
          Loading records from database...
        </div>
      </GlassCard>
    );
  }

  if (data.length === 0) {
    return (
      <GlassCard className="p-12 text-center">
        <p className="text-sm font-medium text-muted">{emptyMessage}</p>
      </GlassCard>
    );
  }

  return (
    <div>
      {/* Desktop & Tablet Table View */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/65 glass-panel shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-olive-500/15 bg-olive-50/70 text-xs uppercase tracking-wider font-semibold text-muted">
              {columns.map((col) => (
                <th key={col.key} className={clsx('px-4 py-3.5', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-olive-500/10">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className="hover:bg-white/60 transition-colors duration-150"
              >
                {columns.map((col) => (
                  <td key={col.key} className={clsx('px-4 py-3.5 text-charcoal', col.className)}>
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Glass Cards View */}
      <div className="md:hidden space-y-3">
        {data.map((item) => (
          <GlassCard key={keyExtractor(item)} variant="default" className="p-4 space-y-2.5 bg-white/70 border border-white/80">
            {columns.map((col) => (
              <div key={col.key} className="flex items-start justify-between text-xs gap-3">
                <span className="font-semibold uppercase tracking-wider text-muted min-w-[90px]">
                  {col.header}
                </span>
                <div className="text-right text-charcoal font-medium break-all">
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </div>
              </div>
            ))}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
