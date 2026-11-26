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
/** The slots a bindable may take. Click and E are never replaceable — `'e'` stays in the type only so
 *  kits that scan every key keep compiling; an old save's E bind is ignored on read. */
export const MASTERY_SLOTS: MasterySlot[] = ['r', 'f', 'q'];

export interface MasteryEnhancement {
  /** Stable id — used as the ability id when this enhancement is bound to a slot. */
  id: string;
  name: string;
  description: string;
  /** True for active abilities the player binds over one of their R/F/Q abilities (never Click or E). Passives omit it. */
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
  oil: {
    elementId: 'oil',
    name: 'Oil Mastery',
    enhancedEmoji: '🚂',
    enhancedColor: 0x000000,
    requirements: [
      {
        key: 'puddleIgnites',
        label: 'Arsonist Rig',
        howTo: 'Set your own oil puddles alight — the Arm Laser, drone lasers, click-detonated barrels, and Coal Overload all count',
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
        howTo: 'Heal yourself for 300 HP — Lotus orbs, Lotus essence and Cycle of Life all count',
        target: 300,
      },
      {
        key: 'plantDamage',
        label: 'Attack Garden',
        howTo: 'Have your plants deal 300 damage — solar links, rotor blades, spore volleys, ice shards, sprout fire and Nightcap bombs all count',
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
        hudDescription: 'Destroy a plant to steal a 20–60s gift from it',
        description: 'Destroy the plant under your cursor (nearest otherwise) and absorb its essence — 20 seconds, +10s per fertilizer star and +10s if it was freshly fertilized, up to 60. Sunflower: right-click a 3s solar link of your own. Nightcap: petals stack an uncapped poison. Helicopter: grass blades spin round you, and click adds 3 short-range petals. Mushroom Colony: +2 petals per click, and your colonies hit 50% harder. Frost Lily: petals chill and bounce off a wall once. Flaming Sprout: keep clicking to fire faster and faster. Lotus: a lotus grows on your head every 8s; dashing spends it on 10 HP/s for 5s and +25% speed. Pitcher: you water your plants within 170px every 1.5s. 15 second cooldown.',
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
        howTo: 'Heal HP by any means — Q+ Void Singularity and your own shadow pools both count',
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
        howTo: 'Kill enemies while your Black Hole (Q) or Grim Gloom is up',
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
        id: 'curling-bomb',
        name: 'Curling Bomb',
        bindable: true,
        hudDescription: 'Set a bomb down; shoot it to launch it, it blows 1.5s later',
        description: 'Set an icy bomb down in front of you. It sits inert until one of your own shots strikes it: that lights the wick and launches it the way the shot was travelling, bouncing off the arena walls, and 1.5 seconds later it goes off. Another shot in the meantime steers it. The blast deals 35 damage in a wide ring, lands 2 frost stacks on everyone in it, and leaves them thawing slowly for the rest of the match — every stack they already carry gets 2 more seconds, and every stack they take from now on lasts 10 seconds instead of 8. In Black Ice the bomb turns black and throws void frost instead. An unlit bomb melts after 20 seconds. 20 second cooldown.',
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
        key: 'amalgamsTurned',
        label: 'Turncoat',
        howTo: 'Turn hostile bodies to your side with Turn (Q)',
        target: 50,
      },
    ],
    enhancements: [
      {
        id: 'corpse-prince',
        name: 'Corpse Prince',
        description: 'Passive: you start every match with a special corpse at the front of your queue — the Corpse Prince, an amalgam that still looks human, crowned and carrying a sword. 120 HP, a 14-damage sword and a 22-damage lunge. He cannot be Turned, never falls off a full queue, and when he dies he returns to your queue 12 seconds later — a permanent defender, on a cooldown.',
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
        howTo: 'Draw cards — every card that enters your hand counts, including the ones Side Shuffle (E) draws when its decoys are shot',
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
        howTo: 'Land All In (Q) on an enemy instead of throwing the wagered cards away',
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
        description: 'The card your mouse is hovering becomes GREATLY ENCHANTED for its next throw: 4x a normal card, overruling (and never stacking with) a glyph. It also picks up a curse, shown as a small emoji on the card, which fires the moment you play it (or wager it). Painful 🩹 deals you 30. Immolating 🔥 burns every other card out of your hand. Weakening 🦠 slows you 33% for 10s. Confusing 🌀 inverts your WASD for 5s. Vulnerable 🦴 makes the next hit you take double. Cursed 💀 rains 15 purple bullets at you from the sides of the arena for 3 each. Stunning ⭐ locks you out of playing cards for 5s. Cocky 😈 makes All In stake your entire health bar on top of the cards for the rest of the match. Purging ✨ strips glyphs and great enchants off your whole hand and puts Tarot, Dice of Doom and Cursed Talisman on 20s cooldowns. 20 second cooldown.',
      },
    ],
  },
  // Magnet's mastery (Metal Detector / Mag-Lev) was retired with the 2026-10-15 scrap rework; a new one is owed.
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
        description: 'Passive: every time you load in, two random Secret Upgrades are unlocked in your Evolve menu. They cost 8 DNA, have a single tier, and cannot be sold. The pool: Brood (slow, heavy-hitting red bacteria that home from farther with Chemotaxis), Ruler (keep 2 clones, SPACE cycles), Viral Consumption (healthy viruses grant +20% speed and damage for 3s), Mitosis (20% chance DNA pays out double), Crawling Spores (spores crawl at the enemy and jostle past each other), Pandemic (floor viruses also infect for 3s), R Specialized (-25% size, +25% speed), K Specialized (+30% size, +50 max HP and HP), and Apex (Tier 3 upgrades cost 1 less DNA, Ultimates 2 less).',
      },
      {
        id: 'plague-pal',
        name: 'Plague Pal',
        bindable: true,
        excludeSlots: ['e'],
        hudDescription: 'Your pet virus dashes ahead and lashes nearby enemies with its tentacles',
        description: 'A blobby virus pet follows you around. Casting sends it dashing out in front of you, where it throws out all its tentacles for 18 damage to every enemy nearby. 7 second cooldown. Equipping it adds a Plague Pal tree to the Evolve screen — Offensive, Defensive and Efficiency — that upgrades the pet on its own: harder lashes, rage from your viruses, exploding spores, a projectile-blocking shell that eats what it stops, healing, dodge, auto-aim, two charges, and the ultimates Zoochosis (it shoots bacteria by itself), Symbiosis (you merge with it) and Mitosis (two Pals). Cannot be bound over E.',
      },
    ],
  },
  slime: {
    elementId: 'slime',
    name: 'Venom Mastery',
    enhancedEmoji: '☣️',
    enhancedColor: 0x1b3d10,
    requirements: [
      {
        key: 'acidCoverageTotal',
        label: 'Acid Flood',
        howTo: 'Cover the arena in acid — every cell you lay adds up across all your matches (500% total)',
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
        howTo: 'Finish enemies off with venom — the floor, the poisons, bombs, the bite, rain and footprints all count',
        target: 20,
      },
      {
        key: 'burrowAttacks',
        label: 'Ambush Predator',
        howTo: 'Bite enemies by coming up out of Burrow next to them',
        target: 50,
      },
    ],
    enhancements: [
      {
        id: 'acid-walker',
        name: 'Acid Walker',
        description: 'Passive: after stepping through acid, you leave burning acid footprints for 5 seconds as you walk onto clean ground. Each print lasts ~3s and eats anyone standing on it like an acid puddle. Footprints laid within 3s of surfacing from Burrow are larger, darker, and hurt more.',
      },
      {
        id: 'shed-skin',
        name: 'Shed Skin',
        bindable: true,
        hudDescription: 'Slough your skin: +15% speed, a ring of venom darts and a pool of acid',
        description: 'No cooldown — instead, one shed is earned at each acidification milestone: 20%, 40%, 60% and 80% of the arena. Shedding makes you quicker: you move 15% faster for the rest of the match, stacking with every shed. You throw a spiralling barrage of 48 venom darts in every direction as you do — 1 damage and 1 toxin each — and leave a pool of acid and six splashes around you.',
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
        // Key kept from the Workshop days so progress already banked still counts.
        key: 'workshopKills',
        label: 'Demolition Expert',
        howTo: 'Kill entities with Self-Destruct (Q) blasts, shrapnel or Scrapnel',
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
        howTo: 'Land your Zip Bomb (R) file on entities',
        target: 50,
      },
      {
        key: 'adminBans',
        label: 'Banhammer',
        howTo: 'Kill an enemy with the Admin Console (Q) ban command — it only runs on a target below 15% HP',
        target: 1,
      },
      {
        key: 'webCoins',
        label: 'Coin Farmer',
        howTo: 'Collect pain coins in the Surf the web! (F+) PainClicker',
        target: 500,
      },
    ],
    enhancements: [
      {
        id: 'glitch-abuse',
        name: 'Glitch Abuse',
        description: 'Passive: keep walking into any edge of the arena — a side wall, the ceiling or the floor — for about half a second and the collision gives up — you flicker in and out of the wall like a real clip, then get launched across the arena in the direction of your cursor. Anyone you pass through on the way takes 15 damage. Aim into the wall and you are thrown straight out of it instead. 8 second cooldown between launches.',
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
        howTo: 'Land the killing blow with a Supernova (Q) beam',
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
        howTo: 'Bribe one recruit all the way to level 3 (needs the F+ Hardened Criminals upgrade)',
        target: 3,
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
        description: 'Passive: you can hold 4 money at a time instead of 3, so a full wallet can steal a tank.',
      },
      {
        id: 'hijack',
        name: 'Hijack',
        bindable: true,
        hudDescription: 'Tap to steal a car, hold to pay for a better ride — Space gets in and out',
        description: 'Steal a ride and leave it beside you. A tap costs 1 money and gets a car; hold the key and every step up costs one more: a motorcycle for 2, a sports car for 3, a tank for 4. Press Space next to it to get in and Space again to get out. W and S are the throttle, A and D steer, and it slides like a car. Ramming an enemy hurts them more the faster you are going. While you drive, hits land on the ride instead of you, and when it runs out of health it explodes without harming you; parked, it stops enemy shots while yours pass through. You can Spray (E) from the driver\'s seat and nothing else. Hire a recruit right beside a ride with a free seat and he climbs in and shoots as you drive. Car: 75 HP, one seat. Motorcycle: 50 HP, very fast, no seat, and a 35% chance for any hit to miss. Sports car: 150 HP, fast, sharp steering, two seats. Tank: 250 HP, two seats, very slow — but click to fire its gun for 35 damage in a wide blast, every 2.5 seconds. 15 second cooldown.',
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
  illusion: {
    elementId: 'illusion',
    name: 'Illusion Mastery',
    enhancedEmoji: '🃏',
    enhancedColor: 0x5a189a,
    requirements: [
      {
        key: 'veilDeflects',
        label: 'Bent Light',
        howTo: 'Deflect enemy projectiles with your Illusion Veil (E) — a pane kicks each enemy shot that crosses it 10° off',
        target: 100,
      },
      {
        key: 'danceBladeHits',
        label: 'Party Tricks',
        howTo: 'Catch entities in Bomb Dance blasts — the volley a Dance teleport throws (needs the Q+ upgrade)',
        target: 25,
      },
      {
        key: 'teleports',
        label: 'Never There',
        howTo: 'Teleport — Relocate (R), a Dance hop, and, once mastered, a Reality Shift all count',
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
        description: 'Passive: take 50 damage inside 2.5 seconds and you are not there any more — you teleport to a random corner on your own, no key and no cooldown bar (the tally starts over, and it cannot fire again for 1.5s). A shift is a teleport like any other: during Illusion Dance with Bomb Dance owned it throws a volley of bombs, doubled while Duplication is running.',
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
  bind: {
    elementId: 'bind',
    name: 'Bind Mastery',
    enhancedEmoji: '🗿',
    enhancedColor: 0xd8202a,
    requirements: [
      {
        key: 'soulsBound',
        label: 'Soul Catcher',
        howTo: 'Capture lost souls — every soul you bind with Bind (E) counts one',
        target: 25,
      },
      {
        key: 'revenantSeconds',
        label: 'Hunted',
        howTo: 'Survive with a revenant on you — every second at least one is stalking you counts, across any number of matches',
        target: 120,
      },
      {
        key: 'godSummons',
        label: 'False God',
        howTo: 'Summon the god with the Ritual (Q)',
        target: 5,
      },
      {
        key: 'cultistsMade',
        label: 'Converts',
        howTo: 'Bring revenants to faith as cultists (needs the F+ Trial by Faith upgrade)',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'permanent-bond',
        name: 'Permanent Bond',
        description: 'Passive: whatever you lose of your curse, your enemy gains in its place. Every bit Siphon wears off you lands on them, for good — and while the Ritual lifts your curse completely, they carry the whole of it for exactly as long.',
      },
      {
        id: 'false-idol',
        name: 'False Idol',
        bindable: true,
        hudDescription: 'Plant an idol: stand in it for growing buffs, leave it and it burns you',
        description: 'Plant an idol at your cursor with a ring of ground around it. Standing in the ring builds its favour over 8 seconds: up to 35% more damage, 20% more speed and 25% less damage taken while you stay in it. Leave it alone for more than 4 seconds and it loses patience — it zaps you with a laser every 1.2 seconds until you come back.\n\nBind (E) the idol while you have a soul on your chain to set the soul in the ring in your place: it keeps the favour growing and the idol calm while you are away, but the idol slowly drains it. 18 second cooldown; a new idol replaces the old one.',
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
    name: 'Paint Mastery',
    enhancedEmoji: '☯️',
    enhancedColor: 0xfaf8f0,
    requirements: [
      {
        key: 'wallBlocks',
        label: 'Set Like Stone',
        howTo: 'Block 50 projectiles with Congealed Paint (R) — shots, splotches and paint chip pellets all count',
        target: 50,
      },
      {
        key: 'stillLifes',
        label: 'Life Drawing',
        howTo: 'Turn 10 enemies into a Still Life (F)',
        target: 10,
      },
      {
        key: 'mpKills',
        label: 'Gallery Opening',
        howTo: 'Kill 3 enemies with red Masterpiece (Q) paint',
        target: 3,
      },
      {
        key: 'orangeHits',
        label: 'Volatile',
        howTo: 'Blow up 45 enemies with Volatile Orange (E) — each enemy a line damages counts once',
        target: 45,
      },
    ],
    enhancements: [
      {
        id: 'paint-unfinished',
        name: 'Unfinished Study',
        description: 'Passive: still on the easel. This passive is coming in a later update and does nothing yet.',
      },
      {
        id: 'yin-yang',
        name: 'Yin-Yang',
        bindable: true,
        excludeSlots: ['e'],
        hudDescription: '3.5s to paint the ability bars — white on yours recharges them faster, black on theirs slower',
        description: 'For three and a half seconds your brush paints on cooldown bars instead of the floor. Hold the mouse over your own ability bars to paint them white, or over your opponent\'s — their tray appears at the top of the screen — to paint them black.\n\nOnly the bars you painted are touched. A fully white bar recharges twice as fast; a fully black one recharges at half speed. A few strokes is a little; covering the whole bar is the most.\n\nThe paint flakes off 30 seconds after it was laid. In Invasion there is no opponent tray, so black paint goes on the horde\'s one bar and slows every husk\'s attacks instead.\n\n40 second cooldown.',
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
    enhancedEmoji: '♟️',
    enhancedColor: 0xb98cff,
    requirements: [
      {
        key: 'pieceSmashes',
        label: 'Material Advantage',
        howTo: 'Smash enemies with chess pieces — every hit from a pawn, a bishop or rook slide, a knight landing, a queen move or a castle slam counts',
        target: 100,
      },
      {
        key: 'castles',
        label: 'King Safety',
        howTo: 'Castle with a rook (F) — needs the F+ Castle upgrade',
        target: 15,
      },
      {
        key: 'queenCheckmates',
        label: 'Long Live The Queen',
        howTo: 'Checkmate foes as the queen: let a reign run its course with them under 15% health (needs the Q+ Checkmate upgrade)',
        target: 3,
      },
      {
        key: 'rookCaptures',
        label: 'Rook Takes',
        howTo: 'Destroy chess pieces by sliding a rook through them — yours, theirs, and enemy pawns all count',
        target: 20,
      },
    ],
    enhancements: [
      {
        id: 'outplayed',
        name: 'Outplayed',
        description: 'Passive: an enemy who is losing starts to play slower. Their health is measured against yours in **percent**, not in points — a tank on 300 of 400 is exactly as far behind as a duellist on 75 of 100.\n\n• **25 points** behind you (you on 100%, them on 75%): their cooldowns run **10% longer**.\n• **50 points** behind: **25% longer**.\n• **75 points** behind: **33% longer**.\n\nA **purple aura** surrounds them while it holds, and it grows louder with every step — a ring of chess squares, then a second counter-turning ring and a full checker band, then a crown of chevrons closing in on them. Close the gap and it lifts.',
      },
      {
        id: 'pre-move',
        name: 'Pre-move',
        bindable: true,
        hudDescription: 'Call a key: the next one you press. If they press it in the next 1.5s — 25 damage, a stun, and a slow or a longer cooldown',
        description: 'Make your move before they make theirs. Press Pre-move and a chess clock appears beside your head; **the next key you press is your prediction** — Click, E, R, F, Q, Space or any of W/A/S/D. Your press still does whatever it normally does.\n\nFrom that moment, if the enemy presses **that same key** within **1.5 seconds**, they are punished:\n\n• **25 damage** in a burst, and a **light stun** (0.6s).\n• If it was an **ability key**, that ability\'s cooldown runs **50% longer** — the cast they just made and every cast of it for the next 8 seconds.\n• If it was a **movement key** (Space included), they move **30% slower** for 3 seconds.\n\nOnly you can see which key you called; they only see that the clock is running. Bots get read too — their keys are the way they move, the abilities they reach for and (for Space) their dodges. 14 second cooldown; if you do not choose within 4 seconds it lapses.',
      },
    ],
  },
  clay: {
    elementId: 'clay',
    name: 'Clay Mastery',
    enhancedEmoji: '🗿',
    enhancedColor: 0x1f1b1a,
    requirements: [
      { key: 'golemAbsorbed', label: 'Damage Sponge', howTo: 'Have your golem swallow 250 damage worth of shots', target: 250 },
      { key: 'shardHits', label: 'Shredder', howTo: 'Hit enemies with 100 clay shards — Rupture, barrages, splits and upgrade shards all count', target: 100 },
      { key: 'clotBlocks', label: 'Clay Bulwark', howTo: 'Stop 25 shots with a Clay Clot (R)', target: 25 },
      { key: 'fusionKills', label: 'Annihilator', howTo: 'Kill 5 enemies while fused with your golem (Q)', target: 5 },
    ],
    enhancements: [
      {
        id: 'bedrock',
        name: 'Bedrock',
        description: 'Passive: your golem is fired to black bedrock. Standing within 175px of it you take 20% less damage — and since Fuse keeps the golem on you, the fused body has it too.\n\nWhile fused, Space is no longer a dash: you leap to the cursor over 0.6s and come down in a bedrock crash — a 150px Slam that stuns everyone it hits for 2s. The crash recharges three times slower than a dash; Slipstream still banks three of them.',
      },
      {
        id: 'give-life',
        name: 'Give Life',
        bindable: true,
        hudDescription: 'Draw a clay creature in the circle ahead; it wakes and hunts for 12s',
        description: 'A blue circle opens 112px ahead of you and for 3 seconds the cursor may draw inside it. When the clay runs out or the time does, the drawing stands up and goes looking for someone: 12 seconds of life, a bite every 0.7s.\n\nWhat you drew is what it is. The sharper the stroke\'s corners, the harder it bites — 7 for a smooth loop up to 22 for a jagged star. The rounder and more closed the shape, the faster it runs — 120px/s for a scribble up to 270 for a clean ring. Shots that hit it wear away only the clay around where they land; it dies when too little is left.\n\n6 second cooldown.',
      },
    ],
  },
  ruin: {
    elementId: 'ruin',
    name: 'Ruin Mastery',
    enhancedEmoji: '🔊',
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
        id: 'screeching-steel',
        name: 'Screeching Steel',
        bindable: true,
        hudDescription: 'A shriek that throws everyone within 190px clear, 3s immune to stuns and slows, then a 10s rusty aura that blunts melee against you by 40%',
        description: 'Drag two rusted plates of yourself across each other and let the sound out.\n\nEverybody within 190px is **thrown straight away from you** — a full throw at point blank, about half of one at the edge of the shriek. Somebody threaded on your skewer stays on it.\n\nWhatever had hold of you lets go, and for **3 seconds nothing can stun, freeze, root or slow you**. It can be screamed out of a stun: it is the escape, and an escape a stun switches off is not one.\n\nThe rust the shriek shook loose settles on you as an **aura for 10 seconds**. Every weapon within 150px of you visibly rots, and anybody rusted who gets close enough to swing at you — inside 90px — **deals 40% less**.\n\n16 second cooldown.'
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
  // Fortune Mastery (Battle Pass / Drive by Flex) was retired with the 2026-10-15 Gold rework;
  // a new one is owed.
  // Dream Mastery (Dream Duel / Lifelong Dream) was retired with the 2026-10-17 sandman rework;
  // a new one is owed.
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
      {
        key: 'realityShard',
        label: 'The Verdict\'s Shard',
        howTo: 'Somewhere behind a crack in the world, a creator waits at a piano. End what he began — and when he splits himself in two, put the golden half down first. What is left will be justice',
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
  // Sound's mastery was retired with the 2026-10-15 marching-band rework; a new one is owed.
  // Wood (id `gluttony`). The chef's Snacking / Chef's Friend and Harvest's Invasive Species /
  // Corrupt Predation masteries were retired with their elements; Wood's is owed.
  // Marrow (test element, restored 2026-10-12). Its first mastery — there is no retired one under it.
  marrow: {
    elementId: 'marrow',
    name: 'Marrow Mastery',
    enhancedEmoji: '🧠',
    enhancedColor: 0xd1435c,
    requirements: [
      {
        key: 'mastacreKills',
        label: 'Degranulated',
        howTo: 'Kill an enemy with the blast of a Mastacre (Q) mast cell',
        target: 1,
      },
      {
        key: 'cellsSummoned',
        label: 'Immune Response',
        howTo: 'Summon 25 immune cells into the bone bar — macrophages, neutrophils and T-cells all count',
        target: 25,
      },
      {
        key: 'feverPeaks',
        label: 'Running a Fever',
        howTo: 'Push your inflammation to 75 or more, 5 times — it has to fall back under 60 before the next one counts',
        target: 5,
      },
      {
        key: 'tcellsArmed',
        label: 'Antigen Presented',
        howTo: 'Activate the T-cell 5 times by landing 4 of Dendricles\' (F) 5 tentacles on one enemy',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'marrow-cellular-defense',
        name: 'Cellular Defense',
        description: 'Passive: the arena is **bricked in with your cells**. A wall of square bone cells lines every edge, edge to edge — dozens of them, **40 HP each**. Enemy shots that reach the border are spent on them, and enemies cannot walk through them; leaning on one grinds it down.\n\nEvery wall cell that dies hands you **3 inflammation**. And below **35% HP** the wall keeps you alive: you regenerate up to **8 HP a second**, scaled by how much of the wall is still standing. They never come back — keep them alive.',
      },
      {
        id: 'marrow-brainstem',
        name: 'Brainstem',
        bindable: true,
        hudDescription: 'Ride the cell nearest your cursor: WASD walks it, Click is its attack. You become an invincible bone flower until it dies',
        description: 'Take over **the summon nearest your cursor** and fight as it. **WASD walks the cell, Click is its attack** — a macrophage bites and feeds, a neutrophil stabs, a killer T throws its lunge when it is ready, and a T-cell hands its buff to the nearest cell it can touch.\n\nWhile you are out, your body folds into a **bone flower**: rooted to the spot and **invincible**. The ride lasts **until the cell dies** (at most 12 seconds), or press the bound key again to let go.\n\nNo cell on the board, no ride. **30 second cooldown**, counted from when the ride ends.',
      },
    ],
  },
  // Wax (test element, 2026-10-12). Its first mastery — it shipped without one.
  wax: {
    elementId: 'wax',
    name: 'Wax Mastery',
    enhancedEmoji: '🍯',
    enhancedColor: 0x5fb6ff,
    requirements: [
      {
        key: 'stings',
        label: 'Stinger',
        howTo: 'Sting enemies 150 times — every Stinger Strikes (Click) thrust, dart and stinger that lands counts',
        target: 150,
      },
      {
        key: 'fullHives',
        label: 'Harvest',
        howTo: 'Harvest 5 full bee hives — a Hive Hearth (F) with all five cells filled, cashed in any way',
        target: 5,
      },
      {
        key: 'selfBombBlasts',
        label: 'Rule Beetanica',
        howTo: 'Blow up enemies with the bombs strapped to yourself 3 times (Sticky Bombs Q+, hold Q)',
        target: 3,
      },
      {
        key: 'candleSeconds',
        label: 'Candlelit',
        howTo: 'Stand in the light of your own Candle Mount (R) candles for 100 seconds in total',
        target: 100,
      },
    ],
    enhancements: [
      {
        id: 'wax-honey-shell',
        name: 'Honey Shell',
        description: 'Passive: you start every match **sealed in honey comb**. The shell **blocks the next attack of 30 damage or more** outright — anything smaller goes straight through and leaves it standing.\n\nOnce it cracks it **re-forms 8 seconds later**, as many times as you can make it crack.',
      },
      {
        id: 'wax-smoke-out',
        name: 'Smoke-out',
        bindable: true,
        hudDescription: 'Hold to smoke a cloud in front of you that grows while you feed it. In it: invisible, 20% dodge. Enemies cannot see through it',
        description: 'Hold the bound key to work the smoker: a **cloud of smoke** builds in front of you and **grows for as long as you hold**. Walk away from it and the smoke starts **a new cloud** in front of you instead.\n\nStanding in your own smoke you are **invisible** and **20% of hits are lost in it**. **Enemies cannot see through the smoke — you can.** Clouds hang for 9 seconds after you stop feeding them.\n\nThe smoker holds **5 seconds** of smoke and refills while it is out.',
      },
    ],
  },
  // Dream (the sandman, 2026-10-17 rework). Its new mastery, 2026-10-18 — Dream Duel went with
  // the pendulum, so this one has to be earned again (see `dreamMasteryOn`).
  dream: {
    elementId: 'dream',
    name: 'Dream Mastery',
    enhancedEmoji: '🕸️',
    enhancedColor: 0xa87b52,
    requirements: [
      {
        key: 'sleeps',
        label: 'Lights Out',
        howTo: 'Put enemies to sleep 25 times',
        target: 25,
      },
      {
        key: 'dreamKills',
        label: 'Never Woke Up',
        howTo: 'Kill 10 enemies while you are inside their dream',
        target: 10,
      },
      {
        key: 'nightmares',
        label: 'Bad Dreams',
        howTo: 'Give enemies a nightmare 10 times — the walking nightmare catching them counts',
        target: 10,
      },
      {
        key: 'reloads',
        label: 'Sandman\'s Hours',
        howTo: 'Reload 50 times — Sandmen, the dream pistols, and every Amnesia throw count',
        target: 50,
      },
    ],
    enhancements: [
      {
        id: 'dream-dreamcatcher',
        name: 'Dreamcatcher',
        description: 'Passive: a **large dreamcatcher** is slung on your back. While you are inside somebody\'s dream, they sometimes let a dream slip — a small **green orb, a good dream**, that flies to you and is caught in the web. If they are **in a nightmare** the orbs come out **red** instead.\n\nA caught dream takes **5 seconds to digest**. A good dream then **heals 10**; a nightmare is **+10% damage for 10 seconds**, stacking up to five.',
      },
      {
        id: 'dream-music-box',
        name: 'Music-box',
        bindable: true,
        hudDescription: 'Hold to wind a music box, release to throw it. Its lullaby makes anyone standing in it drowsy — up to 20s after a 5s wind',
        description: 'Hold the bound key to **wind up a music box** — the longer you wind it, the longer it plays. Let go to **throw it to your cursor**, where it opens and plays a lullaby: everyone standing in its reach grows **a little drowsy**, 4 every second.\n\nFive seconds of winding is the most it takes — **20 seconds of music** — and at five seconds it throws itself. **12 second cooldown.**',
      },
    ],
  },
  // Tempest (test element, 2026-10-12). Its first mastery — it shipped without one.
  tempest: {
    elementId: 'tempest',
    name: 'Tempest Mastery',
    enhancedEmoji: '🌩️',
    enhancedColor: 0x4f6d99,
    requirements: [
      {
        key: 'wallBlasts',
        label: 'Wall Slam',
        howTo: 'Blast enemies into a wall 25 times — every Wall Slam counts, the Eye of the Storm\'s bounces included',
        target: 25,
      },
      {
        key: 'airSeconds',
        label: 'Frequent Flyer',
        howTo: 'Spend 60 seconds in the air in total, over as many flights as it takes',
        target: 60,
      },
      {
        key: 'slamKills',
        label: 'Grounded',
        howTo: 'Kill an enemy by slamming them into the ground — the crash of a Final Forecast (Q) grapple',
        target: 1,
      },
      {
        key: 'forecastKills',
        label: 'As Forecast',
        howTo: 'Kill an enemy during your forecasted storm 3 times — the weather Herald of Doom (Q+) brings',
        target: 3,
      },
    ],
    enhancements: [
      {
        id: 'tempest-unrelenting-storm',
        name: 'Unrelenting Storm',
        description: 'Passive: **your storm never lifts**. A very tame Herald\'s weather hangs over every match — a **rare, random thunderstrike**, a **spotty fall of hail**, **a few rain puddles**, and a **light breeze that pushes enemies toward the right of the screen** (never you). It gives no extra elevation.\n\nA bank of cloud lines the top of the arena the whole time, and it **turns dark and dangerous** while your Herald of Doom weather is live.',
      },
      {
        id: 'tempest-gale-uppercut',
        name: 'Gale Uppercut',
        bindable: true,
        hudDescription: 'Dash and uppercut: 8 damage, and the enemy is thrown into the air. Click juggles them higher; the floor hurts the faster they hit it',
        description: 'Dash forward and drive a **deadly uppercut** into the first enemy you meet. It only deals **8 damage** — but it **launches them into the air**, where they cannot move until they come down.\n\nWhen they hit the floor they take damage **by how fast they were falling**: up to **60**. A **Click** that bursts on them while they are up **juggles them higher**, and higher is harder.\n\n**9 second cooldown.**',
      },
    ],
  },
  // Myth (test element, 2026-10-15). Its first mastery — it shipped without one.
  myth: {
    elementId: 'myth',
    name: 'Myth Mastery',
    enhancedEmoji: '🌀',
    enhancedColor: 0xff4a5e,
    requirements: [
      {
        key: 'shardsSpent',
        label: 'Echoes',
        howTo: 'Spend 25 Echo Shards, on any of their second acts',
        target: 25,
      },
      {
        key: 'fpsDamage',
        label: 'First Person',
        howTo: 'Deal 250 damage in Final Destiny\'s (Q) first person, over as many casts as it takes',
        target: 250,
      },
      {
        key: 'parries',
        label: 'Turned Aside',
        howTo: 'Parry 25 hits with Parry (R)',
        target: 25,
      },
      {
        key: 'excaliburSlashes',
        label: 'Excalibur',
        howTo: 'Slash enemies with Excalibur 25 times — Truth Breaker (E), its dash and the riposte all count',
        target: 25,
      },
    ],
    enhancements: [
      {
        id: 'myth-last-stand',
        name: 'Indomitable',
        description: 'Passive: the hit that should kill you **leaves you at 1 HP** instead, enraged and running red, **for 8 seconds**. Nothing can take that last point.\n\nDeal **75 damage** in those eight seconds and **the crowd gives you a second breath**: you are back up at **full health**. Fall short, and you fall.\n\n**Once a match.**',
      },
      {
        id: 'myth-wormhole',
        name: 'Wormhole',
        bindable: true,
        hudDescription: 'Throw a portal forward. Whoever it catches is trapped in the Lands of Myth for 8s, fighting beasts and beyonders. Stand by the red portal to peer in',
        description: 'Launch a **portal** straight ahead. The first enemy it catches is **trapped in the Lands of Myth for 8 seconds** — gone from the arena, untouchable, and fighting for their life on a starry plain of obsidian against **tanky slow beasts, fast small ones, mounted beyonders that throw spears and beyonders on foot that stab**. They can kill them; **more always come**.\n\nThe portal **stays on the field, glowing red**, until they come back out of it. **Stand next to it to peer in** and watch.\n\n**20 second cooldown.**',
      },
    ],
  },
  // Gold. The element id is `fortune` (it replaced the shopkeeper of that name); the shopkeeper's
  // Battle Pass / Drive by Flex mastery was retired with it on 2026-10-15, and its stat keys
  // (`coinsEarned` and friends) are deliberately not reused.
  fortune: {
    elementId: 'fortune',
    name: 'Gold Mastery',
    enhancedEmoji: '👑',
    enhancedColor: 0xf0c33c,
    requirements: [
      {
        key: 'goldMade',
        label: 'Prospector',
        howTo: 'Earn 100 gold — build up your tycoon, gild hearts and lose gold health',
        target: 100,
      },
      {
        key: 'jewelsBought',
        label: 'Artisan',
        howTo: 'Buy jeweled cards from Advance (needs the E+ Artisan corrupt upgrade)',
        target: 10,
      },
      {
        key: 'heartAttacks',
        label: 'Cardiologist',
        howTo: 'Give enemies heart attacks with Heart of Gold (F)',
        target: 20,
      },
      {
        key: 'rebirths',
        label: 'Born Again',
        howTo: 'Complete your tycoon and Rebirth (Q)',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'gilded-augment',
        name: 'Gilded Augment',
        description: 'Passive: the purse pays for your life. Drop below **30% HP** and the alchemist starts **spending gold on gold health**, automatically — **16 a second** — and moves **30% faster** while it works, until your health and gold health together are back to 55%.\n\n**Gold health** is spent before your own, and every 10 of it an enemy cuts away **pays you 1 gold back**.\n\nIt starts cheap (about **2 gold a second**) and gets **dearer the longer it runs**: the price climbs every second it has to keep you standing. Run out of gold and it stops.',
      },
      {
        id: 'no-pain-no-gain',
        name: 'No Pain, No Gain',
        bindable: true,
        hudDescription: 'Stab yourself for 18. Your blood sprays out behind you, away from the cursor, and turns to gold. Stand on it: 1 gold every 2 seconds',
        description: 'Stab yourself with a **golden dagger** for **18 damage** (it never kills you). The blood **sprays out the other side of you** — away from your cursor — in a rough, widening splatter, and a moment later **every drop of it turns to gold**.\n\n**Stand on your gold** and it pays **1 gold every 2 seconds**. The gold stays for the rest of the match, and you can lay more.\n\nGold health takes the dagger first — and gold health pays you when it is cut.\n\n**7 second cooldown.**',
      },
    ],
  },
  // Sound. The marching-band rework (2026-10-15) retired Audience Participation / Compose; this is
  // the drum major's own (2026-10-18). Its stat keys are new, and `soundMasteryOn` checks
  // completion, because the old mastery may have left the flag on.
  sound: {
    elementId: 'sound',
    name: 'Sound Mastery',
    enhancedEmoji: '🎹',
    enhancedColor: 0xf0c04e,
    requirements: [
      {
        key: 'metronomeHits',
        label: 'Keeping Time',
        howTo: 'Hit the metronome 100 times — click while the note is in the gold window',
        target: 100,
      },
      {
        key: 'voidNotes',
        label: 'First Chair',
        howTo: 'Play 25 notes successfully in Call of the Void (Q)',
        target: 25,
      },
      {
        key: 'songsMaxed',
        label: 'Repertoire',
        howTo: 'Max out all 3 soul songs in one game — level 10 Staccato, Melody and Smooth (needs the F+ Practice Makes Perfect upgrade)',
        target: 1,
      },
      {
        key: 'tuneDetonations',
        label: 'Resolution',
        howTo: 'Detonate 25 Out of Tune enemies',
        target: 25,
      },
    ],
    enhancements: [
      {
        id: 'autotune',
        name: 'Autotune',
        description: 'Passive: your soul song changes itself to whatever the moment calls for.\n\n• **Low on health** (under 35%) — always **Smooth**, wherever the enemy is.\n• **In fighting distance** of an enemy — **Staccato**.\n• **Far from every enemy and healthy** (60%+) — **Melody**.\n\nAnywhere in between it leaves the song alone, and a song you pick yourself with F is respected for 3 seconds. A switch **right below your HP bar** turns Autotune on and off.',
      },
      {
        id: 'forte-piano',
        name: 'Forte Piano',
        bindable: true,
        hudDescription: 'Sit at a grand piano for 5s and click its 8 white keys — the more melodious, the more charge. Then fling it: 2s later it crashes on your cursor, harder the more charge. High charge leaves them Out of Tune; recast to detonate',
        description: 'Sit down at a **grand piano** for **5 seconds**. Eight real white keys appear in front of you (the black keys are there too, but they do not count) — **click them to play**. The more **melodious** the tune, the more **charge** the piano builds: steps, thirds, fifths and octaves sound good, a steady rhythm sounds better, mashing sounds awful, and ending on a C resolves it.\n\nThen you pick the piano up and **fling it into the air**. **2 seconds** later it comes **crashing down on your cursor** — the more charge, the harder it hits (20 up to 110).\n\nAt **high charge** (60%+) everyone it crushes is left **Out of Tune** — **recast** to detonate them.\n\n**Two stacks**: an enemy out of tune from both a Fermata *and* the piano is **Dissonant** — 40% slower and bleeding health until it is detonated, and then **both stacks go off at once**.\n\nRecast while seated to fling early. 12 second cooldown, from the crash.',
      },
    ],
  },
  // Magnet. The scrap rework (2026-10-15) retired Metal Detector / Mag-Lev board; this is the
  // mastery built for the new kit (2026-10-17). Its stat keys are new, so an old save's progress
  // does not carry over — and `magnetMasteryOn` checks completion, because the old flag may linger.
  magnet: {
    elementId: 'magnet',
    name: 'Magnet Mastery',
    enhancedEmoji: '🚄',
    enhancedColor: 0xff3344,
    requirements: [
      {
        key: 'coinHits',
        label: 'Pocket Change',
        howTo: 'Hit foes 100 times with coins — Repulsed coin shots and Shatter Shot fragments both count',
        target: 100,
      },
      {
        key: 'scrapBlocks',
        label: 'Scrap Shield',
        howTo: 'Block 10 projectiles with your orbiting scrap',
        target: 10,
      },
      {
        key: 'nailedRepulses',
        label: 'Hammer and Tongs',
        howTo: 'Shove nailed foes with Repulse (E) 25 times',
        target: 25,
      },
      {
        key: 'mechKills',
        label: 'Scrap Heap',
        howTo: 'Destroy 10 foes while piloting the Mecha Massacre mech (Q)',
        target: 10,
      },
    ],
    enhancements: [
      {
        id: 'magnetic-field',
        name: 'Magnetic Field',
        description: 'Passive: a very faint blue field hangs round you. Every enemy projectile that enters it is **bent 2°** off its line, away from your centre — not much, but a shot that would have clipped you now goes by.',
      },
      {
        id: 'mag-lev',
        name: 'Mag-Lev',
        bindable: true,
        hudDescription: 'Lay a steerable track of crackling maglev ground for 10s: you float on it 50% faster, magnetised/nailed foes on it move 50% slower, coins over it never land, Repulse it to fly backward',
        description: 'Magnetise the ground. A track of **crackling red energy** runs out from your feet toward the cursor — and keeps following the cursor while it is laid, so you can **steer it** round corners, like Shadow\'s tentacle wall. The ground stays magnetised for **10 seconds**.\n\nOn your maglev ground:\n\n• **You float** — like Magic\'s Levitate, the floor\'s own hazards cannot touch you — and move **50% faster**.\n• **Magnetised foes move 50% slower** (a nail in them counts).\n• **Coins never touch the ground** — a coin over the track hangs in the air until the magnetism wears off.\n• **Repulse (E) the ground** and it throws *you*: you fly backward, away from where you aimed.\n\n14 second cooldown.',
      },
    ],
  },
  // Devotion (id `passion`). The charmer's Attraction/Perfume mastery was retired with it; this is
  // the priest's (2026-10-17). Its stat keys are new, and `passionMasteryOn` checks completion,
  // because the old mastery may have left the flag on.
  passion: {
    elementId: 'passion',
    name: 'Devotion Mastery',
    enhancedEmoji: '🕊️',
    enhancedColor: 0xe8b93a,
    requirements: [
      {
        key: 'souls',
        label: 'Shepherd',
        howTo: 'Convert 50 souls — every foe whose faith bar fills counts',
        target: 50,
      },
      {
        key: 'chariotRides',
        label: 'Swing Low',
        howTo: 'Be carried off by your own Ascendance chariot (Q) 3 times',
        target: 3,
      },
      {
        key: 'holyWaterFaith',
        label: 'Baptism of Fire',
        howTo: 'Burn foes for 150 faith in total with Holy Water (E)',
        target: 150,
      },
      {
        key: 'grenadeHits',
        label: 'Count to Three',
        howTo: 'Catch 10 foes in Holy Hand Grenade (R) blasts',
        target: 10,
      },
    ],
    enhancements: [
      {
        id: 'pray-always',
        name: 'Pray Always',
        description: 'Passive: every **8 seconds** you say a prayer of your own accord — your hands come together and a little prayer hangs over your head — and **5 seconds** later it is answered with one of:\n\n• **Shelter** — 25% less damage for 5 seconds.\n• **Mercy** — heal 50 HP.\n• **Revelation** — a ray of light from the sky gives the nearest enemy **35 faith** at once.\n\nMercy is never sent at full health, nor Revelation with nobody to shine on.',
      },
      {
        id: 'ark-of-the-covenant',
        name: 'Ark of the Covenant',
        bindable: true,
        hudDescription: 'Set down the Ark for 12s: foes who look toward it gain faith slowly. Under half faith they try to look away; over half their sight — and a player\'s aim — is pulled toward it',
        description: 'Set down the golden box of legend, up to 380px away. For **12 seconds**, every enemy who **looks toward it** gains faith slowly (5 a second).\n\n• **Under 50% faith**, enemies try to **avert their eyes** — and their aim goes with them.\n• **Over 50% faith**, their sight is **pulled toward the Ark**, a little more the more devout they are. That includes a player: their aim bends toward it.\n\nPlayers never avert their eyes; they only feel the pull once they are past half. 18 second cooldown.',
      },
    ],
  },
  // Radiation. The 2026-10-15 rework retired Sniper's Instinct / Gamma Tether; this is the mastery
  // built for the new kit (2026-10-17). Its stat keys are new, and `radiationMasteryOn` checks
  // completion, because the old mastery may have left the flag on.
  radiation: {
    elementId: 'radiation',
    name: 'Radiation Mastery',
    enhancedEmoji: '🩻',
    enhancedColor: 0x7cff3d,
    requirements: [
      {
        key: 'snipes',
        label: 'Marksman',
        howTo: 'Snipe enemies 50 times — every confirmed Railgun shot counts',
        target: 50,
      },
      {
        key: 'flickHits',
        label: 'No-Scope',
        howTo: 'Land 5 Flick Shots (needs the Click+ Flick Shot corrupt upgrade)',
        target: 5,
      },
      {
        key: 'mutations',
        label: 'Mad Scientist',
        howTo: 'Mutate 20 enemies with the hot Rod Baton (needs the F+ Mutation corrupt upgrade)',
        target: 20,
      },
      {
        key: 'barrageHits',
        label: 'Suppressing Fire',
        howTo: 'Hit 35 enemies with your Barrage (E) — each burst that lands counts once',
        target: 35,
      },
    ],
    enhancements: [
      {
        id: 'x-ray-vision',
        name: 'X-Ray Vision',
        description: 'Passive: you see straight through them. Every enemy carries a **green outline** on your screen — and the outline does not care whether they are visible. Stealthed, camouflaged, faded or hiding, **you can see where they are**.',
      },
      {
        id: 'test-dummy',
        name: 'Test Dummy',
        bindable: true,
        hudDescription: 'Throw out a 25 HP test dummy tied to you by a green link. Until it dies you cannot be hurt — every hit runs down the link into it — and bots switch to attacking it',
        description: 'Throw out a **crash-test dummy**, tied to you by a faint **green link**. It has **25 HP**.\n\nUntil the dummy dies, **you cannot be hurt**: every hit that would land on you runs down the link and into the dummy instead. Bots and husks know it — they **switch to attacking the dummy**, and shots that hit it stop there.\n\nIt stands for 12 seconds if nobody breaks it, and it takes your own airdrop for you, like the bunker does.\n\n16 second cooldown.',
      },
    ],
  },
  // Quantum's mastery is unlike every other: its three enhancements are not a passive and a
  // bindable of Quantum's own but three *permissions* on the customization page — see
  // `QuantumLoadout.ts`. None of them is bindable, so the generic mastery loadout section
  // (drag a chip onto R/F/Q) stays empty for it; the sixth key is a slot of its own.
  quantum: {
    elementId: 'quantum',
    name: 'Quantum Mastery',
    enhancedEmoji: '🌀',
    enhancedColor: 0x2a7f8a,
    requirements: [
      {
        key: 'entangled',
        label: 'Many Worlds',
        howTo: 'Entangle 8 elements in the Entanglement Lab (Fire and Water count)',
        target: 8,
        isBest: true,
      },
      {
        key: 'shifts',
        label: 'Collapse',
        howTo: "Shift element 250 times mid-fight by pressing another slot's key",
        target: 250,
      },
      {
        key: 'wins',
        label: 'Superposition',
        howTo: 'Win 10 fights as Quantum',
        target: 10,
      },
      {
        key: 'spreadWins',
        label: 'Full Spread',
        howTo: 'Win 5 fights as Quantum having used all five slots in the fight',
        target: 5,
      },
    ],
    enhancements: [
      {
        id: 'borrowed-passive',
        name: 'Borrowed Passive',
        description: "Carry one mastery passive from any entangled element whose mastery you have completed — Fire's Burning Body, Air's dodge, whichever one you choose on Quantum's customization page. It is always on, like it would be on its own element.",
      },
      {
        id: 'sixth-slot',
        name: 'Sixth Slot',
        description: 'A sixth key, G, carrying any mastery ability from any entangled element whose mastery you have completed. Pressing G makes you that element for the cast, exactly as the five slots do; the ability keeps its own cooldown.',
      },
      {
        id: 'alternate-collapse',
        name: 'Alternate Collapse',
        description: "Your Q slot can be switched to its element's alternate ultimate, when that element has one unlocked.",
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
