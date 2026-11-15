// SPDX-License-Identifier: MIT
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
}