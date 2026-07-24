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
    // Growth was reworked (Leech Brood / Evolve / Spore Spread / Cancer / Auxiliary Growth) —
    // the old "Virus" perk enhanced the removed Infect ability. Left blank until redesigned.
    perks: [],
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
        description: 'While 2 or more of your Amalgams are within range of you, you take 30% less damage.',
        ingredients: ['life', 'air', 'earth'],
        tier: 'triple',
        elementId: 'soul',
      },
    ],
  },

  // ── Abstract triple perks (Lab Level 2 abstract tab, 4 nuclei) ──────────
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
    // Technology was reworked into the Addicting Cruncher/Overt Advertisement/Upload/Web Drag/
    // Admin Console kit — the old "Adrenaline" perk enhanced the removed abuse-meter and
    // Domain Expansion mechanics. Left blank until redesigned.
    perks: [],
  },
  {
    elementId: 'gunpowder',
    // Gunpowder (formerly Death) was reworked into an arsenal kit (Musket Shot/Explosive Retreat/
    // Fire at Will/Arsenal Expansion/BlunderBlast) — the old "Corruption" and "Demon"
    // perks enhanced the removed River Styx and 1000 Blades mechanics. Left blank until redesigned.
    perks: [],
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
    // Light was reworked into a car-mode/acceleration kit (Light Lance/Blink/Prism Ramp/
    // Light Trick/Speed 'O' Light) — the old "Flicker" perk enhanced the removed held-spear
    // grapple-on-release mechanic. Left blank until redesigned.
    perks: [],
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
        name: 'Exsanguinate',
        emoji: '🩸',
        color: 0xcc0022,
        description: 'Clot Armor shard bursts fire 8 shards instead of 5. Blood puddles created by all sources (passive, bleeding, shard hits) are 50% bigger, so every drain tick fills your blood bar faster.',
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
        description: 'Right-click fires 5 random cards in a shotgun spread (2s cooldown). Damage per card scales with the best poker hand formed: high card=1, pair=2, two pair=4, three of a kind=6, straight=8, flush=10, full house=14, four of a kind=20, straight flush=30, royal flush=40.',
        ingredients: ['electricity', 'slime', 'fate', 'sound'],
        tier: 'quad',
        elementId: 'fate',
      },
    ],
  },
  {
    // Sonic Boom rebuilt Quantum's old Wave Reducer click as a charge-zone whip.
    // Both are gone with the 2026-07-22 Molecular Cutter / Blade Dance revamp, so the
    // perk is blanked rather than reworked (matching the Rubber / Growth precedent).
    elementId: 'quantum',
    perks: [],
  },
  {
    // Uber-Gear was built on top of the old Bounce Back (Q) and Barrage (F) — both
    // replaced by Rubber Banding / Rubberage in the 2026-07-22 revamp, so the perk's
    // whole mechanic (jump rope, squish, stretch dodge, wall push) no longer applies.
    // Blanked rather than reworked, matching the precedent set by the Growth revamp
    // and the Light car-drift rework.
    elementId: 'rubber',
    perks: [],
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
