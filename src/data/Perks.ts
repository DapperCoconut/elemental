export interface PerkDef {
  id: string;
  name: string;
  emoji: string;
  color: number;
  description: string;
  ingredients: readonly string[];
  tier: 'triple' | 'quad' | 'penta';
  elementId: string;
}

export interface ElementPerks {
  elementId: string;
  perks: PerkDef[];
}

export const ALL_PERKS: ElementPerks[] = [
  // ── Triple perks (Lab Level 2, 2 nuclei) ─────────────────────────────────
  {
    elementId: 'oil',
    perks: [
      {
        id: 'bio-fuel',
        name: 'Bio Fuel',
        emoji: '🛢️',
        color: 0xff8800,
        description: 'Drones fire 5 shots before destruction instead of 3.',
        ingredients: ['fire', 'water', 'life'],
        tier: 'triple',
        elementId: 'oil',
      },
    ],
  },
  {
    elementId: 'shadow',
    perks: [
      {
        id: 'void-shade',
        name: 'Void',
        emoji: '🌑',
        color: 0x440066,
        description: "Shadow's Dark Clouds last 50% longer and are 20% larger.",
        ingredients: ['fire', 'water', 'air'],
        tier: 'triple',
        elementId: 'shadow',
      },
      {
        id: 'plume',
        name: 'Plume',
        emoji: '💨',
        color: 0x6633aa,
        description: "Snap Traps become Plume Traps: deal more damage on trigger, spawn 5 Dark Clouds instead of stunning, and are slightly larger. Upgraded traps are even bigger and can still be dragged with Tentacle.",
        ingredients: ['fire', 'water', 'air', 'earth'],
        tier: 'quad',
        elementId: 'shadow',
      },
    ],
  },
  {
    elementId: 'earth',
    perks: [
      {
        id: 'obsidian',
        name: 'Obsidian',
        emoji: '🪨',
        color: 0x333344,
        description: 'Shield HP increased to 100 (75 each with Double Shield). You move 15% slower while this perk is equipped.',
        ingredients: ['fire', 'water', 'earth'],
        tier: 'triple',
        elementId: 'earth',
      },
    ],
  },
  {
    elementId: 'air',
    perks: [
      {
        id: 'hawk',
        name: 'Hawk',
        emoji: '🦅',
        color: 0xcc8833,
        description: 'F ability fires an eagle at the cursor. On hit, drags the enemy to your cursor instead of you.',
        ingredients: ['fire', 'life', 'air'],
        tier: 'triple',
        elementId: 'air',
      },
    ],
  },
  {
    elementId: 'creation',
    perks: [
      {
        id: 'automaton',
        name: 'Automaton',
        emoji: '🤖',
        color: 0x8833cc,
        description: 'Maze summons 3 automatons that wander and deal contact damage (0.5s cooldown per automaton).',
        ingredients: ['fire', 'life', 'earth'],
        tier: 'triple',
        elementId: 'creation',
      },
    ],
  },
  {
    elementId: 'sand',
    perks: [
      {
        id: 'purge',
        name: 'Purge',
        emoji: '⏳',
        color: 0xff3300,
        description: 'While Remain is active, all cooldowns tick down twice as fast. Ability bars pulse red.',
        ingredients: ['fire', 'earth', 'air'],
        tier: 'triple',
        elementId: 'sand',
      },
    ],
  },
  {
    elementId: 'growth',
    perks: [
      {
        id: 'virus',
        name: 'Virus',
        emoji: '🦠',
        color: 0x66cc66,
        description: "Mutate (E) will only offer upgrades that enhance the Infect ability while this perk is equipped.",
        ingredients: ['water', 'life', 'air'],
        tier: 'triple',
        elementId: 'growth',
      },
    ],
  },
  {
    elementId: 'gravity',
    perks: [
      {
        id: 'quake',
        name: 'Quake',
        emoji: '🌊',
        color: 0x996633,
        description: "Gravity's meteors spawn a small tsunami wave on impact, dealing damage and pushing the enemy.",
        ingredients: ['water', 'life', 'earth'],
        tier: 'triple',
        elementId: 'gravity',
      },
    ],
  },
  {
    elementId: 'ice',
    perks: [
      {
        id: 'rink',
        name: 'Rink',
        emoji: '⛸️',
        color: 0x88ccff,
        description: "Frozen Solid leaves a slippery ice area in its cone for 8 seconds. Both fighters slide on it; you gain +25% speed on your ice, plus +25% for 2s after Skate.",
        ingredients: ['water', 'air', 'earth'],
        tier: 'triple',
        elementId: 'ice',
      },
    ],
  },
  {
    elementId: 'soul',
    perks: [
      {
        id: 'ward',
        name: 'Ward',
        emoji: '🛡️',
        color: 0xccbb55,
        description: "Consume creates a warding hex in its AOE (if summons are consumed). Lasts 2s per consumed summon. You and your summons take 50% less damage inside.",
        ingredients: ['life', 'air', 'earth'],
        tier: 'triple',
        elementId: 'soul',
      },
    ],
  },

  // ── Penta perks (Lab Level 4, 10 nuclei) ─────────────────────────────────
  {
    elementId: 'life',
    perks: [
      {
        id: 'mycology',
        name: 'Mycology',
        emoji: '🍄',
        color: 0xaa66dd,
        description:
          'Your plants become mushrooms (50 HP) that spawn mini-mushrooms every 2s. Grow fires heal projectiles from every mushroom; Thorns fires damage projectiles. Upgraded Grow/Thorns convert the nearest mushroom into a healing/poisonous mushroom that AOE heals or damages every 2s.',
        ingredients: ['water', 'fire', 'life', 'earth', 'air'],
        tier: 'penta',
        elementId: 'life',
      },
    ],
  },

  // ── Quad perks (Lab Level 3, 5 nuclei) ───────────────────────────────────
  {
    elementId: 'fire',
    perks: [
      {
        id: 'candle',
        name: 'Candle',
        emoji: '🕯️',
        color: 0xffaa55,
        description: "Flame Dash no longer explodes; instead summons a Candle Golem (25 HP) at your start position. It walks toward the enemy and blocks projectiles. Click to ignite (AOE every 1.2s). Q-bomb ignites it stronger (redder, AOE every 0.8s). Max 1 golem (2 with Propulsion upgrade). Melts after 8s.",
        ingredients: ['fire', 'water', 'life', 'air'],
        tier: 'quad',
        elementId: 'fire',
      },
    ],
  },
  {
    elementId: 'crystal',
    perks: [
      {
        id: 'gateway',
        name: 'Gateway',
        emoji: '🌀',
        color: 0xaaeeff,
        description: "Mirrors become Gateways: 50% longer, lasers pass through instead of bouncing (still deal double damage), and Barrage shards get +speed and +damage when passing through. Upgraded mirrors still move.",
        ingredients: ['fire', 'water', 'life', 'earth'],
        tier: 'quad',
        elementId: 'crystal',
      },
    ],
  },
  {
    elementId: 'hunt',
    perks: [
      {
        id: 'rage',
        name: 'Rage',
        emoji: '🩸',
        color: 0xcc2233,
        description: "Trail lasts 5s. Standing on your trail builds Rage (10/sec); Blood Pact hits also give Rage (1 dmg = 1 rage). At 100 Rage: instantly transform into Beast even off cooldown, gaining silvery armor and 50% DR. Hybrid form gains silvery look and 10% DR instead.",
        ingredients: ['fire', 'life', 'air', 'earth'],
        tier: 'quad',
        elementId: 'hunt',
      },
    ],
  },
  {
    elementId: 'water',
    perks: [
      {
        id: 'stalagmite',
        name: 'Stalagmite',
        emoji: '⛰️',
        color: 0x4466bb,
        description: "Splash drops spikey stalagmites instead of puddles — no slow or DoT, but deal strong initial damage. Your click-projectile hitting a stalagmite launches it as a powerful rock. Upgraded splash's last stalagmite is lava-colored, bigger, and hits even harder when launched.",
        ingredients: ['water', 'life', 'air', 'earth'],
        tier: 'quad',
        elementId: 'water',
      },
    ],
  },
];

