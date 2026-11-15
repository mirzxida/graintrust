import * as React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'pending'
  | 'in-transit'
  | 'delivered'
  | 'refunded'
  | 'outline'
  | 'blue'
  | 'emerald';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-800 border-slate-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  'in-transit': 'bg-blue-50 text-blue-800 border-blue-200',
  delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  refunded: 'bg-rose-50 text-rose-800 border-rose-200',
  outline: 'bg-white text-slate-700 border-slate-300',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}
