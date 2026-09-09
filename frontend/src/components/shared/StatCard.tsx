import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'purple';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'indigo',
  trend,
}) => {
  const iconBgStyles = {
    indigo: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20',
    amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
    cyan: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    purple: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20',
  };

  return (
    <GlassCard variant="default" hoverEffect className="p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5 tracking-tight">
            {value}
          </h3>
        </div>
        <div
          className={clsx(
            'w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs',
            iconBgStyles[variant]
          )}
        >
          {icon}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-xs">
          {subtitle && (
            <span className="text-slate-500 dark:text-slate-400 font-medium">{subtitle}</span>
          )}
          {trend && (
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{trend}</span>
          )}
        </div>
      )}
    </GlassCard>
  );
};
