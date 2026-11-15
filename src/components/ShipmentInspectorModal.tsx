'use client';

import * as React from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Truck,
  Wallet,
} from 'lucide-react';
import type { RoleId, ShipmentRecord } from '@/types/graintrust';
import { formatKzt, formatTons, isDeadlineExpired } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
  NativeDialog,
} from '@/components/ui/dialog';

export function ShipmentInspectorModal({
  shipment,
  open,
  onOpenChange,
  activeRole,
  pendingTxId,
  onConfirmDelivery,
  onMarkInTransit,
  onClaimFunds,
  onClaimRefund,
}: {
  shipment: ShipmentRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeRole: RoleId;
  pendingTxId: string | null;
  onConfirmDelivery: (shipment: ShipmentRecord) => Promise<void>;
  onMarkInTransit: (shipment: ShipmentRecord) => Promise<void>;
  onClaimFunds: (shipment: ShipmentRecord) => Promise<void>;
  onClaimRefund: (shipment: ShipmentRecord) => Promise<void>;
}) {
  const titleId = React.useId();

  if (!shipment) {
    return (
      <NativeDialog open={false} onOpenChange={onOpenChange} labelledBy={titleId}>
        <div />
      </NativeDialog>
    );
  }

  const isBusy = pendingTxId === shipment.id;
  const expired = isDeadlineExpired(shipment.deadline);
  const canCarrierSign =
    activeRole === 'carrier' &&
    !expired &&
    (shipment.status === 'Pending' || shipment.status === 'In Transit');
  const canCarrierDispatch =
    activeRole === 'carrier' && shipment.status === 'Pending' && !expired;
  const canSupplierClaim =
    activeRole === 'supplier' &&
    shipment.status === 'Delivered' &&
    !shipment.fundsClaimed;
  const canBuyerRefund =
    activeRole === 'buyer' &&
    (shipment.status === 'Pending' || shipment.status === 'In Transit') &&
    expired;

  return (
    <NativeDialog open={open} onOpenChange={onOpenChange} labelledBy={titleId}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <div className="flex flex-wrap items-center gap-2.5">
          <DialogTitle id={titleId} className="font-mono">
            {shipment.id}
          </DialogTitle>
          <Badge
            variant={
              shipment.status === 'Pending'
                ? 'pending'
                : shipment.status === 'In Transit'
                  ? 'in-transit'
                  : shipment.status === 'Delivered'
                    ? 'delivered'
                    : 'refunded'
            }
          >
            {shipment.status}
          </Badge>
          {shipment.status === 'Delivered' && (
            <Badge variant={shipment.fundsClaimed ? 'emerald' : 'outline'}>
              {shipment.fundsClaimed ? 'Funds Claimed' : 'Awaiting Supplier Claim'}
            </Badge>
          )}
        </div>
        <DialogDescription>
          {shipment.route} • {shipment.grainGrade}
        </DialogDescription>
      </DialogHeader>

      <div className="overflow-y-auto px-6 py-5 space-y-5 text-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Escrow Value</p>
            <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
              {formatKzt(shipment.valueKzt)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Cargo Volume</p>
            <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
              {formatTons(shipment.volumeTons)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Escrow Deadline</p>
            <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
              {shipment.deadline}
            </p>
            {expired &&
              (shipment.status === 'Pending' || shipment.status === 'In Transit') && (
                <p className="mt-0.5 text-xs font-medium text-rose-700">
                  Past deadline — refund eligible
                </p>
              )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
          <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-medium text-slate-500">Buyer (BUYER_ROLE)</span>
            <div className="text-right">
              <p className="font-medium text-slate-900">{shipment.buyerOrg}</p>
              <p className="font-mono text-xs text-slate-500">{shipment.buyerAddress}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-medium text-slate-500">Carrier (CARRIER_ROLE)</span>
            <div className="text-right">
              <p className="font-medium text-slate-900">{shipment.carrierOrg}</p>
              <p className="font-mono text-xs text-slate-500">{shipment.carrierAddress}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-medium text-slate-500">Supplier (Elevator)</span>
            <div className="text-right">
              <p className="font-medium text-slate-900">{shipment.supplierOrg}</p>
              <p className="font-mono text-xs text-slate-500">{shipment.supplierAddress}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
            <FileCheck2 className="h-4 w-4 text-blue-700" aria-hidden="true" />
            On-Chain Cryptographic Proofs
          </div>
          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-slate-500">KTZ e-Waybill Ref: </span>
              <span className="font-mono font-medium text-slate-900">{shipment.waybillRef}</span>
            </div>
            <div>
              <span className="text-slate-500">waybillHash (bytes32): </span>
              <span className="font-mono text-slate-800 break-all">{shipment.waybillHash}</span>
            </div>
            <div>
              <span className="text-slate-500">Latest Consortium Tx: </span>
              <span className="inline-flex items-center gap-1 font-mono text-blue-700 break-all">
                {shipment.txHash}
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
              </span>
            </div>
            {shipment.signature && (
              <div>
                <span className="text-slate-500">Carrier ECDSA Proof Signature: </span>
                <span className="font-mono text-emerald-800 break-all">
                  {shipment.signature}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Updated {shipment.updatedAt}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {canCarrierDispatch && (
              <Button
                variant="outline"
                size="sm"
                disabled={isBusy}
                onClick={async () => {
                  await onMarkInTransit(shipment);
                }}
              >
                <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                Dispatch In Transit
              </Button>
            )}
            {canCarrierSign && (
              <Button
                variant="emerald"
                size="sm"
                disabled={isBusy}
                onClick={async () => {
                  await onConfirmDelivery(shipment);
                  onOpenChange(false);
                }}
              >
                {isBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Confirm Delivery (Sign)
              </Button>
            )}
            {canSupplierClaim && (
              <Button
                variant="emerald"
                size="sm"
                disabled={isBusy}
                onClick={async () => {
                  await onClaimFunds(shipment);
                  onOpenChange(false);
                }}
              >
                {isBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Claim Funds
              </Button>
            )}
            {canBuyerRefund && (
              <Button
                variant="destructive"
                size="sm"
                disabled={isBusy}
                onClick={async () => {
                  await onClaimRefund(shipment);
                  onOpenChange(false);
                }}
              >
                {isBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Claim Refund
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </NativeDialog>
  );
}
