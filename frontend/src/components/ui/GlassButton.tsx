import React from 'react';
import clsx from 'clsx';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs font-medium rounded-xl gap-1.5',
    md: 'px-4 py-2 text-sm font-semibold rounded-xl gap-2',
    lg: 'px-5 py-2.5 text-base font-semibold rounded-2xl gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-olive-600 to-olive-700 hover:from-olive-700 hover:to-olive-800 text-white shadow-sm hover:shadow-md hover:shadow-olive-600/20 border border-olive-500/30',
    secondary:
      'bg-white/70 backdrop-blur-md text-charcoal hover:bg-white/95 border border-olive-600/20 shadow-glassSm',
    danger:
      'bg-terracotta hover:bg-terracotta-600 text-white shadow-sm border border-terracotta/30',
    success:
      'bg-olive-700 hover:bg-olive-800 text-white shadow-sm border border-olive-600/30',
    ghost:
      'bg-transparent hover:bg-olive-500/10 text-charcoal',
    outline:
      'bg-transparent border border-olive-600 text-olive-700 hover:bg-olive-500/10',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-all duration-150 ease-out select-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
