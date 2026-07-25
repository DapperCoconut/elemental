export type GrowthEvolvePathId = 'offense' | 'defense' | 'efficiency';

/** Shared shape for a node in either of Growth's two upgrade trees (body / sickness). */
export interface GrowthNodeDef<P extends string = string> {
  id: string;
  path: P;
  /** Row within the path, 1-4 (top to bottom). Ultimates sit at row 5, below Tier 4. */
  row: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
  /** Ultimates have only 1 tier, cost a flat amount of DNA, and only one can be bought per body per match. */
  isUltimate?: boolean;
}

export type GrowthEvolveNodeDef = GrowthNodeDef<GrowthEvolvePathId>;

export const GROWTH_EVOLVE_MAX_LEVEL = 3;
export const GROWTH_EVOLVE_ULTIMATE_MAX_LEVEL = 1;
export const GROWTH_EVOLVE_ULTIMATE_COST = 6;

export const GROWTH_EVOLVE_PATHS: { id: GrowthEvolvePathId; name: string; color: number }[] = [
  { id: 'offense', name: 'Offensive', color: 0xff5544 },
  { id: 'defense', name: 'Defensive', color: 0x4488ff },
  { id: 'efficiency', name: 'Efficiency', color: 0xffcc44 },
];

export const GROWTH_EVOLVE_NODES: GrowthEvolveNodeDef[] = [
  // ── Path 1: Offensive ───────────────────────────────────────
  { id: 'teeth', path: 'offense', row: 1, name: 'Teeth', description: '+3 bacterium damage per tier' },
  { id: 'viral-spikes', path: 'offense', row: 2, name: 'Viral Spikes', description: 'Virus hits deal +2 and expelled floor viruses +2 damage per tier' },
  { id: 'more-teeth', path: 'offense', row: 3, name: 'More Teeth', description: '+4 bacterium damage per tier' },
  { id: 'spiked-spores', path: 'offense', row: 4, name: 'Spiked Spores', description: 'Every 20 damage your spores soak, the enemy takes 2 damage per tier' },
  {
    id: 'claws', path: 'offense', row: 5, isUltimate: true, name: 'Claws',
    description: 'Clicking near an enemy swipes with a claw for 35 damage instead of launching a bacterium.',
  },
  // ── Path 2: Defensive ───────────────────────────────────────
  { id: 'thick-flesh', path: 'defense', row: 1, name: 'Thick Flesh', description: '10% damage resistance per tier' },
  { id: 'digestive-system', path: 'defense', row: 2, name: 'Digestive System', description: 'Every 20 click damage dealt heals you 2 HP per tier' },
  { id: 'gut-bacteria', path: 'defense', row: 3, name: 'Gut Bacteria', description: 'Spore Spray launches +1 spore per tier; spores grow +5 max HP/s faster per tier' },
  { id: 'spiked-shell', path: 'defense', row: 4, name: 'Spiked Shell', description: 'Enemies touching you take 5 contact damage per tier every second' },
  {
    id: 'chitin-shell', path: 'defense', row: 5, isUltimate: true, name: 'Chitin Shell',
    description: 'Grow a brown chitin carapace worth 75 shield HP. Once broken it regrows in full after 15s.',
  },
  // ── Path 3: Efficiency ──────────────────────────────────────
  { id: 'enhanced-flagellum', path: 'efficiency', row: 1, name: 'Enhanced Flagellum', description: 'Bacteria fly 20% faster and click cools 15% faster per tier' },
  { id: 'system-efficiency', path: 'efficiency', row: 2, name: 'System Efficiency', description: 'All cooldowns are 10% shorter per tier' },
  { id: 'enhanced-brain', path: 'efficiency', row: 3, name: 'Enhanced Brain', description: 'DNA drops need 5% less damage per tier' },
  { id: 'fast-evolution', path: 'efficiency', row: 4, name: 'Fast Evolution', description: 'Right-click sells an upgrade for 50/75/100% DNA back per tier; row 4-5 upgrades cost 1 less DNA' },
  {
    id: 'sweating', path: 'efficiency', row: 5, isUltimate: true, name: 'Sweating',
    description: 'Bank up to 3 charges of Virus (R) and Spore Spray (F), and DNA is collected instantly from anywhere.',
  },
];

