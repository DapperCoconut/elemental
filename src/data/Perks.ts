import { DIVINE_PERKS } from './DivinePerks';

export interface PerkDef {
  id: string;
  name: string;
  emoji: string;
  color: number;
  description: string;
  ingredients: readonly string[];
  /**
   * `divine` perks are forged in the Disgraced Laboratory from one abstract and
   * one normal element, paid for with a Divine Nucleus. They live in their own
   * table (DivinePerks.ts) but share this shape, so once forged they flow
   * through unlockPerk / the perk book / the element-select strip unchanged.
   */
  tier: 'triple' | 'quad' | 'penta' | 'abstract-triple' | 'divine' | 'element';
  elementId: string;
}

/**
 * Elements whose perks have had the per-element overhaul: five perks of their own (tier
 * `element`, no recipe — cheats only for now) and two equip slots instead of one. Everything
 * else keeps its Lab-forged perks and a single slot until its own turn comes.
 */
const TWO_SLOT_ELEMENTS = new Set(['fire']);

/** How many perks this element may equip at once. */
export function perkSlotsFor(elementId: string): number {
  return TWO_SLOT_ELEMENTS.has(elementId) ? 2 : 1;
}

/** Separator between the ids of a two-slot loadout, as saved and as sent to a fight. */
export const PERK_SEP = '+';

/** A saved/sent perk loadout broken back into its ids ('' and null are both "none"). */
export function splitPerkIds(joined: string | null | undefined): string[] {
  return joined ? joined.split(PERK_SEP).filter((id) => id.length > 0) : [];
}

/** Display name for a loadout string — "Blaze + Melt" for two, the name for one. */
export function perkLoadoutLabel(joined: string | null | undefined): string | null {
  const defs = splitPerkIds(joined).map((id) => getPerkById(id)).filter((p): p is PerkDef => !!p);
  if (defs.length === 0) return null;
  return defs.map((p) => p.name).join(' + ');
}

/** Emoji + name for a loadout string, for the strips that print both. */
export function perkLoadoutBadge(joined: string | null | undefined): string | null {
  const defs = splitPerkIds(joined).map((id) => getPerkById(id)).filter((p): p is PerkDef => !!p);
  if (defs.length === 0) return null;
  return defs.map((p) => `${p.emoji} ${p.name}`).join(' + ');
}

export interface ElementPerks {
  elementId: string;
  perks: PerkDef[];
}

