# Loin Migration Plan: Drop-In Factory Vaults

> **Updated**: 2026-03-01 | **Data source**: Live `api.beefy.finance` endpoints
>
> **Run `node tools/analyze-beefy-vaults.js --chain <chain> --tier 1` for up-to-date numbers.**

---

## Summary

Loin targets **352 drop-in vaults** across 4 L2 chains totaling ~**$43.8M TVL**. All use existing factory strategies — no new Solidity needed, just parameterized deployments via `StrategyFactory.createStrategy()` → `BeefyVaultV7Factory.cloneVault()`.

| Chain | Vaults | TVL | Platforms |
|-------|--------|-----|-----------|
| **Base** | 235 | $22.3M | 7 |
| **Arbitrum** | 33 | $13.8M | 10 |
| **Optimism** | 80 | $5.2M | 5 |
| **Polygon** | 4 | $2.4M | 2 |
| **Total** | **352** | **$43.8M** | |

---

## Base — 235 vaults, $22.3M TVL

| # | Platform | Loin Contract | Vaults | TVL |
|---|----------|---------------|--------|-----|
| 1 | **Aerodrome** | `StrategyVelodromeFactory` | 210 | $9.3M |
| 2 | **Morpho** | `StrategyMorpho` | 10 | $6.4M |
| 3 | **Aura** | `StrategyBalancer` | 1 | $3.6M |
| 4 | **Compound** | `StrategyCompoundV3` | 3 | $1.5M |
| 5 | **Curve** | `StrategyCurveConvexFactory` | 6 | $587K |
| 6 | **Alien Base** | `StrategyAlienBaseBunni` | 2 | $495K |
| 7 | **StakeDAO** | `StrategyStakeDaoV2` | 3 | $319K |

---

## Arbitrum — 33 vaults, $13.8M TVL

| # | Platform | Loin Contract | Vaults | TVL |
|---|----------|---------------|--------|-----|
| 1 | **Aura** | `StrategyBalancer` | 8 | $5.6M |
| 2 | **MIM** | `StrategyMimSwap` | 2 | $4.2M |
| 3 | **Compound** | `StrategyCompoundV3` | 3 | $1.7M |
| 4 | **Convex** | `StrategyCurveConvexFactory` | 6 | $1.3M |
| 5 | **Silo** | `StrategySiloV2` | 1 | $552K |
| 6 | **Morpho** | `StrategyMorpho` | 6 | $200K |
| 7 | **Equilibria** | `StrategyEquilibria` | 2 | $94K |
| 8 | **Euler** | `StrategyERC4626` | 1 | $53K |
| 9 | **Ramses** | `StrategyCommonSolidlyRewardPool` | 3 | $20K |
| 10 | **Curve** | `StrategyCurveConvexFactory` | 1 | $14K |

---

## Optimism — 80 vaults, $5.2M TVL

| # | Platform | Loin Contract | Vaults | TVL |
|---|----------|---------------|--------|-----|
| 1 | **Velodrome** | `StrategyVelodromeFactory` | 67 | $2.6M |
| 2 | **Compound** | `StrategyCompoundV3` | 3 | $2.0M |
| 3 | **Curve** | `StrategyCurveConvexFactory` | 8 | $582K |
| 4 | **Aura** | `StrategyBalancer` | 1 | $57K |
| 5 | **Morpho** | `StrategyMorpho` | 1 | $9K |

---

## Polygon — 4 vaults, $2.4M TVL

| # | Platform | Loin Contract | Vaults | TVL |
|---|----------|---------------|--------|-----|
| 1 | **Morpho** | `StrategyMorpho` | 3 | $1.7M |
| 2 | **Curve** | `StrategyCurveConvexFactory` | 1 | $681K |

---

## Deployment Pattern

Each vault follows the same factory flow:

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

## Tooling

### `tools/analyze-beefy-vaults.js`

Live analysis tool that fetches from Beefy's API and cross-references against our strategy map.

```bash
# Per-chain drop-in vaults
node tools/analyze-beefy-vaults.js --chain arbitrum --tier 1
node tools/analyze-beefy-vaults.js --chain base --tier 1

# Machine-readable for automation scripts
node tools/analyze-beefy-vaults.js --chain base --tier 1 --json

# Minimum $1M TVL vaults only
node tools/analyze-beefy-vaults.js --min-tvl 1000000 --tier 1
```

### `tools/strategy-map.js`

Module that maps Beefy `platformId` → Loin strategy contract + migration tier. Update this as new strategies are added.