/** One row-4 node per path must be maxed before that path's ultimate can be bought. */
export const GROWTH_EVOLVE_ULTIMATE_PREREQ: Record<GrowthEvolvePathId, string> = {
  offense: 'spiked-spores',
  defense: 'spiked-shell',
  efficiency: 'fast-evolution',
};

export const GROWTH_EVOLVE_ULTIMATE_IDS: string[] = GROWTH_EVOLVE_NODES
  .filter((n) => n.isUltimate)
  .map((n) => n.id);

/** Clone-only node: not part of any path. +50 max HP and HP per tier, flat 3 DNA per tier, 3 tiers. */
export const GROWTH_CLONE_MATURITY_ID = 'physical-maturity';
export const GROWTH_CLONE_MATURITY_NAME = 'Physical Maturity';
export const GROWTH_CLONE_MATURITY_DESC = '+50 max HP and HP per tier (clone bodies only)';
export const GROWTH_CLONE_MATURITY_COST = 3;
export const GROWTH_CLONE_MATURITY_MAX_LEVEL = 3;
export const GROWTH_CLONE_MATURITY_HP_PER_TIER = 50;

/**
 * Cost in DNA to buy the (currentLevel + 1)-th tier of a regular node.
 * Fast Evolution (any tier) makes row 4-5 upgrades cost 1 less DNA.
 * Apex (a Secret Upgrade) shaves 1 off the third tier of any node.
 */
export function growthEvolveNodeCost(currentLevel: number, row: number, fastEvolutionTier: number, apex = false): number {
  const base = currentLevel + 1;
  let discount = fastEvolutionTier > 0 && row >= 4 ? 1 : 0;
  if (apex && base >= 3) discount += 1;
  return Math.max(1, base - discount);
}

/** Cost in DNA of an ultimate, after Fast Evolution (row 5) and Apex discounts. */
export function growthEvolveUltimateCost(fastEvolutionTier: number, apex = false): number {
  return Math.max(1, GROWTH_EVOLVE_ULTIMATE_COST - (fastEvolutionTier > 0 ? 1 : 0) - (apex ? 2 : 0));
}

/** Fraction of a tier's cost refunded when sold, by Fast Evolution tier (1-3). */
export function growthEvolveSellRefundFraction(fastEvolutionTier: number): number {
  return [0, 0.5, 0.75, 1][Math.min(3, Math.max(0, fastEvolutionTier))];
}

// ── Growth Mastery: Secret Upgrades ────────────────────────────────────────
// Two of these are rolled into the Evolve menu at the start of every match. They
// are single-tier, cost a flat 8 DNA, and cannot be sold.

export interface GrowthSecretDef {
  id: string;
  name: string;
  description: string;
}

export const GROWTH_SECRET_COST = 8;
/** How many of the pool are unlocked (offered) per match. */
export const GROWTH_SECRET_ROLL_COUNT = 2;

export const GROWTH_SECRET_UPGRADES: GrowthSecretDef[] = [
  { id: 'brood', name: 'Brood', description: 'Your click launches two bacteria instead of one.' },
  { id: 'ruler', name: 'Ruler', description: 'Keep up to 2 clones at once. SPACE cycles between them.' },
  { id: 'viral-consumption', name: 'Viral Consumption', description: 'Eating a healthy virus grants +20% speed and damage for 3s.' },
  { id: 'mitosis', name: 'Mitosis', description: 'DNA has a 20% chance to split, paying out 2 instead of 1.' },
  { id: 'crawling-spores', name: 'Crawling Spores', description: 'Your spores slowly crawl toward the enemy, jostling past each other.' },
  { id: 'pandemic', name: 'Pandemic', description: 'Dropped floor viruses also infect for 3s, so victims expel viruses of their own.' },
  { id: 'r-specialized', name: 'R Specialized', description: 'You become 25% smaller and 25% faster.' },
  { id: 'k-specialized', name: 'K Specialized', description: 'You become 30% bigger and gain 50 max HP and HP.' },
  { id: 'apex', name: 'Apex', description: 'Tier 3 upgrades cost 1 less DNA; Ultimate upgrades cost 2 less.' },
];

