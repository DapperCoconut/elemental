export interface GrowthMutationDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

// Available from the start (Mutate menu always draws from at least this pool).
export const BASE_GROWTH_MUTATIONS: GrowthMutationDef[] = [
  { id: 'healthier',    name: 'Healthier',    description: '+10 max HP',             emoji: '💚' },
  { id: 'deadly',       name: 'Deadly',       description: '+15% damage',             emoji: '💀' },
  { id: 'linger',       name: 'Linger',       description: '+3s toxic duration',      emoji: '⏳' },
  { id: 'viral',        name: 'Viral',        description: '+2 toxic DPS',            emoji: '🧬' },
  { id: 'grow',         name: 'Grow',         description: '+20 HP, +20% size',       emoji: '📈' },
  { id: 'shrink',       name: 'Shrink',       description: '-20 HP, -20% size',       emoji: '📉' },
  { id: 'buffer',       name: 'Buffer',       description: '-0.5s bloat CD',          emoji: '🛡️' },
  { id: 'spray',        name: 'Spray',        description: '+1 infect projectile',    emoji: '🗡️' },
  { id: 'quick',        name: 'Quick',        description: '-0.5s infect CD',         emoji: '⚡' },
  { id: 'regenerative', name: 'Regenerative', description: '+1 HP/s regen',           emoji: '♻️' },
];

// Only drawn into the pool once the E+ upgrade is owned.
export const ADVANCED_GROWTH_MUTATIONS: GrowthMutationDef[] = [
  { id: 'chunk',           name: 'Chunk',           description: '+10% bloat AOE radius',               emoji: '💥' },
  { id: 'relapse',         name: 'Relapse',         description: 'Infect bounces off +1 wall',          emoji: '↩️' },
  { id: 'gene-enhance',    name: 'Gene Enhance',    description: 'Remove 20s from Q cooldown now',      emoji: '🧪' },
  { id: 'spread',          name: 'Spread',          description: 'Evo bonus (spores: +20% range, virus: +1 shot, claws: +5 dmg, plague: +20% AOE, bacterium: +5 HP)', emoji: '🌿' },
  { id: 'uber-infect',     name: 'Uber-Infect',     description: '+20% infect hitbox',                  emoji: '🔬' },
  { id: 'fungal-flourish', name: 'Fungal Flourish', description: 'Heal 10 HP (+10 per stack) when bloat explodes', emoji: '🍄' },
  { id: 'greed',           name: 'Greed',           description: '+1 option in future Mutate menus',    emoji: '🤑' },
  { id: 'sneeze',          name: 'Sneeze',          description: 'Green aura deals +1 tick dmg/s to nearby enemy', emoji: '🤧' },
  { id: 'cough',           name: 'Cough',           description: 'Yellow aura slows nearby enemy by 5% more', emoji: '😷' },
];

// Mutations still drawable when the "Virus" perk restricts the pool to infect-boosting picks.
export const INFECT_GROWTH_MUTATION_IDS = ['spray', 'quick', 'relapse', 'uber-infect', 'deadly', 'linger', 'viral'];
