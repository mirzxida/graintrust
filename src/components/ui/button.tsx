import * as React from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  | 'default'
  | 'emerald'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'bg-blue-700 text-white border border-blue-700 hover:bg-blue-800 hover:border-blue-800 shadow-xs disabled:bg-blue-300 disabled:border-blue-300',
  emerald:
    'bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700 shadow-xs disabled:bg-emerald-300 disabled:border-emerald-300',
  secondary:
    'bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-200/80 disabled:opacity-50',
  outline:
    'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50',
  ghost:
    'bg-transparent text-slate-700 border border-transparent hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50',
  destructive:
    'bg-rose-600 text-white border border-rose-600 hover:bg-rose-700 hover:border-rose-700 shadow-xs disabled:opacity-50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-xs gap-1.5',
  md: 'min-h-10 px-4 py-2 text-sm gap-2',
  lg: 'min-h-11 px-5 py-2.5 text-sm gap-2',
  icon: 'min-h-9 min-w-9 p-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed select-none',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
