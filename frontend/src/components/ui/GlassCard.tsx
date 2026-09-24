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
      'bg-white/68 backdrop-blur-xl border border-white/70 shadow-glass',
    elevated:
      'bg-white/88 backdrop-blur-2xl border border-white/90 shadow-glassElevated',
    subtle:
      'bg-white/50 backdrop-blur-md border border-olive-500/15 shadow-glassSm',
    glow:
      'bg-white/75 backdrop-blur-xl border border-olive-500/30 shadow-glassGlow',
  };

  return (
    <div
      className={clsx(
        'rounded-2xl transition-all duration-200 ease-out',
        variantStyles[variant],
        hoverEffect &&
          'hover:-translate-y-0.5 hover:shadow-glassElevated hover:border-olive-500/35 hover:bg-white/80 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
