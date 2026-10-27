import type { TowerDef } from '../StrongholdTypes';
import { ab, path, up } from './helpers';

/**
 * The base five. Fire is the reference tower every other file is written against: one cheap
 * attack at placement, three paths that each pull the element a different way (spread the
 * burn / blow things up / melt from up close), the middle path's tier 3 buying an ability and
 * its tier 5 replacing it with a bigger one.
 */
export const BASE_TOWERS: Record<string, TowerDef> = {
  fire: {
    cost: 120, range: 160, role: 'attack', body: { kind: 'ground' },
    blurb: 'Close-range burner. Everything it touches catches.',
    signature: { name: 'Kindling', desc: 'Fireballs set husks burning.' },
    traits: {},
    attacks: {
      fireball: ab(13, 650, { kind: 'bolt', texture: 'proj-fire', color: 0xff4400, speed: 520 }, 'Fireballs that set husks burning.', { name: 'Fireball', rider: { burn: 2000 } }),
    },
    paths: [
      path('Wildfire', 'Spread the flames down the whole road', [
        up('Hot Coals', 110, 'Burns last 3.5s and fireballs hit +4.', 'flame', {
          mods: { fireball: { damageAdd: 4, rider: { burn: 3500 } } },
        }),
        up('Spitfire', 220, 'Throws fireballs 35% faster.', 'sparks', {
          mods: { fireball: { cooldownMult: 0.65 } },
        }),
        up('Flame Lance', 700, 'Adds a lance of flame that runs down the road through everything.', { kind: 'banner', color: 0xff6a1e }, {
          add: { lance: ab(60, 2200, { kind: 'line', length: 210, width: 44, color: 0xff6a1e }, 'A lance of flame through everything in a line.', { name: 'Flame Lance', rider: { burn: 3500 }, gesture: 'e' }) },
        }),
        up('Wildfire', 2100, 'Burning husks that die set their neighbours alight. All fire hits ×2, lance 30% faster.', 'horns', {
          traits: { wildfire: true },
          mods: { '*': { damageMult: 2 }, lance: { cooldownMult: 0.7, areaMult: 1.15 } },
        }),
        up('Phoenix', 7800, 'Becomes a phoenix: a ring of fire scorches everything near, and all its fire hits ×2.5.', { kind: 'wings', color: 0xffaa22 }, {
          mods: { '*': { damageMult: 2.5 } },
          add: { phoenix: ab(220, 250, { kind: 'aura', radius: 150, color: 0xffaa22, look: 'heat' }, 'A ring of phoenix fire that burns all nearby.', { name: 'Phoenix Ring', rider: { burn: 2500 } }) },
          range: 1.15,
        }),
      ]),
      path('Bombardier', 'Explosions, and a button that drops the sun', [
        up('Blast Core', 150, 'Fireballs explode, splashing husks around the one they hit.', 'barrel', {
          mods: { fireball: { fx: { splash: 40, splashMult: 0.6 } } },
        }),
        up('Heavy Payload', 320, 'Bigger, harder blasts.', 'bricks', {
          mods: { fireball: { damageAdd: 8, areaMult: 1.4 } },
        }),
        up('Firebomb', 1000, 'ABILITY — Firebomb: a huge charge that blows 1.6s later. Also plants a mine charge every 4.8s.', 'skull', {
          add: { charge: ab(40, 4800, { kind: 'splash', radius: 80, color: 0xff3300, delayMs: 1200, shape: 'crater' }, 'Plants a charge on the road; it blows 1.2s later.', { name: 'Charge', rider: { burn: 2500 }, gesture: 'r' }) },
          active: { name: 'Firebomb', desc: 'A huge blast on the lead husk 1.6s later.', cooldown: 30000, cast: ab(380, 0, { kind: 'splash', radius: 170, color: 0xffaa00, delayMs: 1600, shape: 'strike' }, 'A huge blast.', { rider: { burn: 4000 } }) },
        }),
        up('Cluster Charges', 2600, 'Every charge scatters three bomblet mines; every blast hits ×1.5.', 'gears', {
          add: { bomblets: ab(45, 4800, { kind: 'trap', count: 3, hits: 1, ms: 9000, color: 0xff6633, look: 'mine', blast: 50 }, 'Scatters bomblet mines on the road.', { name: 'Bomblets', rider: { burn: 2000 } }) },
          mods: { fireball: { damageMult: 1.5 }, charge: { damageMult: 1.5, areaMult: 1.2 } },
        }),
        up('Sunfall', 9500, 'ABILITY — Sunfall: every husk on the map takes a solar blast and burns. Fireball blasts ×2.', 'sun', {
          mods: { fireball: { damageMult: 2.5, areaMult: 1.25 }, charge: { damageMult: 2.5 }, bomblets: { damageMult: 2 } },
          active: { name: 'Sunfall', desc: 'Every husk on the map takes 900 and burns.', cooldown: 45000, global: true, cast: ab(900, 0, { kind: 'field', color: 0xffaa00 }, 'A solar blast across the map.', { rider: { burn: 5000 } }) },
        }),
      ]),
      path('Furnace', 'Melt armour and roast anything that comes close', [
        up('Heat Haze', 90, 'The tower sheds heat: husks passing close burn.', 'motes', {
          add: { heat: ab(8, 500, { kind: 'aura', radius: 100, color: 0xff7733, look: 'heat' }, 'Husks passing close burn.', { name: 'Heat Haze', rider: { burn: 1500 } }) },
        }),
        up('Melting Point', 260, 'Its fire melts armour: hits corrode for 2s.', 'runes', {
          mods: { '*': { rider: { corrode: 2000 } } },
        }),
        up('Forge Heart', 1100, 'The haze becomes a forge — triple heat, wider.', { kind: 'bricks', color: 0xc4392c }, {
          mods: { heat: { damageMult: 3, areaMult: 1.25 } },
        }),
        up('Blue Flame', 3200, 'Fire burns blue: fireballs hit ×2.4, pierce two husks and leave them brittle.', { kind: 'halo', color: 0x66aaff }, {
          mods: { fireball: { damageMult: 2.4, pierceAdd: 2, fx: { color: 0x66aaff }, rider: { brittle: { add: 4, ms: 2500 } } }, heat: { fx: { color: 0x66aaff } } },
        }),
        up('Core Meltdown', 10500, 'A reactor of fire: the haze roars to 160px, fireballs ×2, and bosses take ×1.6.', { kind: 'orbit', color: 0x66aaff }, {
          mods: { heat: { damageMult: 7, areaMult: 1.3 }, fireball: { damageMult: 2 } },
          traits: { bossBane: 1.6 },
        }),
      ]),
    ],
  },
  water: {
    cost: 95, range: 210, role: 'control', body: { kind: 'water' },
    blurb: 'Naval. Builds only in water. Soaks the road so lightning and frost hit harder.',
    signature: { name: 'Tidecaller', desc: 'Its hits Soak husks: electric hits land ×1.5 and frost lands double.' },
    traits: {},
    attacks: {
      jet: ab(12, 700, { kind: 'bolt', texture: 'proj-water', color: 0x0088ff, speed: 560, pierce: 2 }, 'Water jets cut through two bodies, soaking them.', { name: 'Water Jet', rider: { soak: 3000 } }),
    },
    paths: [
      path('Riptide', 'Pressure that cuts the whole road', [
        up('Pressure Jet', 120, 'Jets hit +5 and pierce one more husk.', 'bubbles', {
          mods: { jet: { damageAdd: 5, pierceAdd: 1 } },
        }),
        up('Hydro Cutter', 260, 'Fires jets 30% faster.', 'sparks', {
          mods: { jet: { cooldownMult: 0.7 } },
        }),
        up('Pressure Dagger', 900, 'Adds a dagger of water that runs the length of the road, piercing eight. +15% range.', { kind: 'scope', color: 0xbbeeff }, {
          range: 1.15,
          add: { dagger: ab(90, 3000, { kind: 'bolt', texture: 'proj-pressure-dagger', color: 0xbbeeff, speed: 760, pierce: 8 }, 'A pressure dagger down the whole road.', { name: 'Pressure Dagger', gesture: 'f' }) },
        }),
        up('Water Knife', 2600, 'All water hits ×2.2; the dagger builds pressure while it waits (up to ×2).', 'bubbles', {
          mods: { '*': { damageMult: 2.2 }, dagger: { charge: { perSec: 0.3, cap: 2 } } },
        }),
        up('Tsunami Lance', 8200, 'Everything ×3, and each jet fires as a burst of three.', { kind: 'crown', color: 0x66ccff }, {
          mods: { '*': { damageMult: 3 }, jet: { fx: { salvo: 3 } } },
        }),
      ]),
      path('Tidecaller', 'Puddles, undertow and floods', [
        up('Puddles', 140, 'Leaves puddles that slow and soak whatever wades through.', 'moat', {
          add: { puddle: ab(6, 3500, { kind: 'zone', radius: 70, ms: 3500, color: 0x3399ff, shape: 'puddle' }, 'A puddle that slows and soaks.', { name: 'Puddle', rider: { slow: { mult: 0.6, ms: 900 }, soak: 2000 }, gesture: 'e' }) },
        }),
        up('Undertow', 300, 'Puddles grow 30% and drag husks back up the road.', 'moat', {
          mods: { puddle: { areaMult: 1.3, fx: { pull: 30 } } },
        }),
        up('Geyser Field', 1100, 'ABILITY — Pain Rain: a 230px storm that drags and slows for 6s. Adds geysers that toss husks back.', 'banner', {
          add: { geyser: ab(30, 4500, { kind: 'splash', radius: 70, color: 0x66ccff, shape: 'geyser' }, 'A geyser tosses the pack back.', { name: 'Geyser', rider: { knockback: 50, soak: 3000 }, gesture: 'r' }) },
          active: { name: 'Pain Rain', desc: 'A 230px storm that drags husks back and slows them for 6s.', cooldown: 35000, cast: ab(30, 0, { kind: 'zone', radius: 230, ms: 6000, color: 0x55aaff, shape: 'storm', pull: 70 }, 'A dragging storm.', { rider: { slow: { mult: 0.6, ms: 800 }, soak: 3000 } }) },
        }),
        up('Deep Soak', 2800, 'Its soak goes deep: soaked husks are weakened ×1.25 for 4s. Jets hit ×1.8.', 'bubbles', {
          mods: { '*': { rider: { soak: 5000, weaken: { mult: 1.25, ms: 4000 } } }, jet: { damageMult: 1.8 } },
        }),
        up('Maelstrom', 9000, 'ABILITY — Deluge: every husk on the map takes 450, is flung back and slowed. Zones ×3.', { kind: 'crown', color: 0x2266cc }, {
          mods: { puddle: { damageMult: 3 }, geyser: { damageMult: 3 } },
          active: { name: 'Deluge', desc: 'Every husk on the map takes 450, is shoved back 140px and slowed for 6s.', cooldown: 50000, global: true, cast: ab(450, 0, { kind: 'field', color: 0x3399ff }, 'A flood across the map.', { rider: { knockback: 140, slow: { mult: 0.45, ms: 6000 }, soak: 6000 } }) },
        }),
      ]),
      path('Wellspring', 'Mend the keep and wash husks clean', [
        up('Spring Ward', 100, 'The keep is washed: absorbs 1 breach each wave.', 'moat', {
          traits: { keepWard: 1 },
        }),
        up('Cold Current', 240, 'Jets slow husks to 80% for 0.8s.', 'leaves', {
          mods: { jet: { rider: { slow: { mult: 0.8, ms: 800 } } } },
        }),
        up('Healing Tide', 1300, 'Repairs one life every 20s. The keep absorbs 3 breaches a wave.', { kind: 'lantern', color: 0x88ffcc }, {
          traits: { keepWard: 3 },
          add: { tide: ab(0, 20000, { kind: 'mend', amount: 1, color: 0x88ffcc }, 'Repairs one life of the keep.', { name: 'Healing Tide' }) },
        }),
        up('Purifying Rain', 3200, 'Rain on the road strips camouflage and corrodes armour.', 'halo', {
          add: { rain: ab(25, 4000, { kind: 'zone', radius: 150, ms: 4000, color: 0x99ddff, shape: 'storm' }, 'Purifying rain: unmasks and corrodes.', { name: 'Purifying Rain', rider: { unmask: true, corrode: 2500 } }) },
        }),
        up('Fountain of Life', 8800, 'Mends two lives every 15s, absorbs 6 breaches a wave, and all hits ×2.5.', { kind: 'halo', color: 0x88ffcc }, {
          traits: { keepWard: 6 },
          mods: { '*': { damageMult: 2.5 }, tide: { cooldownMult: 0.75, fx: { amount: 2 } } },
        }),
      ]),
    ],
  },
  life: {
    cost: 160, range: 170, role: 'economy', body: { kind: 'ground' },
    blurb: 'A garden. Weak in a fight; it feeds your treasury and your towers.',
    signature: { name: 'Green Thumb', desc: 'A shotgun of petals — its real worth is in what it grows.' },
    traits: {},
    attacks: {
      petals: ab(6, 700, { kind: 'bolt', texture: 'proj-life', color: 0x44cc44, speed: 480, count: 3, spread: 0.35 }, 'A shotgun of petals.', { name: 'Petal Burst' }),
    },
    paths: [
      path('Orchard', 'Pure income', [
        up('Fruit Trees', 180, 'Pays 40 gold every wave cleared.', 'leaves', { traits: { income: 40 } }),
        up('Bigger Harvest', 420, 'Pays 110 gold every wave cleared.', 'sack', { traits: { income: 110 } }),
        up('Market Stall', 1300, 'Pays 320 a wave, plus 1 gold every second a wave is on.', 'coins', { traits: { income: 320, trickle: 1 } }),
        up('Golden Apples', 3600, 'Pays 650 a wave and 4 gold a second during waves.', 'gold-trim', { traits: { income: 650, trickle: 4 } }),
        up('Tree of Plenty', 11000, 'Pays 1800 a wave and 10 gold a second during waves.', { kind: 'crown', color: 0xffd700 }, { traits: { income: 1800, trickle: 10 } }),
      ]),
      path('Grove', 'Grow the towers around it', [
        up('Fertilize', 160, 'Every 9s, nearby towers hit 25% harder for 5s.', 'roots', {
          add: { fertilize: ab(0, 9000, { kind: 'rally', radius: 170, ms: 5000, damageMult: 1.25, color: 0xffee55 }, 'Nearby towers hit 25% harder for 5s.', { name: 'Fertilize' }) },
        }),
        up('Deep Roots', 380, 'Fertilizes far more often.', 'roots', {
          mods: { fertilize: { cooldownMult: 0.6 } },
        }),
        up('Spring Bloom', 1400, 'ABILITY — Spring Bloom: towers in 260px fire 60% faster and hit 30% harder for 10s.', 'leaves', {
          active: { name: 'Spring Bloom', desc: 'Towers within 260px fire 60% faster and hit 30% harder for 10s.', cooldown: 40000, cast: ab(0, 0, { kind: 'rally', radius: 260, ms: 10000, fireRateMult: 1.6, damageMult: 1.3, color: 0xaaff66 }, 'A burst of growth.') },
        }),
        up('Canopy', 3800, 'A canopy over its neighbours: towers in 180px hit 15% harder and reach 10% further.', 'halo', {
          traits: { aura: { radius: 180, damage: 1.15, range: 1.1, label: 'Canopy', color: 0x66dd66 } },
          mods: { fertilize: { fx: { damageMult: 1.35 } } },
        }),
        up('World Tree', 9500, 'ABILITY — Everbloom: towers in 400px fire twice as fast, hit 50% harder for 15s. Mends 1 life every 30s.', { kind: 'crown', color: 0x66dd66 }, {
          add: { heal: ab(0, 30000, { kind: 'mend', amount: 1, color: 0x88ff99 }, 'Repairs one life of the keep.', { name: 'Sap of Life' }) },
          active: { name: 'Everbloom', desc: 'Towers within 400px fire twice as fast and hit 50% harder for 15s.', cooldown: 45000, cast: ab(0, 0, { kind: 'rally', radius: 400, ms: 15000, fireRateMult: 2, damageMult: 1.5, color: 0x88ff66 }, 'The world tree blooms.') },
        }),
      ]),
      path('Thornwild', 'Seeds, briars and snapping roots', [
        up('Seed Snaps', 150, 'Plants seeds on the road that snap at three passers each.', 'leaves', {
          add: { seeds: ab(12, 4500, { kind: 'trap', count: 2, hits: 3, ms: 9000, color: 0x55dd55, look: 'seed' }, 'Seeds that snap at whatever passes.', { name: 'Seed Snaps', gesture: 'e' }) },
        }),
        up('Briar Petals', 350, 'Petals hit +3, pierce one husk and make it bleed.', 'spikes', {
          mods: { petals: { damageAdd: 3, pierceAdd: 1, rider: { bleed: 2000 } } },
        }),
        up('Root Snare', 1200, 'Root walls block the road and lash back; seeds hit twice as hard and slow.', 'roots', {
          add: { roots: ab(25, 6000, { kind: 'barrier', ms: 6000, hp: 140, color: 0x33aa33, label: '🌿' }, 'A root wall that husks must chew through.', { name: 'Root Snare', gesture: 'f' }) },
          mods: { seeds: { damageMult: 2, rider: { slow: { mult: 0.6, ms: 1500 } } } },
        }),
        up('Venus Traps', 3200, 'Seeds bloom into flytraps: ×3 damage, two more per toss, and each bite takes 4% of current health.', 'spikes', {
          mods: { seeds: { damageMult: 3, countAdd: 2, rider: { pct: 0.04 } } },
        }),
        up('Wild Heart', 9000, 'Everything ×3, and petals fire in bursts of two.', { kind: 'horns', color: 0x2f8f3e }, {
          mods: { '*': { damageMult: 3 }, petals: { fx: { salvo: 2 } } },
        }),
      ]),
    ],
  },
  air: {
    cost: 130, range: 150, role: 'attack', body: { kind: 'heli', leash: 170, speed: 170 },
    blurb: 'Hover flyer. Leaves its pad to dance over the lead husk, fans cutting.',
    signature: { name: 'Skirmisher', desc: 'Hovers over the pack within reach of its pad. Airborne husks take ×1.5.' },
    traits: { antiAir: 1.5 },
    attacks: {
      fan: ab(9, 420, { kind: 'bolt', look: 'fan', color: 0xaaddff, speed: 640, pierce: 1 }, 'Wind Splice: fan cuts, one after another.', { name: 'Wind Splice' }),
    },
    paths: [
      path('Gale Blades', 'Faster, sharper fans', [
        up('Sharper Fans', 120, 'Fans hit +3.', 'sparks', { mods: { fan: { damageAdd: 3 } } }),
        up('Twin Fans', 300, 'Throws two fans at once.', 'sparks', { mods: { fan: { countAdd: 1, fx: { spread: 0.25 } } } }),
        up('Glaive', 950, 'Adds a glaive that cuts out through the whole line and back again.', { kind: 'orbit', color: 0xeaf6ff }, {
          add: { glaive: ab(40, 2600, { kind: 'bolt', look: 'fan', color: 0xeaf6ff, speed: 460, pierce: 99, size: 1.5, returns: true }, 'A glaive that cuts out and back.', { name: 'Glaive', gesture: 'r' }) },
        }),
        up('Razor Wind', 2800, 'All cuts ×2, and fans leave husks bleeding.', 'spikes', {
          mods: { '*': { damageMult: 2 }, fan: { rider: { bleed: 2000 } } },
        }),
        up('Thousand Cuts', 8500, 'Everything ×1.6, fans 20% faster in bursts of three.', { kind: 'wings', color: 0xeaf6ff }, {
          mods: { '*': { damageMult: 1.6 }, fan: { cooldownMult: 0.8, fx: { salvo: 3 } } },
        }),
      ]),
      path('Cyclone', 'Shove, drag and slam the pack', [
        up('Gust', 140, 'A spinning gust every 2.6s cuts and shoves everything under it.', 'motes', {
          add: { gust: ab(12, 2600, { kind: 'nova', radius: 100, color: 0xcceeff }, 'A spin that cuts and shoves.', { name: 'Gust', rider: { knockback: 30 }, gesture: 'e' }) },
        }),
        up('Updraft', 320, 'Wider gusts shove twice as far.', 'motes', {
          mods: { gust: { areaMult: 1.25, rider: { knockback: 60 } } },
        }),
        up('Tornado', 1200, 'ABILITY — Tornado: a twister drags husks back up the road for 6s.', 'antenna', {
          active: { name: 'Tornado', desc: 'A 130px twister drags husks back up the road for 6s.', cooldown: 30000, cast: ab(20, 0, { kind: 'zone', radius: 130, ms: 6000, color: 0xbbddff, shape: 'storm', pull: 80 }, 'A tornado.') },
        }),
        up('Downburst', 3000, 'Gusts slam flyers to the ground for 3s, stun briefly and hit ×2.5.', 'wings', {
          mods: { gust: { damageMult: 2.5, rider: { ground: 3000, stun: 400 } } },
        }),
        up('Hurricane', 9000, 'ABILITY — Hurricane: every husk on the map takes 300, is hurled back 160px and slowed. Gusts ×2.', { kind: 'crown', color: 0xbbddff }, {
          mods: { gust: { damageMult: 2 } },
          active: { name: 'Hurricane', desc: 'Every husk on the map takes 300, is hurled back 160px and slowed for 4s.', cooldown: 45000, global: true, cast: ab(300, 0, { kind: 'field', color: 0xcceeff }, 'A hurricane.', { rider: { knockback: 160, slow: { mult: 0.5, ms: 4000 } } }) },
        }),
      ]),
      path('Sky Ace', 'Hunt the hidden and rule the air', [
        up('Keen Eyes', 100, 'Sees hidden husks.', 'eye', { traits: { detect: true } }),
        up('Featherweight', 250, 'Roams 230px from its pad, flies faster and reaches 15% further.', 'wings', {
          body: { leash: 230, speed: 230 }, range: 1.15,
        }),
        up('Jet Stream', 1000, 'Airborne husks take ×2.5. Fans hit ×1.8 and tear camouflage away for good.', 'pennant', {
          traits: { antiAir: 2.5 },
          mods: { fan: { damageMult: 1.8, rider: { unmask: true } } },
        }),
        up('Sky Lord', 3200, 'One hit in five is a triple-damage critical. All hits ×1.8.', 'hat', {
          traits: { crit: { chance: 0.2, mult: 3 } },
          mods: { '*': { damageMult: 1.8 } },
        }),
        up('Storm Eagle', 9500, 'Calls thunder: a chain bolt that jumps through six husks. Everything ×2.', { kind: 'star', color: 0xffee66 }, {
          add: { thunder: ab(200, 800, { kind: 'chain', jumps: 6, jumpRange: 120, color: 0xffee66 }, 'Thunder that jumps through six husks.', { name: 'Thunder Talon' }) },
          mods: { '*': { damageMult: 2 } },
        }),
      ]),
    ],
  },
  earth: {
    cost: 210, range: 140, role: 'control', body: { kind: 'ground' },
    blurb: 'The wall. Blocks the road, batters what comes close, and cannot be shaken.',
    signature: { name: 'Bulwark', desc: 'Immune to every husk sabotage — no stuns, hacks, blinds or silences.' },
    traits: { steadfast: true },
    attacks: {
      bash: ab(34, 1100, { kind: 'bolt', color: 0x887755, speed: 440, size: 1.3 }, 'Bashes the nearest husk with a thrown shield.', { name: 'Shield Bash', rider: { knockback: 20 }, dtype: 'blast' }),
    },
    paths: [
      path('Bulwark', 'Walls on the road, wards on the keep', [
        up('Stone Wall', 200, 'Raises a stone wall across the road every 6s.', 'bricks', {
          add: { wall: ab(10, 6000, { kind: 'barrier', ms: 7000, hp: 160, color: 0x9a8866, label: '🛡️' }, 'A stone wall husks must chew through.', { name: 'Stone Wall', gesture: 'e' }) },
        }),
        up('Fortify', 450, 'Walls hold 260. The keep absorbs 2 breaches a wave.', 'shield', {
          traits: { keepWard: 2 },
          mods: { wall: { fx: { hp: 260 } } },
        }),
        up('Rampart', 1500, 'Walls hold 600, bite back ×4 and rise faster. Keep absorbs 4.', 'bricks', {
          traits: { keepWard: 4 },
          mods: { wall: { fx: { hp: 600 }, damageMult: 4, cooldownMult: 0.8 } },
        }),
        up('Citadel', 3800, 'Spiked walls bite ×3, bashes ×2. Keep absorbs 8 breaches a wave.', 'shield', {
          traits: { keepWard: 8 },
          mods: { wall: { damageMult: 3 }, bash: { damageMult: 2 } },
        }),
        up('Great Wall', 10000, 'Walls hold 2500 and bite ×3; bashes ×3. Keep absorbs 15 breaches a wave.', { kind: 'crown', color: 0xcfc3a8 }, {
          traits: { keepWard: 15 },
          mods: { wall: { fx: { hp: 2500 }, damageMult: 3 }, bash: { damageMult: 3 } },
        }),
      ]),
      path('Quake', 'Trip, stun and split the ground', [
        up('Tremor', 180, 'A fractured zone that trips husks (35% chance to stun).', 'runes', {
          add: { quake: ab(5, 5000, { kind: 'zone', radius: 110, ms: 5000, color: 0xaa9977, shape: 'rune' }, 'Quake: trips husks.', { name: 'Tremor', rider: { stun: 500, chance: 0.35 }, gesture: 'r' }) },
        }),
        up('Aftershock', 420, 'Quakes hit three times as hard and spread 20% wider.', 'runes', {
          mods: { quake: { damageMult: 3, areaMult: 1.2 } },
        }),
        up('Earthquake', 1300, 'ABILITY — Earthquake: every husk on the map takes 150 and is stunned 1.5s.', 'horns', {
          active: { name: 'Earthquake', desc: 'Every husk on the map takes 150 and is stunned for 1.5s.', cooldown: 40000, global: true, cast: ab(150, 0, { kind: 'field', color: 0xaa9977 }, 'The ground heaves.', { rider: { stun: 1500 } }) },
        }),
        up('Fault Line', 3400, 'Splits the road: a 240px fault stuns everything in it. Bashes ×2.', 'crystals', {
          add: { fault: ab(120, 3000, { kind: 'line', length: 240, width: 60, color: 0xbbaa88 }, 'A fault line that stuns what it splits.', { name: 'Fault Line', rider: { stun: 600 }, dtype: 'blast' }) },
          mods: { bash: { damageMult: 2 } },
        }),
        up('Cataclysm', 10500, 'ABILITY — Cataclysm: 1200 to every husk on the map, 3s stun, flyers grounded. All ×2.', { kind: 'crown', color: 0x776655 }, {
          mods: { '*': { damageMult: 2 } },
          active: { name: 'Cataclysm', desc: 'Every husk on the map takes 1200, is stunned 3s and grounded 4s.', cooldown: 50000, global: true, cast: ab(1200, 0, { kind: 'field', color: 0x8a6a4a }, 'The world breaks.', { rider: { stun: 3000, ground: 4000 } }) },
        }),
      ]),
      path('Titan', 'Orbiting stone and a golem guard', [
        up('Orbiting Rocks', 160, 'Rocks orbit the tower and batter anything close.', 'orbit', {
          add: { rocks: ab(12, 400, { kind: 'aura', radius: 90, color: 0xbbaa88, look: 'orbit' }, 'Orbiting rocks batter what comes close.', { name: 'Orbiting Rocks' }) },
        }),
        up('Heavy Stones', 380, 'Rocks hit twice as hard; bashes +15.', 'orbit', {
          mods: { rocks: { damageMult: 2 }, bash: { damageAdd: 15 } },
        }),
        up('Golem', 1400, 'A golem stands guard on the road for 15s at a time.', 'bricks', {
          add: { golem: ab(60, 15000, { kind: 'summon', ms: 15000, color: 0x776655, attackMs: 1000, attackRange: 90, label: '🗿' }, 'A golem guards the road.', { name: 'Golem', gesture: 'q' }) },
        }),
        up('Living Stone', 3600, 'All hits ×2.2. Grows 5% stronger each wave it stands (up to double).', 'crystals', {
          mods: { '*': { damageMult: 2.2 } },
          traits: { veteran: { per: 0.05, cap: 1 } },
        }),
        up('Mountain King', 9800, 'Golems stay for 30s (two at once) and hit ×3; rocks ×2; kills burst into shards.', { kind: 'crown', color: 0x9a8866 }, {
          mods: { golem: { damageMult: 3, fx: { ms: 30000 } }, rocks: { damageMult: 2 } },
          traits: { shrapnel: { count: 3, frac: 0.15 } },
        }),
      ]),
    ],
  },
  oil: {
    cost: 240, range: 190, role: 'summoner', body: { kind: 'ground' },
    blurb: 'Commander. Launches drones that fight on their own.',
    signature: { name: 'Drone Bay', desc: 'Launches drones that hover beside it and shoot on their own.' },
    traits: {},
    attacks: {
      drone: ab(8, 5000, { kind: 'sentry', ms: 15000, max: 2, attackMs: 450, range: 170, color: 0xff9944, look: 'drone' }, 'Launches a drone that fires for 15s (two at once).', { name: 'Drone' }),
    },
    paths: [
      path('Drone Bay', 'More drones, hotter rounds', [
        up('Third Drone', 220, 'Three drones in the air.', 'antenna', { mods: { drone: { countAdd: 1 } } }),
        up('Hot Rounds', 500, 'Drone rounds hit +5 and set husks burning.', 'flame', { mods: { drone: { damageAdd: 5, rider: { burn: 1500 } } } }),
        up('Kamikaze', 1500, 'A drone dives on the target every 3s and explodes.', 'barrel', {
          add: { dive: ab(60, 3000, { kind: 'bolt', color: 0x885522, speed: 380, splash: 80, splashMult: 0.8, homing: true }, 'A drone dives and explodes.', { name: 'Kamikaze', gesture: 'r' }) },
        }),
        up('Swarm Protocol', 4200, 'Two more drones; everything ×2.', 'antenna', { mods: { drone: { countAdd: 2 }, '*': { damageMult: 2 } } }),
        up('Hive Carrier', 12000, 'A sixth drone, all hits ×2, drones fire every 0.3s.', { kind: 'wings', color: 0xff9944 }, {
          mods: { '*': { damageMult: 2 }, drone: { countAdd: 1, fx: { attackMs: 300 } } },
        }),
      ]),
      path('Refinery', 'Slicks, fire and a runaway train', [
        up('Oil Slick', 200, 'A rolling barrel leaves a slick that slows husks to 55%.', 'barrel', {
          add: { slick: ab(3, 5000, { kind: 'zone', radius: 70, ms: 6000, color: 0x553300, shape: 'puddle' }, 'An oil slick that slows.', { name: 'Oil Slick', rider: { slow: { mult: 0.55, ms: 1000 } }, gesture: 'e' }) },
        }),
        up('Tar Pits', 480, 'Wider slicks slow to 40% and leave husks brittle.', 'barrel', {
          mods: { slick: { areaMult: 1.3, rider: { slow: { mult: 0.4, ms: 1000 }, brittle: { add: 3, ms: 2000 } } } },
        }),
        up('Gusher', 1600, 'ABILITY — Gusher: a 200px lake of oil slows to 30% for 8s. Slicks hurt ×4.', 'gears', {
          mods: { slick: { damageMult: 4 } },
          active: { name: 'Gusher', desc: 'A 200px lake of oil slows everything in it to 30% for 8s.', cooldown: 35000, cast: ab(20, 0, { kind: 'zone', radius: 200, ms: 8000, color: 0x332200, shape: 'puddle' }, 'A gusher.', { rider: { slow: { mult: 0.3, ms: 1000 } } }) },
        }),
        up('Ignition', 4000, 'Slicks catch fire (×4) and drones set husks burning.', 'flame', {
          mods: { slick: { damageMult: 4, rider: { burn: 2000 } }, drone: { rider: { burn: 2000 } } },
        }),
        up('Oil Baron', 11000, 'ABILITY — Inferno Train ploughs through forty husks. Oil money: 5 gold a second during waves.', { kind: 'hat', color: 0x333333 }, {
          traits: { trickle: 5 },
          active: { name: 'Inferno Train', desc: 'A burning train ploughs up the road through forty husks for 400 each.', cooldown: 30000, cast: ab(400, 0, { kind: 'minion', hits: 40, speed: 240, ms: 8000, color: 0x333333, look: 'car', size: 1.8 }, 'A burning train.', { rider: { burn: 3000, knockback: 40 } }) },
        }),
      ]),
      path('War Rig', 'Turrets and shield generators', [
        up('Turret', 250, 'Mounts a gun that hoses the road for 12s at a time.', 'scope', {
          add: { turret: ab(10, 9000, { kind: 'sentry', ms: 12000, max: 1, attackMs: 250, range: 200, color: 0xff8833, look: 'turret' }, 'A mounted gun.', { name: 'Turret', gesture: 'q' }) },
        }),
        up('Shield Generator', 550, 'A hex shield seals the road for 5s every 9s.', 'shield', {
          add: { shield: ab(0, 9000, { kind: 'barrier', ms: 5000, hp: 200, color: 0x44ccaa, label: '⬡' }, 'A hex shield across the road.', { name: 'Shield Generator', gesture: 'f' }) },
        }),
        up('Gatling', 1800, 'The turret spins up: +6 a round and fires every 0.15s.', 'gears', {
          mods: { turret: { damageAdd: 6, fx: { attackMs: 150 } } },
        }),
        up('Armour Piercing', 4500, 'A second turret; every round hits ×2.2 and corrodes armour.', 'scope', {
          mods: { turret: { countAdd: 1 }, '*': { damageMult: 2.2, rider: { corrode: 2000 } } },
        }),
        up('Fortress Rig', 12500, 'Everything ×2; turrets fire every 0.1s.', { kind: 'banner', color: 0x44ccaa }, {
          mods: { '*': { damageMult: 2 }, turret: { fx: { attackMs: 100 } } },
        }),
      ]),
    ],
  },
  shadow: {
    cost: 115, range: 180, role: 'trap', body: { kind: 'ground' },
    blurb: 'Trapper. Fills the road with caltrops and snap traps that sap hope.',
    signature: { name: 'Hopelessness', desc: 'Its caltrops Weaken: the husk takes 15% more from every tower.' },
    traits: {},
    attacks: {
      caltrops: ab(6, 1600, { kind: 'trap', count: 3, hits: 2, ms: 12000, color: 0x552277, look: 'spike' }, 'Scatters shadow caltrops on the road.', { name: 'Caltrops', rider: { weaken: { mult: 1.15, ms: 3000 } } }),
    },
    paths: [
      path('Snares', 'Traps that hold', [
        up('Crippling Spikes', 100, 'Caltrops slow husks to 70% for 3s.', 'spikes', { mods: { caltrops: { rider: { slow: { mult: 0.7, ms: 3000 } } } } }),
        up('Snap Trap', 260, 'Adds a snap trap: the first husk in is stunned 1.2s.', 'runes', {
          add: { snap: ab(45, 5000, { kind: 'trap', count: 1, hits: 1, ms: 15000, color: 0x8844bb, look: 'rune' }, 'The first husk in is stunned.', { name: 'Snap Trap', rider: { stun: 1200 }, gesture: 'r' }) },
        }),
        up('Bear Traps', 900, 'Snap traps come in pairs, hit ×3 and bite 5% of current health.', 'spikes', {
          mods: { snap: { countAdd: 1, damageMult: 3, rider: { pct: 0.05 } } },
        }),
        up('Minefield', 2600, 'Six caltrops a toss, each ×3.', 'chains', { mods: { caltrops: { countAdd: 3, damageMult: 3 } } }),
        up('Labyrinth', 7500, 'Everything ×3; snaps hold 2.5s; caltrops last two more steps.', { kind: 'skull', color: 0x8844bb }, {
          mods: { '*': { damageMult: 3 }, snap: { rider: { stun: 2500 } }, caltrops: { pierceAdd: 2 } },
        }),
      ]),
      path('Void', 'Tentacles and the black hole', [
        up('Tentacle', 160, 'A tentacle holds a husk for 3s, squeezing and slowing it.', 'chains', {
          add: { tentacle: ab(14, 3000, { kind: 'beam', color: 0x331144, width: 9, ms: 3000 }, 'A tentacle holds and squeezes.', { name: 'Tentacle', rider: { slow: { mult: 0.5, ms: 600 }, weaken: { mult: 1.15, ms: 3000 } }, gesture: 'e' }) },
        }),
        up('Consume', 380, 'Tentacles squeeze twice as hard and tighten the longer they hold.', 'chains', {
          mods: { tentacle: { damageMult: 2, fx: { ramp: 0.5 } } },
        }),
        up('Black Hole', 1300, 'ABILITY — Black Hole: drags the pack backward and slows it for 5s.', { kind: 'moon', color: 0x6622aa }, {
          active: { name: 'Black Hole', desc: 'A 140px black hole drags husks back up the road for 5s.', cooldown: 30000, cast: ab(40, 0, { kind: 'zone', radius: 140, ms: 5000, color: 0x110022, shape: 'rune', pull: 110 }, 'A black hole.', { rider: { slow: { mult: 0.25, ms: 600 } } }) },
        }),
        up('Watchers', 3000, 'Spiked tentacles erupt along the road, making husks bleed. Tentacle ×2.', 'eye', {
          add: { spikes: ab(60, 4000, { kind: 'line', length: 220, width: 40, color: 0x220033 }, 'A wall of spiked tentacles.', { name: 'Tentacle Wall', rider: { bleed: 3000 }, gesture: 'f' }) },
          mods: { tentacle: { damageMult: 2 } },
        }),
        up('Singularity', 9000, 'ABILITY — Event Horizon: 500 to every husk on the map, 25% banished to the breach.', { kind: 'moon', color: 0x220033 }, {
          active: { name: 'Event Horizon', desc: 'Every husk on the map takes 500 and is weakened; one in four is banished to its breach.', cooldown: 55000, global: true, cast: ab(500, 0, { kind: 'field', color: 0x330055 }, 'The void opens.', { rider: { banish: 0.25, weaken: { mult: 1.3, ms: 6000 } } }) },
        }),
      ]),
      path('Despair', 'Curse the pack for everyone', [
        up('Gloom Sight', 120, 'Sees hidden husks.', 'eye', { traits: { detect: true } }),
        up('Despair', 300, 'Everything it touches is weakened ×1.3 for 4s.', 'runes', { mods: { '*': { rider: { weaken: { mult: 1.3, ms: 4000 } } } } }),
        up('Shade Bolts', 1100, 'Fires seeking shade bolts that leave husks brittle (+5 per hit).', 'motes', {
          add: { shade: ab(30, 700, { kind: 'bolt', color: 0x8844bb, speed: 480, homing: true }, 'Seeking shade bolts.', { name: 'Shade Bolt', rider: { brittle: { add: 5, ms: 3000 } } }) },
        }),
        up('Dread', 3200, 'Towers within 160px hit 15% harder. Shade bolts ×2.', 'cape', {
          traits: { aura: { radius: 160, damage: 1.15, label: 'Dread', color: 0x8844bb } },
          mods: { shade: { damageMult: 2 } },
        }),
        up('Eclipse', 9200, 'Shade bolts ×3 in bursts of two; weaken ×1.5. Hidden husks take double.', { kind: 'moon', color: 0x8844bb }, {
          traits: { vsHidden: 2 },
          mods: { shade: { damageMult: 3, fx: { salvo: 2 } }, '*': { rider: { weaken: { mult: 1.5, ms: 4000 } } } },
        }),
      ]),
    ],
  },
  ice: {
    cost: 140, range: 160, role: 'control', body: { kind: 'ground' },
    blurb: 'Chills everything near it, then shatters what it has frozen.',
    signature: { name: 'Shatter', desc: 'Frozen, encased or heavily frosted husks take ×1.4 from this tower.' },
    traits: { shatter: 1.4 },
    attacks: {
      spike: ab(13, 700, { kind: 'bolt', texture: 'proj-ice', color: 0x88ccff, speed: 520, pierce: 2 }, 'Piercing ice spikes; each hit adds a frost stack.', { name: 'Ice Spike', rider: { frost: 1 } }),
    },
    paths: [
      path('Glacier', 'Slow everything to a crawl', [
        up('Chill Aura', 120, 'A permanent chill around the tower frosts passers.', 'motes', {
          add: { chill: ab(2, 400, { kind: 'aura', radius: 100, color: 0xcceeff, look: 'frost' }, 'A chill that frosts and slows.', { name: 'Chill Aura', rider: { frost: 1, chance: 0.4 } }) },
        }),
        up('Permafrost', 300, 'The chill spreads 30% wider and frosts every tick.', 'crystals', { mods: { chill: { areaMult: 1.3, rider: { frost: 1, chance: 1 } } } }),
        up('Block Up', 1000, 'Every 6s, everything around the tower freezes solid for 1.5s.', 'crystals', {
          add: { blockup: ab(10, 6000, { kind: 'nova', radius: 110, color: 0xaaddff }, 'Freezes everything near solid.', { name: 'Block Up', rider: { freeze: 1500 }, gesture: 'r' }) },
        }),
        up('Ice Age', 2800, 'Frozen husks turn brittle (+6 per hit); Block Up comes 30% sooner and holds 2.2s.', 'crystals', {
          mods: { '*': { rider: { brittle: { add: 6, ms: 2500 } } }, blockup: { cooldownMult: 0.7, rider: { freeze: 2200 } } },
        }),
        up('Absolute Zero', 8000, 'The chill grows 50% and slows to 40%; Block Up holds 3s; slowed husks take double.', { kind: 'halo', color: 0xe6f7ff }, {
          traits: { bully: 2 },
          mods: { chill: { areaMult: 1.5, rider: { slow: { mult: 0.4, ms: 800 } } }, blockup: { areaMult: 1.5, rider: { freeze: 3000 } } },
        }),
      ]),
      path('Curling', 'Stones up the road, blizzards on call', [
        up('Skate', 150, 'A curling stone slides up the road through six husks, frosting them.', 'orbit', {
          add: { stone: ab(22, 7000, { kind: 'minion', hits: 6, speed: 160, ms: 7000, color: 0x88ccff, look: 'curling' }, 'A curling stone slides up the road.', { name: 'Skate', rider: { frost: 2 }, gesture: 'f' }) },
        }),
        up('Heavy Stone', 350, 'Stones hit twice as hard and plough through four more.', 'orbit', { mods: { stone: { damageMult: 2, pierceAdd: 4 } } }),
        up('Blizzard', 1200, 'ABILITY — Blizzard: every husk on the map takes 80, freezes 2.5s and frosts.', 'antenna', {
          active: { name: 'Blizzard', desc: 'Every husk on the map takes 80, is frozen 2.5s and frosted.', cooldown: 40000, global: true, cast: ab(80, 0, { kind: 'field', color: 0xcceeff }, 'A blizzard.', { rider: { freeze: 2500, frost: 4 } }) },
        }),
        up('Curling Bomb', 3000, 'Slides a bomb onto the road every 6s that blows and frosts the pack.', 'barrel', {
          add: { bomb: ab(120, 6000, { kind: 'splash', radius: 110, color: 0x88ccff, delayMs: 1500, shape: 'crater' }, 'A curling bomb that blows.', { name: 'Curling Bomb', rider: { frost: 3 } }) },
        }),
        up('Polar Vortex', 9500, 'ABILITY — Polar Vortex: 600 to every husk on the map, frozen 4s and left brittle. All ×2.', { kind: 'crown', color: 0xe6f7ff }, {
          mods: { '*': { damageMult: 2 } },
          active: { name: 'Polar Vortex', desc: 'Every husk on the map takes 600, freezes 4s and turns brittle (+15 a hit).', cooldown: 50000, global: true, cast: ab(600, 0, { kind: 'field', color: 0xe6f7ff }, 'The pole comes south.', { rider: { freeze: 4000, brittle: { add: 15, ms: 6000 } } }) },
        }),
      ]),
      path('Shatterpoint', 'Break what is frozen', [
        up('Sharp Icicles', 130, 'Spikes hit +5.', 'spikes', { mods: { spike: { damageAdd: 5 } } }),
        up('Shatter', 320, 'Frozen and frosted husks take ×2.2 from it.', 'crystals', { traits: { shatter: 2.2 } }),
        up('Icicle Lance', 1100, 'Spikes 30% faster, plus a lance that pierces six every 2.2s.', 'scope', {
          add: { lance: ab(80, 2200, { kind: 'bolt', look: 'needle', color: 0xbbeeff, speed: 800, pierce: 6 }, 'An icicle lance that pierces six.', { name: 'Icicle Lance', rider: { frost: 2 } }) },
          mods: { spike: { cooldownMult: 0.7 } },
        }),
        up('Frozen Solid', 3200, 'A freezing cone every 6s; all hits ×1.8.', 'crystals', {
          add: { cone: ab(100, 6000, { kind: 'line', length: 260, width: 110, color: 0xe6f7ff }, 'A cone that freezes everything in it.', { name: 'Frozen Solid', rider: { freeze: 2500 }, gesture: 'q' }) },
          mods: { '*': { damageMult: 1.8 } },
        }),
        up('Diamond Dust', 9000, 'Everything ×3; spikes in bursts of two; frozen husks take ×3.', { kind: 'star', color: 0xe6f7ff }, {
          traits: { shatter: 3 },
          mods: { '*': { damageMult: 3 }, spike: { fx: { salvo: 2 } } },
        }),
      ]),
    ],
  },
  subterfuge: {
    cost: 85, range: 200, role: 'economy', body: { kind: 'ground' },
    blurb: 'The fence. Sees through disguises, skims gold, and hires help.',
    signature: { name: 'Informant', desc: 'Sees hidden husks from the start.' },
    traits: { detect: true },
    attacks: {
      daggers: ab(8, 520, { kind: 'bolt', texture: 'proj-subterfuge', color: 0xcc2233, speed: 620 }, 'Throws daggers that find even hidden husks.', { name: 'Dagger Toss' }),
    },
    paths: [
      path('Racket', 'Skim gold off every husk', [
        up('Pickpocket', 90, 'Each dagger hit lifts half a gold (up to 40 a wave).', 'coins', { traits: { goldOnHit: { perHit: 0.5, cap: 40 } } }),
        up('Bribery', 260, 'Skims 10 gold off the passing pack every 7s.', 'sack', {
          add: { bribe: ab(0, 7000, { kind: 'gold', amount: 10, color: 0xffd700 }, 'Skims gold off the pack.', { name: 'Bribe', gesture: 'f' }) },
        }),
        up('Protection Racket', 900, 'A gold a hit (up to 140 a wave); daggers gild — kills pay ×1.5.', 'coins', {
          traits: { goldOnHit: { perHit: 1, cap: 140 } },
          mods: { daggers: { rider: { gild: 1.5 } } },
        }),
        up('Kingpin', 2800, 'Pays 200 a wave; gilded kills pay double; bribes take 25.', 'hat', {
          traits: { income: 200 },
          mods: { daggers: { rider: { gild: 2 } }, bribe: { fx: { amount: 25 } } },
        }),
        up('Shadow Cabinet', 8500, 'Two gold a hit (500 a wave), 600 a wave, and towers within 200px cost 15% less.', { kind: 'crown', color: 0xffd700 }, {
          traits: { goldOnHit: { perHit: 2, cap: 500 }, income: 600, discount: { radius: 200, mult: 0.85 } },
        }),
      ]),
      path('Syndicate', 'Hired help and dirty contracts', [
        up('Lackey', 160, 'Recruits a lackey who works the road for 10s at a time.', 'hat', {
          add: { lackey: ab(10, 9000, { kind: 'summon', ms: 10000, color: 0xcc2233, attackMs: 600, attackRange: 150, label: '🕴️' }, 'A lackey works the road.', { name: 'Lackey', gesture: 'r' }) },
        }),
        up('Hired Muscle', 380, 'Lackeys hit twice as hard and stay 14s.', 'shield', { mods: { lackey: { damageMult: 2, fx: { ms: 14000 } } } }),
        up('Hit Contract', 1300, 'ABILITY — Contract: executes the lead husk under 60% health (bosses take 1500).', 'skull', {
          active: { name: 'Contract', desc: 'Executes the lead husk on the map under 60% health; otherwise (and bosses) 1500.', cooldown: 25000, global: true, cast: ab(1500, 0, { kind: 'execute', thresholdFrac: 0.6, color: 0xcc2233 }, 'A contract killing.') },
        }),
        up('Smoke Bombs', 3200, 'Smoke on the road every 6s turns 40% of husks around for 1.5s.', 'barrel', {
          add: { smoke: ab(15, 6000, { kind: 'zone', radius: 100, ms: 4000, color: 0x555555, shape: 'smoke' }, 'Smoke that turns husks around.', { name: 'Smoke Bomb', rider: { confuse: 1500, chance: 0.4 } }) },
        }),
        up('Dark Treachery', 9000, 'ABILITY — Dark Treachery: 700 to every husk on the map; all gilded ×3 and turned around.', { kind: 'cape', color: 0x111111 }, {
          active: { name: 'Dark Treachery', desc: 'Every husk on the map takes 700, is gilded ×3 and turned around 2.5s.', cooldown: 50000, global: true, cast: ab(700, 0, { kind: 'field', color: 0x221111 }, 'Black fog.', { rider: { gild: 3, confuse: 2500 } }) },
        }),
      ]),
      path('Assassin', 'Crits, fans of knives, death marks', [
        up('Serrated Blades', 120, 'Daggers hit +4 and make husks bleed.', 'spikes', { mods: { daggers: { damageAdd: 4, rider: { bleed: 2000 } } } }),
        up('Fan of Knives', 300, 'Throws three daggers at once.', 'cards', { mods: { daggers: { countAdd: 2, fx: { spread: 0.4 } } } }),
        up('Backstab', 1000, 'One hit in four crits for ×3; hidden husks take double.', 'eye', {
          traits: { crit: { chance: 0.25, mult: 3 }, vsHidden: 2 },
        }),
        up('Marked for Death', 3000, 'Each hit on the same husk ramps +15% (up to +150%). All hits ×2.', 'skull', {
          traits: { focus: { per: 0.15, cap: 1.5 } },
          mods: { '*': { damageMult: 2 } },
        }),
        up('Death Mark', 9000, 'Everything ×2; daggers fly in bursts of three and cut 3% of current health.', { kind: 'skull', color: 0xcc2233 }, {
          mods: { '*': { damageMult: 2 }, daggers: { fx: { salvo: 3 }, rider: { pct: 0.03 } } },
        }),
      ]),
    ],
  },
};
