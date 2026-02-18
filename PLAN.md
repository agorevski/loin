# Loin: Beefy Fork — "Trim the Fat" Implementation Plan

## Problem Statement
Fork the Beefy.com yield aggregation platform (4 projects: contracts, API, frontend app, marketing site) into a rebranded "Loin" platform that eliminates/minimizes fees. Deploy to Arbitrum testnet (Tenderly virtual) for validation.

## Architecture Overview
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────────┐
│  beefy-dot-com  │     │   beefy-v2   │     │     beefy-api       │
│  (Gatsby site)  │     │ (React SPA)  │────▶│  (Koa REST server)  │
│  Landing page   │     │  DeFi app    │     │  Prices/APY/Vaults  │
└─────────────────┘     └──────┬───────┘     └──────────┬──────────┘
                               │                        │
                               ▼                        ▼
                        ┌──────────────────────────────────┐
                        │        beefy-contracts           │
                        │  (Solidity — Hardhat/Foundry)    │
                        │  Vaults + Strategies + Fees      │
                        └──────────────────────────────────┘
                                      │
                                      ▼
                        ┌──────────────────────────────────┐
                        │   @beefyfinance/addressbook       │
                        │  (inside beefy-api/packages/)    │
                        │  Treasury/keeper/owner addresses  │
                        └──────────────────────────────────┘
```

---

## Workstream 1: Smart Contract Fee Elimination ("Trim the Fat")

### Current Fee Structure (from `BeefyFeeConfigurator.sol` + `deployChain.js`)
| Fee Component | Current Value | Purpose |
|---|---|---|
| **Total harvest fee** | 9.5% of yield | Deducted on every `harvest()` |
| → Call fee | 0.5% of total fee | Pays the keeper who calls harvest |
| → Strategist fee | 0.5% of total fee | Pays the strategy developer |
| → Beefy/Treasury fee | 99% of total fee | Goes to Beefy DAO treasury |
| **Withdrawal fee** | 0.1% (10 bps) | On vault withdrawals |
| **Zap fee** | 0.005% (0.5 bps) | On swap aggregation |
| **Deposit fee** | 0% (usually) | Rare, per-vault config |

### Loin Target: Near-Zero Fees

| Fee Component | New Value | Rationale |
|---|---|---|
| Total harvest fee | **0.1%** (down from 9.5%) | Bare minimum for harvester incentive |
| → Call fee | **100%** of total fee | Entire fee goes to caller |
| → Strategist fee | **0%** | Eliminated |
| → Treasury fee | **0%** | Eliminated |
| Withdrawal fee | **0%** (0 bps) | Eliminated |
| Zap fee | **0%** | Eliminated |
| Deposit fee | **0%** | Already zero |

#### Files to Modify
1. `beefy-contracts/scripts/infra/deployChain.js` — Change default fee category
2. `beefy-contracts/contracts/BIFI/strategies/Common/StratFeeManagerInitializable.sol` — Set default `withdrawalFee = 0`
3. `beefy-api/src/api/zap/fees.ts` — Set zap fee to `0`
4. `beefy-api/packages/address-book/src/address-book/arbitrum/platforms/beefyfinance.ts` — Update treasury/keeper/strategist addresses

---

## Workstream 2: Rebranding (Beefy → Loin)

### Priority 1 — User-Facing (Must Change)
| # | File | What to Change |
|---|------|---------------|
| 1 | `beefy-v2/index.html` | Page title, meta og:title, description |
| 2 | `beefy-v2/src/locales/en/main.json` | All UI strings: "Beefy" → "Loin" |
| 3 | `beefy-v2/src/components/Header/list.ts` | Nav links, domain references |
| 4 | `beefy-v2/src/components/Meta/DefaultMeta.tsx` | Twitter handle, canonical URLs |
| 5 | `beefy-v2/src/images/bifi-logos/` | Replace logo SVGs with Loin branding |
| 6 | `beefy-dot-com/gatsby-config.ts` | siteUrl, title, description, twitter |
| 7 | `beefy-dot-com/src/theme.ts` | Colors (optional — keep or change) |

### Priority 2 — API & Config
| # | File | What to Change |
|---|------|---------------|
| 8 | `beefy-v2/.env.example` | MINIAPP_DOMAIN |
| 9 | `beefy-v2/src/features/data/apis/beefy/beefy-api.ts` | Default API URL |
| 10 | `beefy-api/src/router.js` | Endpoint naming (optional) |
| 11 | `beefy-v2/src/config/promos/campaigns.json` | "Beefy" in campaign titles |
| 12 | `beefy-v2/src/config/promos/partners.json` | Brand mentions |
| 13 | `beefy-v2/src/locales/en/risks.json` | Risk text mentioning Beefy |

### Priority 3 — Contracts & Infrastructure
| # | File | What to Change |
|---|------|---------------|
| 14 | `beefy-api/packages/address-book/` | Your own deployment addresses |
| 15 | `beefy-contracts/hardhat.config.ts` | Add Tenderly testnet network |
| 16 | `beefy-v2/src/config/config.ts` | Add testnet chain config |

### Priority 4 — Nice to Have (Post-MVP)
- Rename contract names (BeefyVaultV7 → LoinVaultV7) — cosmetic only
- Custom domain setup
- New social media handles
- Blog content rewrite

---

## Workstream 3: Deployment & Hosting

### Azure Web App (Frontend)
- **URL**: `https://loin.azurewebsites.net`
- **Runtime**: Linux / Node 20 LTS / Basic SKU / Canada Central
- **CI/CD**: GitHub Actions (`.github/workflows/azure-deploy.yml`) — auto-deploys `beefy-v2/build/` on push to `main`
- **Startup**: `pm2 serve /home/site/wwwroot --no-daemon --spa`
- **Secret required**: `AZURE_WEBAPP_PUBLISH_PROFILE` in GitHub repo settings

### Tenderly Virtual Testnet (Smart Contracts)
- **RPC**: `https://virtual.arbitrum.us-west.rpc.tenderly.co/4fe3dd95-4a71-4a2c-b92a-94b277389bcb`
- **Chain**: Arbitrum fork (chainId 42161)

See [RUNBOOK.md](./RUNBOOK.md) for full deployment and testing instructions.

---

## Risk & Considerations

1. **BIFI Token**: Beefy has a governance token (BIFI). Loin doesn't need one initially, but some contract logic references it. Consider stubbing it out or deploying a mock.
2. **Address Book**: The `@beefyfinance/blockchain-addressbook` package hardcodes Beefy's multisig addresses. For testnet, override these in deployment scripts.
3. **External APIs**: Some features depend on Beefy-specific APIs (databarn, CLM API, snapshot voting). These won't work without standing up equivalent services or mocking them.
4. **Subgraphs**: Some data comes from The Graph subgraphs deployed by Beefy. These need to be redeployed for Loin's contracts.
5. **Legal**: Ensure compliance with Beefy's license terms for forking.
