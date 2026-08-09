import { RunBoosts } from './GauntletData';

export type BoostRarity = 'common' | 'rare';
export type BoostKind = 'card' | 'charm' | 'curse';

export interface BoostDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rarity: BoostRarity;
  kind: BoostKind;
  /** Relative weight in pool rolls. Common=1.0, rare=0.10. */
  baseWeight: number;
  /** Charm bias: which card IDs this charm's weight bonus applies to (for charm-of-speed etc.) */
  biasedCardIds?: string[];
}

// ── Cards ────────────────────────────────────────────────────────────────────

export const CARDS: BoostDef[] = [
  // Common cards
  {
    id: 'quick', name: 'Quick', emoji: '💨', rarity: 'common', kind: 'card', baseWeight: 1,
    description: '+30% movement speed',
  },
  {
    id: 'dodgy', name: 'Dodgy', emoji: '🌀', rarity: 'common', kind: 'card', baseWeight: 1,
    description: '+20% chance to dodge incoming hits',
  },
  {
    id: 'deadly', name: 'Deadly', emoji: '⚔️', rarity: 'common', kind: 'card', baseWeight: 1,
    description: '+30% damage dealt',
  },
  {
    id: 'healthy', name: 'Healthy', emoji: '❤️', rarity: 'common', kind: 'card', baseWeight: 1,
    description: '+40 max HP',
  },
  {
    id: 'regenerative', name: 'Regenerative', emoji: '💚', rarity: 'common', kind: 'card', baseWeight: 1,
    description: '+6 HP/s passive regeneration',
  },
  {
    id: 'aggressive', name: 'Aggressive', emoji: '⚡', rarity: 'common', kind: 'card', baseWeight: 1,
    description: '-20% ability cooldowns',
  },
  {
    id: 'technique', name: 'Technique', emoji: '🏃', rarity: 'common', kind: 'card', baseWeight: 1,
    description: 'Dodge distance +60%',
  },
  {
    id: 'protected', name: 'Protected', emoji: '🛡️', rarity: 'common', kind: 'card', baseWeight: 1,
    description: 'Take 20% less damage from all sources',
  },
  {
    id: 'thorns', name: 'Thorns', emoji: '🌵', rarity: 'common', kind: 'card', baseWeight: 1,
    description: 'Reflect 10% of incoming damage back to enemy',
  },
  {
    id: 'bomber', name: 'Bomber', emoji: '💥', rarity: 'common', kind: 'card', baseWeight: 1,
    description: 'Leave a 20-dmg AOE explosion on dodge (×stacks)',
  },
  {
    id: 'painful', name: 'Painful', emoji: '🔥', rarity: 'common', kind: 'card', baseWeight: 1,
    description: 'Status effects you apply last 30% longer and deal 30% more damage',
  },
  // Rare cards
  {
    id: 'finality', name: 'Finality', emoji: '☄️', rarity: 'rare', kind: 'card', baseWeight: 0.10,
    description: 'Q ability cooldown is quartered',
  },
  {
    id: 'cripple', name: 'Cripple', emoji: '🩶', rarity: 'rare', kind: 'card', baseWeight: 0.10,
    description: 'Every hit you land slows the enemy 30% for 2s',
  },
  {
    id: 'psycho', name: 'Psycho', emoji: '🌀', rarity: 'rare', kind: 'card', baseWeight: 0.10,
    description: 'Dodge teleports you to your cursor. (Extra stacks: -30% dodge cooldown)',
  },
];

// ── Charms ───────────────────────────────────────────────────────────────────

export const CHARMS: BoostDef[] = [
  {
    id: 'charm-of-speed', name: 'Charm of Speed', emoji: '💨', rarity: 'common', kind: 'charm', baseWeight: 1,
    description: 'Future boosts more likely to roll Quick, Dodgy, Aggressive, Technique',
    biasedCardIds: ['quick', 'dodgy', 'aggressive', 'technique'],
  },
  {
    id: 'charm-of-strength', name: 'Charm of Strength', emoji: '⚔️', rarity: 'common', kind: 'charm', baseWeight: 1,
    description: 'Future boosts more likely to roll Deadly, Bomber, Painful',
    biasedCardIds: ['deadly', 'bomber', 'painful'],
  },
  {
    id: 'charm-of-resistance', name: 'Charm of Resistance', emoji: '🛡️', rarity: 'common', kind: 'charm', baseWeight: 1,
    description: 'Future boosts more likely to roll Healthy, Protected, Thorns',
    biasedCardIds: ['healthy', 'protected', 'thorns'],
  },
  {
    id: 'charm-of-luck', name: 'Charm of Luck', emoji: '🍀', rarity: 'common', kind: 'charm', baseWeight: 1,
    description: 'Rare cards appear much more often in future boosts',
  },
  {
    id: 'charm-of-compounding', name: 'Charm of Compounding', emoji: '📈', rarity: 'common', kind: 'charm', baseWeight: 1,
    description: 'Cards you already own are more likely to appear again',
  },
  // Rare charms
  {
    id: 'charm-of-supremacy', name: 'Charm of Supremacy', emoji: '👑', rarity: 'rare', kind: 'charm', baseWeight: 0.15,
    description: 'All future cards, charms, and curses are worth four times as much',
  },
  {
    id: 'charm-of-greed', name: 'Charm of Greed', emoji: '💰', rarity: 'rare', kind: 'charm', baseWeight: 0.15,
    description: 'Future boost screens show two extra cards to choose from',
  },
  {
    id: 'charm-of-sacrifice', name: 'Charm of Sacrifice', emoji: '⚖️', rarity: 'rare', kind: 'charm', baseWeight: 0.15,
    description: 'All future curse effects become positive (shard bonus still applies)',
  },
];

