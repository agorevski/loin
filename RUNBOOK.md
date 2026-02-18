# Loin: Deployment & Testing Runbook

## Prerequisites
- Node.js 20.x+ installed
- npm/yarn available
- A wallet with private key for testnet deployment
- Tenderly account (for funding virtual testnet wallets)

---

## Phase 1: Environment Setup

```bash
# 1. Navigate to the repo root
cd C:\GIT\agorevski\Loin

# 2. Install contract dependencies
cd beefy-contracts
npm install

# 3. Install API dependencies
cd ../beefy-api
yarn install

# 4. Install frontend dependencies
cd ../beefy-v2
npm install

# 5. Install landing page dependencies
cd ../beefy-dot-com
npm install
```

---

## Phase 2: Configure Tenderly Testnet

### 2a. Contracts Environment
Create `beefy-contracts/.env`:
```env
DEPLOYER_PK=0xYOUR_PRIVATE_KEY_HERE
ARBITRUM_RPC=https://virtual.arbitrum.us-west.rpc.tenderly.co/4fe3dd95-4a71-4a2c-b92a-94b277389bcb
```

The Tenderly virtual testnet is already configured in `hardhat.config.ts` as the `tenderly_arbitrum` network.

### 2b. Fund Your Deployer Wallet
1. Open the Tenderly dashboard
2. Navigate to the Virtual TestNet
3. Use the "Fund Account" feature to add ETH to your deployer address
4. Verify balance: `npx hardhat console --network tenderly_arbitrum` → `(await ethers.provider.getBalance("YOUR_ADDRESS")).toString()`

---

## Phase 3: Deploy Infrastructure Contracts

Deploy in this order:
```bash
cd beefy-contracts

# 1. Deploy fee configurator with near-zero fees
npx hardhat run scripts/infra/deployFeeConfigurator.ts --network tenderly_arbitrum

# 2. Deploy treasury contract
npx hardhat run scripts/infra/deployTreasury.ts --network tenderly_arbitrum

# 3. Deploy vault factory
npx hardhat run scripts/infra/deployVaultFactory.ts --network tenderly_arbitrum

# 4. Deploy strategy factory
npx hardhat run scripts/infra/deployStrategyFactory.ts --network tenderly_arbitrum
```

**Record all deployed contract addresses** — you'll need them for the API and vault deployment steps.

---

## Phase 4: Deploy a Sample Vault

```bash
# Edit the deployment script to reference your deployed infrastructure addresses
# Then deploy a simple vault + strategy
npx hardhat run scripts/vault/deploy-generic-chef-strat.ts --network tenderly_arbitrum
```

---

## Phase 5: Configure & Start API

```bash
cd beefy-api

# Create .env
echo ARBITRUM_RPC=https://virtual.arbitrum.us-west.rpc.tenderly.co/4fe3dd95-4a71-4a2c-b92a-94b277389bcb > .env
echo NODE_ENV=development >> .env

# Start the API server
yarn dev
# API available at http://localhost:3000
```

### API Smoke Tests
```bash
curl http://localhost:3000/apy
curl http://localhost:3000/fees
curl http://localhost:3000/vaults/all
curl http://localhost:3000/prices
```

---

## Phase 6: Configure & Start Frontend

```bash
cd beefy-v2

# Create .env
echo VITE_API_URL=http://localhost:3000 > .env
echo VITE_API_ZAP_URL=http://localhost:3000/zap >> .env

# Start dev server
npm run dev
# Frontend available at http://localhost:5173
```

---

## Phase 7: Validation Checklist

### Contract Validation
```bash
npx hardhat console --network tenderly_arbitrum

# Check fee configurator
const feeConfig = await ethers.getContractAt("BeefyFeeConfigurator", "DEPLOYED_FEE_CONFIG_ADDRESS");
const fees = await feeConfig.getFees("STRATEGY_ADDRESS");
console.log("Total fee:", fees.total.toString());       // Should be 0.1% = 1000000000000000
console.log("Call fee:", fees.call.toString());          // Should be 100% = 1000000000000000000
console.log("Strategist fee:", fees.strategist.toString()); // Should be 0
console.log("Beefy fee:", fees.beefy.toString());       // Should be 0

# Check vault
const vault = await ethers.getContractAt("BeefyVaultV7", "VAULT_ADDRESS");
console.log("Vault name:", await vault.name());
console.log("Total supply:", (await vault.totalSupply()).toString());

# Test deposit
const want = await ethers.getContractAt("IERC20", "WANT_TOKEN_ADDRESS");
await want.approve("VAULT_ADDRESS", ethers.MaxUint256);
await vault.deposit(ethers.parseEther("1.0"));
console.log("Shares:", (await vault.balanceOf(deployer.address)).toString());

# Test withdrawal (verify 0% fee)
const balBefore = await want.balanceOf(deployer.address);
await vault.withdrawAll();
const balAfter = await want.balanceOf(deployer.address);
console.log("Got back:", (balAfter - balBefore).toString());
```

### Frontend Validation
1. Open `http://localhost:5173`
2. Verify "Loin" branding (not "Beefy")
3. Connect wallet (MetaMask → Custom RPC → Tenderly URL)
4. Navigate to a vault
5. Verify fees display 0% or near-zero
6. Test deposit and withdrawal flows

---

## Phase 8: Smoke Test Matrix

| # | Test | Expected Result | Pass? |
|---|------|----------------|-------|
| 1 | API `/fees` returns near-zero | All fees ≤ 0.1% | ☐ |
| 2 | API `/apy` shows higher APYs | APY ≈ gross yield | ☐ |
| 3 | Frontend loads without errors | No console errors | ☐ |
| 4 | Frontend shows "Loin" branding | No "Beefy" text visible | ☐ |
| 5 | Wallet connects to testnet | Chain recognized | ☐ |
| 6 | Vault deposit succeeds | Share balance increases | ☐ |
| 7 | Vault withdrawal has 0% fee | Full amount returned | ☐ |
| 8 | Harvest charges only call fee | ≤0.1% deducted | ☐ |
| 9 | Zap swap has 0% fee | No fee on swap | ☐ |

---

## Troubleshooting

### Common Issues

**"Nonce too high" errors on Tenderly**
- Reset the virtual testnet state from the Tenderly dashboard, or
- Use `--reset` flag if available

**API fails to start**
- Ensure Node.js 20+ (API requires it)
- Check that Redis is running if caching is enabled (or set `REDIS_URL` to empty)

**Frontend can't reach API**
- Ensure CORS is enabled in API (it is by default via `@koa/cors`)
- Check that `VITE_API_URL` points to `http://localhost:3000`

**MetaMask won't connect to Tenderly**
- Add custom network: RPC URL = Tenderly URL, Chain ID = 42161, Currency = ETH
- If chain ID conflicts with mainnet Arbitrum, temporarily remove mainnet Arbitrum from MetaMask
