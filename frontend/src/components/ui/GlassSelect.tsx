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
          <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={clsx(
              'w-full px-3.5 py-2.5 text-sm rounded-xl appearance-none transition-all duration-150 ease-out cursor-pointer',
              'bg-white/60 dark:bg-slate-800/60 backdrop-blur-md',
              'text-slate-900 dark:text-slate-100',
              'border border-slate-300/60 dark:border-white/10',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white/80 dark:focus:bg-slate-800/80',
              'disabled:opacity-50 disabled:cursor-not-allowed pr-10',
              error && 'border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/30',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <p className="text-xs text-rose-500 font-medium pl-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-slate-500 dark:text-slate-400 pl-1">{helperText}</p>}
      </div>
    );
  }
);

GlassSelect.displayName = 'GlassSelect';
