export type RoleId = 'buyer' | 'carrier' | 'supplier';

export type ShipmentStatus = 'Pending' | 'In Transit' | 'Delivered' | 'Refunded';

export type NavSection = 'dashboard' | 'shipments' | 'contracts' | 'settings';

export interface RoleProfile {
  id: RoleId;
  label: string;
  shortLabel: string;
  organization: string;
  jurisdiction: string;
  walletAddress: string;
  accessControlRole: 'BUYER_ROLE' | 'CARRIER_ROLE' | 'SUPPLIER_ROLE';
  permissionSummary: string;
}

export interface ShipmentRecord {
  id: string;
  onChainId: number;
  route: string;
  corridorType: 'Rail Export' | 'Port Export' | 'Domestic Hub';
  grainGrade: string;
  volumeTons: number;
  valueKzt: number;
  deadline: string;
  status: ShipmentStatus;
  fundsClaimed: boolean;
  buyerOrg: string;
  buyerAddress: string;
  carrierOrg: string;
  carrierAddress: string;
  supplierOrg: string;
  supplierAddress: string;
  waybillRef: string;
  waybillHash: string;
  txHash: string;
  signature?: string;
  updatedAt: string;
}

export interface BlockchainTxEvent {
  id: string;
  eventName:
    | 'ShipmentCreated'
    | 'ShipmentInTransit'
    | 'DeliveryConfirmed'
    | 'FundsClaimed'
    | 'RefundClaimed';
  shipmentId: string;
  actorRole: RoleId;
  actorAddress: string;
  txHash: string;
  blockNumber: number;
  calldataPreview: string;
  amountKzt?: number;
  timestamp: string;
}

export interface ConsortiumSettings {
  networkName: string;
  chainId: number;
  rpcEndpoint: string;
  contractAddress: string;
  kztTokenAddress: string;
  ktzOracleSync: boolean;
  autoRequireEWaybill: boolean;
}
