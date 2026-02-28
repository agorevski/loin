# Loin: E2E Testing & Deployment Runbook

## Table of Contents

1. [Deployment Verification](#1-deployment-verification)
2. [API Smoke Tests](#2-api-smoke-tests)
3. [Frontend Verification](#3-frontend-verification)
4. [Arbitrum Testnet Verification](#4-arbitrum-testnet-verification)
5. [End-to-End Data Flow](#5-end-to-end-data-flow)
6. [Troubleshooting](#6-troubleshooting)
7. [Architecture Reference](#7-architecture-reference)

---

## Reference Vaults for Testing

These are real Arbitrum vaults cloned from beefy.com that exist in the local config and live API. Use them throughout this runbook for concrete testing:

| Vault ID | Token | Token Address | Vault (Earn) Address | Platform |
|----------|-------|---------------|---------------------|----------|
| `compound-arbitrum-usdc` | USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | `0xb9A27ba529634017b12e3cbbbFFb6dB7908a8C8B` | Compound |
| `compound-arbitrum-eth` | WETH | `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1` | `0x79717B36190B229d06CC0d31304c66aB18E1F3ab` | Compound |
| `euler-arb-euler-usdc` | USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | `0x24a4fc8d00e33A3b7f158e3a455B88e674941DAC` | Euler |

---

## 1. Deployment Verification

### 1.1 Check CI/CD (GitHub Actions)

1. Go to **GitHub → Actions** tab in the `agorevski/loin` repository
2. Look for the most recent run of the `azure-deploy.yml` workflow
3. Verify all steps passed (green checkmarks):
   - ✅ Checkout
   - ✅ Install frontend deps → `npm run build` in `beefy-v2/`
   - ✅ Install API deps with `npm install --legacy-peer-deps`
   - ✅ Copy frontend build into `beefy-api/public/`
   - ✅ Deploy `beefy-api/` to Azure
4. If the workflow failed, click into the failed step to read logs

```bash
# Quick check: list recent workflow runs via GitHub CLI (if installed)
gh run list --repo agorevski/loin --limit 5
```

### 1.2 Verify Azure Deployment is Running

```bash
# Check that the site responds (should return HTTP 200)
curl -s -o /dev/null -w "%{http_code}" https://loin.azurewebsites.net/
# Expected: 200

# Check the API root
curl -s -o /dev/null -w "%{http_code}" https://loin.azurewebsites.net/apy
# Expected: 200
```

### 1.3 Expected Startup Log Messages

In **Azure Portal → loin → Monitoring → Log Stream**, you should see:

```
Loin API running! (:8080)
```

If the app is starting up for the first time after deploy, allow **3-5 minutes** for the container to initialize. Additional log messages may include cache warming and RPC connection info.

---

## 2. API Smoke Tests

All commands target the live deployment at `https://loin.azurewebsites.net`. Replace with `http://localhost:3000` for local testing.

### 2.1 APY Endpoint

```bash
curl -s https://loin.azurewebsites.net/apy | head -c 500
```

**Expected:** JSON object with vault IDs as keys and APY numbers as values:
```json
{
  "compound-arbitrum-usdc": 0.034521,
  "compound-arbitrum-eth": 0.012345,
  ...
}
```

Verify specific vaults are present:
```bash
# Check compound-arbitrum-usdc APY
curl -s https://loin.azurewebsites.net/apy | python -c "import sys,json; d=json.load(sys.stdin); print('compound-arbitrum-usdc:', d.get('compound-arbitrum-usdc', 'MISSING'))"

# Check compound-arbitrum-eth APY
curl -s https://loin.azurewebsites.net/apy | python -c "import sys,json; d=json.load(sys.stdin); print('compound-arbitrum-eth:', d.get('compound-arbitrum-eth', 'MISSING'))"

# Check euler-arb-euler-usdc APY
curl -s https://loin.azurewebsites.net/apy | python -c "import sys,json; d=json.load(sys.stdin); print('euler-arb-euler-usdc:', d.get('euler-arb-euler-usdc', 'MISSING'))"
```

### 2.2 APY Breakdown

```bash
curl -s https://loin.azurewebsites.net/apy/breakdown | head -c 500
```

**Expected:** JSON with detailed APY breakdowns per vault (vaultApr, tradingApr, totalApy, etc.)

### 2.3 Fees Endpoint

```bash
curl -s https://loin.azurewebsites.net/fees | head -c 500
```

**Expected:** JSON object with vault IDs as keys and fee structures as values:
```json
{
  "compound-arbitrum-usdc": {
    "performance": { "total": 0.045, ... },
    ...
  }
}
```

### 2.4 All Vaults

```bash
curl -s https://loin.azurewebsites.net/vaults/all | head -c 1000
```

**Expected:** JSON array of vault objects. Verify Arbitrum vaults are present:
```bash
# Count Arbitrum vaults
curl -s https://loin.azurewebsites.net/vaults/all | python -c "import sys,json; vaults=json.load(sys.stdin); arb=[v for v in vaults if v.get('chain')=='arbitrum']; print(f'Arbitrum vaults: {len(arb)}')"

# Check specific vault exists
curl -s https://loin.azurewebsites.net/vault/compound-arbitrum-usdc | python -c "import sys,json; v=json.load(sys.stdin); print(f'ID: {v[\"id\"]}, Status: {v[\"status\"]}, Platform: {v[\"platformId\"]}')"
```

### 2.5 Prices Endpoint

```bash
curl -s https://loin.azurewebsites.net/prices | head -c 500
```

**Expected:** JSON object with token oracle IDs as keys and USD prices as values:
```json
{
  "USDC": 1.0001,
  "WETH": 2450.12,
  "ETH": 2450.12,
  ...
}
```

### 2.6 TVL Endpoint

```bash
curl -s https://loin.azurewebsites.net/tvl | head -c 500
```

**Expected:** JSON object with vault IDs as keys and TVL (in USD) as values.

### 2.7 Tokens Endpoint

```bash
curl -s https://loin.azurewebsites.net/tokens | head -c 500

# Arbitrum-specific tokens
curl -s https://loin.azurewebsites.net/tokens/arbitrum | head -c 500
```

**Expected:** JSON object with token metadata per chain.

### 2.8 Config Endpoint

```bash
curl -s https://loin.azurewebsites.net/config | head -c 500

# Arbitrum config
curl -s https://loin.azurewebsites.net/config/arbitrum | head -c 500
```

**Expected:** JSON config objects with chain-specific settings (RPC endpoints, contract addresses, etc.)

### 2.9 Boosts Endpoint

```bash
curl -s https://loin.azurewebsites.net/boosts | head -c 500
```

**Expected:** JSON array of boost objects.

### 2.10 Response Format Validation

All API endpoints must return **JSON**, not HTML. Quick check:

```bash
# This should NOT contain "<html" — if it does, the API isn't running
for endpoint in /apy /fees /vaults/all /prices /tvl /tokens /config; do
  content_type=$(curl -s -o /dev/null -w "%{content_type}" "https://loin.azurewebsites.net$endpoint")
  echo "$endpoint -> $content_type"
done
# Expected: all should show "application/json" (not "text/html")
```

---

## 3. Frontend Verification

### 3.1 Load the Site

```bash
# Verify the site loads
curl -s -o /dev/null -w "%{http_code}" https://loin.azurewebsites.net/
# Expected: 200
```

Open **https://loin.azurewebsites.net** in a browser.

### 3.2 Check for Loin Branding

- [ ] Page title shows "Loin" (not "Beefy")
- [ ] Logo/branding shows "Loin" (not Beefy cow logo)
- [ ] No prominent "Beefy" text visible in the header/footer

```bash
# Check page title
curl -s https://loin.azurewebsites.net/ | grep -i "<title>" | head -1
# Expected: should contain "Loin", not "Beefy"
```

### 3.3 Verify version.json

```bash
curl -s https://loin.azurewebsites.net/version.json
```

**Expected:** JSON with version/build info:
```json
{
  "version": "...",
  "build": "..."
}
```

### 3.4 Check Static Assets Load

```bash
# Check that CSS loads (look for .css files in the HTML)
curl -s https://loin.azurewebsites.net/ | grep -oP 'href="[^"]*\.css"' | head -3
# Expected: at least one CSS file reference

# Check that JS loads
curl -s https://loin.azurewebsites.net/ | grep -oP 'src="[^"]*\.js"' | head -3
# Expected: at least one JS file reference

# Verify a CSS file actually returns content
CSS_URL=$(curl -s https://loin.azurewebsites.net/ | grep -oP 'href="\K[^"]*\.css' | head -1)
curl -s -o /dev/null -w "%{http_code}" "https://loin.azurewebsites.net$CSS_URL"
# Expected: 200
```

---

## 4. Arbitrum Testnet Verification

### 4.1 Tenderly RPC Configuration

The Tenderly virtual testnet fork is configured as the **primary RPC** for Arbitrum in `beefy-api/src/constants.ts`:

```
arbitrum: [
  'https://virtual.arbitrum.us-west.rpc.tenderly.co/4fe3dd95-4a71-4a2c-b92a-94b277389bcb',
  'https://arbitrum.gateway.tenderly.co'
]
```

### 4.2 Verify Tenderly RPC is Responsive

```bash
# Check chain ID (should return 0xa4b1 = 42161 for Arbitrum)
curl -s -X POST https://virtual.arbitrum.us-west.rpc.tenderly.co/4fe3dd95-4a71-4a2c-b92a-94b277389bcb \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
# Expected: {"jsonrpc":"2.0","id":1,"result":"0xa4b1"}

# Check latest block number
curl -s -X POST https://virtual.arbitrum.us-west.rpc.tenderly.co/4fe3dd95-4a71-4a2c-b92a-94b277389bcb \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
# Expected: {"jsonrpc":"2.0","id":1,"result":"0x..."} (a hex block number)
```

### 4.3 Query Vault Contract Addresses

Use `eth_call` to verify on-chain data is accessible via the Tenderly fork for our reference vaults.

**Query Compound USDC Vault (0xb9A27ba529634017b12e3cbbbFFb6dB7908a8C8B):**

```bash
# Call totalSupply() on compound-arbitrum-usdc vault
# totalSupply() selector = 0x18160ddd
curl -s -X POST https://virtual.arbitrum.us-west.rpc.tenderly.co/4fe3dd95-4a71-4a2c-b92a-94b277389bcb \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_call",
    "params":[{
      "to":"0xb9A27ba529634017b12e3cbbbFFb6dB7908a8C8B",
      "data":"0x18160ddd"
    },"latest"],
    "id":1
  }'
# Expected: {"jsonrpc":"2.0","id":1,"result":"0x..."} (hex-encoded total supply)
```

**Query Compound ETH Vault (0x79717B36190B229d06CC0d31304c66aB18E1F3ab):**

```bash
# Call totalSupply() on compound-arbitrum-eth vault
curl -s -X POST https://virtual.arbitrum.us-west.rpc.tenderly.co/4fe3dd95-4a71-4a2c-b92a-94b277389bcb \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_call",
    "params":[{
      "to":"0x79717B36190B229d06CC0d31304c66aB18E1F3ab",
      "data":"0x18160ddd"
    },"latest"],
    "id":1
  }'
# Expected: non-error JSON-RPC response with hex result
```

**Query Euler USDC Vault (0x24a4fc8d00e33A3b7f158e3a455B88e674941DAC):**

```bash
# Call totalSupply() on euler-arb-euler-usdc vault
curl -s -X POST https://virtual.arbitrum.us-west.rpc.tenderly.co/4fe3dd95-4a71-4a2c-b92a-94b277389bcb \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_call",
    "params":[{
      "to":"0x24a4fc8d00e33A3b7f158e3a455B88e674941DAC",
      "data":"0x18160ddd"
    },"latest"],
    "id":1
  }'
```

### 4.4 Query Underlying Token Contracts

```bash
# Check USDC balance of compound vault's cToken (0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf)
# balanceOf(address) selector = 0x70a08231 + padded address
curl -s -X POST https://virtual.arbitrum.us-west.rpc.tenderly.co/4fe3dd95-4a71-4a2c-b92a-94b277389bcb \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_call",
    "params":[{
      "to":"0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      "data":"0x70a082310000000000000000000000009c4ec768c28520B50860ea7a15bd7213a9fF58bf"
    },"latest"],
    "id":1
  }'
# Expected: hex-encoded USDC balance
```

### 4.5 Verify Euler Vault Address On-Chain

```bash
# Call symbol() on the Euler vault token (0xe4783824593a50Bfe9dc873204CEc171ebC62dE0)
# symbol() selector = 0x95d89b41
curl -s -X POST https://virtual.arbitrum.us-west.rpc.tenderly.co/4fe3dd95-4a71-4a2c-b92a-94b277389bcb \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_call",
    "params":[{
      "to":"0xe4783824593a50Bfe9dc873204CEc171ebC62dE0",
      "data":"0x95d89b41"
    },"latest"],
    "id":1
  }'
# Expected: hex-encoded string containing the Euler vault token symbol
```

---

## 5. End-to-End Data Flow

### 5.1 Architecture Overview

```
Tenderly Fork (Arbitrum)         Loin API (Koa/Node.js)           Frontend (React/Vite)
┌──────────────────────┐    ┌─────────────────────────┐    ┌──────────────────────────┐
│ Arbitrum state at     │    │ Reads on-chain data     │    │ Fetches JSON from API    │
│ fork point + any      │───▶│ via RPC calls           │───▶│ Renders vault list,      │
│ local modifications   │    │ Computes APY, TVL, etc  │    │ APYs, prices, TVL        │
│                       │    │ Serves JSON endpoints   │    │                          │
│ Contract addresses:   │    │ Serves static frontend  │    │ URL:                     │
│ • Vault contracts     │    │                         │    │ loin.azurewebsites.net   │
│ • Strategy contracts  │    │ URL:                    │    │                          │
│ • Token contracts     │    │ loin.azurewebsites.net  │    │                          │
└──────────────────────┘    └─────────────────────────┘    └──────────────────────────┘
```

**Data flow:**
1. **Tenderly fork** holds a snapshot of Arbitrum mainnet state (block data, contract storage)
2. **API** (beefy-api) connects via the Tenderly RPC URL and makes `eth_call` / `eth_getLogs` to read vault balances, strategy data, price feeds
3. **API** computes APYs, TVLs, fees from on-chain data and serves them as JSON
4. **Frontend** (beefy-v2, served from `beefy-api/public/`) fetches these JSON endpoints and renders the UI

### 5.2 Test: Vault APYs in API and Frontend

```bash
# Step 1: Verify APY appears in API
curl -s https://loin.azurewebsites.net/apy | python -c "
import sys, json
d = json.load(sys.stdin)
vaults = ['compound-arbitrum-usdc', 'compound-arbitrum-eth', 'euler-arb-euler-usdc']
for v in vaults:
    apy = d.get(v)
    status = '✓' if apy is not None else '✗ MISSING'
    print(f'  {v}: {apy} {status}')
"

# Step 2: Open https://loin.azurewebsites.net in browser
# Navigate to the Arbitrum chain filter
# Search for "USDC" — verify compound-arbitrum-usdc vault appears with an APY value
# Search for "WETH" — verify compound-arbitrum-eth vault appears
```

### 5.3 Test: Prices Are Being Fetched

```bash
# Verify key token prices exist
curl -s https://loin.azurewebsites.net/prices | python -c "
import sys, json
d = json.load(sys.stdin)
tokens = ['USDC', 'WETH', 'ETH', 'USDT', 'ARB']
for t in tokens:
    price = d.get(t)
    status = '✓' if price is not None else '✗ MISSING'
    print(f'  {t}: \${price} {status}')
"
```

### 5.4 Test: TVL Data Flows Through

```bash
# Verify TVL for reference vaults
curl -s https://loin.azurewebsites.net/tvl | python -c "
import sys, json
d = json.load(sys.stdin)
vaults = ['compound-arbitrum-usdc', 'compound-arbitrum-eth', 'euler-arb-euler-usdc']
for v in vaults:
    tvl = d.get(v)
    status = '✓' if tvl is not None and tvl > 0 else '✗ MISSING/ZERO'
    print(f'  {v}: \${tvl} {status}')
"
```

### 5.5 Test: Vault Detail Endpoint

```bash
# Fetch a single vault and verify all fields
curl -s https://loin.azurewebsites.net/vault/compound-arbitrum-usdc | python -c "
import sys, json
v = json.load(sys.stdin)
print(f'ID:       {v[\"id\"]}')
print(f'Chain:    {v[\"chain\"]}')
print(f'Status:   {v[\"status\"]}')
print(f'Platform: {v[\"platformId\"]}')
print(f'Token:    {v[\"token\"]}')
print(f'PPS:      {v[\"pricePerFullShare\"]}')
print(f'Harvest:  {v[\"lastHarvest\"]}')
"
```

---

## 6. Troubleshooting

### 6.1 Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Site returns HTML instead of JSON | API not running; Azure serving default page | Check startup command, restart App Service |
| 502 Bad Gateway | App crashed during startup | Check Log Stream for errors; ensure Node 20+ |
| APY values are all 0 or null | RPC not reachable or Tenderly fork expired | Verify Tenderly RPC is responsive (Section 4.2) |
| Prices are missing | Price oracle fetch failed | Check API logs; may need to wait for cache warm-up |
| Vault not found in API | Vault config not in `beefy-api/src/data/arbitrum/` | Add vault to appropriate pool config JSON |
| CORS errors in browser | Frontend origin not allowed | Check `@koa/cors` config in API |
| "Nonce too high" on Tenderly | Fork state desynchronized | Reset virtual testnet from Tenderly dashboard |

### 6.2 How to Check Azure Logs

**Via Azure Portal:**
1. Navigate to **Azure Portal → App Services → loin**
2. Go to **Monitoring → Log stream** for real-time logs
3. Go to **Diagnose and solve problems** for historical issues
4. Go to **Development Tools → Advanced Tools (Kudu)** → LogFiles for file-based logs

**Via Azure CLI:**
```bash
# Stream live logs
az webapp log tail --name loin --resource-group Websites

# Download recent logs
az webapp log download --name loin --resource-group Websites --log-file logs.zip
```

**Via SSH (if available):**
```bash
# Azure Portal → loin → Development Tools → SSH
ls -la /home/site/wwwroot/
cat /home/LogFiles/docker/*.log | tail -100
```

### 6.3 How to Restart the App Service

**Via Azure Portal:**
1. Navigate to **Azure Portal → App Services → loin**
2. Click **Overview → Restart**
3. Wait 3-5 minutes for the app to come back online
4. Verify with: `curl -s -o /dev/null -w "%{http_code}" https://loin.azurewebsites.net/apy`

**Via Azure CLI:**
```bash
az webapp restart --name loin --resource-group Websites
```

### 6.4 API Fails to Start

- Ensure Node.js 20+ is configured (Azure Portal → Configuration → General Settings)
- Verify startup command is: `npx ts-node --transpile-only src/app.ts`
- Check that `node_modules/` exists in the deploy: SSH → `ls /home/site/wwwroot/node_modules/`
- Check that `public/index.html` exists: SSH → `ls /home/site/wwwroot/public/`
- If Redis is expected but not configured, ensure `REDIS_URL` env var is unset or empty

### 6.5 Tenderly Fork Not Working

```bash
# Test basic RPC connectivity
curl -s -X POST https://virtual.arbitrum.us-west.rpc.tenderly.co/4fe3dd95-4a71-4a2c-b92a-94b277389bcb \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# If this returns an error or times out:
# 1. Check if the Tenderly fork is still active in the Tenderly dashboard
# 2. The fork URL may have expired — create a new one and update constants.ts
# 3. Update the ARBITRUM_RPC environment variable in Azure App Service config
```

---

## 7. Architecture Reference

### 7.1 Hosting Environment

| Setting | Value |
|---------|-------|
| **App Name** | `loin` |
| **URL** | `https://loin.azurewebsites.net` |
| **OS** | Linux |
| **Runtime** | Node 20 LTS |
| **SKU** | Basic |
| **Region** | Canada Central |
| **Resource Group** | Websites |

### 7.2 Project → Azure Mapping

| Project | Type | Deployment Target |
|---------|------|-------------------|
| `beefy-v2` | Static SPA (Vite/React) | Azure Web App `loin` — served from `beefy-api/public/` |
| `beefy-api` | Node.js server (Koa) | Azure Web App `loin` — serves both API routes and frontend |
| `beefy-dot-com` | Static site (Gatsby) | Separate Static Web App (future) |

### 7.3 CI/CD via GitHub Actions

A workflow at `.github/workflows/azure-deploy.yml` auto-deploys on every push to `main` that touches `beefy-v2/`, `beefy-api/`, or the workflow file.

**Authentication:** Uses OIDC (federated identity) — secrets are pre-configured in the repo:
- `AZUREAPPSERVICE_CLIENTID_*`
- `AZUREAPPSERVICE_TENANTID_*`
- `AZUREAPPSERVICE_SUBSCRIPTIONID_*`

**Deployment flow:**
1. Checkout → Install frontend deps → `npm run build` in `beefy-v2/`
2. Install API deps with `npm install --legacy-peer-deps` (includes node_modules in deploy)
3. Copy frontend build into `beefy-api/public/`
4. Deploy `beefy-api/` directory (source + node_modules + frontend) to Azure
5. Azure starts app via `npm start` → `ts-node --transpile-only src/app.ts`

Push to `main` — the workflow builds and deploys automatically (~10-15 minutes).

### 7.4 Azure App Service Configuration

| Name | Value | Purpose |
|------|-------|---------|
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` | Dependencies are pre-installed in CI — skip Oryx build for faster deploys |

> **Do NOT** set `WEBSITE_RUN_FROM_PACKAGE=1` — it creates a read-only filesystem that conflicts with file-based deploys.

### 7.5 Startup Command

```
npx ts-node --transpile-only src/app.ts
```

Set in Azure Portal → Configuration → General Settings → Startup Command.

### 7.6 API Routes Reference

| Route | Description |
|-------|-------------|
| `GET /apy` | APY for all vaults |
| `GET /apy/breakdown` | Detailed APY breakdown |
| `GET /apy/boosts` | Boost APRs |
| `GET /fees` | Fee structures for all vaults |
| `GET /vaults/all` | All vaults (all chains, all types) |
| `GET /vaults/all/:chainId` | All vaults for a specific chain |
| `GET /vault/:vaultId` | Single vault by ID |
| `GET /vaults/:chainId` | Standard vaults for a chain |
| `GET /vaults` | All standard vaults |
| `GET /prices` | Token prices (USD) |
| `GET /lps` | LP token prices |
| `GET /tvl` | TVL per vault |
| `GET /tokens` | Token metadata (all chains) |
| `GET /tokens/:chainId` | Token metadata for a chain |
| `GET /config` | Chain configs |
| `GET /config/:chainId` | Config for a specific chain |
| `GET /boosts` | Active boosts |
| `GET /boosts/:chainId` | Boosts for a chain |
| `GET /treasury` | Treasury balances |
| `GET /cow-vaults` | Cowcentrated vaults |
| `GET /gov-vaults` | Governance vaults |
