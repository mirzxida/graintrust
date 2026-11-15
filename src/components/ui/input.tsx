import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'gt-control w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 transition-colors',
        'hover:border-slate-500 focus:border-blue-700',
        'aria-[invalid=true]:border-rose-600 aria-[invalid=true]:bg-rose-50/40',
        'disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export const SelectField = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'gt-control w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 transition-colors cursor-pointer',
        'hover:border-slate-500 focus:border-blue-700',
        'aria-[invalid=true]:border-rose-600 aria-[invalid=true]:bg-rose-50/40',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

SelectField.displayName = 'SelectField';
