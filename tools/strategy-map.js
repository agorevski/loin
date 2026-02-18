/**
 * strategy-map.js
 *
 * Maps Beefy platformId / strategyTypeId combinations to the Loin contract
 * that can service them, and assigns a migration-difficulty tier.
 *
 * Tiers
 * ─────
 *  1  "drop-in"      – We have a factory strategy; deploy via StrategyFactory,
 *                       point at the same underlying pool/gauge. Fully automatable.
 *  2  "minor-tweak"  – We have the strategy contract but it is NOT factory-based
 *                       (uses StratFeeManagerInitializable directly).  Needs a
 *                       one-off deploy script per vault.  Still automatable with
 *                       a per-vault deploy template.
 *  3  "hand-holding"  – No matching contract in our repo.  Requires porting /
 *                       writing a new strategy, or the vault relies on
 *                       infrastructure we haven't deployed (CLM, governance
 *                       vaults, custom oracles, etc.).
 */

// ── Factory strategies (Tier 1) ─────────────────────────────────────────────
const FACTORY_STRATEGIES = {
  // platformId → { contract, notes }
  'aave':           { contract: 'StrategyAaveSupplyOnly',           base: 'BaseAllToNativeFactoryStrat' },
  'balancer':       { contract: 'StrategyBalancer',                 base: 'BaseAllToNativeFactoryStrat' },
  'aura':           { contract: 'StrategyBalancer',                 base: 'BaseAllToNativeFactoryStrat', notes: 'Aura wraps Balancer; same strat' },
  'compound':       { contract: 'StrategyCompoundV3',               base: 'BaseAllToNativeFactoryStrat' },
  'morpho':         { contract: 'StrategyMorpho',                   base: 'BaseAllToNativeFactoryStrat' },
  'pendle':         { contract: 'StrategyPendle',                   base: 'BaseAllToNativeFactoryStrat' },
  'equilibria':     { contract: 'StrategyEquilibria',               base: 'BaseAllToNativeFactoryStrat' },
  'penpie':         { contract: 'StrategyPenpie',                   base: 'BaseAllToNativeFactoryStrat' },
  'velodrome':      { contract: 'StrategyVelodromeFactory',         base: 'BaseAllToNativeFactoryStrat' },
  'aerodrome':      { contract: 'StrategyVelodromeFactory',         base: 'BaseAllToNativeFactoryStrat', notes: 'Aero is Velo fork on Base' },
  'curve':          { contract: 'StrategyCurveConvexFactory',       base: 'BaseAllToNativeFactoryStrat' },
  'convex':         { contract: 'StrategyCurveConvexFactory',       base: 'BaseAllToNativeFactoryStrat' },
  'stakedao':       { contract: 'StrategyStakeDaoV2',               base: 'BaseAllToNativeFactoryStrat' },
  'silo':           { contract: 'StrategySiloV2',                   base: 'BaseAllToNativeFactoryStrat' },
  'ichi':           { contract: 'StrategyIchi',                     base: 'BaseAllToNativeFactoryStrat' },
  'sky':            { contract: 'StrategySky',                      base: 'BaseAllToNativeFactoryStrat' },
  'tokemak':        { contract: 'StrategyTokemak',                  base: 'BaseAllToNativeFactoryStrat' },
  'shadow':         { contract: 'StrategyShadow',                   base: 'BaseAllToNativeFactoryStrat' },
  'berapaw':        { contract: 'StrategyBeraPaw',                  base: 'BaseAllToNativeFactoryStrat' },
  'kodiak':         { contract: 'StrategyKodiakIslands',            base: 'BaseAllToNativeFactoryStrat' },
  'bunni':          { contract: 'StrategyAlienBaseBunni',           base: 'BaseAllToNativeFactoryStrat' },
  'mim':            { contract: 'StrategyMimSwap',                  base: 'BaseAllToNativeFactoryStrat', notes: 'MimSwap LP gauge in degens/' },
  'euler':          { contract: 'StrategyERC4626',                  base: 'BaseAllToNativeFactoryStrat', notes: 'Euler vaults are ERC4626-compatible' },
  'mendi':          { contract: 'StrategyCompoundV3',               base: 'BaseAllToNativeFactoryStrat', notes: 'Mendi is Compound V2/V3 fork on Linea' },
  'alienbase':      { contract: 'StrategyAlienBaseBunni',           base: 'BaseAllToNativeFactoryStrat', notes: 'Alien Base uses Bunni/Solidly gauge' },
  'ramses':         { contract: 'StrategyCommonSolidlyRewardPool',  base: 'BaseAllToNativeFactoryStrat', notes: 'Solidly-fork gauge' },
  'solidlizard':    { contract: 'StrategyCommonSolidlyRewardPool',  base: 'BaseAllToNativeFactoryStrat', notes: 'Solidly-fork gauge' },
  'thena':          { contract: 'StrategyCommonSolidlyRewardPool',  base: 'BaseAllToNativeFactoryStrat', notes: 'Solidly-fork gauge' },
  'chronos':        { contract: 'StrategyCommonSolidlyRewardPool',  base: 'BaseAllToNativeFactoryStrat', notes: 'Solidly-fork gauge' },
  'equalizer':      { contract: 'StrategyCommonSolidlyRewardPool',  base: 'BaseAllToNativeFactoryStrat', notes: 'Solidly-fork gauge' },
  'lynex':          { contract: 'StrategyCommonSolidlyRewardPool',  base: 'BaseAllToNativeFactoryStrat', notes: 'Solidly-fork gauge' },
  'nile':           { contract: 'StrategyCommonSolidlyRewardPool',  base: 'BaseAllToNativeFactoryStrat', notes: 'Solidly-fork gauge' },
  'pearl':          { contract: 'StrategyCommonSolidlyRewardPool',  base: 'BaseAllToNativeFactoryStrat', notes: 'Solidly-fork gauge' },
  'scale':          { contract: 'StrategyCommonSolidlyRewardPool',  base: 'BaseAllToNativeFactoryStrat', notes: 'Solidly-fork gauge' },
  'spiritswap':     { contract: 'StrategyCommonSolidlyRewardPool',  base: 'BaseAllToNativeFactoryStrat', notes: 'Solidly-fork gauge' },
  'beethoven':      { contract: 'StrategyBalancer',                 base: 'BaseAllToNativeFactoryStrat', notes: 'Beethoven is Balancer on Fantom/OP' },
  'blackhole':      { contract: 'StrategyCommonSolidlyRewardPool',  base: 'BaseAllToNativeFactoryStrat', notes: 'Solidly-fork gauge on Avalanche' },
  'neverland':      { contract: 'StrategyCommonSolidlyRewardPool',  base: 'BaseAllToNativeFactoryStrat', notes: 'Solidly-fork gauge on Monad' },
};

