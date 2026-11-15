import * as React from 'react';
import { cn } from '@/lib/utils';

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'inline-block text-sm font-medium text-slate-800 select-none',
        className
      )}
      {...props}
    />
  );
}
