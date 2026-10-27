import type { TowerDef } from '../StrongholdTypes';
import { ab, path, up, CORRUPT_AND_ABSTRACT } from './helpers';

/** Death, Gold (`fortune`), Marrow, Tempest, Myth, Cloth, Psychic, Radiation. */
export const BATCH6_TOWERS: Record<string, TowerDef> = {
  death: {
    cost: 225, range: 170, role: 'attack', body: { kind: 'ground' },
    blurb: 'Duellist. Every husk that dies near it is a charge; at five, its next strike lands triple.',
    signature: { name: 'Reap', desc: 'Deaths in its reach charge it; at 5 charges its next cast deals ×3.' },
    traits: { reap: { need: 5, mult: 3 } },
    attacks: {
      thrust: ab(28, 700, { kind: 'bolt', look: 'needle', color: 0x4a4468, speed: 700 }, "Thrust: a fencer's lunge.", { name: 'Thrust' }),
    },
    paths: [
      path('Reaper', 'Finish the dying and cut the rest down', [
        up('Sharper Foil', 150, 'Thrusts hit +10.', 'spikes', {
          mods: { thrust: { damageAdd: 10 } },
        }),
        up('Amputate', 400, 'Adds a cut that finishes husks under 15% outright.', { kind: 'spikes', color: 0xaa2233 }, {
          add: { amputate: ab(30, 4000, { kind: 'execute', thresholdFrac: 0.15, color: 0xaa2233 }, 'Finishes husks under 15%.', { name: 'Amputate', gesture: 'f' }) },
        }),
        up('Scythe', 1400, 'Adds a scythe sweep down the road that carves 8% of current health off everything.', 'moon', {
          add: { scythe: ab(110, 3500, { kind: 'line', length: 240, width: 70, color: 0x2a2440 }, 'A scythe sweep down the road.', { name: 'Scythe', rider: { pct: 0.08 }, gesture: 'q' }) },
        }),
        up('Grim Harvest', 3800, 'Every cut ×2.5; Reap fills at 3 deaths and lands ×4.', 'skull', {
          mods: { '*': { damageMult: 2.5 } },
          traits: { reap: { need: 3, mult: 4 } },
        }),
        up('Inevitable', 11000, 'Every cut ×4, Amputate takes husks under 30%, bosses take ×1.5.', { kind: 'skull', color: 0xaa2233 }, {
          mods: { '*': { damageMult: 4 }, amputate: { fx: { thresholdFrac: 0.3 }, cooldownMult: 0.6 } },
          traits: { bossBane: 1.5 },
        }),
      ]),
      path('The Bargain', 'Raise the fallen and strike a deal', [
        up('Omen', 200, 'A quarter of the husks that die near it rise as ghosts marching back.', 'motes', {
          traits: { raiseDead: { chance: 0.25, hits: 3 } },
        }),
        up('Disarm', 450, 'Thrusts Weaken: husks take 25% more from every tower for 3s.', 'chains', {
          mods: { thrust: { rider: { weaken: { mult: 1.25, ms: 3000 } } } },
        }),
        up('Deal With Death', 1500, 'ABILITY — Deal With Death: every husk on the map loses 20% of its health and takes 150.', 'eye', {
          traits: { raiseDead: { chance: 0.4, hits: 4 } },
          active: { name: 'Deal With Death', desc: 'Every husk loses 20% health and takes 150.', cooldown: 40000, global: true, cast: ab(150, 0, { kind: 'field', color: 0x4a4468 }, 'A bargain struck with the whole road.', { rider: { pct: 0.2 } }) },
        }),
        up('Danse Macabre', 3600, 'Most of the fallen rise, and stronger; thrusts ×2.5.', { kind: 'bones', color: 0xccaaff }, {
          traits: { raiseDead: { chance: 0.6, hits: 6 } },
          mods: { thrust: { damageMult: 2.5 } },
        }),
        up('Grimdark', 10000, 'ABILITY — Grimdark: every husk loses 35% of its health and takes 1200. Thrusts ×3.', { kind: 'horns', color: 0x2a2440 }, {
          traits: { raiseDead: { chance: 0.8, hits: 8 } },
          mods: { thrust: { damageMult: 3 } },
          active: { name: 'Grimdark', desc: 'Every husk loses 35% health and takes 1200.', cooldown: 45000, global: true, cast: ab(1200, 0, { kind: 'field', color: 0x2a2440 }, 'Night falls on the road.', { rider: { pct: 0.35, weaken: { mult: 1.3, ms: 5000 } } }) },
        }),
      ]),
      path('Duellist', 'Lock on to one husk and never let go', [
        up('Riposte', 120, 'Adds a parry that punishes everything that comes close.', 'shield', {
          add: { riposte: ab(30, 3000, { kind: 'nova', radius: 90, color: 0x6a6090 }, 'Punishes everything that comes close.', { name: 'Riposte', gesture: 'r' }) },
        }),
        up('En Garde', 300, 'Focus: each thrust in a row on the same husk lands +15%, up to +150%.', 'cape', {
          traits: { focus: { per: 0.15, cap: 1.5 } },
        }),
        up('Fleche', 1100, 'Thrusts come in a burst of three.', { kind: 'cape', color: 0x8a80b0 }, {
          mods: { thrust: { fx: { salvo: 3 } } },
        }),
        up('Killing Blow', 3000, 'One thrust in five is a critical for ×3; riposte ×2.', 'pennant', {
          traits: { crit: { chance: 0.2, mult: 3 } },
          mods: { riposte: { damageMult: 2 } },
        }),
        up('Undefeated', 8500, 'Thrusts ×3 and 40% faster. Nothing a husk does can stop it.', { kind: 'crown', color: 0x8a80b0 }, {
          mods: { thrust: { damageMult: 3, cooldownMult: 0.6 } },
          traits: { steadfast: true },
        }),
      ]),
    ],
  },

  fortune: {
    cost: 250, range: 170, role: 'economy', body: { kind: 'ground' },
    blurb: 'Alchemist. Turns lead into gold — mints, gilds husks, and runs your bank.',
    signature: { name: 'Gilt Coin', desc: 'A third of its coins Gild: those husks pay 1.5× when they die.' },
    traits: {},
    attacks: {
      coin: ab(14, 600, { kind: 'bolt', look: 'coin', color: 0xd8a531, speed: 600 }, 'Gilt coins; some husks pay 1.5× when they die.', { name: 'Fray', rider: { gild: 1.5, chance: 0.33 } }),
    },
    paths: [
      path('Mint', 'Gold every second the road is busy', [
        up('Copper Press', 180, 'Mints 1 gold a second while a wave is on.', 'coins', {
          traits: { trickle: 1 },
        }),
        up('Silver Press', 450, 'Mints 2.5 gold a second and pays 40 at every wave clear.', { kind: 'coins', color: 0xdddddd }, {
          traits: { trickle: 2.5, income: 40 },
        }),
        up('Gold Standard', 1500, 'Mints 6 gold a second and pays 120 at every wave clear.', 'sack', {
          traits: { trickle: 6, income: 120 },
        }),
        up('Treasury', 4200, 'Mints 12 gold a second and pays 300 at every wave clear.', { kind: 'gold-trim' }, {
          traits: { trickle: 12, income: 300 },
        }),
        up("Philosopher's Stone", 12000, 'Mints 30 gold a second and pays 800 at every wave clear.', { kind: 'star', color: 0xff3355 }, {
          traits: { trickle: 30, income: 800 },
        }),
      ]),
      path('Midas', 'Everything it touches turns to gold', [
        up('Gilded Coins', 150, 'Half its coins Gild, and gilded husks pay double.', 'coins', {
          mods: { coin: { rider: { gild: 2, chance: 0.5 } } },
        }),
        up('Midas Touch', 400, 'Every coin that lands pays ¼ gold (up to 60 a wave).', 'gold-trim', {
          traits: { goldOnHit: { perHit: 0.25, cap: 60 } },
        }),
        up('Gold Rush', 1300, 'ABILITY — Gold Rush: every husk on the map is Gilded ×3 and takes 50. Touch cap 120.', 'crown', {
          traits: { goldOnHit: { perHit: 0.25, cap: 120 } },
          active: { name: 'Gold Rush', desc: 'Every husk is Gilded ×3 and takes 50.', cooldown: 40000, global: true, cast: ab(50, 0, { kind: 'field', color: 0xffd700 }, 'Gold rains on the road.', { rider: { gild: 3 } }) },
        }),
        up('Golden Hands', 3500, 'Coins ×3 in bursts of two; each pays ½ gold, up to 250 a wave.', { kind: 'sack' }, {
          mods: { coin: { damageMult: 3, fx: { salvo: 2 } } },
          traits: { goldOnHit: { perHit: 0.5, cap: 250 } },
        }),
        up('King Midas', 11000, 'ABILITY — Midas Curse: every husk is Gilded ×5, loses 10% health and takes 300. Coins ×3.', { kind: 'crown', color: 0xfff2a8 }, {
          mods: { coin: { damageMult: 3 } },
          active: { name: 'Midas Curse', desc: 'Every husk is Gilded ×5, loses 10% and takes 300.', cooldown: 45000, global: true, cast: ab(300, 0, { kind: 'field', color: 0xffcc22 }, 'The whole road turns to gold.', { rider: { gild: 5, pct: 0.1 } }) },
        }),
      ]),
      path('Banker', 'Interest, discounts and a cut of every kill', [
        up('Savings', 120, 'Pays 3% interest on the gold you hold at every wave clear.', 'book', {
          traits: { interest: 0.03 },
        }),
        up('Broker', 350, 'Towers built or upgraded within 160px cost 10% less.', 'banner', {
          traits: { discount: { radius: 160, mult: 0.9 } },
        }),
        up('Investment Bank', 1100, '6% interest, and kills in its reach pay 25% more.', { kind: 'book', color: 0xffd700 }, {
          traits: { interest: 0.06, plunder: 0.25 },
        }),
        up('Central Bank', 3200, 'Towers within 200px cost 20% less; 8% interest.', { kind: 'banner', color: 0xffd700 }, {
          traits: { discount: { radius: 200, mult: 0.8 }, interest: 0.08 },
        }),
        up('World Reserve', 9000, 'Towers within 260px cost 30% less; 12% interest; kills nearby pay 50% more.', { kind: 'hat', color: 0x222222 }, {
          traits: { discount: { radius: 260, mult: 0.7 }, interest: 0.12, plunder: 0.5 },
        }),
      ]),
    ],
  },

  marrow: {
    cost: 120, range: 180, role: 'attack', body: { kind: 'ground' },
    blurb: 'Immune system. Hunts the strange — abstract and corrupt husks take far more.',
    signature: { name: 'Immune Response', desc: 'Abstract and corrupt husks take ×1.4. Its antibodies bleed.' },
    traits: { vsCategory: { cats: CORRUPT_AND_ABSTRACT, mult: 1.4 } },
    attacks: {
      antibody: ab(12, 600, { kind: 'bolt', look: 'bone', color: 0xeee6d0, speed: 600 }, 'Antibodies that bleed.', { name: 'Antibody', rider: { bleed: 1500 } }),
    },
    paths: [
      path('Immunity', 'Antibodies, fever and a pandemic', [
        up('More Antibodies', 100, 'Two antibodies a shot.', 'motes', {
          mods: { antibody: { countAdd: 1, fx: { spread: 0.3 } } },
        }),
        up('Killer Cells', 260, 'Antibodies hit +5 and bleed for 3s.', { kind: 'motes', color: 0xff5566 }, {
          mods: { antibody: { damageAdd: 5, rider: { bleed: 3000 } } },
        }),
        up('Fever', 800, 'Adds a fever pulse that bleeds everything within 140px.', 'flame', {
          add: { fever: ab(60, 4000, { kind: 'nova', radius: 140, color: 0xff5566 }, 'A fever that bleeds everything near it.', { name: 'Fever', rider: { bleed: 4000 }, gesture: 'q' }) },
        }),
        up('Autoimmune', 2200, 'Everything ×2.2; abstract and corrupt husks take ×2.', { kind: 'flame', color: 0xb8323f }, {
          mods: { '*': { damageMult: 2.2 } },
          traits: { vsCategory: { cats: CORRUPT_AND_ABSTRACT, mult: 2 } },
        }),
        up('Pandemic', 6500, 'Everything ×2.5; kills burst into three bone shards that hit 10% of the victim’s health.', { kind: 'skull', color: 0xb8323f }, {
          mods: { '*': { damageMult: 2.5 } },
          traits: { shrapnel: { count: 3, frac: 0.1 } },
        }),
      ]),
      path('Ribcage', 'Bone spurs on the road, a wall around the keep', [
        up('Dendricles', 140, 'Adds bone spurs scattered on the road.', 'bones', {
          add: { spurs: ab(14, 5000, { kind: 'trap', count: 3, hits: 3, ms: 13000, color: 0xb8323f, look: 'bone' }, 'Bone spurs on the road.', { name: 'Dendricles', gesture: 'f' }) },
        }),
        up('Ribcage', 380, 'The keep grows ribs: soaks 2 lives of breaches each wave.', 'bricks', {
          traits: { keepWard: 2 },
        }),
        up('Brainstem', 1200, 'ABILITY — Brainstem: towers within 200px fire 50% faster for 8s. Two more spurs.', 'antenna', {
          mods: { spurs: { countAdd: 2 } },
          active: { name: 'Brainstem', desc: 'Towers within 200px fire 50% faster for 8s.', cooldown: 35000, cast: ab(0, 0, { kind: 'rally', radius: 200, ms: 8000, fireRateMult: 1.5, color: 0xb8323f }, 'A reflex that quickens every tower near it.') },
        }),
        up('Exoskeleton', 3000, 'Soaks 5 lives of breaches each wave; spurs ×2.5.', { kind: 'bricks', color: 0xeee6d0 }, {
          traits: { keepWard: 5 },
          mods: { spurs: { damageMult: 2.5 } },
        }),
        up('Skeleton King', 8000, 'ABILITY — Marrow Surge: towers within 260px fire ×1.8 and hit ×1.3 for 10s. Ward 8.', { kind: 'crown', color: 0xeee6d0 }, {
          traits: { keepWard: 8 },
          mods: { spurs: { damageMult: 2 } },
          active: { name: 'Marrow Surge', desc: 'Towers within 260px fire ×1.8 and hit ×1.3 for 10s.', cooldown: 40000, cast: ab(0, 0, { kind: 'rally', radius: 260, ms: 10000, fireRateMult: 1.8, damageMult: 1.3, color: 0xeee6d0 }, 'Marrow floods every tower near it.') },
        }),
      ]),
      path('White Cells', 'Cells that patrol the road', [
        up('Macrophage', 160, 'Adds a white cell that patrols up the road.', 'bubbles', {
          add: { cell: ab(20, 4500, { kind: 'minion', hits: 3, speed: 90, ms: 9000, color: 0xffffff, look: 'ghost' }, 'A white cell patrols up the road.', { name: 'Macrophage', gesture: 'e' }) },
        }),
        up('Lymph Flow', 340, 'White cells come 40% faster and strike two more husks.', { kind: 'bubbles', color: 0xddeeff }, {
          mods: { cell: { cooldownMult: 0.6, pierceAdd: 2 } },
        }),
        up('T-Cells', 1000, 'Cells ×2.5 and unmask hidden husks they touch; the tower detects.', 'eye', {
          mods: { cell: { damageMult: 2.5, rider: { unmask: true } } },
          traits: { detect: true },
        }),
        up('Bone Wolves', 2800, 'Adds a bone wolf that runs down eight husks.', 'horns', {
          add: { wolf: ab(80, 6000, { kind: 'minion', hits: 8, speed: 150, ms: 9000, color: 0xeee6d0, look: 'wolf', size: 1.2 }, 'A bone wolf runs the road.', { name: 'Bone Wolf', rider: { bleed: 3000 } }) },
        }),
        up('Marrow Legion', 7500, 'Everything ×3; cells come twice as often.', { kind: 'pennant', color: 0xeee6d0 }, {
          mods: { '*': { damageMult: 3 }, cell: { cooldownMult: 0.5 } },
        }),
      ]),
    ],
  },

  tempest: {
    cost: 440, range: 140, role: 'attack', body: { kind: 'drift', leash: 190, speed: 70 },
    blurb: 'Storm cloud. Drifts to wherever the pack is thickest and lightning falls from it.',
    signature: { name: 'Storm Front', desc: 'Drifts toward the densest crowd within reach of its pad. Airborne husks take ×1.4.' },
    traits: { antiAir: 1.4 },
    attacks: {
      gale: ab(44, 700, { kind: 'chain', jumps: 2, jumpRange: 80, color: 0xffee66 }, 'Lightning from the cloud, arcing through three.', { name: 'Gale Burst' }),
    },
    paths: [
      path('Thunderhead', 'More lightning, harder lightning', [
        up('Forked Bolts', 300, 'Lightning arcs through two more and hits +8.', 'sparks', {
          mods: { gale: { countAdd: 2, damageAdd: 8 } },
        }),
        up('Static Charge', 600, 'Lightning 30% faster and leaves husks brittle (+4 per hit).', { kind: 'sparks', color: 0xffffaa }, {
          mods: { gale: { cooldownMult: 0.7, rider: { brittle: { add: 4, ms: 2000 } } } },
        }),
        up('Supercell', 2000, 'Adds a thunderbolt straight down that stuns.', 'antenna', {
          add: { strike: ab(160, 3000, { kind: 'splash', radius: 70, color: 0xffffff, delayMs: 400, shape: 'strike' }, 'A thunderbolt straight down.', { name: 'Thunderbolt', rider: { stun: 500 }, gesture: 'r' }) },
        }),
        up('Electric Sky', 5000, 'All lightning ×2.2, and arcs lose almost nothing as they jump.', { kind: 'antenna', color: 0xffee66 }, {
          mods: { '*': { damageMult: 2.2 }, gale: { fx: { falloff: 0.95 } } },
        }),
        up('Hurricane', 14000, 'All lightning ×2.5; the cloud flies faster and further.', { kind: 'eye', color: 0xffffff }, {
          mods: { '*': { damageMult: 2.5 }, strike: { cooldownMult: 0.6 } },
          body: { leash: 260, speed: 110 },
        }),
      ]),
      path('Weather Front', 'Rain that soaks, grounds and drowns', [
        up('Rain Front', 250, 'Adds rain that soaks and slows the pack beneath.', 'bubbles', {
          add: { rain: ab(10, 6000, { kind: 'zone', radius: 110, ms: 5000, color: 0x8899bb, shape: 'storm' }, 'Rain that soaks and slows.', { name: 'Summon Front', rider: { soak: 2000, slow: { mult: 0.75, ms: 600 } }, gesture: 'r' }) },
        }),
        up('Downdraft', 550, 'The rain beats flyers out of the sky: grounded for 3s.', { kind: 'bubbles', color: 0xccddff }, {
          mods: { rain: { rider: { ground: 3000 } } },
        }),
        up('Eye of the Storm', 1800, 'ABILITY — Eye of the Storm: every husk on the map takes 250, is soaked and slowed to half.', 'eye', {
          active: { name: 'Eye of the Storm', desc: 'Every husk takes 250, soaked and slowed to half for 4s.', cooldown: 40000, global: true, cast: ab(250, 0, { kind: 'field', color: 0x8899bb }, 'A storm over the whole road.', { rider: { soak: 4000, slow: { mult: 0.5, ms: 4000 } } }) },
        }),
        up('Monsoon', 4500, 'Rain ×2, 30% wider, and its current drags husks back.', { kind: 'moat', color: 0x5577aa }, {
          mods: { rain: { damageMult: 2, areaMult: 1.3, fx: { pull: 40 } } },
        }),
        up('Final Forecast', 13000, 'ABILITY — Final Forecast: every husk takes 1200 and is stunned 2s. Lightning ×2.', { kind: 'crown', color: 0xffffaa }, {
          mods: { gale: { damageMult: 2 } },
          active: { name: 'Final Forecast', desc: 'Every husk takes 1200 and is stunned 2s.', cooldown: 50000, global: true, cast: ab(1200, 0, { kind: 'field', color: 0xffffaa }, 'Lightning across the whole map.', { rider: { stun: 2000, soak: 4000 } }) },
        }),
      ]),
      path('Cyclone', 'Wind that throws the pack back', [
        up('Kick Blast', 200, 'Adds a downdraft that shoves husks back.', 'leaves', {
          add: { kick: ab(20, 3500, { kind: 'splash', radius: 80, color: 0xccddff, shape: 'ring' }, 'A downdraft that shoves.', { name: 'Kick Blast', rider: { knockback: 60 }, gesture: 'e' }) },
        }),
        up('Updraft', 500, 'Adds a column that lifts the pack off its feet for 1s.', { kind: 'leaves', color: 0xddeeff }, {
          add: { updraft: ab(10, 7000, { kind: 'splash', radius: 90, color: 0xddeeff, shape: 'ring' }, 'Lifts the pack off its feet.', { name: 'Updraft', rider: { stun: 1000 }, gesture: 'f' }) },
        }),
        up('Cyclone', 1600, 'Adds a cyclone that drags husks back up the road for 4s.', 'orbit', {
          add: { cyclone: ab(20, 9000, { kind: 'zone', radius: 120, ms: 4000, color: 0xbbccdd, shape: 'storm', pull: 90 }, 'A cyclone that drags husks back.', { name: 'Cyclone' }) },
        }),
        up('Tornado Alley', 4000, 'Cyclones 40% more often and wider; anything stunned or slowed takes ×1.5.', { kind: 'orbit', color: 0xffffff }, {
          mods: { cyclone: { cooldownMult: 0.6, areaMult: 1.3 } },
          traits: { bully: 1.5 },
        }),
        up('Maelstrom', 11000, 'Everything ×3, the cyclone drags at 160px/s, and the cloud reaches further.', { kind: 'wings', color: 0xddeeff }, {
          mods: { '*': { damageMult: 3 }, cyclone: { fx: { pull: 160 } } },
          body: { leash: 260 },
        }),
      ]),
    ],
  },

  myth: {
    cost: 200, range: 200, role: 'control', body: { kind: 'ground' },
    blurb: 'Legend. Strings constellations across the road — every husk that crosses pays.',
    signature: { name: 'Constellation', desc: 'Its star-fences hit every husk that crosses them, once each.' },
    traits: {},
    attacks: {
      whip: ab(30, 900, { kind: 'line', length: 140, width: 24, color: 0x7d5cff }, 'A crack of starlight down the road.', { name: 'Cosmic Whip' }),
    },
    paths: [
      path('Constellation', 'Star-fences across the road', [
        up('Truth Breaker', 160, 'Adds a star-fence across the road for 8s.', 'star', {
          add: { fence: ab(40, 4000, { kind: 'fence', ms: 8000, color: 0xb39dff, width: 4 }, 'A star-fence across the road.', { name: 'Truth Breaker', gesture: 'e' }) },
        }),
        up('Bright Stars', 380, 'Fences ×1.6 and strung 30% faster.', { kind: 'star', color: 0xffffff }, {
          mods: { fence: { damageMult: 1.6, cooldownMult: 0.7 } },
        }),
        up('Star Chart', 1300, 'Adds a second fence; both leave husks brittle (+6 per hit).', 'runes', {
          add: { orion: ab(60, 3500, { kind: 'fence', ms: 8000, color: 0xd0c0ff, width: 5 }, 'A second constellation.', { name: 'Orion', rider: { brittle: { add: 6, ms: 3000 } } }) },
          mods: { fence: { rider: { brittle: { add: 6, ms: 3000 } } } },
        }),
        up('Zodiac', 3400, 'Everything ×2.2.', { kind: 'runes', color: 0xffffff }, {
          mods: { '*': { damageMult: 2.2 } },
        }),
        up('Final Destiny', 9500, 'Fences ×3 and carve 5% of current health off every crosser.', { kind: 'sun', color: 0xffffff }, {
          mods: { fence: { damageMult: 3, rider: { pct: 0.05 } }, orion: { damageMult: 3, rider: { pct: 0.05 } } },
        }),
      ]),
      path('Legend', 'A star-beast, and a hole in the sky', [
        up('Beast of Myth', 220, 'Adds a star-beast that runs four husks down.', 'horns', {
          add: { beast: ab(40, 6000, { kind: 'minion', hits: 4, speed: 130, ms: 9000, color: 0x7d5cff, look: 'wolf', size: 1.2 }, 'A star-beast runs the road.', { name: 'Beast of Myth', gesture: 'f' }) },
        }),
        up('Greater Beast', 520, 'The beast hits ×1.4 and runs through three more.', { kind: 'horns', color: 0xb39dff }, {
          mods: { beast: { damageMult: 1.4, pierceAdd: 3 } },
        }),
        up('Wormhole', 1600, 'ABILITY — Wormhole: drags husks back through space for 4s. The tower grows +3% per wave.', 'moon', {
          traits: { veteran: { per: 0.03, cap: 0.6 } },
          active: { name: 'Wormhole', desc: 'Drags the pack back hard for 4s.', cooldown: 30000, cast: ab(40, 0, { kind: 'zone', radius: 120, ms: 4000, color: 0x7d5cff, shape: 'rune', pull: 140 }, 'A hole in space.') },
        }),
        up('Saga', 3800, 'The beast ×2.5 and comes 30% more often.', 'book', {
          mods: { beast: { damageMult: 2.5, cooldownMult: 0.7 } },
        }),
        up('Ragnarok', 11000, 'ABILITY — Ragnarok: every husk takes 900 and 15% are thrown back to the breach. Beast ×2.', { kind: 'eye', color: 0xb39dff }, {
          mods: { beast: { damageMult: 2 } },
          active: { name: 'Ragnarok', desc: 'Every husk takes 900; 15% are thrown back to the breach.', cooldown: 50000, global: true, cast: ab(900, 0, { kind: 'field', color: 0x7d5cff }, 'The end of the world, briefly.', { rider: { banish: 0.15 } }) },
        }),
      ]),
      path('Parry', 'Throw them back where they came from', [
        up('Parry', 120, 'Adds a flourish that throws the pack back.', 'shield', {
          add: { parry: ab(20, 5000, { kind: 'nova', radius: 90, color: 0x9a7aff }, 'A flourish that throws the pack back.', { name: 'Parry', rider: { knockback: 50 }, gesture: 'r' }) },
        }),
        up('Perfect Parry', 300, 'Parries 40% more often.', { kind: 'shield', color: 0xb39dff }, {
          mods: { parry: { cooldownMult: 0.6 } },
        }),
        up('Exile', 1100, 'The whip has a 4% chance to throw a husk back to its breach.', 'pennant', {
          mods: { whip: { rider: { banish: 0.04 } } },
        }),
        up('Long Whip', 3000, 'Whip 50% longer and ×2.5; parry ×2.', { kind: 'pennant', color: 0xffffff }, {
          mods: { whip: { damageMult: 2.5, areaMult: 1.5 }, parry: { damageMult: 2 } },
        }),
        up('Banishment', 8800, 'Whip ×2.5 with a 10% banish; the parry throws husks 120px.', { kind: 'halo', color: 0xb39dff }, {
          mods: { whip: { damageMult: 2.5, rider: { banish: 0.1 } }, parry: { rider: { knockback: 120 } } },
        }),
      ]),
    ],
  },

  cloth: {
    cost: 110, range: 190, role: 'trap', body: { kind: 'ground' },
    blurb: 'Tailor. A scarf hand that lashes the road, needles, bolas and pincushions.',
    signature: { name: 'Bound in Cloth', desc: 'Its bolas Stitch husks together: each shares 30% of every hit.' },
    traits: {},
    attacks: {
      scarf: ab(12, 650, { kind: 'line', length: 190, width: 24, color: 0xd1435c }, 'The scarf lashes out down the road.', { name: 'Scarf Hand', rider: { knockback: 14 } }),
    },
    paths: [
      path('Needlework', 'Needles by the thousand', [
        up('Needle Nexus', 120, 'Adds three needles thrown down the road.', 'spikes', {
          add: { needles: ab(20, 3000, { kind: 'bolt', look: 'needle', color: 0xd8dfe8, speed: 760, count: 3, spread: 0.5, pierce: 1 }, 'Three needles thrown down the road.', { name: 'Needle Nexus', gesture: 'e' }) },
        }),
        up('Sharp Needles', 260, 'Needles hit +6 and come 40% faster.', { kind: 'spikes', color: 0xd8dfe8 }, {
          mods: { needles: { damageAdd: 6, cooldownMult: 0.6 } },
        }),
        up('Needle Rain', 900, 'Needles come in bursts of three.', 'sparks', {
          mods: { needles: { fx: { salvo: 3 } } },
        }),
        up('Needle Storm', 2400, 'Everything ×1.8; one more needle a throw.', { kind: 'sparks', color: 0xd8dfe8 }, {
          mods: { '*': { damageMult: 1.8 }, needles: { countAdd: 1 } },
        }),
        up('Thousand Needles', 7000, 'Everything ×2; needles in bursts of four, and they bleed.', { kind: 'crown', color: 0xd8dfe8 }, {
          mods: { '*': { damageMult: 2 }, needles: { fx: { salvo: 4 }, rider: { bleed: 2000 } } },
        }),
      ]),
      path('Binding', 'Tie the pack up and stitch it together', [
        up('Bola', 150, 'Adds a bola that slows and stitches the pack.', 'chains', {
          add: { bola: ab(10, 6000, { kind: 'bolt', look: 'orb', color: 0xe8ddc4, speed: 600, splash: 50, splashMult: 1 }, 'A bola that binds and stitches.', { name: 'Constraining Cloth', rider: { link: 5000, slow: { mult: 0.5, ms: 5000 } }, gesture: 'r' }) },
        }),
        up('Tight Stitches', 350, 'Bolas 40% more often and leave husks brittle (+3 per hit).', { kind: 'chains', color: 0xd1435c }, {
          mods: { bola: { cooldownMult: 0.6, rider: { brittle: { add: 3, ms: 5000 } } } },
        }),
        up('Straitjacket', 1100, 'ABILITY — Straitjacket: every husk on the map is stitched and held for 2.5s.', 'cape', {
          active: { name: 'Straitjacket', desc: 'Every husk is stitched and held for 2.5s.', cooldown: 35000, global: true, cast: ab(50, 0, { kind: 'field', color: 0xe8ddc4 }, 'Cloth wraps the whole road.', { rider: { stun: 2500, link: 6000 } }) },
        }),
        up('Mystical Jacket', 3000, 'Bolas turn husks around for 2s; the scarf ×2.', { kind: 'cape', color: 0x8a5aff }, {
          mods: { bola: { rider: { confuse: 2000 } }, scarf: { damageMult: 2 } },
        }),
        up('Effigy', 9000, 'ABILITY — Effigy: every husk takes 400, is stitched, held 4s and slowed after. Scarf ×2.5.', { kind: 'skull', color: 0xd1435c }, {
          mods: { scarf: { damageMult: 2.5 } },
          active: { name: 'Effigy', desc: 'Every husk takes 400, stitched, held 4s, then slowed.', cooldown: 45000, global: true, cast: ab(400, 0, { kind: 'field', color: 0xd1435c }, 'A doll of the whole road.', { rider: { stun: 4000, link: 8000, slow: { mult: 0.3, ms: 8000 } } }) },
        }),
      ]),
      path('Pincushion', 'Fill the road with pins and stuffing', [
        up('Pincushion', 100, 'Adds a cushion on the road that pins whatever passes.', 'banner', {
          add: { cushion: ab(9, 4500, { kind: 'trap', count: 1, hits: 6, ms: 14000, color: 0xd33b2c, look: 'pin' }, 'A cushion that pins whatever passes.', { name: 'Pincushion', gesture: 'f' }) },
        }),
        up('Recycled Cushion', 240, 'Two cushions at a time.', { kind: 'banner', color: 0xd33b2c }, {
          mods: { cushion: { countAdd: 1 } },
        }),
        up('Stuffing Mines', 800, 'Adds stuffing mines that burst on the first husk.', 'sack', {
          add: { mines: ab(60, 5000, { kind: 'trap', count: 2, hits: 1, ms: 14000, color: 0xe8ddc4, look: 'mine', blast: 60 }, 'Stuffing mines that burst.', { name: 'Stuffing Mines' }) },
        }),
        up('Burning Man', 2600, 'Everything sets husks alight; traps ×2.2.', 'flame', {
          mods: { '*': { rider: { burn: 3000 } }, cushion: { damageMult: 2.2 }, mines: { damageMult: 2.2 } },
        }),
        up('Sweatshop', 7500, 'Traps ×3, two more of each, and kills burst into pins.', { kind: 'hat', color: 0xd1435c }, {
          mods: { cushion: { damageMult: 3, countAdd: 2 }, mines: { damageMult: 3, countAdd: 2 } },
          traits: { shrapnel: { count: 3, frac: 0.08 } },
        }),
      ]),
    ],
  },

  psychic: {
    cost: 270, range: 190, role: 'support', body: { kind: 'ground' },
    blurb: 'Grandmaster. Its board lets nearby towers see further and see hidden husks.',
    signature: { name: 'Board Vision', desc: 'Towers within 150px get +12% range and can target hidden husks.' },
    traits: { detect: true, aura: { radius: 150, range: 1.12, detect: true, label: 'Board Vision', color: 0xe8e4d8 } },
    attacks: {
      pawn: ab(18, 700, { kind: 'bolt', look: 'pawn', color: 0xe8e4d8, speed: 560 }, 'En Passant: a thrown pawn.', { name: 'En Passant' }),
    },
    paths: [
      path('Board Vision', 'Make every tower near it better', [
        up('Openings', 200, 'The board reaches 170px and gives +18% range.', 'eye', {
          traits: { aura: { radius: 170, range: 1.18, detect: true, label: 'Board Vision', color: 0xe8e4d8 } },
        }),
        up('Tempo', 500, 'Towers on the board also fire 12% faster.', 'runes', {
          traits: { aura: { radius: 170, range: 1.18, fireRate: 1.12, detect: true, label: 'Board Vision', color: 0xe8e4d8 } },
        }),
        up('Strategy', 1500, 'The board reaches 190px: +20% range, +15% fire rate, +15% damage.', { kind: 'runes', color: 0xffffff }, {
          traits: { aura: { radius: 190, range: 1.2, fireRate: 1.15, damage: 1.15, detect: true, label: 'Board Vision', color: 0xe8e4d8 } },
        }),
        up('Master Plan', 4000, 'Towers on the board fire 25% faster and hit 25% harder.', 'book', {
          traits: { aura: { radius: 200, range: 1.2, fireRate: 1.25, damage: 1.25, detect: true, label: 'Board Vision', color: 0xe8e4d8 } },
        }),
        up('Grandmaster', 11000, 'A 230px board: +25% range, +35% fire rate, +40% damage, +1 pierce.', { kind: 'crown', color: 0xe8e4d8 }, {
          traits: { aura: { radius: 230, range: 1.25, fireRate: 1.35, damage: 1.4, pierce: 1, detect: true, label: 'Board Vision', color: 0xe8e4d8 } },
        }),
      ]),
      path('Gambit', 'Mind games: turn them round, put them out', [
        up('Knightly Mandate', 180, 'Adds a burst that turns the pack around for 2s.', 'horns', {
          add: { mandate: ab(10, 5000, { kind: 'splash', radius: 70, color: 0xccc8bb }, 'The pack is turned around.', { name: 'Knightly Mandate', rider: { confuse: 2000 }, gesture: 'r' }) },
        }),
        up('Fork', 420, 'The mandate is 30% wider and holds 3s.', { kind: 'horns', color: 0xffffff }, {
          mods: { mandate: { areaMult: 1.3, rider: { confuse: 3000 } } },
        }),
        up('Check', 1500, 'ABILITY — Check: every husk on the map takes 30 and turns around for 3s.', 'eye', {
          active: { name: 'Check', desc: 'Every husk takes 30 and turns around for 3s.', cooldown: 35000, global: true, cast: ab(30, 0, { kind: 'field', color: 0xe8e4d8 }, 'Every husk second-guesses itself.', { rider: { confuse: 3000 } }) },
        }),
        up('Zugzwang', 3800, 'Pawns put husks to sleep 30% of the time; mandate ×2.', { kind: 'moon', color: 0xb8a8ff }, {
          mods: { pawn: { rider: { sleep: 1500, chance: 0.3 } }, mandate: { damageMult: 2 } },
        }),
        up('Checkmate', 10500, 'ABILITY — Checkmate: every husk takes 600, turns around 4s; 20% thrown back to the breach.', { kind: 'crown', color: 0xffffff }, {
          active: { name: 'Checkmate', desc: 'Every husk takes 600, turns around; 20% go back to the breach.', cooldown: 45000, global: true, cast: ab(600, 0, { kind: 'field', color: 0xffffff }, 'The game ends.', { rider: { confuse: 4000, banish: 0.2 } }) },
        }),
      ]),
      path('Pieces', 'Put pieces on the board that fight', [
        up('Pawn Wall', 220, 'Stands two pawns by the road that fight.', 'cards', {
          add: { pawns: ab(12, 6000, { kind: 'sentry', ms: 15000, max: 2, attackMs: 700, range: 140, color: 0xe8e4d8, look: 'pawn' }, 'Stands a pawn by the road that fights.', { name: 'Bisharp', gesture: 'e' }) },
        }),
        up('Promotion', 480, 'Pawns hit ×1.8 and a third stands.', { kind: 'cards', color: 0xffffff }, {
          mods: { pawns: { damageMult: 1.8, countAdd: 1 } },
        }),
        up('Rook Battery', 1400, 'Adds a rook that slides down the road through everything.', 'bricks', {
          add: { rook: ab(60, 4000, { kind: 'line', length: 240, width: 40, color: 0xe8e4d8 }, 'A rook slides down the road.', { name: 'Rook Battery', gesture: 'f' }) },
        }),
        up('Bishop Diagonals', 3600, 'Everything ×2.2.', { kind: 'hat', color: 0xe8e4d8 }, {
          mods: { '*': { damageMult: 2.2 } },
        }),
        up('Queen', 10000, 'Adds the queen — strikes in every direction — and everything ×2.', { kind: 'crown', color: 0xffffff }, {
          add: { queen: ab(80, 3000, { kind: 'bolt', look: 'pawn', color: 0xffffff, speed: 600, count: 8, spread: 6.28, pierce: 3 }, 'Strikes in every direction.', { name: 'Queen', gesture: 'q' }) },
          mods: { '*': { damageMult: 2 } },
        }),
      ]),
    ],
  },

  radiation: {
    cost: 315, range: 300, role: 'sniper', body: { kind: 'ground' },
    blurb: 'Railgun. Long shots that irradiate — the dose keeps killing after the shot.',
    signature: { name: 'Half-Life', desc: 'Its hits Irradiate: each stack burns 0.4% of max health a second (up to 12).' },
    traits: {},
    attacks: {
      rail: ab(55, 1400, { kind: 'bolt', look: 'bolt', color: 0x7cff3d, speed: 1200, pierce: 3 }, 'A railgun slug through four, irradiating.', { name: 'Radiation Railgun', rider: { radiate: 2 }, dtype: 'energy' }),
    },
    paths: [
      path('Enrichment', 'A dose that keeps killing', [
        up('Enriched Rounds', 200, 'Slugs add 3 radiation stacks.', 'motes', {
          mods: { rail: { rider: { radiate: 3 } } },
        }),
        up('Hot Slug', 500, 'Slugs hit +20 and burn off 3% of current health.', { kind: 'motes', color: 0xccff88 }, {
          mods: { rail: { damageAdd: 20, rider: { pct: 0.03 } } },
        }),
        up('Fallout Bunker', 1600, 'Adds radiation leaking 110px around the tower.', 'moat', {
          add: { leak: ab(10, 1000, { kind: 'aura', radius: 110, color: 0x7cff3d, look: 'rad' }, 'Radiation leaks around the tower.', { name: 'Fallout Bunker', rider: { radiate: 1 } }) },
        }),
        up('Meltdown', 4200, 'Everything ×2.2; slugs add 5 stacks.', { kind: 'moat', color: 0xccff88 }, {
          mods: { '*': { damageMult: 2.2 }, rail: { rider: { radiate: 5 } } },
        }),
        up('Half-Life', 12000, 'Everything ×2.5; slugs burn 8% of current health; bosses take ×1.5.', { kind: 'skull', color: 0x7cff3d }, {
          mods: { '*': { damageMult: 2.5 }, rail: { rider: { pct: 0.08 } } },
          traits: { bossBane: 1.5 },
        }),
      ]),
      path('Reactor', 'Rods, barrages and a beam across the map', [
        up('Rod Baton', 260, 'Adds a rod that arcs between four husks.', 'gears', {
          add: { rod: ab(30, 4000, { kind: 'chain', jumps: 3, jumpRange: 100, color: 0xaaff66 }, 'A rod that arcs between four.', { name: 'Rod Baton', rider: { radiate: 1 }, gesture: 'f' }) },
        }),
        up('Barrage', 550, 'Adds a spread of four hot rounds.', { kind: 'gears', color: 0x7cff3d }, {
          add: { barrage: ab(12, 2500, { kind: 'bolt', color: 0x9cff6d, speed: 700, count: 4, spread: 0.4 }, 'Four hot rounds.', { name: 'Barrage', rider: { radiate: 1 }, gesture: 'e' }) },
        }),
        up('Extermination', 1900, 'ABILITY — Extermination: a beam across the map for 500 that adds 6 stacks.', 'antenna', {
          active: { name: 'Extermination', desc: 'A beam across the map: 500 and 6 radiation stacks.', cooldown: 30000, global: true, cast: ab(500, 0, { kind: 'line', length: 900, width: 40, color: 0xccff88 }, 'A beam across the map.', { rider: { radiate: 6 } }) },
        }),
        up('Critical Mass', 4500, 'Everything ×2.3 and 20% faster.', { kind: 'antenna', color: 0xccff88 }, {
          mods: { '*': { damageMult: 2.3, cooldownMult: 0.8 } },
        }),
        up('Chernobyl', 13000, 'ABILITY — Chernobyl: every husk takes 1000, maxes its radiation and loses 10%.', { kind: 'sun', color: 0x7cff3d }, {
          mods: { '*': { damageMult: 1.5 } },
          active: { name: 'Chernobyl', desc: 'Every husk takes 1000, max radiation, loses 10%.', cooldown: 50000, global: true, cast: ab(1000, 0, { kind: 'field', color: 0x7cff3d }, 'The reactor goes up.', { rider: { radiate: 12, pct: 0.1 } }) },
        }),
      ]),
      path('Railgun', 'One shot, from across the map', [
        up('Long Barrel', 180, 'Reach +30%.', 'scope', {
          range: 1.3,
        }),
        up('Capacitor', 450, 'Slugs charge while it waits: +25% a second, up to ×2.5.', { kind: 'scope', color: 0x7cff3d }, {
          mods: { rail: { charge: { perSec: 0.25, cap: 2.5 } } },
        }),
        up('Gauss Rifle', 1500, 'Slugs hit +60 and pierce four more.', 'barrel', {
          mods: { rail: { damageAdd: 60, pierceAdd: 4 } },
        }),
        up('Tungsten Slug', 4000, 'Slugs ×2.5 and strip camouflage for good; the tower sees hidden husks.', { kind: 'eye', color: 0x7cff3d }, {
          mods: { rail: { damageMult: 2.5, rider: { unmask: true } } },
          traits: { detect: true },
        }),
        up('Planet Cracker', 11500, 'Slugs ×3 and 30% faster; one in four is a critical for ×3.', { kind: 'star', color: 0xccff88 }, {
          mods: { rail: { damageMult: 3, cooldownMult: 0.7 } },
          traits: { crit: { chance: 0.25, mult: 3 } },
        }),
      ]),
    ],
  },
};