// ── Non-factory strategies (Tier 2) ─────────────────────────────────────────
const LEGACY_STRATEGIES = {
  'gmx':            { contract: 'StrategyGMX / StrategyGM / StrategyGLP', base: 'StratFeeManagerInitializable' },
  'stargate':       { contract: 'StrategyStargateV2',               base: 'StratFeeManagerInitializable' },
  'venus':          { contract: 'StrategyVenus',                    base: 'StratFeeManagerInitializable' },
  'baseswap':       { contract: 'StrategyBaseSwap',                 base: 'StratFeeManagerInitializable' },
};

// ── Vault types that need special handling (Tier 3) ─────────────────────────
const SPECIAL_VAULT_TYPES = new Set([
  'cowcentrated',   // CLM vaults — contracts not in our repo
  'gov',            // governance vaults — reward pool contracts needed
]);

/**
 * Classify a single Beefy vault for Loin migration readiness.
 *
 * @param {object} vault  – vault object from api.beefy.finance/vaults
 * @returns {{ tier: 1|2|3, contract: string|null, reason: string }}
 */
function classify(vault) {
  const pid = (vault.platformId || '').toLowerCase();
  const vtype = (vault.type || 'standard').toLowerCase();
  const stypeId = (vault.strategyTypeId || '').toLowerCase();

  // ── Tier 3: special vault types ───────────────────────────────────────
  if (SPECIAL_VAULT_TYPES.has(vtype)) {
    return {
      tier: 3,
      contract: null,
      reason: `Vault type "${vtype}" requires contracts not yet in Loin repo (CLM / gov reward pool).`,
    };
  }

  // ── Tier 1: factory match ─────────────────────────────────────────────
  if (FACTORY_STRATEGIES[pid]) {
    const s = FACTORY_STRATEGIES[pid];
    return {
      tier: 1,
      contract: s.contract,
      reason: `Factory strategy ${s.contract} (${s.base}).${s.notes ? ' ' + s.notes : ''}`,
    };
  }

  // ── Tier 2: legacy match ──────────────────────────────────────────────
  if (LEGACY_STRATEGIES[pid]) {
    const s = LEGACY_STRATEGIES[pid];
    return {
      tier: 2,
      contract: s.contract,
      reason: `Non-factory strategy ${s.contract} (${s.base}). Needs per-vault deploy script.`,
    };
  }

  // ── Tier 3: no match ──────────────────────────────────────────────────
  return {
    tier: 3,
    contract: null,
    reason: `No matching Loin strategy for platformId="${pid}" / strategyTypeId="${stypeId}".`,
  };
}

module.exports = { classify, FACTORY_STRATEGIES, LEGACY_STRATEGIES, SPECIAL_VAULT_TYPES };
