import React from 'react';
import clsx from 'clsx';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-charcoal">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-muted">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={clsx(
              'w-full px-3.5 py-2.5 text-sm rounded-xl transition-all duration-150 ease-out',
              'bg-white/70 backdrop-blur-md',
              'text-charcoal placeholder-muted/60',
              'border border-olive-500/20',
              'focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-600 focus:bg-white/95',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-terracotta/70 focus:border-terracotta focus:ring-terracotta/20',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-terracotta font-medium pl-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-muted pl-1">{helperText}</p>}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';
