> Educational project for the course Introduction to Finance. Not a real product, service or investment offer. Do not use with real funds.

# GrainTrust - Blockchain Escrow Platform for Agricultural Logistics 🌾

GrainTrust is a B2B Enterprise SaaS platform designed to eliminate demurrage penalties and payment defaults in Kazakhstan's grain export logistics. By leveraging a permissioned Consortium Blockchain (Hyperledger Besu / IBFT 2.0) and algorithmic routing, GrainTrust automates escrow settlements with zero gas fees and deterministic finality.

🎥 **[Watch the Prototype Demo Video Here](https://drive.google.com/file/d/1F5UFbkJWKibg7GlUcBqLuaJeg11jDmmb/view?usp=drive_link)**

## 🚀 Key Features
* **Automated Smart Escrow:** Instant KZT settlement upon delivery confirmation, eliminating legacy Letters of Credit delays.
* **Role-Based Access Control (RBAC):** Strict separation of `BUYER_ROLE`, `CARRIER_ROLE`, and `SUPPLIER_ROLE` using OpenZeppelin standards.
* **Zero Variable OpEx:** Built on a localized Hyperledger Besu (IBFT 2.0 consensus) architecture, meaning zero gas fees and predictable infrastructure costs.
* **Secure State Machine:** Protected against reentrancy and unauthorized access (100% test coverage).

## 🛠️ Technology Stack
* **Smart Contracts:** Solidity, Hardhat, OpenZeppelin
* **Blockchain Network:** Local Hardhat Network (No public testnet deployment)
* **Frontend UI:** Next.js, React, Tailwind CSS
* **Algorithms:** Dijkstra & Kosaraju for dynamic ETA deadline calculations

## ⚙️ Running the Prototype Locally

### 1. Install Dependencies
```bash
npm install