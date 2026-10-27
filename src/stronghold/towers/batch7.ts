import type { TowerDef } from '../StrongholdTypes';
import { ab, path, up } from './helpers';

/** Bind, Savor (gum), Wood (gluttony), Pressure, Ink, Astra, Memory, String, Wax and Clay. */
export const BATCH7_TOWERS: Record<string, TowerDef> = {
  bind: {
    cost: 195, range: 180, role: 'control', body: { kind: 'ground' },
    blurb: 'Soul binder. Chains the pack in place and sends the drained dead back down the road.',
    signature: { name: 'Lost Souls', desc: 'Its chains hold husks in place while its daggers bleed them.' },
    traits: {},
    attacks: {
      dagger: ab(14, 500, { kind: 'bolt', look: 'needle', color: 0xe0b743, speed: 640 }, 'Chainbound Daggers: a dagger on a short chain.', { name: 'Chainbound Daggers', dtype: 'sharp' }),
    },
    paths: [
      path('Shackles', 'Chain the pack in place', [
        up('Bind', 200, 'Adds Bind: a chain through four husks that stuns them for 1s.', 'chains', {
          add: { bind: ab(12, 4000, { kind: 'chain', jumps: 3, jumpRange: 100, color: 0xa9a2b8 }, 'Bind: a chain through the pack that holds them.', { name: 'Bind', rider: { stun: 1000 }, gesture: 'e' }) },
        }),
        up('Heavy Links', 380, 'Bind reaches two more husks, holds 1.5s, and recasts 20% sooner.', 'chains', {
          mods: { bind: { countAdd: 2, cooldownMult: 0.8, rider: { stun: 1500 } } },
        }),
        up('Iron Maiden', 1300, 'Held husks take ×1.5 from this tower. Daggers hit ×2.5.', 'spikes', {
          traits: { bully: 1.5 },
          mods: { dagger: { damageMult: 2.5 } },
        }),
        up('Chain Gang', 3600, 'Bind hits ×6 and stitches its prisoners: each shares 30% of its hurt.', 'chains', {
          mods: { bind: { damageMult: 6, rider: { link: 4000 } }, dagger: { damageMult: 1.6, rider: { brittle: { add: 6, ms: 3000 } } } },
        }),
        up('Eternal Bondage', 9500, 'Bind chains four more, holds 2s, recasts 40% sooner, hits ×3. Daggers ×2.5. Bosses ×1.3.', 'horns', {
          mods: { bind: { countAdd: 4, cooldownMult: 0.6, damageMult: 3, rider: { stun: 2000 } }, dagger: { damageMult: 2.5 } },
          traits: { bossBane: 1.3 },
        }),
      ]),
      path('Soulcatcher', 'Drained souls run back through the pack', [
        up('Siphon', 250, 'Adds Siphon: a revenant runs up the road through five husks.', 'motes', {
          add: { siphon: ab(16, 7000, { kind: 'minion', hits: 5, speed: 150, ms: 8000, color: 0xd8202a, look: 'ghost' }, 'Siphon: a revenant runs through the pack.', { name: 'Siphon', gesture: 'f' }) },
        }),
        up('Lost Souls', 500, 'Revenants strike 3 more and come 25% sooner. 20% of husks dying in range rise as ghosts.', 'motes', {
          mods: { siphon: { pierceAdd: 3, cooldownMult: 0.75 } },
          traits: { raiseDead: { chance: 0.2, hits: 3 } },
        }),
        up('Ritual', 1500, 'ABILITY — Ritual: everything within 220px takes 300 and is stunned 1.5s.', 'runes', {
          active: { name: 'Ritual', desc: 'A 220px judgement: 300 damage and a 1.5s stun.', cooldown: 30000, cast: ab(300, 0, { kind: 'nova', radius: 220, color: 0xd8202a }, 'The god answers.', { rider: { stun: 1500 } }) },
        }),
        up('Revenant Host', 3800, 'Revenants ×6 through 4 more, daggers ×1.5. 40% of the dead rise. Six deaths charge a ×3 cast.', 'skull', {
          mods: { siphon: { damageMult: 6, pierceAdd: 4 }, dagger: { damageMult: 1.5 } },
          traits: { raiseDead: { chance: 0.4, hits: 6 }, reap: { need: 6, mult: 3 } },
        }),
        up('False God', 11000, 'ABILITY — Judgement: every husk on the map takes 1200, is stunned 1.5s, 15% banished. Siphon ×3.', 'eye', {
          mods: { siphon: { damageMult: 3 }, dagger: { damageMult: 2 } },
          active: { name: 'Judgement', desc: 'Every husk takes 1200, is stunned 1.5s; 15% are thrown back to the breach.', cooldown: 50000, global: true, cast: ab(1200, 0, { kind: 'field', color: 0xd8202a }, 'The false god judges the road.', { rider: { stun: 1500, banish: 0.15 } }) },
        }),
      ]),
      path('Blackened Eyes', 'See every soul and curse it', [
        up('Blackened Eyes', 150, 'Sees hidden husks; daggers reveal what they hit for 3s.', 'lantern', {
          traits: { detect: true },
          mods: { dagger: { rider: { reveal: 3000 } } },
        }),
        up('Soul Sight', 420, 'Daggers strip camouflage for good. +15% range.', 'lantern', {
          range: 1.15,
          mods: { dagger: { damageAdd: 4, rider: { unmask: true } } },
        }),
        up('Curse Mark', 1200, 'Daggers curse: husks take ×1.25 from everything for 4s. Hidden husks take ×1.8.', 'book', {
          mods: { dagger: { damageMult: 1.4, rider: { weaken: { mult: 1.25, ms: 4000 } } } },
          traits: { vsHidden: 1.8 },
        }),
        up('Blood Pact', 3200, 'Three daggers a throw, ×1.6, each also takes 2% of current health.', 'book', {
          mods: { dagger: { damageMult: 1.6, fx: { salvo: 3 }, rider: { pct: 0.02 } } },
        }),
        up('Doom Ledger', 8800, 'Daggers ×3.5 and take 5% of current health; 20% crit for ×3.', 'moon', {
          mods: { dagger: { damageMult: 3.5, rider: { pct: 0.05 } } },
          traits: { crit: { chance: 0.2, mult: 3 } },
        }),
      ]),
    ],
  },

  gum: {
    cost: 90, range: 175, role: 'control', body: { kind: 'ground' },
    blurb: 'Savor. Sugar bombs that leave the road sticky — and, further up, salt that cuts.',
    signature: { name: 'Sugar Trail', desc: 'Everything it throws leaves the road sticky. Damage comes later, with the salt.' },
    traits: {},
    attacks: {
      slam: ab(4, 750, { kind: 'bolt', color: 0xfbf7ff, speed: 560, splash: 40 }, 'Sugar Slam: a sugar bomb that leaves a husk sticky for 3s.', { name: 'Sugar Slam', rider: { slow: { mult: 0.55, ms: 3000 } } }),
    },
    paths: [
      path('Sugar Rush', 'Turn the road itself to syrup', [
        up('Sugar Cloud', 90, 'Adds a sugar cloud on the road that slows to 45%.', 'bubbles', {
          add: { cloud: ab(2, 4500, { kind: 'zone', radius: 70, ms: 4000, color: 0xfbf7ff, shape: 'glue' }, 'Sugar cloud: the road goes sticky.', { name: 'Sugar Slam', rider: { slow: { mult: 0.45, ms: 700 } }, gesture: 'e' }) },
        }),
        up('Thick Syrup', 200, 'Clouds are 30% wider and slow to 35%.', 'bubbles', {
          mods: { cloud: { areaMult: 1.3, rider: { slow: { mult: 0.35, ms: 700 } } } },
        }),
        up('Sugar Diffusion', 700, 'Adds Sugar Diffusion: a 160px stretch of road turns to syrup for 6s.', 'moat', {
          add: { diffusion: ab(3, 9000, { kind: 'zone', radius: 160, ms: 6000, color: 0xff8fc0, shape: 'glue' }, 'Sugar Diffusion: a whole stretch of road turns to syrup.', { name: 'Sugar Diffusion', rider: { slow: { mult: 0.3, ms: 600 } }, gesture: 'r' }) },
        }),
        up('Blood Sugar', 1900, 'Clouds and the syrup drain husks backward up the road.', 'moat', {
          mods: { cloud: { fx: { pull: 22 } }, diffusion: { fx: { pull: 30 }, cooldownMult: 0.8 } },
        }),
        up('Sugar High', 5500, 'Syrup 40% wider, crystallises under pressure: slows to 20% and stuns in bursts.', { kind: 'crown', color: 0xff5f9e }, {
          mods: { diffusion: { areaMult: 1.4, damageMult: 5, rider: { slow: { mult: 0.2, ms: 700 }, stun: 250 } }, cloud: { rider: { slow: { mult: 0.25, ms: 700 } } } },
        }),
      ]),
      path('Salt', 'Shards that cut the whole pack', [
        up('Salt Slice', 120, 'Adds Salt Slice: a fast shard over the pack every 2.5s.', 'barrel', {
          add: { slice: ab(6, 2500, { kind: 'bolt', color: 0xe8eef2, speed: 950, size: 1.4, splash: 50 }, 'Salt Slice: a fast shard of salt.', { name: 'Salt Slice', rider: { slow: { mult: 0.5, ms: 2500 } }, gesture: 'click' }) },
        }),
        up('Shaker', 260, 'Sugar Slam throws three bombs at once.', 'barrel', {
          mods: { slam: { countAdd: 2, fx: { spread: 0.5 } } },
        }),
        up('Sugar Rush', 900, 'ABILITY — Sugar Rush: every husk on the map is slowed to 30% for 5s.', 'shield', {
          active: { name: 'Sugar Rush', desc: 'Every husk on the map slowed to 30% for 5s.', cooldown: 35000, global: true, cast: ab(0, 0, { kind: 'field', color: 0xff8fc0 }, 'Sugar everywhere.', { rider: { slow: { mult: 0.3, ms: 5000 } } }) },
        }),
        up('Salt in the Wounds', 2400, 'Everything it throws slows to 30% and drags flyers down to the road for 3s.', 'spikes', {
          mods: { '*': { rider: { slow: { mult: 0.3, ms: 3000 }, ground: 3000 } }, slice: { areaMult: 1.3 } },
        }),
        up('Salt Crash', 7000, 'ABILITY — Salt Crash: every husk on the map is held on spears 3s, then slowed to 20%. Salt Slice ×3.', { kind: 'sun', color: 0xe8eef2 }, {
          mods: { slice: { damageMult: 3, cooldownMult: 0.7 } },
          active: { name: 'Salt Crash', desc: 'Every husk held on salt spears for 3s, then slowed to 20% for 6s.', cooldown: 40000, global: true, cast: ab(0, 0, { kind: 'field', color: 0xe8eef2 }, 'Salt spears burst through the road.', { rider: { encase: 3000, slow: { mult: 0.2, ms: 6000 } } }) },
        }),
      ]),
      path('Sweet Tooth', 'Sticky husks crack and pay', [
        up('Cinnamon Spice', 100, 'Sticky husks are brittle: every hit on them lands +2 for 3s.', 'sparks', {
          mods: { slam: { rider: { brittle: { add: 2, ms: 3000 } } } },
        }),
        up('Caring Share', 240, 'Adds candy traps: three sweets on the road that hold three husks each.', 'pennant', {
          add: { candy: ab(2, 5000, { kind: 'trap', count: 3, hits: 3, ms: 12000, color: 0xff5f9e, look: 'glue' }, 'Caring Share: candies that grab whoever stops to eat.', { name: 'Caring Share', rider: { slow: { mult: 0.3, ms: 2500 } }, gesture: 'f' }) },
        }),
        up('Sugar Tax', 800, 'Every hit pays a gold, up to 90 a wave.', 'coins', {
          traits: { goldOnHit: { perHit: 1, cap: 90 } },
        }),
        up('Candy Shop', 2200, 'Pays 6 gold a second during waves. Towers built near it cost 10% less.', 'gears', {
          traits: { trickle: 6, discount: { radius: 160, mult: 0.9 } },
        }),
        up('Rainbow Lollipop', 6000, 'Everything it touches is brittle (+10 per hit for 5s), and it hits slowed husks ×2.', 'hat', {
          mods: { '*': { rider: { brittle: { add: 10, ms: 5000 } } } },
          traits: { bully: 2, goldOnHit: { perHit: 1, cap: 150 } },
        }),
      ]),
    ],
  },

  gluttony: {
    cost: 175, range: 190, role: 'economy', body: { kind: 'ground' },
    blurb: 'Birch ent. Throws carverangs down the road; its watching birches see everything that falls.',
    signature: { name: 'Haunting Hollows', desc: 'Kills in its range pay 20% more gold.' },
    traits: { plunder: 0.2 },
    attacks: {
      carverang: ab(20, 750, { kind: 'bolt', look: 'fan', color: 0xa8743f, speed: 380, pierce: 3, returns: true }, 'Carverang: a big boomerang out and back.', { name: 'Carverang' }),
    },
    paths: [
      path('Carver', 'Boomerangs that shred the line', [
        up('Sharp Bark', 180, 'Carverangs hit +8 and cut through 3 more.', 'leaves', {
          mods: { carverang: { damageAdd: 8, pierceAdd: 3 } },
        }),
        up('Twin Carve', 420, 'Throws two carverangs at once.', 'leaves', {
          mods: { carverang: { countAdd: 1, fx: { spread: 0.4 } } },
        }),
        up('Whirlwood', 1400, 'Bigger carverangs ×1.8; kills splinter into two shards.', 'spikes', {
          mods: { carverang: { damageMult: 1.8, fx: { size: 1.6 } } },
          traits: { shrapnel: { count: 2, frac: 0.1 } },
        }),
        up('Splinterstorm', 3900, 'Four carverangs a throw, ×2.', 'spikes', {
          mods: { carverang: { countAdd: 2, damageMult: 2, fx: { spread: 0.8 } } },
        }),
        up('Elder Ent', 10500, 'Carverangs ×2.2 and 25% faster; adds a great scythe stroke down the road.', 'horns', {
          mods: { carverang: { damageMult: 2.2, cooldownMult: 0.75 } },
          add: { scythe: ab(300, 5000, { kind: 'line', length: 300, width: 90, color: 0xd98a1c }, 'Final Harvest: one great scythe stroke.', { name: 'Harvest Scythe', rider: { weaken: { mult: 1.2, ms: 4000 } }, gesture: 'q' }) },
        }),
      ]),
      path('Old Growth', 'Sap, roots and the final harvest', [
        up('Digest', 220, 'Adds a ring of sticky sap roots on the road.', 'roots', {
          add: { sap: ab(6, 6000, { kind: 'zone', radius: 90, ms: 5000, color: 0xd98a1c, shape: 'glue' }, 'Digest: sticky sap roots that slow.', { name: 'Digest', rider: { slow: { mult: 0.65, ms: 1500 } }, gesture: 'f' }) },
        }),
        up('Commensalism', 450, 'Adds sprouts on the road that trip three husks each.', 'roots', {
          add: { sprouts: ab(14, 5000, { kind: 'trap', count: 2, hits: 3, ms: 9000, color: 0x7ccc4a, look: 'seed' }, 'Commensalism: sprouts that trip husks.', { name: 'Commensalism', gesture: 'r' }) },
        }),
        up('Final Harvest', 1500, 'ABILITY — Final Harvest: a 320px scythe stroke for 500 that weakens what it cuts.', 'pennant', {
          active: { name: 'Final Harvest', desc: 'A scythe stroke down the road: 500 damage, husks take ×1.25 for 5s.', cooldown: 25000, cast: ab(500, 0, { kind: 'line', length: 320, width: 100, color: 0xd98a1c }, 'One great stroke.', { rider: { weaken: { mult: 1.25, ms: 5000 } } }) },
        }),
        up('Oakbrew', 3300, 'Sap ×4, sprouts ×3. The ent grows 4% stronger every wave it stands (up to +60%).', 'lantern', {
          mods: { sap: { damageMult: 4 }, sprouts: { damageMult: 3, countAdd: 1 } },
          traits: { veteran: { per: 0.04, cap: 0.6 } },
        }),
        up("Reaper's Grove", 10000, "ABILITY — Reaper's Grove: every husk on the map takes 1500 and ×1.4 damage for 6s.", 'crown', {
          mods: { sap: { areaMult: 1.4, damageMult: 2 }, carverang: { damageMult: 2 } },
          active: { name: "Reaper's Grove", desc: 'Every husk on the map takes 1500, then ×1.4 damage for 6s.', cooldown: 45000, global: true, cast: ab(1500, 0, { kind: 'field', color: 0xd98a1c }, 'The grove reaps.', { rider: { weaken: { mult: 1.4, ms: 6000 } } }) },
        }),
      ]),
      path('Haunting Hollows', 'The birches watch, and the watching pays', [
        up('Watchful Birch', 160, 'Sees hidden husks. Kills in range pay 35% more.', 'eye', {
          traits: { detect: true, plunder: 0.35 },
        }),
        up('Hollow Eyes', 380, 'Kills pay 50% more, and the grove pays 60 gold every wave.', 'eye', {
          traits: { plunder: 0.5, income: 60 },
        }),
        up('Woodland Market', 1200, 'Pays 160 a wave. Towers built or upgraded near it cost 12% less.', 'sack', {
          traits: { income: 160, discount: { radius: 170, mult: 0.88 } },
        }),
        up('Lumber Rights', 3200, 'Pays 8 gold a second during waves; carverangs gild husks to pay ×1.5.', 'coins', {
          traits: { trickle: 8 },
          mods: { carverang: { rider: { gild: 1.5 } } },
        }),
        up('Sacred Grove', 8000, 'Pays 400 a wave plus 6% interest; nearby towers cost 20% less.', { kind: 'halo', color: 0xffd700 }, {
          traits: { income: 400, interest: 0.06, discount: { radius: 190, mult: 0.8 } },
        }),
      ]),
    ],
  },

  pressure: {
    cost: 160, range: 150, role: 'control', body: { kind: 'ground' },
    blurb: 'Boiler-robot. Punches the lead husk back, slams the pack, and vents scalding steam.',
    signature: { name: 'Built Pressure', desc: 'Its punches shove husks back up the road.' },
    traits: {},
    attacks: {
      punch: ab(26, 1100, { kind: 'bolt', look: 'orb', color: 0xc4cad1, speed: 560, size: 1.3 }, 'Pressure Punch: the gauntlet shoots out and back.', { name: 'Pressure Punch', rider: { knockback: 20 }, dtype: 'blast' }),
    },
    paths: [
      path('Piston', 'One punch, built up until it breaks things', [
        up('Valve Wrench', 150, 'Punches hit +10.', 'gears', {
          mods: { punch: { damageAdd: 10 } },
        }),
        up('Pressure Build', 380, 'Punches build while it waits: +50% per idle second, up to ×3.', 'gears', {
          mods: { punch: { charge: { perSec: 0.5, cap: 3 } } },
        }),
        up('Hydraulic Fist', 1200, 'Punches ×2, shove 45px and go through two husks.', 'shield', {
          mods: { punch: { damageMult: 2, pierceAdd: 2, rider: { knockback: 45 } } },
        }),
        up('Boilerfist', 3400, 'A one-two: two punches a swing, ×2.5, leaving husks brittle (+8 a hit).', 'barrel', {
          mods: { punch: { damageMult: 2.5, fx: { salvo: 2 }, rider: { brittle: { add: 8, ms: 3000 } } } },
        }),
        up('Juggernaut', 9500, 'Punches ×3, burst over 60px and stun 0.6s. Bosses take ×1.5.', 'horns', {
          mods: { punch: { damageMult: 3, fx: { splash: 60, splashMult: 0.6 }, rider: { stun: 600 } } },
          traits: { bossBane: 1.5 },
        }),
      ]),
      path('Seismic', 'Slam the pack into the road', [
        up('Seismic Slam', 240, 'Adds a slam: everything within 110px is hit and stunned 0.7s.', 'bricks', {
          add: { slam: ab(24, 4500, { kind: 'nova', radius: 110, color: 0x9a8b78 }, 'Seismic Slam: the pack is driven into the road.', { name: 'Seismic Slam', rider: { stun: 700 }, gesture: 'e' }) },
        }),
        up('Aftershock', 520, 'Slams 25% sooner and 20% wider.', 'bricks', {
          mods: { slam: { cooldownMult: 0.75, areaMult: 1.2 } },
        }),
        up('Exceed', 1600, 'ABILITY — Exceed: the boiler runs red — twice as fast, ×1.5 damage for 12s.', 'flame', {
          active: { name: 'Exceed', desc: 'Twice as fast and ×1.5 damage for 12s.', cooldown: 35000, selfBuff: { ms: 12000, fireRateMult: 2, damageMult: 1.5 } },
        }),
        up('Fault Line', 3600, 'Slams ×5 and stun 1.2s. Held husks take ×1.4 from it.', 'spikes', {
          mods: { slam: { damageMult: 5, rider: { stun: 1200 } } },
          traits: { bully: 1.4 },
        }),
        up('Overpressure', 11000, 'ABILITY — Overpressure: a 260px blast for 1200, a 2.5s stun, then 3× speed for 15s. Slams ×2.', { kind: 'sun', color: 0xff5a36 }, {
          mods: { slam: { damageMult: 2 } },
          active: { name: 'Overpressure', desc: '260px blast for 1200, 2.5s stun, then 3× speed and ×2 damage for 15s.', cooldown: 45000, cast: ab(1200, 0, { kind: 'nova', radius: 260, color: 0xff5a36 }, 'The boiler blows.', { rider: { stun: 2500 } }), selfBuff: { ms: 15000, fireRateMult: 3, damageMult: 2 } },
        }),
      ]),
      path('Steam', 'Vent scalding steam and seal the road', [
        up('Release', 130, 'Adds a jet of steam down the road that slows.', 'bubbles', {
          add: { steam: ab(10, 4000, { kind: 'line', length: 200, width: 60, color: 0xeef1f3 }, 'Release: a jet of steam down the road.', { name: 'Release', rider: { slow: { mult: 0.7, ms: 1500 } }, gesture: 'f' }) },
        }),
        up('Pressure Point', 320, 'Adds a slow orb of pain: husks it hits take ×1.2 for 6s.', 'runes', {
          add: { point: ab(12, 5000, { kind: 'bolt', look: 'orb', color: 0xe0232f, speed: 170, size: 1.6 }, 'Pressure Point: a slow orb of pain.', { name: 'Pressure Point', rider: { weaken: { mult: 1.2, ms: 6000 } }, gesture: 'r' }) },
        }),
        up('Scald', 1000, 'Steam ×3, burns and strips armour for 3s.', 'bubbles', {
          mods: { steam: { damageMult: 3, rider: { burn: 2000, corrode: 3000 } } },
        }),
        up('Steam Wall', 2700, 'Adds a wall of steam across the road that scalds whatever chews on it.', 'moat', {
          add: { wall: ab(30, 9000, { kind: 'barrier', ms: 6000, hp: 300, color: 0xeef1f3, label: '♨️' }, 'A wall of steam across the road.', { name: 'Steam Wall', gesture: 'q' }) },
        }),
        up('Boiler Burst', 7500, 'Steam ×7, 50% wider, slows to 40%. The boiler wards the keep from 3 breaches a wave.', 'banner', {
          mods: { steam: { damageMult: 7, areaMult: 1.5, rider: { slow: { mult: 0.4, ms: 2000 } } }, wall: { fx: { hp: 800 }, damageMult: 3 } },
          traits: { keepWard: 3 },
        }),
      ]),
    ],
  },

  ink: {
    cost: 135, range: 190, role: 'control', body: { kind: 'ground' },
    blurb: 'Rubber-hose cartoon. Plinks with finger guns, peels the road with bananas, drops anvils.',
    signature: { name: 'Toon Physics', desc: 'Its gags break the rules of the road — slips, anvils and plot holes.' },
    traits: {},
    attacks: {
      guns: ab(7, 380, { kind: 'bolt', look: 'orb', color: 0x111111, speed: 640, size: 0.7 }, 'Finger Guns: a quick ink bullet, over and over.', { name: 'Finger Guns' }),
    },
    paths: [
      path('Finger Guns', 'Fastest draw on the road', [
        up('Quick Draw', 120, 'Fires 25% faster.', 'sparks', {
          mods: { guns: { cooldownMult: 0.75 } },
        }),
        up('Double Barrel', 300, 'Two bullets a shot.', 'sparks', {
          mods: { guns: { countAdd: 1, fx: { spread: 0.15 } } },
        }),
        up('Fanning', 1100, 'Fans the hammer: three shots a pull, +3 each.', 'hat', {
          mods: { guns: { damageAdd: 3, fx: { salvo: 3 } } },
        }),
        up('Ink Blots', 3000, 'Bullets ×1.8 and splat over 30px.', 'bubbles', {
          mods: { guns: { damageMult: 1.8, fx: { splash: 30, splashMult: 0.5 } } },
        }),
        up('Showdown', 8500, 'Bullets ×3; each hit on the same husk +8% (to +100%); 15% crit ×3.', 'star', {
          mods: { guns: { damageMult: 3 } },
          traits: { focus: { per: 0.08, cap: 1 }, crit: { chance: 0.15, mult: 3 } },
        }),
      ]),
      path('Slapstick', 'Banana peels and things falling from the sky', [
        up('Oooo Banana', 180, 'Drops banana peels: the first husk to step on one is stunned 1s and slips slower.', { kind: 'leaves', color: 0xffe14a }, {
          add: { banana: ab(4, 5000, { kind: 'trap', count: 2, hits: 1, ms: 15000, color: 0xffe14a, look: 'glue' }, 'Oooo Banana: a peel on the road.', { name: 'Oooo Banana', rider: { stun: 1000, slow: { mult: 0.7, ms: 3000 } }, gesture: 'e' }) },
        }),
        up('The Bunch', 400, 'Four peels a drop, 25% sooner.', { kind: 'leaves', color: 0xffe14a }, {
          mods: { banana: { countAdd: 2, cooldownMult: 0.75 } },
        }),
        up("Ol' 6 Ton", 1300, "ABILITY — Ol' 6 Ton: an anvil drops on the lead husk for 600 over 90px, slowing to 40%.", 'barrel', {
          active: { name: "Ol' 6 Ton", desc: 'An anvil flattens the pack: 600 over 90px, slowed to 40% for 4s.', cooldown: 25000, cast: ab(600, 0, { kind: 'splash', radius: 90, color: 0x111111, delayMs: 1200, shape: 'strike' }, 'Anvil.', { dtype: 'blast', rider: { slow: { mult: 0.4, ms: 4000 } } }) },
        }),
        up('Skedaddle', 3200, 'Adds Skedaddle: bounces down the road bonking everything and shoving it back.', 'pennant', {
          add: { skedaddle: ab(70, 4000, { kind: 'line', length: 260, width: 50, color: 0x8a8780 }, 'Skedaddle: bonks everything down the road.', { name: 'Skedaddle', rider: { knockback: 40 }, gesture: 'r' }) },
          mods: { banana: { damageMult: 5 } },
        }),
        up('Grand Piano', 9500, 'ABILITY — Grand Piano: 2000 over 160px and a 2s stun. Peels also take 5% of current health.', 'notes', {
          mods: { banana: { rider: { pct: 0.05 } }, skedaddle: { damageMult: 2.5 } },
          active: { name: 'Grand Piano', desc: 'A grand piano: 2000 over 160px and a 2s stun.', cooldown: 35000, cast: ab(2000, 0, { kind: 'splash', radius: 160, color: 0x222222, delayMs: 1000, shape: 'meteor' }, 'Piano.', { dtype: 'blast', rider: { stun: 2000 } }) },
        }),
      ]),
      path('Foux World', 'Rewrite the road with an eraser', [
        up('Eraser', 160, 'Adds an eraser shot that turns a husk around for 1.5s and rubs out its camouflage.', 'book', {
          add: { erase: ab(3, 3000, { kind: 'bolt', look: 'card', color: 0xf5c0c8, speed: 500 }, 'Eraser: rubs a husk out of its plans.', { name: 'Eraser', rider: { confuse: 1500, unmask: true }, gesture: 'f' }) },
        }),
        up('Toon Lasso', 380, 'Erased flyers fall to the road for 4s. Erases 20% sooner.', 'book', {
          mods: { erase: { cooldownMult: 0.8, rider: { ground: 4000 } } },
        }),
        up('Foux World', 1300, 'Adds Foux World: a 200px stretch of foam that slows and grinds.', 'moat', {
          add: { foux: ab(8, 14000, { kind: 'zone', radius: 200, ms: 6000, color: 0xcfcbc0, shape: 'smoke' }, 'Foux World: the road turns to foam.', { name: 'Foux World', rider: { slow: { mult: 0.75, ms: 800 } }, gesture: 'q' }) },
        }),
        up('Plot Hole', 3500, 'Erased husks fall through a plot hole — 12% go back to the breach. Foam drags them back.', 'runes', {
          mods: { erase: { rider: { banish: 0.12 } }, foux: { fx: { pull: 30 } } },
        }),
        up('The End', 9000, 'Eraser twice as often, 25% banish. Foam ×5; it hits stopped or slowed husks ×1.5.', 'cape', {
          mods: { erase: { cooldownMult: 0.5, rider: { banish: 0.25 } }, foux: { damageMult: 5 }, guns: { damageMult: 2 } },
          traits: { bully: 1.5 },
        }),
      ]),
    ],
  },

  astra: {
    cost: 285, range: 230, role: 'attack', body: { kind: 'ground' },
    blurb: 'A cracked star. Fires level sunlight straight through the pack.',
    signature: { name: 'Starlight', desc: 'Its solar shots pierce six husks each.' },
    traits: {},
    attacks: {
      starstruck: ab(6, 600, { kind: 'bolt', look: 'orb', color: 0xffe27a, speed: 1300, size: 0.6, count: 4, spread: 0.12, pierce: 6 }, 'Starstruck: a burst of level solar shots through the pack.', { name: 'Starstruck', dtype: 'energy' }),
    },
    paths: [
      path('Solar', 'Flares and the heat of a giant', [
        up('Hot Light', 250, 'Solar shots hit +3.', 'sparks', {
          mods: { starstruck: { damageAdd: 3 } },
        }),
        up('Solar Flares', 600, 'Adds flares: a plus and an X of sunlight around it for 40, burning.', 'sun', {
          add: { flare: ab(40, 4000, { kind: 'nova', radius: 130, color: 0xffb52e }, 'Solar Flares: a plus, then an X, of solar beams.', { name: 'Solar Flares', rider: { burn: 2000 }, gesture: 'e' }) },
        }),
        up('Corona', 1800, 'Flares 30% wider and ×2.5; solar shots burn.', 'sun', {
          mods: { flare: { areaMult: 1.3, damageMult: 2.5 }, starstruck: { rider: { burn: 1500 } } },
        }),
        up('Supernova Shell', 4800, 'All light ×2; flares 30% sooner.', 'halo', {
          mods: { '*': { damageMult: 2 }, flare: { cooldownMult: 0.7 } },
        }),
        up('Red Giant', 13000, 'Swells into a giant: all light ×2.5, flares 40% wider, a 140px corona burns everything near.', { kind: 'sun', color: 0xff5a2e }, {
          mods: { '*': { damageMult: 2.5 }, flare: { areaMult: 1.4 } },
          add: { corona: ab(200, 250, { kind: 'aura', radius: 140, color: 0xff7a2e, look: 'heat' }, 'The corona burns everything near.', { name: 'Corona', rider: { burn: 2500 } }) },
        }),
      ]),
      path('Celestial', 'Smites, wormholes and the true self', [
        up('Celestial Smite', 300, 'Adds a smite: purple lightning on the lead husk that slows it to 35% for 2s.', 'star', {
          add: { smite: ab(40, 5000, { kind: 'splash', radius: 50, color: 0xb05cff, delayMs: 250, shape: 'strike' }, 'Celestial Smite: purple lightning out of the sky.', { name: 'Celestial Smite', dtype: 'energy', rider: { slow: { mult: 0.35, ms: 2000 } }, gesture: 'r' }) },
        }),
        up('Worm Warp', 650, 'Adds a wormhole that throws a husk 80px back up the road.', 'moon', {
          add: { warp: ab(10, 7000, { kind: 'bolt', look: 'orb', color: 0x52d8ff, speed: 640, size: 1.1 }, 'Worm Warp: throws the husk back up the road.', { name: 'Worm Warp', rider: { knockback: 80 }, gesture: 'f' }) },
        }),
        up('True Self', 2000, 'ABILITY — True Self: every husk takes 200; the star fires twice as fast, ×1.5, for 15s.', 'star', {
          active: { name: 'True Self', desc: 'Every husk takes 200; then 2× speed and ×1.5 damage for 15s.', cooldown: 40000, global: true, cast: ab(200, 0, { kind: 'field', color: 0xfff6d0 }, 'The star wakes.', { dtype: 'energy' }), selfBuff: { ms: 15000, fireRateMult: 2, damageMult: 1.5 } },
        }),
        up('Event Horizon', 5000, 'Wormholes drag flyers to the road and swallow 15% of husks back to the breach. Smite ×3, shots ×1.8.', 'moon', {
          mods: { warp: { rider: { banish: 0.15, ground: 3000 } }, smite: { damageMult: 3 }, starstruck: { damageMult: 1.8 } },
        }),
        up('Starfall', 15000, 'ABILITY — Starfall: every husk takes 2500 and slows to 30%; 2.5× speed for 15s.', 'wings', {
          mods: { smite: { damageMult: 2, cooldownMult: 0.6 }, starstruck: { damageMult: 2 } },
          active: { name: 'Starfall', desc: 'Every husk takes 2500 and is slowed to 30%; then 2.5× speed, ×2 damage for 15s.', cooldown: 50000, global: true, cast: ab(2500, 0, { kind: 'field', color: 0xb05cff }, 'The sky falls.', { dtype: 'energy', rider: { slow: { mult: 0.3, ms: 4000 } } }), selfBuff: { ms: 15000, fireRateMult: 2.5, damageMult: 2 } },
        }),
      ]),
      path('Constellation', 'One star, aimed across the map', [
        up('Star Chart', 220, 'Sees hidden husks. +20% range.', 'scope', {
          range: 1.2,
          traits: { detect: true },
        }),
        up('Fixed Star', 550, 'Every hit on the same husk lands 6% harder, up to +90%.', 'scope', {
          traits: { focus: { per: 0.06, cap: 0.9 } },
        }),
        up('Polaris', 1700, 'Adds Polaris: a needle of starlight for 120 through three husks.', 'lantern', {
          add: { polaris: ab(120, 1800, { kind: 'bolt', look: 'star', color: 0xfff6d0, speed: 1600, pierce: 3 }, 'Polaris: a needle of starlight.', { name: 'Polaris', dtype: 'energy', gesture: 'q' }) },
        }),
        up('Parallax', 4500, 'Polaris charges while it waits (to ×3) and takes 3% of current health. +30% range.', 'scope', {
          range: 1.3,
          mods: { polaris: { charge: { perSec: 0.5, cap: 3 }, rider: { pct: 0.03 } } },
        }),
        up('Zodiac', 12000, 'Polaris fires three at a time, ×2.5; 25% crit for ×2.5.', 'cape', {
          mods: { polaris: { damageMult: 2.5, fx: { salvo: 3 } }, starstruck: { damageMult: 1.5 } },
          traits: { crit: { chance: 0.25, mult: 2.5 } },
        }),
      ]),
    ],
  },

  memory: {
    cost: 215, range: 210, role: 'control', body: { kind: 'ground' },
    blurb: 'A static-faced figure in a top hat. Its shards latch on, and everything it hits remembers.',
    signature: { name: 'Guilt', desc: 'Its shards latch on: a latched husk takes +2 from every hit for 5s.' },
    traits: {},
    attacks: {
      forget: ab(12, 450, { kind: 'bolt', look: 'shard', color: 0x2a2633, speed: 900, size: 0.9 }, 'Forget: an obsidian shard that grows legs and latches on.', { name: 'Forget', dtype: 'sharp', rider: { brittle: { add: 2, ms: 5000 } } }),
    },
    paths: [
      path('Snatch', 'A beam of static that takes their time', [
        up('Cold Shards', 230, 'Shards hit +4.', 'motes', {
          mods: { forget: { damageAdd: 4 } },
        }),
        up('Memory Snatch', 600, 'Adds Memory Snatch: a static beam down the road for 60 that stuns 0.6s.', 'hat', {
          add: { snatch: ab(60, 4000, { kind: 'line', length: 260, width: 26, color: 0xd8d8e8 }, 'Memory Snatch: a beam of static that splits into a cone.', { name: 'Memory Snatch', dtype: 'magic', rider: { stun: 600 }, gesture: 'e' }) },
        }),
        up('Splitting Cone', 1700, 'The beam splits wide: 30% more area, ×2.5.', 'hat', {
          mods: { snatch: { areaMult: 1.3, damageMult: 2.5 } },
        }),
        up('Stolen Time', 4600, 'Snatch recasts 40% sooner. Everything ×2.2.', 'orbit', {
          mods: { '*': { damageMult: 2.2 }, snatch: { cooldownMult: 0.6 } },
        }),
        up('Total Recall', 12500, 'Snatch ×4 and stuns 1.5s; shards ×3. Every instant cast echoes at half strength.', 'eye', {
          mods: { snatch: { damageMult: 4, rider: { stun: 1500 } }, forget: { damageMult: 3 } },
          traits: { echo: { delayMs: 400, mult: 0.5 } },
        }),
      ]),
      path('Rebirth', 'A white beam that wipes the slate', [
        up('Rebirth', 320, 'Adds Rebirth: a thick white beam for 60 that strips armour and shells for 4s.', 'lantern', {
          add: { rebirth: ab(60, 5000, { kind: 'line', length: 300, width: 40, color: 0xffffff }, 'Rebirth: a thick white beam that strips what they had.', { name: 'Rebirth', dtype: 'magic', rider: { corrode: 4000 }, gesture: 'r' }) },
        }),
        up('Clean Slate', 700, 'Rebirth makes husks forget the way: turned around 1.5s.', 'runes', {
          mods: { rebirth: { rider: { confuse: 1500 } } },
        }),
        up('Repression', 2100, 'ABILITY — Repression: a static copy of the husks strikes for 90 every 0.5s for 8s.', 'cape', {
          active: { name: 'Repression', desc: 'A static echo walks the road and strikes for 90 every 0.5s for 8s.', cooldown: 30000, cast: ab(90, 0, { kind: 'summon', ms: 8000, color: 0x9a98a8, attackMs: 500, attackRange: 180, label: '📺' }, 'A static copy replays what they did.') },
        }),
        up('Forgotten', 5200, 'Rebirth ×4, 40% sooner, and sends 10% of husks back to the breach.', 'runes', {
          mods: { rebirth: { damageMult: 4, cooldownMult: 0.6, rider: { banish: 0.1 } } },
        }),
        up('Born Again', 14000, 'ABILITY — Born Again: every husk takes 1500 and is turned around for 3s.', 'halo', {
          mods: { rebirth: { damageMult: 2 } },
          active: { name: 'Born Again', desc: 'Every husk takes 1500 and walks back toward the breach for 3s.', cooldown: 50000, global: true, cast: ab(1500, 0, { kind: 'field', color: 0xffffff }, 'Everything is forgotten.', { dtype: 'magic', rider: { confuse: 3000 } }) },
        }),
      ]),
      path('Trauma', 'Wounds that never close', [
        up('Guilt', 250, 'Every hit on the same husk lands 4% harder, up to +80%.', 'chains', {
          traits: { focus: { per: 0.04, cap: 0.8 } },
        }),
        up('Trauma', 650, 'Shards open a wound: bleed for 2s.', 'motes', {
          mods: { forget: { rider: { bleed: 2000 } } },
        }),
        up('Relive', 1900, 'Adds a red aura: everything near takes 14 and bleeds.', { kind: 'flame', color: 0xc0303a }, {
          add: { trauma: ab(14, 500, { kind: 'aura', radius: 120, color: 0xc0303a, look: 'pulse' }, 'Trauma: a red pulse they relive every second.', { name: 'Trauma', rider: { bleed: 1500 } }) },
        }),
        up('Open Wound', 4800, 'Shards take 2% of current health. The aura ×3.', 'skull', {
          mods: { forget: { rider: { pct: 0.02 } }, trauma: { damageMult: 3 } },
        }),
        up('Never Forget', 13000, 'Everything ×3; latched husks take ×1.25 from everything for 4s. Guilt caps at +150%.', 'eye', {
          mods: { '*': { damageMult: 3 }, forget: { rider: { weaken: { mult: 1.25, ms: 4000 } } } },
          traits: { focus: { per: 0.05, cap: 1.5 } },
        }),
      ]),
    ],
  },
  string: {
    cost: 190, range: 220, role: 'control', body: { kind: 'ground' },
    blurb: 'A big velvet spider that strings up the road. Its hooks tie husks down, and its brood walks the lines.',
    signature: { name: 'Tension', desc: 'Every hook ties its husk down: 30% slower for 1.5s.' },
    traits: {},
    attacks: {
      snag: ab(14, 650, { kind: 'bolt', look: 'needle', color: 0xf2ece0, speed: 1100 }, 'Tension Snag: a hooked string that ties a husk down.', { name: 'Tension Snag', dtype: 'sharp', rider: { slow: { mult: 0.7, ms: 1500 } } }),
    },
    paths: [
      path('Web', 'Strings across the road that snap back', [
        up('Heavy Twine', 210, 'Hooks hit +5 and tie husks down 0.5s longer.', 'motes', {
          mods: { snag: { damageAdd: 5, rider: { slow: { mult: 0.7, ms: 2000 } } } },
        }),
        up('Tripwire', 560, 'Adds a string across the road: every husk that crosses it takes 35 and stumbles.', 'pennant', {
          add: { trip: ab(35, 4500, { kind: 'fence', ms: 4000, color: 0xf2ece0, width: 6 }, 'Tripwire: a string across the road.', { name: 'Tripwire', dtype: 'sharp', rider: { slow: { mult: 0.5, ms: 1200 } }, gesture: 'click' }) },
        }),
        up('Snap Back', 1600, 'Tripwires ×2.5 and throw husks back 30px.', 'chains', {
          mods: { trip: { damageMult: 2.5, rider: { knockback: 30 } } },
        }),
        up('Cat\'s Cradle', 4300, 'Tripwires go up twice as often. Everything ×2.', 'runes', {
          mods: { '*': { damageMult: 2 }, trip: { cooldownMult: 0.5 } },
        }),
        up('Taut Web', 12000, 'Everything ×3. Tripwires hold the husks they catch for 0.8s.', 'halo', {
          mods: { '*': { damageMult: 3 }, trip: { rider: { stun: 800 } } },
        }),
      ]),
      path('Spiders', 'Spiders that walk the road', [
        up('Spider Dance', 260, 'Adds spiders: one crawls up the road every 6s, biting five husks.', 'leaves', {
          add: { spiders: ab(14, 6000, { kind: 'minion', hits: 5, speed: 110, ms: 8000, color: 0x1f1822, look: 'spider' }, 'Spider Dance: a big spider walks the road.', { name: 'Spider Dance', dtype: 'sharp', gesture: 'e' }) },
        }),
        up('Big Spiders', 600, 'Spiders bite 4 more husks and come 25% sooner.', 'leaves', {
          mods: { spiders: { pierceAdd: 4, cooldownMult: 0.75 } },
        }),
        up('Linen Tomb', 1900, 'ABILITY — Linen Tomb: the lead husk is wrapped in silk where it stands for 5s and takes 300.', 'halo', {
          active: { name: 'Linen Tomb', desc: 'The lead husk is wrapped in silk where it stands for 5s and takes 300.', cooldown: 35000, global: true, cast: ab(300, 0, { kind: 'splash', radius: 50, color: 0xf2ece0, shape: 'ring' }, 'Silk winds round the lead husk.', { rider: { encase: 5000 } }) },
        }),
        up('Venom Frenzy', 4800, 'Spider bites poison for 8 a second for 3s. Spiders ×3, half again as fast, and 40% sooner.', 'skull', {
          mods: { spiders: { damageMult: 3, cooldownMult: 0.6, fx: { speed: 165 }, rider: { toxic: { ms: 3000, dps: 8 } } } },
        }),
        up('Broodmother', 12500, 'ABILITY — Broodmother: every husk on the map is bitten for 800 and slowed 60% for 4s.', 'crown', {
          mods: { spiders: { damageMult: 2 } },
          active: { name: 'Broodmother', desc: 'Every husk on the map is bitten for 800 and slowed 60% for 4s.', cooldown: 50000, global: true, cast: ab(800, 0, { kind: 'field', color: 0x463a4e }, 'Spiders everywhere.', { dtype: 'sharp', rider: { slow: { mult: 0.4, ms: 4000 } } }) },
        }),
      ]),
      path('Hex', 'Purple cord and puppets', [
        up('Hexing Strand', 300, 'Adds a purple strand: a line down the road for 30 that slows 50% for 2s.', 'runes', {
          add: { hex: ab(30, 4500, { kind: 'line', length: 260, width: 18, color: 0x9b3dff }, 'Hexing Strand: a purple cord that snares.', { name: 'Hexing Strand', dtype: 'magic', rider: { slow: { mult: 0.5, ms: 2000 } }, gesture: 'r' }) },
        }),
        up('Snare', 700, 'The strand snaps as it lands: husks are slowed 70% for 3.5s.', 'chains', {
          mods: { hex: { rider: { slow: { mult: 0.3, ms: 3500 } } } },
        }),
        up('Marionette', 2000, 'Adds a control bar: the husk it hits walks back toward the breach for 2s.', 'hat', {
          add: { bar: ab(40, 6000, { kind: 'bolt', look: 'card', color: 0xd9b98a, speed: 700, size: 1.4 }, 'Marionette: a control bar that turns a husk around.', { name: 'Marionette', rider: { confuse: 2000 }, gesture: 'f' }) },
        }),
        up('Puppet Show', 5200, 'Hex ×3 and 40% sooner; puppets walk back for 3.5s.', 'cape', {
          mods: { hex: { damageMult: 3, cooldownMult: 0.6 }, bar: { damageMult: 2, rider: { confuse: 3500 } } },
        }),
        up('Grand Puppeteer', 13500, 'Everything ×3. Hexed husks take ×1.3 from everything for 3s.', 'crown', {
          mods: { '*': { damageMult: 3 }, hex: { rider: { weaken: { mult: 1.3, ms: 3000 } } } },
        }),
      ]),
    ],
  },
  wax: {
    cost: 145, range: 180, role: 'summoner', body: { kind: 'ground' },
    blurb: 'Apiarist. Bees that seek, hives that sting, and hot wax that encases the pack.',
    signature: { name: 'Hive Mind', desc: 'Its bees seek their targets and poison them.' },
    traits: {},
    attacks: {
      stingers: ab(6, 600, { kind: 'bolt', look: 'bee', color: 0xffdd33, speed: 420, homing: true, count: 2, spread: 0.4 }, 'Stinger Strikes: two seeking bees.', { name: 'Stinger Strikes', rider: { toxic: { ms: 2000, dps: 3 } } }),
    },
    paths: [
      path('Swarm', 'More bees, angrier bees', [
        up('Third Stinger', 140, 'Three bees a strike.', 'bees', {
          mods: { stingers: { countAdd: 1 } },
        }),
        up('Angry Swarm', 340, 'Adds a swarm: six seeking bees every 3s.', 'bees', {
          add: { swarm: ab(5, 3000, { kind: 'bolt', look: 'bee', color: 0xffee66, speed: 400, homing: true, count: 6, spread: 1 }, 'Swarm: six bees.', { name: 'Swarm', rider: { toxic: { ms: 2000, dps: 3 } }, gesture: 'e' }) },
        }),
        up('Killer Bees', 1100, 'All bees sting ×2 and their poison bites 8 a second.', 'bees', {
          mods: { '*': { damageMult: 2, rider: { toxic: { ms: 2500, dps: 8 } } } },
        }),
        up('Bee Cloud', 3200, 'Twelve bees a swarm, 30% sooner; strikes come in pairs.', 'bees', {
          mods: { swarm: { countAdd: 6, cooldownMult: 0.7 }, stingers: { fx: { salvo: 2 } } },
        }),
        up('The Queen', 9000, 'All bees ×2.5; every kill makes the hive 1% stronger, up to ×2.', { kind: 'crown', color: 0xffd700 }, {
          mods: { '*': { damageMult: 2.5 } },
          traits: { killRamp: { per: 0.01, cap: 1 } },
        }),
      ]),
      path('Hive', 'Hives that sting on their own', [
        up('Hive Hearth', 220, 'Builds a hive beside it that stings for 18s.', 'barrel', {
          add: { hive: ab(6, 8000, { kind: 'sentry', ms: 18000, max: 1, attackMs: 600, range: 150, color: 0xffdd33, look: 'hive' }, 'Hive Hearth: a hive that stings on its own.', { name: 'Hive Hearth', gesture: 'f' }) },
        }),
        up('Apiary', 500, 'Two hives at once, stinging ×1.5.', 'barrel', {
          mods: { hive: { countAdd: 1, damageMult: 1.5 } },
        }),
        up('Smoke-out', 1500, 'ABILITY — Smoke-out: a 140px cloud of smoke puts the pack to sleep for 3s.', 'lantern', {
          active: { name: 'Smoke-out', desc: 'A 140px cloud of smoke: husks fall asleep for 3s.', cooldown: 30000, cast: ab(10, 0, { kind: 'zone', radius: 140, ms: 6000, color: 0xaaaaaa, shape: 'smoke' }, 'Smoke.', { rider: { sleep: 3000 } }) },
        }),
        up('Honeycomb', 3600, 'Four hives, stinging ×2.5 and faster.', { kind: 'crystals', color: 0xffcc33 }, {
          mods: { hive: { countAdd: 2, damageMult: 2.5, fx: { attackMs: 380 } } },
        }),
        up('Royal Jelly', 10500, 'ABILITY — Royal Jelly: towers within 220px fire 1.6× faster, ×1.5, for 12s. Hives ×2.', 'wings', {
          mods: { hive: { damageMult: 2 } },
          active: { name: 'Royal Jelly', desc: 'Towers within 220px: 1.6× speed, ×1.5 damage for 12s.', cooldown: 45000, cast: ab(0, 0, { kind: 'rally', radius: 220, ms: 12000, fireRateMult: 1.6, damageMult: 1.5, color: 0xffd700 }, 'Royal jelly for the hive.'), selfBuff: { ms: 12000, fireRateMult: 1.6, damageMult: 1.5 } },
        }),
      ]),
      path('Candle', 'Hot wax that sets the pack solid', [
        up('Candle Mount', 180, 'Adds hot wax over the pack that encases it for 1.5s.', 'flame', {
          add: { candle: ab(14, 6000, { kind: 'splash', radius: 70, color: 0xffd27a }, 'Candle Mount: hot wax encases the pack.', { name: 'Candle Mount', rider: { encase: 1500 }, gesture: 'r' }) },
        }),
        up('Hot Wax', 420, 'Wax pours 30% more often and burns.', 'flame', {
          mods: { candle: { cooldownMult: 0.7, rider: { burn: 2000 } } },
        }),
        up('Sticky Bombs', 1300, 'Adds hive-bombs on the road that burst and encase.', 'sack', {
          add: { bombs: ab(40, 8000, { kind: 'trap', count: 4, hits: 1, ms: 15000, color: 0xd8a531, look: 'hive', blast: 50 }, 'Sticky Bombs: hive-bombs that burst and encase.', { name: 'Sticky Bombs', rider: { encase: 1200 }, gesture: 'q' }) },
        }),
        up('Waxwork', 3300, 'Wax 30% wider, encases 2.5s. Hits on held husks land ×1.5.', 'bricks', {
          mods: { candle: { areaMult: 1.3, rider: { encase: 2500 } } },
          traits: { bully: 1.5 },
        }),
        up('Wax Museum', 8500, 'Wax ×12 and takes 4% of current health; bombs ×4, bees ×2.', 'halo', {
          mods: { candle: { damageMult: 12, rider: { pct: 0.04 } }, bombs: { damageMult: 4 }, stingers: { damageMult: 2 } },
        }),
      ]),
    ],
  },

  clay: {
    cost: 230, range: 160, role: 'summoner', body: { kind: 'ground' },
    blurb: 'Shaper. Fists of clay, walls that bite back, and golems that grind up the road.',
    signature: { name: 'Living Clay', desc: 'What it shapes walks up the road against the pack.' },
    traits: {},
    attacks: {
      slam: ab(30, 900, { kind: 'bolt', color: 0xb07050, speed: 480, size: 1.3 }, 'Slam: a fist of clay.', { name: 'Slam', rider: { knockback: 15 }, dtype: 'blast' }),
    },
    paths: [
      path('Golemancy', 'Clay that walks up the road', [
        up('Slink', 220, 'Sends a clay crawler grinding up the road through six husks.', 'bricks', {
          add: { slink: ab(18, 6000, { kind: 'minion', hits: 6, speed: 60, ms: 12000, color: 0xb07050, look: 'stone' }, 'Slink: a clay crawler grinds up the road.', { name: 'Slink', gesture: 'f' }) },
        }),
        up('Clay Army', 480, 'Crawlers strike 3 more and come 25% sooner.', 'bricks', {
          mods: { slink: { pierceAdd: 3, cooldownMult: 0.75 } },
        }),
        up('Golem', 1600, 'Adds a golem that crushes twenty husks on its way up the road.', 'shield', {
          add: { golem: ab(50, 15000, { kind: 'minion', hits: 20, speed: 35, ms: 20000, color: 0x8a5a3a, look: 'golem', size: 1.8 }, 'Fuse: a golem that crushes twenty.', { name: 'Golem', gesture: 'q' }) },
        }),
        up('Kiln-Fired', 4000, 'Everything it shapes ×2.5; golems stun what they hit.', 'flame', {
          mods: { '*': { damageMult: 2.5 }, golem: { rider: { stun: 600 } } },
        }),
        up('Colossus', 11000, 'Golems tower: ×3, 30 more hits, 40% sooner. Crawlers ×2.', 'horns', {
          mods: { golem: { damageMult: 3, pierceAdd: 30, cooldownMult: 0.6, fx: { size: 2.4 } }, slink: { damageMult: 2 } },
        }),
      ]),
      path('Kiln', 'Rupture the road and raise its statues', [
        up('Rupture', 200, 'Adds Rupture: the road bursts and sticks, slowing to 60%.', 'spikes', {
          add: { rupture: ab(22, 4000, { kind: 'splash', radius: 70, color: 0x9a6040, shape: 'crater' }, 'Rupture: the road bursts and sticks.', { name: 'Rupture', rider: { slow: { mult: 0.6, ms: 2000 } }, gesture: 'e' }) },
        }),
        up('Clay Clot', 450, 'Adds a clot across the road that husks must chew through.', 'shield', {
          add: { clot: ab(20, 7000, { kind: 'barrier', ms: 7000, hp: 200, color: 0xb07050, label: '🧱' }, 'Clay Clot: a clot across the road that bites back.', { name: 'Clay Clot', gesture: 'r' }) },
        }),
        up('Give Life', 1400, 'ABILITY — Give Life: a statue on the road comes alive and strikes for 80 for 15s.', 'eye', {
          active: { name: 'Give Life', desc: 'A statue on the road strikes for 80 every 0.7s for 15s.', cooldown: 30000, cast: ab(80, 0, { kind: 'summon', ms: 15000, color: 0xb07050, attackMs: 700, attackRange: 100, label: '🗿' }, 'A statue comes alive.') },
        }),
        up('Fired Walls', 3500, 'Clots are fired hard (600 hp, ×3 bite). Wards the keep from 2 breaches a wave.', 'shield', {
          mods: { clot: { damageMult: 3, fx: { hp: 600 } }, rupture: { damageMult: 3 } },
          traits: { keepWard: 2 },
        }),
        up('Terracotta Legion', 10000, 'ABILITY — Terracotta Legion: a legion statue strikes for 250 four times a second for 20s. Rupture ×4.', 'crown', {
          mods: { rupture: { damageMult: 4, areaMult: 1.3 } },
          active: { name: 'Terracotta Legion', desc: 'A legion on the road strikes for 250 every 0.25s for 20s.', cooldown: 45000, cast: ab(250, 0, { kind: 'summon', ms: 20000, color: 0xc0704a, attackMs: 250, attackRange: 140, label: '🗿' }, 'The legion wakes.') },
        }),
      ]),
      path('Sculptor', 'Mould husks into something easier to break', [
        up('Wet Clay', 150, 'Slams leave husks slowed to 70% for 1.5s.', 'moat', {
          mods: { slam: { rider: { slow: { mult: 0.7, ms: 1500 } } } },
        }),
        up('Mould', 380, 'Slammed husks are brittle (+4 a hit for 3s). +10% range.', 'runes', {
          range: 1.1,
          mods: { slam: { rider: { brittle: { add: 4, ms: 3000 } } } },
        }),
        up('Pottery Wheel', 1300, 'Slams ×1.8 and splash over 45px.', 'gears', {
          mods: { slam: { damageMult: 1.8, fx: { splash: 45, splashMult: 0.6 } } },
        }),
        up('Clay Prison', 3400, 'Adds a prison shot that encases a husk for 2.5s.', 'chains', {
          add: { prison: ab(30, 6000, { kind: 'bolt', color: 0x9a6040, speed: 400, size: 1.5 }, 'Clay Prison: seals a husk in clay.', { name: 'Clay Prison', rider: { encase: 2500 }, dtype: 'blast' }) },
          mods: { slam: { damageMult: 1.6 } },
        }),
        up('Bedrock', 8800, 'Slams ×4 and take 3% of current health; prisons twice as often. Immune to sabotage.', 'pennant', {
          mods: { slam: { damageMult: 4, rider: { pct: 0.03 } }, prison: { cooldownMult: 0.5, damageMult: 3 } },
          traits: { steadfast: true },
        }),
      ]),
    ],
  },
};
