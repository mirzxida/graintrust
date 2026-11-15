'use client';

import * as React from 'react';
import { Lock, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { KAZAKHSTAN_CORRIDORS, ROLE_PROFILES } from '@/data/mockShipments';
import { formatKzt, shortenAddress } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
  NativeDialog,
} from '@/components/ui/dialog';
import { Input, SelectField } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CreateShipmentPayload {
  route: string;
  corridorType: 'Rail Export' | 'Port Export' | 'Domestic Hub';
  grainGrade: string;
  volumeTons: number;
  valueKzt: number;
  deadline: string;
  waybillRef: string;
}

interface FormErrors {
  route?: string;
  grainGrade?: string;
  volumeTons?: string;
  valueKzt?: string;
  deadline?: string;
  waybillRef?: string;
}

const DEFAULT_RATE_KZT_PER_TON = 118_000;

export function CreateEscrowModal({
  open,
  onOpenChange,
  onCreateShipment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateShipment: (payload: CreateShipmentPayload) => Promise<void>;
}) {
  const titleId = React.useId();
  const routeSelectId = React.useId();
  const customRouteId = React.useId();
  const gradeId = React.useId();
  const volumeId = React.useId();
  const valueId = React.useId();
  const deadlineId = React.useId();
  const waybillId = React.useId();

  const [selectedCorridor, setSelectedCorridor] = React.useState(
    KAZAKHSTAN_CORRIDORS[1].route
  );
  const [customRoute, setCustomRoute] = React.useState('');
  const [grainGrade, setGrainGrade] = React.useState(
    'Class 3 Milling Wheat (12.5% Protein)'
  );
  const [volumeTons, setVolumeTons] = React.useState('1500');
  const [valueKzt, setValueKzt] = React.useState(
    String(1500 * DEFAULT_RATE_KZT_PER_TON)
  );
  const [valueManuallyEdited, setValueManuallyEdited] = React.useState(false);
  const [deadline, setDeadline] = React.useState('2026-12-10');
  const [waybillRef, setWaybillRef] = React.useState('KTZ-ETRAN-885104');

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const customRouteRef = React.useRef<HTMLInputElement>(null);
  const gradeRef = React.useRef<HTMLInputElement>(null);
  const volumeRef = React.useRef<HTMLInputElement>(null);
  const valueRef = React.useRef<HTMLInputElement>(null);
  const deadlineRef = React.useRef<HTMLInputElement>(null);
  const waybillRefInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
    }
  }, [open]);

  const effectiveRoute =
    selectedCorridor === 'custom' ? customRoute.trim() : selectedCorridor;

  const effectiveCorridorType: CreateShipmentPayload['corridorType'] =
    KAZAKHSTAN_CORRIDORS.find((c) => c.route === selectedCorridor)?.corridorType ??
    'Rail Export';

  const validateField = (field: keyof FormErrors): string | undefined => {
    switch (field) {
      case 'route':
        if (selectedCorridor === 'custom' && customRoute.trim().length < 5) {
          return 'Enter an origin and destination corridor (e.g., Shymkent -> Tashkent).';
        }
        return undefined;
      case 'grainGrade':
        if (grainGrade.trim().length < 3) {
          return 'Specify the grain grade or commodity specification.';
        }
        return undefined;
      case 'volumeTons': {
        const tons = Number(volumeTons.replaceAll(',', '').trim());
        if (!Number.isFinite(tons) || !Number.isInteger(tons) || tons < 10 || tons > 100000) {
          return 'Enter an integer tonnage between 10 and 100,000 tons.';
        }
        return undefined;
      }
      case 'valueKzt': {
        const kzt = Number(valueKzt.replaceAll(',', '').trim());
        if (!Number.isFinite(kzt) || kzt < 1_000_000) {
          return 'Minimum escrow value is 1,000,000 KZT.';
        }
        return undefined;
      }
      case 'deadline':
        if (!deadline || deadline <= '2026-11-12') {
          return 'Delivery deadline must be after 2026-11-12.';
        }
        return undefined;
      case 'waybillRef':
        if (!/^[A-Za-z0-9-]{6,32}$/.test(waybillRef.trim())) {
          return 'Use 6-32 alphanumeric/hyphen characters (e.g., KTZ-ETRAN-885104).';
        }
        return undefined;
    }
  };

  const handleBlur = (field: keyof FormErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleVolumeChange = (nextVal: string) => {
    const cleaned = nextVal.replace(/[^\d]/g, '');
    setVolumeTons(cleaned);
    if (errors.volumeTons) {
      setErrors((prev) => ({ ...prev, volumeTons: undefined }));
    }
    if (!valueManuallyEdited) {
      const tons = Number(cleaned);
      if (Number.isFinite(tons) && tons > 0) {
        setValueKzt(String(tons * DEFAULT_RATE_KZT_PER_TON));
      }
    }
  };

  const handleValueChange = (nextVal: string) => {
    setValueManuallyEdited(true);
    setValueKzt(nextVal.replace(/[^\d]/g, ''));
    if (errors.valueKzt) {
      setErrors((prev) => ({ ...prev, valueKzt: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextErrors: FormErrors = {
      route: validateField('route'),
      grainGrade: validateField('grainGrade'),
      volumeTons: validateField('volumeTons'),
      valueKzt: validateField('valueKzt'),
      deadline: validateField('deadline'),
      waybillRef: validateField('waybillRef'),
    };
    setErrors(nextErrors);
    setTouched({
      route: true,
      grainGrade: true,
      volumeTons: true,
      valueKzt: true,
      deadline: true,
      waybillRef: true,
    });

    const firstErrorField = (
      ['route', 'grainGrade', 'volumeTons', 'valueKzt', 'deadline', 'waybillRef'] as const
    ).find((key) => Boolean(nextErrors[key]));

    if (firstErrorField) {
      const refMap = {
        route: customRouteRef,
        grainGrade: gradeRef,
        volumeTons: volumeRef,
        valueKzt: valueRef,
        deadline: deadlineRef,
        waybillRef: waybillRefInput,
      };
      refMap[firstErrorField].current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateShipment({
        route: effectiveRoute,
        corridorType: effectiveCorridorType,
        grainGrade: grainGrade.trim(),
        volumeTons: Number(volumeTons),
        valueKzt: Number(valueKzt),
        deadline,
        waybillRef: waybillRef.trim().toUpperCase(),
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedValue = Number(valueKzt) || 0;

  return (
    <NativeDialog
      open={open}
      onOpenChange={onOpenChange}
      labelledBy={titleId}
      closedby={isSubmitting ? 'none' : 'any'}
    >
      <DialogHeader onClose={isSubmitting ? undefined : () => onOpenChange(false)}>
        <DialogTitle id={titleId}>Create Escrow Shipment</DialogTitle>
        <DialogDescription>
          Lock Digital Tenge (KZTD) into <span className="font-mono text-xs">GrainEscrow.sol</span>{' '}
          for permissioned settlement upon KTZ Carrier delivery confirmation.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} noValidate className="overflow-y-auto px-6 py-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={routeSelectId}>
            Export Route Corridor <span aria-hidden="true" className="text-rose-600">*</span>
          </Label>
          <SelectField
            id={routeSelectId}
            name="corridor"
            autoFocus
            value={selectedCorridor}
            onChange={(e) => {
              setSelectedCorridor(e.target.value);
              if (errors.route) setErrors((prev) => ({ ...prev, route: undefined }));
            }}
          >
            {KAZAKHSTAN_CORRIDORS.map((c) => (
              <option key={c.route} value={c.route}>
                {c.route} ({c.corridorType})
              </option>
            ))}
            <option value="custom">Custom Kazakhstan Corridor...</option>
          </SelectField>
        </div>

        {selectedCorridor === 'custom' && (
          <div className="space-y-1.5">
            <Label htmlFor={customRouteId}>
              Custom Route (Origin -&gt; Destination){' '}
              <span aria-hidden="true" className="text-rose-600">*</span>
            </Label>
            <Input
              ref={customRouteRef}
              id={customRouteId}
              name="customRoute"
              type="text"
              required
              placeholder="e.g., Shymkent -> Tashkent Terminal"
              value={customRoute}
              aria-invalid={Boolean(touched.route && errors.route)}
              aria-describedby={errors.route ? `${customRouteId}-err` : undefined}
              onChange={(e) => {
                setCustomRoute(e.target.value);
                if (errors.route) setErrors((prev) => ({ ...prev, route: undefined }));
              }}
              onBlur={() => handleBlur('route')}
            />
            {touched.route && errors.route && (
              <p id={`${customRouteId}-err`} className="flex items-center gap-1.5 text-xs text-rose-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {errors.route}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor={gradeId}>
            Grain Specification &amp; Grade{' '}
            <span aria-hidden="true" className="text-rose-600">*</span>
          </Label>
          <Input
            ref={gradeRef}
            id={gradeId}
            name="grainGrade"
            type="text"
            required
            value={grainGrade}
            aria-invalid={Boolean(touched.grainGrade && errors.grainGrade)}
            aria-describedby={errors.grainGrade ? `${gradeId}-err` : undefined}
            onChange={(e) => {
              setGrainGrade(e.target.value);
              if (errors.grainGrade) setErrors((prev) => ({ ...prev, grainGrade: undefined }));
            }}
            onBlur={() => handleBlur('grainGrade')}
          />
          {touched.grainGrade && errors.grainGrade && (
            <p id={`${gradeId}-err`} className="flex items-center gap-1.5 text-xs text-rose-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {errors.grainGrade}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={volumeId}>
              Volume (Metric Tons) <span aria-hidden="true" className="text-rose-600">*</span>
            </Label>
            <Input
              ref={volumeRef}
              id={volumeId}
              name="volumeTons"
              type="text"
              inputMode="numeric"
              required
              value={volumeTons}
              aria-invalid={Boolean(touched.volumeTons && errors.volumeTons)}
              aria-describedby={
                errors.volumeTons ? `${volumeId}-err` : `${volumeId}-hint`
              }
              onChange={(e) => handleVolumeChange(e.target.value)}
              onBlur={() => handleBlur('volumeTons')}
            />
            <p id={`${volumeId}-hint`} className="text-xs text-slate-500">
              Integer metric tons (10 - 100,000 t)
            </p>
            {touched.volumeTons && errors.volumeTons && (
              <p id={`${volumeId}-err`} className="flex items-center gap-1.5 text-xs text-rose-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {errors.volumeTons}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={valueId}>
              Escrow Value (KZT) <span aria-hidden="true" className="text-rose-600">*</span>
            </Label>
            <Input
              ref={valueRef}
              id={valueId}
              name="valueKzt"
              type="text"
              inputMode="numeric"
              required
              value={valueKzt}
              aria-invalid={Boolean(touched.valueKzt && errors.valueKzt)}
              aria-describedby={errors.valueKzt ? `${valueId}-err` : `${valueId}-hint`}
              onChange={(e) => handleValueChange(e.target.value)}
              onBlur={() => handleBlur('valueKzt')}
            />
            <p id={`${valueId}-hint`} className="font-mono text-xs text-slate-600 tabular-nums">
              Locked: {parsedValue > 0 ? formatKzt(parsedValue) : '0 KZT'}
            </p>
            {touched.valueKzt && errors.valueKzt && (
              <p id={`${valueId}-err`} className="flex items-center gap-1.5 text-xs text-rose-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {errors.valueKzt}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={deadlineId}>
              Delivery Deadline <span aria-hidden="true" className="text-rose-600">*</span>
            </Label>
            <Input
              ref={deadlineRef}
              id={deadlineId}
              name="deadline"
              type="date"
              required
              min="2026-11-13"
              value={deadline}
              aria-invalid={Boolean(touched.deadline && errors.deadline)}
              aria-describedby={errors.deadline ? `${deadlineId}-err` : `${deadlineId}-hint`}
              onChange={(e) => {
                setDeadline(e.target.value);
                if (errors.deadline) setErrors((prev) => ({ ...prev, deadline: undefined }));
              }}
              onBlur={() => handleBlur('deadline')}
            />
            <p id={`${deadlineId}-hint`} className="text-xs text-slate-500">
              Refundable via claimRefund() after expiry
            </p>
            {touched.deadline && errors.deadline && (
              <p id={`${deadlineId}-err`} className="flex items-center gap-1.5 text-xs text-rose-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {errors.deadline}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={waybillId}>
              KTZ e-Waybill Ref <span aria-hidden="true" className="text-rose-600">*</span>
            </Label>
            <Input
              ref={waybillRefInput}
              id={waybillId}
              name="waybillRef"
              type="text"
              required
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={waybillRef}
              aria-invalid={Boolean(touched.waybillRef && errors.waybillRef)}
              aria-describedby={errors.waybillRef ? `${waybillId}-err` : `${waybillId}-hint`}
              onChange={(e) => {
                setWaybillRef(e.target.value);
                if (errors.waybillRef) setErrors((prev) => ({ ...prev, waybillRef: undefined }));
              }}
              onBlur={() => handleBlur('waybillRef')}
            />
            <p id={`${waybillId}-hint`} className="text-xs text-slate-500">
              Hashed to bytes32 waybillHash via keccak256
            </p>
            {touched.waybillRef && errors.waybillRef && (
              <p id={`${waybillId}-err`} className="flex items-center gap-1.5 text-xs text-rose-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {errors.waybillRef}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Permissioned Contract Dispatch Preview
          </div>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 font-mono text-[11px] text-slate-600">
            <span>Carrier: {shortenAddress(ROLE_PROFILES.carrier.walletAddress)} (KTZ)</span>
            <span>Supplier: {shortenAddress(ROLE_PROFILES.supplier.walletAddress)} (Elevator)</span>
          </div>
          <p className="font-mono text-[11px] text-blue-800 break-all">
            GrainEscrow.createShipment(carrier, supplier, &quot;{effectiveRoute || '...'}&quot;,{' '}
            {volumeTons || 0}, {valueKzt || 0}, deadline, waybillHash)
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Signing &amp; Locking Escrow...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" aria-hidden="true" />
                Lock {parsedValue > 0 ? formatKzt(parsedValue) : 'Escrow'}
              </>
            )}
          </Button>
        </div>
      </form>
    </NativeDialog>
  );
}
