export interface PerkDef {
  id: string;
  name: string;
  emoji: string;
  color: number;
  description: string;
  ingredients: readonly string[];
  tier: 'triple' | 'quad' | 'penta' | 'abstract-triple';
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
        description: 'Recast Remain while active to extend it 3s and turn the aura red. After it ends you take no damage. One-shot — locks Remain for the rest of the match.',
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

  // ── Abstract triple perks (Lab Level 2 abstract tab, 4 nuclei) ──────────
  {
    elementId: 'slime',
    perks: [
      {
        id: 'blood',
        name: 'Blood',
        emoji: '🩸',
        color: 0xaa1133,
        description: 'Sulpher Spring can grant blood slimes. Blood slimes slash nearby enemies every 1.5s, healing you for 50% of the damage. In shield form the slime strikes enemies within range every 1s. F+ pet grows (scale & damage) as you heal. Q+ slimes heal on return-contact damage.',
        ingredients: ['electricity', 'slime', 'fate'],
        tier: 'abstract-triple',
        elementId: 'slime',
      },
    ],
  },
  {
    elementId: 'silence',
    perks: [
      {
        id: 'torture',
        name: 'Torture',
        emoji: '🪝',
        color: 0x886688,
        description: 'Meat hook lodges inside the enemy for 4s (6s with E+), dealing 3 damage/s. Recast delivers an electric shock — 12 damage and 2s stun — instead of pulling.',
        ingredients: ['electricity', 'slime', 'sound'],
        tier: 'abstract-triple',
        elementId: 'silence',
      },
    ],
  },
  {
    elementId: 'magic',
    perks: [
      {
        id: 'thunder',
        name: 'Thunder',
        emoji: '⚡',
        color: 0xffe066,
        description: 'E and Q gain a 2-tap charge cycle. First press casts Lightning Call / Apocalypse Call (arming only). Second press fires the charged grimoire spell with bonus effects. Apocalypse Call also halves the next Q cooldown.',
        ingredients: ['electricity', 'slime', 'light'],
        tier: 'abstract-triple',
        elementId: 'magic',
      },
    ],
  },
  {
    elementId: 'electricity',
    perks: [
      {
        id: 'phoenix',
        name: 'Phoenix',
        emoji: '🔥',
        color: 0xff6644,
        description: 'Dying while overcharged (or via auto-revive) triggers 5s phoenix mode: invincible, +100% speed, drops a healing flame every second. After phoenix ends, stepping on flames heals 5 HP/s for 3s each.',
        ingredients: ['electricity', 'fate', 'sound'],
        tier: 'abstract-triple',
        elementId: 'electricity',
      },
    ],
  },
  {
    elementId: 'echo',
    perks: [
      {
        id: 'beacon',
        name: 'Beacon',
        emoji: '🔦',
        color: 0xffdd55,
        description: 'Vision becomes a forward flashlight cone instead of a circle. 3 batteries (8s recharge each): lantern on empty space costs 1 battery and widens the cone 20% for 2s; lantern on an enemy costs 2 batteries and summons an echo as normal.',
        ingredients: ['electricity', 'fate', 'light'],
        tier: 'abstract-triple',
        elementId: 'echo',
      },
    ],
  },
  {
    elementId: 'technology',
    perks: [
      {
        id: 'adrenaline',
        name: 'Adrenaline',
        emoji: '💉',
        color: 0xff3355,
        description: 'No abuse meter — events that would add abuse instead deal half that amount as self-damage. Domain Expansion ends after a fixed 8s timer rather than from abuse.',
        ingredients: ['electricity', 'sound', 'light'],
        tier: 'abstract-triple',
        elementId: 'technology',
      },
    ],
  },
  {
    elementId: 'death',
    perks: [
      {
        id: 'corruption',
        name: 'Corruption',
        emoji: '🦠',
        color: 0x556677,
        description: 'While in River Styx, corruption blobs spawn on you every 0.5s (max 8). Each blob blocks one incoming projectile. Click a blob to arm your next click attack — it releases a 5-damage AoE burst on hit.',
        ingredients: ['slime', 'fate', 'sound'],
        tier: 'abstract-triple',
        elementId: 'death',
      },
      {
        id: 'demon',
        name: 'Demon',
        emoji: '😈',
        color: 0x881133,
        description: 'Replace 1000 Blades with dagger projectiles. Daggers start at 2 damage and deal +2 per 5 kills (instead of +1). With Click+, daggers pierce through 2 enemies (3 total hits max).',
        ingredients: ['fate', 'sound', 'light'],
        tier: 'abstract-triple',
        elementId: 'death',
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
          'E has no cooldown, but planting costs you 15 HP. Your plants become mushrooms that start at 50% HP — cluster them and every mushroom nearby grows stronger, up to 150% at five.',
        ingredients: ['water', 'fire', 'life', 'earth', 'air'],
        tier: 'penta',
        elementId: 'life',
      },
    ],
  },

  // ── New abstract-triple perks ─────────────────────────────────────────────
  {
    elementId: 'sound',
    perks: [
      {
        id: 'harmony',
        name: 'Harmony',
        emoji: '🎶',
        color: 0xff99ff,
        description: 'Replaces Sonic Grapple with a Sonic Grenade: flies to cursor, lingers 2s, then explodes. Note-timed grenades auto-explode on arrival. On hit: star aura + +15% song speed & move speed for 20s (stackable). With F upgrade: perfect-timed grenades also refresh the cooldown (max 3/cycle, same as Grace Note).',
        ingredients: ['slime', 'sound', 'light'],
        tier: 'abstract-triple',
        elementId: 'sound',
      },
    ],
  },
  {
    elementId: 'light',
    perks: [
      {
        id: 'flicker',
        name: 'Flicker',
        emoji: '🪝',
        color: 0xfff4a8,
        description: 'Releasing a held Light spear launches it as a grapple — it pierces enemies (moderate damage + mark), sticks to the nearest wall, then 1s later pulls you to it. Pull damage scales with movement speed (or dodge chance with Click+).',
        ingredients: ['slime', 'fate', 'light'],
        tier: 'abstract-triple',
        elementId: 'light',
      },
    ],
  },

