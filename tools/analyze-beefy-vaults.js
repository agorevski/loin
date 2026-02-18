/**
 * analyze-beefy-vaults.js
 *
 * Fetches live vault + TVL + APY data from Beefy's public API,
 * cross-references each vault against the Loin strategy-map,
 * and outputs a ranked migration-readiness report.
 *
 * Usage:
 *   node tools/analyze-beefy-vaults.js                  # full report
 *   node tools/analyze-beefy-vaults.js --top 50         # top 50 by TVL
 *   node tools/analyze-beefy-vaults.js --chain arbitrum  # single chain
 *   node tools/analyze-beefy-vaults.js --tier 1          # only easy migrations
 *   node tools/analyze-beefy-vaults.js --json            # machine-readable output
 *   node tools/analyze-beefy-vaults.js --summary         # aggregated summary only
 */

const https = require('https');
const { classify } = require('./strategy-map');

// ─── Helpers ────────────────────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Failed to parse ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function fmtUSD(n) {
  if (n == null || isNaN(n)) return '$0';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n) {
  if (n == null || isNaN(n) || !isFinite(n)) return 'N/A';
  return `${(n * 100).toFixed(2)}%`;
}

function tierLabel(t) {
  return { 1: 'Drop-in (factory)', 2: 'Minor tweak (legacy)', 3: 'Hand-holding (no contract)' }[t] || `Tier ${t}`;
}

