'use client';

import * as React from 'react';
import { Check, Copy, Download, FileCode2, Shield, Terminal } from 'lucide-react';
import {
  GRAIN_ESCROW_ABI,
  GRAIN_ESCROW_SOL,
  ROLE_HASHES,
} from '@/data/grainEscrowContract';
import { CONTRACT_ADDRESS } from '@/data/mockShipments';
import type { BlockchainTxEvent } from '@/types/graintrust';
import { formatKzt, shortenAddress } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ContractCodeViewer({
  events,
  compact = false,
}: {
  events: BlockchainTxEvent[];
  compact?: boolean;
}) {
  const [activeTab, setActiveTab] = React.useState('solidity');
  const [copied, setCopied] = React.useState(false);

  const lines = React.useMemo(() => GRAIN_ESCROW_SOL.split('\n'), []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(GRAIN_ESCROW_SOL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([GRAIN_ESCROW_SOL], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GrainEscrow.sol';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50/70">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <FileCode2 className="h-4 w-4 text-blue-700" aria-hidden="true" />
            <CardTitle className="font-mono text-sm sm:text-base">
              GrainEscrow.sol
            </CardTitle>
            <Badge variant="emerald">OpenZeppelin v5 Verified</Badge>
            <Badge variant="blue">Solidity ^0.8.20</Badge>
          </div>
          <CardDescription>
            Deployed on KZ-GrainChain (Besu #7701) at{' '}
            <span className="font-mono text-xs text-slate-700">{CONTRACT_ADDRESS}</span>
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copy Solidity
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Download .sol
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList label="Smart contract inspection tabs">
            <TabsTrigger value="solidity">Source Code (GrainEscrow.sol)</TabsTrigger>
            <TabsTrigger value="roles">AccessControl Roles &amp; ABI</TabsTrigger>
            <TabsTrigger value="events">
              On-Chain Event Log ({events.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="solidity">
            <div
              className={`overflow-auto rounded-lg border border-slate-800 bg-slate-950 text-slate-100 font-mono text-xs leading-6 ${
                compact ? 'max-h-[420px]' : 'max-h-[640px]'
              }`}
            >
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/70">
                      <td className="select-none border-r border-slate-800 px-3 py-0.5 text-right text-slate-500 w-12 align-top">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-0.5 whitespace-pre text-slate-100">
                        {line || ' '}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {Object.entries(ROLE_HASHES).map(([roleName, hash]) => (
                <div
                  key={roleName}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-1.5"
                >
                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-900">
                    <Shield className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
                    {roleName}
                  </div>
                  <p className="font-mono text-[11px] text-slate-600 break-all">{hash}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                Human-Readable ABI (ethers.Interface)
              </div>
              <ul className="divide-y divide-slate-100 font-mono text-xs text-slate-700">
                {GRAIN_ESCROW_ABI.map((fragment) => (
                  <li key={fragment} className="px-4 py-2.5 break-all">
                    {fragment}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="events">
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
                      <span className="font-mono font-semibold text-slate-900">
                        {evt.eventName}
                      </span>
                      <Badge variant="outline">{evt.shipmentId}</Badge>
                      {evt.amountKzt !== undefined && (
                        <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                          {formatKzt(evt.amountKzt)}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-slate-500">
                      Block #{evt.blockNumber.toLocaleString('en-US')} • {evt.timestamp}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-600 break-all">
                    Caller: {shortenAddress(evt.actorAddress, 6)} ({evt.actorRole.toUpperCase()}) •
                    Tx: {evt.txHash}
                  </p>
                  <p className="font-mono text-[11px] text-blue-800 break-all">
                    {evt.calldataPreview}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
