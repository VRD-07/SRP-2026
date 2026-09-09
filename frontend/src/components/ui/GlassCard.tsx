import React from 'react';
import clsx from 'clsx';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'subtle' | 'glow';
  className?: string;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'default',
  className,
  hoverEffect = false,
  ...props
}) => {
  const variantStyles = {
    default:
      'bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-lg shadow-indigo-950/5 dark:shadow-black/40',
    elevated:
      'bg-white/85 dark:bg-slate-900/75 backdrop-blur-2xl border border-white/80 dark:border-white/15 shadow-xl shadow-indigo-950/10 dark:shadow-black/60',
    subtle:
      'bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-white/5 shadow-sm',
    glow:
      'bg-white/75 dark:bg-slate-900/70 backdrop-blur-xl border border-indigo-500/30 dark:border-indigo-400/20 shadow-xl shadow-indigo-500/10 dark:shadow-indigo-500/15',
  };

  return (
    <div
      className={clsx(
        'rounded-2xl transition-all duration-200 ease-out',
        variantStyles[variant],
        hoverEffect &&
          'hover:-translate-y-0.5 hover:shadow-xl hover:border-indigo-400/40 dark:hover:border-indigo-400/30 hover:bg-white/80 dark:hover:bg-slate-900/70',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
