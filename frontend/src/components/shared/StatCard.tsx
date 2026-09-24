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
    indigo: 'bg-olive-500/15 text-olive-800 border-olive-500/25',
    emerald: 'bg-olive-600/15 text-olive-800 border-olive-600/25',
    rose: 'bg-terracotta/15 text-terracotta border-terracotta/25',
    amber: 'bg-gold/15 text-gold-700 border-gold/25',
    cyan: 'bg-spruce/15 text-spruce-700 border-spruce/25',
    purple: 'bg-stone-500/15 text-stone-700 border-stone-500/25',
  };

  return (
    <GlassCard variant="default" hoverEffect className="p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            {title}
          </p>
          <h3 className="text-2xl font-extrabold text-charcoal mt-1.5 tracking-tight">
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
        <div className="mt-3 pt-3 border-t border-olive-500/15 flex items-center justify-between text-xs">
          {subtitle && (
            <span className="text-muted font-medium">{subtitle}</span>
          )}
          {trend && (
            <span className="text-olive-700 font-semibold">{trend}</span>
          )}
        </div>
      )}
    </GlassCard>
  );
};