// ── Growth Mastery: Sickness tree (Syringe Shot) ───────────────────────────
// A second, independently-purchased tree that only exists while Syringe Shot is
// bound. Same DNA wallet, same cost curve, same one-ultimate-per-path rules.

export type GrowthSickPathId = 'lethality' | 'transmission' | 'severity';
export type GrowthSickNodeDef = GrowthNodeDef<GrowthSickPathId>;

export const GROWTH_SICK_PATHS: { id: GrowthSickPathId; name: string; color: number }[] = [
  { id: 'lethality', name: 'Lethality', color: 0xff3344 },
  { id: 'transmission', name: 'Transmission', color: 0xdd8844 },
  { id: 'severity', name: 'Severity', color: 0xaa4466 },
];

export const GROWTH_SICK_NODES: GrowthSickNodeDef[] = [
  // ── Path 1: Lethality ───────────────────────────────────────
  { id: 'deadly', path: 'lethality', row: 1, name: 'Deadly', description: 'Sickness deals +1 damage per second, per tier' },
  { id: 'sick-vuln', path: 'lethality', row: 2, name: 'Weakening', description: 'Sickness builds +1% damage vulnerability per second, per tier' },
  { id: 'brutal', path: 'lethality', row: 3, name: 'Brutal', description: 'Sickness ticks every 0.8s, then 0.6s, then 0.5s' },
  { id: 'crippling', path: 'lethality', row: 4, name: 'Crippling', description: '+1 sickness damage per second per tier; every 5th tick hits for +2 more per tier' },
  {
    id: 'fatal', path: 'lethality', row: 5, isUltimate: true, name: 'Fatal',
    description: 'A sick enemy at 10% health or less dies instantly.',
  },
  // ── Path 2: Transmission ────────────────────────────────────
  { id: 'quick-fire', path: 'transmission', row: 1, name: 'Quick-Fire', description: 'Syringe Shot cooldown -1s per tier' },
  { id: 'sneeze', path: 'transmission', row: 2, name: 'Sneeze', description: 'Sick enemies sneeze a cone every 4s, infecting others for 6s (+2s per tier)' },
  { id: 'contact', path: 'transmission', row: 3, name: 'Contact', description: 'Sick enemies infect anyone they touch for 3s (+2s per tier)' },
  { id: 'blood-spread', path: 'transmission', row: 4, name: 'Blood Spread', description: 'Every 50 damage a sick enemy takes leaves a 5s blood puddle that sickens for 3s (+2s per tier)' },
  {
    id: 'syringe-shatter', path: 'transmission', row: 5, isUltimate: true, name: 'Syringe Shatter',
    description: 'Syringes burst on impact, spraying half their sickness duration over nearby enemies.',
  },
  // ── Path 3: Severity ────────────────────────────────────────
  { id: 'remaining', path: 'severity', row: 1, name: 'Remaining', description: 'Syringe sickness lasts +2s per tier (spread infections are unaffected)' },
  { id: 'slowing', path: 'severity', row: 2, name: 'Slowing', description: 'Sick enemies are slowed 12% per tier' },
  { id: 'sick-weaken', path: 'severity', row: 3, name: 'Weakening', description: 'Sick enemies deal 10% less damage per tier' },
  { id: 'compromising', path: 'severity', row: 4, name: 'Compromising', description: 'Damage a sick enemy takes erupts around them, hitting other enemies for 10% more per tier' },
  {
    id: 'carrier', path: 'severity', row: 5, isUltimate: true, name: 'Carrier',
    description: 'Enemies who shake off sickness stay carriers forever: 1 damage/s, 5% slower, 5% weaker.',
  },
];

/** One row-4 node per sickness path must be maxed before that path's ultimate can be bought. */
export const GROWTH_SICK_ULTIMATE_PREREQ: Record<GrowthSickPathId, string> = {
  lethality: 'crippling',
  transmission: 'blood-spread',
  severity: 'compromising',
};

export const GROWTH_SICK_ULTIMATE_IDS: string[] = GROWTH_SICK_NODES
  .filter((n) => n.isUltimate)
  .map((n) => n.id);
