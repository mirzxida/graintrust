'use client';

import * as React from 'react';
import { ethers } from 'ethers';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileCode2,
  LayoutDashboard,
  Loader2,
  Lock,
  Menu,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Terminal,
  TrainFront,
  Truck,
  Wallet,
  Wheat,
  X,
} from 'lucide-react';

// ============================================================================
// 1. TYPES & CONSTANTS
// ============================================================================

type RoleId = 'buyer' | 'carrier' | 'supplier';
type ShipmentStatus = 'Pending' | 'In Transit' | 'Delivered' | 'Refunded';
type NavSection = 'dashboard' | 'shipments' | 'contracts' | 'settings';

interface RoleProfile {
  id: RoleId;
  label: string;
  organization: string;
  jurisdiction: string;
  walletAddress: string;
  accessControlRole: 'BUYER_ROLE' | 'CARRIER_ROLE' | 'SUPPLIER_ROLE';
  permissionSummary: string;
}

interface ShipmentRecord {
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

interface BlockchainTxEvent {
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

interface CreateShipmentPayload {
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

const CONTRACT_ADDRESS = '0x7a9F4D2c8e11b09a53FD8ec1240A7701c9B4e210';
const KZT_TOKEN_ADDRESS = '0x4e8010D27aa3C9910F4b882bE110c4Da99007701';
const REFERENCE_TODAY_ISO = '2026-11-12';
const DEFAULT_RATE_KZT_PER_TON = 118_000;

const ROLE_PROFILES: Record<RoleId, RoleProfile> = {
  buyer: {
    id: 'buyer',
    label: 'Buyer (Grain Trader)',
    organization: 'KazGrain Export LLP',
    jurisdiction: 'Astana International Financial Centre (AIFC)',
    walletAddress: '0x84b2f910c3a41D09E7742b8103aE91c4D002a118',
    accessControlRole: 'BUYER_ROLE',
    permissionSummary:
      'Lock Digital Tenge (KZTD) into GrainEscrow and reclaim escrowed funds if railcar deadlines expire.',
  },
  carrier: {
    id: 'carrier',
    label: 'Carrier (Logistics/KTZ)',
    organization: 'KTZ Express JSC',
    jurisdiction: 'Kazakhstan Temir Zholy Rail & Caspian Corridor',
    walletAddress: '0x31C9D204B87E4A51F902C683A1d554E9B801c442',
    accessControlRole: 'CARRIER_ROLE',
    permissionSummary:
      'Dispatch rail freight and cryptographically sign delivery proofs via confirmDelivery() to avoid demurrage disputes.',
  },
  supplier: {
    id: 'supplier',
    label: 'Supplier (Elevator)',
    organization: 'Kostanay Grain Terminal #4',
    jurisdiction: 'Kostanay & Northern Kazakhstan Grain Belt',
    walletAddress: '0x69E4a120F5B8C3019D72A40E2f118A63C904e775',
    accessControlRole: 'SUPPLIER_ROLE',
    permissionSummary:
      'Monitor locked KZT escrow coverage eliminating buyer default risk and withdraw released funds after Carrier sign-off.',
  },
};

const KAZAKHSTAN_CORRIDORS = [
  { route: 'Astana -> Almaty', corridorType: 'Domestic Hub' as const },
  { route: 'Kostanay -> Khorgos (PRC)', corridorType: 'Rail Export' as const },
  { route: 'Petropavlovsk -> Aktau Port', corridorType: 'Port Export' as const },
  { route: 'Kokshetau -> Saryagash (UZB)', corridorType: 'Rail Export' as const },
  { route: 'Karaganda -> Dostyk Terminal', corridorType: 'Rail Export' as const },
  { route: 'Pavlodar -> Uralsk', corridorType: 'Domestic Hub' as const },
];

const INITIAL_SHIPMENTS: ShipmentRecord[] = [
  {
    id: 'GT-2026-101',
    onChainId: 101,
    route: 'Astana -> Almaty',
    corridorType: 'Domestic Hub',
    grainGrade: 'Class 3 Milling Wheat (12.5% Protein)',
    volumeTons: 1250,
    valueKzt: 142_500_000,
    deadline: '2026-11-28',
    status: 'In Transit',
    fundsClaimed: false,
    buyerOrg: 'KazGrain Export LLP',
    buyerAddress: ROLE_PROFILES.buyer.walletAddress,
    carrierOrg: 'KTZ Express JSC',
    carrierAddress: ROLE_PROFILES.carrier.walletAddress,
    supplierOrg: 'Kostanay Grain Terminal #4',
    supplierAddress: ROLE_PROFILES.supplier.walletAddress,
    waybillRef: 'KTZ-ETRAN-884210',
    waybillHash: '0x94c2f71a62e14b09d4d2c7710a3b91f8e2b5c6018873a10d4b7c3e91a0f51234',
    txHash: '0x4a891d0e5b23c91f83a02d74c155b2a9d31870c6e5b1102a74d8e99201b3f104',
    updatedAt: '2026-11-11 16:40 AST',
  },
  {
    id: 'GT-2026-102',
    onChainId: 102,
    route: 'Kostanay -> Khorgos (PRC)',
    corridorType: 'Rail Export',
    grainGrade: 'Hard Red Winter Wheat (Export Grade)',
    volumeTons: 2800,
    valueKzt: 341_600_000,
    deadline: '2026-12-04',
    status: 'Pending',
    fundsClaimed: false,
    buyerOrg: 'KazGrain Export LLP',
    buyerAddress: ROLE_PROFILES.buyer.walletAddress,
    carrierOrg: 'KTZ Express JSC',
    carrierAddress: ROLE_PROFILES.carrier.walletAddress,
    supplierOrg: 'Kostanay Grain Terminal #4',
    supplierAddress: ROLE_PROFILES.supplier.walletAddress,
    waybillRef: 'KTZ-ETRAN-884395',
    waybillHash: '0x2f18a40e719c83b2194f0e831d55a9c02b88f13d4a9120e3f7719c42d0b68819',
    txHash: '0x7c129e04a53d11b849e01f22d6a871b3c49022e1f84a6309d2c1b77409a8e211',
    updatedAt: '2026-11-11 19:15 AST',
  },
  {
    id: 'GT-2026-103',
    onChainId: 103,
    route: 'Petropavlovsk -> Aktau Port',
    corridorType: 'Port Export',
    grainGrade: 'Durum Wheat (Amber Grade 1)',
    volumeTons: 3400,
    valueKzt: 462_400_000,
    deadline: '2026-11-22',
    status: 'Delivered',
    fundsClaimed: false,
    buyerOrg: 'KazGrain Export LLP',
    buyerAddress: ROLE_PROFILES.buyer.walletAddress,
    carrierOrg: 'KTZ Express JSC',
    carrierAddress: ROLE_PROFILES.carrier.walletAddress,
    supplierOrg: 'Kostanay Grain Terminal #4',
    supplierAddress: ROLE_PROFILES.supplier.walletAddress,
    waybillRef: 'KTZ-PORT-550912',
    waybillHash: '0x6d902b1c48a3f9210e5d7b4a83c1902e6a7b110d4e8f3c219a0b8472e1c34098',
    txHash: '0x9b551c20f8a41e39d71c0a24b6e391f8c02d47a1e3905c812b74a0e9d3c61120',
    signature:
      '0x7e41c92b8d1055a2e3f01c8894d2b7a160c38e49b1207d4f6a89c2e103b54d7a1c88e902f4b17a3c920d114e6b83f2a019c4e772d5b08a19c3e201f4d6a89b1c1b',
    updatedAt: '2026-11-10 14:22 AST',
  },
  {
    id: 'GT-2026-104',
    onChainId: 104,
    route: 'Kokshetau -> Saryagash (UZB)',
    corridorType: 'Rail Export',
    grainGrade: 'Feed Barley (Grade 2 Bulk)',
    volumeTons: 1900,
    valueKzt: 184_300_000,
    deadline: '2026-11-05',
    status: 'In Transit',
    fundsClaimed: false,
    buyerOrg: 'KazGrain Export LLP',
    buyerAddress: ROLE_PROFILES.buyer.walletAddress,
    carrierOrg: 'KTZ Express JSC',
    carrierAddress: ROLE_PROFILES.carrier.walletAddress,
    supplierOrg: 'Kostanay Grain Terminal #4',
    supplierAddress: ROLE_PROFILES.supplier.walletAddress,
    waybillRef: 'KTZ-ETRAN-882014',
    waybillHash: '0x1a774e92b5c08d3f21a904c8e7b1130d9f620a4b8c319e702d5a84c1b9e03321',
    txHash: '0x2d640f81e9a31c7b50d8e249f1a63b0c7e892014a5b3d9e61f08c472a9b1e305',
    updatedAt: '2026-11-04 11:05 AST',
  },
  {
    id: 'GT-2026-105',
    onChainId: 105,
    route: 'Karaganda -> Dostyk Terminal',
    corridorType: 'Rail Export',
    grainGrade: 'Spring Wheat (High Gluten 28%)',
    volumeTons: 2150,
    valueKzt: 258_000_000,
    deadline: '2026-11-15',
    status: 'Delivered',
    fundsClaimed: true,
    buyerOrg: 'KazGrain Export LLP',
    buyerAddress: ROLE_PROFILES.buyer.walletAddress,
    carrierOrg: 'KTZ Express JSC',
    carrierAddress: ROLE_PROFILES.carrier.walletAddress,
    supplierOrg: 'Kostanay Grain Terminal #4',
    supplierAddress: ROLE_PROFILES.supplier.walletAddress,
    waybillRef: 'KTZ-ETRAN-880147',
    waybillHash: '0x8e331c90f4b7a210d6c891e4f3a027b9d1c584e2a039f6b71d84e2c09a3b5177',
    txHash: '0x5f901a3c82b4d6e1079c3f8a42d1b9e05c74a823f1d6b09e2a4c718d3f50b621',
    signature:
      '0x3a92b710e4c81f5a29d04b6e83c17a902f4d8e15b6a30c7d9e2f14a8b5c063d9e1a4b8f2c7d03e691a5b4c8d2e0f719a3c6b5d8e201f4a7c9b3e0d12a4f86c5a1c',
    updatedAt: '2026-11-08 09:50 AST',
  },
  {
    id: 'GT-2026-106',
    onChainId: 106,
    route: 'Pavlodar -> Uralsk',
    corridorType: 'Domestic Hub',
    grainGrade: 'Class 4 Feed Wheat',
    volumeTons: 950,
    valueKzt: 96_900_000,
    deadline: '2026-10-29',
    status: 'Refunded',
    fundsClaimed: false,
    buyerOrg: 'KazGrain Export LLP',
    buyerAddress: ROLE_PROFILES.buyer.walletAddress,
    carrierOrg: 'KTZ Express JSC',
    carrierAddress: ROLE_PROFILES.carrier.walletAddress,
    supplierOrg: 'Kostanay Grain Terminal #4',
    supplierAddress: ROLE_PROFILES.supplier.walletAddress,
    waybillRef: 'KTZ-ETRAN-878902',
    waybillHash: '0xc519b82e30a4f712d8e630c9a1b54f82e07c391a6d4b28f0e5c173a9d2b60481',
    txHash: '0x8b204d7a19c6e35f01a84b7c29d60e1f3a5b8742c9d0e16f4b3a725c8d9e0143',
    updatedAt: '2026-10-30 18:10 AST',
  },
];

const INITIAL_EVENTS: BlockchainTxEvent[] = [
  {
    id: 'evt-1',
    eventName: 'ShipmentCreated',
    shipmentId: 'GT-2026-102',
    actorRole: 'buyer',
    actorAddress: ROLE_PROFILES.buyer.walletAddress,
    txHash: INITIAL_SHIPMENTS[1].txHash,
    blockNumber: 4_812_940,
    calldataPreview:
      'createShipment(KTZ, Elevator, "Kostanay -> Khorgos (PRC)", 2800, 341600000, ...)',
    amountKzt: 341_600_000,
    timestamp: '2026-11-11 19:15 AST',
  },
  {
    id: 'evt-2',
    eventName: 'DeliveryConfirmed',
    shipmentId: 'GT-2026-103',
    actorRole: 'carrier',
    actorAddress: ROLE_PROFILES.carrier.walletAddress,
    txHash: INITIAL_SHIPMENTS[2].txHash,
    blockNumber: 4_811_508,
    calldataPreview: 'confirmDelivery(103, 0x6d902b1c...4098)',
    amountKzt: 462_400_000,
    timestamp: '2026-11-10 14:22 AST',
  },
  {
    id: 'evt-3',
    eventName: 'FundsClaimed',
    shipmentId: 'GT-2026-105',
    actorRole: 'supplier',
    actorAddress: ROLE_PROFILES.supplier.walletAddress,
    txHash: INITIAL_SHIPMENTS[4].txHash,
    blockNumber: 4_809_114,
    calldataPreview: 'claimFunds(105)',
    amountKzt: 258_000_000,
    timestamp: '2026-11-08 09:50 AST',
  },
  {
    id: 'evt-4',
    eventName: 'RefundClaimed',
    shipmentId: 'GT-2026-106',
    actorRole: 'buyer',
    actorAddress: ROLE_PROFILES.buyer.walletAddress,
    txHash: INITIAL_SHIPMENTS[5].txHash,
    blockNumber: 4_801_772,
    calldataPreview: 'claimRefund(106)',
    amountKzt: 96_900_000,
    timestamp: '2026-10-30 18:10 AST',
  },
];

// ============================================================================
// 2. EMBEDDED SOLIDITY SOURCE & ETHERS.JS SIMULATION ENGINE
// ============================================================================

const GRAIN_ESCROW_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title GrainEscrow
 * @notice Permissioned blockchain escrow contract for Kazakhstan grain export logistics.
 * @dev Settles tokenized KZT (Digital Tenge / KZTD) between Grain Traders (Buyers),
 *      KTZ-authorized Carriers, and Grain Elevators (Suppliers).
 */
contract GrainEscrow is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant BUYER_ROLE = keccak256("BUYER_ROLE");
    bytes32 public constant CARRIER_ROLE = keccak256("CARRIER_ROLE");
    bytes32 public constant SUPPLIER_ROLE = keccak256("SUPPLIER_ROLE");

