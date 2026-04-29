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

export type BoostType = 'strength' | 'health' | 'speed';

export interface GauntletBoostDef {
  type: BoostType;
  label: string;
  description: string;
  emoji: string;
}

export const BOOST_OPTIONS: GauntletBoostDef[] = [
  { type: 'strength', label: 'Strength+', description: '+20% damage dealt',          emoji: '⚔️' },
  { type: 'health',   label: 'Health+',   description: '+50 max HP',                 emoji: '❤️' },
  { type: 'speed',    label: 'Speed+',    description: '+25% speed, -10% cooldowns', emoji: '⚡' },
];

export interface GauntletState {
  /** Base element that defines the enemy pool and boss (fire/water/life/air/earth) */
  gauntletElement: string;
  /** Element the player chose to fight with (any unlocked element) */
  playerElement: string;
  /** 1–(fightCount-1) = normal fights, last = boss */
  currentFight: number;
  /** Accumulated boost types picked between fights */
  boosts: BoostType[];
  /** Pre-generated enemy element IDs for regular fights */
  fightOrder: string[];
  /** Pre-generated mutation IDs per fight (array of arrays) */
  fightMutations: string[][];
  /** True when running the harder variant */
  hardMode: boolean;
}

export const GAUNTLET_COST = 2500;
export const GAUNTLET_REWARD = 1000;

export const GAUNTLET_HARD_COST = 1500;
export const GAUNTLET_HARD_REWARD = 3000;
export const GAUNTLET_HARD_BOSS_HP = 1500;

/** Difficulty level for each fight: 1=Easy … 5=Nightmare. Boss is also level 5. */
export const GAUNTLET_DIFFICULTY: number[] = [1, 2, 3, 4, 5, 5];

/** Hard-mode difficulty for 7 regular fights + 1 boss (all capped at 5=Nightmare). */
export const GAUNTLET_HARD_DIFFICULTY: number[] = [2, 3, 4, 5, 5, 5, 5, 5];

/** Mutation count per regular fight in hard mode (7 entries, one per regular fight). */
export const GAUNTLET_HARD_MUTATION_COUNTS: number[] = [2, 2, 2, 2, 2, 3, 4];

export const DIFFICULTY_LABELS = ['Easy', 'Normal', 'Hard', 'Expert', 'Nightmare'];