export const ALL_PERKS: ElementPerks[] = [
  // ── Element perks (the per-element overhaul — cheats only for now) ──────
  // Fire's old perks (Alcohol from the Lab, Molten from the Disgraced Lab) were retired for
  // these. Saves that forged them keep the record; the ids simply no longer resolve.
  {
    elementId: 'fire',
    perks: [
      {
        id: 'fire-blaze',
        name: 'Blaze',
        emoji: '🔥',
        color: 0xff7722,
        description: 'Hold-click Flamethrower is gone. In return your fireballs fly 45% faster and hit 50% harder against anything already burning — and with Flameshredder (Click+) they set foes alight with molten fire instead of a normal burn. Equipped with Melt, you lose both clicks but every ability recharges twice as fast and hits 50% harder.',
        ingredients: [],
        tier: 'element',
        elementId: 'fire',
      },
      {
        id: 'fire-melt',
        name: 'Melt',
        emoji: '🫠',
        color: 0xff9933,
        description: 'The tap Fireball is gone — only the hold-click Flamethrower is left. It reaches 33% farther and leaves pools of flame where it lands, burning foes who walk through them. Equipped with Blaze, you lose both clicks but every ability recharges twice as fast and hits 50% harder.',
        ingredients: [],
        tier: 'element',
        elementId: 'fire',
      },
      {
        id: 'fire-ash',
        name: 'Ash',
        emoji: '🌫️',
        color: 0x998877,
        description: 'Pressure Bomb and Flame Charge (Q+ only) deal 25% more damage over 33% more range — but Pressure Bomb can now catch you in its blast, and Flame Charge burns you 25% harder. Cluster Bomb (R+) bomblets are bigger and stronger too, and they can hurt you as well.',
        ingredients: [],
        tier: 'element',
        elementId: 'fire',
      },
      {
        id: 'fire-radiate',
        name: 'Radiate',
        emoji: '♨️',
        color: 0xffaa44,
        description: 'You give off a constant aura of heat that burns every enemy near you for light damage over time. With Fire Mastery enabled the aura burns twice as hot.',
        ingredients: [],
        tier: 'element',
        elementId: 'fire',
      },
      {
        id: 'fire-alcohol',
        name: 'Alcohol',
        emoji: '🍺',
        color: 0xc97a3a,
        description: 'Flame Dash leaves a trail of booze instead of explosions. Standing in it gives you 20% damage resistance, but linger more than 2 seconds and your shots start to drift. Foes who wade in get the same drift. Catch the booze in a Pressure Bomb or Flame Nuke and it burns — then it scorches every enemy who steps in it.',
        ingredients: [],
        tier: 'element',
        elementId: 'fire',
      },
    ],
  },

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
        // id kept as 'plume' so previously-forged copies of this perk survive the rework.
        id: 'plume',
        name: 'String',
        emoji: '🧵',
        color: 0x6633aa,
        description: 'Snap Traps become Snap Stakes, which do nothing on their own and last twice as long. Every two stakes are joined by a tripline — an enemy crossing it takes 5 dmg, 10% Hopelessness and a 50% slow for 3s. With Tentacle upgraded you can drag stakes around, and the string follows.',
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
        // Automaton was written for Maze of Doom, then hung off the Workshop; both are gone. Now
        // the Nexus staffs itself when it powers back on after Self-Destruct blew it up.
        id: 'automaton',
        name: 'Automaton',
        emoji: '🤖',
        color: 0x8833cc,
        description: 'When your Nexus powers back on after Self-Destruct, 3 automatons march out of it and patrol for 20s, ramming for 12 (0.5s per automaton). They repair on your nexus — and they are yours to blow up with the next Self-Destruct.',
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
        // Rebuilt for the bacterium rework: the old Virus perk supercharged the removed
        // Infect ability, so it now supercharges the R infection that replaced it.
        id: 'virus',
        name: 'Virus',
        emoji: '🦠',
        color: 0x77dd33,
        description: 'Your infection becomes a plague: it lasts 12s instead of 8s, hosts expel 5 floor viruses every 1.4s instead of 3 every 2s, and any floor virus that hits re-infects for 3s — so the outbreak keeps itself alive.',
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
    perks: [
      {
        // The old Adrenaline rode the removed abuse meter; the Cruncher's hit/miss
        // streak is the closest thing the reworked kit has to one.
        id: 'adrenaline',
        name: 'Adrenaline',
        emoji: '💉',
        color: 0x44ccaa,
        description: 'Every Cruncher hit spikes your adrenaline: +10% move speed for 5s, stacking to +50%. At 5 stacks you are WIRED — Cruncher cooldown is halved on top of its own stacks. A miss burns a stack.',
        ingredients: ['electricity', 'sound', 'light'],
        tier: 'abstract-triple',
        elementId: 'technology',
      },
    ],
  },
  {
    elementId: 'gunpowder',
    perks: [
      {
        // Corruption used to rot the River Styx; it now rots the arsenal itself.
        id: 'corruption',
        name: 'Corruption',
        emoji: '☠️',
        color: 0x668822,
        description: 'Your powder is corrupted. Musket balls leave rot on hit — 3 dmg/s for 5s, stacking to 3 — and every dropped hot musket festers, poisoning any enemy that walks over it while it cools.',
        ingredients: ['slime', 'fate', 'sound'],
        tier: 'abstract-triple',
        elementId: 'gunpowder',
      },
      {
        // The 1000 Blades demon is gone; the demon now loads the guns instead.
        id: 'demon',
        name: 'Demon',
        emoji: '😈',
        color: 0xcc2200,
        description: 'A demon rises behind you when you Fire at Will and echoes the whole volley 0.6s later — hellfire rounds at 60% damage that home in on their target. Below 35% HP it fires a third volley for free.',
        ingredients: ['fate', 'sound', 'light'],
        tier: 'abstract-triple',
        elementId: 'gunpowder',
      },
    ],
  },
  {
    // Acid's pool field is already a conductor looking for a reason to be one; electricity
    // supplies the current and fate decides which way it jumps.
    elementId: 'slime',
    perks: [
      {
        id: 'electrolysis',
        name: 'Electrolysis',
        emoji: '⚡',
        color: 0xaaff44,
        description: 'Your acid is an electrolyte. Every 1.4s a current arcs between two of your pools sitting within 220px of each other — 12 damage and a hard jolt to anything the line crosses. One arc in five surges: triple damage, and it jumps on to a third pool.',
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
        // Torture predates the fog-stealth remaster; Ritual is the ceremony it belongs to now.
        id: 'torture',
        name: 'Torture',
        emoji: '⛓️',
        color: 0x881122,
        description: 'Ritual stops killing quickly. A struck victim is racked instead: 4 dmg/s for 6s, and every tick adds 1s to their Silence. Ritual the same victim again while racked and the rack tightens — +2 dmg/s per stack, up to 3.',
        ingredients: ['electricity', 'slime', 'sound'],
        tier: 'abstract-triple',
        elementId: 'silence',
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
        description: 'Every 8th beat in a row you play on the metronome also lobs a brass resonator at your baton. It flies out, sits a beat, then goes off for 20 damage in a wide blast. Each one that connects grants +15% move and attack speed for 20s, stacking to four. One resonator every 3 seconds.',
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
        // Flicker used to flick the old held spear; on the car kit it flickers the Blink.
        id: 'flicker',
        name: 'Flicker',
        emoji: '🕯️',
        color: 0xfff4a8,
        description: 'Blink holds a 3rd charge and recharges in 3s instead of 5s. Each Blink leaves an afterimage of you at the old spot that flares 0.4s later, dealing 12 damage to anything beside it.',
        ingredients: ['slime', 'fate', 'light'],
        tier: 'abstract-triple',
        elementId: 'light',
      },
    ],
  },

  // ── Quad perks (Lab Level 3, 5 nuclei) ───────────────────────────────────
  {
    elementId: 'crystal',
    perks: [
      {
        id: 'gateway',
        name: 'Gateway',
        emoji: '🌀',
        color: 0xaaeeff,
        // "Mirrors" and "Barrage" are pre-rework names: the lattice is Place Crystal's lances
        // and the projectile is the Diamond Shard.
        description: "Your crystal lances become Gateways: 50% taller and wider, and shards pass straight through them — gaining speed and damage — instead of bouncing off. Moving Crystals still applies.",
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
        description: "Trail marks last 2s longer. Standing on your own trail builds Rage at 10/sec. At 100 Rage the beast is dragged out early, whatever its clock says — and while that beast is out you take 50% less damage.",
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
        description: 'Your Steel Spike is an iron sword. A sword Repulse launches deals double damage (60) to everything it runs through, and when it hits a wall it shatters into 5 shards of scrap instead of 3.',
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
    // Sonic Boom was a charge-zone whip on the old Wave Reducer click. The whip is gone,
    // but the dagger recall is the same "everything snaps back at once" beat, so the
    // boom now rides the recall.
    elementId: 'subterfuge',
    perks: [
      {
        id: 'sonic-boom',
        name: 'Sonic Boom',
        emoji: '💥',
        color: 0xcc2233,
        description: 'Recalled daggers break the sound barrier. Every dagger that makes it home detonates a shockwave where it launched from — 10 damage in a wide ring, a hard shove and a stagger. A dagger that connects on the way back booms on the victim instead.',
        ingredients: ['electricity', 'slime', 'sound', 'light'],
        tier: 'quad',
        elementId: 'subterfuge',
      },
    ],
  },
  {
    // Uber-Gear's jump rope / squish / stretch dodge were built on abilities that no longer
    // exist. Its identity — rubber that keeps getting rubberier the more you use it — is
    // rebuilt as an elasticity meter feeding every ability in the reworked kit.
    elementId: 'rubber',
    perks: [
      {
        id: 'uber-gear',
        name: 'Uber-Gear',
        emoji: '🪀',
        color: 0xff5577,
        description: 'Every rubber hit — punch, sling, or ball — winds you up +4% elasticity, up to +60%, decaying only when you go 5s without landing one. Elasticity boosts punch damage, sling launch speed and Rubberage ball damage alike, and Rubberage itself runs 50% longer with balls that never lose speed.',
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
  return DIVINE_PERKS.find((p) => p.id === id);
}

/**
 * Every perk an element can equip, divine perks included — they are forged in
 * the Disgraced Lab rather than the Lab, but once unlocked they sit in the same
 * one-perk-per-element slot as everything else, so every consumer (the select
 * screens' perk strip, ArenaScene's hasPerk) has to see them here.
 */
export function getPerksForElement(elementId: string): PerkDef[] {
  const base = ALL_PERKS.find((e) => e.elementId === elementId)?.perks ?? [];
  const divine = DIVINE_PERKS.filter((p) => p.elementId === elementId);
  return divine.length > 0 ? [...base, ...divine] : base;
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