    enum ShipmentStatus {
        None,
        Pending,
        InTransit,
        Delivered,
        Refunded
    }

    struct Shipment {
        uint256 id;
        address buyer;
        address carrier;
        address supplier;
        string route;
        uint256 volumeTons;
        uint256 valueKzt;
        uint256 deadline;
        bytes32 waybillHash;
        ShipmentStatus status;
        bool fundsClaimed;
    }

    IERC20 public immutable kztToken;
    uint256 public nextShipmentId = 1;
    uint256 public totalValueLockedKzt;

    mapping(uint256 => Shipment) private _shipments;
    mapping(address => uint256) public supplierLockedBalanceKzt;
    mapping(address => uint256) public supplierClaimableBalanceKzt;

    event ShipmentCreated(
        uint256 indexed shipmentId,
        address indexed buyer,
        address indexed carrier,
        address supplier,
        string route,
        uint256 volumeTons,
        uint256 valueKzt,
        uint256 deadline,
        bytes32 waybillHash
    );
    event ShipmentInTransit(
        uint256 indexed shipmentId,
        address indexed carrier,
        bytes32 dispatchProofHash
    );
    event DeliveryConfirmed(
        uint256 indexed shipmentId,
        address indexed carrier,
        address indexed supplier,
        uint256 valueKzt,
        bytes32 deliveryProofHash
    );
    event FundsClaimed(
        uint256 indexed shipmentId,
        address indexed supplier,
        uint256 valueKzt
    );
    event RefundClaimed(
        uint256 indexed shipmentId,
        address indexed buyer,
        uint256 valueKzt
    );

    error ZeroAddress();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidRoute();
    error UnauthorizedParticipant();
    error InvalidCarrierRole();
    error InvalidSupplierRole();
    error InvalidShipmentState();
    error DeadlineNotExpired();
    error DeadlineExpired();
    error FundsAlreadyClaimed();

