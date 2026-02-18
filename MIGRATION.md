# Loin Migration Plan: Beefy.com Vault Acquisition

> **Generated**: 2026-02-18 | **Data source**: Live `api.beefy.finance` endpoints
>
> **Run `node tools/analyze-beefy-vaults.js --summary` for up-to-date numbers.**

---

## Executive Summary

Beefy.com currently operates **665 active vaults** totaling ~**$137M TVL** across 19 chains.
Loin's existing contract repository can service **90.6% of that TVL ($124M)** with factory-deployable strategies — no new Solidity needed, just parameterized deployment scripts.

| Tier | Description | Vaults | TVL | % of Total |
|------|-------------|--------|-----|------------|
| **1 — Drop-in** | Factory strategy exists; fully automatable | 534 | $124M | 90.6% |
| **2 — Minor tweak** | Legacy strategy exists; per-vault deploy script | 2 | $71K | 0.1% |
| **3 — Hand-holding** | No matching contract; new code needed | 129 | $12.8M | 9.4% |

### Key Insight
Focus on Tier 1 first. Just **five platforms** (Convex, Aura, Curve, Morpho, Aerodrome) cover **$102M — 74% of all Beefy TVL**.

---

## Tier 1 — Drop-In Factory Migrations (534 vaults, $124M)

These platforms have a matching `BaseAllToNativeFactoryStrat` in our contracts repo. Deploy via `StrategyFactory.createStrategy()` → `BeefyVaultV7Factory.cloneVault()` → done.

| # | Platform | Loin Contract | Vaults | TVL | Chains |
|---|----------|---------------|--------|-----|--------|
| 1 | **Convex** | `StrategyCurveConvexFactory` | 66 | $37.4M | ethereum |
| 2 | **Aura** | `StrategyBalancer` | 22 | $23.7M | ethereum, arbitrum, optimism |
| 3 | **Curve** | `StrategyCurveConvexFactory` | 27 | $16.3M | ethereum, arbitrum, optimism, fraxtal |
| 4 | **Morpho** | `StrategyMorpho` | 34 | $15.4M | ethereum, base |
| 5 | **Aerodrome** | `StrategyVelodromeFactory` | 204 | $9.1M | base |
| 6 | **StakeDAO** | `StrategyStakeDaoV2` | 18 | $6.0M | ethereum |
| 7 | **Compound** | `StrategyCompoundV3` | 9 | $5.2M | ethereum, base, arbitrum, polygon, optimism |
| 8 | **MIM** | `StrategyMimSwap` | 2 | $4.2M | arbitrum |
| 9 | **Velodrome** | `StrategyVelodromeFactory` | 70 | $2.9M | optimism |
| 10 | **Pendle** | `StrategyPendle` | 3 | $832K | ethereum |
| 11 | **Silo** | `StrategySiloV2` | 2 | $760K | ethereum |
| 12 | **Alien Base** | `StrategyAlienBaseBunni` | 2 | $501K | base |
| 13 | **Blackhole** | `StrategyCommonSolidlyRewardPool` | 9 | $477K | avax |
| 14 | **Neverland** | `StrategyCommonSolidlyRewardPool` | 7 | $326K | monad |
| 15 | **Euler** | `StrategyERC4626` | 4 | $179K | arbitrum, plasma, monad |
| 16 | **Mendi** | `StrategyCompoundV3` | 12 | $98K | linea |
| 17+ | Others (Ramses, Thena, Sky, Tokemak, etc.) | Various Solidly/specific | ~43 | $1.5M | various |

### Automation Approach

Each Tier 1 platform follows the same pattern:

```
For each Beefy vault V in platform P:
  1. Read V's config from api.beefy.finance/vaults (tokenAddress, assets, chain)
  2. Deploy strategy via StrategyFactory.createStrategy(P_stratName)
  3. Initialize strategy: __BaseStrategy_init({want, depositToken, factory, vault, swapper, strategist}, rewards[])
  4. Deploy vault via BeefyVaultV7Factory.cloneVault()
  5. Initialize vault: vault.initialize(strategy, name, symbol, approvalDelay)
  6. Register in Loin API pool configs (beefy-api/src/data/{chain}/*)
  7. Verify harvest() works with near-zero fees
```

**Infrastructure required per chain** (deploy once, reuse for all vaults):
- `StrategyFactory` — manages beacon proxies + global config
- `BeefyVaultV7Factory` — clones vault template
- `BeefyFeeConfigurator` — 0.1% harvest fee, 0% withdrawal
- `BeefySwapper` — reward→native→want swap routing
- `BeefyTreasury` — receives call fees (keeper wallet)

---

## Tier 2 — Legacy Strategy Migrations (2 vaults, $71K)

These use `StratFeeManagerInitializable` directly (no factory). Need individual deploy scripts.

| Platform | Contract | Vaults | TVL | Issue |
|----------|----------|--------|-----|-------|
| **Stargate** | `StrategyStargateV2` | 1 | $71K | One-off constructor args per vault |
| **GMX** | `StrategyGM` | 1 | ~$0 | Nearly retired |

**Action**: Write deploy scripts modeled on `scripts/vault/deploy-tokemak.js`. Low priority given small TVL.

---

## Tier 3 — Hand-Holding Required (129 vaults, $12.8M)

### 3a. High-Value Gaps (worth building contracts for)

