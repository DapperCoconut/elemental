export const GAUNTLET_GROUPS: Record<string, string[]> = {
  fire:  ['fire', 'oil', 'shadow', 'hunt', 'creation'],
  water: ['water', 'oil', 'ice', 'growth', 'crystal'],
  life:  ['life', 'growth', 'soul', 'hunt', 'gravity'],
  air:   ['air', 'shadow', 'ice', 'soul', 'sand'],
  earth: ['earth', 'crystal', 'sand', 'gravity', 'creation'],
};

export const GAUNTLET_ELEMENTS: Array<{ id: string; name: string; emoji: string; color: number }> = [
  { id: 'fire',  name: 'Fire',  emoji: '🔥', color: 0xff4400 },
  { id: 'water', name: 'Water', emoji: '💧', color: 0x0088ff },
  { id: 'life',  name: 'Life',  emoji: '🌿', color: 0x44cc44 },
  { id: 'air',   name: 'Air',   emoji: '🌬️', color: 0xaaddff },
  { id: 'earth', name: 'Earth', emoji: '🪨', color: 0x887755 },
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
  /** Base element ID of the gauntlet (fire/water/life/air/earth) */
  gauntletElement: string;
  /** 1–5 = normal fights, 6 = boss */
  currentFight: number;
  /** Accumulated boost types picked between fights */
  boosts: BoostType[];
  /** Pre-generated enemy element IDs for fights 1–5 */
  fightOrder: string[];
  /** Pre-generated mutation IDs for fights 1–5 */
  fightMutations: string[];
}

export const GAUNTLET_COST = 2500;
export const GAUNTLET_REWARD = 1000;

/** Difficulty level for each fight: 1=Easy … 5=Nightmare. Boss is also level 5. */
export const GAUNTLET_DIFFICULTY: number[] = [1, 2, 3, 4, 5, 5];

export const DIFFICULTY_LABELS = ['Easy', 'Normal', 'Hard', 'Expert', 'Nightmare'];