    constructor(address admin, address _kztToken) {
        if (admin == address(0) || _kztToken == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        kztToken = IERC20(_kztToken);
    }

    /**
     * @notice Buyer creates a new grain export escrow shipment and locks KZT tokens.
     */
    function createShipment(
        address carrier,
        address supplier,
        string calldata route,
        uint256 volumeTons,
        uint256 valueKzt,
        uint256 deadline,
        bytes32 waybillHash
    ) external onlyRole(BUYER_ROLE) nonReentrant returns (uint256 shipmentId) {
        if (carrier == address(0) || supplier == address(0)) revert ZeroAddress();
        if (!hasRole(CARRIER_ROLE, carrier)) revert InvalidCarrierRole();
        if (!hasRole(SUPPLIER_ROLE, supplier)) revert InvalidSupplierRole();
        if (bytes(route).length == 0) revert InvalidRoute();
        if (volumeTons == 0 || valueKzt == 0) revert InvalidAmount();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        shipmentId = nextShipmentId++;

        _shipments[shipmentId] = Shipment({
            id: shipmentId,
            buyer: msg.sender,
            carrier: carrier,
            supplier: supplier,
            route: route,
            volumeTons: volumeTons,
            valueKzt: valueKzt,
            deadline: deadline,
            waybillHash: waybillHash,
            status: ShipmentStatus.Pending,
            fundsClaimed: false
        });

        totalValueLockedKzt += valueKzt;
        supplierLockedBalanceKzt[supplier] += valueKzt;

        kztToken.safeTransferFrom(msg.sender, address(this), valueKzt);

        emit ShipmentCreated(
            shipmentId,
            msg.sender,
            carrier,
            supplier,
            route,
            volumeTons,
            valueKzt,
            deadline,
            waybillHash
        );
    }

    /**
     * @notice Assigned carrier marks a pending rail/port shipment as in transit.
     */
    function markInTransit(uint256 shipmentId, bytes32 dispatchProofHash)
        external
        onlyRole(CARRIER_ROLE)
    {
        Shipment storage s = _shipments[shipmentId];
        if (s.status != ShipmentStatus.Pending) revert InvalidShipmentState();
        if (s.carrier != msg.sender) revert UnauthorizedParticipant();
        if (block.timestamp > s.deadline) revert DeadlineExpired();

        s.status = ShipmentStatus.InTransit;
        if (dispatchProofHash != bytes32(0)) {
            s.waybillHash = dispatchProofHash;
        }

        emit ShipmentInTransit(shipmentId, msg.sender, dispatchProofHash);
    }

    /**
     * @notice Assigned carrier signs on-chain proof of delivery, unlocking escrow for the supplier.
     */
    function confirmDelivery(uint256 shipmentId, bytes32 deliveryProofHash)
        external
        onlyRole(CARRIER_ROLE)
        nonReentrant
    {
        Shipment storage s = _shipments[shipmentId];
        if (
            s.status != ShipmentStatus.Pending &&
            s.status != ShipmentStatus.InTransit
        ) {
            revert InvalidShipmentState();
        }
        if (s.carrier != msg.sender) revert UnauthorizedParticipant();
        if (block.timestamp > s.deadline) revert DeadlineExpired();

        s.status = ShipmentStatus.Delivered;
        if (deliveryProofHash != bytes32(0)) {
            s.waybillHash = deliveryProofHash;
        }

        uint256 amount = s.valueKzt;
        supplierLockedBalanceKzt[s.supplier] -= amount;
        supplierClaimableBalanceKzt[s.supplier] += amount;

        emit DeliveryConfirmed(
            shipmentId,
            msg.sender,
            s.supplier,
            amount,
            deliveryProofHash
        );
    }

    /**
     * @notice Designated grain elevator (supplier) claims unlocked KZT escrow after delivery.
     */
    function claimFunds(uint256 shipmentId)
        external
        onlyRole(SUPPLIER_ROLE)
        nonReentrant
    {
        Shipment storage s = _shipments[shipmentId];
        if (s.status != ShipmentStatus.Delivered) revert InvalidShipmentState();
        if (s.supplier != msg.sender) revert UnauthorizedParticipant();
        if (s.fundsClaimed) revert FundsAlreadyClaimed();

        s.fundsClaimed = true;
        uint256 payout = s.valueKzt;
        supplierClaimableBalanceKzt[s.supplier] -= payout;
        totalValueLockedKzt -= payout;

        kztToken.safeTransfer(s.supplier, payout);

        emit FundsClaimed(shipmentId, s.supplier, payout);
    }

    /**
     * @notice Buyer reclaims escrowed KZT if shipment fails to reach delivery before deadline.
     */
    function claimRefund(uint256 shipmentId)
        external
        onlyRole(BUYER_ROLE)
        nonReentrant
    {
        Shipment storage s = _shipments[shipmentId];
        if (
            s.status != ShipmentStatus.Pending &&
            s.status != ShipmentStatus.InTransit
        ) {
            revert InvalidShipmentState();
        }
        if (s.buyer != msg.sender) revert UnauthorizedParticipant();
        if (block.timestamp <= s.deadline) revert DeadlineNotExpired();

        s.status = ShipmentStatus.Refunded;
        uint256 refundAmount = s.valueKzt;
        supplierLockedBalanceKzt[s.supplier] -= refundAmount;
        totalValueLockedKzt -= refundAmount;

        kztToken.safeTransfer(s.buyer, refundAmount);

        emit RefundClaimed(shipmentId, s.buyer, refundAmount);
    }

    function getShipment(uint256 shipmentId)
        external
        view
        returns (Shipment memory)
    {
        return _shipments[shipmentId];
    }

    function getSupplierBalances(address supplier)
        external
        view
        returns (uint256 lockedKzt, uint256 claimableKzt)
    {
        return (
            supplierLockedBalanceKzt[supplier],
            supplierClaimableBalanceKzt[supplier]
        );
    }
}`;

const GRAIN_ESCROW_ABI = [
  'function BUYER_ROLE() view returns (bytes32)',
  'function CARRIER_ROLE() view returns (bytes32)',
  'function SUPPLIER_ROLE() view returns (bytes32)',
  'function totalValueLockedKzt() view returns (uint256)',
  'function createShipment(address carrier, address supplier, string route, uint256 volumeTons, uint256 valueKzt, uint256 deadline, bytes32 waybillHash) returns (uint256 shipmentId)',
  'function markInTransit(uint256 shipmentId, bytes32 dispatchProofHash)',
  'function confirmDelivery(uint256 shipmentId, bytes32 deliveryProofHash)',
  'function claimFunds(uint256 shipmentId)',
  'function claimRefund(uint256 shipmentId)',
  'function getSupplierBalances(address supplier) view returns (uint256 lockedKzt, uint256 claimableKzt)',
] as const;

const grainEscrowInterface = new ethers.Interface(GRAIN_ESCROW_ABI);

const ROLE_HASHES = {
  BUYER_ROLE: ethers.id('BUYER_ROLE'),
  CARRIER_ROLE: ethers.id('CARRIER_ROLE'),
  SUPPLIER_ROLE: ethers.id('SUPPLIER_ROLE'),
};

let simulatedBlockCounter = 4_812_945;

function nextBlockNumber(): number {
  simulatedBlockCounter += Math.floor(Math.random() * 3) + 1;
  return simulatedBlockCounter;
}

function formatAstanaTimestamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min} AST`;
}

async function simulateCreateShipmentTx(params: {
  carrier: string;
  supplier: string;
  route: string;
  volumeTons: number;
  valueKzt: number;
  deadlineIso: string;
  waybillRef: string;
}) {
  await new Promise((resolve) => setTimeout(resolve, 600));
  const deadlineUnix = Math.floor(new Date(`${params.deadlineIso}T23:59:59Z`).getTime() / 1000);
  const waybillHash = ethers.keccak256(
    ethers.toUtf8Bytes(`${params.waybillRef}|${params.route}|${params.volumeTons}`)
  );
  const calldata = grainEscrowInterface.encodeFunctionData('createShipment', [
    ethers.getAddress(params.carrier.toLowerCase()),
    ethers.getAddress(params.supplier.toLowerCase()),
    params.route,
    BigInt(params.volumeTons),
    BigInt(params.valueKzt),
    BigInt(deadlineUnix),
    waybillHash,
  ]);
  return {
    txHash: ethers.hexlify(ethers.randomBytes(32)),
    blockNumber: nextBlockNumber(),
    calldata,
    waybillHash,
  };
}

async function simulateMarkInTransitTx(onChainId: number, waybillRef: string) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const dispatchProofHash = ethers.keccak256(
    ethers.toUtf8Bytes(`DISPATCH|${onChainId}|${waybillRef}|${Date.now()}`)
  );
  const calldata = grainEscrowInterface.encodeFunctionData('markInTransit', [
    BigInt(onChainId),
    dispatchProofHash,
  ]);
  return {
    txHash: ethers.hexlify(ethers.randomBytes(32)),
    blockNumber: nextBlockNumber(),
    calldata,
    waybillHash: dispatchProofHash,
  };
}

async function simulateConfirmDeliveryTx(
  onChainId: number,
  waybillRef: string,
  carrierAddress: string
) {
  await new Promise((resolve) => setTimeout(resolve, 650));
  const deliveryProofHash = ethers.keccak256(
    ethers.toUtf8Bytes(`POD|${onChainId}|${waybillRef}|${carrierAddress}`)
  );
  const calldata = grainEscrowInterface.encodeFunctionData('confirmDelivery', [
    BigInt(onChainId),
    deliveryProofHash,
  ]);
  const r = ethers.keccak256(ethers.toUtf8Bytes(`sig-r|${deliveryProofHash}`)).slice(2);
  const s = ethers.keccak256(ethers.toUtf8Bytes(`sig-s|${carrierAddress}|${onChainId}`)).slice(2);
  return {
    txHash: ethers.hexlify(ethers.randomBytes(32)),
    blockNumber: nextBlockNumber(),
    calldata,
    waybillHash: deliveryProofHash,
    signature: `0x${r}${s}1b`,
  };
}

async function simulateClaimFundsTx(onChainId: number) {
  await new Promise((resolve) => setTimeout(resolve, 550));
  const calldata = grainEscrowInterface.encodeFunctionData('claimFunds', [BigInt(onChainId)]);
  return {
    txHash: ethers.hexlify(ethers.randomBytes(32)),
    blockNumber: nextBlockNumber(),
    calldata,
  };
}

async function simulateClaimRefundTx(onChainId: number) {
  await new Promise((resolve) => setTimeout(resolve, 550));
  const calldata = grainEscrowInterface.encodeFunctionData('claimRefund', [BigInt(onChainId)]);
  return {
    txHash: ethers.hexlify(ethers.randomBytes(32)),
    blockNumber: nextBlockNumber(),
    calldata,
  };
}

// ============================================================================
// 3. FORMATTERS & REUSABLE SHADCN-STYLE UI PRIMITIVES
// ============================================================================

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function formatKzt(amount: number): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)} KZT`;
}

function formatCompactKzt(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B KZT`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M KZT`;
  return formatKzt(amount);
}

function formatTons(tons: number): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(tons)} t`;
}

function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
}

function isDeadlineExpired(deadlineIso: string): boolean {
  return deadlineIso < REFERENCE_TODAY_ISO;
}

const BUTTON_VARIANTS = {
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

function UIButton({
  variant = 'default',
  size = 'md',
  type = 'button',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed select-none focus-visible:outline-2 focus-visible:outline-blue-700 focus-visible:outline-offset-2',
        BUTTON_VARIANTS[variant],
        size === 'sm' ? 'min-h-9 px-3 py-1.5 text-xs gap-1.5' : 'min-h-10 px-4 py-2 text-sm gap-2',
        className
      )}
      {...props}
    />
  );
}

const BADGE_VARIANTS = {
  default: 'bg-slate-100 text-slate-800 border-slate-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  'in-transit': 'bg-blue-50 text-blue-800 border-blue-200',
  delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  refunded: 'bg-rose-50 text-rose-800 border-rose-200',
  outline: 'bg-white text-slate-700 border-slate-300',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function UIBadge({
  variant = 'default',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof BADGE_VARIANTS;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        BADGE_VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}

function UICard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xs', className)}
      {...props}
    />
  );
}

function NativeModal({
  open,
  onOpenChange,
  labelledBy,
  closedby = 'any',
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labelledBy: string;
  closedby?: 'any' | 'none';
  children: React.ReactNode;
}) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = React.useRef(false);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      dialog.returnValue = '';
      onOpenChange(false);
    };
    const onCancel = (e: Event) => {
      if (closedby === 'none') {
        e.preventDefault();
        return;
      }
      onOpenChange(false);
    };
    dialog.addEventListener('close', onClose);
    dialog.addEventListener('cancel', onCancel);
    return () => {
      dialog.removeEventListener('close', onClose);
      dialog.removeEventListener('cancel', onCancel);
    };
  }, [closedby, onOpenChange]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || closedby !== 'any') return;
    if ('closedBy' in HTMLDialogElement.prototype) return;

    const outside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    const onDown = (e: PointerEvent) => {
      pressedOutsideRef.current = outside(e);
    };
    const onUp = (e: PointerEvent) => {
      if (pressedOutsideRef.current && outside(e)) dialog.close();
      pressedOutsideRef.current = false;
    };
    dialog.addEventListener('pointerdown', onDown);
    dialog.addEventListener('pointerup', onUp);
    return () => {
      dialog.removeEventListener('pointerdown', onDown);
      dialog.removeEventListener('pointerup', onUp);
    };
  }, [closedby]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      {...({ closedby } as Record<string, unknown>)}
      className="m-auto w-full max-w-2xl max-h-[90dvh] rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl overscroll-contain backdrop:bg-slate-900/55 backdrop:backdrop-blur-xs backdrop:overflow-hidden backdrop:overscroll-contain open:flex open:flex-col"
    >
      {children}
    </dialog>
  );
}

