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
  /** Slots this enhancement may not be bound to — the MenuScene loadout refuses them as drop targets. */
  excludeSlots?: MasterySlot[];
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
        howTo: 'Heal HP — standing in your own shadow pools (and Q+ Void Singularity) both count',
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
        id: 'shared-suffering',
        name: 'Shared Suffering',
        description: 'Passive: for every 30 damage you take, 5% Hopelessness spreads to every enemy.',
      },
      {
        id: 'shadow-beacon',
        name: 'Shadow Beacon',
        bindable: true,
        hudDescription: 'Mortar you walk over to shell a marked spot',
        description: 'Drop a shadow mortar at your feet and a purple targeting dot at your cursor. Every time you walk onto the mortar it launches an explosive at the dot for 20 damage and 10% Hopelessness. Both expire after 20s. 35 second cooldown.',
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
  soul: {
    elementId: 'soul',
    name: 'Soul Mastery',
    enhancedEmoji: '💀',
    enhancedColor: 0x7744aa,
    requirements: [
      {
        key: 'amalgamsSummoned',
        label: 'Necromancer',
        howTo: 'Raise amalgams with Arise (E)',
        target: 200,
      },
      {
        key: 'amalgamHealed',
        label: 'Shepherd',
        howTo: 'Heal your amalgams by recalling them with Death Whistle (F)',
        target: 200,
      },
      {
        key: 'amalgamDamage',
        label: 'Swarm Lord',
        howTo: 'Deal damage with your amalgams',
        target: 1000,
      },
      {
        key: 'tormentBurns',
        label: 'Tormentor',
        howTo: 'Set amalgams ablaze with Hell\'s Torment (Q)',
        target: 25,
      },
    ],
    enhancements: [
      {
        id: 'strength-in-numbers',
        name: 'Strength in Numbers',
        description: 'Passive: your amalgams are linked by faint grey threads. Every other amalgam on the field grants each of them 5% damage resistance, up to a 75% cap — a big enough horde is nearly unkillable.',
      },
      {
        id: 'grave-mistake',
        name: 'Grave Mistake',
        bindable: true,
        hudDescription: 'Awaken a hostile Alpha; slay it to claim Soul Screech',
        description: 'Destroy your nearest grave to awaken the Alpha Amalgam — a huge 200 HP horror that turns on you, biting for 20 and blasting cones of green bullets that anti-heal you for 5s (no ally healing while it lasts). Your zombies and shots can bring it down; kill it and it rises to fight for you, and this ability transforms into Soul Screech: a 25-damage scream that heals nearby allies for half the HP you\'re missing this round, spilling the excess into weak HP. 12 second cooldown.',
      },
    ],
  },
  sand: {
    elementId: 'sand',
    name: 'Time Mastery',
    enhancedEmoji: '⏱️',
    enhancedColor: 0x6688cc,
    requirements: [
      {
        key: 'perfectReloads',
        label: 'Quickdraw',
        howTo: 'Nail the perfect-reload window (needs the Click+ reload upgrade)',
        target: 50,
      },
      {
        key: 'lassos',
        label: 'Wrangler',
        howTo: 'Catch enemies with your Lasso (E)',
        target: 40,
      },
      {
        key: 'remainAbsorbed',
        label: 'Immovable',
        howTo: 'Absorb damage with Remain (R)',
        target: 500,
      },
      {
        key: 'rifleHits',
        label: 'Sharpshooter',
        howTo: 'Land rifle shots during Always Noon (Q)',
        target: 10,
      },
    ],
    enhancements: [
      {
        id: 'passive-manipulation',
        name: 'Passive Manipulation',
        description: 'Passive: you are always in either Rush or Focus. Rush speeds the whole world up 50% — everyone moves and every projectile flies faster; Focus slows it all to half speed. Dash (Space) to flip between them, with a 5 second cooldown on switching.',
      },
      {
        id: 'fan-the-hammer',
        name: 'Fan the Hammer',
        bindable: true,
        hudDescription: 'Empty the magazine into mines; re-cast to detonate',
        description: 'Fire your whole magazine at once, one bullet every 0.2s, slowing you 50% as you do. The bullets travel a short way then halt, aging up in damage where they sit — enemies that touch them eat the stored damage. Re-cast to detonate every bullet in its own AoE. Halted bullets have a 5% chance each second to leak a time puddle. 10 second cooldown.',
      },
    ],
  },
  fate: {
    elementId: 'fate',
    name: 'Fate Mastery',
    enhancedEmoji: '🔮',
    enhancedColor: 0x6b2fa8,
    requirements: [
      {
        key: 'cardsDrawn',
        label: 'Fortune Teller',
        howTo: 'Draw cards — every card that enters your hand counts, so a Reroll (E) is worth a whole hand at once',
        target: 250,
      },
      {
        key: 'coinBounces',
        label: 'Ricochet',
        howTo: 'Bounce your own shots off a Coin card',
        target: 50,
      },
      {
        key: 'allInHits',
        label: 'High Roller',
        howTo: 'Land All In (Q) on an enemy instead of eating the wager yourself',
        target: 5,
      },
      {
        key: 'bigCardHits',
        label: 'Big Hand',
        howTo: 'Deal 50 damage with a single card',
        target: 3,
      },
    ],
    enhancements: [
      {
        id: 'cycle',
        name: 'Cycle',
        description: 'Passive: right-click a card in your hand to bin it. Every third card you bin, the deck immediately deals you 2 fresh ones — so a hand full of dead draws can be churned straight back into something playable.',
      },
      {
        id: 'tarot-of-fate',
        name: 'Tarot of Fate',
        bindable: true,
        hudDescription: 'Greatly enchant the hovered card — 4x power, one curse',
        description: 'The card your mouse is hovering becomes GREATLY ENCHANTED: 4x a normal card, overruling (and never stacking with) a plain Enchant. It also picks up a curse, shown as a small emoji on the bottom line of the card, which fires the moment you play it. Painful 🩹 deals you 30. Immolating 🔥 burns every other card out of your hand. Weakening 🦠 slows you 33% for 10s. Confusing 🌀 inverts your WASD for 5s. Vulnerable 🦴 makes the next hit you take double. Cursed 💀 rains 15 purple bullets at you from the sides of the arena for 3 each. Stunning ⭐ locks you out of playing cards for 5s. Cocky 😈 makes All In wager your entire health bar for the rest of the match. Purging ✨ strips enchant, great enchant and preserve off your whole hand and puts Tarot, Preserve and Enchant on 20s cooldowns. 20 second cooldown.',
      },
    ],
  },
  magnet: {
    elementId: 'magnet',
    name: 'Magnet Mastery',
    enhancedEmoji: '🧲',
    enhancedColor: 0x7733aa,
    requirements: [
      {
        key: 'rodSmashes',
        label: 'Rod Wrecker',
        howTo: 'Smash your magnetic rods into enemies',
        target: 500,
      },
      {
        key: 'nailTears',
        label: 'Nail Puller',
        howTo: 'Tear implanted nails back out of enemies by recalling them (E)',
        target: 75,
      },
      {
        key: 'protectBlocks',
        label: 'Deflector Shield',
        howTo: 'Block enemy projectiles with your Protect (R) orbs',
        target: 50,
      },
      {
        key: 'atomSmashes',
        label: 'Compactor',
        howTo: 'Crush enemies with the Atom Smasher (Q) compaction',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'metal-detector',
        name: 'Metal Detector',
        description: 'Passive: two ancient rods lie hidden under the arena with no visible marker — land a mag-pulse (click) on one to unearth it. An exposed ancient rod smashes like any other, and if your Atom Smasher (Q) sweeps over it, it powers up: every 3 seconds it fires a 5-damage laser at any enemy that is magnetized or carrying your nails. Both can be powered up at once.',
      },
      {
        id: 'mag-lev',
        name: 'Mag-Lev',
        bindable: true,
        hudDescription: 'Hop on a magnetic board — bash and sling into enemies',
        description: 'Hop onto a magnetic skateboard, gaining 50 shield HP. While riding you bash enemies you touch and can click to sling yourself across the arena into them. Lose the 50 shield HP, or re-cast, and you dismount — dismounting drops all of your shield HP. 6 second cooldown to re-mount.',
      },
    ],
  },
  growth: {
    elementId: 'growth',
    name: 'Growth Mastery',
    enhancedEmoji: '🦠',
    enhancedColor: 0x66aa33,
    requirements: [
      {
        key: 'sporeBlocks',
        label: 'Living Wall',
        howTo: 'Block enemy projectiles with your Spore Spray (F) walls',
        target: 50,
      },
      {
        key: 'upgrades',
        label: 'Ever-Evolving',
        howTo: 'Buy Evolve-tree tiers — every purchase counts, across all your matches',
        target: 200,
      },
      {
        key: 'finalUpgrades',
        label: 'Apex Organism',
        howTo: 'Unlock each of the three Ultimate evolutions at least once (one per match)',
        target: 3,
        isBest: true,
      },
      {
        key: 'auxClones',
        label: 'Hive Mind',
        howTo: 'Summon auxiliary clones with Auxiliary Growth (Q)',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'secret-upgrades',
        name: 'Secret Upgrades',
        description: 'Passive: every time you load in, two random Secret Upgrades are unlocked in your Evolve menu. They cost 8 DNA, have a single tier, and cannot be sold. The pool: Brood (click launches two bacteria), Ruler (keep 2 clones, SPACE cycles), Viral Consumption (healthy viruses grant +20% speed and damage for 3s), Mitosis (20% chance DNA pays out double), Crawling Spores (spores crawl at the enemy and jostle past each other), Pandemic (floor viruses also infect for 3s), R Specialized (-25% size, +25% speed), K Specialized (+30% size, +50 max HP and HP), and Apex (Tier 3 upgrades cost 1 less DNA, Ultimates 2 less).',
      },
      {
        id: 'syringe-shot',
        name: 'Syringe Shot',
        bindable: true,
        excludeSlots: ['e'],
        hudDescription: 'Fast syringe that inflicts Sickness — no damage of its own',
        description: 'Fire a small, very fast syringe straight ahead. It deals no damage; instead it inflicts Sickness for 10s, ticking 2 damage a second. Equipping it opens a second Evolve tree you can cycle to on the upgrade screen — Lethality, Transmission and Severity — that stacks damage, spread and debuffs onto that one Sickness effect. 8 second cooldown. Cannot be bound over E.',
      },
    ],
  },
  slime: {
    elementId: 'slime',
    name: 'Acid Mastery',
    enhancedEmoji: '☣️',
    enhancedColor: 0x1b3d10,
    requirements: [
      {
        key: 'acidCoverageTotal',
        label: 'Acid Flood',
        howTo: 'Cover the screen in acid — every pool adds up across all your matches (500% total)',
        target: 5,
      },
      {
        key: 'acidCoverageBestPct',
        label: 'Total Saturation',
        howTo: 'Cover 80% of the screen in acid at once in a single match',
        target: 80,
        isBest: true,
      },
      {
        key: 'melts',
        label: 'Meltdown',
        howTo: 'Finish enemies off with acid — pools, rain, and footprints all count',
        target: 20,
      },
      {
        key: 'burrowAttacks',
        label: 'Ambush Predator',
        howTo: 'Hit enemies by surfacing next to them with Snake Burrow (needs the R+ Rattling Strike upgrade)',
        target: 50,
      },
    ],
    enhancements: [
      {
        id: 'acid-walker',
        name: 'Acid Walker',
        description: 'Passive: after stepping through acid, you leave burning acid footprints for 5 seconds as you walk onto clean ground. Each print lasts ~3s and eats anyone standing on it like an acid puddle. Footprints laid within 3s of surfacing from Snake Burrow are larger, darker, and hurt more.',
      },
      {
        id: 'breakdown',
        name: 'Breakdown',
        bindable: true,
        hudDescription: 'Root yourself and spray 200 acid lashes in every direction',
        description: 'Only castable while the screen is at least half covered in acid. You root in place for 3 seconds and spray 200 acid lashes out in every direction, leaking acid particles that pool up beneath you the whole time. 12 second cooldown.',
      },
    ],
  },
  metal: {
    elementId: 'metal',
    name: 'Metal Mastery',
    enhancedEmoji: '🗡️',
    enhancedColor: 0x8b0000,
    requirements: [
      {
        key: 'flailHits',
        label: 'Flail Master',
        howTo: 'Smack enemies with a swinging flail',
        target: 150,
      },
      {
        key: 'transfusionHealed',
        label: 'Blood Doctor',
        howTo: 'Heal HP by draining your blood bar with Blood Transfusion (R)',
        target: 500,
      },
      {
        key: 'parries',
        label: 'Duelist',
        howTo: 'Parry enemy projectiles with a Max-Charge Mighty Sabre (Click+)',
        target: 25,
      },
      {
        key: 'bloodBladeKills',
        label: 'Forbidden Reaper',
        howTo: 'Land the killing blow on enemies with the Blood Blade (Q+)',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'natural-clot',
        name: 'Natural Clot',
        description: 'Passive: all damage you take is reduced by 3. Chip hits and weak damage-over-time bounce off you entirely.',
      },
      {
        id: 'steel-shield',
        name: 'Steel Shield',
        bindable: true,
        hudDescription: 'Plant a shield that blocks shots and cuts damage 25%',
        description: 'Spends 25% of your blood bar (needs at least that much) to plant a shield in front of you for 5 seconds. It blocks enemy projectiles outright and reduces all damage you take by 25% while it stands. Cast it while Clot Armor (Q) is active and the shield turns red — every projectile it blocks then sprays a full burst of blood shards. 8 second cooldown.',
      },
    ],
  },
  magic: {
    elementId: 'magic',
    name: 'Magic Mastery',
    enhancedEmoji: '🧘',
    enhancedColor: 0xddaa00,
    requirements: [
      {
        key: 'meditateHealed',
        label: 'Inner Peace',
        howTo: 'Heal HP with Meditate (F) orbs',
        target: 200,
      },
      {
        key: 'grimoireAllSpellsUsed',
        label: 'Grimoire Adept',
        howTo: 'Cast every Grimoire (E) spell at least 10 times each',
        target: 10,
        isBest: true,
      },
      {
        key: 'darkEnergyGained',
        label: 'Soul Harvester',
        howTo: 'Generate dark energy by casting dark-mode Grimoire, Necronomicon, or Wild Anchor spells',
        target: 500,
      },
      {
        key: 'necroAllSpellsUsed',
        label: 'Apocalypse Scholar',
        howTo: 'Cast every Necronomicon (Q) ultimate spell at least once each',
        target: 1,
        isBest: true,
      },
    ],
    enhancements: [
      {
        id: 'levitate',
        name: 'Levitate',
        description: 'Passive: immune to damage and slows from anything that hasn\'t moved in the last 3 seconds — puddles, clouds, traps, and other stationary hazards can\'t touch you. Anything that moves (projectiles, dashes, drags, orbiting effects) still hits you as normal.',
      },
      {
        id: 'transmogrify',
        name: 'Transmogrify',
        bindable: true,
        hudDescription: 'Slow projectile that turns the enemy into a chicken',
        description: 'Launch a slow white projectile forward. On hit, the target turns into a chicken for 8 seconds: they wander randomly and cannot cast any abilities, though their attack speed is doubled for the duration. 12 second cooldown.',
      },
    ],
  },
  creation: {
    elementId: 'creation',
    name: 'Creation Mastery',
    enhancedEmoji: '🎆',
    enhancedColor: 0xff3399,
    requirements: [
      {
        key: 'daggerStabs',
        label: 'Thousand Cuts',
        howTo: 'Stab entities with Dagger Spray daggers — a fully charged throw lands up to 5 at once',
        target: 1000,
      },
      {
        key: 'nexusCrafts',
        label: 'Master Brewer',
        howTo: 'Brew potions by loading two charged bolts into the Nexus',
        target: 100,
      },
      {
        key: 'wallsBuilt',
        label: 'Contractor',
        howTo: 'Build walls, kill blocks, or speed pads',
        target: 200,
      },
      {
        key: 'workshopKills',
        label: 'Home Advantage',
        howTo: 'Kill entities while your Workshop (Q) is up',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'springboard',
        name: 'Springboard',
        description: 'Passive: every dash leaves a small speed pad where you land. Standing on it gives the usual +25% speed for 3s; the pad fades after 10 seconds.',
      },
      {
        id: 'mortar-command',
        name: 'Mortar Command',
        bindable: true,
        excludeSlots: ['e'],
        hudDescription: 'Nexus fires its potions at the cursor — inverted effects',
        description: 'Only usable while a potion of yours is sitting on the Nexus. The Nexus launches every one of your potions at the cursor, landing as a large blast for 20 damage that inflicts the INVERSE of each potion\'s effect — Buff becomes -25% damage dealt, Protection becomes +25% damage taken, Heal becomes 3 HP lost per second, Speed becomes half speed, Reload becomes 25% slower cooldowns. The Gold Potion is the exception: it lands unchanged, doubling every effect the target gains — good or bad. Cannot be bound to E, and in Build Mode the slot keeps its normal build ability. 14 second cooldown.',
      },
    ],
  },
  rubber: {
    elementId: 'rubber',
    name: 'Rubber Mastery',
    enhancedEmoji: '🛞',
    enhancedColor: 0x992233,
    requirements: [
      {
        key: 'bazookaHits',
        label: 'Haymaker',
        howTo: 'Punch entities with the Rubber Bazooka fist (needs the Click+ upgrade)',
        target: 100,
      },
      {
        key: 'reflects',
        label: 'Backboard',
        howTo: 'Reflect enemy projectiles with Bounce Form (R)',
        target: 250,
      },
      {
        key: 'bounceCombos',
        label: 'Trick Shot',
        howTo: 'Bounce a reeled-in anchor off yourself with a Bounce Combo (needs the R+ upgrade)',
        target: 10,
      },
      {
        key: 'rubberageKills',
        label: 'Ball Pit',
        howTo: 'Land the killing blow on entities with Rubberage (Q) balls',
        target: 3,
      },
    ],
    enhancements: [
      {
        id: 'vulcanization',
        name: 'Vulcanization',
        description: 'Passive: every 5 damage you take cures 1% more Vulcanization, up to 100%. Vulcanized rubber charges its punch faster, slings faster and off more walls, holds Bounce Form longer, whips its anchor around harder, spins Rubberage up quicker, and shortens every cooldown. The curve is slow at first and brutal at the top — barely there at 20%, dangerous by 60%. At 75% you run hot: your sling becomes a fireball that hits 50% harder, reflected bullets deal 1.5x and set fires, Rubberage balls hit for 2 more, charged punches ignite, and your anchor pulses a 15-damage fire blast every 3 seconds. Everything it burns catches fire.',
      },
      {
        id: 'atom-nhilego',
        name: 'Atom-Nhilego',
        bindable: true,
        hudDescription: 'Blast zones you must stand inside to keep the chain alive',
        description: 'A pulsing collapse zone opens somewhere in the arena and detonates 3 seconds later for 25 damage to every enemy inside it. If YOU are standing in it when it goes off, the chain continues: the next zone opens 10% larger, and so on for as long as you keep chasing them down. The first zone you fail to reach ends the run and you are healed 10 HP for every zone you did make. 20 second cooldown.',
      },
    ],
  },
  technology: {
    elementId: 'technology',
    name: 'Technology Mastery',
    enhancedEmoji: '🌐',
    enhancedColor: 0x2288cc,
    requirements: [
      {
        key: 'cruncherStreak',
        label: 'Flawless Streak',
        howTo: 'Hit 25 Addicting Cruncher (Click) shots in a row without a single miss — one qualifying streak completes this permanently',
        target: 25,
        isBest: true,
      },
      {
        key: 'cordHits',
        label: 'Bandwidth Hog',
        howTo: 'Box entities by hitting them with your Upload (R) cord',
        target: 50,
      },
      {
        key: 'adminBans',
        label: 'Banhammer',
        howTo: 'Reach 50 points in the Admin Console (Q) to run the ban command',
        target: 1,
      },
      {
        key: 'webCoins',
        label: 'Coin Farmer',
        howTo: 'Collect coins inside the Surf the web! (F+) browser',
        target: 500,
      },
    ],
    enhancements: [
      {
        id: 'vpn',
        name: 'VPN',
        description: 'Passive: your connection tunnels through a private route — the longer you keep moving, the faster you get, ramping smoothly to +50% movement speed over 5 seconds. A binary datastream trails behind you, growing longer, brighter and wider as the boost climbs. The moment you stop moving the tunnel drops: the whole boost is gone and you start again from zero.',
      },
      {
        id: 'byte-bomb',
        name: 'Byte-Bomb',
        bindable: true,
        hudDescription: 'Timed packet charge that Lags everything in the blast',
        description: 'Lob an explosive packet to your cursor with an 8 second fuse counting down on its shell. Click the bomb to burn half a second off the timer — click it fast to detonate on your terms. It bursts for 10 damage in a wide area, and everything caught in the blast gets Lag for 10 seconds: they rubber-band back to where they stood a second ago, freeze solid for a second at a time under a spinning loading circle, and their ability cooldowns stop ticking for 3–4 seconds at a stretch. 15 second cooldown.',
      },
    ],
  },
  gunpowder: {
    elementId: 'gunpowder',
    name: 'Gunpowder Mastery',
    enhancedEmoji: '🔫',
    enhancedColor: 0x8a8a8a,
    requirements: [
      {
        key: 'musketHits',
        label: 'Dead Eye',
        howTo: 'Land Musket Shot (Click) balls on entities',
        target: 50,
      },
      {
        key: 'weaponTypes',
        label: 'Gun Collector',
        howTo: 'Take every one of the 13 weapon types at least once from Arsenal Expansion (F) — the 7 exotics need the F+ upgrade to be offered',
        target: 13,
        isBest: true,
      },
      {
        key: 'bulletsVacuumed',
        label: 'Hoover',
        howTo: 'Swallow enemy projectiles with the BlunderBlast (Q) cone',
        target: 200,
      },
      {
        key: 'fullArsenals',
        label: 'Fully Loaded',
        howTo: 'Fill your arsenal all the way to 6 weapons (needs the R+ upgrade)',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'quickdraw',
        name: 'Quickdraw',
        description: 'Passive: you fire back on reflex. Every 30 damage you take — it does not have to arrive in one hit, the count carries over — a holdout pistol snaps a hitscan laser at the closest enemy for 10 damage.',
      },
      {
        id: 'overload',
        name: 'Overload',
        bindable: true,
        hudDescription: 'Every spent musket on the floor takes aim, then volleys',
        description: 'Every musket lying on the floor swivels around and takes aim for 2 seconds, then all of them fire a musket ball at once for 15 damage each. The volley slams them back to full heat with an extra 3 seconds on top before they cool enough to pick back up — and they come out so scalding that walking over one burns you for 20 damage (at most once a second per musket). 16 second cooldown.',
      },
    ],
  },
  light: {
    elementId: 'light',
    name: 'Light Mastery',
    enhancedEmoji: '☀️',
    enhancedColor: 0xff8800,
    requirements: [
      {
        key: 'trickHits',
        label: 'Showboat',
        howTo: 'Hit entities with a sick trick — the Light Trick (F) burst',
        target: 100,
      },
      {
        key: 'drillHits',
        label: 'Driller',
        howTo: 'Skewer entities with a Prism Drill (hold R and drive your lance onto your own ramp)',
        target: 50,
      },
      {
        key: 'rampRides',
        label: 'Stunt Course',
        howTo: 'Drive over your own Prism Ramps (R)',
        target: 150,
      },
      {
        key: 'speedOLightKills',
        label: 'Hit and Run',
        howTo: "Land the killing blow with a Speed 'O' Light (Q) streak",
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'unstoppable',
        name: 'Unstoppable',
        description: 'Passive: your lance bites into the corner — hard turns bleed off far less acceleration, so you keep your speed through the whole course. You also cannot be stunned, frozen, rooted or slowed by anything: every slowing effect applied to you is ignored outright.',
      },
      {
        id: 'killer-kebab',
        name: 'Killer Kebab',
        bindable: true,
        hudDescription: 'Enhance your lance — stabbed enemies ride it until you hit a wall',
        description: 'Enhance your lance for 5 seconds. Anything you stab during that window is skewered onto it instead of taking the hit: they are dragged along wherever you drive, disarmed the whole time, and you can carry up to 3 at once. Ram a wall to rip them off for heavy damage — the more acceleration you have banked, the worse it is for them — and you take no wall damage at all while anything is on the lance. Riders that survive slide free on their own after 12 seconds. 20 second cooldown.',
      },
    ],
  },
  echo: {
    elementId: 'echo',
    name: 'Echo Mastery',
    enhancedEmoji: '🌸',
    enhancedColor: 0x7f6fd0,
    requirements: [
      {
        key: 'echolocationHits',
        label: 'Sonar Sniper',
        howTo: 'Hit entities with your bouncing Echolocation (Click)',
        target: 100,
      },
      {
        key: 'correctGuesses',
        label: 'Sixth Sense',
        howTo: 'Land a Guess (E) on an entity instead of missing it',
        target: 50,
      },
      {
        key: 'hypersenseDodges',
        label: 'Untouchable',
        howTo: 'Auto-dodge incoming attacks during Hypersense (needs the Q+ upgrade)',
        target: 25,
      },
      {
        key: 'lanternHealed',
        label: 'Warm Glow',
        howTo: 'Heal HP by keeping your Lantern (R) lit (needs the R+ upgrade)',
        target: 100,
      },
    ],
    enhancements: [
      {
        id: 'vibration-detection',
        name: 'Vibration Detection',
        description: 'Passive: you feel the floor. Whenever an enemy moves or casts an ability, a short ring segment flares around you pointing at the quadrant the disturbance came from — a cast flares brighter and wider than a footstep. It never tells you the distance, only roughly which way to look.',
      },
      {
        id: 'echo-bloom',
        name: 'Echo Bloom',
        bindable: true,
        hudDescription: 'Tap to plant a bloom, hold to see through its eye',
        description: 'Tap to launch an echo seed. It plants a bloom on the first wall or enemy it touches, and you may keep 3 at once — they never wilt, but planting a fourth replaces the oldest. Aim the cast directly at an enemy instead and a red terror bloom sprouts straight out of them for 15 seconds, cutting their damage by 25%. Hold the key to see through a bloom: a small pool of light around it, click to spit a bullet at your cursor (5 damage, 10 from a terror bloom, and shooting yourself gives +25 shield HP), right-click to hop to the next bloom, and Space to teleport to it — the bloom is spent, but you glow with bioluminescence for 8 seconds and your own light is 25% wider. Looking through a terror bloom instead paints every trail the enemy has walked. Entering the view grants 100 shield HP; lose it and you are thrown out instantly, and leaving strips whatever is left. 12 second cooldown.',
      },
    ],
  },
  // Subterfuge keeps the legacy element id 'quantum'.
  quantum: {
    elementId: 'quantum',
    name: 'Subterfuge Mastery',
    enhancedEmoji: '🚬',
    enhancedColor: 0x6b0f1a,
    requirements: [
      {
        key: 'bulletsFired',
        label: 'Trigger Discipline',
        howTo: 'Fire bullets out of your Spray (E) — every round out of the barrel counts',
        target: 500,
      },
      {
        key: 'recruitBestLevel',
        label: 'Made Man',
        howTo: 'Raise one recruit all the way to level V (needs the F+ Hardened Criminals upgrade)',
        target: 5,
        isBest: true,
      },
      {
        key: 'moneySpent',
        label: 'Cash Flow',
        howTo: 'Spend money — reloads, recruits, bribes and retainer recasts all count',
        target: 50,
      },
      {
        key: 'stolenElements',
        label: 'Industrial Espionage',
        howTo: 'Steal the ultimate of 10 different elements with Dark Treachery (Q)',
        target: 10,
        isBest: true,
      },
    ],
    enhancements: [
      {
        id: 'big-pockets',
        name: 'Big Pockets',
        description: 'Passive: you can hold 4 money at a time instead of 3, so a full wallet buys a Specialist and still leaves change.',
      },
      {
        id: 'smoke-break',
        name: 'Smoke Break',
        bindable: true,
        hudDescription: 'Light up for 25% less damage — press again to throw it as a smoke cloud',
        description: 'Light a cigarette: you take 25% less damage for as long as it is lit. It burns for 25 seconds, but every hit you take burns a second off it. Press the key again while it is still in your mouth and you flick it at your cursor, where it bursts into a smoke cloud for 8 seconds. Standing in the cloud makes you invisible — attacking someone gives you away and exposes you for 3 seconds — and your recruits inside it lose loyalty at less than half the usual rate. The cloud blinds the enemy and only the enemy: on their screen it is a solid wall of smoke, on yours it is a thin haze. 20 second cooldown, counted from lighting up.',
      },
    ],
  },
  plasma: {
    elementId: 'plasma',
    name: 'Plasma Mastery',
    enhancedEmoji: '⚛️',
    enhancedColor: 0xff2f8f,
    requirements: [
      {
        key: 'arenaCrumbles',
        label: 'Ground Gives Way',
        howTo: 'Catch an enemy in an Unstable Arena (E) explosion — watch the floor crumble under their feet',
        target: 10,
      },
      {
        key: 'voltRelays',
        label: 'Relay Race',
        howTo: 'Shock enemies through Volt Point relays (hold R past 2.5s — needs the R+ Volt Points upgrade)',
        target: 100,
      },
      {
        key: 'pureChaosKills',
        label: 'Eye of the Storm',
        howTo: 'Kill enemies while Pure CHAOS! (Q) is still wrapped around you',
        target: 5,
      },
      {
        key: 'chaosBladeKills',
        label: 'Cut to Ribbons',
        howTo: 'Land the killing blow with a Chaos Blade (F)',
        target: 3,
      },
    ],
    enhancements: [
      {
        id: 'chaos-storm',
        name: 'Chaos Storm',
        description: 'Passive: the arena itself is unstable. From the first second of the match the walls creep inward, and after 120 seconds all that is left is a small square in the middle. The live edge crackles with plasma — step onto or past it and a bolt comes down on you for 5 damage, once a second, until you get back inside. It does not care whose mastery it is: you and the enemy are both being herded.',
      },
      {
        id: 'unstable-orbital',
        name: 'Unstable Orbital',
        bindable: true,
        hudDescription: 'Orbit a plasma nucleus — it closes in for 50 unless you keep dealing damage',
        description: 'Summon a pulsating plasma orbital that swings around you the way an electron swings around an atom, on a tilted, precessing ring. It creeps inward the whole time, and if it ever reaches you it detonates on you for 50 damage. Every point of damage you deal shoves it back out — enough pressure keeps it at arm\'s length, but it will never sit further out than the ring it started on. Anything else it sweeps through takes 20 damage. 20 second cooldown, counted from the summon.',
      },
    ],
  },
  hunt: {
    elementId: 'hunt',
    name: 'Hunt Mastery',
    enhancedEmoji: '👹',
    enhancedColor: 0x7a4a1e,
    requirements: [
      {
        key: 'normalKills',
        label: 'Tracker',
        howTo: 'Kill entities while in normal (human) form',
        target: 100,
      },
      {
        key: 'beastKills',
        label: 'Apex Predator',
        howTo: 'Kill entities while transformed into the beast (Q)',
        target: 50,
      },
      {
        key: 'hybridKills',
        label: 'Best of Both',
        howTo: 'Kill entities while in Hybrid form (needs the Q+ upgrade — double-tap Q on transform)',
        target: 50,
      },
      {
        key: 'grenadeHits',
        label: 'Frag Out',
        howTo: 'Catch entities in your grenade explosions',
        target: 50,
      },
    ],
    enhancements: [
      {
        id: 'weak-points',
        name: 'Weak Points',
        description: 'Passive: you read the seams in anything you are hunting. A red weak-point wedge sweeps slowly around every enemy, and shotgun pellets that punch into it deal double damage — so does Beast form\'s Slash when you come at the enemy from that side.',
      },
      {
        id: 'beastling',
        name: 'Beastling',
        bindable: true,
        excludeSlots: ['q'],
        hudDescription: 'Summon a beastling pup for 15s — it bites, fetches your grenades, and roars',
        description: 'Whistle up a beastling — a small, eager pup that trots after you and goes for whoever is closest. It bites for 5 every 2 seconds, double against anything bleeding, and it runs faster over a Hunter\'s Trail. Throw a grenade and it will fetch it: the fuse stops dead in its mouth while it sprints the thing to the enemy and sets it off on them. Blood Hunt makes it roar too, for a 20% slow over 5 seconds that stacks with your own. Under a Blood Moon it grows, speeds up, hits harder, and its bites draw blood. Lasts 15 seconds, 30 second cooldown.',
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
