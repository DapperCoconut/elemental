export interface CampaignFightDef {
  enemyElementId: string;
  difficulty: number;           // 1–5; matches DIFFICULTY_PRESETS in NpcOpponent.ts
  mutations?: string[];         // mutation ids from MUTATIONS in Mutations.ts
  starredMutations?: string[];  // subset of mutations[] that are starred
}

// Keyed by node id (e.g. 'fire-fight-1', 'fire-challenge').
// Worlds without an entry fall back to the legacy behavior in CampaignFightMenuScene.
export const CAMPAIGN_FIGHTS: Record<string, CampaignFightDef> = {
  // Fire World
  'fire-fight-1':   { enemyElementId: 'fire',        difficulty: 1 },
  'fire-fight-2':   { enemyElementId: 'electricity', difficulty: 2, mutations: ['molten'] },
  'fire-fight-3':   { enemyElementId: 'oil',         difficulty: 2, mutations: ['molten'] },
  'fire-fight-4':   { enemyElementId: 'plasma',      difficulty: 3, mutations: ['chaos'] },
  'fire-fight-5':   { enemyElementId: 'air',         difficulty: 3, mutations: ['molten'], starredMutations: ['molten'] },
  'fire-challenge': { enemyElementId: 'fire',        difficulty: 3, mutations: ['molten', 'archfiend'], starredMutations: ['molten'] },

  // Water World
  'water-fight-1':   { enemyElementId: 'water',   difficulty: 2 },
  'water-fight-2':   { enemyElementId: 'ice',     difficulty: 3, mutations: ['abyss'] },
  'water-fight-3':   { enemyElementId: 'crystal', difficulty: 3, mutations: ['encroach'] },
  'water-fight-4':   { enemyElementId: 'slime',   difficulty: 4, mutations: ['titanic'] },
  'water-fight-5':   { enemyElementId: 'growth',  difficulty: 4, mutations: ['clot'], starredMutations: ['clot'] },
  'water-challenge': { enemyElementId: 'water',   difficulty: 4, mutations: ['encroach', 'clot'], starredMutations: ['encroach', 'clot'] },
};

export function getCampaignFightDef(nodeId: string): CampaignFightDef | undefined {
  return CAMPAIGN_FIGHTS[nodeId];
}

export const DIFFICULTY_LABEL: Record<number, string> = {
  1: 'Easy', 2: 'Normal', 3: 'Hard', 4: 'Expert', 5: 'Nightmare',
};

// Minimal element display info for the fight menu panel.
export const ELEMENT_DISPLAY: Record<string, { name: string; emoji: string }> = {
  fire:        { name: 'Fire',        emoji: '🔥' },
  water:       { name: 'Water',       emoji: '💧' },
  electricity: { name: 'Electricity', emoji: '⚡' },
  oil:         { name: 'Oil',         emoji: '🛢️' },
  plasma:      { name: 'Plasma',      emoji: '🔮' },
  air:         { name: 'Air',         emoji: '💨' },
  ice:         { name: 'Ice',         emoji: '🧊' },
  crystal:     { name: 'Crystal',     emoji: '💎' },
  slime:       { name: 'Slime',       emoji: '🟢' },
  growth:      { name: 'Growth',      emoji: '🦠' },
};
