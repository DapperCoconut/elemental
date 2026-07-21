import * as PlayerData from './PlayerData';

export interface MasteryRequirement {
  key: string;
  label: string;
  howTo: string;
  target: number;
  /** true = stat is a "best single instance" value (recordMasteryBest), false = cumulative counter (addMasteryStat) */
  isBest?: boolean;
}

/** Ability slots a mastery ability can be bound to. Click is deliberately excluded. */
export type MasterySlot = 'e' | 'r' | 'f' | 'q';
export const MASTERY_SLOTS: MasterySlot[] = ['e', 'r', 'f', 'q'];

export interface MasteryEnhancement {
  /** Stable id — used as the ability id when this enhancement is bound to a slot. */
  id: string;
  name: string;
  description: string;
  /** True for active abilities the player binds over one of their E/R/F/Q abilities. Passives omit it. */
  bindable?: boolean;
  /** Short blurb for the in-arena ability card (falls back to `description`). */
  hudDescription?: string;
}

export interface MasteryDef {
  elementId: string;
  name: string;
  enhancedEmoji: string;
  enhancedColor: number;
  requirements: MasteryRequirement[];
  enhancements: MasteryEnhancement[];
}

export const MASTERY_DEFS: Record<string, MasteryDef> = {
  fire: {
    elementId: 'fire',
    name: 'Fire Mastery',
    enhancedEmoji: '🌋',
    enhancedColor: 0x991100,
    requirements: [
      {
        key: 'flameBodyKills',
        label: 'Flame Body Killer',
        howTo: 'Kill entities while Flame Body (F) is active',
        target: 50,
      },
      {
        key: 'burstBursts',
        label: 'Damage Burst',
        howTo: 'Deal 200 damage in a 3 second period',
        target: 20,
      },
      {
        key: 'nukeZombieBest',
        label: 'Nuclear Cleansing',
        howTo: 'Kill 10 enemies with one Flame Nuke blast — a single qualifying blast completes this permanently',
        target: 10,
        isBest: true,
      },
      {
        key: 'clickIgnites',
        label: 'Arsonist',
        howTo: 'Set entities on fire with the upgraded click',
        target: 200,
      },
    ],
    enhancements: [
      {
        id: 'burning-body',
        name: 'Burning Body',
        description: 'Passive: enemies touching you take burn damage over time, and all DOT effects on you are instantly removed.',
      },
      {
        id: 'heatwave',
        name: 'Heatwave',
        bindable: true,
        hudDescription: 'Piercing wave that Exposes every enemy it hits',
        description: 'Launch a yellow wave forward that pierces every enemy it touches. It deals no damage — instead each enemy hit becomes Exposed for 5s (☀️ icon), taking 1.5x damage from the next hit. Fire damage over time ignores Exposed entirely — burn and molten ticks are not amplified and will not use it up. If a hit sets an Exposed target on fire, they burn molten instead: 5 damage per second.',
      },
    ],
  },
  water: {
    elementId: 'water',
    name: 'Water Mastery',
    enhancedEmoji: '🌊',
    enhancedColor: 0x00337a,
    requirements: [
      {
        key: 'geyserBoosts',
        label: 'Pressure Rider',
        howTo: 'Step into your own Geyser (R) to pick up its speed boost',
        target: 100,
      },
      {
        key: 'daggerSplits',
        label: 'Laminar Surgeon',
        howTo: 'Split an enemy in two with a fully-charged Pressure Dagger (F)',
        target: 25,
      },
      {
        key: 'killSprees',
        label: 'Riptide',
        howTo: 'Kill 5 enemies within a 3 second window',
        target: 50,
      },
      {
        key: 'painRainKills',
        label: 'Downpour',
        howTo: 'Land the killing blow on enemies with Pain Rain (Q) drops',
        target: 25,
      },
    ],
    enhancements: [
      {
        id: 'slipstream',
        name: 'Slipstream',
        description: 'Passive: you move 25% faster while standing in any of your own water puddles — base Splash, the E+ tidal pool, and Q+ Squall Splashes all count.',
      },
      {
        id: 'siphon',
        name: 'Siphon',
        bindable: true,
        hudDescription: 'Cone that floods enemies with dehydration',
        description: 'Open a cone in front of you that lasts 3 seconds and tracks your aim. Every enemy caught inside dries out fast, gaining 10% dehydration per second for as long as they stay in it. Deals no damage on its own — it feeds the dehydration damage bonus on everything else you throw. 5 second cooldown.',
      },
    ],
  },
  air: {
    elementId: 'air',
    name: 'Air Mastery',
    enhancedEmoji: '🌪️',
    enhancedColor: 0x4a4a52,
    requirements: [
      {
        key: 'windTrapSnipes',
        label: 'Caged Quarry',
        howTo: 'Shoot enemies while they are ensnared in your Wind Trap (R)',
        target: 75,
      },
      {
        key: 'beamMultiHits',
        label: 'Through and Through',
        howTo: 'Hit 2 or more enemies with a single Charged Beam (Q)',
        target: 3,
      },
      {
        key: 'grappleDodges',
        label: 'Untouchable',
        howTo: 'Dodge incoming hits using the Grapple (F) dodge charge',
        target: 50,
      },
      {
        key: 'snipeStreaks',
        label: 'Deadeye',
        howTo: 'Land 5 Air Snipes in a row without missing — each completed streak counts once',
        target: 20,
      },
    ],
    enhancements: [
      {
        id: 'swift-as-the-wind',
        name: 'Swift as the Wind',
        description: 'Passive: every Air Snipe that connects grants +5% move speed and +5% dodge chance, stacking up to +50% of each. A single missed shot blows the whole stack away.',
      },
      {
        id: 'sweeping-tornado',
        name: 'Sweeping Tornado',
        bindable: true,
        hudDescription: 'Rolling tornado that drags enemies to the wall',
        description: 'Launch a tornado forward that sucks every enemy it passes into its centre and carries them along with it. It keeps hold of them until it reaches the edge of the arena, where it bursts and releases everything it caught. Deals no damage — it is pure displacement. 12 second cooldown.',
      },
    ],
  },
  oil: {
    elementId: 'oil',
    name: 'Oil Mastery',
    enhancedEmoji: '🚂',
    enhancedColor: 0x000000,
    requirements: [
      {
        key: 'puddleIgnites',
        label: 'Arsonist Rig',
        howTo: 'Set your own oil puddles alight — drone lasers, click-detonated barrels, and Coal Overload all count',
        target: 100,
      },
      {
        key: 'shieldBlocks',
        label: 'Point Defence',
        howTo: 'Shoot down enemy projectiles with a charged Shield Generator (F)',
        target: 200,
      },
      {
        key: 'coalOverloads',
        label: 'Stoke the Furnace',
        howTo: 'Collect all 5 coal in one Train Morph (Q) to trigger Coal Overload',
        target: 20,
      },
      {
        key: 'trainKills',
        label: 'Right of Way',
        howTo: 'Run enemies down with the train — head or any segment',
        target: 50,
      },
    ],
    enhancements: [
      {
        id: 'drone-array',
        name: 'Drone Array',
        description: 'Passive: every drone currently orbiting you grants 10% damage resistance. At the 6-drone cap that is 60% off everything that hits you — and it drops the instant a drone is spent, launched, or eaten by a Train Morph.',
      },
      {
        id: 'turret',
        name: 'Turret',
        bindable: true,
        hudDescription: 'Sacrifice 3 drones for a mountable laser turret',
        description: 'Sacrifice 3 drones to bolt a turret down at your cursor. It has 75 health, soaks enemy projectiles that reach it, and lasts 10 seconds or until it is destroyed. Recast while standing next to it to mount up: while mounted you are locked in place and can hold click to rapid-fire 2 damage laser beams. Recast again to jump off. Unusable without 3 drones to spend. 20 second cooldown.',
      },
    ],
  },
  life: {
    elementId: 'life',
    name: 'Life Mastery',
    enhancedEmoji: '🌼',
    enhancedColor: 0xddbb22,
    requirements: [
      {
        key: 'fertilized',
        label: 'Master Gardener',
        howTo: 'Fertilize plants with Fertilize (R) — every plant caught in the ring counts',
        target: 150,
      },
      {
        key: 'selfHealed',
        label: 'Vitality',
        howTo: 'Heal yourself for 300 HP — Nurse Lilies and Cycle of Life both count',
        target: 300,
      },
      {
        key: 'plantDamage',
        label: 'Attack Garden',
        howTo: 'Have your plants deal 300 damage — Sunflower shots, Rose thorns, and Nightcap poison all count',
        target: 300,
      },
      {
        key: 'thriveRedirect',
        label: 'Shared Burden',
        howTo: 'Redirect 300 damage into your plants with Thrive! (Q)',
        target: 300,
      },
    ],
    enhancements: [
      {
        id: 'thorn-thrash',
        name: 'Thorn Thrash',
        description: 'Passive: hitting one of your plants with your click petals makes it launch a barrage of 5 thorns (5 damage each) in random directions. Each plant can thrash once every 3 seconds.',
      },
      {
        id: 'reap',
        name: 'Reap',
        bindable: true,
        hudDescription: 'Destroy a plant to steal a 20s buff from it',
        description: 'Destroy the plant under your cursor (nearest otherwise) and absorb its essence for 20 seconds. Sunflower: +2 petal shotgun damage. Rose: enemies take 5 damage for every 20 damage you take. Nurse Lily: heal 10% of the damage you deal. Nightcap: poison puddles bloom around you every second. Pitcher: your petals slow enemies 15% for 2 seconds. Cotton: +25% move speed. 15 second cooldown.',
      },
    ],
  },
  earth: {
    elementId: 'earth',
    name: 'Earth Mastery',
    enhancedEmoji: '🌍',
    enhancedColor: 0x8a8a8a,
    requirements: [
      {
        key: 'bashStuns',
        label: 'Rock Solid',
        howTo: 'Stun enemies with a fully-charged Bash',
        target: 100,
      },
      {
        key: 'shieldBlocked',
        label: 'Bulwark',
        howTo: 'Block 1000 damage with your shields',
        target: 1000,
      },
      {
        key: 'quakeTrips',
        label: 'Tremor',
        howTo: 'Trip enemies with Quake (F)',
        target: 100,
      },
      {
        key: 'splinterKills',
        label: 'Shrapnel',
        howTo: 'Kill enemies with Shield Splinter',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'unbreakable',
        name: 'Unbreakable',
        description: 'Passive: you cannot be knocked back, dragged, or otherwise forcibly moved by any ability. You also cannot take more than 50 damage from a single hit — anything above that is reduced back down to 50.',
      },
      {
        id: 'dust-screen',
        name: 'Dust Screen',
        bindable: true,
        hudDescription: 'Cone of dust that blinds and confuses',
        description: 'Launch a cone of dust in front of you. Enemy players hit have their screen turned fuzzy and hard to see for 5s. Enemy bots hit fire wildly with no accuracy for 5s. Invasion husks hit wander randomly instead of pathfinding (ranged husks still fire erratically) for 5s.',
      },
    ],
  },
  shadow: {
    elementId: 'shadow',
    name: 'Shadow Mastery',
    enhancedEmoji: '👤',
    enhancedColor: 0x000000,
    requirements: [
      {
        key: 'healedHp',
        label: 'Umbral Vitality',
        howTo: 'Heal HP — Shadow Dance bursts and dark cloud healing both count',
        target: 500,
      },
      {
        key: 'consumed',
        label: 'Devourer',
        howTo: 'Drag an enemy in with the E+ Tentacle upgrade to trigger Consume',
        target: 35,
      },
      {
        key: 'trapped',
        label: 'Ensnared',
        howTo: 'Catch enemies in your Snap Trap (R)',
        target: 50,
      },
      {
        key: 'blackHoleKills',
        label: 'Event Horizon',
        howTo: 'Kill enemies while they are trapped inside your Black Hole (Q)',
        target: 25,
      },
    ],
    enhancements: [
      {
        id: 'dark-resonance',
        name: 'Dark Resonance',
        description: 'Passive: slowly generate darkness on your own — the same charge Shadow Dance spends to heal — even without standing in a dark cloud.',
      },
      {
        id: 'final-eclipse',
        name: 'Final Eclipse',
        bindable: true,
        hudDescription: 'Thick beam that burns darkness for constant damage',
        description: 'Unleash a thick beam that deals 2 damage every 0.1s and slowly rotates to track your cursor. Channeling burns 20% of your darkness bar every second, and the beam cuts out the instant darkness hits zero — a minimum-charge cast lasts about 1 second. Needs at least 20% darkness to start. 0 second cooldown: recast the instant you have darkness again.',
      },
    ],
  },
  ice: {
    elementId: 'ice',
    name: 'Ice Mastery',
    enhancedEmoji: '❄️',
    enhancedColor: 0x0c2f4d,
    requirements: [
      {
        key: 'frostBlast5StackHits',
        label: 'Absolute Zero',
        howTo: 'Hit enemies with Frost Blast (E) while they have 5 or more frost stacks',
        target: 100,
      },
      {
        key: 'blockUpDamageAvoided',
        label: 'Iron Chill',
        howTo: 'Avoid damage using Block Up (R) — the 25% reduction while active counts',
        target: 250,
      },
      {
        key: 'voidFrostDamage',
        label: 'Void Harvest',
        howTo: 'Deal damage with Void Frost — DOT ticks and Frost Blast detonations both count',
        target: 200,
      },
      {
        key: 'bigHits',
        label: 'Shatterpoint',
        howTo: 'Deal over 50 damage in a single hit',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'viral-frost',
        name: 'Viral Frost',
        description: 'Passive: when an enemy carrying frost or void frost stacks touches another enemy, that enemy catches 1 matching stack. Each enemy can only catch a spread stack once per second.',
      },
      {
        id: 'icicle-impale',
        name: 'Icicle Impale',
        bindable: true,
        hudDescription: 'Dash and impale — shatters into bonus frost after 50 damage',
        description: 'Dash forward a short distance. The first enemy you hit is impaled with a visible icicle. Once they take 50 more damage, the icicle shatters, slamming 2 bonus frost (or void frost) stacks onto them — this can push them past the normal 5-stack cap, up to a hard max of 7. More stacks means more slow and bonus damage taken for frost, more DOT damage for void. While impaled, every frost/void stack applied to them lasts 10 seconds instead of 8.',
      },
    ],
  },
  crystal: {
    elementId: 'crystal',
    name: 'Crystal Mastery',
    enhancedEmoji: '🔮',
    enhancedColor: 0x8833cc,
    requirements: [
      {
        key: 'doubleBounceHits',
        label: 'Ricochet Marksman',
        howTo: 'Hit enemies with a Diamond Shard that has already bounced off walls or crystals (any mix) at least twice',
        target: 50,
      },
      {
        key: 'portalTraversals',
        label: 'Frequent Flyer',
        howTo: 'Step through your own Crystal Portal (F) to teleport',
        target: 100,
      },
      {
        key: 'shardOverload',
        label: 'Overload',
        howTo: 'Have 25 of your own Diamond Shards active on screen at once',
        target: 10,
      },
      {
        key: 'movingMirrorBounces',
        label: 'Kinetic Deflection',
        howTo: 'Bounce a Diamond Shard off a moving crystal (E+ Moving Crystals)',
        target: 250,
      },
    ],
    enhancements: [
      {
        id: 'resonance',
        name: 'Resonance',
        description: 'Passive: getting hit by one of your own Diamond Shards grants you a 3x speed boost for 0.2 seconds.',
      },
      {
        id: 'crystal-shredder',
        name: 'Crystal Shredder',
        bindable: true,
        hudDescription: 'Spinning chakram with 12 shards that shred anything it touches',
        description: 'Launch a spinning chakram at your cursor with 12 shards poking out of it. Each shard that touches an enemy disappears and deals 2 damage. The chakram stops once it reaches your cursor. Recasting Atune (R) launches an idle chakram back out toward your current cursor. With Trick of the Light active, each clone also throws a mini chakram carrying 4 shards. 14 second cooldown.',
      },
    ],
  },
  electricity: {
    elementId: 'electricity',
    name: 'Electricity Mastery',
    enhancedEmoji: '🌩️',
    enhancedColor: 0x2244cc,
    requirements: [
      {
        key: 'dischargesAt100',
        label: 'Overload',
        howTo: 'Unleash Kinetic Discharge (R) while sitting at 100 kinetic power',
        target: 5,
      },
      {
        key: 'revives',
        label: 'Second Wind',
        howTo: 'Revive yourself with Restart (Q) — the Q+ auto-restart counts too',
        target: 10,
      },
      {
        key: 'selfDamageDealt',
        label: 'Self Destructive',
        howTo: 'Damage yourself by holding Pain Battery (F)',
        target: 500,
      },
      {
        key: 'dashHits',
        label: 'Human Bullet',
        howTo: 'Dash through enemies with Electro Dash (E)',
        target: 250,
      },
    ],
    enhancements: [
      {
        id: 'kinetic-shield',
        name: 'Kinetic Shield',
        description: 'Passive: gain damage resistance as your kinetic power rises. For every 3% of your kinetic power bar, gain +1% damage resistance, up to a max of 33% at a full charge.',
      },
      {
        id: 'kinetic-bomb',
        name: 'Kinetic Bomb',
        bindable: true,
        hudDescription: 'Sticky bomb that grows with damage dealt to its target',
        description: 'Launch a kinetic bomb forward. If it hits an enemy, it latches onto them for 10 seconds before detonating for 10 damage in a large area — for every 3 damage dealt to them while it was attached, the explosion gains +1 damage. 14 second cooldown.',
      },
    ],
  },
  gravity: {
    elementId: 'gravity',
    name: 'Gravity Mastery',
    enhancedEmoji: '🌙',
    enhancedColor: 0x3d1a66,
    requirements: [
      {
        key: 'meteorHits',
        label: 'Meteor Storm',
        howTo: 'Hit enemies with falling meteors — Meteor Shadow, Meteor Rain, and the F+ Meteor Rush all count',
        target: 500,
      },
      {
        key: 'tetherDamage',
        label: 'Anchored Prey',
        howTo: 'Damage enemies while they are tethered by your Gravity Anchor (R+ Space Slam)',
        target: 200,
      },
      {
        key: 'moonHits',
        label: 'Lunar Impact',
        howTo: 'Hit enemies with the colossal meteor from Lunar Landing (Q)',
        target: 20,
      },
      {
        key: 'moonRams',
        label: 'Moon Rider',
        howTo: 'Ram enemies while mounted on the moon (Q+ Moon Rider)',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'gravity-aura',
        name: 'Gravity Aura',
        description: 'Passive: incoming projectiles have a 20% chance to be caught in an aura around you instead of hitting you. Caught projectiles orbit you for 10 seconds — any other projectile that strikes an orbiting one destroys both. After 10 seconds an unspent orbiter fires back out at your cursor.',
      },
      {
        id: 'starfall',
        name: 'Starfall',
        bindable: true,
        hudDescription: 'Meteor shower that grounds everyone it hits',
        description: '20 small gravity orbs rain down from the top of the arena, falling fast toward the bottom. Each deals 10 damage on the way down and 15 on impact. Anyone hit is Grounded for 10 seconds — pinned to the arena floor, able to only walk left and right, occasionally hopping a little before gravity pulls them back down. 18 second cooldown.',
      },
    ],
  },
};

export function getMasteryDef(elementId: string): MasteryDef | undefined {
  return MASTERY_DEFS[elementId];
}

/** The mastery abilities for an element that the player can bind onto an ability slot. */
export function getBindableEnhancements(elementId: string): MasteryEnhancement[] {
  return (MASTERY_DEFS[elementId]?.enhancements ?? []).filter((e) => e.bindable);
}

export function getEnhancement(elementId: string, enhId: string): MasteryEnhancement | undefined {
  return MASTERY_DEFS[elementId]?.enhancements.find((e) => e.id === enhId);
}

export function isMasteryComplete(elementId: string): boolean {
  const def = MASTERY_DEFS[elementId];
  if (!def) return false;
  return def.requirements.every((r) => PlayerData.getMasteryStat(elementId, r.key) >= r.target);
}
