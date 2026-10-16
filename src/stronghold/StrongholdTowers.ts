import type { TowerAbilityDef, TowerDef, TowerSlot } from './StrongholdTypes';

/**
 * The tower movesets — one per element.
 *
 * Every entry keeps the element's own vocabulary: the five slots carry the real ability names
 * (resolved from the element definition at runtime unless overridden here), the real
 * projectile textures where one exists, and the real statuses. The *mechanics* are the
 * tower-shaped reading of each ability: Fire's Flame Dash becomes a lunge of flame along the
 * path because a tower cannot dash, Earth's Repair becomes a wall the husks have to chew
 * through, Time's Remain becomes a halt on everything inside its ring.
 *
 * Damage numbers are tier-0 values; `TIER_DAMAGE_MULT` ramps them. Auras, zones and beams
 * state damage per second.
 */

type Fx = TowerAbilityDef['fx'];
const ab = (damage: number, cooldown: number, fx: Fx, desc: string, extra: Partial<TowerAbilityDef> = {}): TowerAbilityDef =>
  ({ damage, cooldown, fx, desc, ...extra });

const ORB = 'sh-orb';

export const TOWER_DEFS: Record<string, TowerDef> = {
  // ── The base five ─────────────────────────────────────────────────────
  fire: {
    tiers: ['Ember', 'Kindling', 'Bonfire', 'Inferno', 'Pyre'],
    cost: 90, range: 190,
    abilities: {
      click: ab(14, 700, { kind: 'bolt', texture: 'proj-fire', color: 0xff4400, speed: 520 }, 'Lobs fireballs down the path.'),
      e: ab(16, 3200, { kind: 'line', length: 200, width: 46, color: 0xff6a1e }, 'A streak of flame along the path through everything in it.'),
      r: ab(34, 4800, { kind: 'splash', radius: 95, color: 0xff3300, delayMs: 1200, shape: 'crater' }, 'Plants a charge on the path; it blows 1.2s later.', { rider: { burn: 2500 } }),
      f: ab(6, 500, { kind: 'aura', radius: 120, color: 0xff7733 }, 'The tower sheds heat: husks passing close burn.', { rider: { burn: 1200 } }),
      q: ab(120, 16000, { kind: 'splash', radius: 170, color: 0xffaa00, delayMs: 1600, shape: 'strike' }, 'Charges 1.6s, then a huge blast on the path.', { rider: { burn: 4000 } }),
    },
    upgrades: {
      click: { rider: { burn: 3000 }, note: 'fireballs ignite' },
      e: { damageMult: 1.3, areaMult: 1.2, note: 'explosions along the streak' },
      r: { countAdd: 1, areaMult: 1.35, note: 'bomblets widen the crater' },
      f: { damageMult: 2, note: 'the heat aura burns twice as hard' },
      q: { cooldownMult: 0.75, note: 'a second fuse after the Nuke' },
    },
    mastery: { ...ab(0, 6000, { kind: 'line', length: 260, width: 60, color: 0xffee66 }, 'A piercing wave that Exposes every husk it touches.', { rider: { expose: 5000 } }), name: 'Heatwave' },
  },
  water: {
    tiers: ['Spring', 'Brook', 'Torrent', 'Maelstrom', 'Deluge'],
    cost: 80, range: 230,
    abilities: {
      click: ab(12, 650, { kind: 'bolt', texture: 'proj-water', color: 0x0088ff, speed: 560, pierce: 1 }, 'Long water slashes that cut through one body.'),
      e: ab(6, 3600, { kind: 'zone', radius: 70, ms: 3500, color: 0x3399ff, shape: 'puddle' }, 'Puddles that slow and sting whatever walks through.', { rider: { slow: { mult: 0.6, ms: 900 } } }),
      r: ab(10, 7000, { kind: 'rally', radius: 160, ms: 4000, fireRateMult: 1.35, color: 0x66ccff }, 'A geyser that quickens every nearby tower for 4s.'),
      f: ab(40, 4200, { kind: 'bolt', texture: 'proj-pressure-dagger', color: 0xbbeeff, speed: 700, pierce: 4 }, 'A charged dagger that runs the length of the path.'),
      q: ab(9, 14000, { kind: 'zone', radius: 230, ms: 5000, color: 0x55aaff, shape: 'puddle' }, 'Rain falls over the whole stretch for 5s.', { rider: { slow: { mult: 0.7, ms: 800 } } }),
    },
    upgrades: {
      click: { rider: { weaken: { mult: 1.15, ms: 4000 } }, note: 'dehydration — hits land harder after' },
      e: { areaMult: 1.5, note: 'the final puddle is 1.5× wider' },
      r: { damageMult: 1, rider: { burn: 1500 }, note: 'the geyser scalds' },
      f: { pierceAdd: 3, damageMult: 1.25, note: 'a fully charged dagger' },
      q: { areaMult: 1.2, note: 'squall splashes linger' },
    },
    mastery: { ...ab(8, 7000, { kind: 'line', length: 240, width: 90, color: 0xffffff }, 'A cone that floods husks with dehydration.', { rider: { weaken: { mult: 1.3, ms: 5000 } } }), name: 'Siphon' },
  },
  life: {
    tiers: ['Seedling', 'Sprout', 'Grove', 'Canopy', 'Heartwood'],
    cost: 85, range: 180,
    abilities: {
      click: ab(6, 800, { kind: 'bolt', texture: 'proj-life', color: 0x44cc44, speed: 480, count: 3, spread: 0.3 }, 'Three petals in a spread.'),
      e: ab(8, 7000, { kind: 'summon', ms: 9000, color: 0x55dd55, attackMs: 900, attackRange: 70, label: '🌱' }, 'Plants a seed on the path; it lashes husks that pass it.'),
      r: ab(0, 9000, { kind: 'rally', radius: 170, ms: 5000, damageMult: 1.3, color: 0xffee55 }, 'Fertilize: nearby towers hit 30% harder for 5s.'),
      f: ab(20, 5500, { kind: 'barrier', ms: 6000, hp: 90, color: 0x33aa33, label: '🌿' }, 'A thicket roots across the path; husks must chew through.'),
      q: ab(10, 15000, { kind: 'zone', radius: 150, ms: 6000, color: 0x66ff66, shape: 'rune' }, 'Thrive: the ground itself bites for 6s.', { rider: { slow: { mult: 0.75, ms: 600 } } }),
    },
    upgrades: {
      click: { countAdd: 2, note: 'five petals a shot' },
      e: { damageMult: 1.5, note: 'hardier plants' },
      r: { cooldownMult: 0.75, note: 'the buff sticks' },
      f: { rider: { slow: { mult: 0.6, ms: 3000 } }, damageMult: 1.4, note: 'living roots lash and slow' },
      q: { cooldownMult: 0.8, note: 'the cycle turns faster' },
    },
    mastery: { ...ab(0, 12000, { kind: 'rally', radius: 220, ms: 8000, damageMult: 1.2, fireRateMult: 1.2, color: 0xddbb22 }, 'Reap a plant for a 20s surge of growth around it.'), name: 'Reap' },
  },
  air: {
    tiers: ['Breeze', 'Gust', 'Squall', 'Gale', 'Tempest'],
    cost: 80, range: 210,
    abilities: {
      click: ab(12, 520, { kind: 'bolt', color: 0xaaddff, speed: 640, pierce: 1 }, 'A fan cut and the shear of wind behind it.'),
      e: ab(18, 3000, { kind: 'nova', radius: 110, color: 0xcceeff }, 'A full spin — everything close to the tower is cut.', { rider: { knockback: 40 } }),
      r: ab(15, 4500, { kind: 'bolt', color: 0xeaf6ff, speed: 420, pierce: 6, size: 1.4 }, 'Both fans thrown as a glaive that passes through the whole line.'),
      f: ab(0, 6000, { kind: 'splash', radius: 110, color: 0xffffff, shape: 'ring' }, 'A hook of wind throws the pack back down the path.', { rider: { knockback: 90 } }),
      q: ab(10, 15000, { kind: 'zone', radius: 120, ms: 5000, color: 0xbbddff, shape: 'rune' }, 'A tornado parks on the path for 5s, dragging husks around.', { rider: { slow: { mult: 0.4, ms: 500 } } }),
    },
    upgrades: {
      click: { countAdd: 1, note: 'every third splice brings a spin' },
      e: { cooldownMult: 0.6, note: 'two charges' },
      r: { damageMult: 1.3, note: 'afterimages keep cutting' },
      f: { damageMult: 1, rider: { knockback: 140 }, note: 'final flight — a harder throw' },
      q: { areaMult: 1.25, note: 'a wider tornado' },
    },
    mastery: { ...ab(0, 9000, { kind: 'rally', radius: 200, ms: 4000, fireRateMult: 1.5, color: 0xccddff }, 'Winds of Change: nearby towers reload much faster.'), name: 'Winds of Change' },
  },
  earth: {
    tiers: ['Pebble', 'Boulder', 'Bulwark', 'Mountain', 'Titan'],
    cost: 100, range: 150,
    abilities: {
      click: ab(26, 1100, { kind: 'bolt', color: 0x887755, speed: 440, size: 1.3 }, 'Bashes the nearest husk with a thrown shield.', { rider: { knockback: 20 } }),
      e: ab(10, 6000, { kind: 'barrier', ms: 7000, hp: 160, color: 0x9a8866, label: '🛡️' }, 'Raises a stone shield across the path.'),
      r: ab(8, 400, { kind: 'aura', radius: 95, color: 0xbbaa88 }, 'Four orbiting rocks batter anything that comes close.'),
      f: ab(5, 5000, { kind: 'zone', radius: 110, ms: 5000, color: 0xaa9977, shape: 'rune' }, 'Quake: a fractured zone that trips husks.', { rider: { stun: 500, chance: 0.35 } }),
      q: ab(30, 18000, { kind: 'summon', ms: 15000, color: 0x776655, attackMs: 1200, attackRange: 90, label: '🗿' }, 'A Golem stands on the path for 15s.'),
    },
    upgrades: {
      click: { damageMult: 1.3, note: 'double shield — heavier bashes' },
      e: { damageMult: 2, note: 'the wall holds twice as long' },
      r: { countAdd: 2, damageMult: 1.2, note: 'launched rocks' },
      f: { areaMult: 1.3, note: 'a wider quake' },
      q: { damageMult: 1.4, note: 'biomes bless the golem' },
    },
    mastery: { ...ab(0, 8000, { kind: 'splash', radius: 130, color: 0xcfc3a8, shape: 'ring' }, 'Dust Screen: husks caught blunder about, slowed.', { rider: { slow: { mult: 0.45, ms: 3500 } } }), name: 'Dust Screen' },
  },

  // ── Combined ──────────────────────────────────────────────────────────
  oil: {
    tiers: ['Drip', 'Slick', 'Refinery', 'Derrick', 'Gusher'],
    cost: 95, range: 200,
    abilities: {
      click: ab(5, 300, { kind: 'bolt', texture: 'proj-oil', color: 0x664400, speed: 500 }, 'Drones peck at the path with a stream of shots.'),
      e: ab(4, 5000, { kind: 'zone', radius: 80, ms: 6000, color: 0x553300, shape: 'puddle' }, 'A rolling barrel leaves oily puddles that slow.', { rider: { slow: { mult: 0.55, ms: 1000 } } }),
      r: ab(30, 4000, { kind: 'bolt', color: 0x885522, speed: 380, splash: 80, splashMult: 0.8, homing: true }, 'A drone dives and explodes on arrival.'),
      f: ab(0, 10000, { kind: 'barrier', ms: 5000, hp: 110, color: 0x44ccaa, label: '⬡' }, 'A hexagonal generator seals the path for 5s.'),
      q: ab(16, 15000, { kind: 'line', length: 320, width: 50, color: 0x222222 }, 'The train: a snake of drones ploughs the length of the path.', { rider: { knockback: 60 } }),
    },
    upgrades: {
      click: { damageMult: 1.4, note: 'bomb drones' },
      e: { areaMult: 1.3, note: 'a steered barrel' },
      r: { countAdd: 1, note: 'overclocked drones dump their rounds' },
      f: { cooldownMult: 0.7, note: 'the generator stays charged' },
      q: { rider: { burn: 2500 }, note: 'coal overload — the puddles ignite' },
    },
    mastery: { ...ab(14, 9000, { kind: 'beam', color: 0xff8833, width: 7, ms: 3000 }, 'Turret: a mounted laser holds a husk for 3s.'), name: 'Turret' },
  },
  shadow: {
    tiers: ['Shade', 'Gloom', 'Umbra', 'Eclipse', 'Abyss'],
    cost: 100, range: 200,
    abilities: {
      click: ab(10, 700, { kind: 'bolt', color: 0x552277, speed: 460, splash: 50, splashMult: 0.5 }, 'Dark bombs that leave a pool where they land.'),
      e: ab(10, 3000, { kind: 'beam', color: 0x331144, width: 9, ms: 3000 }, 'A tentacle holds a husk for 3s and squeezes.', { rider: { slow: { mult: 0.5, ms: 3000 } } }),
      r: ab(25, 6000, { kind: 'zone', radius: 40, ms: 12000, color: 0x442255, shape: 'rune' }, 'A snap trap on the path: 20% slow to whatever steps in.', { rider: { slow: { mult: 0.8, ms: 4000 } } }),
      f: ab(14, 7000, { kind: 'line', length: 220, width: 40, color: 0x220033 }, 'A wall of spiked tentacles erupts along the path.', { rider: { bleed: 3000 } }),
      q: ab(30, 18000, { kind: 'zone', radius: 130, ms: 4000, color: 0x110022, shape: 'rune' }, 'A black hole drags the pack to a halt for 4s.', { rider: { slow: { mult: 0.2, ms: 600 } } }),
    },
    upgrades: {
      click: { rider: { slow: { mult: 0.7, ms: 2000 } }, note: 'cloud confusion' },
      e: { damageMult: 1.6, note: 'consume' },
      r: { areaMult: 1.5, note: 'traps are 50% larger' },
      f: { countAdd: 1, damageMult: 1.2, note: 'watchers lob dark shots' },
      q: { damageMult: 1.3, note: 'void singularity' },
    },
    mastery: { ...ab(45, 8000, { kind: 'splash', radius: 90, color: 0x6622aa, delayMs: 900, shape: 'strike' }, 'Shadow Beacon: a mortar shells the marked spot.'), name: 'Shadow Beacon' },
  },
  ice: {
    tiers: ['Frost', 'Rime', 'Glacier', 'Permafrost', 'Absolute Zero'],
    cost: 90, range: 210,
    abilities: {
      click: ab(11, 700, { kind: 'bolt', texture: 'proj-ice', color: 0x88ccff, speed: 520, pierce: 2 }, 'Piercing ice spikes; each hit adds a frost stack.', { rider: { frost: 1 } }),
      e: ab(16, 2600, { kind: 'beam', color: 0xcceeff, width: 5, ms: 800 }, 'A frost beam — hits harder the more frost the target carries.', { rider: { frost: 1 } }),
      r: ab(0, 8000, { kind: 'rally', radius: 150, ms: 5000, damageMult: 1.25, color: 0xaaddff }, 'Block Up: nearby towers brace and hit 25% harder.'),
      f: ab(6, 5000, { kind: 'zone', radius: 90, ms: 5000, color: 0xbbeeff, shape: 'ice' }, 'An icy trail that slows and stacks frost.', { rider: { frost: 1, slow: { mult: 0.6, ms: 800 } } }),
      q: ab(30, 16000, { kind: 'line', length: 260, width: 110, color: 0xe6f7ff }, 'Frozen Solid: a cone that freezes everything in it for 3s.', { rider: { freeze: 3000 } }),
    },
    upgrades: {
      click: { countAdd: 1, note: 'slush thrower' },
      e: { rider: { frost: 2 }, note: 'frost lingers' },
      r: { damageMult: 1, rider: { frost: 1 }, note: 'black ice' },
      f: { areaMult: 1.3, note: 'a longer skate trail' },
      q: { damageMult: 1.25, note: 'shatter strike' },
    },
    mastery: { ...ab(50, 9000, { kind: 'bolt', color: 0xffffff, speed: 300, size: 1.6, pierce: 3, texture: 'proj-ice' }, 'Icicle Impale: a great icicle skewers the line.', { rider: { frost: 2 } }), name: 'Icicle Impale' },
  },
  subterfuge: {
    tiers: ['Pickpocket', 'Cutpurse', 'Racketeer', 'Kingpin', 'Shadow Cabinet'],
    cost: 95, range: 220,
    abilities: {
      click: ab(8, 450, { kind: 'bolt', texture: 'proj-subterfuge', color: 0xcc2233, speed: 620 }, 'Throws daggers that plant where they land.'),
      e: ab(2, 90, { kind: 'bolt', color: 0xffcc66, speed: 800, spread: 0.26, size: 0.6 }, 'Spray: a stream of hitscan bullets in a cone.'),
      r: ab(12, 9000, { kind: 'summon', ms: 10000, color: 0xcc2233, attackMs: 600, attackRange: 160, label: '🕴️' }, 'Recruits a lackey who sprays the path for 10s.'),
      f: ab(0, 6000, { kind: 'gold', amount: 6, color: 0xffd700 }, 'Bribe: skims gold off every husk passing by.'),
      q: ab(60, 20000, { kind: 'splash', radius: 150, color: 0x111111, delayMs: 2000, shape: 'strike' }, 'Dark Treachery: black fog gathers, then detonates.'),
    },
    upgrades: {
      click: { countAdd: 1, note: 'blade dance' },
      e: { damageMult: 1.3, note: 'steady hands' },
      r: { damageMult: 1.4, note: 'the rolodex' },
      f: { damageMult: 1, cooldownMult: 0.7, note: 'hardened criminals' },
      q: { cooldownMult: 0.8, note: 'on retainer' },
    },
    mastery: { ...ab(0, 10000, { kind: 'zone', radius: 110, ms: 5000, color: 0x888888, shape: 'rune' }, 'Smoke Break: a cloud that blinds husks into a crawl.', { rider: { slow: { mult: 0.5, ms: 700 } } }), name: 'Smoke Break' },
  },

  // ── Abstract ──────────────────────────────────────────────────────────
  growth: {
    tiers: ['Culture', 'Colony', 'Bloom', 'Outbreak', 'Pandemic'],
    cost: 90, range: 200,
    abilities: {
      click: ab(12, 650, { kind: 'bolt', color: 0x88bb22, speed: 540, homing: true }, 'Bacteria that wriggle after the target.'),
      e: ab(0, 8000, { kind: 'rally', radius: 120, ms: 6000, damageMult: 1.2, fireRateMult: 1.1, color: 0x66aa33 }, 'Evolve: the tower and its neighbours grow stronger.'),
      r: ab(10, 4000, { kind: 'bolt', color: 0x44dd44, speed: 480, splash: 60 }, 'A virus that infects everything near the hit.', { rider: { toxic: { ms: 8000, dps: 3 } } }),
      f: ab(8, 7000, { kind: 'barrier', ms: 8000, hp: 100, color: 0x55cc33, label: '🍄' }, 'Spore walls grow across the path.'),
      q: ab(14, 16000, { kind: 'summon', ms: 12000, color: 0x99ee44, attackMs: 700, attackRange: 110, label: '🦠' }, 'A nest hatches a clone that guards the path.'),
    },
    upgrades: {
      click: { damageMult: 1.2, note: 'chemotaxis' },
      e: { damageMult: 1.1, note: 'ultimate evolutions' },
      r: { rider: { toxic: { ms: 8000, dps: 5 } }, note: 'kind strain' },
      f: { damageMult: 1.25, note: 'spore cloud' },
      q: { damageMult: 1.3, note: 'mutation' },
    },
    mastery: { ...ab(0, 5000, { kind: 'bolt', color: 0xbbffbb, speed: 760, size: 0.7 }, 'Syringe Shot: sickness, no damage of its own.', { rider: { weaken: { mult: 1.35, ms: 5000 } } }), name: 'Syringe Shot' },
  },
  crystal: {
    tiers: ['Shard', 'Facet', 'Geode', 'Prism', 'Diamond'],
    cost: 95, range: 240,
    abilities: {
      click: ab(15, 800, { kind: 'bolt', texture: 'proj-crystal-kite', color: 0x77c4e8, speed: 520, pierce: 1, size: 0.7 }, 'Kite-shaped shards that fly the length of the path.'),
      e: ab(18, 2000, { kind: 'beam', color: 0xaaeeff, width: 4, ms: 1500 }, 'A laser reflected off a placed crystal.'),
      r: ab(0, 9000, { kind: 'splash', radius: 160, color: 0xccf4ff, shape: 'ring' }, 'Atune: every husk in the ring stops a moment.', { rider: { stun: 900 } }),
      f: ab(0, 8000, { kind: 'splash', radius: 80, color: 0x99ddff, shape: 'ring' }, 'A portal throws the pack back a stretch.', { rider: { knockback: 120 } }),
      q: ab(20, 18000, { kind: 'summon', ms: 12000, color: 0x77c4e8, attackMs: 800, attackRange: 180, label: '💎' }, 'Trick of the Light: a clone lasers the path for 12s.'),
    },
    upgrades: {
      click: { pierceAdd: 1, damageMult: 1.2, note: 'shredder — a bounce off the wall' },
      e: { damageMult: 1.3, note: 'moving crystals' },
      r: { rider: { stun: 1400 }, note: 'lattice lace' },
      f: { cooldownMult: 0.8, note: 'portal boost' },
      q: { countAdd: 1, damageMult: 1.2, note: 'shield clones' },
    },
    mastery: { ...ab(8, 8000, { kind: 'zone', radius: 90, ms: 4000, color: 0x8833cc, shape: 'rune' }, 'Crystal Shredder: a spinning chakram shreds the stretch.', { rider: { bleed: 2000 } }), name: 'Crystal Shredder' },
  },
  soul: {
    tiers: ['Wisp', 'Spectre', 'Wraith', 'Lich', 'Reaper'],
    cost: 95, range: 200,
    abilities: {
      click: ab(6, 500, { kind: 'beam', color: 0xaa66ff, width: 3, ms: 1200 }, 'A siphon cord drinks from the nearest husk.'),
      e: ab(14, 7000, { kind: 'summon', ms: 10000, color: 0xccaaff, attackMs: 800, attackRange: 80, label: '👻' }, 'Arise! A fallen husk stands up for your side.'),
      r: ab(10, 9000, { kind: 'summon', ms: 14000, color: 0x8855cc, attackMs: 1500, attackRange: 120, label: '🪦' }, 'A headstone that spits out grave zombies.'),
      f: ab(22, 6000, { kind: 'splash', radius: 110, color: 0xddbbff, shape: 'burst' }, 'Death Whistle: every amalgam rushes the point.'),
      q: ab(12, 17000, { kind: 'zone', radius: 140, ms: 6000, color: 0x663399, shape: 'fire' }, "Hell's Torment: ghostfire over the path for 6s."),
    },
    upgrades: {
      click: { damageMult: 1.5, note: 'possession' },
      e: { rider: { toxic: { ms: 4000, dps: 2 } }, note: 'cruel offering — decay clouds' },
      r: { damageMult: 1.3, note: 'restless ground' },
      f: { damageMult: 1.5, note: 'carrion call' },
      q: { cooldownMult: 0.8, note: 'unending hell' },
    },
    mastery: { ...ab(40, 14000, { kind: 'summon', ms: 9000, color: 0x7744aa, attackMs: 600, attackRange: 100, label: '🐺' }, 'Grave Mistake: an Alpha stalks the path.'), name: 'Grave Mistake' },
  },
  hunt: {
    tiers: ['Tracker', 'Stalker', 'Huntsman', 'Beastmaster', 'Apex'],
    cost: 100, range: 260,
    abilities: {
      click: ab(30, 1300, { kind: 'bolt', color: 0xcc4400, speed: 760, size: 0.8 }, 'Crossbow bolts stay buried in the target.', { rider: { bleed: 2000 } }),
      e: ab(15, 2400, { kind: 'line', length: 130, width: 90, color: 0xffaa66 }, 'Shotgun cone with heavy knockback.', { rider: { knockback: 70 } }),
      r: ab(35, 5000, { kind: 'splash', radius: 110, color: 0x886644, delayMs: 1400, shape: 'crater' }, 'A lobbed grenade — 1.4s fuse, wide blast.'),
      f: ab(0, 6000, { kind: 'zone', radius: 80, ms: 5000, color: 0xcc4400, shape: 'rune' }, 'A scent trail: husks on it are marked and slowed.', { rider: { slow: { mult: 0.75, ms: 1000 }, expose: 2000 } }),
      q: ab(18, 16000, { kind: 'summon', ms: 12000, color: 0x993300, attackMs: 500, attackRange: 70, label: '🐺' }, 'Release the Beast! It tears down the path for 12s.'),
    },
    upgrades: {
      click: { damageMult: 1.25, note: 'tracking arrows pulse' },
      e: { damageMult: 1.6, note: 'mine blast' },
      r: { countAdd: 1, note: 'grenade combo' },
      f: { areaMult: 1.4, note: 'enhanced scent' },
      q: { cooldownMult: 0.75, note: 'hybrid form' },
    },
    mastery: { ...ab(8, 12000, { kind: 'summon', ms: 15000, color: 0xaa7744, attackMs: 600, attackRange: 70, label: '🐶' }, 'Beastling: a pup that bites and roars.'), name: 'Beastling' },
  },
  sand: {
    tiers: ['Tick', 'Second', 'Minute', 'Hour', 'Eternity'],
    cost: 100, range: 250,
    abilities: {
      click: ab(9, 250, { kind: 'bolt', texture: 'proj-time-bullet', color: 0xffdd44, speed: 820, size: 0.9 }, 'Revolver shots at a steady cadence.'),
      e: ab(5, 5000, { kind: 'splash', radius: 60, color: 0xffee88, shape: 'ring' }, 'Lasso: yanks the target back to where it was.', { rider: { knockback: 160 } }),
      r: ab(0, 10000, { kind: 'splash', radius: 150, color: 0xffff99, shape: 'ring' }, 'Remain: everything in the ring halts for 1.5s.', { rider: { freeze: 1500 } }),
      f: ab(0, 7000, { kind: 'zone', radius: 100, ms: 5000, color: 0xeecc44, shape: 'rune' }, 'Bounty: a slowing aura settles on the path.', { rider: { slow: { mult: 0.55, ms: 900 } } }),
      q: ab(0, 20000, { kind: 'rally', radius: 230, ms: 5000, fireRateMult: 2.2, color: 0xffffcc }, 'Always Noon: time stops for the husks — every nearby tower fires double-time.'),
    },
    upgrades: {
      click: { damageMult: 1.3, note: 'perfect reload' },
      e: { rider: { knockback: 240 }, note: 'delayed warp' },
      r: { rider: { freeze: 2200 }, note: 'frozen field' },
      f: { rider: { slow: { mult: 0.4, ms: 900 } }, note: 'bounty hunter' },
      q: { cooldownMult: 0.8, note: 'rifle reload' },
    },
    mastery: { ...ab(45, 9000, { kind: 'bolt', texture: 'proj-time-orb', color: 0x6688cc, speed: 360, splash: 100, splashMult: 1 }, 'Time Bomb: a sticky charge that ages into a blast.'), name: 'Time Bomb' },
  },
  gravity: {
    tiers: ['Pull', 'Weight', 'Orbit', 'Singularity', 'Event Horizon'],
    cost: 105, range: 220,
    abilities: {
      click: ab(16, 900, { kind: 'line', length: 140, width: 40, color: 0x8844cc }, 'A space slash with directional knockback.', { rider: { knockback: 30 } }),
      e: ab(22, 4000, { kind: 'bolt', color: 0xaa66ee, speed: 420, lob: true, count: 3, spread: 0.5, splash: 55 }, 'Meteor Rain: three meteors fall on the path.'),
      r: ab(28, 5000, { kind: 'splash', radius: 50, color: 0x6622aa, shape: 'strike' }, 'Space Slam: drives the target into the floor.', { rider: { stun: 1000 } }),
      f: ab(8, 7000, { kind: 'zone', radius: 110, ms: 4000, color: 0x5533aa, shape: 'rune' }, 'Grav Bomb: a vortex that drags the pack together.', { rider: { slow: { mult: 0.35, ms: 500 } } }),
      q: ab(140, 22000, { kind: 'splash', radius: 190, color: 0xddccff, delayMs: 3000, shape: 'strike' }, 'Lunar Landing: a colossal meteor after 3s.'),
    },
    upgrades: {
      click: { cooldownMult: 0.7, note: 'meteor storm' },
      e: { countAdd: 2, rider: { burn: 1500 }, note: 'meteor swarm — fire pools' },
      r: { rider: { stun: 1800 }, note: 'gravity anchor' },
      f: { areaMult: 1.3, note: 'anti-grav' },
      q: { damageMult: 1.25, note: 'moon rider' },
    },
    mastery: { ...ab(14, 9000, { kind: 'bolt', color: 0xffeeaa, speed: 500, lob: true, count: 5, spread: 0.9, splash: 45 }, 'Starfall: a shower that grounds whatever it hits.', { rider: { stun: 600 } }), name: 'Starfall' },
  },
  creation: {
    tiers: ['Tinker', 'Smith', 'Artisan', 'Engineer', 'Architect'],
    cost: 95, range: 210,
    abilities: {
      click: ab(7, 600, { kind: 'bolt', texture: 'proj-creation-dagger', color: 0xcc6622, speed: 620, count: 3, spread: 0.5, pierce: 2 }, 'A fan of daggers that converge on the target.'),
      e: ab(15, 2800, { kind: 'bolt', color: 0xffcc33, speed: 700, size: 1.1 }, 'A charged gold bolt.'),
      r: ab(20, 5000, { kind: 'bolt', color: 0xaaaaaa, speed: 440, pierce: 3, size: 1.2 }, 'A spinning wrench — every husk it hits is weakened.', { rider: { weaken: { mult: 1.25, ms: 5000 } } }),
      f: ab(0, 7000, { kind: 'barrier', ms: 6000, hp: 140, color: 0xbb8844, label: '🧱' }, 'Create: a block across the path.'),
      q: ab(10, 18000, { kind: 'summon', ms: 15000, color: 0xcc6622, attackMs: 500, attackRange: 150, label: '⚙️' }, 'Workshop: a saw-throwing automaton for 15s.'),
    },
    upgrades: {
      click: { pierceAdd: 2, note: 'blade split' },
      e: { rider: { stun: 500 }, note: 'electro bolt' },
      r: { damageMult: 1.5, note: 'nexus awakening' },
      f: { damageMult: 1.5, note: 'build mode' },
      q: { damageMult: 1.3, note: 'ultimate invention' },
    },
    mastery: { ...ab(20, 7000, { kind: 'bolt', color: 0xff3399, speed: 380, lob: true, splash: 80, splashMult: 1 }, 'Mortar Command: the Nexus lobs potions.', { rider: { slow: { mult: 0.6, ms: 2500 } } }), name: 'Mortar Command' },
  },
  electricity: {
    tiers: ['Static', 'Spark', 'Arc', 'Storm', 'Thunderhead'],
    cost: 95, range: 210,
    abilities: {
      click: ab(15, 800, { kind: 'bolt', texture: 'proj-electro', color: 0xffee00, speed: 560 }, 'A ball of electricity that shocks on impact.', { rider: { stun: 150 } }),
      e: ab(15, 3200, { kind: 'line', length: 180, width: 36, color: 0xffff88 }, 'Electro Dash: a bolt of lightning down the path.'),
      r: ab(32, 5500, { kind: 'splash', radius: 90, color: 0xffffaa, shape: 'burst' }, 'Kinetic Discharge: an explosion on the pack.'),
      f: ab(10, 400, { kind: 'aura', radius: 110, color: 0xffee66 }, 'Pain Battery: a crackling field around the tower.'),
      q: ab(0, 20000, { kind: 'rally', radius: 220, ms: 6000, fireRateMult: 1.6, damageMult: 1.2, color: 0xffff00 }, 'Restart: overcharges every nearby tower.'),
    },
    upgrades: {
      click: { damageMult: 1.4, areaMult: 1.3, note: 'ball lightning' },
      e: { rider: { stun: 400 }, note: 'storm cloud' },
      r: { damageMult: 1.5, note: 'overclock' },
      f: { damageMult: 1.3, note: 'jumpstart' },
      q: { cooldownMult: 0.75, note: 'auto-restart' },
    },
    mastery: { ...ab(40, 9000, { kind: 'bolt', color: 0x2244cc, speed: 500, splash: 110, splashMult: 1 }, 'Kinetic Bomb: a sticky bomb that grows with damage.'), name: 'Kinetic Bomb' },
  },
  slime: {
    tiers: ['Drop', 'Spill', 'Corrosion', 'Vitriol', 'Dissolution'],
    cost: 90, range: 190,
    abilities: {
      click: ab(2, 120, { kind: 'bolt', texture: 'proj-acid-whip', color: 0x66cc44, speed: 700, spread: 0.2 }, 'A barrage of acid lashes.', { rider: { toxic: { ms: 2000, dps: 2 } } }),
      e: ab(5, 6000, { kind: 'zone', radius: 75, ms: 9000, color: 0x55bb33, shape: 'puddle' }, 'Vile Spray: acid pools that eat at the path.', { rider: { toxic: { ms: 2000, dps: 3 } } }),
      r: ab(20, 6000, { kind: 'nova', radius: 110, color: 0x88ee55 }, 'Snake Burrow: erupts under the pack.'),
      f: ab(12, 4500, { kind: 'bolt', texture: 'proj-purge', color: 0x99ff66, speed: 380, size: 1.2 }, 'Purge: strips a husk of its buffs and weakens it.', { rider: { weaken: { mult: 1.3, ms: 5000 } } }),
      q: ab(14, 18000, { kind: 'zone', radius: 160, ms: 8000, color: 0x44aa22, shape: 'puddle' }, 'Acid Apocalypse: rain over the stretch for 8s.', { rider: { toxic: { ms: 3000, dps: 4 } } }),
    },
    upgrades: {
      click: { rider: { weaken: { mult: 1.1, ms: 3000 } }, note: 'corrosive bite' },
      e: { areaMult: 1.3, note: 'spray spread' },
      r: { damageMult: 1.4, note: 'rattling strike' },
      f: { damageMult: 2, note: 'meltdown' },
      q: { areaMult: 1.25, note: 'acid flood' },
    },
    mastery: { ...ab(4, 11000, { kind: 'nova', radius: 200, color: 0x1b3d10 }, 'Breakdown: 200 lashes in every direction.', { rider: { toxic: { ms: 4000, dps: 4 } } }), name: 'Breakdown' },
  },
  fate: {
    tiers: ['Deuce', 'Jack', 'Queen', 'King', 'Ace'],
    cost: 95, range: 220,
    abilities: {
      click: ab(14, 700, { kind: 'bolt', texture: 'proj-fate-card', color: 0x88eecc, speed: 600 }, 'Throws the highlighted card.'),
      e: ab(0, 6000, { kind: 'rally', radius: 1, ms: 3000, fireRateMult: 2, color: 0xaaffee }, 'Reroll: the tower deals a fresh hand, firing double-time.'),
      r: ab(28, 4500, { kind: 'bolt', texture: 'proj-fate-card', color: 0xffee66, speed: 560, pierce: 3 }, 'Preserve: a yellow card that cuts through the line.'),
      f: ab(30, 5000, { kind: 'bolt', texture: 'proj-fate-card', color: 0xcc66ff, speed: 560, splash: 70, splashMult: 1 }, 'Enchant: a purple card with double effect.'),
      q: ab(90, 20000, { kind: 'splash', radius: 120, color: 0xffd700, delayMs: 2500, shape: 'ring' }, 'All In! A slow orbiting strike that lands for everything.'),
    },
    upgrades: {
      click: { countAdd: 1, note: 'new cards!' },
      e: { cooldownMult: 0.7, note: 'force the hand of fate' },
      r: { pierceAdd: 3, note: 'wonder preserve' },
      f: { areaMult: 1.3, note: 'wonder enchant' },
      q: { damageMult: 1.3, note: 'roulette expert' },
    },
    mastery: { ...ab(80, 12000, { kind: 'bolt', texture: 'proj-fate-striker', color: 0x6b2fa8, speed: 500, size: 1.3 }, 'Tarot of Fate: a greatly enchanted card.'), name: 'Tarot of Fate' },
  },
  sound: {
    tiers: ['Drummer', 'Bugler', 'Drum Major', 'Bandleader', 'Grand March'],
    cost: 95, range: 180,
    abilities: {
      click: ab(8, 400, { kind: 'aura', radius: 110, color: 0xa82c48 }, 'Baton: a spinning baton cracks anything that walks past the tower.'),
      e: ab(30, 8000, { kind: 'nova', radius: 180, color: 0xf0c04e }, 'Crescendo: a wave of music rolls off the tower.'),
      r: ab(20, 9000, { kind: 'splash', radius: 90, color: 0xc9c43a, shape: 'crater' }, 'Fermata: the baton slams down and leaves the pack out of tune.', { rider: { stun: 500 } }),
      f: ab(0, 9000, { kind: 'rally', radius: 200, ms: 5000, fireRateMult: 1.25, damageMult: 1.15, color: 0xff3b4a }, 'Hum: a soul song — every tower near it plays faster and harder.'),
      q: ab(15, 30000, { kind: 'bolt', color: 0xd9a441, speed: 700, count: 3, spread: 0.3 }, 'Call of the Void: a bugle solo, every note thrown down the lane.'),
    },
    upgrades: {
      click: { damageMult: 1.3, note: 'a faster spin' },
      e: { areaMult: 1.25, note: 'a longer dance' },
      r: { rider: { stun: 1000 }, note: 'a longer hold' },
      f: { areaMult: 1.3, note: 'a louder hum' },
      q: { damageMult: 1.3, note: 'a longer solo' },
    },
  },
  light: {
    tiers: ['Glimmer', 'Beam', 'Radiance', 'Brilliance', 'Supernova'],
    cost: 100, range: 260,
    abilities: {
      click: ab(12, 600, { kind: 'beam', color: 0xfff4a8, width: 4, ms: 900 }, 'A light lance held on the target.'),
      e: ab(10, 3000, { kind: 'line', length: 260, width: 30, color: 0xffffff }, 'Blink: a flash down the whole path.'),
      r: ab(0, 8000, { kind: 'rally', radius: 180, ms: 5000, fireRateMult: 1.4, color: 0xffeeaa }, 'Prism Ramp: light pours through nearby towers.'),
      f: ab(20, 4000, { kind: 'nova', radius: 130, color: 0xffffcc }, 'Light Trick: a burst that dazzles.', { rider: { slow: { mult: 0.5, ms: 2000 } } }),
      q: ab(60, 18000, { kind: 'line', length: 400, width: 70, color: 0xffffff }, "Speed 'O' Light: a lance the length of the field.", { rider: { expose: 3000 } }),
      },
    upgrades: {
      click: { damageMult: 1.3, note: 'redline' },
      e: { damageMult: 1.4, note: 'steam charge' },
      r: { areaMult: 1.3, note: 'prism drill' },
      f: { damageMult: 1.5, note: 'javelin burst' },
      q: { rider: { burn: 3000 }, note: 'flare-stream' },
    },
    mastery: { ...ab(30, 9000, { kind: 'bolt', texture: 'proj-light-triangle', color: 0xff8800, speed: 800, pierce: 5 }, 'Killer Kebab: a lance that skewers the line.'), name: 'Killer Kebab' },
  },
  // Magnet: the 2026-10-15 scrap rework. No shop upgrades or mastery exist yet; the tower rows wait for them.
  magnet: {
    tiers: ['Lodestone', 'Coil', 'Dynamo', 'Polar', 'Magnetar'],
    cost: 95, range: 210,
    abilities: {
      click: ab(6, 500, { kind: 'bolt', color: 0xffd060, speed: 820, size: 0.55, count: 2, spread: 0.2 }, 'Coin Flip: coins repulsed down the lane.'),
      e: ab(10, 2500, { kind: 'splash', radius: 110, color: 0x3399ff, shape: 'ring' }, 'Repulse: a cone of force throws the pack back.', { rider: { knockback: 70 } }),
      r: ab(10, 4000, { kind: 'bolt', color: 0xccddee, speed: 840, size: 0.8 }, 'Nail Implant: a nail that sticks — and comes out harder.', { rider: { bleed: 3000 } }),
      f: ab(22, 8000, { kind: 'splash', radius: 95, color: 0x88ccff, delayMs: 2000, shape: 'crater' }, 'Steel Spike: a rod hangs 2s, then drives into the pack.'),
      q: ab(20, 50000, { kind: 'summon', ms: 15000, color: 0x1f5fbf, attackMs: 1400, attackRange: 260, label: '🤖' }, 'Mecha Massacre: a scrap mech smashes the lane for 15s.'),
    },
    upgrades: {
      click: { countAdd: 1, note: 'a fuller purse' },
      e: { areaMult: 1.25, note: 'a wider cone' },
      r: { damageMult: 1.3, note: 'longer nails' },
      f: { damageMult: 1.3, note: 'a heavier spike' },
      q: { damageMult: 1.3, note: 'more scrap' },
    },
  },
  metal: {
    tiers: ['Iron', 'Steel', 'Forge', 'Anvil', 'Adamant'],
    cost: 100, range: 150,
    abilities: {
      click: ab(25, 1000, { kind: 'nova', radius: 95, color: 0x8899aa }, 'Slash: a sword swing that bleeds.', { rider: { bleed: 3000 } }),
      e: ab(18, 700, { kind: 'aura', radius: 120, color: 0xaabbcc }, 'Flail Craft: a flail head swings around the tower.'),
      r: ab(0, 10000, { kind: 'rally', radius: 160, ms: 5000, damageMult: 1.3, color: 0xcc2233 }, 'Blood Transfusion: nearby towers draw strength.'),
      f: ab(14, 4500, { kind: 'bolt', texture: 'proj-metal-chain', color: 0x8899aa, speed: 600 }, 'Chain Tether: holds the target in place.', { rider: { slow: { mult: 0.3, ms: 3000 } } }),
      q: ab(50, 18000, { kind: 'bolt', texture: 'proj-metal-rpg', color: 0xff4444, speed: 520, splash: 120, splashMult: 1 }, 'Clot Armor spent as an RPG into the pack.'),
    },
    upgrades: {
      click: { damageMult: 1.6, note: 'mighty sabre' },
      e: { damageMult: 1.4, note: 'heavy metal rock!' },
      r: { cooldownMult: 0.75, note: 'blood clottage' },
      f: { rider: { stun: 1500 }, note: 'ground anchor' },
      q: { damageMult: 1.3, note: 'blood blade' },
    },
    mastery: { ...ab(0, 12000, { kind: 'barrier', ms: 8000, hp: 200, color: 0x8b0000, label: '🛡️' }, 'Steel Shield: a planted shield that stops the line.'), name: 'Steel Shield' },
  },
  plasma: {
    tiers: ['Ion', 'Flux', 'Corona', 'Nucleus', 'Pure Chaos'],
    cost: 100, range: 220,
    abilities: {
      click: ab(9, 900, { kind: 'splash', radius: 55, color: 0xaa22ff, shape: 'burst' }, 'Plasma Burst: arcs to the target and drops small blasts.'),
      e: ab(8, 6000, { kind: 'zone', radius: 90, ms: 6000, color: 0xcc55ff, shape: 'rune' }, 'Unstable Arena: a pulsing zone on the path.', { rider: { stun: 400, chance: 0.2 } }),
      r: ab(12, 4000, { kind: 'chain', jumps: 4, jumpRange: 110, color: 0xdd88ff }, 'Plasma Current: a chain between bodies.'),
      f: ab(14, 5000, { kind: 'bolt', color: 0xee99ff, speed: 520, count: 3, spread: 2.1, pierce: 8 }, 'Chaos Blades: three blades that bounce down the path.'),
      q: ab(10, 20000, { kind: 'aura', radius: 230, color: 0xff2f8f }, 'Pure CHAOS! The tower wraps itself in raw lightning for a while.', { rider: { stun: 200, chance: 0.1 } }),
    },
    upgrades: {
      click: { areaMult: 1.6, note: 'chain lightning' },
      e: { areaMult: 1.2, cooldownMult: 0.8, note: 'entrenched arenas' },
      r: { countAdd: 2, note: 'volt points' },
      f: { countAdd: 3, note: 'blade storm' },
      q: { damageMult: 1.3, note: 'permanent chaos' },
    },
    mastery: { ...ab(50, 10000, { kind: 'bolt', color: 0xff2f8f, speed: 360, size: 1.5, homing: true, splash: 90 }, 'Unstable Orbital: a nucleus that closes in and bursts.'), name: 'Unstable Orbital' },
  },
  gunpowder: {
    tiers: ['Fuse', 'Flintlock', 'Cannonade', 'Arsenal', 'Magazine'],
    cost: 100, range: 270,
    abilities: {
      click: ab(35, 1500, { kind: 'bolt', texture: 'proj-gunpowder-musket', color: 0xdddddd, speed: 900 }, 'A high-power musket ball.'),
      e: ab(20, 3500, { kind: 'nova', radius: 100, color: 0xffaa33 }, 'Explosive Retreat: a blast at the base of the tower.', { rider: { knockback: 60 } }),
      r: ab(12, 5000, { kind: 'bolt', color: 0xffcc66, speed: 700, count: 5, spread: 0.6 }, 'Fire at Will: every weapon at once.'),
      f: ab(0, 9000, { kind: 'rally', radius: 1, ms: 8000, damageMult: 1.5, color: 0x553377 }, 'Arsenal Expansion: the tower adds a weapon.'),
      q: ab(80, 20000, { kind: 'line', length: 220, width: 100, color: 0xcccccc }, 'BlunderBlast: a silver cone that swallows the pack.', { rider: { knockback: 100 } }),
    },
    upgrades: {
      click: { damageMult: 1.25, rider: { bleed: 1500 }, note: 'attached bayonet' },
      e: { damageMult: 2, note: 'double barrel' },
      r: { countAdd: 3, note: 'expanded arsenal' },
      f: { damageMult: 1.2, note: 'weapons depot' },
      q: { rider: { burn: 3000 }, note: 'vortex cannon — it comes back out on fire' },
    },
    mastery: { ...ab(20, 9000, { kind: 'bolt', texture: 'proj-gunpowder-musket', color: 0x8a8a8a, speed: 900, count: 6, spread: 0.8 }, 'Overload: every spent musket takes aim and volleys.'), name: 'Overload' },
  },
  rubber: {
    tiers: ['Band', 'Bounce', 'Ricochet', 'Vulcan', 'Rebound'],
    cost: 90, range: 200,
    abilities: {
      click: ab(22, 1100, { kind: 'bolt', color: 0xff5577, speed: 500, size: 1.2 }, 'Rubber Punch: an elastic fist flung down the path.', { rider: { knockback: 50 } }),
      e: ab(30, 4500, { kind: 'bolt', color: 0xff88aa, speed: 760, pierce: 3 }, 'Sling Shot: the tower fires itself through the line.'),
      r: ab(0, 8000, { kind: 'splash', radius: 120, color: 0xffaacc, shape: 'ring' }, 'Bounce Form: husks are flung back down the path.', { rider: { knockback: 130 } }),
      f: ab(10, 5000, { kind: 'beam', color: 0xff5577, width: 5, ms: 3000 }, 'Rubber Banding: the band drags the husk back as it strays.', { rider: { slow: { mult: 0.5, ms: 3000 } } }),
      q: ab(6, 16000, { kind: 'bolt', color: 0xff5577, speed: 600, count: 15, spread: 6.28, pierce: 10, size: 0.6 }, 'Rubberage: fifteen balls ricochet down the path.'),
    },
    upgrades: {
      click: { damageMult: 1.6, note: 'rubber bazooka' },
      e: { pierceAdd: 3, note: 'bouncy house' },
      r: { rider: { knockback: 200 }, note: 'bounce combo' },
      f: { damageMult: 1.4, note: 'bouncy anchor' },
      q: { countAdd: 10, note: 'rubber ball' },
    },
    mastery: { ...ab(10, 9000, { kind: 'zone', radius: 110, ms: 5000, color: 0x992233, shape: 'rune' }, 'Atom-Nhilego: blast zones that keep going.'), name: 'Atom-Nhilego' },
  },
  magic: {
    tiers: ['Apprentice', 'Adept', 'Conjurer', 'Archmage', 'Grand Magus'],
    cost: 95, range: 220,
    abilities: {
      click: ab(12, 650, { kind: 'bolt', texture: 'proj-sparkle-star', color: 0x9944ff, speed: 560 }, 'Sparkle Shot.'),
      e: ab(18, 3500, { kind: 'splash', radius: 80, color: 0xbb77ff, shape: 'burst' }, 'Grimoire: a spell from the wheel on the pack.', { rider: { slow: { mult: 0.7, ms: 2000 } } }),
      r: ab(8, 2500, { kind: 'bolt', texture: 'proj-magic-missile', color: 0xdd99ff, speed: 700, count: 3, spread: 0.3, homing: true }, 'Magic Missiles that track the crosshaired husk.'),
      f: ab(0, 9000, { kind: 'rally', radius: 170, ms: 5000, damageMult: 1.25, color: 0xffd700 }, 'Duplication: nearby towers cast twice as hard.'),
      q: ab(16, 18000, { kind: 'summon', ms: 12000, color: 0x9944ff, attackMs: 700, attackRange: 160, label: '🧿' }, 'Summon: an elemental patrols the path for 12s.'),
    },
    upgrades: {
      click: { countAdd: 2, note: 'sparkle trail' },
      e: { damageMult: 1.4, note: 'corrupted grimoire' },
      r: { countAdd: 3, note: 'twin missiles' },
      f: { areaMult: 1.3, note: 'corrupted data' },
      q: { damageMult: 1.3, note: 'greater summons' },
    },
    mastery: { ...ab(0, 12000, { kind: 'bolt', color: 0xddaa00, speed: 300, size: 1.3 }, 'Transmogrify: the husk it hits becomes a chicken for a while.', { rider: { weaken: { mult: 1.5, ms: 5000 }, slow: { mult: 0.6, ms: 5000 } } }), name: 'Transmogrify' },
  },
  technology: {
    tiers: ['Prototype', 'Beta', 'Release', 'Enterprise', 'Singularity'],
    cost: 100, range: 230,
    abilities: {
      click: ab(10, 600, { kind: 'bolt', texture: 'proj-tinker-bullet', color: 0x44ccaa, speed: 640 }, 'Crunchers that leave a binary trail.', { rider: { weaken: { mult: 1.05, ms: 4000 } } }),
      e: ab(8, 5000, { kind: 'zone', radius: 110, ms: 5000, color: 0x66ffcc, shape: 'rune' }, 'Overt Advertisement: popups clutter the path.', { rider: { slow: { mult: 0.65, ms: 700 } } }),
      r: ab(12, 4000, { kind: 'beam', color: 0x44ccaa, width: 4, ms: 3000 }, 'Upload: a cord drains the husk for 3s.'),
      f: ab(0, 8000, { kind: 'splash', radius: 90, color: 0xffffff, shape: 'ring' }, 'Web Drag: drags the pack back down the path.', { rider: { knockback: 100 } }),
      q: ab(40, 18000, { kind: 'bolt', texture: 'proj-tinker-rocket', color: 0xff6644, speed: 520, count: 4, spread: 0.5, splash: 70 }, 'Admin Console: rockets from the console.'),
    },
    upgrades: {
      click: { damageMult: 1.3, note: 'firewall' },
      e: { damageMult: 1.5, note: 'palware' },
      r: { rider: { slow: { mult: 0.5, ms: 3000 } }, note: 'trojan takeover' },
      f: { rider: { knockback: 150 }, note: 'surf the web!' },
      q: { countAdd: 2, note: 'security breach' },
    },
    mastery: { ...ab(30, 9000, { kind: 'splash', radius: 110, color: 0x2288cc, delayMs: 1500, shape: 'crater' }, 'Byte-Bomb: a timed packet that Lags everything in the blast.', { rider: { slow: { mult: 0.5, ms: 3000 } } }), name: 'Byte-Bomb' },
  },
  silence: {
    tiers: ['Hush', 'Whisper', 'Watcher', 'Terror', 'Oblivion'],
    cost: 100, range: 190,
    abilities: {
      click: ab(20, 900, { kind: 'line', length: 120, width: 34, color: 0x3d2a4d }, 'Stab: a dash and a knife, from the dark.'),
      e: ab(6, 7000, { kind: 'summon', ms: 12000, color: 0x5a3a6a, attackMs: 900, attackRange: 90, label: '👁️' }, 'Watch: a stalker stands sentinel on the path.'),
      r: ab(25, 5500, { kind: 'splash', radius: 60, color: 0xff2233, delayMs: 1000, shape: 'strike' }, 'Ritual: a red beam strikes after 1s.', { rider: { weaken: { mult: 1.3, ms: 6000 } } }),
      f: ab(7, 500, { kind: 'aura', radius: 130, color: 0x2a1038 }, 'Stalk: a shadow aura round the tower; anything walking through it is dragged at.', { rider: { slow: { mult: 0.8, ms: 600 } } }),
      q: ab(60, 20000, { kind: 'splash', radius: 110, color: 0x110011, shape: 'burst' }, 'Run: a gangly arm drags the pack into the hallway.', { rider: { stun: 1500 } }),
    },
    upgrades: {
      click: { areaMult: 1.4, note: 'sacrifice' },
      e: { damageMult: 1.5, note: 'mutant' },
      r: { damageMult: 1.4, note: 'night terror' },
      f: { rider: { slow: { mult: 0.7, ms: 3000 }, weaken: { mult: 1.2, ms: 3000 } }, note: 'despress — slower and stripped of armour' },
      q: { rider: { stun: 2500 }, note: 'the labyrinth' },
    },
    mastery: { ...ab(0, 10000, { kind: 'beam', color: 0x2b0a30, width: 6, ms: 4000 }, 'Puppetmaster: a husk is marched backwards for 4s.', { rider: { slow: { mult: 0.1, ms: 4000 } } }), name: 'Puppetmaster' },
  },
  echo: {
    tiers: ['Murmur', 'Reverb', 'Resonance', 'Sonar', 'Cacophony'],
    cost: 90, range: 240,
    abilities: {
      click: ab(12, 700, { kind: 'bolt', color: 0xccccff, speed: 560, pierce: 2, size: 1.1 }, 'Echolocation: a white rectangle that bounces.'),
      e: ab(30, 4000, { kind: 'splash', radius: 70, color: 0xddddff, shape: 'burst' }, 'Guess: an AoE on the pack, revealing them.', { rider: { expose: 3000 } }),
      r: ab(6, 500, { kind: 'aura', radius: 130, color: 0xeeeeff }, 'Lantern: light the husks cannot stand in.'),
      f: ab(14, 3000, { kind: 'line', length: 200, width: 30, color: 0x9999cc }, 'Bat Form: a dash-attach along the path.'),
      q: ab(40, 18000, { kind: 'splash', radius: 220, color: 0xffffff, shape: 'ring' }, 'Total Eclipse: the whole stretch is revealed and struck.', { rider: { expose: 5000 } }),
    },
    upgrades: {
      click: { damageMult: 1.3, note: 're-location' },
      e: { cooldownMult: 0.5, note: 'paranoia' },
      r: { damageMult: 1.4, note: 'healing light' },
      f: { rider: { expose: 2000 }, note: 'alpha bat' },
      q: { damageMult: 1.3, note: 'hypersense' },
    },
    mastery: { ...ab(10, 10000, { kind: 'zone', radius: 120, ms: 6000, color: 0x7f6fd0, shape: 'rune' }, 'Echo Bloom: a bloom on the path that sees and strikes.'), name: 'Echo Bloom' },
  },

  // ── Divine ────────────────────────────────────────────────────────────
  justice: {
    tiers: ['Oath', 'Verdict', 'Sentence', 'Tribunal', 'Judgement'],
    cost: 110, range: 240,
    abilities: {
      click: ab(20, 900, { kind: 'bolt', texture: 'proj-justice-spear', color: 0xff8a3c, speed: 700, size: 0.8 }, 'Spear Thrust: a spear thrown down the path.'),
      e: ab(0, 9000, { kind: 'barrier', ms: 8000, hp: 180, color: 0xffcc88, label: '🏛️' }, 'Coliseum: a ring of columns bars the path.'),
      r: ab(0, 8000, { kind: 'rally', radius: 180, ms: 5000, damageMult: 1.2, fireRateMult: 1.2, color: 0xffaa55 }, 'Sheer Will: nearby towers burn willpower.'),
      f: ab(25, 4000, { kind: 'bolt', texture: 'proj-justice-spear', color: 0xffffff, speed: 600, lob: true, splash: 80 }, 'Flight of the Valkyrie: spears from the sky.'),
      q: ab(0, 20000, { kind: 'execute', thresholdFrac: 0.35, color: 0xffd700 }, 'Judgement Day: weighs the target — the weak are struck down.', { damage: 60 }),
    },
    upgrades: {
      click: { rider: { bleed: 2000 }, note: 'hell-piercer' },
      e: { damageMult: 1.5, note: 'world maker' },
      r: { cooldownMult: 0.75, note: 'indomitable will' },
      f: { countAdd: 1, note: 'death from above' },
      q: { damageMult: 1.4, note: 'swift and blind' },
    },
    mastery: { ...ab(45, 9000, { kind: 'line', length: 220, width: 40, color: 0xff8a3c }, 'Vigilante Vengeance: dash, impale and kick them off the spear.', { rider: { knockback: 80 } }), name: 'Vigilante Vengeance' },
  },
  dream: {
    tiers: ['Doze', 'Slumber', 'Reverie', 'Lucid', 'Nightmare'],
    cost: 110, range: 220,
    abilities: {
      click: ab(6, 400, { kind: 'aura', radius: 150, color: 0x8b5cf6 }, 'Trance: the pendulum swings and the husks grow sleepy.', { rider: { slow: { mult: 0.85, ms: 600 } } }),
      e: ab(25, 3000, { kind: 'nova', radius: 100, color: 0xccbbff }, 'Pillow Fight: hits hardest on the drowsy.'),
      r: ab(10, 8000, { kind: 'summon', ms: 12000, color: 0x8b5cf6, attackMs: 2000, attackRange: 120, label: '🕸️' }, 'Dreamcatcher: pulls dreams out of husks.'),
      f: ab(5, 6000, { kind: 'zone', radius: 100, ms: 10000, color: 0x331155, shape: 'rune' }, 'Nightmare: 5 a second for 10s.'),
      q: ab(0, 18000, { kind: 'splash', radius: 170, color: 0xeeddff, shape: 'ring' }, 'Oasis: the whole stretch falls asleep.', { rider: { freeze: 2500 } }),
    },
    upgrades: {
      click: { damageMult: 1.5, note: 'knocked out' },
      e: { damageMult: 1.3, note: 'pillow fort' },
      r: { damageMult: 1.4, note: 'good dreams' },
      f: { rider: { weaken: { mult: 1.15, ms: 5000 } }, note: 'phobia' },
      q: { rider: { freeze: 3500 }, note: 'night terrors' },
    },
    mastery: { ...ab(0, 14000, { kind: 'rally', radius: 220, ms: 10000, damageMult: 1.3, color: 0x8b5cf6 }, 'Lifelong Dream: a held thought that grows stronger.'), name: 'Lifelong Dream' },
  },

  // ── Unstable ──────────────────────────────────────────────────────────
  chalk: {
    tiers: ['Stub', 'Stick', 'Sketch', 'Mural', 'Masterpiece'],
    cost: 95, range: 200,
    abilities: {
      click: ab(16, 1000, { kind: 'splash', radius: 60, color: 0xf4f1e6, delayMs: 500, shape: 'burst' }, 'Chalk Ward: a scribble that blows half a second later.'),
      e: ab(22, 4000, { kind: 'line', length: 200, width: 30, color: 0xff4444 }, 'Explosive Chalk: a red line that goes up end to end.'),
      r: ab(6, 7000, { kind: 'zone', radius: 80, ms: 12000, color: 0x4488ff, shape: 'rune' }, 'Perma-Chalk: blue chalk that burns whatever stands on it.'),
      f: ab(0, 8000, { kind: 'barrier', ms: 6000, hp: 120, color: 0xffffff, label: '⬜' }, 'Chalk Shield: a drawn wall.'),
      q: ab(12, 18000, { kind: 'zone', radius: 170, ms: 8000, color: 0x66ff66, shape: 'rune' }, 'Masterpiece: eight seconds of drawing over the path.', { rider: { slow: { mult: 0.6, ms: 700 } } }),
    },
    upgrades: {
      click: { rider: { slow: { mult: 0.62, ms: 2000 } }, note: 'chalk debris' },
      e: { areaMult: 1.4, note: 'explosive release' },
      r: { damageMult: 1.4, note: 'perma-block' },
      f: { damageMult: 1.5, note: 'supreme shield' },
      q: { damageMult: 1.5, note: 'prodigy' },
    },
    mastery: { ...ab(14, 11000, { kind: 'summon', ms: 10000, color: 0x8a8fa0, attackMs: 700, attackRange: 90, label: '✏️' }, 'Living Chalk: the drawing stands up and hunts.'), name: 'Living Chalk' },
  },
  magma: {
    tiers: ['Cinder', 'Vent', 'Caldera', 'Eruption', 'Pirate King'],
    cost: 105, range: 190,
    abilities: {
      click: ab(8, 900, { kind: 'bolt', color: 0xff5a1e, speed: 420, count: 3, spread: 0.6, splash: 40, lob: true }, 'Plume: globs of magma on the path.', { rider: { burn: 1500 } }),
      e: ab(10, 8000, { kind: 'summon', ms: 12000, color: 0xff5a1e, attackMs: 1500, attackRange: 110, label: '🌋' }, 'Volcano: raised on the path, it erupts on whatever passes.'),
      r: ab(0, 9000, { kind: 'rally', radius: 1, ms: 6000, damageMult: 1.5, color: 0xff8844 }, 'Magma Bloat: the tower swells with magma.'),
      f: ab(18, 3500, { kind: 'beam', color: 0xffaa33, width: 8, ms: 2500 }, 'Magma Jet: a jet of molten flame on the target.', { rider: { burn: 2000 } }),
      q: ab(30, 20000, { kind: 'summon', ms: 15000, color: 0xff3300, attackMs: 600, attackRange: 160, label: '🏴‍☠️' }, 'Molten Mutiny: a burning ship guards the path.'),
    },
    upgrades: {
      click: { areaMult: 1.5, damageMult: 1.3, note: 'mag-mortar' },
      e: { damageMult: 1.5, note: 'supercritical' },
      r: { cooldownMult: 0.7, note: 'bloat bomb' },
      f: { countAdd: 1, damageMult: 1.2, note: 'jet slam' },
      q: { damageMult: 1.4, note: 'full draconic' },
    },
    mastery: { ...ab(20, 10000, { kind: 'beam', color: 0x2a1f2b, width: 10, ms: 3000 }, 'Magma Saw: a molten chainsaw, hotter every second.', { rider: { burn: 3000 } }), name: 'Magma Saw' },
  },
  illusion: {
    tiers: ['Trick', 'Mirage', 'Phantasm', 'Masquerade', 'Delusion'],
    cost: 100, range: 250,
    abilities: {
      click: ab(20, 900, { kind: 'bolt', texture: 'proj-illusion-crack', color: 0xb45cff, speed: 820, size: 0.8 }, 'Crack Shot: a fast red bullet.'),
      e: ab(0, 8000, { kind: 'rally', radius: 160, ms: 5000, damageMult: 1.3, color: 0xcc88ff }, 'Illusion Veil: shots through the pane hit harder.'),
      r: ab(0, 7000, { kind: 'splash', radius: 80, color: 0xb45cff, shape: 'ring' }, 'Relocate: the pack is somewhere else — further back.', { rider: { knockback: 140 } }),
      f: ab(12, 9000, { kind: 'zone', radius: 120, ms: 3000, color: 0xb45cff, shape: 'rune' }, 'Guise: a decoy holds the pack where it stands, then pays back what it took.', { rider: { slow: { mult: 0.35, ms: 600 } } }),
      q: ab(10, 18000, { kind: 'bolt', color: 0xb45cff, speed: 700, count: 10, spread: 1.2, pierce: 2, size: 0.6 }, 'Illusion Dance: ten daggers from nowhere.'),
    },
    upgrades: {
      click: { pierceAdd: 5, note: 'immersion breaker' },
      e: { countAdd: 1, damageMult: 1.1, note: 'duplication' },
      r: { damageMult: 1, rider: { knockback: 140, stun: 600 }, note: 'phantom' },
      f: { damageMult: 1.25, note: 're-trick' },
      q: { countAdd: 5, note: 'blade dance' },
    },
    mastery: { ...ab(0, 12000, { kind: 'rally', radius: 1, ms: 8000, damageMult: 1.5, color: 0x5a189a }, 'Masquerade: masked, the tower hits 50% harder.'), name: 'Masquerade' },
  },
  depths: {
    tiers: ['Shallows', 'Reef', 'Trench', 'Abyssal', 'Hadal'],
    cost: 95, range: 210,
    abilities: {
      click: ab(3, 700, { kind: 'bolt', color: 0x0e8f9c, speed: 580, homing: true }, 'Piranha: latches on and chews.', { rider: { bleed: 3000 } }),
      e: ab(15, 3500, { kind: 'line', length: 150, width: 40, color: 0x33ccbb }, 'Lungfish Strike: a dash and slash.'),
      r: ab(18, 6000, { kind: 'bolt', color: 0x44ffcc, speed: 400, count: 6, spread: 6.28, size: 0.8 }, 'Eutrophication: algae orbs that hurt what they touch.'),
      f: ab(30, 8000, { kind: 'bolt', color: 0x88ffee, speed: 500, size: 1.3, splash: 60 }, 'Angler: lands a random fish on the pack.', { rider: { slow: { mult: 0.6, ms: 2000 } } }),
      q: ab(90, 20000, { kind: 'line', length: 360, width: 80, color: 0x0e8f9c }, 'Megalodon: a shark tears down the path.'),
    },
    upgrades: {
      click: { rider: { bleed: 4500 }, damageMult: 1.3, note: 'swarm tactics' },
      e: { damageMult: 1.5, note: 'knock the breath out' },
      r: { countAdd: 6, note: 'algae trap' },
      f: { damageMult: 1.5, note: 'deep fishing' },
      q: { areaMult: 1.3, note: 'command the depths' },
    },
    mastery: { ...ab(20, 12000, { kind: 'summon', ms: 8000, color: 0x6e3f8f, attackMs: 700, attackRange: 150, label: '🦑' }, 'Release the Kraken: a beak with three arms.'), name: 'Release the Kraken' },
  },
  ruin: {
    tiers: ['Crack', 'Rust', 'Decay', 'Collapse', 'Wasteland'],
    cost: 100, range: 220,
    abilities: {
      click: ab(15, 800, { kind: 'bolt', color: 0xc4392c, speed: 560, pierce: 10, size: 1.1 }, 'Shred Slice: a wedge straight through everything.'),
      e: ab(10, 5000, { kind: 'bolt', color: 0x885522, speed: 600 }, 'Lockdown: a padlock that seals the husk.', { rider: { weaken: { mult: 1.4, ms: 6000 } } }),
      r: ab(35, 6000, { kind: 'bolt', color: 0xaa4433, speed: 520, pierce: 4, size: 1.3 }, 'Rusty Skewer: threads husks onto a spike.', { rider: { stun: 1000 } }),
      f: ab(15, 7000, { kind: 'nova', radius: 130, color: 0xff2222 }, 'Spikes of Ruin: a red ring erupts.', { rider: { bleed: 3000 } }),
      q: ab(0, 25000, { kind: 'rally', radius: 300, ms: 15000, damageMult: 1.1, color: 0x8f1f18 }, 'Unstoppable Decay: everything rots — the field hits harder.'),
    },
    upgrades: {
      click: { damageMult: 1.3, note: 'shatter starter' },
      e: { rider: { toxic: { ms: 6000, dps: 3 } }, note: 'lockjaw' },
      r: { damageMult: 1.4, note: 'ruin transfusion' },
      f: { areaMult: 1.4, damageMult: 1.3, note: 'chain reaction' },
      q: { damageMult: 1.2, note: 'ruin cracks' },
    },
    mastery: { ...ab(15, 10000, { kind: 'nova', radius: 220, color: 0x8f1f18 }, 'Second Skin: 25 shards in every direction.', { rider: { knockback: 60 } }), name: 'Second Skin' },
  },
  dune: {
    tiers: ['Grain', 'Drift', 'Dune', 'Erg', 'Sahara'],
    cost: 100, range: 260,
    abilities: {
      click: ab(30, 1400, { kind: 'line', length: 260, width: 24, color: 0xe8c87a }, 'Sand Striker: a hitscan lance of packed sand.'),
      e: ab(0, 8000, { kind: 'barrier', ms: 7000, hp: 150, color: 0xd4b067, label: '🪨' }, 'Sandstone Ruins: a course of blocks across the path.'),
      r: ab(12, 7000, { kind: 'zone', radius: 110, ms: 6000, color: 0xc9a657, shape: 'rune' }, 'Cursed Pyramid: a cruel course that bites.', { rider: { slow: { mult: 0.6, ms: 700 } } }),
      f: ab(0, 6000, { kind: 'splash', radius: 110, color: 0xffeeaa, shape: 'ring' }, 'Sandwalk: a conveyor of sand runs the pack backwards.', { rider: { knockback: 120 } }),
      q: ab(70, 20000, { kind: 'splash', radius: 140, color: 0x9fe4dc, delayMs: 1500, shape: 'strike' }, 'Final Trail: the pack is thrown onto the parkour, and off it.', { rider: { stun: 1500 } }),
    },
    upgrades: {
      click: { areaMult: 1.5, damageMult: 1.2, note: 'dune slicer' },
      e: { damageMult: 1.5, note: 'doomed remains' },
      r: { damageMult: 1.4, note: 'sand barrier' },
      f: { rider: { knockback: 180 }, note: 'dust devil' },
      q: { cooldownMult: 0.8, note: 'curse of the challenger' },
    },
    mastery: { ...ab(0, 16000, { kind: 'rally', radius: 1, ms: 16000, fireRateMult: 1.6, damageMult: 1.2, color: 0x9fe4dc }, 'Tempered Temptation: glass for 16s — the flintlock bursts.'), name: 'Tempered Temptation' },
  },
  conquest: {
    tiers: ['Outpost', 'Garrison', 'Keep', 'Citadel', 'Empire'],
    cost: 110, range: 260,
    abilities: {
      click: ab(20, 1000, { kind: 'line', length: 260, width: 26, color: 0xc23a2e }, 'Banner Bash: the longest pike on the field.'),
      e: ab(10, 9000, { kind: 'summon', ms: 15000, color: 0xc23a2e, attackMs: 800, attackRange: 90, label: '⚔️' }, 'Barracks: soldiers hold the path.'),
      r: ab(10, 8000, { kind: 'summon', ms: 15000, color: 0xdd6644, attackMs: 2000, attackRange: 220, label: '🗼' }, 'Turret: a bullet every 2s at anything on the path.'),
      f: ab(0, 8000, { kind: 'barrier', ms: 10000, hp: 300, color: 0xaa8866, label: '🧱' }, 'Barricade: 300 HP of wall.'),
      q: ab(0, 20000, { kind: 'rally', radius: 250, ms: 10000, damageMult: 1.25, fireRateMult: 1.25, color: 0xe8c23a }, 'Expansion: a second town center — the whole quarter rallies.'),
    },
    upgrades: {
      click: { damageMult: 1.3, note: 'banner bearer' },
      e: { damageMult: 1.5, note: 'barracks enhanced' },
      r: { damageMult: 1.5, areaMult: 1.2, note: 'turret enhanced' },
      f: { damageMult: 1.5, note: 'barricade enhanced' },
      q: { cooldownMult: 0.7, note: 'expansion enhanced' },
    },
    mastery: { ...ab(0, 10000, { kind: 'gold', amount: 15, color: 0xe8c23a }, 'Market: a stall that pays Authority a second.'), name: 'Market' },
  },
  passion: {
    tiers: ['Novice', 'Deacon', 'Priest', 'Bishop', 'Saint'],
    cost: 95, range: 220,
    abilities: {
      click: ab(3, 550, { kind: 'bolt', color: 0xf5e08a, speed: 560, size: 0.6, count: 4, spread: 0.32 }, 'Sermon: a barrage of Greek letters down the path.', { rider: { weaken: { mult: 1.06, ms: 4000 } } }),
      e: ab(7, 3500, { kind: 'zone', radius: 72, ms: 8000, color: 0x8fd3ff, shape: 'puddle' }, 'Holy Water: a boiling puddle that holds the pack.', { rider: { slow: { mult: 0.7, ms: 900 } } }),
      r: ab(40, 6000, { kind: 'splash', radius: 130, color: 0xe8b93a, delayMs: 3000, shape: 'burst' }, 'Holy Hand Grenade: three seconds, then a burst of light.'),
      f: ab(0, 9000, { kind: 'barrier', ms: 9000, hp: 120, color: 0xc08a50, label: '✝️' }, 'Mount Crucifix: husks cannot pass its aura until they break it.'),
      q: ab(70, 16000, { kind: 'line', length: 320, width: 74, color: 0xff9a2e }, 'Ascendance: a flaming chariot thunders down the path.'),
    },
    upgrades: {
      click: { countAdd: 2, note: 'a longer sermon' },
      e: { areaMult: 1.25, note: 'a deeper font' },
      r: { damageMult: 1.4, note: 'a holier grenade' },
      f: { areaMult: 1.2, note: 'a taller cross' },
      q: { damageMult: 1.4, note: 'a fiercer chariot' },
    },
  },
  paper: {
    tiers: ['Leaf', 'Page', 'Chapter', 'Volume', 'Library'],
    cost: 90, range: 220,
    abilities: {
      click: ab(10, 600, { kind: 'bolt', color: 0xf2ead6, speed: 600 }, 'Storybook Summoning: a knight from the open book.'),
      e: ab(10, 3000, { kind: 'bolt', color: 0xffffff, speed: 540, pierce: 6, size: 1.1 }, 'Paper Plane: through everything it passes.'),
      r: ab(15, 4000, { kind: 'bolt', color: 0xeeddcc, speed: 580, size: 1.2 }, 'Paper Shuriken: 15 and a bleed.', { rider: { bleed: 4000 } }),
      f: ab(4, 8000, { kind: 'summon', ms: 10000, color: 0xf2ead6, attackMs: 600, attackRange: 80, label: '📄' }, 'Mâché Monsters: fortune-tellers on the floor.'),
      q: ab(50, 18000, { kind: 'line', length: 320, width: 70, color: 0xfff8e8 }, 'Climax: the ending of whichever book is open.'),
    },
    upgrades: {
      click: { countAdd: 1, note: 'larger library' },
      e: { rider: { knockback: 60 }, note: 'plane drill' },
      r: { areaMult: 1.5, damageMult: 1.2, note: 'paper pinwheel' },
      f: { damageMult: 1.5, note: 'magical monsters' },
      q: { countAdd: 1, damageMult: 1.3, note: 'open-ended' },
    },
    mastery: { ...ab(8, 11000, { kind: 'bolt', color: 0xe8c65c, speed: 640, count: 14, spread: 6.28, size: 0.6 }, 'Restructure: fourteen sharp shards.'), name: 'Restructure' },
  },
  death: {
    tiers: ['Omen', 'Reaper', 'Harbinger', 'Inevitable', 'Grimdark'],
    cost: 110, range: 180,
    abilities: {
      click: ab(0, 900, { kind: 'bolt', color: 0x4a4468, speed: 600, count: 3, spread: 0.5 }, 'Styx Shurikens: no damage — they mark the dead.', { rider: { weaken: { mult: 1.15, ms: 6000 } } }),
      e: ab(28, 2500, { kind: 'line', length: 130, width: 60, color: 0xb9902e }, 'Disarm: the katana down through everything in front.'),
      r: ab(40, 6000, { kind: 'nova', radius: 110, color: 0x8888aa }, 'Riposte: the blade waits, then answers.'),
      f: ab(45, 7000, { kind: 'line', length: 220, width: 34, color: 0xffffff }, 'Amputate: a dash with the blade out.', { rider: { bleed: 4000 } }),
      q: ab(0, 24000, { kind: 'execute', thresholdFrac: 0.5, color: 0x000000 }, 'Deal with Death: a handshake — the dying die now.', { damage: 80 }),
    },
    upgrades: {
      click: { damageMult: 1, cooldownMult: 0.7, note: 'sheath' },
      e: { rider: { stun: 800 }, note: 'disarmed' },
      r: { damageMult: 1.4, note: 'dishonor' },
      f: { areaMult: 1.3, note: 'death by 1000 cuts' },
      q: { damageMult: 1.5, note: 'true grimdark' },
    },
    mastery: { ...ab(0, 14000, { kind: 'rally', radius: 1, ms: 8000, fireRateMult: 1.5, damageMult: 1.2, color: 0xb9902e }, 'Delay the Inevitable: eight seconds back on the clock.'), name: 'Delay The Inevitable' },
  },
  // `fortune` is Gold, the alchemist. No upgrades or mastery since the 2026-10-15 rework.
  fortune: {
    tiers: ['Lead', 'Copper', 'Silver', 'Gold', 'Philosopher'],
    cost: 100, range: 220,
    abilities: {
      click: ab(4, 600, { kind: 'bolt', color: 0xe8c040, speed: 480, size: 0.55, count: 7, spread: 0.4 }, 'Fray: a clump of grass, gilded in the air, rains down the path.'),
      e: ab(0, 12000, { kind: 'rally', radius: 1, ms: 12000, fireRateMult: 1.25, damageMult: 1.25, color: 0xfff0a8 }, 'Advance: the alchemist spends his gold on himself — +25% for 12s.'),
      r: ab(9, 9000, { kind: 'zone', radius: 105, ms: 6000, color: 0xf0c33c, shape: 'rune' }, 'Gold Plume: a cloud of golden dust burns the pack for 6s.'),
      f: ab(16, 10000, { kind: 'line', length: 150, width: 40, color: 0xe0a030 }, 'Heart of Gold: a cane lunge; struck hearts seize up.', { rider: { stun: 1400, chance: 0.5 } }),
      q: ab(0, 30000, { kind: 'gold', amount: 30, color: 0xffd34d }, 'Midas Curse: the path turns to gold — and the gold is yours.'),
    },
    upgrades: {
      click: { countAdd: 2, note: 'a thicker sheaf' },
      e: { cooldownMult: 0.8, note: 'compound interest' },
      r: { areaMult: 1.25, note: 'a bigger bag' },
      f: { damageMult: 1.3, note: 'a heavier cane' },
      q: { damageMult: 1, cooldownMult: 0.8, note: 'the Midas touch' },
    },
  },
  marrow: {
    tiers: ['Stem Cell', 'Marrow', 'Ribcage', 'Fever', 'Pandemic'],
    cost: 95, range: 180,
    abilities: {
      click: ab(12, 440, { kind: 'bolt', color: 0xf1e7d0, speed: 640, size: 0.8 }, 'Anti-Body Blast: an antibody that latches on and makes every later hit bite harder.', { rider: { weaken: { mult: 1.1, ms: 6000 } } }),
      e: ab(15, 9500, { kind: 'summon', ms: 10000, color: 0x7b6cd9, attackMs: 1200, attackRange: 75, label: '🟣' }, 'Macrosma: a macrophage squats on the path and eats whatever walks into it.'),
      r: ab(7, 6000, { kind: 'zone', radius: 85, ms: 4000, color: 0x2fc79b, shape: 'rune' }, 'Neutralize: a neutrophil bursts into a NET across the path — sticky, and it stings.', { rider: { slow: { mult: 0.55, ms: 700 }, toxic: { ms: 2000, dps: 3 } } }),
      f: ab(22, 5000, { kind: 'line', length: 140, width: 44, color: 0x46c8f5 }, 'Dendricles: five tentacles lash down the path and mark everything they touch.', { rider: { expose: 4000 } }),
      q: ab(25, 18000, { kind: 'bolt', color: 0xf05fa8, speed: 380, count: 5, spread: 0.9, homing: true, splash: 70, splashMult: 0.8, size: 0.9 }, 'Mastacre: five mast cells home in on the pack and detonate.'),
    },
    upgrades: {
      click: { countAdd: 1, note: 'b-cascade' },
      e: { damageMult: 1.4, note: 'cell janitor' },
      r: { rider: { weaken: { mult: 1.25, ms: 4000 } }, note: 'cytokine storm' },
      f: { damageMult: 1.5, note: 'killer t' },
      q: { damageMult: 1.5, areaMult: 1.2, note: 'autoimmunity' },
    },
  },
  tempest: {
    tiers: ['Breeze', 'Squall', 'Gale', 'Cyclone', 'Hurricane'],
    cost: 95, range: 200,
    abilities: {
      click: ab(10, 650, { kind: 'bolt', color: 0xc9e3ff, speed: 780, size: 0.9, splash: 72, splashMult: 1 }, 'Gale Burst: a wind burst that goes off on the pack and throws it back down the path.', { rider: { knockback: 70 } }),
      e: ab(15, 5000, { kind: 'line', length: 220, width: 50, color: 0xf4f9ff }, 'Kick Blast: a roll of wind down the path that kicks everything in it backwards.', { rider: { knockback: 110 } }),
      r: ab(4, 4200, { kind: 'zone', radius: 90, ms: 5000, color: 0x7fb4ff, shape: 'rune' }, 'Summon Front: a conveyor laid across the path, running the wrong way for the husks.', { rider: { slow: { mult: 0.45, ms: 600 } } }),
      f: ab(24, 7000, { kind: 'splash', radius: 95, color: 0xc9e3ff, delayMs: 900, shape: 'ring' }, 'Updraft: a current opens under the pack and drops it from a height.', { rider: { stun: 1200, knockback: 40 } }),
      q: ab(40, 20000, { kind: 'splash', radius: 160, color: 0xfff3a6, shape: 'burst' }, 'Final Forecast: the Eye opens — a dive-speed landing that bounces the whole pack off the walls.', { rider: { stun: 1500, knockback: 150 } }),
    },
    upgrades: {
      click: { countAdd: 1, note: 'second charge' },
      e: { damageMult: 1.4, note: 'longer roll' },
      r: { areaMult: 1.4, note: 'wider front' },
      f: { damageMult: 1.5, note: 'higher current' },
      q: { areaMult: 1.3, rider: { stun: 2200 }, note: 'eye of the storm' },
    },
  },
  cloth: {
    tiers: ['Thread', 'Stitch', 'Weave', 'Tapestry', 'Loom'],
    cost: 90, range: 170,
    abilities: {
      click: ab(13, 400, { kind: 'line', length: 90, width: 20, color: 0xd1435c }, 'Pin: a jab barely past the tower.'),
      e: ab(16, 2000, { kind: 'bolt', color: 0xeeeeee, speed: 760, size: 0.7 }, 'Longpin: buries itself in the first thing it meets.', { rider: { slow: { mult: 0.6, ms: 2000 } } }),
      r: ab(0, 7000, { kind: 'beam', color: 0xd1435c, width: 3, ms: 3000 }, 'Safety Line: an anchor that holds a husk.', { rider: { slow: { mult: 0.3, ms: 3000 } } }),
      f: ab(0, 8000, { kind: 'rally', radius: 1, ms: 6000, damageMult: 1.5, color: 0xff8899 }, 'Pin Cushion: the tower stabs itself and hits harder.'),
      q: ab(14, 18000, { kind: 'zone', radius: 150, ms: 8000, color: 0xd1435c, shape: 'rune' }, 'Tapestry: a 5×5 artwork sewn over the path.', { rider: { slow: { mult: 0.7, ms: 600 } } }),
    },
    upgrades: {
      click: { damageMult: 1.5, note: 'combo grapple' },
      e: { rider: { stun: 1000 }, note: 'cloth hold' },
      r: { damageMult: 1, cooldownMult: 0.7, note: 'slack line' },
      f: { damageMult: 1.3, note: 'pin push' },
      q: { areaMult: 1.3, note: 'salvage' },
    },
    mastery: { ...ab(0, 12000, { kind: 'rally', radius: 1, ms: 5000, damageMult: 1.4, color: 0xf2ede4 }, 'Bleed Stop: the tower ties off and takes the risky shots, hitting harder.'), name: 'Bleed Stop' },
  },
  psychic: {
    tiers: ['Pawn', 'Knight', 'Bishop', 'Rook', 'Grandmaster'],
    cost: 100, range: 230,
    abilities: {
      click: ab(14, 650, { kind: 'line', length: 130, width: 30, color: 0xead6ff }, 'En Passant: a pawn steps down the path and captures on its diagonals.'),
      e: ab(40, 6000, { kind: 'summon', ms: 8000, color: 0xffd166, attackMs: 1100, attackRange: 130, label: '♝' }, 'Bisharp: a bishop stands on the path for 8s and slides through husks.'),
      r: ab(35, 6000, { kind: 'splash', radius: 80, color: 0xc496ff, delayMs: 340, shape: 'burst' }, 'Knightly Mandate: a knight leaps onto the path and lands in an explosion.'),
      f: ab(45, 8000, { kind: 'line', length: 230, width: 40, color: 0xff3355 }, 'Rook Battery: a rook slides down the file through everything in it.'),
      q: ab(0, 30000, { kind: 'rally', radius: 220, ms: 15000, fireRateMult: 1.45, damageMult: 1.45, color: 0xffd166 }, 'Queen: every tower nearby fights at ×1.45 for 15s.'),
    },
    upgrades: {
      click: { damageMult: 1.3, note: 'sharper pawns' },
      e: { damageMult: 1.3, note: 'a longer diagonal' },
      r: { areaMult: 1.25, note: 'a wider landing' },
      f: { damageMult: 1.3, note: 'a heavier rook' },
      q: { cooldownMult: 0.8, note: 'a quicker coronation' },
    },
    mastery: { ...ab(0, 14000, { kind: 'rally', radius: 230, ms: 8000, fireRateMult: 1.3, damageMult: 1.3, color: 0xffd166 }, 'Utter Focus: the future opens for every tower nearby.'), name: 'Utter Focus' },
  },
  radiation: {
    tiers: ['Trace', 'Dose', 'Fallout', 'Meltdown', 'Half-Life'],
    cost: 100, range: 250,
    abilities: {
      click: ab(0, 500, { kind: 'bolt', color: 0x7cff3d, speed: 900, size: 0.6, pierce: 2 }, 'Radiation Railgun: a Geiger tracer that doses the line.', { rider: { toxic: { ms: 4000, dps: 3 } } }),
      e: ab(6, 4500, { kind: 'bolt', color: 0xe0b52a, speed: 1400, size: 0.4, count: 5, spread: 0.08 }, 'Barrage: a closing sight, then a five-round burst.'),
      r: ab(0, 12000, { kind: 'barrier', ms: 10000, hp: 75, color: 0x512b78, label: '☢️' }, 'Fallout Bunker: a ring of lead the lane has to chew through.'),
      f: ab(14, 5000, { kind: 'line', length: 100, width: 60, color: 0x99ff66 }, 'Rod Baton: a uranium rod through the front of the pack.', { rider: { stun: 600, toxic: { ms: 3000, dps: 3 } } }),
      q: ab(16, 18000, { kind: 'bolt', color: 0x7cff3d, speed: 700, count: 5, spread: 0.5, splash: 70, lob: true }, 'Extermination: five flares, an airdrop on each.', { rider: { toxic: { ms: 5000, dps: 5 } } }),
    },
    upgrades: {
      click: { damageMult: 1, rider: { toxic: { ms: 4000, dps: 5 } }, note: 'a hotter tracer' },
      e: { countAdd: 1, note: 'a longer burst' },
      r: { damageMult: 1.3, note: 'thicker lead' },
      f: { damageMult: 1.3, note: 'a richer rod' },
      q: { areaMult: 1.4, note: 'a wider drop' },
    },
  },
  bind: {
    tiers: ['Knot', 'Shackle', 'Idol', 'Covenant', 'Broken God'],
    cost: 105, range: 230,
    abilities: {
      click: ab(14, 400, { kind: 'beam', color: 0xe0b743, width: 6, ms: 1800 }, 'Summon: the eye burns a beam down.'),
      e: ab(4, 4500, { kind: 'bolt', color: 0xe0b743, speed: 640, count: 8, spread: 0.7, size: 0.6 }, 'Shards of Oblivion: a volley of golden shards.'),
      r: ab(6, 9000, { kind: 'summon', ms: 14000, color: 0xe0b743, attackMs: 1200, attackRange: 120, label: '🗿' }, 'Summon Idol: it runs on faith, and strikes.'),
      f: ab(0, 8000, { kind: 'splash', radius: 110, color: 0x8a3fe0, shape: 'ring' }, 'Chained: the pack is bound to the floor.', { rider: { stun: 1200 } }, ),
      q: ab(25, 22000, { kind: 'aura', radius: 230, color: 0xffd66b }, 'God of Treachery: the eye opens all the way.', { rider: { bleed: 1000 } }),
    },
    upgrades: {
      click: { damageMult: 1.4, note: 'over-rage' },
      e: { damageMult: 1.5, note: 'eviscerate' },
      r: { damageMult: 1.5, note: 'cult of the broken god' },
      f: { rider: { stun: 1800 }, note: 'chosen vessel' },
      q: { damageMult: 1.3, note: 'awakening' },
    },
    mastery: { ...ab(0, 8000, { kind: 'rally', radius: 1, ms: 5000, damageMult: 1.6, color: 0x8a3fe0 }, 'Ritual Sacrifice: the tower bleeds for the patron and hits harder.'), name: 'Ritual Sacrifice' },
  },
  gum: {
    tiers: ['Blob', 'Glob', 'Ooze', 'Morass', 'Oobleck'],
    cost: 90, range: 170,
    abilities: {
      click: ab(14, 800, { kind: 'beam', color: 0x46b93f, width: 7, ms: 1200 }, 'Grab: the hand grips a husk.', { rider: { slow: { mult: 0.4, ms: 1200 } } }),
      e: ab(5, 5000, { kind: 'zone', radius: 85, ms: 8000, color: 0x3a9a33, shape: 'puddle' }, 'Slime Surge: slimeballs that sit on the path.', { rider: { slow: { mult: 0.5, ms: 900 } } }),
      r: ab(5, 3500, { kind: 'bolt', color: 0xff88cc, speed: 520, count: 5, spread: 0.5 }, 'Gumball: a barrage of bubble gum.', { rider: { slow: { mult: 0.6, ms: 1500 } } }),
      f: ab(0, 8000, { kind: 'barrier', ms: 7000, hp: 150, color: 0x46b93f, label: '🫧' }, 'Oozorbtion: a swollen wall of slime.'),
      q: ab(0, 20000, { kind: 'splash', radius: 190, color: 0x88ddaa, shape: 'ring' }, 'Solidify: every scrap of slime goes glassy — the pack with it.', { rider: { freeze: 2500 } }),
    },
    upgrades: {
      click: { damageMult: 1.5, note: 'zip-line' },
      e: { damageMult: 3, areaMult: 1.3, note: 'slime splash — the balls go off' },
      r: { rider: { slow: { mult: 0.4, ms: 2000 } }, note: 'bubble bloat' },
      f: { damageMult: 1.5, note: 'emesis' },
      q: { rider: { freeze: 3500 }, note: 'hand of stone' },
    },
    mastery: { ...ab(0, 12000, { kind: 'barrier', ms: 9000, hp: 220, color: 0x2b8b76, label: '🟩' }, 'Oobleck: a slab everything sticks in.'), name: 'Oobleck' },
  },
  // Harvest (id `gluttony`). No upgrades or mastery yet — both were retired with the rework.
  gluttony: {
    tiers: ['Seedling', 'Sprout', 'Blight', 'Rot', 'Reaper'],
    cost: 95, range: 200,
    abilities: {
      click: ab(12, 650, { kind: 'bolt', color: 0xc9ced6, speed: 520, pierce: 4, size: 0.8 }, 'Sickle: thrown in a loop, it cuts through the whole pack.'),
      e: ab(4, 10000, { kind: 'zone', radius: 110, ms: 20000, color: 0x7a2fb0, shape: 'puddle' }, 'Sow Corruption: a spreading mold rots whatever walks the path.', { rider: { weaken: { mult: 1.15, ms: 3000 } } }),
      r: ab(5, 14000, { kind: 'summon', ms: 6000, color: 0x3d3349, attackMs: 450, attackRange: 70, label: '🐦‍⬛' }, 'Feeding Frenzy: three crows circle the path, pecking.'),
      f: ab(18, 9000, { kind: 'line', length: 90, width: 60, color: 0xb0386a }, 'Consume: a bite that leaves its victim unable to heal.', { rider: { weaken: { mult: 1.1, ms: 8000 } } }),
      q: ab(30, 35000, { kind: 'splash', radius: 160, color: 0x4a1766, delayMs: 320, shape: 'crater' }, 'Reaping Hour: a scythe swing — everything cut takes more damage for good.', { rider: { weaken: { mult: 1.15, ms: 600000 } } }),
    },
    upgrades: {
      click: { pierceAdd: 2, note: 'a heavier sickle' },
      e: { areaMult: 1.25, note: 'wider mold' },
      r: { countAdd: 1, note: 'another crow' },
      f: { damageMult: 1.3, note: 'deeper teeth' },
      q: { cooldownMult: 0.8, note: 'the hour comes sooner' },
    },
  },

  // ── Vault ─────────────────────────────────────────────────────────────
  wax: {
    tiers: ['Taper', 'Candle', 'Hive', 'Beeswax', 'Queen'],
    cost: 95, range: 210,
    abilities: {
      click: ab(4, 300, { kind: 'bolt', color: 0xffcc55, speed: 740, size: 0.6 }, 'Stinger Strikes: six foil thrusts.'),
      e: ab(2, 4000, { kind: 'bolt', color: 0xffee88, speed: 420, count: 6, spread: 0.6, homing: true, size: 0.5 }, 'Swarm: bees that latch and bite.', { rider: { toxic: { ms: 3000, dps: 2 } } }),
      r: ab(0, 9000, { kind: 'rally', radius: 150, ms: 8000, damageMult: 1.2, color: 0xffd966 }, 'Candle Mount: in its light the towers hit harder.'),
      f: ab(10, 8000, { kind: 'summon', ms: 12000, color: 0xffcc55, attackMs: 900, attackRange: 130, label: '🍯' }, 'Hive Hearth: bees pour out at the path.'),
      q: ab(8, 16000, { kind: 'bolt', color: 0xffaa33, speed: 440, count: 8, spread: 0.8, lob: true, splash: 60 }, 'Sticky Bombs: lobbed in a cone.', { rider: { weaken: { mult: 1.1, ms: 8000 } } }),
    },
    upgrades: {
      click: { damageMult: 1.5, note: 'stinger strike' },
      e: { countAdd: 3, note: 'elite swarm' },
      r: { areaMult: 1.3, note: 'melting point' },
      f: { damageMult: 1.4, note: 'honey making' },
      q: { damageMult: 1.5, note: 'rule beetanica' },
    },
    mastery: { ...ab(12, 10000, { kind: 'zone', radius: 120, ms: 6000, color: 0xffcc55, shape: 'fire' }, 'Candlelight: hot wax over the path.', { rider: { burn: 1500 } }), name: 'Candlelight' },
  },
  clay: {
    tiers: ['Lump', 'Mould', 'Kiln', 'Golem', 'Bedrock'],
    cost: 100, range: 170,
    abilities: {
      click: ab(20, 1200, { kind: 'nova', radius: 110, color: 0xa0522d }, 'Slam: the golem slams where it stands.', { rider: { knockback: 40 } }),
      e: ab(25, 5000, { kind: 'bolt', color: 0xc47a4a, speed: 560, count: 8, spread: 6.28, pierce: 2, size: 0.7 }, 'Rupture: eight piercing shards in every direction.'),
      r: ab(0, 9000, { kind: 'barrier', ms: 7000, hp: 160, color: 0xa0522d, label: '🏺' }, 'Clay Clot: a wall of clay.'),
      f: ab(15, 4000, { kind: 'line', length: 220, width: 40, color: 0xd09060 }, 'Slink: a race along the rim of the path.'),
      q: ab(0, 20000, { kind: 'rally', radius: 1, ms: 10000, damageMult: 1.5, fireRateMult: 1.4, color: 0x1f1b1a }, 'Fuse: merged with the golem.'),
    },
    upgrades: {
      click: { countAdd: 1, damageMult: 1.2, note: 'shard smash' },
      e: { countAdd: 3, note: 'fractal' },
      r: { damageMult: 1.5, note: 'protector' },
      f: { cooldownMult: 0.7, note: 'slipstream' },
      q: { damageMult: 1.2, note: 'frenzy' },
    },
    mastery: { ...ab(15, 12000, { kind: 'summon', ms: 12000, color: 0x1f1b1a, attackMs: 800, attackRange: 90, label: '🏺' }, 'Give Life: a clay creature wakes and hunts.'), name: 'Give Life' },
  },
};

/** Elements that can be a tower. Quantum has no character of its own, so it is not here. */
export const TOWER_ELEMENT_IDS = Object.keys(TOWER_DEFS);

export function getTowerDef(elementId: string): TowerDef | undefined {
  return TOWER_DEFS[elementId];
}

/** Slot order a tower unlocks its abilities in: tier n grants slot n. */
export function slotForTier(tier: number): TowerSlot {
  return (['click', 'e', 'r', 'f', 'q'] as TowerSlot[])[Math.max(0, Math.min(4, tier))];
}