export function findPerkRecipe(a: string, b: string, c: string): PerkDef | undefined {
  const sorted = [a, b, c].sort().join(',');
  for (const entry of ALL_PERKS) {
    for (const perk of entry.perks) {
      if (perk.tier === 'triple' && [...perk.ingredients].sort().join(',') === sorted) return perk;
    }
  }
  return undefined;
}

export function findQuadPerkRecipe(a: string, b: string, c: string, d: string): PerkDef | undefined {
  const sorted = [a, b, c, d].sort().join(',');
  for (const entry of ALL_PERKS) {
    for (const perk of entry.perks) {
      if (perk.tier === 'quad' && [...perk.ingredients].sort().join(',') === sorted) return perk;
    }
  }
  return undefined;
}

export function getPerkById(id: string): PerkDef | undefined {
  for (const entry of ALL_PERKS) {
    const found = entry.perks.find((p) => p.id === id);
    if (found) return found;
  }
  return undefined;
}

export function getPerksForElement(elementId: string): PerkDef[] {
  return ALL_PERKS.find((e) => e.elementId === elementId)?.perks ?? [];
}

export function getQuadPerksForElement(elementId: string): PerkDef[] {
  return getPerksForElement(elementId).filter((p) => p.tier === 'quad');
}

export function findPentaPerkRecipe(
  a: string,
  b: string,
  c: string,
  d: string,
  e: string,
): PerkDef | undefined {
  const sorted = [a, b, c, d, e].sort().join(',');
  for (const entry of ALL_PERKS) {
    for (const perk of entry.perks) {
      if (perk.tier === 'penta' && [...perk.ingredients].sort().join(',') === sorted) return perk;
    }
  }
  return undefined;
}

export function getPentaPerksForElement(elementId: string): PerkDef[] {
  return getPerksForElement(elementId).filter((p) => p.tier === 'penta');
}
