export const GAUNTLET_GROUPS: Record<string, string[]> = {
  // Base elements
  fire:    ['fire', 'oil', 'shadow', 'hunt', 'creation'],
  water:   ['water', 'oil', 'ice', 'growth', 'crystal'],
  life:    ['life', 'growth', 'soul', 'hunt', 'gravity'],
  air:     ['air', 'shadow', 'ice', 'soul', 'sand'],
  earth:   ['earth', 'crystal', 'sand', 'gravity', 'creation'],
  // Combined elements
  oil:     ['fire', 'water', 'shadow', 'ice', 'creation'],
  shadow:  ['fire', 'air', 'soul', 'hunt', 'sand'],
  ice:     ['water', 'air', 'growth', 'crystal', 'gravity'],
  growth:  ['water', 'life', 'ice', 'soul', 'gravity'],
  crystal: ['water', 'earth', 'ice', 'sand', 'creation'],
  soul:    ['life', 'air', 'shadow', 'hunt', 'gravity'],
  hunt:    ['fire', 'life', 'shadow', 'soul', 'sand'],
  sand:    ['air', 'earth', 'shadow', 'crystal', 'hunt'],
  gravity: ['life', 'earth', 'ice', 'soul', 'creation'],
  creation:['fire', 'earth', 'oil', 'crystal', 'gravity'],
};

export const GAUNTLET_ELEMENTS: Array<{ id: string; name: string; emoji: string; color: number }> = [
  { id: 'fire',  name: 'Fire',  emoji: '🔥',  color: 0xff4400 },
  { id: 'water', name: 'Water', emoji: '💧',  color: 0x0088ff },
  { id: 'life',  name: 'Life',  emoji: '🌿',  color: 0x44cc44 },
  { id: 'air',   name: 'Air',   emoji: '🌬️', color: 0xaaddff },
  { id: 'earth', name: 'Earth', emoji: '🪨',  color: 0x887755 },
];

/** Entry in the cards/charms/curses record. effectiveMult accounts for Supremacy stacking. */
export interface BoostEntry {
  stacks: number;      // how many times picked
  effectiveMult: number; // multiplier baked in at time of each pick (1 normally, 2+ with Supremacy)
}

/** Cards, charms, and curses accumulated during a gauntlet run. */
export interface RunBoosts {
  cards: Record<string, number>;   // id → effective stack total (stacks × effectiveMult per pick)
  charms: Record<string, number>;  // id → effective stack total
  curses: Record<string, number>;  // id → effective stack total
  supremacyMult: number;           // doubles with each Charm of Supremacy pickup; applies to future picks
  sacrificeActive: boolean;        // true when Charm of Sacrifice has been picked at least once
}

export function emptyRunBoosts(): RunBoosts {
  return { cards: {}, charms: {}, curses: {}, supremacyMult: 1, sacrificeActive: false };
}

export function addBoostPick(boosts: RunBoosts, kind: 'cards' | 'charms' | 'curses', id: string): RunBoosts {
  const pile = { ...boosts[kind] };
  pile[id] = (pile[id] ?? 0) + boosts.supremacyMult;
  let newSupremacy = boosts.supremacyMult;
  let newSacrifice = boosts.sacrificeActive;
  // Handle charm special effects
  if (kind === 'charms') {
    if (id === 'charm-of-supremacy') newSupremacy = boosts.supremacyMult * 2;
    if (id === 'charm-of-sacrifice') newSacrifice = true;
  }
  return { ...boosts, [kind]: pile, supremacyMult: newSupremacy, sacrificeActive: newSacrifice };
}

export function getEffectiveStacks(boosts: RunBoosts, id: string): number {
  return boosts.cards[id] ?? boosts.charms[id] ?? boosts.curses[id] ?? 0;
}

export interface CampaignGauntletContext {
  slot: 0 | 1 | 2;
  worldId: string;
}

export interface GauntletState {
  /** Base element that defines the enemy pool and boss (fire/water/life/air/earth / 'infinity') */
  gauntletElement: string;
  /** Element the player chose to fight with (any unlocked element) */
  playerElement: string;
  /** 1–(fightCount-1) = normal fights, last = boss */
  currentFight: number;
  /** Cards / charms / curses accumulated during this run */
  boosts: RunBoosts;
  /** Pre-generated enemy element IDs for regular fights */
  fightOrder: string[];
  /** Pre-generated mutation IDs per fight (array of arrays) */
  fightMutations: string[][];
  /** True when running the harder variant */
  hardMode: boolean;
  /** Infinity gauntlet: shards accumulated so far this run */
  infinityShards: number;
  /** If set, this run was launched from a campaign world (not standalone gauntlet) */
  campaignContext?: CampaignGauntletContext;
}

export const GAUNTLET_COST = 2500;
export const GAUNTLET_REWARD = 1000;

export const GAUNTLET_HARD_COST = 1500;
export const GAUNTLET_HARD_REWARD = 3000;

export const INFINITY_GAUNTLET_ID = 'infinity';

/** Difficulty level for each fight: 1=Easy … 5=Nightmare. Boss is also level 5. */
export const GAUNTLET_DIFFICULTY: number[] = [1, 2, 3, 4, 5, 5];

/** Hard-mode difficulty for 7 regular fights + 1 boss (all capped at 5=Nightmare). */
export const GAUNTLET_HARD_DIFFICULTY: number[] = [2, 3, 4, 5, 5, 5, 5, 5];

export const DIFFICULTY_LABELS = ['Easy', 'Normal', 'Hard', 'Expert', 'Nightmare'];

// ── Infinity gauntlet scaling ────────────────────────────────────────────────

/** Difficulty step-function for Infinity. Returns 1–5 for fight index (1-based). */
export function infinityDifficulty(fightNum: number): number {
  if (fightNum < 5)  return 1;
  if (fightNum < 10) return 2;
  if (fightNum < 15) return 3;
  if (fightNum < 20) return 4;
  return 5;
}

/** NPC HP multiplier for an Infinity fight (1-based fightNum). */
export function infinityHpMult(fightNum: number, hardMode: boolean, isBoss: boolean): number {
  const inc = fightNum <= 25
    ? (hardMode ? 0.12 : 0.08)
    : (hardMode ? 0.24 : 0.16);
  const base = 1 + inc * (fightNum - 1);
  return isBoss ? base * (hardMode ? 2.0 : 1.5) : base;
}

/** NPC outgoing damage multiplier for an Infinity fight (1-based fightNum). */
export function infinityDmgMult(fightNum: number, hardMode: boolean): number {
  const inc = fightNum <= 25
    ? (hardMode ? 0.08 : 0.05)
    : (hardMode ? 0.16 : 0.10);
  return 1 + inc * (fightNum - 1);
}

/** Shards earned for clearing an Infinity fight (before curse multiplier). */
export function infinityFightShards(fightNum: number, hardMode: boolean, isBoss: boolean): number {
  const base = hardMode ? (8 + 2 * fightNum) : (5 + fightNum);
  const bossBonus = isBoss ? 25 * Math.floor(fightNum / 10) : 0;
  return base + bossBonus;
}