  // ── Quad perks (Lab Level 3, 5 nuclei) ───────────────────────────────────
  {
    elementId: 'fire',
    perks: [
      {
        id: 'alcohol',
        name: 'Alcohol',
        emoji: '🍺',
        color: 0xc97a3a,
        description: "Flame Dash → Drink Up! Tap E (no flask): get a flask. Tap E (with flask): drink — 25% less damage for 6s, then 50% slow for 2s (extra drinks stack slow penalty). Hold E ≥250ms (with flask): throw an alcohol puddle. Enemies in puddle 2s+ get confused; fire hits ignite it into a flame DOT. Flame Body + intoxicated: heat aura damages nearby enemies.",
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
  {
    elementId: 'plasma',
    perks: [
      {
        id: 'solar',
        name: 'Solar',
        emoji: '☀️',
        color: 0xff9900,
        description: "Plasma's R can be recast while a current is alive to instantly stop its movement. Stopped currents last 20s then explode at each endpoint (15 dmg AoE). When two plasma currents' beams overlap, spawn a plasma puddle near the intersection every 0.5s (puddles last 1s, deal rapid tick damage).",
        ingredients: ['slime', 'fate', 'sound', 'light'],
        tier: 'quad',
        elementId: 'plasma',
      },
    ],
  },
  {
    elementId: 'magnet',
    perks: [
      {
        id: 'blade',
        name: 'Blade',
        emoji: '⚔️',
        color: 0x6688cc,
        description: 'Iron rods become iron swords (16 base damage, double rod damage). Magnetic forces affect swords 2× as strongly — Mag Pulse and magnetized pull frequently overshoot the target.',
        ingredients: ['electricity', 'slime', 'fate', 'light'],
        tier: 'quad',
        elementId: 'magnet',
      },
    ],
  },
  {
    elementId: 'metal',
    perks: [
      {
        id: 'gunpowder',
        name: 'Gunpowder',
        emoji: '💥',
        color: 0xccaa44,
        description: 'Click now fires all weapons (Fire at Will) with 1/3 the normal E cooldown. E becomes Discharge: launch a magazine clip to cursor → AoE explosion + 20 equidistant hitscan beams. Discharge deletes your oldest weapon. New weapons fill empty slots before replacing occupied ones.',
        ingredients: ['electricity', 'fate', 'sound', 'light'],
        tier: 'quad',
        elementId: 'metal',
      },
    ],
  },
  {
    elementId: 'fate',
    perks: [
      {
        id: 'paper',
        name: 'Paper',
        emoji: '🃏',
        color: 0xeeddbb,
        description: 'Right-click costs 1 coin and fires 5 random cards in a shotgun spread (2s cooldown). Damage per card scales with the best poker hand formed: high card=1, pair=2, two pair=4, three of a kind=6, straight=8, flush=10, full house=14, four of a kind=20, straight flush=30, royal flush=40.',
        ingredients: ['electricity', 'slime', 'fate', 'sound'],
        tier: 'quad',
        elementId: 'fate',
      },
    ],
  },
  {
    elementId: 'quantum',
    perks: [
      {
        id: 'sonic-boom',
        name: 'Sonic Boom',
        emoji: '💨',
        color: 0x44ffcc,
        description: "Replace Quantum's wave click with a Terraria-style whip using the same charge-zone bar. Red = short range/low damage; yellow = medium; green = max range/damage; gold = max range + AoE at tip. Any hit deals damage; hitting at maximum range deals 2× damage + 0.5s stun.",
        ingredients: ['electricity', 'slime', 'sound', 'light'],
        tier: 'quad',
        elementId: 'quantum',
      },
    ],
  },
  {
    elementId: 'rubber',
    perks: [
      {
        id: 'uber-gear',
        name: 'Uber-Gear',
        emoji: '☁️',
        color: 0xffffff,
        description: "Q activates a 10s (15s with Q+) Uber-Gear form. When it ends, your HP is forced to 0 (or 80 damage with Q+). While active: +100% speed, enhanced Click/E/R/F/Barrage, and dodge becomes a stretchy caterpillar lunge. With Vulcanization, gain all bonuses without cooldown penalties.",
        ingredients: ['electricity', 'slime', 'fate', 'sound', 'light'],
        tier: 'penta',
        elementId: 'rubber',
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

export function findAbstractTriplePerkRecipe(a: string, b: string, c: string): PerkDef | undefined {
  const sorted = [a, b, c].sort().join(',');
  for (const entry of ALL_PERKS) {
    for (const perk of entry.perks) {
      if (perk.tier === 'abstract-triple' && [...perk.ingredients].sort().join(',') === sorted) return perk;
    }
  }
  return undefined;
}

export function getAbstractTriplePerksForElement(elementId: string): PerkDef[] {
  const found = ALL_PERKS.find((e) => e.elementId === elementId);
  if (!found) return [];
  return found.perks.filter((p) => p.tier === 'abstract-triple');
}