// ============================================================================
// 4. MAIN DASHBOARD COMPONENT
// ============================================================================

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'shipments', label: 'Shipments', icon: Package },
  { id: 'contracts', label: 'Smart Contracts', icon: FileCode2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const STATUS_FILTERS: Array<'All' | ShipmentStatus> = [
  'All',
  'Pending',
  'In Transit',
  'Delivered',
  'Refunded',
];

const STATUS_BADGE_MAP: Record<
  ShipmentStatus,
  { variant: keyof typeof BADGE_VARIANTS; icon: React.ComponentType<{ className?: string }> }
> = {
  Pending: { variant: 'pending', icon: Clock },
  'In Transit': { variant: 'in-transit', icon: TrainFront },
  Delivered: { variant: 'delivered', icon: CheckCircle2 },
  Refunded: { variant: 'refunded', icon: RotateCcw },
};

export function GrainTrustDashboard() {
  const [activeRole, setActiveRole] = React.useState<RoleId>('buyer');
  const [activeNav, setActiveNav] = React.useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const [shipments, setShipments] = React.useState<ShipmentRecord[]>(INITIAL_SHIPMENTS);
  const [events, setEvents] = React.useState<BlockchainTxEvent[]>(INITIAL_EVENTS);
  const [ktzOracleSync, setKtzOracleSync] = React.useState(true);
  const [requireEWaybill, setRequireEWaybill] = React.useState(true);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'All' | ShipmentStatus>('All');

  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [inspectedShipmentId, setInspectedShipmentId] = React.useState<string | null>(null);
  const [pendingTxId, setPendingTxId] = React.useState<string | null>(null);
  const [contractTab, setContractTab] = React.useState<'solidity' | 'roles' | 'events'>('solidity');
  const [copiedSol, setCopiedSol] = React.useState(false);

  const [toast, setToast] = React.useState<{
    title: string;
    detail: string;
    txHash?: string;
  } | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = React.useState('');

  // Create Shipment Modal Form State
  const [selectedCorridor, setSelectedCorridor] = React.useState(KAZAKHSTAN_CORRIDORS[1].route);
  const [customRoute, setCustomRoute] = React.useState('');
  const [grainGrade, setGrainGrade] = React.useState('Class 3 Milling Wheat (12.5% Protein)');
  const [volumeTons, setVolumeTons] = React.useState('1500');
  const [valueKzt, setValueKzt] = React.useState(String(1500 * DEFAULT_RATE_KZT_PER_TON));
  const [valueManuallyEdited, setValueManuallyEdited] = React.useState(false);
  const [deadline, setDeadline] = React.useState('2026-12-10');
  const [waybillRef, setWaybillRef] = React.useState('KTZ-ETRAN-885104');
  const [formErrors, setFormErrors] = React.useState<FormErrors>({});
  const [formTouched, setFormTouched] = React.useState<Record<string, boolean>>({});
  const [isCreating, setIsCreating] = React.useState(false);

  const customRouteRef = React.useRef<HTMLInputElement>(null);
  const gradeRef = React.useRef<HTMLInputElement>(null);
  const volumeRef = React.useRef<HTMLInputElement>(null);
  const valueRef = React.useRef<HTMLInputElement>(null);
  const deadlineRef = React.useRef<HTMLInputElement>(null);
  const waybillRefInput = React.useRef<HTMLInputElement>(null);

  const roleSelectId = React.useId();
  const searchInputId = React.useId();
  const tableCaptionId = React.useId();
  const createTitleId = React.useId();
  const inspectTitleId = React.useId();

  const roleProfile = ROLE_PROFILES[activeRole];

  const notify = React.useCallback((title: string, detail: string, txHash?: string) => {
    setToast({ title, detail, txHash });
    setLiveAnnouncement(`${title}. ${detail}`);
  }, []);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(t);
  }, [toast]);

  React.useEffect(() => {
    if (createModalOpen) {
      setFormErrors({});
      setFormTouched({});
      setIsCreating(false);
    }
  }, [createModalOpen]);

  const metrics = React.useMemo(() => {
    let totalValueLockedKzt = 0;
    let activeShipmentsCount = 0;
    let activeTonnage = 0;
    let pendingCount = 0;
    let inTransitCount = 0;
    let deliveredCount = 0;
    let deliveredTonnage = 0;
    let supplierLockedKzt = 0;
    let supplierClaimableKzt = 0;
    let supplierSettledKzt = 0;
    let refundableExpiredCount = 0;

    for (const s of shipments) {
      const isEscrowActive = s.status === 'Pending' || s.status === 'In Transit';
      const stillInContract = isEscrowActive || (s.status === 'Delivered' && !s.fundsClaimed);
      if (stillInContract) totalValueLockedKzt += s.valueKzt;
      if (isEscrowActive) {
        activeShipmentsCount += 1;
        activeTonnage += s.volumeTons;
        supplierLockedKzt += s.valueKzt;
        if (isDeadlineExpired(s.deadline)) refundableExpiredCount += 1;
      }
      if (s.status === 'Pending') pendingCount += 1;
      if (s.status === 'In Transit') inTransitCount += 1;
      if (s.status === 'Delivered') {
        deliveredCount += 1;
        deliveredTonnage += s.volumeTons;
        if (s.fundsClaimed) supplierSettledKzt += s.valueKzt;
        else supplierClaimableKzt += s.valueKzt;
      }
    }

    return {
      totalValueLockedKzt,
      activeShipmentsCount,
      activeTonnage,
      pendingCount,
      inTransitCount,
      deliveredCount,
      deliveredTonnage,
      supplierLockedKzt,
      supplierClaimableKzt,
      supplierSettledKzt,
      refundableExpiredCount,
    };
  }, [shipments]);

  const filteredShipments = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shipments.filter((s) => {
      if (statusFilter !== 'All' && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.id.toLowerCase().includes(q) ||
        s.route.toLowerCase().includes(q) ||
        s.grainGrade.toLowerCase().includes(q) ||
        s.waybillRef.toLowerCase().includes(q)
      );
    });
  }, [shipments, searchQuery, statusFilter]);

  const inspectedShipment = React.useMemo(
    () => shipments.find((s) => s.id === inspectedShipmentId) ?? null,
    [shipments, inspectedShipmentId]
  );

  const nextClaimableShipment = shipments.find(
    (s) => s.status === 'Delivered' && !s.fundsClaimed
  );

  const latestBlock = events[0]?.blockNumber ?? 4_812_940;
  const effectiveRoute = selectedCorridor === 'custom' ? customRoute.trim() : selectedCorridor;
  const effectiveCorridorType =
    KAZAKHSTAN_CORRIDORS.find((c) => c.route === selectedCorridor)?.corridorType ?? 'Rail Export';

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
        if (!deadline || deadline <= REFERENCE_TODAY_ISO) {
          return `Delivery deadline must be after ${REFERENCE_TODAY_ISO}.`;
        }
        return undefined;
      case 'waybillRef':
        if (!/^[A-Za-z0-9-]{6,32}$/.test(waybillRef.trim())) {
          return 'Use 6-32 alphanumeric/hyphen characters (e.g., KTZ-ETRAN-885104).';
        }
        return undefined;
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;

    const nextErrors: FormErrors = {
      route: validateField('route'),
      grainGrade: validateField('grainGrade'),
      volumeTons: validateField('volumeTons'),
      valueKzt: validateField('valueKzt'),
      deadline: validateField('deadline'),
      waybillRef: validateField('waybillRef'),
    };
    setFormErrors(nextErrors);
    setFormTouched({
      route: true,
      grainGrade: true,
      volumeTons: true,
      valueKzt: true,
      deadline: true,
      waybillRef: true,
    });

    const firstInvalid = (
      ['route', 'grainGrade', 'volumeTons', 'valueKzt', 'deadline', 'waybillRef'] as const
    ).find((k) => Boolean(nextErrors[k]));

    if (firstInvalid) {
      const refMap = {
        route: customRouteRef,
        grainGrade: gradeRef,
        volumeTons: volumeRef,
        valueKzt: valueRef,
        deadline: deadlineRef,
        waybillRef: waybillRefInput,
      };
      refMap[firstInvalid].current?.focus();
      return;
    }

    setIsCreating(true);
    try {
      const payload: CreateShipmentPayload = {
        route: effectiveRoute,
        corridorType: effectiveCorridorType,
        grainGrade: grainGrade.trim(),
        volumeTons: Number(volumeTons),
        valueKzt: Number(valueKzt),
        deadline,
        waybillRef: waybillRef.trim().toUpperCase(),
      };
      const receipt = await simulateCreateShipmentTx({
        carrier: ROLE_PROFILES.carrier.walletAddress,
        supplier: ROLE_PROFILES.supplier.walletAddress,
        route: payload.route,
        volumeTons: payload.volumeTons,
        valueKzt: payload.valueKzt,
        deadlineIso: payload.deadline,
        waybillRef: payload.waybillRef,
      });

      const nextChainId = shipments.reduce((max, s) => Math.max(max, s.onChainId), 100) + 1;
      const newId = `GT-2026-${nextChainId}`;
      const timestamp = formatAstanaTimestamp();

      setShipments((prev) => [
        {
          id: newId,
          onChainId: nextChainId,
          route: payload.route,
          corridorType: payload.corridorType,
          grainGrade: payload.grainGrade,
          volumeTons: payload.volumeTons,
          valueKzt: payload.valueKzt,
          deadline: payload.deadline,
          status: 'Pending',
          fundsClaimed: false,
          buyerOrg: ROLE_PROFILES.buyer.organization,
          buyerAddress: ROLE_PROFILES.buyer.walletAddress,
          carrierOrg: ROLE_PROFILES.carrier.organization,
          carrierAddress: ROLE_PROFILES.carrier.walletAddress,
          supplierOrg: ROLE_PROFILES.supplier.organization,
          supplierAddress: ROLE_PROFILES.supplier.walletAddress,
          waybillRef: payload.waybillRef,
          waybillHash: receipt.waybillHash ?? '',
          txHash: receipt.txHash,
          updatedAt: timestamp,
        },
        ...prev,
      ]);

      setEvents((prev) => [
        {
          id: `evt-${Date.now()}`,
          eventName: 'ShipmentCreated',
          shipmentId: newId,
          actorRole: 'buyer',
          actorAddress: ROLE_PROFILES.buyer.walletAddress,
          txHash: receipt.txHash,
          blockNumber: receipt.blockNumber,
          calldataPreview: `createShipment(KTZ, Elevator, "${payload.route}", ${payload.volumeTons}, ${payload.valueKzt})`,
          amountKzt: payload.valueKzt,
          timestamp,
        },
        ...prev,
      ]);

      setCreateModalOpen(false);
      notify(
        `Escrow Shipment ${newId} Created`,
        `${formatKzt(payload.valueKzt)} locked in GrainEscrow for ${payload.route}.`,
        receipt.txHash
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleMarkInTransit = async (shipment: ShipmentRecord) => {
    setPendingTxId(shipment.id);
    try {
      const receipt = await simulateMarkInTransitTx(shipment.onChainId, shipment.waybillRef);
      const timestamp = formatAstanaTimestamp();
      setShipments((prev) =>
        prev.map((s) =>
          s.id === shipment.id
            ? {
                ...s,
                status: 'In Transit',
                waybillHash: receipt.waybillHash ?? s.waybillHash,
                txHash: receipt.txHash,
                updatedAt: timestamp,
              }
            : s
        )
      );
      setEvents((prev) => [
        {
          id: `evt-${Date.now()}`,
          eventName: 'ShipmentInTransit',
          shipmentId: shipment.id,
          actorRole: 'carrier',
          actorAddress: ROLE_PROFILES.carrier.walletAddress,
          txHash: receipt.txHash,
          blockNumber: receipt.blockNumber,
          calldataPreview: `markInTransit(${shipment.onChainId}, ${shortenAddress(receipt.waybillHash ?? '', 6)})`,
          timestamp,
        },
        ...prev,
      ]);
      notify(
        `${shipment.id} Dispatched In Transit`,
        `KTZ Express anchored rail dispatch on block #${receipt.blockNumber}.`,
        receipt.txHash
      );
    } finally {
      setPendingTxId(null);
    }
  };

  const handleConfirmDelivery = async (shipment: ShipmentRecord) => {
    setPendingTxId(shipment.id);
    try {
      const receipt = await simulateConfirmDeliveryTx(
        shipment.onChainId,
        shipment.waybillRef,
        ROLE_PROFILES.carrier.walletAddress
      );
      const timestamp = formatAstanaTimestamp();
      setShipments((prev) =>
        prev.map((s) =>
          s.id === shipment.id
            ? {
                ...s,
                status: 'Delivered',
                waybillHash: receipt.waybillHash ?? s.waybillHash,
                txHash: receipt.txHash,
                signature: receipt.signature,
                updatedAt: timestamp,
              }
            : s
        )
      );
      setEvents((prev) => [
        {
          id: `evt-${Date.now()}`,
          eventName: 'DeliveryConfirmed',
          shipmentId: shipment.id,
          actorRole: 'carrier',
          actorAddress: ROLE_PROFILES.carrier.walletAddress,
          txHash: receipt.txHash,
          blockNumber: receipt.blockNumber,
          calldataPreview: `confirmDelivery(${shipment.onChainId}, ${shortenAddress(receipt.waybillHash ?? '', 6)})`,
          amountKzt: shipment.valueKzt,
          timestamp,
        },
        ...prev,
      ]);
      notify(
        `Delivery Signed for ${shipment.id}`,
        `${formatKzt(shipment.valueKzt)} unlocked and ready for Supplier claim.`,
        receipt.txHash
      );
    } finally {
      setPendingTxId(null);
    }
  };

  const handleClaimFunds = async (shipment: ShipmentRecord) => {
    if (shipment.status !== 'Delivered' || shipment.fundsClaimed) return;
    setPendingTxId(shipment.id);
    try {
      const receipt = await simulateClaimFundsTx(shipment.onChainId);
      const timestamp = formatAstanaTimestamp();
      setShipments((prev) =>
        prev.map((s) =>
          s.id === shipment.id
            ? { ...s, fundsClaimed: true, txHash: receipt.txHash, updatedAt: timestamp }
            : s
        )
      );
      setEvents((prev) => [
        {
          id: `evt-${Date.now()}`,
          eventName: 'FundsClaimed',
          shipmentId: shipment.id,
          actorRole: 'supplier',
          actorAddress: ROLE_PROFILES.supplier.walletAddress,
          txHash: receipt.txHash,
          blockNumber: receipt.blockNumber,
          calldataPreview: `claimFunds(${shipment.onChainId})`,
          amountKzt: shipment.valueKzt,
          timestamp,
        },
        ...prev,
      ]);
      notify(
        `Funds Claimed for ${shipment.id}`,
        `${formatKzt(shipment.valueKzt)} transferred to ${shipment.supplierOrg}.`,
        receipt.txHash
      );
    } finally {
      setPendingTxId(null);
    }
  };

  const handleClaimRefund = async (shipment: ShipmentRecord) => {
    setPendingTxId(shipment.id);
    try {
      const receipt = await simulateClaimRefundTx(shipment.onChainId);
      const timestamp = formatAstanaTimestamp();
      setShipments((prev) =>
        prev.map((s) =>
          s.id === shipment.id
            ? { ...s, status: 'Refunded', txHash: receipt.txHash, updatedAt: timestamp }
            : s
        )
      );
      setEvents((prev) => [
        {
          id: `evt-${Date.now()}`,
          eventName: 'RefundClaimed',
          shipmentId: shipment.id,
          actorRole: 'buyer',
          actorAddress: ROLE_PROFILES.buyer.walletAddress,
          txHash: receipt.txHash,
          blockNumber: receipt.blockNumber,
          calldataPreview: `claimRefund(${shipment.onChainId})`,
          amountKzt: shipment.valueKzt,
          timestamp,
        },
        ...prev,
      ]);
      notify(
        `Escrow Refunded for ${shipment.id}`,
        `${formatKzt(shipment.valueKzt)} returned to ${shipment.buyerOrg}.`,
        receipt.txHash
      );
    } finally {
      setPendingTxId(null);
    }
  };

  const handleCopySolidity = async () => {
    try {
      await navigator.clipboard.writeText(GRAIN_ESCROW_SOL);
      setCopiedSol(true);
      setTimeout(() => setCopiedSol(false), 2000);
    } catch {
      setCopiedSol(false);
    }
  };

  const handleDownloadSolidity = () => {
    const blob = new Blob([GRAIN_ESCROW_SOL], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GrainEscrow.sol';
    a.click();
    URL.revokeObjectURL(url);
  };

  const solidityLines = React.useMemo(() => GRAIN_ESCROW_SOL.split('\n'), []);

  const renderShipmentsTable = () => {
    if (filteredShipments.length === 0) {
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
      <div
        tabIndex={0}
        role="region"
        aria-labelledby={tableCaptionId}
        className="overflow-x-auto max-w-full rounded-b-xl"
      >
        <table className="w-full border-separate border-spacing-0 text-sm text-left">
          <caption id={tableCaptionId} className="sr-only">
            GrainTrust permissioned escrow shipments ledger for Kazakhstan export corridors
          </caption>
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                ID
              </th>
              <th scope="col" className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                Route
              </th>
              <th scope="col" className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right whitespace-nowrap">
                Volume (Tons)
              </th>
              <th scope="col" className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right whitespace-nowrap">
                Value (KZT)
              </th>
              <th scope="col" className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                Deadline
              </th>
              <th scope="col" className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                Status
              </th>
              <th scope="col" className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right whitespace-nowrap">
                Role Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredShipments.map((shipment) => {
              const statusCfg = STATUS_BADGE_MAP[shipment.status];
              const StatusIcon = statusCfg.icon;
              const isBusy = pendingTxId === shipment.id;
              const expired = isDeadlineExpired(shipment.deadline);
              const isActiveEscrow =
                shipment.status === 'Pending' || shipment.status === 'In Transit';

              return (
                <tr key={shipment.id} className="transition-colors hover:bg-slate-50/90">
                  <th scope="row" className="border-b border-slate-100 px-4 py-3.5 text-left align-middle whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setInspectedShipmentId(shipment.id)}
                      aria-label={`Inspect escrow details for ${shipment.id}`}
                      className="inline-flex flex-col items-start text-left hover:text-blue-700 cursor-pointer"
                    >
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {shipment.id}
                      </span>
                      <span className="text-[11px] font-normal text-slate-500">
                        {shipment.waybillRef}
                      </span>
                    </button>
                  </th>

                  <td className="border-b border-slate-100 px-4 py-3.5 align-middle">
                    <p className="font-medium text-slate-900 whitespace-nowrap">{shipment.route}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[220px]">
                      {shipment.grainGrade}
                    </p>
                  </td>

                  <td className="border-b border-slate-100 px-4 py-3.5 text-right font-mono font-medium text-slate-800 tabular-nums whitespace-nowrap align-middle">
                    {formatTons(shipment.volumeTons)}
                  </td>

                  <td className="border-b border-slate-100 px-4 py-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap align-middle">
                    {formatKzt(shipment.valueKzt)}
                  </td>

                  <td className="border-b border-slate-100 px-4 py-3.5 font-mono text-xs tabular-nums whitespace-nowrap align-middle">
                    <span className={expired && isActiveEscrow ? 'font-semibold text-rose-700' : 'text-slate-700'}>
                      {shipment.deadline}
                    </span>
                    {expired && isActiveEscrow && (
                      <span className="block font-sans text-[11px] font-medium text-rose-600">
                        Expired (Demurrage Risk)
                      </span>
                    )}
                  </td>

                  <td className="border-b border-slate-100 px-4 py-3.5 align-middle">
                    <div className="inline-flex flex-col items-start gap-1">
                      <UIBadge variant={statusCfg.variant}>
                        <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {shipment.status}
                      </UIBadge>
                      {shipment.status === 'Delivered' && (
                        <span className="text-[11px] text-slate-500">
                          {shipment.fundsClaimed ? 'Settled to Elevator' : 'Unlocked for Claim'}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="border-b border-slate-100 px-4 py-3.5 text-right whitespace-nowrap align-middle">
                    <div className="inline-flex flex-wrap items-center justify-end gap-2">
                      {activeRole === 'buyer' && (
                        <>
                          {isActiveEscrow && expired && (
                            <UIButton
                              size="sm"
                              variant="destructive"
                              disabled={isBusy}
                              aria-label={`Claim Refund for shipment ${shipment.id}`}
                              onClick={() => handleClaimRefund(shipment)}
                            >
                              {isBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              Claim Refund
                            </UIButton>
                          )}
                          <UIButton
                            size="sm"
                            variant="outline"
                            aria-label={`Inspect shipment ${shipment.id}`}
                            onClick={() => setInspectedShipmentId(shipment.id)}
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            Inspect
                          </UIButton>
                        </>
                      )}

                      {activeRole === 'carrier' && (
                        <>
                          {shipment.status === 'Pending' && !expired && (
                            <UIButton
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              aria-label={`Dispatch shipment ${shipment.id}`}
                              onClick={() => handleMarkInTransit(shipment)}
                            >
                              <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                              Dispatch
                            </UIButton>
                          )}
                          {isActiveEscrow && !expired ? (
                            <UIButton
                              size="sm"
                              variant="emerald"
                              disabled={isBusy}
                              aria-label={`Confirm Delivery (Sign) for shipment ${shipment.id}`}
                              onClick={() => handleConfirmDelivery(shipment)}
                            >
                              {isBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              Confirm Delivery (Sign)
                            </UIButton>
                          ) : isActiveEscrow && expired ? (
                            <UIButton
                              size="sm"
                              variant="outline"
                              aria-label={`Inspect expired shipment ${shipment.id}`}
                              onClick={() => setInspectedShipmentId(shipment.id)}
                            >
                              <Clock className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
                              Expired
                            </UIButton>
                          ) : (
                            <UIButton
                              size="sm"
                              variant="ghost"
                              aria-label={`View signed proof for shipment ${shipment.id}`}
                              onClick={() => setInspectedShipmentId(shipment.id)}
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                              Proof
                            </UIButton>
                          )}
                        </>
                      )}

                      {activeRole === 'supplier' && (
                        <>
                          {shipment.status === 'Delivered' && !shipment.fundsClaimed && (
                            <UIButton
                              size="sm"
                              variant="emerald"
                              disabled={isBusy}
                              aria-label={`Claim Funds for shipment ${shipment.id}`}
                              onClick={() => handleClaimFunds(shipment)}
                            >
                              {isBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              ) : (
                                <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              Claim Funds
                            </UIButton>
                          )}
                          {isActiveEscrow && (
                            <UIButton
                              size="sm"
                              variant="outline"
                              aria-disabled="true"
                              aria-label={`Claim Funds for shipment ${shipment.id} (locked until Delivered)`}
                              className="opacity-55 cursor-not-allowed hover:bg-white hover:border-slate-300 text-slate-500"
                              onClick={(e) => e.preventDefault()}
                            >
                              <Lock className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                              Claim Funds
                            </UIButton>
                          )}
                          {shipment.status === 'Delivered' && shipment.fundsClaimed && (
                            <UIBadge variant="emerald" className="py-1 px-2.5">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              Funds Settled
                            </UIBadge>
                          )}
                          {shipment.status === 'Refunded' && (
                            <UIButton
                              size="sm"
                              variant="ghost"
                              aria-label={`Inspect refunded shipment ${shipment.id}`}
                              onClick={() => setInspectedShipmentId(shipment.id)}
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                              Details
                            </UIButton>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderContractViewer = (compact = false) => (
    <UICard className="overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <FileCode2 className="h-4 w-4 text-blue-700" aria-hidden="true" />
            <h3 className="font-mono text-sm sm:text-base font-semibold text-slate-900">
              GrainEscrow.sol
            </h3>
            <UIBadge variant="emerald">OpenZeppelin v5 Verified</UIBadge>
            <UIBadge variant="blue">Solidity ^0.8.20</UIBadge>
          </div>
          <p className="text-xs text-slate-500">
            Deployed on KZ-GrainChain (Besu #7701) at{' '}
            <span className="font-mono text-slate-700">{CONTRACT_ADDRESS}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <UIButton variant="outline" size="sm" onClick={handleCopySolidity}>
            {copiedSol ? (
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
          </UIButton>
          <UIButton variant="outline" size="sm" onClick={handleDownloadSolidity}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Download .sol
          </UIButton>
        </div>
      </div>

      <div className="px-5 py-4">
        <div
          role="tablist"
          aria-label="Smart contract viewer tabs"
          className="flex items-center gap-1 overflow-x-auto border-b border-slate-200"
        >
          {(
            [
              { id: 'solidity', label: 'Source Code (GrainEscrow.sol)' },
              { id: 'roles', label: 'AccessControl Roles & ABI' },
              { id: 'events', label: `On-Chain Event Log (${events.length})` },
            ] as const
          ).map((tab) => {
            const selected = contractTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setContractTab(tab.id)}
                className={cn(
                  'relative flex-none min-h-10 px-4 py-2 text-sm font-medium whitespace-nowrap cursor-pointer transition-colors',
                  selected
                    ? 'text-blue-700 border-b-2 border-blue-700'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="pt-4">
          {contractTab === 'solidity' && (
            <div
              className={cn(
                'overflow-auto rounded-lg border border-slate-800 bg-slate-950 text-slate-100 font-mono text-xs leading-6',
                compact ? 'max-h-[420px]' : 'max-h-[640px]'
              )}
            >
              <table className="w-full border-collapse">
                <tbody>
                  {solidityLines.map((line, i) => (
                    <tr key={i} className="hover:bg-slate-900/70">
                      <td className="select-none border-r border-slate-800 px-3 py-0.5 text-right text-slate-500 w-12 align-top">
                        {i + 1}
                      </td>
                      <td className="px-4 py-0.5 whitespace-pre text-slate-100">
                        {line || ' '}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {contractTab === 'roles' && (
            <div className="space-y-4">
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
                  {GRAIN_ESCROW_ABI.map((frag) => (
                    <li key={frag} className="px-4 py-2.5 break-all">
                      {frag}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {contractTab === 'events' && (
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
                      <UIBadge variant="outline">{evt.shipmentId}</UIBadge>
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
          )}
        </div>
      </div>
    </UICard>
  );

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      <a
        href="#main-heading"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-blue-700 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Workspace sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col transition-transform duration-200 lg:static lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-emerald-400 shadow-xs">
              <Wheat className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-slate-900 leading-none">
                GrainTrust
              </p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">KZ Trade Escrow</p>
            </div>
          </div>
          <button
            type="button"
            className="lg:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Primary" className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  setActiveNav(item.id);
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer text-left',
                  isActive
                    ? 'bg-blue-50 text-blue-800 border border-blue-200/80'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                )}
              >
                <Icon
                  className={cn('h-4 w-4 shrink-0', isActive ? 'text-blue-700' : 'text-slate-500')}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 bg-slate-50/70">
          <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Consortium Node</span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                Online
              </span>
            </div>
            <p className="font-mono text-[11px] text-slate-800 truncate">Besu Chain #7701</p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Block #{latestBlock.toLocaleString('en-US')}</span>
              <span>KZTD</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                    AIFC Permissioned Settlement
                  </span>
                  <span className="hidden sm:inline text-slate-300">/</span>
                  <span className="hidden sm:inline text-xs text-slate-500 truncate">
                    {roleProfile.organization}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  Active Signer:{' '}
                  <span className="font-mono text-slate-800">
                    {shortenAddress(roleProfile.walletAddress, 6)}
                  </span>{' '}
                  •{' '}
                  <span className="font-mono font-medium text-emerald-700">
                    {roleProfile.accessControlRole}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5">
                <label
                  htmlFor={roleSelectId}
                  className="text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap"
                >
                  Role
                </label>
                <select
                  id={roleSelectId}
                  name="activeRole"
                  value={activeRole}
                  onChange={(e) => {
                    const next = e.target.value as RoleId;
                    setActiveRole(next);
                    setLiveAnnouncement(`Switched active role to ${ROLE_PROFILES[next].label}`);
                  }}
                  className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-blue-700 cursor-pointer"
                >
                  <option value="buyer">Buyer (Grain Trader)</option>
                  <option value="carrier">Carrier (Logistics/KTZ)</option>
                  <option value="supplier">Supplier (Elevator)</option>
                </select>
              </div>

              {activeRole === 'buyer' && (
                <UIButton onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create Escrow Shipment
                </UIButton>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1
                id="main-heading"
                tabIndex={-1}
                className="text-2xl font-bold tracking-tight text-slate-900 focus:outline-none"
              >
                {activeNav === 'dashboard' && 'Escrow Operations Overview'}
                {activeNav === 'shipments' && 'Grain Export Shipments Ledger'}
                {activeNav === 'contracts' && 'Smart Contract & Event Inspector'}
                {activeNav === 'settings' && 'Consortium Node & Role Configuration'}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Automated KZT Digital Tenge escrow eliminating railcar demurrage delays and
                counterparty payment defaults across Kazakhstan corridors.
              </p>
            </div>
            <UIBadge variant="outline" className="py-1 px-3 font-mono text-xs self-start sm:self-auto">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              {roleProfile.accessControlRole}
            </UIBadge>
          </div>

          {toast && (
            <div
              role="status"
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 shadow-xs"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2
                  className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold">{toast.title}</p>
                  <p className="text-xs text-emerald-800">{toast.detail}</p>
                  {toast.txHash && (
                    <p className="mt-0.5 font-mono text-[11px] text-emerald-700 break-all">
                      Tx Hash: {toast.txHash}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setToast(null)}
                className="self-end sm:self-center rounded-md p-1 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {activeNav === 'dashboard' && (
            <>
              {/* Role-Adaptive Banner */}
              <section
                aria-label="Role permissions and quick action"
                className={cn(
                  'rounded-xl border px-5 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between',
                  activeRole === 'buyer' && 'border-blue-200 bg-blue-50/60',
                  activeRole === 'carrier' && 'border-slate-200 bg-white',
                  activeRole === 'supplier' && 'border-emerald-200 bg-emerald-50/50'
                )}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Active Workspace Perspective:
                    </span>
                    <UIBadge variant={activeRole === 'supplier' ? 'emerald' : 'blue'}>
                      {roleProfile.label}
                    </UIBadge>
                    <span className="text-xs text-slate-500">{roleProfile.jurisdiction}</span>
                  </div>
                  <p className="text-sm text-slate-700">{roleProfile.permissionSummary}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {activeRole === 'buyer' && (
                    <>
                      {metrics.refundableExpiredCount > 0 && (
                        <UIBadge variant="refunded" className="py-1.5 px-3">
                          {metrics.refundableExpiredCount} Expired Shipment Eligible for Refund
                        </UIBadge>
                      )}
                      <UIButton onClick={() => setCreateModalOpen(true)}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Create Escrow Shipment
                      </UIButton>
                    </>
                  )}

                  {activeRole === 'carrier' && (
                    <UIBadge variant="in-transit" className="py-1.5 px-3 text-xs">
                      <TrainFront className="h-3.5 w-3.5" aria-hidden="true" />
                      {metrics.activeShipmentsCount} Active Rail/Port Consignments
                    </UIBadge>
                  )}

                  {activeRole === 'supplier' && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2">
                        <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                          Locked in Transit
                        </span>
                        <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                          {formatKzt(metrics.supplierLockedKzt)}
                        </span>
                      </div>
                      <div className="rounded-lg border border-emerald-200 bg-white px-3.5 py-2">
                        <span className="block text-[11px] font-medium uppercase tracking-wider text-emerald-700">
                          Claimable Released
                        </span>
                        <span className="font-mono text-sm font-semibold text-emerald-800 tabular-nums">
                          {formatKzt(metrics.supplierClaimableKzt)}
                        </span>
                      </div>
                      {nextClaimableShipment ? (
                        <UIButton
                          variant="emerald"
                          disabled={pendingTxId === nextClaimableShipment.id}
                          onClick={() => handleClaimFunds(nextClaimableShipment)}
                        >
                          <Wallet className="h-4 w-4" aria-hidden="true" />
                          Claim Funds ({nextClaimableShipment.id})
                        </UIButton>
                      ) : (
                        <UIBadge variant="outline" className="py-1.5 px-3">
                          <Lock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                          All Released Funds Settled
                        </UIBadge>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Metrics Grid */}
              <section
                aria-label="Key escrow metrics"
                className="grid grid-cols-1 gap-4 md:grid-cols-3"
              >
                <UICard className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Total Value Locked (KZT)
                    </p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <Lock className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-3 font-mono text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {formatKzt(metrics.totalValueLockedKzt)}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {formatCompactKzt(metrics.totalValueLockedKzt)} default-protected in{' '}
                    <span className="font-mono">GrainEscrow.sol</span>
                  </p>
                </UICard>

                <UICard className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Active Shipments
                    </p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                      <TrainFront className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-3 font-mono text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {metrics.activeShipmentsCount}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {metrics.pendingCount} Pending • {metrics.inTransitCount} In Transit (
                    {formatTons(metrics.activeTonnage)})
                    {metrics.refundableExpiredCount > 0 && (
                      <span className="text-rose-700 font-medium">
                        {' '}
                        • {metrics.refundableExpiredCount} demurrage overdue
                      </span>
                    )}
                  </p>
                </UICard>

                <UICard className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Delivered Shipments
                    </p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-3 font-mono text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {metrics.deliveredCount}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {formatTons(metrics.deliveredTonnage)} verified •{' '}
                    {formatCompactKzt(metrics.supplierSettledKzt)} settled
                  </p>
                </UICard>
              </section>

              {/* Shipments Ledger Table */}
              <UICard>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Escrow Shipments Ledger
                    </h2>
                    <p className="text-sm text-slate-500">
                      Click any shipment ID to inspect on-chain proofs, participants, and KTZ
                      e-Waybill hashes.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <search className="relative">
                      <label htmlFor={searchInputId} className="sr-only">
                        Search shipments by ID, route, grain grade, or waybill
                      </label>
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        id={searchInputId}
                        name="shipmentSearch"
                        type="search"
                        placeholder="Search route, ID, waybill..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="min-h-9 w-56 rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700"
                      />
                    </search>

                    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter shipments by status">
                      {STATUS_FILTERS.map((status) => (
                        <button
                          key={status}
                          type="button"
                          aria-pressed={statusFilter === status}
                          onClick={() => setStatusFilter(status)}
                          className={cn(
                            'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                            statusFilter === status
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          )}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {renderShipmentsTable()}
              </UICard>

              {/* Smart Contract Code Viewer at bottom of Dashboard */}
              <section aria-label="GrainEscrow smart contract code viewer" className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Smart Contract Reference Output
                  </h2>
                  <UIButton variant="ghost" size="sm" onClick={() => setActiveNav('contracts')}>
                    Open Full Inspector
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </UIButton>
                </div>
                {renderContractViewer(true)}
              </section>
            </>
          )}

          {activeNav === 'shipments' && (
            <UICard>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    All Consortium Shipments ({filteredShipments.length})
                  </h2>
                  <p className="text-sm text-slate-500">
                    Viewing as {roleProfile.label} ({roleProfile.organization})
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="search"
                    aria-label="Filter shipments"
                    placeholder="Filter by route or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="min-h-9 w-60 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900"
                  />
                  {activeRole === 'buyer' && (
                    <UIButton size="sm" onClick={() => setCreateModalOpen(true)}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Create Escrow Shipment
                    </UIButton>
                  )}
                </div>
              </div>
              {renderShipmentsTable()}
            </UICard>
          )}

          {activeNav === 'contracts' && renderContractViewer(false)}

          {activeNav === 'settings' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <UICard className="p-5 space-y-4 text-sm">
                <h2 className="text-base font-semibold text-slate-900">
                  Permissioned Blockchain Node
                </h2>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">Network</span>
                  <p className="font-medium text-slate-900">
                    KZ-GrainChain Consortium (Hyperledger Besu #7701)
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">GrainEscrow Address</span>
                  <p className="font-mono text-xs text-slate-800 break-all">{CONTRACT_ADDRESS}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">KZTD Token Address</span>
                  <p className="font-mono text-xs text-slate-800 break-all">{KZT_TOKEN_ADDRESS}</p>
                </div>
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <label className="flex items-center justify-between gap-4 cursor-pointer">
                    <span>
                      <span className="block font-medium text-slate-900">
                        KTZ ETRAN e-Waybill Oracle Sync
                      </span>
                      <span className="block text-xs text-slate-500">
                        Anchor rail consignment hashes on dispatch
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={ktzOracleSync}
                      onChange={(e) => setKtzOracleSync(e.target.checked)}
                      className="h-4 w-4 accent-blue-700"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 cursor-pointer">
                    <span>
                      <span className="block font-medium text-slate-900">
                        Require Non-Zero Waybill Hash
                      </span>
                      <span className="block text-xs text-slate-500">
                        Enforce bytes32 waybill commitment on createShipment()
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={requireEWaybill}
                      onChange={(e) => setRequireEWaybill(e.target.checked)}
                      className="h-4 w-4 accent-blue-700"
                    />
                  </label>
                </div>
              </UICard>

              <UICard className="p-5 space-y-4">
                <h2 className="text-base font-semibold text-slate-900">
                  AccessControl Role Registry
                </h2>
                {(Object.values(ROLE_PROFILES) as RoleProfile[]).map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      'rounded-lg border p-3.5 space-y-1',
                      activeRole === p.id
                        ? 'border-blue-300 bg-blue-50/50'
                        : 'border-slate-200 bg-slate-50/50'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-slate-900">{p.organization}</span>
                      <UIBadge variant={activeRole === p.id ? 'blue' : 'outline'}>
                        {p.accessControlRole}
                      </UIBadge>
                    </div>
                    <p className="font-mono text-[11px] text-slate-700 break-all">
                      {p.walletAddress}
                    </p>
                  </div>
                ))}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <Activity className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    ethers.js v6 ABI encoder active
                  </span>
                  <UIButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShipments(INITIAL_SHIPMENTS);
                      setEvents(INITIAL_EVENTS);
                      setSearchQuery('');
                      setStatusFilter('All');
                      notify('Consortium Ledger Reset', 'Restored initial Kazakhstan escrow records.');
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Reset Demo Data
                  </UIButton>
                </div>
              </UICard>
            </div>
          )}
        </main>
      </div>

      {/* Create Escrow Shipment Modal (Buyer) */}
      <NativeModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        labelledBy={createTitleId}
        closedby={isCreating ? 'none' : 'any'}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h1 id={createTitleId} className="text-lg font-semibold text-slate-900">
              Create Escrow Shipment
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Lock Digital Tenge (KZTD) into <span className="font-mono text-xs">GrainEscrow.sol</span>{' '}
              for KTZ-verified settlement.
            </p>
          </div>
          {!isCreating && (
            <button
              type="button"
              aria-label="Close dialog"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <form onSubmit={handleCreateSubmit} noValidate className="overflow-y-auto px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="gt-corridor" className="block text-sm font-medium text-slate-800">
              Export Route Corridor <span className="text-rose-600">*</span>
            </label>
            <select
              id="gt-corridor"
              name="corridor"
              autoFocus
              value={selectedCorridor}
              onChange={(e) => {
                setSelectedCorridor(e.target.value);
                if (formErrors.route) setFormErrors((p) => ({ ...p, route: undefined }));
              }}
              className="min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900"
            >
              {KAZAKHSTAN_CORRIDORS.map((c) => (
                <option key={c.route} value={c.route}>
                  {c.route} ({c.corridorType})
                </option>
              ))}
              <option value="custom">Custom Kazakhstan Corridor...</option>
            </select>
          </div>

          {selectedCorridor === 'custom' && (
            <div className="space-y-1.5">
              <label htmlFor="gt-custom-route" className="block text-sm font-medium text-slate-800">
                Custom Route <span className="text-rose-600">*</span>
              </label>
              <input
                ref={customRouteRef}
                id="gt-custom-route"
                name="customRoute"
                type="text"
                required
                placeholder="e.g., Shymkent -> Tashkent Terminal"
                value={customRoute}
                aria-invalid={Boolean(formTouched.route && formErrors.route)}
                aria-describedby={formErrors.route ? 'gt-custom-route-err' : undefined}
                onChange={(e) => {
                  setCustomRoute(e.target.value);
                  if (formErrors.route) setFormErrors((p) => ({ ...p, route: undefined }));
                }}
                onBlur={() => {
                  setFormTouched((p) => ({ ...p, route: true }));
                  setFormErrors((p) => ({ ...p, route: validateField('route') }));
                }}
                className="min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 aria-[invalid=true]:border-rose-600 aria-[invalid=true]:bg-rose-50/40"
              />
              {formTouched.route && formErrors.route && (
                <p id="gt-custom-route-err" className="flex items-center gap-1.5 text-xs text-rose-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {formErrors.route}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="gt-grade" className="block text-sm font-medium text-slate-800">
              Grain Specification &amp; Grade <span className="text-rose-600">*</span>
            </label>
            <input
              ref={gradeRef}
              id="gt-grade"
              name="grainGrade"
              type="text"
              required
              value={grainGrade}
              aria-invalid={Boolean(formTouched.grainGrade && formErrors.grainGrade)}
              aria-describedby={formErrors.grainGrade ? 'gt-grade-err' : undefined}
              onChange={(e) => {
                setGrainGrade(e.target.value);
                if (formErrors.grainGrade) setFormErrors((p) => ({ ...p, grainGrade: undefined }));
              }}
              onBlur={() => {
                setFormTouched((p) => ({ ...p, grainGrade: true }));
                setFormErrors((p) => ({ ...p, grainGrade: validateField('grainGrade') }));
              }}
              className="min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 aria-[invalid=true]:border-rose-600"
            />
            {formTouched.grainGrade && formErrors.grainGrade && (
              <p id="gt-grade-err" className="flex items-center gap-1.5 text-xs text-rose-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {formErrors.grainGrade}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="gt-volume" className="block text-sm font-medium text-slate-800">
                Volume (Metric Tons) <span className="text-rose-600">*</span>
              </label>
              <input
                ref={volumeRef}
                id="gt-volume"
                name="volumeTons"
                type="text"
                inputMode="numeric"
                required
                value={volumeTons}
                aria-invalid={Boolean(formTouched.volumeTons && formErrors.volumeTons)}
                aria-describedby={formErrors.volumeTons ? 'gt-volume-err' : 'gt-volume-hint'}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^\d]/g, '');
                  setVolumeTons(cleaned);
                  if (formErrors.volumeTons) setFormErrors((p) => ({ ...p, volumeTons: undefined }));
                  if (!valueManuallyEdited) {
                    const tons = Number(cleaned);
                    if (Number.isFinite(tons) && tons > 0) {
                      setValueKzt(String(tons * DEFAULT_RATE_KZT_PER_TON));
                    }
                  }
                }}
                onBlur={() => {
                  setFormTouched((p) => ({ ...p, volumeTons: true }));
                  setFormErrors((p) => ({ ...p, volumeTons: validateField('volumeTons') }));
                }}
                className="min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 aria-[invalid=true]:border-rose-600"
              />
              <p id="gt-volume-hint" className="text-xs text-slate-500">
                Integer metric tons (10 - 100,000 t)
              </p>
              {formTouched.volumeTons && formErrors.volumeTons && (
                <p id="gt-volume-err" className="flex items-center gap-1.5 text-xs text-rose-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {formErrors.volumeTons}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="gt-value" className="block text-sm font-medium text-slate-800">
                Escrow Value (KZT) <span className="text-rose-600">*</span>
              </label>
              <input
                ref={valueRef}
                id="gt-value"
                name="valueKzt"
                type="text"
                inputMode="numeric"
                required
                value={valueKzt}
                aria-invalid={Boolean(formTouched.valueKzt && formErrors.valueKzt)}
                aria-describedby={formErrors.valueKzt ? 'gt-value-err' : 'gt-value-hint'}
                onChange={(e) => {
                  setValueManuallyEdited(true);
                  setValueKzt(e.target.value.replace(/[^\d]/g, ''));
                  if (formErrors.valueKzt) setFormErrors((p) => ({ ...p, valueKzt: undefined }));
                }}
                onBlur={() => {
                  setFormTouched((p) => ({ ...p, valueKzt: true }));
                  setFormErrors((p) => ({ ...p, valueKzt: validateField('valueKzt') }));
                }}
                className="min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 aria-[invalid=true]:border-rose-600"
              />
              <p id="gt-value-hint" className="font-mono text-xs text-slate-600 tabular-nums">
                Locked: {Number(valueKzt) > 0 ? formatKzt(Number(valueKzt)) : '0 KZT'}
              </p>
              {formTouched.valueKzt && formErrors.valueKzt && (
                <p id="gt-value-err" className="flex items-center gap-1.5 text-xs text-rose-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {formErrors.valueKzt}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="gt-deadline" className="block text-sm font-medium text-slate-800">
                Delivery Deadline <span className="text-rose-600">*</span>
              </label>
              <input
                ref={deadlineRef}
                id="gt-deadline"
                name="deadline"
                type="date"
                required
                min="2026-11-13"
                value={deadline}
                aria-invalid={Boolean(formTouched.deadline && formErrors.deadline)}
                aria-describedby={formErrors.deadline ? 'gt-deadline-err' : undefined}
                onChange={(e) => {
                  setDeadline(e.target.value);
                  if (formErrors.deadline) setFormErrors((p) => ({ ...p, deadline: undefined }));
                }}
                onBlur={() => {
                  setFormTouched((p) => ({ ...p, deadline: true }));
                  setFormErrors((p) => ({ ...p, deadline: validateField('deadline') }));
                }}
                className="min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 aria-[invalid=true]:border-rose-600"
              />
              {formTouched.deadline && formErrors.deadline && (
                <p id="gt-deadline-err" className="flex items-center gap-1.5 text-xs text-rose-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {formErrors.deadline}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="gt-waybill" className="block text-sm font-medium text-slate-800">
                KTZ e-Waybill Ref <span className="text-rose-600">*</span>
              </label>
              <input
                ref={waybillRefInput}
                id="gt-waybill"
                name="waybillRef"
                type="text"
                required
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={waybillRef}
                aria-invalid={Boolean(formTouched.waybillRef && formErrors.waybillRef)}
                aria-describedby={formErrors.waybillRef ? 'gt-waybill-err' : undefined}
                onChange={(e) => {
                  setWaybillRef(e.target.value);
                  if (formErrors.waybillRef) setFormErrors((p) => ({ ...p, waybillRef: undefined }));
                }}
                onBlur={() => {
                  setFormTouched((p) => ({ ...p, waybillRef: true }));
                  setFormErrors((p) => ({ ...p, waybillRef: validateField('waybillRef') }));
                }}
                className="min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 aria-[invalid=true]:border-rose-600"
              />
              {formTouched.waybillRef && formErrors.waybillRef && (
                <p id="gt-waybill-err" className="flex items-center gap-1.5 text-xs text-rose-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {formErrors.waybillRef}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
            <UIButton
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </UIButton>
            <UIButton type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Signing &amp; Locking Escrow...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  Lock {Number(valueKzt) > 0 ? formatKzt(Number(valueKzt)) : 'Escrow'}
                </>
              )}
            </UIButton>
          </div>
        </form>
      </NativeModal>

      {/* Shipment On-Chain Proof Inspector Modal */}
      <NativeModal
        open={Boolean(inspectedShipment)}
        onOpenChange={(open) => {
          if (!open) setInspectedShipmentId(null);
        }}
        labelledBy={inspectTitleId}
      >
        {inspectedShipment ? (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 id={inspectTitleId} className="font-mono text-lg font-semibold text-slate-900">
                    {inspectedShipment.id}
                  </h1>
                  <UIBadge variant={STATUS_BADGE_MAP[inspectedShipment.status].variant}>
                    {inspectedShipment.status}
                  </UIBadge>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {inspectedShipment.route} • {inspectedShipment.grainGrade}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setInspectedShipmentId(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">Escrow Value</p>
                  <p className="mt-1 font-mono font-semibold text-slate-900 tabular-nums">
                    {formatKzt(inspectedShipment.valueKzt)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">Cargo Volume</p>
                  <p className="mt-1 font-mono font-semibold text-slate-900 tabular-nums">
                    {formatTons(inspectedShipment.volumeTons)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">Deadline</p>
                  <p className="mt-1 font-mono font-semibold text-slate-900 tabular-nums">
                    {inspectedShipment.deadline}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-slate-700">
                  <FileCheck2 className="h-4 w-4 text-blue-700" aria-hidden="true" />
                  On-Chain Cryptographic Proofs
                </div>
                <p>
                  <span className="text-slate-500">KTZ e-Waybill Ref: </span>
                  <span className="font-mono font-medium text-slate-900">
                    {inspectedShipment.waybillRef}
                  </span>
                </p>
                <p className="break-all">
                  <span className="text-slate-500">waybillHash (bytes32): </span>
                  <span className="font-mono text-slate-800">{inspectedShipment.waybillHash}</span>
                </p>
                <p className="break-all">
                  <span className="text-slate-500">Latest Tx Hash: </span>
                  <span className="inline-flex items-center gap-1 font-mono text-blue-700">
                    {inspectedShipment.txHash}
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                  </span>
                </p>
                {inspectedShipment.signature && (
                  <p className="break-all">
                    <span className="text-slate-500">Carrier ECDSA Signature: </span>
                    <span className="font-mono text-emerald-800">{inspectedShipment.signature}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end border-t border-slate-200 pt-4">
                <UIButton variant="secondary" size="sm" onClick={() => setInspectedShipmentId(null)}>
                  Close
                </UIButton>
              </div>
            </div>
          </>
        ) : (
          <div />
        )}
      </NativeModal>
    </div>
  );
}

export default GrainTrustDashboard;