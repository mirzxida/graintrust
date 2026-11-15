'use client';

import * as React from 'react';
import {
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Lock,
  RotateCcw,
  TrainFront,
  Truck,
  Wallet,
} from 'lucide-react';
import type { RoleId, ShipmentRecord, ShipmentStatus } from '@/types/graintrust';
import { formatKzt, formatTons, isDeadlineExpired } from '@/lib/utils';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ResponsiveTableWrapper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHeader,
} from '@/components/ui/table';

const STATUS_BADGE_MAP: Record<
  ShipmentStatus,
  { variant: BadgeVariant; icon: React.ComponentType<{ className?: string }> }
> = {
  Pending: { variant: 'pending', icon: Clock },
  'In Transit': { variant: 'in-transit', icon: TrainFront },
  Delivered: { variant: 'delivered', icon: CheckCircle2 },
  Refunded: { variant: 'refunded', icon: RotateCcw },
};

export function ShipmentsTable({
  shipments,
  activeRole,
  pendingTxId,
  captionId,
  onInspect,
  onConfirmDelivery,
  onMarkInTransit,
  onClaimFunds,
  onClaimRefund,
}: {
  shipments: ShipmentRecord[];
  activeRole: RoleId;
  pendingTxId: string | null;
  captionId: string;
  onInspect: (shipment: ShipmentRecord) => void;
  onConfirmDelivery: (shipment: ShipmentRecord) => Promise<void>;
  onMarkInTransit: (shipment: ShipmentRecord) => Promise<void>;
  onClaimFunds: (shipment: ShipmentRecord) => Promise<void>;
  onClaimRefund: (shipment: ShipmentRecord) => Promise<void>;
}) {
  if (shipments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center">
        <p className="text-sm font-medium text-slate-800">No matching grain shipments</p>
        <p className="mt-1 text-xs text-slate-500">
          Adjust your status filter or search query to inspect other escrow contracts.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveTableWrapper labelledBy={captionId} className="border border-slate-200 bg-white">
      <Table>
        <caption id={captionId} className="visually-hidden">
          GrainTrust permissioned escrow shipments ledger for Kazakhstan export corridors
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Route</TableHead>
            <TableHead className="text-right">Volume (Tons)</TableHead>
            <TableHead className="text-right">Value (KZT)</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Role Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.map((shipment) => {
            const statusConfig = STATUS_BADGE_MAP[shipment.status];
            const StatusIcon = statusConfig.icon;
            const isBusy = pendingTxId === shipment.id;
            const expired = isDeadlineExpired(shipment.deadline);
            const isActiveEscrow =
              shipment.status === 'Pending' || shipment.status === 'In Transit';

            return (
              <TableRow key={shipment.id}>
                <TableRowHeader>
                  <button
                    type="button"
                    onClick={() => onInspect(shipment)}
                    className="inline-flex flex-col items-start text-left hover:text-blue-700 cursor-pointer"
                    aria-label={`Inspect escrow details for ${shipment.id}`}
                  >
                    <span className="font-mono font-semibold">{shipment.id}</span>
                    <span className="font-sans text-[11px] font-normal text-slate-500">
                      {shipment.waybillRef}
                    </span>
                  </button>
                </TableRowHeader>

                <TableCell data-label="Route">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 whitespace-nowrap">
                      {shipment.route}
                    </p>
                    <p className="text-xs text-slate-500 truncate max-w-[220px]">
                      {shipment.grainGrade}
                    </p>
                  </div>
                </TableCell>

                <TableCell
                  data-label="Volume (Tons)"
                  className="text-right font-mono font-medium text-slate-800 tabular-nums whitespace-nowrap"
                >
                  {formatTons(shipment.volumeTons)}
                </TableCell>

                <TableCell
                  data-label="Value (KZT)"
                  className="text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap"
                >
                  {formatKzt(shipment.valueKzt)}
                </TableCell>

                <TableCell
                  data-label="Deadline"
                  className="font-mono text-xs tabular-nums whitespace-nowrap"
                >
                  <span className={expired && isActiveEscrow ? 'font-semibold text-rose-700' : 'text-slate-700'}>
                    {shipment.deadline}
                  </span>
                  {expired && isActiveEscrow && (
                    <span className="block font-sans text-[11px] font-medium text-rose-600">
                      Expired
                    </span>
                  )}
                </TableCell>

                <TableCell data-label="Status">
                  <div className="inline-flex flex-col items-end sm:items-start gap-1">
                    <Badge variant={statusConfig.variant}>
                      <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      {shipment.status}
                    </Badge>
                    {shipment.status === 'Delivered' && (
                      <span className="text-[11px] text-slate-500">
                        {shipment.fundsClaimed ? 'Settled to Elevator' : 'Unlocked for Claim'}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell data-label="Role Action" className="text-right whitespace-nowrap">
                  <div className="inline-flex flex-wrap items-center justify-end gap-2">
                    {activeRole === 'buyer' && (
                      <>
                        {isActiveEscrow && expired && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isBusy}
                            aria-label={`Claim Refund for shipment ${shipment.id}`}
                            onClick={() => onClaimRefund(shipment)}
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            Claim Refund
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Inspect shipment ${shipment.id}`}
                          onClick={() => onInspect(shipment)}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          Inspect
                        </Button>
                      </>
                    )}

                    {activeRole === 'carrier' && (
                      <>
                        {shipment.status === 'Pending' && !expired && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            aria-label={`Mark shipment ${shipment.id} In Transit`}
                            onClick={() => onMarkInTransit(shipment)}
                          >
                            <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                            Dispatch
                          </Button>
                        )}
                        {isActiveEscrow && !expired ? (
                          <Button
                            size="sm"
                            variant="emerald"
                            disabled={isBusy}
                            aria-label={`Confirm Delivery (Sign) for shipment ${shipment.id}`}
                            onClick={() => onConfirmDelivery(shipment)}
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            Confirm Delivery (Sign)
                          </Button>
                        ) : isActiveEscrow && expired ? (
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label={`Inspect expired shipment ${shipment.id}`}
                            onClick={() => onInspect(shipment)}
                          >
                            <Clock className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
                            Expired
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`View signed proof for shipment ${shipment.id}`}
                            onClick={() => onInspect(shipment)}
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            Proof
                          </Button>
                        )}
                      </>
                    )}

                    {activeRole === 'supplier' && (
                      <>
                        {shipment.status === 'Delivered' && !shipment.fundsClaimed && (
                          <Button
                            size="sm"
                            variant="emerald"
                            disabled={isBusy}
                            aria-label={`Claim Funds for shipment ${shipment.id}`}
                            onClick={() => onClaimFunds(shipment)}
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            Claim Funds
                          </Button>
                        )}
                        {isActiveEscrow && (
                          <Button
                            size="sm"
                            variant="outline"
                            aria-disabled="true"
                            aria-label={`Claim Funds for shipment ${shipment.id} — locked until Delivered`}
                            className="opacity-55 cursor-not-allowed hover:bg-white hover:border-slate-300 text-slate-500"
                            onClick={(e) => e.preventDefault()}
                          >
                            <Lock className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                            Claim Funds
                          </Button>
                        )}
                        {shipment.status === 'Delivered' && shipment.fundsClaimed && (
                          <Badge variant="emerald" className="py-1 px-2.5">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            Funds Settled
                          </Badge>
                        )}
                        {shipment.status === 'Refunded' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Inspect refunded shipment ${shipment.id}`}
                            onClick={() => onInspect(shipment)}
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            Details
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ResponsiveTableWrapper>
  );
}
