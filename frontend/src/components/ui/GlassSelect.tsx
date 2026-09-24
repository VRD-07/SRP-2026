import React from 'react';
import clsx from 'clsx';

interface Option {
  value: string;
  label: string;
}

interface GlassSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  error?: string;
  helperText?: string;
}

export const GlassSelect = React.forwardRef<HTMLSelectElement, GlassSelectProps>(
  ({ label, options, error, helperText, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wider text-charcoal">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={clsx(
              'w-full px-3.5 py-2.5 text-sm rounded-xl appearance-none transition-all duration-150 ease-out cursor-pointer',
              'bg-white/70 backdrop-blur-md',
              'text-charcoal',
              'border border-olive-500/20',
              'focus:outline-none focus:ring-2 focus:ring-olive-500/20 focus:border-olive-600 focus:bg-white/95',
              'disabled:opacity-50 disabled:cursor-not-allowed pr-10',
              error && 'border-terracotta/70 focus:border-terracotta focus:ring-terracotta/20',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-charcoal">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <p className="text-xs text-terracotta font-medium pl-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-muted pl-1">{helperText}</p>}
      </div>
    );
  }
);

GlassSelect.displayName = 'GlassSelect';
