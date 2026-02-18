<div align="center">

# 🥩 LOIN

### *Trim the Fat.*

**The yield optimizer that keeps what's yours.**

Loin is a fork of [Beefy.com](https://beefy.com) — the industry-leading multichain yield aggregator — rebuilt with one radical philosophy: **your yield belongs to you.** Where Beefy takes up to 9.5% of harvest profits, Loin charges virtually nothing. No treasury cut. No strategist fee. No withdrawal penalty. No swap surcharge. Just raw, uncut returns.

*Same battle-tested vaults. Same autocompounding strategies. Zero fat.*

---

[![Deploy](https://github.com/agorevski/loin/actions/workflows/azure-deploy.yml/badge.svg)](https://github.com/agorevski/loin/actions/workflows/azure-deploy.yml)
[![Live Site](https://img.shields.io/badge/live-loin.azurewebsites.net-blue)](https://loin.azurewebsites.net)

</div>

---

## Fee Comparison

| Fee | Beefy.com | Loin |
|-----|-----------|------|
| Harvest performance fee | **9.5%** of yield | **0.1%** (caller incentive only) |
| Treasury/DAO cut | **~9.4%** of yield | **0%** |
| Strategist fee | **0.05%** of yield | **0%** |
| Withdrawal fee | **0.1%** | **0%** |
| Zap/swap fee | **0.005%** | **0%** |

> The only fee retained is a 0.1% harvest call fee — paid entirely to the keeper who triggers the `harvest()` transaction — ensuring vaults continue to autocompound.

---

## Repository Structure

This monorepo contains four projects that together form the complete Loin platform:

```
Loin/
├── beefy-v2/           # Frontend DeFi application (React/Vite SPA)
├── beefy-api/           # Backend REST API (Koa/Node.js)
├── beefy-contracts/     # Smart contracts (Solidity/Hardhat/Foundry)
├── beefy-dot-com/       # Marketing landing page (Gatsby)
├── .github/workflows/   # CI/CD (Azure Web App deployment)
├── PLAN.md              # Implementation plan & workstream tracker
└── RUNBOOK.md           # Deployment & testing runbook
```

### `beefy-v2/` — Frontend Application
The main user-facing DeFi app where users deposit, withdraw, and manage vault positions.

| | |
|---|---|
| **Stack** | React 18, Vite 6, TypeScript, Redux Toolkit, Panda CSS |
| **Features** | Multi-chain vault browser, wallet connection (MetaMask, WalletConnect, etc.), zap/swap, bridge, dashboard, treasury view |
| **Chains** | Ethereum, Arbitrum, Polygon, BSC, Optimism, Base, Avalanche, Fantom, Linea, and 10+ more |
| **Build** | `cd beefy-v2 && npm install && npm run build` → static SPA in `build/` |
| **Dev** | `npm run dev` → `http://localhost:5173` |

### `beefy-api/` — Backend API
REST API serving vault data, prices, APYs, and fee information to the frontend.

| | |
|---|---|
| **Stack** | Koa 2, TypeScript, Viem, Ethers.js |
| **Endpoints** | `/apy`, `/prices`, `/lps`, `/fees`, `/vaults/all`, `/boosts`, `/zap/*`, and more |
| **Data Sources** | On-chain RPC (30+ chains), CoinGecko, DexScreener, The Graph |
| **Includes** | `packages/address-book/` — multi-chain address registry for treasury, keeper, and contract addresses |
| **Dev** | `cd beefy-api && yarn install && yarn dev` → `http://localhost:3000` |

### `beefy-contracts/` — Smart Contracts
Solidity contracts for vaults, strategies, and fee configuration — the on-chain engine.

| | |
|---|---|
| **Stack** | Hardhat, Foundry, Solidity 0.8.x, OpenZeppelin |
| **Core Contracts** | `BeefyVaultV7`, `BeefyFeeConfigurator`, `StratFeeManagerInitializable`, 30+ strategy types |
| **Strategy Types** | Curve, Balancer, Velodrome, Pendle, Aave, Compound, GMX, UniswapV3, and more |
| **Networks** | 16+ configured (Ethereum, Arbitrum, BSC, Polygon, etc.) + Tenderly virtual testnet |
| **Build** | `cd beefy-contracts && npm install && npx hardhat compile` |

### `beefy-dot-com/` — Landing Page
Marketing site and blog.

| | |
|---|---|
| **Stack** | Gatsby 5, React 18, Emotion CSS, TypeScript |
| **Content** | Landing page, blog (Markdown), media kit, partners page |
| **Build** | `cd beefy-dot-com && npm install && npm run build` → static HTML in `public/` |

---

## Deployment

### Frontend (Azure Web App)
The frontend auto-deploys to **[loin.azurewebsites.net](https://loin.azurewebsites.net)** via GitHub Actions on every push to `main`.

- **Runtime**: Linux / Node 20 LTS
- **Region**: Canada Central
- **CI/CD**: `.github/workflows/azure-deploy.yml`

### Smart Contracts (Tenderly Testnet)
A Tenderly virtual Arbitrum testnet is configured for contract deployment and testing:
```
RPC: https://virtual.arbitrum.us-west.rpc.tenderly.co/4fe3dd95-4a71-4a2c-b92a-94b277389bcb
Network name: tenderly_arbitrum (in hardhat.config.ts)
Chain ID: 42161
```

See **[RUNBOOK.md](./RUNBOOK.md)** for full deployment instructions and **[PLAN.md](./PLAN.md)** for the implementation roadmap.

---

## Quick Start

```bash
# Clone
git clone https://github.com/agorevski/loin.git
cd loin

# Start the API
cd beefy-api
yarn install && yarn dev

# In another terminal — start the frontend
cd beefy-v2
npm install
echo "VITE_API_URL=http://localhost:3000" > .env
npm run dev
```

Open `http://localhost:5173` and connect your wallet.

---

## What Changed from Beefy

All modifications from the upstream Beefy codebase are documented in [PLAN.md](./PLAN.md). Key changes:

1. **Fee elimination** — Harvest fee reduced from 9.5% → 0.1% (call-only), withdrawal and zap fees zeroed out
2. **Rebranding** — All user-facing strings, meta tags, navigation links, social handles, and API URLs updated from Beefy → Loin
3. **Testnet integration** — Tenderly virtual Arbitrum testnet added to contracts, API, and frontend
4. **Azure hosting** — GitHub Actions CI/CD for Azure Web App deployment

---

## License

This project is a fork of open-source Beefy Finance repositories. Please refer to the individual project directories for their respective licenses.