// ─── CLI args ───────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { top: null, chain: null, tier: null, json: false, summary: false, minTvl: 0 };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--top':     opts.top     = parseInt(args[++i], 10); break;
      case '--chain':   opts.chain   = args[++i].toLowerCase(); break;
      case '--tier':    opts.tier    = parseInt(args[++i], 10); break;
      case '--json':    opts.json    = true; break;
      case '--summary': opts.summary = true; break;
      case '--min-tvl': opts.minTvl  = parseFloat(args[++i]); break;
      case '--help':
        console.log(`
Usage: node tools/analyze-beefy-vaults.js [OPTIONS]

Options:
  --top N         Show only top N vaults by TVL
  --chain NAME    Filter to a single chain (e.g. arbitrum, ethereum)
  --tier N        Show only vaults at migration tier N (1, 2, or 3)
  --min-tvl N     Minimum TVL in USD (e.g. 100000)
  --json          Output as JSON (machine-readable)
  --summary       Show aggregated summary only (no vault list)
  --help          Show this help
        `.trim());
        process.exit(0);
    }
  }
  return opts;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  console.error('Fetching data from api.beefy.finance …');
  const [vaults, tvlByChain, apys] = await Promise.all([
    fetchJSON('https://api.beefy.finance/vaults'),
    fetchJSON('https://api.beefy.finance/tvl'),
    fetchJSON('https://api.beefy.finance/apy'),
  ]);

  // Flatten TVL map: { chainId: { vaultId: tvl } } → { vaultId: tvl }
  const tvl = {};
  for (const chainId of Object.keys(tvlByChain)) {
    const chainVaults = tvlByChain[chainId];
    if (typeof chainVaults === 'object' && chainVaults !== null) {
      for (const [vid, val] of Object.entries(chainVaults)) {
        tvl[vid] = (tvl[vid] || 0) + (typeof val === 'number' ? val : 0);
      }
    }
  }

  // Build enriched vault list
  let enriched = vaults
    .filter((v) => v.status === 'active') // only active vaults
    .map((v) => {
      const classification = classify(v);
      return {
        id:           v.id,
        name:         v.name,
        chain:        v.chain || v.network,
        platformId:   v.platformId,
        type:         v.type,
        strategyType: v.strategyTypeId,
        tvl:          tvl[v.id] || 0,
        apy:          apys[v.id] != null ? apys[v.id] : null,
        assets:       (v.assets || []).join('/'),
        vaultAddr:    v.earnContractAddress,
        stratAddr:    v.strategy,
        tier:         classification.tier,
        contract:     classification.contract,
        reason:       classification.reason,
      };
    });

  // Apply filters
  if (opts.chain) enriched = enriched.filter((v) => v.chain === opts.chain);
  if (opts.tier)  enriched = enriched.filter((v) => v.tier === opts.tier);
  if (opts.minTvl) enriched = enriched.filter((v) => v.tvl >= opts.minTvl);

  // Sort by TVL descending
  enriched.sort((a, b) => b.tvl - a.tvl);

  // Top N
  if (opts.top) enriched = enriched.slice(0, opts.top);

  // ── JSON output ─────────────────────────────────────────────────────────
  if (opts.json) {
    console.log(JSON.stringify(enriched, null, 2));
    return;
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  const totalTvl = enriched.reduce((s, v) => s + v.tvl, 0);
  const byTier   = [1, 2, 3].map((t) => {
    const vs = enriched.filter((v) => v.tier === t);
    const tTvl = vs.reduce((s, v) => s + v.tvl, 0);
    return { tier: t, label: tierLabel(t), count: vs.length, tvl: tTvl };
  });

  // Per-chain breakdown
  const chainMap = {};
  for (const v of enriched) {
    if (!chainMap[v.chain]) chainMap[v.chain] = { count: 0, tvl: 0, t1: 0, t2: 0, t3: 0 };
    chainMap[v.chain].count++;
    chainMap[v.chain].tvl += v.tvl;
    chainMap[v.chain][`t${v.tier}`]++;
  }
  const chains = Object.entries(chainMap)
    .sort(([, a], [, b]) => b.tvl - a.tvl)
    .map(([chain, d]) => ({ chain, ...d }));

  // Per-platform breakdown
  const platMap = {};
  for (const v of enriched) {
    const k = v.platformId || 'unknown';
    if (!platMap[k]) platMap[k] = { count: 0, tvl: 0, tier: v.tier };
    platMap[k].count++;
    platMap[k].tvl += v.tvl;
    // Take worst (highest) tier
    if (v.tier > platMap[k].tier) platMap[k].tier = v.tier;
  }
  const platforms = Object.entries(platMap)
    .sort(([, a], [, b]) => b.tvl - a.tvl)
    .map(([platform, d]) => ({ platform, ...d }));

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  LOIN MIGRATION ANALYSIS — Beefy.com Vault Assessment');
  console.log('══════════════════════════════════════════════════════════════\n');

  console.log(`  Active vaults analyzed : ${enriched.length}`);
  console.log(`  Total TVL in scope     : ${fmtUSD(totalTvl)}\n`);

  console.log('  ┌───────────────────────────────────┬────────┬────────────┐');
  console.log('  │ Tier                              │ Vaults │ TVL        │');
  console.log('  ├───────────────────────────────────┼────────┼────────────┤');
  for (const t of byTier) {
    console.log(`  │ ${t.label.padEnd(35)}│ ${String(t.count).padStart(6)} │ ${fmtUSD(t.tvl).padStart(10)} │`);
  }
  console.log('  └───────────────────────────────────┴────────┴────────────┘\n');

  // Chain breakdown
  console.log('  ── By Chain ──────────────────────────────────────────────');
  console.log('  ┌──────────────┬────────┬────────────┬──────┬──────┬──────┐');
  console.log('  │ Chain        │ Vaults │ TVL        │  T1  │  T2  │  T3  │');
  console.log('  ├──────────────┼────────┼────────────┼──────┼──────┼──────┤');
  for (const c of chains.slice(0, 20)) {
    console.log(`  │ ${c.chain.padEnd(12)} │ ${String(c.count).padStart(6)} │ ${fmtUSD(c.tvl).padStart(10)} │ ${String(c.t1).padStart(4)} │ ${String(c.t2).padStart(4)} │ ${String(c.t3).padStart(4)} │`);
  }
  console.log('  └──────────────┴────────┴────────────┴──────┴──────┴──────┘\n');

  // Platform breakdown
  console.log('  ── By Platform (top 20) ──────────────────────────────────');
  console.log('  ┌──────────────────┬────────┬────────────┬──────┐');
  console.log('  │ Platform         │ Vaults │ TVL        │ Tier │');
  console.log('  ├──────────────────┼────────┼────────────┼──────┤');
  for (const p of platforms.slice(0, 20)) {
    console.log(`  │ ${p.platform.padEnd(16)} │ ${String(p.count).padStart(6)} │ ${fmtUSD(p.tvl).padStart(10)} │ ${String(p.tier).padStart(4)} │`);
  }
  console.log('  └──────────────────┴────────┴────────────┴──────┘\n');

  // ── Per-vault table (unless --summary) ──────────────────────────────────
  if (!opts.summary) {
    console.log('  ── Vault Details (sorted by TVL) ─────────────────────────\n');
    const header = [
      '#'.padStart(4),
      'Tier',
      'Chain'.padEnd(12),
      'Platform'.padEnd(16),
      'Vault Name'.padEnd(30),
      'TVL'.padStart(12),
      'APY'.padStart(10),
      'Contract',
    ].join(' │ ');
    console.log(`  ${header}`);
    console.log(`  ${'─'.repeat(header.length)}`);

    for (let i = 0; i < enriched.length; i++) {
      const v = enriched[i];
      const row = [
        String(i + 1).padStart(4),
        ` T${v.tier} `,
        (v.chain || '').padEnd(12),
        (v.platformId || '').padEnd(16),
        (v.name || '').substring(0, 30).padEnd(30),
        fmtUSD(v.tvl).padStart(12),
        fmtPct(v.apy).padStart(10),
        v.contract || '(none)',
      ].join(' │ ');
      console.log(`  ${row}`);
    }

    console.log(`\n  Total: ${enriched.length} vaults, ${fmtUSD(totalTvl)} TVL\n`);
  }

  // ── Automation guidance ─────────────────────────────────────────────────
  const t1Tvl = byTier[0].tvl;
  const t1Pct = totalTvl > 0 ? ((t1Tvl / totalTvl) * 100).toFixed(1) : 0;
  console.log('  ── Automation Guidance ───────────────────────────────────');
  console.log(`  Tier 1 (factory) covers ${fmtUSD(t1Tvl)} (${t1Pct}% of TVL).`);
  console.log('  These can be deployed via StrategyFactory + BeefyVaultV7Factory');
  console.log('  with a single parameterized script per platform.\n');
  console.log('  Recommended automation order:');

  const t1Plats = platforms.filter((p) => p.tier <= 1).slice(0, 10);
  for (let i = 0; i < t1Plats.length; i++) {
    console.log(`    ${i + 1}. ${t1Plats[i].platform} — ${t1Plats[i].count} vaults, ${fmtUSD(t1Plats[i].tvl)} TVL`);
  }
  console.log('');
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
