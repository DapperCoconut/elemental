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
        target: 20,
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
    enhancedEmoji: '🍃',
    enhancedColor: 0xccddff,
    requirements: [
      {
        key: 'spinRefundSeconds',
        label: 'Perfect Tempo',
        howTo: 'Take cooldown off your other abilities by landing Spin Dance (E) — counts the seconds actually refunded',
        target: 200,
      },
      {
        key: 'windDodges',
        label: 'Untouchable',
        howTo: 'Ride attacks out on your wind dodge',
        target: 50,
      },
      {
        key: 'glaiveReturns',
        label: 'Coming Home',
        howTo: 'Catch enemies with the Gale Glaive (R) on its way back to you',
        target: 25,
      },
      {
        key: 'tornadoKills',
        label: 'Eye of the Storm',
        howTo: 'Finish enemies off while they are circling inside your Wind Breaker (Q)',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'dancers-momentum',
        name: "Dancer's Momentum",
        description: 'Passive: every second on your feet is +5% move speed, stacking to +100%. Every hit that gets through knocks 10% back off it — the dance is only fast while nothing is touching you.',
      },
      {
        id: 'winds-of-change',
        name: 'Winds of Change',
        bindable: true,
        hudDescription: 'Petals reset every cooldown, +20% wind dodge',
        description: 'Blossom sweeps up around you: every ability comes off cooldown at once, Spin Dance refills all of its charges, and your wind dodge grows by a further 20 points on top of whatever you had already banked. 25 second cooldown.',
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
      {
        id: 'curling-stone',
        name: 'Curling Stone',
        bindable: true,
        hudDescription: 'Summon a stone — shoot it to send it sliding',
        description: 'Summon a curling stone in front of you for 20 seconds. Shooting the stone shoves it a short way and freezes another layer of frost onto it, up to 5 — the more frost it carries, the further and faster it slides and the harder it hits. Void frost counts exactly the same. It bounces off the arena walls, and any enemy it slams into takes 30 damage (60 at 5 stacks), once per second each. On one of your Skate trails the stone goes flying.',
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
        description: 'Passive: your amalgams are linked by faint grey threads. Every other amalgam on the field grants each of them 5% damage resistance — 10% each with all three slots filled with amalgams rather than with grave zombies you have not drained yet.',
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
        id: 'reputation-repair',
        name: 'Reputation Repair',
        description: 'Passive: a bad exchange does not get to stand. Take more than 75 damage inside two seconds and you are moved backwards in time three seconds automatically — your health and your position both revert to what they were, and the ground you are hauled back through comes up as time puddles. 20 second recovery, and it cannot be aimed or held: it fires on the ledger.',
      },
      {
        id: 'time-bomb',
        name: 'Time Bomb',
        bindable: true,
        hudDescription: 'Sticky bomb that ages into a bigger blast; time the ring for 1.5x',
        description: 'Lob a time bomb at the enemy. If it lands it straps itself to them and starts ageing — a 10 damage blast the moment it sticks, reddening all the way up to 50 damage after 30 seconds. Re-cast to arm it: a white ring closes in on the bomb over 1.4 seconds and it goes off on its own when the ring lands. Re-cast a third time just as the ring reaches the bomb and it detonates on the beat for 1.5x damage — go early and it just goes off for normal damage. 14 second cooldown, running from the throw, so a bomb left to ripen costs you nothing.',
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
        key: 'dupeCopies',
        label: 'Second Draft',
        howTo: 'Copy your own conjurations with Dupe (F)',
        target: 120,
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
        howTo: 'Generate dark energy by casting corrupted spells — E+ charges 25, Q+ charges 50',
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
        description: 'Only usable while a potion of yours is sitting on the Nexus. The Nexus launches every one of your potions at the cursor, landing as a large blast for 20 damage that inflicts the INVERSE of each potion\'s effect — Buff becomes -25% damage dealt, Protection becomes +25% damage taken, Heal becomes 3 HP lost per second, Speed becomes half speed, Reload becomes 25% slower cooldowns. The Gold Potion is the exception: it lands unchanged, doubling every effect the target gains — good or bad. Cannot be bound to E, and in Build Mode the slot keeps its normal build ability. Note that binding it over R gives up Wrench in your Plans — and with it the only way to wake the Nexus if you own R+. 14 second cooldown.',
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
        id: 'fireworks',
        name: 'Fireworks',
        description: 'Passive: scraping the edge of the arena plants a firework on the wall behind you. One second later it screams straight across the arena — an enemy it runs into takes 10 damage, and it bursts for another 10 damage in a wide area (the one it hit is spared the burst). If nothing gets in its way it goes off against the far wall instead. You can plant one every half second, and never two on the same patch of wall.',
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
  subterfuge: {
    elementId: 'subterfuge',
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
        howTo: 'Kill entities while in Hybrid form (needs the Q+ upgrade — press Q as a human)',
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
        description: 'Passive: you read the seams in anything you are hunting. A red weak-point wedge sweeps slowly around every enemy, and anything of yours that comes in through it deals double damage — a crossbow bolt, a shotgun cone, a claw, a pounce. It is about the angle you attack from, not the weapon.',
      },
      {
        id: 'beastling',
        name: 'Beastling',
        bindable: true,
        excludeSlots: ['q'],
        hudDescription: 'Summon a beastling pup for 15s — it bites, fetches your grenades, and roars',
        description: 'Whistle up a beastling — a small, eager pup that trots after you and goes for whoever is closest. It bites for 5 every 2 seconds, double against anything with one of your bolts still in it, and it runs faster over a Hunter\'s Trail. Throw a grenade and it will fetch it: the fuse stops dead in its mouth while it sprints the thing to the enemy and sets it off on them. Roar makes it roar too, for a 20% slow over 5 seconds that stacks with your own. Under a Blood Moon it grows, speeds up and hits harder. Lasts 15 seconds, 30 second cooldown.',
      },
    ],
  },
  silence: {
    elementId: 'silence',
    name: 'Silence Mastery',
    enhancedEmoji: '🪆',
    enhancedColor: 0x2b0a30,
    requirements: [
      {
        key: 'backstabs',
        label: 'From Behind',
        howTo: 'Stab entities from inside their rear arc (come at them from the side their eye is not looking)',
        target: 50,
      },
      {
        key: 'grabbers',
        label: 'It Grabs Now',
        howTo: 'Raise Grabbers — cast Ritual (R) on one of your own fully-matured watchers',
        target: 25,
      },
      {
        key: 'strikerKills',
        label: 'Night Terror',
        howTo: 'Kill entities while transformed into the Striker (needs the R+ Night Terror upgrade — ritual yourself at full terror)',
        target: 50,
      },
      {
        key: 'runCatches',
        label: 'No Way Out',
        howTo: 'Catch entities in the hallway with Run (Q) before they reach the door',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'weep',
        name: 'Weep',
        description: 'Passive: you only exist while you are looked at. Whenever every enemy is facing away from you, you move 50% faster and your stealth drains 25% slower — the moment one of them turns their eye on you, you drop back to a normal walk. It also keeps a TERROR bar for you even without the Night Terror upgrade, so Puppetmaster always has something to spend.',
      },
      {
        id: 'puppetmaster',
        name: 'Puppetmaster',
        bindable: true,
        excludeSlots: ['r'],
        hudDescription: 'Spend 25 terror on a voodoo doll of the enemy — ritual the doll to awaken and possess them',
        description: 'Within 5 seconds of a stab landing, spend 25 terror to stitch a voodoo doll of the enemy and plant it in the ground. Every knife you put into the doll — Stab, Striker slashes, anything you shoot at it — is relayed straight into the opponent with a 25% bonus, and they cannot touch the thing themselves. It breaks after 50 damage has gone through it.\n\nCast Ritual (R) on the doll and it survives; the enemy awakens instead. Their eyes go white, their body cracks open, and something with black eyes and four spider-legged tentacles climbs out wearing them. You steer that instead of your own body: Click slashes for 15, E bites for 10 and heals you 12, R cannibalizes their own muck for 20 and heals you 20, F slams the ground and drags up awakened-kin that crawl over and stab them for 10 apiece. Bite a kin to eat it and heal 12; ritual a kin and it becomes a corrupted copy of the enemy — black, eyeless, grinning — that fights on your side for 20 seconds, though you gain no stealth at all while one is out. Q hands the body back and costs them 20 on the way out. 12 second cooldown.',
      },
    ],
  },
  illusion: {
    elementId: 'illusion',
    name: 'Illusion Mastery',
    enhancedEmoji: '🃏',
    enhancedColor: 0x5a189a,
    requirements: [
      {
        key: 'veilDeflects',
        label: 'Bent Light',
        howTo: 'Deflect enemy projectiles with your Illusion Veil (E) — a pane kicks each shot that crosses it 30° off',
        target: 100,
      },
      {
        key: 'danceBladeHits',
        label: 'Knife Show',
        howTo: 'Hit entities with Blade Dance daggers — the fan a clean Dance hop throws (needs the Q+ upgrade)',
        target: 25,
      },
      {
        key: 'teleports',
        label: 'Never There',
        howTo: 'Teleport — Relocate (R), a Dance hop, and, once mastered, a Reality Shift gateway all count',
        target: 150,
      },
      {
        key: 'crackShotHits',
        label: 'Off The Wall',
        howTo: 'Land Crack Shot (Click) hits — the bullet in a body and the splinter its wall crack throws both count',
        target: 300,
      },
    ],
    enhancements: [
      {
        id: 'reality-shift',
        name: 'Reality Shift',
        description: 'Passive: four gateways stand in the middle of each of the four walls. Walk into one and you come out of a different one, chosen at random — no cast, no cooldown, no key. Only you can use them; to anyone else they are scenery. Step through one while Illusion Dance is running and you throw an extra round of knives on arrival, on top of whatever the Dance was already going to do.',
      },
      {
        id: 'masquerade',
        name: 'Masquerade',
        bindable: true,
        hudDescription: 'Wear a masquerade mask: +50% damage, invisible to them, until somebody clicks it off',
        description: 'Put on a masquerade mask. While it is on you deal 50% more damage, and the mask stays on until it is taken off you — there is no duration.\n\nThe opponent never sees it. It is not drawn on their screen, and the damage numbers over them do not go up either: a 20 still reads as a 20 while it takes 30. The only way to find out is to reach for your face — clicking directly on you takes the mask off. Guess wrong and reaching into an empty face costs them 15.\n\n14 second cooldown, counted from the moment you put it on.',
      },
    ],
  },
  // Sand answers to `dune` in code — `sand` is Time's element id.
  dune: {
    elementId: 'dune',
    name: 'Sand Mastery',
    enhancedEmoji: '🔷',
    enhancedColor: 0x9fe4dc,
    requirements: [
      {
        key: 'ruinsClaimed',
        label: 'Ruin Runner',
        howTo: 'Complete Sandstone Ruins (E) — climb the short course and take the golden orb off the end of it',
        target: 25,
      },
      {
        key: 'pyramidsClaimed',
        label: 'Tomb Raider',
        howTo: 'Complete Cursed Pyramid (R) — reach the golden pyramid at the top of the long course and wake it up',
        target: 10,
      },
      {
        key: 'fullPowerShots',
        label: 'Full Power',
        howTo: 'Land Sand Striker (Click) hits at the top of the curve — in the air, off a platform you built, for the full 45',
        target: 75,
      },
      {
        key: 'trailWins',
        label: 'Crowned',
        howTo: 'Win a Final Trail (Q) — reach your crown before the other runner reaches theirs',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'unsatiable',
        name: 'Unsatiable',
        description: 'Passive: the flintlock reloads faster the longer you stay off the floor. Every landing on a platform or a deck without touching the ground in between is another link in the chain, and each link takes 6% off the reload — ten of them halve two seconds down to 800ms, or the golden orb\'s second down to 400ms. Falling to the floor breaks the chain, and so does standing on it for five seconds. The chain is the point: a Sand player who parkours between shots outguns one who stands still, permanently.',
      },
      {
        id: 'tempered-temptation',
        name: 'Tempered Temptation',
        bindable: true,
        // The two course keys are the thing this ability exists to enhance; binding it over
        // either one would leave it with nothing to work on.
        excludeSlots: ['e', 'r'],
        hudDescription: 'Turn to glass for 16s: every course on the board goes cruel, your flintlock bursts, and a fall kills you',
        description: 'You temper. Your body goes to glass, and so does every course standing on the board — yours, theirs, all of it.\n\nA tempered course is a worse course. Flamethrowers open up across every gap between two pillars, burning for 13 a tick and cycling on and off on their own clock, so the only way past is to jump while they are down. Roughly half of the slabs become tempered glass that holds for two and a half seconds under your feet and then shatters out from under you — they come back four seconds later, and the grey starter block and the prize at the end never crumble. Every slab is a little narrower than it was.\n\nAnd while you are glass, a fall is not 20. It is the end of you.\n\nWhat you get for it: the flintlock fires a burst of three instead of one shot, each for half what the single would have hit for — five instead of three while the golden orb is on the barrel. And a Cursed Pyramid claimed while you are tempered leaves a mini idol behind, orbiting you with a 5-damage beam every 1.5 seconds, for the rest of the match.\n\nRe-cast to temper back down early. Casting Final Trail ends it too — that race clears the board, and it is not a course you built. 16 seconds, 34 second cooldown.',
      },
    ],
  },
  passion: {
    elementId: 'passion',
    name: 'Passion Mastery',
    enhancedEmoji: '💞',
    enhancedColor: 0xff2f7d,
    requirements: [
      {
        key: 'impressed',
        label: 'Head Turner',
        howTo: 'Impress entities — land three Loveshots (Click) on them back-to-back without missing (needs the Click+ Show-off upgrade)',
        target: 50,
      },
      {
        key: 'roseHits',
        label: 'Thorn Collector',
        howTo: 'Take hits with the rose in your teeth — every blow aimed at you while Manipulate (F) is held counts one',
        target: 100,
      },
      {
        key: 'poseCharms',
        label: 'Centre Of Attention',
        howTo: 'Seduce entities mid-pose — fill a love bar to the end while Exhibition (Q) is running',
        target: 5,
      },
      {
        key: 'makeoutCharms',
        label: 'Sealed With A Kiss',
        howTo: 'Charm entities with Make-out — Smooch (R) somebody already past 90% of their bar (needs the R+ Make-out upgrade)',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'attraction',
        name: 'Attraction',
        description: 'Passive: a wide ring of your own gravity, 260px across, hangs around you wherever you walk — a pink haze thick with drifting hearts standing in the air just outside its edge. Anything that steps inside it does not get to step back out. The moment an enemy crosses in they are caught, and from then on the boundary holds them: they can run at it, slide along it and fight you across it, but the distance between the two of you never opens past that ring again. Nothing that happens to them takes it off, and it moves with you, so retreating is only ever dragging them with you.',
      },
      {
        id: 'perfume',
        name: 'Perfume',
        bindable: true,
        hudDescription: 'A 6s cloud of perfume ahead of you — it loves anyone in it, and doses you while you stand in it',
        description: 'Spray a great blooming cloud of perfume in front of you. It hangs there for 6 seconds, about 110px across, and everybody who walks through it falls a little further for you: 12 love a second for as long as they are inside it, with no damage and no cast attached — the air is doing the work.\n\nStand in your own cloud and you are wearing it. Every second spent inside banks two seconds of the perfume effect, up to twelve, and while it is on you the scent comes with you: a 96px aura on your own body worth 10 love a second to anything close enough to smell it. So the cloud is worth casting on your own feet as often as on theirs — one is a trap, the other is a coat of the stuff you carry away with you.\n\n18 second cooldown.',
      },
    ],
  },
  magma: {
    elementId: 'magma',
    name: 'Magma Mastery',
    enhancedEmoji: '🪨',
    enhancedColor: 0x2a1f2b,
    requirements: [
      {
        key: 'bloatHits',
        label: 'Pressure Release',
        howTo: 'Catch entities in a popped Magma Bloat (R) — every body inside the burst counts one',
        target: 15,
      },
      {
        key: 'jetDistance',
        label: 'Rocket Sled',
        howTo: 'Travel 25,000px on Magma Jet (F) thrust — roughly 25 full-length burns',
        target: 25000,
      },
      {
        key: 'eruptions',
        label: 'Caldera',
        howTo: 'Take a Volcano (E) all the way to 100 and let the cone collapse',
        target: 50,
      },
      {
        key: 'hatches',
        label: 'Dragonwaker',
        howTo: 'Fill a Dragon Egg (Q) to 250 and hatch it',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'obsidian-coat',
        name: 'Obsidian Coat',
        description: 'Passive: a volcano of yours that has already gone critical will keep taking pressure instead of refusing it, banking every point past 100 as overfill — with or without the Supercritical upgrade. Stand inside the blast when that cone finally comes down and the glass it throws sets on you: black obsidian plates over your whole body for 15 seconds.\n\nHow good the coat is is decided entirely by how much overfill you forced in before it blew. A cone that barely crossed the line gives you a thin one — around 10% more damage dealt, 8% less taken, and one extra glob on your click. Beat 250 overfill into it first and the coat is armour: 45% more damage dealt, 30% less taken, and four extra globs on every Plume. Catching a second collapse refreshes the 15 seconds and keeps the better of the two coats.',
      },
      {
        id: 'magma-saw',
        name: 'Magma Saw',
        bindable: true,
        hudDescription: 'Hold to rev a molten chainsaw — 20 damage a second, hotter every second, and it explodes at 8',
        description: 'Hold the bound key to rev a chainsaw of molten rock, then let go to start cutting. The charge buys nothing but time: a tap runs the saw 2.5 seconds, a full 1.6-second rev runs it the full 8.\n\nThe saw sits out at arm\'s length and follows your cursor. It bites for 1 damage every 0.05s — about 20 a second — and the longer it runs the harder it bites: 40 a second after two seconds, 60 after four, 80 after six, and the blade goes from gold to white-hot to a furious red as it does. It also charges anything of yours it is held against, at 30 pressure a second.\n\nAt 8 seconds it is too hot to hold and detonates: 35 damage inside 150px to everyone including you, throwing you backwards and everybody else a long way further. Press the key again at any point to cut the motor and walk away from that — which is the whole decision the ability asks.\n\n14 second cooldown, from the moment the saw starts.',
      },
    ],
  },
  bind: {
    elementId: 'bind',
    name: 'Bind Mastery',
    enhancedEmoji: '👁️',
    enhancedColor: 0x8a3fe0,
    requirements: [
      {
        key: 'wardBlocks',
        label: 'Behind The Hexes',
        howTo: "Have the bound one block attacks for you — every hit Prophet's Protection (F) eats whole counts one",
        target: 25,
      },
      {
        key: 'cultistsAwakened',
        label: 'Hoods Off',
        howTo: 'Awaken cultists — every convert that throws back its hood when the sky opens counts one (needs the R+ Cult and Q+ Awakening upgrades)',
        target: 30,
      },
      {
        key: 'shardHits',
        label: 'Oblivion',
        howTo: 'Obliterate entities with Shards of Oblivion (E) — every body a shard of the barrage bursts on counts one',
        target: 100,
      },
      {
        key: 'unbindings',
        label: 'Unbound',
        howTo: 'Unbind your god with God of Treachery (Q)',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'vessel-of-the-broken-god',
        name: 'Vessel Of The Broken God',
        description: 'Passive: a knot of the patron\'s own cosmic dark hangs off your body with a small copy of its eye set into it — the same veil, the same gold lid, the same drifting purple iris. You are not asking any more; you are carrying a piece of it.\n\nThree things follow from wearing it. Shards of Oblivion (E) no longer comes only out of the sky: your own body throws 3 more of them at your cursor for 10 apiece, from where you are standing rather than from the hole in the ceiling. When God of Treachery (Q) opens the sky, the eye on you reddens and spikes with the one above it and you are Enraged for the full 15 seconds and the 5 seconds of wrath that always follow them — 35% more speed, 40% less damage taken, and every debuff on you scoured off four times a second for as long as it lasts, so the god cannot make the punishment stick.\n\nAnd the limb the god takes for that ultimate is no longer a hole in your tray. Whichever slot you give up comes back as Pathetic Stab: a short lunge at your cursor for 15 melee damage on a 1.8 second cooldown. It is not a replacement for what was taken. It is what a vessel is trusted with.',
      },
      {
        id: 'ritual-sacrifice',
        name: 'Ritual Sacrifice',
        bindable: true,
        // The whole point of the enhancement is buying patience *back* mid-fight, and both the
        // enrage and the Pathetic Stab clause of the passive hang off Q existing. Binding it there
        // would delete the ultimate, the enrage and the stab in one drop.
        excludeSlots: ['q'],
        hudDescription: 'Stab yourself for 25 to take 15 anger off the patron. No cooldown at all',
        description: 'Put the vessel\'s own dagger into your own chest. 25 damage to you, and 15 anger straight off the patron\'s bar.\n\nThere is no cooldown on it whatsoever — press it as many times in a row as you can afford. This is the only thing in the entire element that lowers the bar faster than its own 2 a second, which makes it the answer to every mistake the kit charges you for: an overheated beam is 20 anger and two stabs, a starved idol is 5 a second and one, and a ward that ate something enormous is however many you are willing to pay for.\n\nTwo refusals, both of them the point. It will not fire on a calm patron — there has to be anger there to spend. And it will not fire at 25 health or less: the god does not accept a sacrifice that finishes the job for it.',
      },
    ],
  },
  death: {
    elementId: 'death',
    name: 'Death Mastery',
    enhancedEmoji: '🕰️',
    enhancedColor: 0xb9902e,
    requirements: [
      {
        key: 'riposteCuts',
        label: 'Two Halves',
        howTo: 'Cut shots out of the air with Riposte (R) — every projectile the held blade splits counts one',
        target: 100,
      },
      {
        key: 'maxDisarms',
        label: 'Paid In Full',
        howTo: 'Land Disarm (E) on somebody carrying all three Styx stacks — the full three-second stun',
        target: 20,
      },
      {
        key: 'amputations',
        label: 'Nothing Grows Back',
        howTo: 'Take a limb off an entity with Amputate (F)',
        target: 25,
      },
      {
        key: 'dealsHonoured',
        label: 'Good Faith',
        howTo: 'Honour a Deal with Death (Q) — reach the end of the ten seconds under the toll',
        target: 3,
      },
    ],
    enhancements: [
      {
        id: 'inevitability',
        name: 'Inevitability',
        description: 'Passive: the moment 50 damage lands on you inside any two seconds, the reaper stops pretending to be a person. For 5 seconds you dodge a third of everything, regenerate 5 health a second, and move 25% faster. It does not stack with itself — a second burst refreshes the five seconds rather than doubling them — and the two seconds of damage that lit it are spent, so the next one has to be earned again. Everything else you are carrying stacks with it normally.',
      },
      {
        id: 'delay-the-inevitable',
        name: 'Delay The Inevitable',
        bindable: true,
        // Q is the only thing in the entire element that moves the clock *back*. Bound over it,
        // this ability would be eight seconds of pure cost with nothing left in the kit able to
        // give them back — and it would take the other defensive window with it.
        excludeSlots: ['q'],
        hudDescription: 'Put 8 seconds back on the clock, and spend them at half damage taken, +50% speed and a quarter dodge',
        description: 'Hold the hand of the clock back. Midnight moves 8 seconds further away — the only thing in the kit that ever makes the minute longer — and you spend those 8 seconds as something that cannot be finished off.\n\nWhile it runs: you take 50% less damage, move 50% faster, dodge 25% of everything, and regenerate 5 health a second. Space dodges carry three times as far, so the arena is one roll wide. The price on top of the clock is that your own cooldowns run 25% slower for the whole window — the delay is on everything, not only on them.\n\nThe katana never leaves the saya for it, so it is the one cast in the element that does not empty the sheath. 26 second cooldown.',
      },
    ],
  },
  chalk: {
    elementId: 'chalk',
    name: 'Chalk Mastery',
    enhancedEmoji: '🕷️',
    enhancedColor: 0x8a8fa0,
    requirements: [
      {
        key: 'blastDamage',
        label: 'Detonation Artist',
        howTo: 'Deal 300 damage with Chalk Ward (Click) and Explosive Chalk (E) — every white sheet, every link of a red line and every enclosure counts',
        target: 300,
      },
      {
        key: 'permaBlocks',
        label: 'The Blue Wall',
        howTo: 'Rub shots out of the air with the blue line — every projectile Perma-Block eats counts one (needs the R+ Perma-Block upgrade)',
        target: 50,
      },
      {
        key: 'shieldAbsorbed',
        label: 'Behind The Ring',
        howTo: 'Have a Chalk Shield (F) eat 200 damage for you — blocked shots, absorbed hits and bodies grinding on it all count',
        target: 200,
      },
      {
        key: 'burnDamage',
        label: 'Ground In',
        howTo: 'Deal 200 damage by burning entities standing on your chalk — Masterpiece orange and the blue line',
        target: 200,
      },
    ],
    enhancements: [
      {
        id: 'chalk-smudge',
        name: 'Chalk Smudge',
        description: 'Passive: your hand is not as clean as it looks. Every few metres of chalk you lay down leaves a smudge behind it — and a moment later the smudge grows six little legs and walks off the line to go and find whoever you were drawing at.\n\nWhat a smudge is depends entirely on what it was smudged off. White ones bite for 8 and are gone. Red ones do not bite at all: they burst for 15 in a 46px circle. Blue ones are rare, because the blue line is only half a second long — but a blue smudge never dies. It bites for 8 every 1.4 seconds and then goes looking for the next one, for the rest of the match.\n\nSmudges shed from a Chalk Shield window are a different animal: long chalk bars on legs that patrol around you and eat shots out of the air. With Supreme Shield you can smudge them in any of the three sticks — red bars block *and* burst, and blue bars are permanent walls that never run out of blocks.\n\nAnd during a Masterpiece the palette decides what crawls off it. Green smudges do not attack at all — they follow you instead, healing 5 a second inside 74px, and fade after 8 seconds. Orange ones bite for 15 and set fire. Teal ones are 2.6× faster. Crimson ones are less than half speed and hit for 25.\n\nOne smudge per 9 marks of chalk (one per 22 for the blue line), 24 on the floor at once.',
      },
      {
        id: 'living-chalk',
        name: 'Living Chalk',
        bindable: true,
        hudDescription: 'A circle in front of you to draw in for 3s — whatever you draw stands up and hunts. Shapes decide what it is',
        description: 'A small circle opens on the floor in front of you, and for three seconds your cursor may draw inside it and nowhere else. A moment after your hand comes off the board, the drawing stands up on legs and goes looking for somebody.\n\nIt starts at 35 health, 15 damage a bite, and it is *made of what you drew*. The shapes in it are the build:\n\n• Triangles — +10 damage each.\n• Circles — +34 speed each.\n• Squares — +20 health each.\n\nThey do not have to be neat. A closed loop is read for how round it is and which of its corner counts is strongest, so a wonky three-sided scribble is a triangle and a wobbly ring is a circle. Draw several and they all count.\n\nThe stick matters as much as the shape. The window starts in green, and the three keys you did not bind this over swap you into Explosive Chalk (more damage — up to +60% if the whole thing is red), Perma-Chalk (up to double health) or Chalk Shield (up to 45 points of shield on it that soak shots before its health does).\n\nOnly one of yours may be alive at a time; casting again rubs out the last one. It lives 30 seconds or until something kills it. 21 second cooldown.',
      },
    ],
  },
  depths: {
    elementId: 'depths',
    name: 'Depths Mastery',
    enhancedEmoji: '🐙',
    enhancedColor: 0x6e3f8f,
    requirements: [
      {
        key: 'rareFishCaught',
        label: 'Deep Water',
        howTo: 'Land a catch off the rare table — give a fish up to the hook with a held F and reel the next one in (needs the F+ Deep Fishing upgrade)',
        target: 25,
      },
      {
        key: 'algaeHealed',
        label: 'Eutrophic',
        howTo: 'Heal 250 health off your own bloom — orbs you walk into, and everything the catfish strips off the floor for you',
        target: 250,
      },
      {
        key: 'drownDamage',
        label: 'No Air Left',
        howTo: 'Let the water finish the job — damage dealt by an empty oxygen bar after a Lungfish Strike',
        target: 200,
      },
      {
        key: 'badAlgaeFeeds',
        label: 'Eat Your Greens',
        howTo: 'Drive the Megalodon over a poisoned orb with somebody in its mouth (needs the R+ Algae Trap and Q+ Command the Depths upgrades)',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'camo-fade',
        name: 'Camo Fade',
        description: 'Passive: the standing-still fade was only ever half of it. Go six seconds without anything landing on you and the water takes you whether you are moving or not — body gone, health bar gone, and every bubble, bite arc and splash this element makes goes with it. There is nothing left on the screen at all, and a bot has nothing to aim at: it stops fighting and wanders, exactly as it does against a stealthed Silence.\n\nOne hit worth more than 5 damage puts the whole six seconds back to zero. Chip damage does not — a piranha chewing at 3 a second will never strip it, which is what makes the counterplay "land something real" rather than "touch them".\n\nIt changes two other things while it holds. An algae orb you walk over while invisible still heals you, but it does not go: it turns poisoned and stays on the floor behind you as the thing they walk into next, and it refuses to feed you again for four seconds so you are not standing in your own trap. And the line reaches two fish that do not exist for anybody who can be seen — the lionfish on the common table, and the skele-fish on the baited one.',
      },
      {
        id: 'release-the-kraken',
        name: 'Release the Kraken',
        bindable: true,
        // The Angler is the fish economy, and the fish economy is what regrows the kraken's
        // arms — binding this over F would delete the ability's own upkeep, and the mastery's
        // two new catches along with it.
        excludeSlots: ['f'],
        hudDescription: 'A beak with three arms at the cursor. Each takes a body for 2s; feed it a fish to grow them back',
        description: 'Something comes up through the floor where you pointed: a mantle with two lamp eyes and, underneath it, a hooked black beak with a ring of teeth behind it. Three arms lie curled around it.\n\nAnything that comes within 132px of the beak is taken by an arm and held for 2 seconds — cannot move, cannot act. An arm will not take a body another arm already has, so the hold is never longer than two seconds at once; but when one lets go the next may take its turn, so all three in sequence is 6 seconds of somebody standing still.\n\nAn arm that has had its turn is a stump. Throw any fish into the beak — aim the throw at the kraken instead of at them — and every stump grows back, which is what makes the Angler the ability that keeps this one running. The kraken itself stays for 25 seconds. 35 second cooldown.',
      },
    ],
  },
  psychic: {
    elementId: 'psychic',
    name: 'Psychic Mastery',
    enhancedEmoji: '🧿',
    enhancedColor: 0xffd166,
    requirements: [
      {
        key: 'stressDealt',
        label: 'Under Pressure',
        howTo: 'Inflict stress on entities — every point from a lash, a Migraine, a snare or a coma banking counts',
        target: 500,
      },
      {
        key: 'castsDenied',
        label: 'Nothing Happens',
        howTo: "Take an ability off the front of an enemy's queue with Mind Control (E) — every seizure counts one",
        target: 50,
      },
      {
        key: 'bestDetonation',
        label: 'All At Once',
        howTo: 'Release 150 stress off a single body in one piece — a single qualifying detonation completes this permanently',
        target: 150,
        isBest: true,
      },
      {
        key: 'fullMigraines',
        label: 'Wound All The Way',
        howTo: "Land a fully-wound Migraine (F) — the whole 5 seconds of the wind-up, on at least one body (needs the F+ Mind's Focus upgrade)",
        target: 15,
      },
    ],
    enhancements: [
      {
        id: 'predictors-snare',
        name: "Predictor's Snare",
        description: 'Passive: your dash stops being a dash. Press Space and you are simply *there* — standing on the movement marker at the end of the enemy\'s thread, on the exact spot they were going to be in two seconds, before they are.\n\nAnd you do not arrive empty-handed. A small closed eye is left burnt into the floor where you landed. It lies there with its lid down for 14 seconds, and the moment the enemy walks over it — which is what the thread said they were about to do — it opens and puts 15 stress into them. Up to six of them can be on the floor at once, and every one of them is a place the enemy has already told you they are going.\n\nThe counterplay is the same one the whole element has: the marker only exists while they are walking somewhere. Stand still and there is nothing at the end of the thread, and the dash is an ordinary dash again.',
      },
      {
        id: 'utter-focus',
        name: 'Utter Focus',
        bindable: true,
        // Mind Control is the entire payoff of a longer queue — five seconds of held casts with
        // nothing able to reach into them is a window that reads well and does nothing.
        excludeSlots: ['e'],
        hudDescription: 'Close your eyes for 8s: the future opens to 5 seconds and all your stress is worth 1.2x',
        description: 'Shut your eyes and stop looking at the present altogether.\n\nFor 8 seconds the two seconds you are ahead becomes **five**. Their route on the floor runs five seconds forward instead of two, the ghost at the end of it stands five seconds into the future, and every ability they press is held for the full five before it is allowed to happen — which also means the queue over their head grows long enough that Mind Control can pick through it.\n\nAgainst another person there is a third delay on top of those two: their **movement keys** are held back by the same five seconds. What they are pressing now is what their body will do five seconds from now, so for the first stretch of the window they do not move at all and after that they walk the route you have been watching on the floor the whole time. This is the only situation in the game in which the thread over a real opponent is a fact rather than an estimate.\n\nEverything you land while your eyes are shut is worth **1.2x stress**.\n\nThe price is that you are reading rather than watching. Every hit that lands on you during the window knocks half a second off it, so a psychic who is being pressured gets far less of it than one who opened the window from behind cover. 26 second cooldown.',
      },
    ],
  },
  conquest: {
    elementId: 'conquest',
    name: 'Conquest Mastery',
    enhancedEmoji: '👑',
    enhancedColor: 0xe8c23a,
    requirements: [
      {
        key: 'buildingsMaxed',
        label: 'Nothing Left To Buy',
        howTo: 'Take a building as far as its tree goes — one path at tier 4 and the others pinned. Town centres count, and so does a two-column tree with no shop upgrade behind it',
        target: 20,
      },
      {
        key: 'expansions',
        label: 'Second Capital',
        howTo: 'Plant an Expansion (Q) — a whole second economy, 150 Authority a time',
        target: 5,
      },
      {
        key: 'troopsTrained',
        label: 'The Levy',
        howTo: 'Train soldiers out of your barracks — every man a barracks puts on the board counts one',
        target: 100,
      },
      {
        key: 'turretDamage',
        label: 'Field Of Fire',
        howTo: 'Damage dealt by your own turrets — bullets, hitscan rounds, Boom Bullet bursts, blasts and revenge bombs all count',
        target: 150,
      },
    ],
    enhancements: [
      {
        id: 'dictatorship',
        name: 'Dictatorship',
        description: 'Passive: the pike answers to the treasury. Banner Bash gains +1 damage for every 10 Authority sitting in your bank, up to +30 — so a commander who has been left alone to bank for a minute swings for over twice what the ability says on the card.\n\nIt is added to the base exactly as Enchantment is, which means the home-ground quarter still cuts all of it. Standing on your own land is still not where you are strong, however rich you are. And it is Authority *banked*, not earned: the moment you spend two hundred points on an Expansion the pike goes back to being a poke, which is the whole tension — the economy is either an army or a weapon, never both at once.',
      },
      {
        id: 'market',
        name: 'Market',
        bindable: true,
        hudDescription: '30 Authority. A 50 HP stall that pays 1 Authority a second, with its own three-path tree',
        description: 'A fifth building, placed on the square you are standing on like the other three. 50 HP — the flimsiest thing on the board — and it pays 1 Authority a second for as long as it is standing.\n\nWhat it really is is a fourth upgrade tree, and the only one that spends money on money.\n\n**ECONOMY** stacks its own income (+1, then +1 more), then Market Revolution pays every *other* market you own +1 a second, and Money Mania doubles what every town centre pays.\n\n**WAR** turns the bank into a weapon: Cash out pays every 0.8s instead of every second, Warmongering hands you 3 Authority for every 50 damage you deal, Blood money gives turrets and soldiers standing near the stall up to +50% damage depending on how much is in the bank, and Loan Shark adds a LOAN button that takes 25 of your own health and gives you 5 Authority.\n\n**BANKING** is the shop-gated third column, and it opens only if you own the corrupt-shard upgrade for whichever slot you dropped the Market on. Banking pays up to +2 a second depending on how much is lying around, Investing grows the whole bank 10% every 5 seconds, Securities replaces that with a vault inside the stall itself — deposit up to 200, watch it grow 25% every 5 seconds, and lose every point of it if the market is knocked down — and Propaganda Central adds a PROPAGANDA button: 8 seconds during which damage aimed at you is paid out of Authority instead of health, at 0.6 Authority a point. Run the bank dry inside those 8 seconds and you take double damage for the rest of them.',
      },
    ],
  },
  cloth: {
    elementId: 'cloth',
    name: 'Cloth Mastery',
    enhancedEmoji: '🪡',
    enhancedColor: 0xffd98a,
    requirements: [
      {
        key: 'pinnedDamage',
        label: 'Bleeding Both Ways',
        howTo: 'Deal damage while you have Pinned HP in you — every point counts, whatever dealt it, as long as the cushion (F) is holding something at the time',
        target: 100,
      },
      {
        key: 'tapestryPieces',
        label: 'A Working Loom',
        howTo: 'Get three artworks onto one tapestry — a single match that reaches three sewn pieces completes this permanently',
        target: 3,
        isBest: true,
      },
      {
        key: 'webDamage',
        label: 'Held Still',
        howTo: 'Deal damage to somebody wrapped in one of your cloth webs (needs the E+ corrupt upgrade)',
        target: 200,
      },
      {
        key: 'safetyRetreats',
        label: 'Always Roped In',
        howTo: 'Get hauled back to a Safety Line anchor (R) — the recast and the automatic 75-damage trigger both count',
        target: 25,
      },
    ],
    enhancements: [
      {
        id: 'outfit-change',
        name: 'Outfit Change',
        description: 'Passive, bound to **Space**, and it is a wardrobe rather than a buff.\n\nOne press sheds whatever you are wearing in a spray of panels and leaves you standing in the next thing. There are four, and they cycle in order:\n\n**🤵 Black Suit** — every hit that reaches you lands for **3 less**, flat, before anything else. It is the one you start the match in and it is quietly the best against a swarm, because it is subtracted from each hit rather than from the total.\n\n**🧥 Heavy Coat** — **10% less damage** from every source. No conditions, no exceptions, and the only one of the four that is never wrong.\n\n**👘 Thin Silks** — every negative status on you runs **33% shorter**. Stuns, slows, burns, freezes, roots, silences: all of them. Against a control element it is worth more than any amount of armour.\n\n**🧢 Casual Hoodie** — **20% less** from anything that arrives as an area blast or a piercing shot. Against a normal shot it does nothing at all; against an ultimate it is the largest number on this list.\n\nSwapping costs nothing but the moment it takes, so the real skill is reading what is about to be thrown at you and being in the right thing when it lands.',
      },
      {
        id: 'wretched-scarf',
        name: 'Wretched Scarf',
        bindable: true,
        hudDescription: 'Wrap up for 3s: nothing gets through, then all of it comes back out as one blast',
        description: 'The tailor pulls the whole scarf in and winds it round themselves until there is nothing left but a tight cocoon about the size of anybody else\'s body.\n\nTwo things happen at once. The scarf **stops being a hitbox** — for three seconds you are a small circle like every other element on the roster, which against a shot-heavy opponent is most of what the ability is for. And every point of damage that does still reach you is **negated outright**: not absorbed, not reduced, simply refused.\n\nNone of it is forgiven, though. It is counted. When the three seconds run out the wool unwinds in one motion and **90% of everything that was thrown at you comes back out as a blast** in a wide radius around where you are standing — so the correct answer to somebody dumping an ultimate into it is to be standing on top of them when it opens.\n\nIt is the only defensive cooldown in the game that gets stronger the harder it is punished, and the only one that is a bad idea to use on nothing. 18 second cooldown.',
      },
    ],
  },
  radiation: {
    elementId: 'radiation',
    name: 'Radiation Mastery',
    enhancedEmoji: '📡',
    enhancedColor: 0x2fe0a8,
    requirements: [
      {
        key: 'confirms',
        label: 'Three On One Body',
        howTo: 'Land the third Geiger Tracer (Click) on a body and let the railgun fire itself — every confirmed set counts one, and a stray click still scrubs the board',
        target: 50,
      },
      {
        key: 'level3Doses',
        label: 'Top Of The Ladder',
        howTo: 'Push an entity all the way to level 3 irradiation — the Exposure swing, the Final Vision beam, the bare Supercritical core or Finality all get there (needs the corrupt upgrades that open the ladder)',
        target: 25,
      },
      {
        key: 'supercriticals',
        label: 'Nothing Contained',
        howTo: 'Go Supercritical: land a *direct* Waste Disposal (F) drum on a body while Final Vision is running (needs the R+ and F+ corrupt upgrades)',
        target: 5,
      },
      {
        key: 'nukeKills',
        label: 'Airdrop Confirmed',
        howTo: 'Land the killing blow with the Extermination (Q) airdrop — five flares into one body, and somebody on the screen does not get up',
        target: 3,
      },
    ],
    enhancements: [
      {
        id: 'snipers-instinct',
        name: "Sniper's Instinct",
        description: 'Passive, and it is two admissions of the same thing: this man should never have been in the room.\n\nThe first is armour that is worth more the further away he is. Standing on top of somebody he takes full damage, exactly as he always did. From there every pixel of separation is worth something, until at 620px and beyond everything aimed at him lands for **45% less**. It is measured live, off whichever enemy is actually nearest, so it is not a buff he opens and holds — it is a running score on how well he is playing the range.\n\nThe second is the line. A thin lead sight runs from the weapon hand out to wherever the cursor is, stopping exactly where a tracer thrown right now would stop: at the body it would clamp onto, at the wall it would strike, or at the 700px where it simply runs out. A reticle sits on that point, and it goes green when the line ends on a body and hazard-yellow when it ends on nothing. There is no new information in it — it is the same maths the click already ran — but the whole element is a chain that one stray tracer scrubs, and this is the difference between knowing that and seeing it.',
      },
      {
        id: 'gamma-tether',
        name: 'Gamma Tether',
        bindable: true,
        // Final Vision is a prerequisite for a *second* upgrade — Cutdown only opens Supercritical
        // while the R is running — so binding over R would quietly delete an F+ the player already
        // bought, which is the one cost that is not written on the card.
        excludeSlots: ['r'],
        hudDescription: 'Plant a device at the cursor. It chains the nearest enemy inside 150px of it for 6s, and their dose stops running down',
        description: 'A squat lead post driven into the floor wherever the cursor was, on three splayed legs, with a hazard band around its belly and a green charge bar across the front of it that drains for the whole six seconds it has left to live.\n\nWhat comes off the top of it is a chain. It reaches out to the nearest enemy within 260px, catches them, and from that moment they are **not allowed further than 150px from the post**. Inside that circle they can walk wherever they like; at the edge of it the chain simply does not pay out any more, and their own movement stops meaning anything in the outward direction. The catch is not instant and it is not a taunt — a post planted where nobody is standing yet lies there and takes the first body that walks into range.\n\nThe chain is live waste on a wire, so it plants a dose on whoever it catches. And for as long as it holds them, **the dose stops running out**: the trefoil over their head keeps its bar exactly where it is and the ten, twenty or forty seconds they were counting down simply pause. Six seconds of held ladder, on top of six seconds of a target that cannot leave a 150px circle you chose.\n\nThat circle is the whole point. Everything Radiation owns is a procedure that dies to somebody walking away from it: three tracers, a drum, seven pools and a sweep. A tethered enemy cannot walk away from any of it. 15 second cooldown, one post at a time, and no damage of its own whatsoever.',
      },
    ],
  },
  ruin: {
    elementId: 'ruin',
    name: 'Ruin Mastery',
    enhancedEmoji: '🦎',
    enhancedColor: 0x8f1f18,
    requirements: [
      {
        key: 'shotsShredded',
        label: 'Nothing Gets Through',
        howTo: 'Tear shots out of the air with Shred Slice (Click) — every projectile a wedge eats counts one, including the ones that never joined a group',
        target: 200,
      },
      {
        key: 'crystalsBlown',
        label: 'Chain Of Custody',
        howTo: 'Detonate ruin crystals — every link of a chain counts one (needs the Click+ Shatter Starter and F+ Chain Reaction upgrades)',
        target: 150,
      },
      {
        key: 'impalements',
        label: 'On The Spike',
        howTo: 'Thread an entity onto a Rusty Skewer (R)',
        target: 50,
      },
      {
        key: 'bestSkewer',
        label: 'Three On A Stick',
        howTo: 'Carry three bodies on one skewer at the same time — a single qualifying throw completes this permanently',
        target: 3,
        isBest: true,
      },
    ],
    enhancements: [
      {
        id: 'combo-breaker',
        name: 'Combo Breaker',
        description: 'Passive: half of this game is a bar filling up. Kinetic charge, terror, inflammation, love, hunger, a patron\'s anger, hype, Authority, DNA, blood, a stomach, a stress total — an element without a bar is the exception, and every one of them is a promise that if the fight goes on long enough the thing at the end of it arrives.\n\nAgainst you it arrives half as fast. Every meter every enemy on the field owns fills at 50% of its normal rate, whatever fills it: hits landed, seconds survived, damage taken, bodies eaten. Nothing about the bar changes except how long it takes to get anywhere — the payoff at the top is exactly as big as it always was, and a bar already full stays full.\n\nWhat it does not do is drain them. A meter that empties on a timer still empties at its own speed, so this is not a counter to anybody\'s upkeep — it is a tax on their ramp. The elements that open strong barely notice. The ones that were counting on minute three notice a great deal.'
      },
      {
        id: 'second-skin',
        name: 'Second Skin',
        bindable: true,
        hudDescription: '25 triangle shards in every direction for 15 each, and anything they hit is dragged back to its base form. You shrink 20%, permanently. Five uses, ever',
        description: 'Take hold of a seam and pull. A whole layer of you comes away at once and goes out as twenty-five triangular plates of dead skin, in a full circle, at whatever happens to be standing around you.\n\nEach plate is 15 damage. That is not what it is for.\n\nWhat it is for is the second half: anything a plate touches is **put back in the body it started the match in**. A beast becomes a hunter again, a flying judge lands, a butcher goes back to being a chef, a titan is a person, a burrowed acid is on the surface, a car is a driver, a flame body goes out. Everything that element spent to get into that form is spent; the form itself is simply over. There is no duration on it because there is nothing to time — the transformation ended.\n\nThe price is written on your own body. Every cast makes you **20% smaller for the rest of the match**, and it does not come back — one shed is a slightly smaller target, five is a third of the size you started as. That is a gift and a wound at once: you are far harder to hit, and you are also visibly a smaller thing than the person you are fighting, with a hitbox to match on the abilities that need you to *be* somewhere.\n\nAnd there are five. Not five per minute — five, and then the card greys out and stays grey. There is no layer six.'
      },
    ],
  },
  // Slime. The element id is `gum`; everything the player sees says Slime.
  gum: {
    elementId: 'gum',
    name: 'Slime Mastery',
    enhancedEmoji: '🟩',
    enhancedColor: 0x2b8b76,
    requirements: [
      {
        key: 'bodyThrows',
        label: 'Somebody Else\'s Problem',
        howTo: 'Gum an entity with the Gumball barrage (R), pick the body up with the hand and throw it',
        target: 50,
      },
      {
        key: 'bombHits',
        label: 'Splash Damage',
        howTo: 'Catch entities in a Slime Bomb blast (needs the E+ Slime Splash corrupt upgrade)',
        target: 60,
      },
      {
        key: 'absorbs',
        label: 'Everything Goes Down',
        howTo: 'Swallow an incoming attack with Oozorbtion (F) — a shot plucked out of the air or a hit taken on the open body both count',
        target: 50,
      },
      {
        key: 'clawKills',
        label: 'The Hand That Set',
        howTo: 'Land the killing blow with the hand of stone — a punch or a passing smack while the Q+ claw is up (needs the Q+ Hand of Stone corrupt upgrade)',
        target: 1,
      },
    ],
    enhancements: [
      {
        id: 'slime-split',
        name: 'Slime Split',
        description: 'Passive: a slime does not die when it is killed. It comes apart.\n\nThe hit that would have finished you instead splits the body into **three slimelings of 50 HP each**, much smaller than the thing they came out of, and the fight simply carries on. Damage is taken by the hindmost one first, so they are peeled off one at a time; you are only truly dead when the last of the three is gone.\n\nThey are not pets and they are not a summon — they are you. Their three little arms come together into the one hand you have always had, so you grip, drag, punch, carry and throw exactly as before, from a body that is now a cluster instead of a blob. What changes is that **each slimeling can swallow its own projectile**: one Oozorbtion opens all three at once, and each of them digests what it caught into its own health.\n\nThe cost is that the pool is 150 and not whatever you had. Splitting is not a heal — it is a second life at a third of the size, with three separate things left to kill.',
      },
      {
        id: 'oobleck',
        name: 'Oobleck',
        bindable: true,
        // Solidify is what turns the slab into a real wall — binding over Q would delete the
        // upgrade path written into the ability's own description.
        excludeSlots: ['q'],
        hudDescription: 'Summon a slimy slab and carry it like a shield. Projectiles stick in it, enemies who walk through it are slowed harder and harder for 12s. Solidify turns it into a wall',
        description: 'A slab of half-set slime, summoned straight into the hand and held broadside-on like a shield — the long edge facing you, because it is your cover and not your weapon. It is never thrown. Let go and it is simply set down where it stands, and it can be picked back up again whenever you want to move it.\n\nIt is not a wall. Anyone can walk straight through it, you included; what it stops is **shots**. Up to five stick in it at once, hanging in the goo, each dissolving away after five seconds to leave room for the next. Feed it a sixth while all five are still in there and the slab gives up: it bursts into **two slime puddles** on the floor where it stood.\n\nAnything that walks through it comes out wearing **Oobleck** for 12 seconds — a slow that starts as almost nothing and gets worse the whole time it is on, until in the last second before it ends they are moving at 30% speed. It is a debt, not a hit: the further it runs the more it costs.\n\nAnd then there is Solidify. **Q sets the slab hard**, and a hard slab stops being a filter and becomes a wall: it blocks *every* projectile, with no limit at all, and neither fighter can walk through it any more. The thing you were hiding behind becomes the thing that divides the room.',
      },
    ],
  },
  paper: {
    elementId: 'paper',
    name: 'Paper Mastery',
    enhancedEmoji: '📜',
    enhancedColor: 0xe8c65c,
    requirements: [
      {
        key: 'journalPct',
        label: 'Well Read',
        howTo: 'Fill in a quarter of the Journal — every element\'s six entries counted together, and 25% of the whole book written up',
        target: 25,
        isBest: true,
      },
      {
        key: 'healedHp',
        label: 'Taped Back Together',
        howTo: 'Heal 150 health by any means — the Herbology lotus, a potion, a map pickup, anything that puts health back on',
        target: 150,
      },
      {
        key: 'pinwheelBleeds',
        label: 'A Thousand Paper Cuts',
        howTo: 'Open a bleed with the pinwheel — every entity the spinning wheel cuts counts one (needs the R+ Paper Pinwheel upgrade)',
        target: 50,
      },
      {
        key: 'climaxKills',
        label: 'How It Ends',
        howTo: 'Land the killing blow with a Climax (Q) — the cavalry, the bombardment, or the flame spirit and the fire it leaves',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'spirit-of-the-story',
        name: 'Spirit of the Story',
        description: 'Passive: you stop reading the book and start being it. Whichever storybook is open is now a statline as well as an attack, and right-click is a stance change.\n\n📗 **Knight** — 20% less damage taken. The armour is the whole point of the chapter.\n📘 **Alien** — 20% more damage dealt, by every source in the kit: the laser, the shuriken, the monsters, the bleed, all of it.\n📕 **Fantasy** — 25% more movement speed.\n📙 **Bible** — a 20% slow on everyone you are fighting, for as long as the book stays open. It is the only one of the five that is worn by somebody else, and the only way off it is you turning the page.\n📓 **Herbology** — 3 health a second, forever.\n\nThe Larger Library upgrade is not required — without it you have the first three, and the ring is three stances instead of five.',
      },
      {
        id: 'restructure',
        name: 'Restructure',
        bindable: true,
        // The Herbology lotus is the only heal in the whole element, and this ability's price is
        // paid in health. Bound over Q it would delete the one thing that pays it back — and take
        // the Climax kills the mastery was earned with along with it.
        excludeSlots: ['q'],
        hudDescription: 'Come apart into 14 sharp shards. Invisible and invincible while they are out; they reassemble at your cursor. Costs 25 HP, returned as weak HP',
        description: 'Tear yourself up.\n\nThe body goes into **14 shards** that fly out across the whole arena and ricochet off the walls. Each one cuts for **5** and opens the same bleed the pinwheel does — 2% of what the victim has left, every second, for 2 seconds. A shard can cut the same body twice, but not inside half a second, so a room full of them is a grinder rather than a single enormous hit.\n\nThere is nothing left of you while they are out. **Invisible and invincible** — no body, no health bar, and a bot has nothing to aim at, so it stops fighting and wanders. You cannot act either: no clicks, no keys, no book. You are a scatter of paper.\n\nAfter a couple of seconds they start turning round, one at a time, and coming to **your cursor**. You reassemble where they land — the pieces rebuild you as they arrive, so the whole thing doubles as a slow, unstoppable reposition that finishes wherever you were pointing. When the last one is back on, you are whole and the tray comes back.\n\nThe price is written into what comes back: **25 of your health is returned as weak HP**, the grey layer that soaks a hit and then drains away at 3 a second. You spend the reassembly watching it go. 32 second cooldown.',
      },
    ],
  },
  fortune: {
    elementId: 'fortune',
    name: 'Fortune Mastery',
    enhancedEmoji: '🎟️',
    enhancedColor: 0x8c5c31,
    requirements: [
      {
        key: 'catalogueOwned',
        label: 'Retail Therapy',
        howTo: 'Buy every distinct line the stall stocks at least once — all 29 of them, across the general shelf, the ARMS page and the MODS drawer. It counts across matches and never resets, but six of the lines only appear once you own the matching corrupt upgrade',
        target: 29,
        isBest: true,
      },
      {
        key: 'coinsEarned',
        label: 'Make Money',
        howTo: 'Earn 500 blood coins. Anything that puts a coin in your purse counts: wounds you inflict, commission off enemy purchases, turnstile tolls and settled investments',
        target: 500,
      },
      {
        key: 'investGains',
        label: 'Compound Interest',
        howTo: 'Make 100 coins purely from capital gains — the bank\'s 10% payouts and a market settling upward. The money you put in does not count, only what it grew by',
        target: 100,
      },
      {
        key: 'p2wDamage',
        label: 'Pay to Win',
        howTo: 'Deal 250 damage with the golden beam (Q). Only the beam counts — it is the one attack in the element you buy rather than fire',
        target: 250,
      },
    ],
    enhancements: [
      {
        id: 'battle-pass',
        name: 'Battle Pass',
        description: 'Passive: there is a **battle pass** across the top of the screen now, and it is rolled fresh every single match.\n\n**Thirty tiers, 3 coins each, bought strictly in order** — press **B** at any time, anywhere in the arena. You do not have to be at the stall; the pass is not the shop, and that is the point: it is the one place your money goes that does not require you to stand in the middle of the room to spend it.\n\nMost of what is on it is **stat buffs** — bullet damage, fire rate, reload speed, magazine, movement, maximum health, plating, the coin rate itself, the interest rate itself. They stack, they last the match, and the pass is randomised so no two fights hand you the same ladder.\n\nScattered through them are ordinary shop items, handed over free.\n\nAnd **every fifth tier is an item⁺** — a version of something off the public shelf that is simply better than the one for sale. Bandages⁺ heal 55 instead of 20. A Cure-All⁺ is 120 health and 45 seconds of nothing sticking to you. Death Machine⁺ is a 45-damage vacuum and it does not count against your three. Tier 30 is the last one, and by then you have spent 90 coins on a second character sheet.',
      },
      {
        id: 'drive-by-flex',
        name: 'Drive by Flex',
        bindable: true,
        hudDescription: 'Summon a rusty car that bounces round the arena ramming people. Space near it to ride it — faster reloads and a faster trigger. 5 bounces, then it explodes. The stall grows a GARAGE tab',
        description: 'A rusted saloon comes out of nowhere at head height, drops onto its wheels and **drives**. It does not steer, it does not chase and it does not stop: it goes forward until it meets a wall, comes off it like a DVD logo, and does it again. Anything in its way is rammed for **18**.\n\nIt is slow, and it has **five bounces in it**. On the fifth it explodes.\n\n**Press Space near it and you are on the roof.** Riding it is a **40% faster reload and a 35% faster trigger**, and the car keeps driving with you on it — you have given up steering in exchange for a firing platform. Space again and you step off. A car that explodes with you on it throws you clear; it is your car, and it will not hurt you.\n\nThe stall grows a fourth tab for it: a **GARAGE**, and it is not cosmetic. **Spiked Bumper** (2) makes the ram nearly double. **Quick Tires** (1) speeds it up. **Stronger Chassis** (2) is three more bounces. **Suicide Mission** (2) turns the death explosion into a shrapnel storm. **Sunroof** (3) is a much bigger ride bonus plus 20% damage while you are up there. **Mounted Gunner** (3) is +5 rounds in whatever you are holding, while you are holding onto the roof. **Robo-Gunner** (3) bolts on an automatic that spits three 2-damage rounds a second at anything close. **Speedster** (5) makes it *fast*, gives it ten more bounces, and lights a fire trail behind it. **Tank** (7) is the other direction entirely: five more bounces, a ram that hurts far more, a crawl instead of a drive, and a 15-damage explosive shell every three seconds at anything nearby.\n\n**The car takes three of them. Ever.** Three is the whole build, and Tank alone is seven coins, so the expensive ones cost you the cheap ones twice over.',
      },
    ],
  },
  gluttony: {
    elementId: 'gluttony',
    name: 'Gluttony Mastery',
    enhancedEmoji: '🐀',
    enhancedColor: 0x8c6b5a,
    requirements: [
      {
        key: 'hotKnifeHits',
        label: 'Searing Service',
        howTo: 'Land a blade that came off the coals. Every entity a red-hot kitchen knife — or a red-hot cleaver — cuts counts one',
        target: 50,
      },
      {
        key: 'foodsCooked',
        label: 'Fifty Covers',
        howTo: 'Finish cooking ingredients on the grate. It is the moment the ring fills that counts, whether or not you ever walk back to collect it',
        target: 50,
      },
      {
        key: 'larderKinds',
        label: 'The Whole Larder',
        howTo: 'Cook every one of the eight ingredients at least once — mushroom, carrot, potato and meat, plus the four the E⁺ Head Chef upgrade adds. It counts across matches and never resets',
        target: 8,
        isBest: true,
      },
      {
        key: 'mawKills',
        label: 'It Ate Well',
        howTo: 'Let the maw finish somebody. A gobbet, a tentacle whip, a close bite, the dread maw\'s scream or its wall limbs — any of them landing the killing blow completes this permanently',
        target: 1,
      },
    ],
    enhancements: [
      {
        id: 'snacking',
        name: 'Snacking',
        description: 'Passive: you never stop eating. There is always something in a pocket, and it is always going in.\n\nA **slow regeneration**, running the whole match, in both forms — and its rate is read straight off the **strip**. An empty strip is **1 health a second**, which is barely worth naming; a strip carrying **200 points of healing** is **9 a second**, and everything between the two is a straight line.\n\nWhat the number counts is what the food would be *worth to you if you ate it*, not how many tiles are full: a cooked potato is worth twice a raw one, an over-seared anything is worth a quarter more again, a Winter Mint is worth a tenth of your own maximum health, and a rotten scrap is worth half of nothing. Six raw carrots is 60 and barely moves the needle. Two cooked cuts of meat and a pineapple is most of the way to the ceiling.\n\nThe wrinkle is that it is the exact opposite of every other thing in the kit. Eating is how Gluttony has always paid for being alive, and Snacking pays you for *not* eating — for walking round with a full larder you are saving. The moment you spend it, the regeneration is gone with it, and a Feast that empties the strip in one keystroke empties this too.',
      },
      {
        id: 'chefs-friend',
        name: 'Chef\'s Friend',
        bindable: true,
        // F is the door between the two halves of the element in both directions. Bound over it,
        // the mastery would delete the butcher form and the way back out of it at once.
        excludeSlots: ['f'],
        hudDescription: 'A rat hole opens at the top of the arena. Throw cooked food in and bread, cheese or a pie comes back out. In butcher form the rat comes out mutated and fights for you — feed it to make it worse',
        description: 'There is a hole in the wall at the top of the arena now, and two beady eyes in it.\n\n**Throw cooked food at the hole** — it has to be cooked, he is not an animal — and the rat takes it and is gone. A moment later something else comes back out and drops on the floor for you: **🍞 Bread** (30 raw, 60 cooked, 8s on the grate), **🧀 Cheese** (25 and 45, 5s), or **🥧 Pie** (30 and 60, 10s, and eating it is **+20% movement for 8 seconds**). Nothing else in the element turns food into better food, and the three of them are not on any forage table — the rat is the only way you will ever see them.\n\nThe **bound key is a whistle**. In the kitchen it sends him out to your cursor to **fetch**: the nearest thing of yours lying on the floor, or the cut of meat still stuck on a skewer in the wall, picked up and carried back onto your strip. If there is nothing out there to fetch, he goes down the hole and brings you one of his three instead. **14 second cooldown.**\n\nAnd then you put the whites down. **In butcher form the rat comes out of the hole as the thing it actually is** — twice the size, wrong colour, too many teeth — and it fights next to you. It runs down whoever you are fighting and **slashes for 12**, about once a second, and between swings it collects whatever food is lying around and brings that back too. The whistle stops being a fetch and becomes a **sic**: it charges the target and the next slash lands for **double**.\n\n**Feed it.** Throw any food you have at the rat and it eats it: **+25% damage and +15% speed per feed, up to four**, and — this is the part worth building around — a feeding buys it **12 seconds of staying out after butcher form has ended**. A rat fed on the way out of the transformation is still fighting for you long after the toque is back on.',
      },
    ],
  },
  dream: {
    elementId: 'dream',
    name: 'Dream Mastery',
    enhancedEmoji: '🌠',
    enhancedColor: 0x8b5cf6,
    requirements: [
      {
        key: 'sleepsInduced',
        label: 'One Hundred and Fifty Nights',
        howTo: 'Put an entity all the way under. The pendulum filling their meter, a pillow tipping them over the edge, a cannon shell, or the flying bob knocking somebody out cold — every one of them counts once',
        target: 150,
      },
      {
        key: 'healedHp',
        label: 'Rest Cure',
        howTo: 'Heal 500 health by any means the element has: standing still, sleeping in the oasis, walking over a full dreamcatcher, a Good Dream\'s regeneration, or a fort you are resting inside',
        target: 500,
      },
      {
        key: 'cannonHits',
        label: 'Fifty Shots at the Sky',
        howTo: 'Land a cosmic cannon shell on an entity. The cannon is the crown of a level-5 Pillow Fort, so this needs the E⁺ upgrade and a fort fed five times',
        target: 50,
      },
    ],
    enhancements: [
      {
        id: 'dream-duel',
        name: 'Dream Duel',
        description: 'Passive: **stand perfectly still while the enemy is asleep and press Space.**\n\nBoth of your spirits come out. Two pale shapes step out of two standing bodies, each still joined to the meat it left by a thread, and neither can go further from itself than the ring drawn on the floor says it can. That ring is the whole arena of the duel.\n\nWhile it lasts:\n\n**They cannot attack.** Not slowed, not disarmed — a spirit has nothing to attack *with*. All they can do is move, and moving is the only thing that will save them.\n\n**You cannot be hurt.** Nothing reaches a body nobody is standing in.\n\n**You cannot heal either.** Rest stops paying, the dreamcatchers stop giving, the regeneration stops — a spirit is not resting, it is hunting. Whatever health you walked in with is the health you walk out with.\n\n**They sleep three seconds longer than they would have.** The duel does not merely happen during their nap, it extends it.\n\nAnd your tray changes. The five keys go away and two take their place:\n\n**Click — Haunt.** Three red bolts forward, half a second apart, 5 each.\n**E — Spirit Tear.** One enormous white thing, moving barely faster than a walk, piercing everything it touches for 10 — with two smaller ones orbiting it that hit for 5 apiece.\n\nThat is the whole duel: you fire, and all they can do is dodge.',
      },
      {
        id: 'lifelong-dream',
        name: 'Lifelong Dream',
        bindable: true,
        hudDescription: 'Pick an element and hold the thought for 10 seconds — +2 every time you are hit. When the counter reaches zero you are given every buff that element could ever have',
        description: 'Press it and the fight stops being the thing on screen: a search box opens with **48 elements** in it — everything in the game except Dream, which you already are, and Quantum, which is not one element but two.\n\nPick one. **Random** is the top row if you would rather not choose.\n\nA counter appears over your head at **10 seconds** and starts coming down. It is not a cast time and you are not locked: you fight the whole way through it. But **every time you are hit, two seconds go back on**, so the dream is a thing you have to protect rather than a thing you have to wait for. Somebody who keeps landing on you can hold it open forever.\n\nWhen it reaches zero the dream **comes true**, and you are given every standing buff the element you named could ever be given — not its keys, you keep your own, but its whole statline at once, for the rest of the match. Fire is a flame body that burns anything touching you, immunity to every tick in the game, and a fifteen percent crit rate. Earth is a damage cap, a shield, and a body nothing can shove. Justice is a health floor of one. Light simply cannot be stunned.\n\nThe full table is on the **Dream Journal** page of this element\'s info screen — all forty-eight of them, written out.\n\n**One dream a match.** 40 second cooldown on the picker, but it does not matter: once a dream has come true, that is the one you have.',
      },
    ],
  },
  justice: {
    elementId: 'justice',
    name: 'Justice Mastery',
    enhancedEmoji: '🗡️',
    enhancedColor: 0xff8a3c,
    requirements: [
      {
        key: 'executions',
        label: 'Ten Executions',
        howTo: 'Take somebody apart with the Click⁺ execution — three angel bites open and their health under the threshold. Needs the Hell-Piercer upgrade',
        target: 10,
      },
      {
        key: 'guiltyVerdicts',
        label: 'Found Guilty',
        howTo: 'Return a GUILTY or DAMNED verdict on Judgement Day. It takes 100 damage on the record for the first and 300 for the worst',
        target: 3,
      },
      {
        key: 'lastStandKills',
        label: 'The Last Word',
        howTo: 'Land the killing blow while you are sitting on exactly 1 health — Indomitable Will is the only thing in the kit that will put you there and leave you there. One is enough, and it completes permanently',
        target: 1,
        isBest: true,
      },
    ],
    enhancements: [
      {
        id: 'combo-excelsius',
        name: 'Combo Excelsius',
        description: 'Passive: a **style meter** across the top of the screen, and a letter above it.\n\nIt does not measure damage. Damage is worth nothing — hitting somebody is the job, not the art. What it pays for is **arrangement**: something you set up earlier being the reason something that just happened worked. Pushing a body into a wall of fire you laid two seconds ago is style. Shooting them is a Tuesday.\n\n**Six ranks — D, C, B, A, S and SS — 100 style each.** The bar fills, the letter climbs, the bar empties and starts again. It **bleeds the whole time**, and faster the higher you are: D loses 2 a second, SS loses 11. A rank is something you hold, not something you reach.\n\nEvery rank is worth three things at once — **faster Willpower regeneration, more movement speed, and shorter cooldowns**. At **S and above** it is worth a fourth, and it is not small: **Judgement Day stops weighing anybody**. No tally, no tier, no mercy — every verdict comes back DAMNED, and the words *I AM BEYOND JUSTICE* go across the screen while it lands.\n\nThere are **thirty-six** ways to earn style and they are all written out on the **Rules of Law** page of this element\'s info screen. Trial by Fire is a pillar raised inside a coliseum somebody is trapped in. Into the Blaze is a ripped-out wall pushing them into the fire. Compacted is riding that wall the whole way to the far side. Sheer Will is surviving on one health because Indomitable Will would not let you go. Last Word is a kill made under a tenth of your own health.\n\nNone of them are basic, and none of them are accidents.',
      },
      {
        id: 'vigilante-vengeance',
        name: 'Vigilante Vengeance',
        bindable: true,
        hudDescription: 'On the ground: dash, impale, and kick them off the spear — into a wall, a pillar or a moving slab for far more. In the air: 200 spears down from the top of the screen, clustered at your cursor',
        description: 'One ability with two entirely separate halves, because Justice has two entirely separate stances.\n\n**On the ground it is a dash.** You go forward, and if you catch somebody you **run them through** — the spear goes in, they come off the floor, and then you put a boot on them and **kick them off it**. They travel. 45 damage for the impalement and the kick together, and then wherever they land decides the rest:\n\n• **Into a wall** — 30 more and 2 seconds stunned against it.\n• **Into a Coliseum wall** — the same. Your own ring counts, and a ring is much easier to aim at than the edge of the map.\n• **Into a Pillar of Flame** — 30 more, and they are set alight on the way through.\n• **Into a wall you ripped out and are still driving across the arena** — 45 more, a 3-second stun, and they are carried the rest of the way by it. This is the good one.\n\nEvery one of those is a **combo the style meter knows the name of**.\n\n**In the air it is a barrage.** You go up, the sky goes dark, and **200 spears** come down. Each one is worth **2**, which is nothing on its own and 400 if every one of them lands — they will not, because they fall in a spread. The spread is **tightest at your cursor**, so where you point is where the weight of it goes.\n\nAnd it aims itself, a little: **spears near a body carrying an angel bite bend toward it**, and the more bites are open the harder they bend. One bite is a nudge. Three is a funnel.\n\n**28 second cooldown**, both halves.',
      },
    ],
  },
  sound: {
    elementId: 'sound',
    name: 'Sound Mastery',
    enhancedEmoji: '🎤',
    enhancedColor: 0xff2299,
    requirements: [
      {
        key: 'harmonizedCasts',
        label: 'On The Beat',
        howTo: 'Land an ability inside the metronome\'s gold window. Any of the five counts, and the streak does not have to hold — a hundred harmonized casts is a hundred harmonized casts',
        target: 100,
      },
      {
        key: 'bugleNotes',
        label: 'A Hundred Notes',
        howTo: 'Strike a note on the bugle rhythm bar (F). Hold notes count as they are caught',
        target: 100,
      },
      {
        key: 'codaLevel',
        label: 'Turn It Up',
        howTo: 'Reach Coda level 3 — the electric guitar — in a single match. One match that gets there completes this permanently',
        target: 3,
        isBest: true,
      },
      {
        key: 'bugleRun',
        label: 'Flawless Twenty',
        howTo: 'Land 20 notes in a row inside one bugle call without dropping one. A single clean run completes this permanently',
        target: 20,
        isBest: true,
      },
    ],
    enhancements: [
      {
        id: 'audience-participation',
        name: 'Audience Participation',
        description: 'Passive: **you have an audience.**\n\nA crowd of shadows stands along the front of the stage for the whole match — heads bobbing, arms up, small wands waving in the dark. They are silhouettes and they are not in the fight: nothing can hit them and they cannot hit anything.\n\nWhat they do is **listen**, and listening pays. The crowd generates **2 hype a second**, for free, forever. Sound has always had to earn its hype by banking percentages and then burning them; this is the first hype in the element that arrives on its own, and over a long match it is worth a Coda level by itself.\n\nAnd they can be **played to**. Deal **50 damage inside any 5 second window** and the room goes up: the shadows jump, the wands go wild, and hype pays **double — 4 a second — for 5 seconds**. The window is rolling, so a burst that lands 50 keeps the crowd on their feet for as long as you keep giving them a reason.\n\nThey do not care how you did it. A Solo that walls the room, a mirror ball through somebody, a record cutting through a wave of husks — 50 is 50.',
      },
      {
        id: 'compose',
        name: 'Compose',
        bindable: true,
        hudDescription: 'Write for 3 seconds — a staff unrolls behind you and a note lands on it every 30px you cover. Then the whole bar hops off and goes hunting, 3 damage a note',
        description: 'Press it and you start **writing**.\n\nFor **3 seconds** a five-line staff unrolls on the floor behind you, following exactly where you walk, and a note is engraved onto it **every 30px of stave you lay down**. The notes sit on the line, pitched up and down as the bar goes, and they are pure decoration until the writing stops.\n\nWhen the 3 seconds are up, **the composition plays**. Every note on the staff hops off the line, hangs for a beat, and then goes for the nearest enemy — **3 damage each**, one small burst apiece, released in a stream rather than all at once.\n\n**The staff is the ability.** Three damage a note is nothing; a bar with forty notes on it is not. And the only thing that decides how many notes there are is **how far you got** in those three seconds:\n\n• Stand still and you write **nothing**. A staff with no length has no notes on it, and the ability does literally zero.\n• Walk it and you get a respectable bar.\n• Wearing everything this element banks — a Coda ladder, a bugle run, a green record, a boombox field — you cover **twice the ground**, and the bar is twice as long.\n\nThat is the whole design: Sound spends the entire match buying move speed and then never has anything to spend it on. This is what it is for. **Up to 64 notes**, which is 192 damage from a key that asks you to run in a circle.\n\n**18 second cooldown.**',
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
