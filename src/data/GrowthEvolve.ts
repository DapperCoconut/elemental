export type GrowthEvolvePathId = 'aggression' | 'utility' | 'survival';

export interface GrowthEvolveNodeDef {
  id: string;
  path: GrowthEvolvePathId;
  /** Row within the path, 1-4 (top to bottom). Ultimates sit at row 5, below Tier 4. */
  row: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
  /** Ultimates have only 1 tier, cost a flat amount of DNA, and only one can ever be bought per match. */
  isUltimate?: boolean;
}

export const GROWTH_EVOLVE_MAX_LEVEL = 3;
export const GROWTH_EVOLVE_ULTIMATE_MAX_LEVEL = 1;
export const GROWTH_EVOLVE_ULTIMATE_COST = 6;

export const GROWTH_EVOLVE_PATHS: { id: GrowthEvolvePathId; name: string }[] = [
  { id: 'aggression', name: 'Aggression' },
  { id: 'utility', name: 'Utility' },
  { id: 'survival', name: 'Survival' },
];

export const GROWTH_EVOLVE_NODES: GrowthEvolveNodeDef[] = [
  // ── Path 1: Aggression ──────────────────────────────────────
  { id: 'deadly-leeches', path: 'aggression', row: 1, name: 'Deadly Leeches', description: '+1 leech damage per tier' },
  { id: 'swarming-leeches', path: 'aggression', row: 2, name: 'Swarming Leeches', description: '+1 max leeches per enemy per tier' },
  { id: 'spore-blast', path: 'aggression', row: 3, name: 'Spore Blast', description: 'Spore Spread launches +1 spore per tier' },
  { id: 'vile-leeches', path: 'aggression', row: 4, name: 'Vile Leeches', description: 'Leeches grow larger and red; +2 leech damage per tier' },
  {
    id: 'un-leeched', path: 'aggression', row: 5, isUltimate: true, name: 'Un-leeched',
    description: 'Leeches are no longer projectiles — they become worm-like creatures (20 HP) that home in and melee for double damage. Other leech upgrades still apply; Healthy Leeches grants bonus HP instead of lifespan.',
  },
  // ── Path 2: Utility ──────────────────────────────────────────
  { id: 'quick-leeches', path: 'utility', row: 1, name: 'Quick Leeches', description: 'Leeches attack 0.1s faster per tier' },
  { id: 'rna-fabrication', path: 'utility', row: 2, name: 'RNA Fabrication', description: '-2.5 damage needed per DNA drop per tier' },
  { id: 'dna-salvage', path: 'utility', row: 3, name: 'DNA Salvage', description: 'Right-click a purchased node to refund up to 1/3 DNA per tier (rounded down)' },
  { id: 'broodmother', path: 'utility', row: 4, name: 'Broodmother', description: 'Auxiliary Growth costs 1 less DNA per tier' },
  {
    id: 'dna-maximization', path: 'utility', row: 5, isUltimate: true, name: 'DNA Maximization',
    description: 'All DNA drops are doubled, and max DNA is increased to 20.',
  },
  // ── Path 3: Survival ─────────────────────────────────────────
  { id: 'healthy-leeches', path: 'survival', row: 1, name: 'Healthy Leeches', description: '+1s leech lifespan per tier' },
  { id: 'leech-life', path: 'survival', row: 2, name: 'Leech Life', description: 'Heal 2 HP per tier when a leech naturally expires' },
  { id: 'vigorous-cancer', path: 'survival', row: 3, name: 'Vigorous Cancer', description: '+1 Cancer orb per tier' },
  { id: 'malignant-cancer', path: 'survival', row: 4, name: 'Malignant Cancer', description: 'Cancer orbs gain a 15% chance per tier to duplicate every second' },
  {
    id: 'cancer-synthesis', path: 'survival', row: 5, isUltimate: true, name: 'Cancer Synthesis',
    description: 'Cancer orbs heal you for 3 HP/s each, and destroying one (blocking a hit) grants +10 HP.',
  },
];

/** One row-4 node per path must be maxed before that path's ultimate can be bought. */
export const GROWTH_EVOLVE_ULTIMATE_PREREQ: Record<GrowthEvolvePathId, string> = {
  aggression: 'vile-leeches',
  utility: 'broodmother',
  survival: 'malignant-cancer',
};

export const GROWTH_EVOLVE_ULTIMATE_IDS: string[] = GROWTH_EVOLVE_NODES
  .filter((n) => n.isUltimate)
  .map((n) => n.id);

/** Cost in DNA to buy the (currentLevel + 1)-th tier of a node. */
export function growthEvolveNodeCost(currentLevel: number): number {
  return currentLevel + 1;
}