// ── Curses ───────────────────────────────────────────────────────────────────

export const CURSES: BoostDef[] = [
  {
    id: 'sluggish', name: 'Sluggish', emoji: '🐌', rarity: 'common', kind: 'curse', baseWeight: 1,
    description: '-20% speed, lose dodge ability. +15% shard reward',
  },
  {
    id: 'pathetic', name: 'Pathetic', emoji: '💔', rarity: 'common', kind: 'curse', baseWeight: 1,
    description: '-25% damage dealt. +20% shard reward',
  },
  {
    id: 'weak', name: 'Weak', emoji: '🩹', rarity: 'common', kind: 'curse', baseWeight: 1,
    description: '-25 max HP. +20% shard reward',
  },
  {
    id: 'petri', name: 'Petri', emoji: '🧫', rarity: 'common', kind: 'curse', baseWeight: 1,
    description: 'Enemy gains an extra random mutation. +100% shard reward',
  },
  {
    id: 'unfortunate', name: 'Unfortunate', emoji: '🎲', rarity: 'common', kind: 'curse', baseWeight: 1,
    description: 'Enemies have a 10% chance to crit for 2× damage. +20% shard reward',
  },
  {
    id: 'fat', name: 'Fat', emoji: '🪨', rarity: 'common', kind: 'curse', baseWeight: 1,
    description: 'You grow 15% larger (bigger hitbox). +20% shard reward',
  },
];

export const ALL_BOOSTS: BoostDef[] = [...CARDS, ...CHARMS, ...CURSES];

export function getBoostDef(id: string): BoostDef | undefined {
  return ALL_BOOSTS.find((b) => b.id === id);
}

// ── Roll model ────────────────────────────────────────────────────────────────

function weightedSample(pool: BoostDef[], weights: Map<string, number>, count: number): BoostDef[] {
  const result: BoostDef[] = [];
  const remaining = [...pool];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const totalW = remaining.reduce((sum, b) => sum + (weights.get(b.id) ?? b.baseWeight), 0);
    let r = Math.random() * totalW;
    let chosen = remaining[remaining.length - 1];
    for (const b of remaining) {
      r -= weights.get(b.id) ?? b.baseWeight;
      if (r <= 0) { chosen = b; break; }
    }
    result.push(chosen);
    remaining.splice(remaining.indexOf(chosen), 1);
  }
  return result;
}

export interface RollResult {
  cards: BoostDef[];
  charms: BoostDef[];
  curse: BoostDef;
}

export function rollPicks(boosts: RunBoosts): RollResult {
  // Every charm weight below is twice the pull it used to have, matching the doubled
  // card effects in `applyGauntletBoosts`. A charm that barely bent the next roll was
  // a wasted pick.
  const cardWeights = new Map<string, number>();
  for (const c of CARDS) {
    let w = c.baseWeight;
    // Rare boost from Charm of Luck
    if (c.rarity === 'rare') w *= Math.pow(4, boosts.charms['charm-of-luck'] ?? 0);
    // Per-category bias from speed/strength/resistance charms
    const biasCharms = CHARMS.filter((ch) => ch.biasedCardIds?.includes(c.id));
    for (const bc of biasCharms) {
      w *= Math.pow(6, boosts.charms[bc.id] ?? 0);
    }
    // Compounding: boost cards already owned
    if ((boosts.cards[c.id] ?? 0) > 0) {
      w *= Math.pow(2, boosts.charms['charm-of-compounding'] ?? 0);
    }
    cardWeights.set(c.id, w);
  }

  const charmWeights = new Map<string, number>();
  for (const c of CHARMS) {
    const w = c.rarity === 'rare' ? c.baseWeight * Math.pow(4, boosts.charms['charm-of-luck'] ?? 0) : c.baseWeight;
    charmWeights.set(c.id, w);
  }

  const greedExtra = Math.floor(boosts.charms['charm-of-greed'] ?? 0) * 2;
  const cardCount = 5 + greedExtra;

  const cards = weightedSample(CARDS, cardWeights, cardCount);
  const charms = weightedSample(CHARMS, charmWeights, 2);

  // Curse: uniform random
  const curse = CURSES[Math.floor(Math.random() * CURSES.length)];

  return { cards, charms, curse };
}

// ── Shard multiplier from curses ──────────────────────────────────────────────

const CURSE_SHARD_PCTS: Record<string, number> = {
  sluggish: 0.15,
  pathetic: 0.20,
  weak: 0.20,
  petri: 1.00,
  unfortunate: 0.20,
  fat: 0.20,
};

export function computeCurseShardMult(boosts: RunBoosts): number {
  let mult = 1;
  for (const [id, stacks] of Object.entries(boosts.curses)) {
    const pct = CURSE_SHARD_PCTS[id] ?? 0;
    mult *= 1 + pct * stacks;
  }
  return mult;
}

// ── Border colors for the pick UI ─────────────────────────────────────────────

export function boostBorderColor(def: BoostDef): number {
  if (def.kind === 'curse') return 0xcc2233;
  if (def.kind === 'charm' && def.rarity === 'rare') return 0xaa44ff;
  if (def.kind === 'charm') return 0x9944bb;
  if (def.rarity === 'rare') return 0xffcc00;
  return 0x44ccff;
}

export function boostLabelColor(def: BoostDef): string {
  if (def.kind === 'curse') return '#ff6666';
  if (def.kind === 'charm' && def.rarity === 'rare') return '#cc88ff';
  if (def.kind === 'charm') return '#bb88ee';
  if (def.rarity === 'rare') return '#ffdd66';
  return '#44ccff';
}
