'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labelledBy: string;
  closedby?: 'any' | 'closerequest' | 'none';
  className?: string;
  children: React.ReactNode;
}

/**
 * Accessible modal dialog backed by the native HTML <dialog> element and showModal().
 * Omits redundant role="dialog" / aria-modal and implements the closedby="any"
 * pointerdown/pointerup fallback when HTMLDialogElement.prototype.closedBy is absent.
 */
export function NativeDialog({
  open,
  onOpenChange,
  labelledBy,
  closedby = 'any',
  className,
  children,
}: NativeDialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = React.useRef(false);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onOpenChange(false);
    };

    const handleCancel = (e: Event) => {
      if (closedby === 'none') {
        e.preventDefault();
        return;
      }
      onOpenChange(false);
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('cancel', handleCancel);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, [closedby, onOpenChange]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || closedby !== 'any') return;
    if ('closedBy' in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      pressedOutsideRef.current = isOutside(e);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutsideRef.current && isOutside(e)) {
        dialog.close();
      }
      pressedOutsideRef.current = false;
    };

    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, [closedby]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      {...({ closedby } as Record<string, unknown>)}
      className={cn(
        'w-full rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl',
        className
      )}
    >
      {children}
    </dialog>
  );
}

export function DialogHeader({
  className,
  onClose,
  children,
}: {
  className?: string;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4',
        className
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function DialogTitle({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h1 id={id} className={cn('text-lg font-semibold text-slate-900', className)}>
      {children}
    </h1>
  );
}

export function DialogDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <p className={cn('mt-1 text-sm text-slate-500', className)}>{children}</p>;
}
