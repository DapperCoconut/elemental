export interface UpgradeDef {
  slot: string;         // "click" | "e" | "r" | "f" | "q"
  displayKey: string;   // "Click" | "E" | "R" | "F" | "Q"
  name: string;
  description: string;
  price: number;
}

export interface ElementUpgrades {
  elementId: string;
  upgrades: UpgradeDef[];
}

// Shard rewards indexed by difficulty level - 1 (Easy→Nightmare)
export const SHARD_REWARDS = [5, 10, 20, 35, 50] as const;

export const ALL_UPGRADES: ElementUpgrades[] = [
  {
    elementId: 'fire',
    upgrades: [
      {
        slot: 'click',
        displayKey: 'Click',
        name: 'Flameshredder',
        description: 'Flamethrower hits inflict burning DOT (1 dmg/0.5s × 3s)',
        price: 10,
      },
      {
        slot: 'e',
        displayKey: 'E',
        name: 'Propulsion',
        description: 'Flame Dash leaves a trail of small explosions',
        price: 20,
      },
      {
        slot: 'r',
        displayKey: 'R',
        name: 'Pressure Charge',
        description: 'Hold R to charge: 3s = 1.5× dmg + tremors, 6s = 2× dmg + enhanced tremors',
        price: 35,
      },
      {
        slot: 'f',
        displayKey: 'F',
        name: 'Flame Affinity',
        description: 'Hold F 1s for enhanced Flame Body: 2× self-dmg, 2× output',
        price: 50,
      },
      {
        slot: 'q',
        displayKey: 'Q',
        name: 'Armageddon',
        description: 'Move during nuke (20% speed), +20% range; +50% dmg if enemy is burning',
        price: 75,
      },
    ],
  },
  {
    elementId: 'water',
    upgrades: [
      {
        slot: 'click',
        displayKey: 'Click',
        name: 'Knockback',
        description: 'Water Cut hits push enemies away',
        price: 10,
      },
      {
        slot: 'e',
        displayKey: 'E',
        name: 'Tidal Pool',
        description: 'Final puddle is 1.5× larger and lasts 5s',
        price: 20,
      },
      {
        slot: 'r',
        displayKey: 'R',
        name: 'Permanent Geysers',
        description: 'Geysers last forever; max 2 placed',
        price: 35,
      },
      {
        slot: 'f',
        displayKey: 'F',
        name: 'Reflect Shield',
        description: 'Shield reflects blocked damage back to attacker',
        price: 50,
      },
      {
        slot: 'q',
        displayKey: 'Q',
        name: 'Monsoon',
        description: '5× drops, 3× duration; hold Q for ongoing rain',
        price: 75,
      },
    ],
  },
  {
    elementId: 'life',
    upgrades: [
      {
        slot: 'click',
        displayKey: 'Click',
        name: 'Petal Burst',
        description: '5 petals per shot at 5 damage each',
        price: 10,
      },
      {
        slot: 'e',
        displayKey: 'E',
        name: 'Verdant Growth',
        description: 'Plants have 2× HP and slowly follow your cursor (purple)',
        price: 20,
      },
      {
        slot: 'r',
        displayKey: 'R',
        name: 'Life Root',
        description: 'Hold R 3s: convert closest plant to a life plant that heals you 10 HP every 2s (max 1, 100 HP)',
        price: 35,
      },
      {
        slot: 'f',
        displayKey: 'F',
        name: 'Thorn Trap',
        description: 'Hold F 3s: convert closest plant to a thorn plant that auto-fires petals at the enemy (max 2, 50 HP)',
        price: 50,
      },
      {
        slot: 'q',
        displayKey: 'Q',
        name: 'Overgrowth',
        description: 'Hold Q 8s to destroy all plants — each fires 10 petals in a circle',
        price: 75,
      },
    ],
  },
  {
    elementId: 'air',
    upgrades: [
      {
        slot: 'click',
        displayKey: 'Click',
        name: 'Swift Aim',
        description: 'Air Snipe no longer roots you in place while charging',
        price: 10,
      },
      {
        slot: 'e',
        displayKey: 'E',
        name: 'Electro Charge',
        description: 'Hold E 1.5s: next Click fires an electrified shot (instant, 45 dmg). Missing deals 20 self-damage',
        price: 20,
      },
      {
        slot: 'r',
        displayKey: 'R',
        name: 'Tracking Vortex',
        description: 'Wind Trap follows your cursor while active',
        price: 35,
      },
      {
        slot: 'f',
        displayKey: 'F',
        name: 'Phantom Grapple',
        description: 'While mid-grapple: 50% transparent, 50% chance to dodge incoming hits',
        price: 50,
      },
      {
        slot: 'q',
        displayKey: 'Q',
        name: 'Ricochet Beam',
        description: 'Charged Beam bounces off up to 3 walls; you can move while charging',
        price: 75,
      },
    ],
  },
  {
    elementId: 'earth',
    upgrades: [
      {
        slot: 'click',
        displayKey: 'Click',
        name: 'Momentum Strike',
        description: 'Stab damage scales with your current movement speed',
        price: 10,
      },
      {
        slot: 'e',
        displayKey: 'E',
        name: 'Fortified Stride',
        description: '+1% movement speed per shield HP (lost with shield)',
        price: 20,
      },
      {
        slot: 'r',
        displayKey: 'R',
        name: 'Guided Ricochet',
        description: 'Shield Slam bounces aim toward your cursor',
        price: 35,
      },
      {
        slot: 'f',
        displayKey: 'F',
        name: 'Shield Shed',
        description: 'Hold F 2s: sacrifice all shield for +3% speed per shield HP (6s)',
        price: 50,
      },
      {
        slot: 'q',
        displayKey: 'Q',
        name: 'Seismic Impact',
        description: 'Wall hits during Bull Rush launch rock rain and boost DR to 45% (15 self-dmg)',
        price: 75,
      },
    ],
  },
  {
    elementId: 'oil',
    upgrades: [
      {
        slot: 'click',
        displayKey: 'Click',
        name: 'Laser Splitter',
        description: 'Firing drone command (if ≥2 drones) also launches one drone as a kamikaze to the cursor',
        price: 10,
      },
      {
        slot: 'e',
        displayKey: 'E',
        name: 'Melee Boost',
        description: 'Drones deal 5 melee damage when touching the enemy (1s per-drone cooldown)',
        price: 20,
      },
      {
        slot: 'r',
        displayKey: 'R',
        name: 'Oil Spill',
        description: 'Drone destruction leaves a 12s oil puddle (20% slow). Click move ignites it for fire tick damage (−50% lifespan)',
        price: 35,
      },
      {
        slot: 'f',
        displayKey: 'F',
        name: 'Firewall Boost',
        description: 'Drones passing through the firewall regain 1 shot (once per drone). Firewall has 2× HP',
        price: 50,
      },
      {
        slot: 'q',
        displayKey: 'Q',
        name: 'Overdrive Salvo',
        description: 'After Overdrive ends, each drone fires itself toward the cursor (10 dmg, 0.2s apart)',
        price: 75,
      },
    ],
  },
  {
    elementId: 'shadow',
    upgrades: [
      {
        slot: 'click', displayKey: 'Click', name: 'Cloud Confusion',
        description: 'Enemy in your cloud for 3s becomes confused for 3s (random movement, can still attack)',
        price: 10,
      },
      {
        slot: 'e', displayKey: 'E', name: 'Consume',
        description: 'Drag enemy onto yourself to consume them (3s: 2 dmg/s, immobile). Press E to throw to cursor.',
        price: 20,
      },
      {
        slot: 'r', displayKey: 'R', name: 'Trap Drag',
        description: 'Snap traps are 50% larger. Drag them with your tentacle.',
        price: 35,
      },
      {
        slot: 'f', displayKey: 'F', name: 'Phantom Step',
        description: 'Shadow Dance usable at any charge (heals 5–20). Full bar: 25% dodge for 8s. 2s cooldown.',
        price: 50,
      },
      {
        slot: 'q', displayKey: 'Q', name: 'Void Singularity',
        description: '25% dodge while charging Black Hole. Spawns a shadow cloud every 1.5s while active.',
        price: 75,
      },
    ],
  },
  {
    elementId: 'ice',
    upgrades: [
      {
        slot: 'click',
        displayKey: 'Click',
        name: 'Sharpshooter',
        description: '3 Ice Spikes in a row without missing: next shot is 20% larger and applies 2 frost stacks',
        price: 10,
      },
      {
        slot: 'e',
        displayKey: 'E',
        name: 'Frost Linger',
        description: 'Frost Blast keeps 1 frost stack on hit (2 stacks kept if enemy had 5 stacks)',
        price: 20,
      },
      {
        slot: 'r',
        displayKey: 'R',
        name: 'Black Ice Morph',
        description: 'Toggle: take 20% more damage, but frost becomes void frost (DOT instead of slow). Frost Blast also applies Voided (1–3 dmg/s for 5s). Skate leaves void frost trails.',
        price: 35,
      },
      {
        slot: 'f',
        displayKey: 'F',
        name: 'Skater\'s Rush',
        description: 'Stepping on your own Skate trail gives you 20% speed boost for 3s',
        price: 50,
      },
      {
        slot: 'q',
        displayKey: 'Q',
        name: 'Shatter Strike',
        description: 'While enemy is Frozen Solid, the next hit deals 25% more damage',
        price: 75,
      },
    ],
  },
  {
    elementId: 'growth',
    upgrades: [
      {
        slot: 'click',
        displayKey: 'Click',
        name: 'Spread Spore',
        description: '15% chance to also fire 3 bonus spores on any click, regardless of evolution',
        price: 10,
      },
      {
        slot: 'e',
        displayKey: 'E',
        name: 'Viral Evolution',
        description: 'Hold E to auto-pick a random mutation whenever Mutate comes off cooldown. Unlocks 9 advanced mutations in the pool',
        price: 20,
      },
      {
        slot: 'r',
        displayKey: 'R',
        name: 'Exploit',
        description: '+25% damage to already-infected targets with Infect',
        price: 35,
      },
      {
        slot: 'f',
        displayKey: 'F',
        name: 'Controlled Burst',
        description: 'Hold F to prevent Bloat from exploding on hit; release to detonate on the next hit',
        price: 50,
      },
      {
        slot: 'q',
        displayKey: 'Q',
        name: 'Evolve',
        description: 'Mutant Morph gains 2 new evolutions: Plague Bomb (homing AOE grenade) and Bacterium (summons a crawling ally)',
        price: 75,
      },
    ],
  },
  { elementId: 'crystal', upgrades: [] },
  { elementId: 'soul',    upgrades: [] },
  { elementId: 'hunt',    upgrades: [] },
  { elementId: 'sand',    upgrades: [] },
];

export function getElementUpgrades(elementId: string): UpgradeDef[] {
  return ALL_UPGRADES.find((e) => e.elementId === elementId)?.upgrades ?? [];
}

export function getUpgradeDef(elementId: string, slot: string): UpgradeDef | undefined {
  return getElementUpgrades(elementId).find((u) => u.slot === slot);
}

export function getUpgradePrice(elementId: string, slot: string): number {
  return getUpgradeDef(elementId, slot)?.price ?? 0;
}
