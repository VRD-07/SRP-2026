import React from 'react';
import clsx from 'clsx';

interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'purple' | 'cyan';
  size?: 'sm' | 'md';
  className?: string;
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className,
}) => {
  const variantStyles = {
    success:
      'bg-olive-500/15 text-olive-800 border-olive-500/30',
    danger:
      'bg-terracotta/15 text-terracotta-700 border-terracotta/30',
    warning:
      'bg-gold/15 text-gold-700 border-gold/30',
    info:
      'bg-spruce/15 text-spruce-700 border-spruce/30',
    purple:
      'bg-stone-500/15 text-stone-700 border-stone-500/30',
    cyan:
      'bg-spruce/15 text-spruce-700 border-spruce/30',
    neutral:
      'bg-muted/15 text-charcoal border-muted/30',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] font-medium tracking-wide rounded-lg',
    md: 'px-2.5 py-1 text-xs font-semibold tracking-wide rounded-xl',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 border backdrop-blur-sm select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};
