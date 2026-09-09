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
        <div className="inline-flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          Loading records from database...
        </div>
      </GlassCard>
    );
  }

  if (data.length === 0) {
    return (
      <GlassCard className="p-12 text-center">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      </GlassCard>
    );
  }

  return (
    <div>
      {/* Desktop & Tablet Table View */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/50 dark:border-white/10 glass-panel shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200/60 dark:border-white/10 bg-slate-100/50 dark:bg-slate-800/40 text-xs uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-300">
              {columns.map((col) => (
                <th key={col.key} className={clsx('px-4 py-3.5', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/50 dark:divide-white/5">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors duration-150"
              >
                {columns.map((col) => (
                  <td key={col.key} className={clsx('px-4 py-3.5 text-slate-800 dark:text-slate-200', col.className)}>
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
          <GlassCard key={keyExtractor(item)} variant="default" className="p-4 space-y-2.5">
            {columns.map((col) => (
              <div key={col.key} className="flex items-start justify-between text-xs gap-3">
                <span className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 min-w-[90px]">
                  {col.header}
                </span>
                <div className="text-right text-slate-900 dark:text-slate-100 font-medium break-all">
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