| Platform | TVL | Vaults | What's Needed |
|----------|-----|--------|---------------|
| **BIFI Maxi** | $3.8M | 1 | `StrategyBeefy.sol` exists but depends on Beefy's BIFI reward pool. Loin would need its own reward pool or a mock. Consider deploying `BeefyRewardPool` + BIFI staking. |
| **f(x) Protocol** | $2.7M | 5 | `StrategyFxConvex.sol` exists (legacy `BaseAllToNativeStrat`). Needs upgrade to factory pattern or one-off deploy scripts. |
| **Uniswap V3** | $2.6M | 21 | Concentrated liquidity positions managed by Beefy's CLM system. No CLM contracts in our repo. Would need to port Beefy's cowcentrated vault contracts or write a UniV3 position manager. |
| **PancakeSwap** | $1.9M | 36 | MasterChef V3 staking. Need a `StrategyMasterChefV3` or adapt `StrategyCommonSingleStakingFactory`. |
| **Magpie** | $917K | 4 | Pendle yield booster. Need `StrategyMagpie` or adapt existing Pendle strategy. |
| **Sushi** | $406K | 9 | MiniChef/MasterChef staking. Similar to PancakeSwap gap. |

### 3b. Low-Value Gaps (defer)

| Platform | TVL | Vaults | Notes |
|----------|-----|--------|-------|
| Berachain native | $50K | 5 | BeraPaw/Kodiak factory exists; these may be non-standard Bera vaults |
| Mantle-specific | $10K | 5 | Small TVL, skip for now |
| Rootstock | $32K | 1 | Niche chain |
| zkSync | $6K | 1 | Nearly dead |

### 3c. Prioritized Engineering Work

To close the largest Tier 3 gaps, build in this order:

1. **`StrategyFxConvex` upgrade** — Port to factory pattern. Unlocks $2.7M.
2. **`StrategyMasterChef`** — Generic MasterChef V2/V3 factory strategy. Unlocks PancakeSwap ($1.9M) + Sushi ($406K) + others.
3. **Uni V3 CLM** — Port Beefy's cowcentrated contracts or build simplified position manager. Unlocks $2.6M. This is the hardest — concentrated liquidity management is complex.
4. **`StrategyMagpie`** — Pendle yield booster adapter. Unlocks $917K.

---

## Chain Prioritization

Deploy infrastructure to chains in this order (by capturable TVL):

| Priority | Chain | Total TVL | Tier 1 TVL | Tier 1 Vaults |
|----------|-------|-----------|------------|---------------|
| **1** | Ethereum | $74.5M | $70.7M | 77 |
| **2** | Base | $23.7M | $23.2M | 229 |
| **3** | Arbitrum | $19.3M | $10.7M | 33 |
| **4** | Fraxtal | $7.8M | $7.8M | 24 |
| **5** | Optimism | $5.6M | $4.8M | 80 |
| **6** | Polygon | $2.4M | $2.4M | 4 |
| 7+ | Others | $3.3M | $4.2M | 87 |

---

## Tooling

### `tools/analyze-beefy-vaults.js`

Live analysis tool that fetches from Beefy's API and cross-references against our strategy map.

```bash
# Full summary
node tools/analyze-beefy-vaults.js --summary

# Top 50 vaults by TVL
node tools/analyze-beefy-vaults.js --top 50

# Only Ethereum, only easy migrations
node tools/analyze-beefy-vaults.js --chain ethereum --tier 1

# Machine-readable for automation scripts
node tools/analyze-beefy-vaults.js --chain base --tier 1 --json

# Minimum $1M TVL vaults only
node tools/analyze-beefy-vaults.js --min-tvl 1000000
```

### `tools/strategy-map.js`

Module that maps Beefy `platformId` → Loin strategy contract + migration tier. Update this as new strategies are added.

---

## Automation Roadmap

### Phase 1: Manual deployment (current)
- Deploy infra to Ethereum + Base via existing Hardhat scripts
- Deploy 5-10 high-TVL vaults manually to validate the flow
- Register in API, test harvest/deposit/withdraw

### Phase 2: Parameterized batch deploy
- Build `tools/deploy-vault-batch.js` that reads from `analyze-beefy-vaults.js --json` output
- For each vault: deploy strategy → deploy vault → initialize → register in API
- One script per platform type, parameterized by pool/gauge address

### Phase 3: Fully automated pipeline
- Cron job runs `analyze-beefy-vaults.js` daily
- Detects new Beefy vaults not yet on Loin
- Auto-generates deploy transactions for Tier 1 vaults
- Submits to multisig / keeper wallet for approval
- Auto-updates API configs and frontend vault list

### Phase 4: Monitoring & harvesting
- Deploy keeper bot that calls `harvest()` on all Loin vaults
- Monitor TVL drift between Beefy and Loin versions
- Alert when Beefy retires a vault (so Loin can retire too)

---

## Risk Considerations

1. **Same underlying pools** — Loin vaults point at the same DeFi pools as Beefy. There's no TVL conflict; both can coexist. Users choose based on fees.
2. **Reward token routing** — Each strategy needs correct swap paths (reward → native → want). The `BeefySwapper` handles this, but paths must be configured per chain.
3. **Oracle dependencies** — Some strategies use `BeefyOracle` for price feeds. Deploy oracle infrastructure per chain.
4. **Governance/timelocks** — Beefy uses multisig timelocks. Loin can start with a single-owner EOA for speed, then add timelocks for trust.
5. **Subgraph dependency** — APY calculations in `beefy-api` use The Graph subgraphs. Some may need redeployment or alternative data sources.
