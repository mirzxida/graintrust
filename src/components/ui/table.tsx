import * as React from 'react';
import { cn } from '@/lib/utils';

export function ResponsiveTableWrapper({
  labelledBy,
  className,
  children,
}: {
  labelledBy: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-labelledby={labelledBy}
      className={cn('gt-table-wrapper rounded-lg', className)}
    >
      {children}
    </div>
  );
}

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('gt-table text-sm text-left', className)} {...props} />;
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-slate-50 text-slate-600', className)} {...props} />;
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-slate-200 bg-white', className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('transition-colors hover:bg-slate-50/90', className)}
      {...props}
    />
  );
}

export function TableHead({
  className,
  scope = 'col',
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope={scope}
      className={cn(
        'border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap',
        className
      )}
      {...props}
    />
  );
}

export function TableRowHeader({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="row"
      className={cn(
        'px-4 py-3.5 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap border-b border-slate-100',
        className
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('px-4 py-3.5 text-slate-700 align-middle border-b border-slate-100', className)}
      {...props}
    />
  );
}
