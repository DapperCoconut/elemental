import type { TowerDef } from '../StrongholdTypes';
import { ab, path, up } from './helpers';

/**
 * Growth, Crystal, Soul, Hunt, Time (`sand`), Gravity, Creation and Electricity.
 */
export const BATCH2_TOWERS: Record<string, TowerDef> = {
  growth: {
    cost: 75, range: 170, role: 'attack', body: { kind: 'ground' },
    blurb: 'Cheap spore-spitter. Infect one and let it spread through the pack.',
    signature: { name: 'Contagion', desc: 'Its spores Infect: when a host dies, the poison jumps to the husks around it.' },
    traits: {},
    attacks: {
      spores: ab(6, 500, { kind: 'bolt', color: 0x88bb22, speed: 480 }, 'Spores that infect on contact.', { name: 'Spores', rider: { toxic: { ms: 3000, dps: 3 }, infect: 3000 } }),
    },
    paths: [
      path('Pandemic', 'Poison that spreads, then bursts', [
        up('Virulent Strain', 90, 'Spores hit +2 and their poison bites twice as hard for 4s.', 'bubbles', {
          mods: { spores: { damageAdd: 2, rider: { toxic: { ms: 4000, dps: 6 }, infect: 4000 } } },
        }),
        up('Rapid Mitosis', 210, 'Spits spores 40% faster.', 'bubbles', {
          mods: { spores: { cooldownMult: 0.6 } },
        }),
        up('Spore Cloud', 750, 'Adds a mould cloud on the road that poisons and infects all who cross it.', 'motes', {
          add: { cloud: ab(28, 3500, { kind: 'zone', radius: 80, ms: 4000, color: 0x88bb22, shape: 'mold' }, 'A mould cloud that infects whatever crosses it.', { name: 'Spore Cloud', rider: { toxic: { ms: 4000, dps: 8 }, infect: 4000 } }) },
        }),
        up('Outbreak', 2200, 'All hits ×2, poison 18/s; hosts it kills burst into three infected shards.', 'skull', {
          mods: { '*': { damageMult: 2, rider: { toxic: { ms: 6000, dps: 18 }, infect: 6000 } } },
          traits: { shrapnel: { count: 3, frac: 0.15 } },
        }),
        up('Plague Bearer', 7500, 'All hits ×3, a wider cloud, and spores eat 2% of current health.', { kind: 'horns', color: 0x88bb22 }, {
          mods: { '*': { damageMult: 3 }, cloud: { areaMult: 1.5 }, spores: { rider: { pct: 0.02 } } },
        }),
      ]),
      path('Evolution', 'Mutate mid-fight into an apex organism', [
        up('Adaptation', 120, '+15% range, and every kill makes it 1% stronger (up to +50%).', 'eye', {
          range: 1.15, traits: { killRamp: { per: 0.01, cap: 0.5 } },
        }),
        up('Syringe Shot', 280, 'Adds a needle that pierces four husks every 2.5s.', 'spikes', {
          add: { syringe: ab(30, 2500, { kind: 'bolt', look: 'needle', color: 0xccff66, speed: 800, pierce: 4 }, 'A needle through four husks.', { name: 'Syringe Shot', rider: { toxic: { ms: 4000, dps: 6 }, infect: 4000 }, gesture: 'e' }) },
        }),
        up('Evolve', 900, 'ABILITY — Evolve: for 8s it fires twice as fast and hits ×1.5. Spores hit +4.', 'antenna', {
          mods: { spores: { damageAdd: 4 } },
          active: { name: 'Evolve', desc: 'Mutates for 8s: double fire rate, ×1.5 damage.', cooldown: 30000, selfBuff: { ms: 8000, fireRateMult: 2, damageMult: 1.5 } },
        }),
        up('Apex Organism', 2600, 'All hits ×2, and it grows 3% stronger every wave it survives (up to +60%).', 'bones', {
          mods: { '*': { damageMult: 2 } },
          traits: { veteran: { per: 0.03, cap: 0.6 } },
        }),
        up('Hivemind Bloom', 8500, 'ABILITY — Bloom: infects everything in 220px for 400, then 10s of ×2.5 fire. All hits ×2.', { kind: 'crown', color: 0xaadd44 }, {
          mods: { '*': { damageMult: 2 } },
          active: {
            name: 'Bloom', desc: 'A 220px infecting burst, then 10s at 2.5× fire rate and ×2 damage.', cooldown: 35000,
            cast: ab(400, 0, { kind: 'nova', radius: 220, color: 0xaadd44 }, 'A bloom of infection.', { rider: { toxic: { ms: 8000, dps: 30 }, infect: 8000 } }),
            selfBuff: { ms: 10000, fireRateMult: 2.5, damageMult: 2 },
          },
        }),
      ]),
      path('Overgrowth', 'Vines that slow, snare and pull flyers down', [
        up('Creeping Vines', 80, 'Adds vines on the road that slow husks to 60%.', 'roots', {
          add: { vines: ab(4, 3000, { kind: 'zone', radius: 60, ms: 3000, color: 0x3f8f2e, shape: 'mold' }, 'Vines that slow whatever wades through.', { name: 'Vines', rider: { slow: { mult: 0.6, ms: 700 } } }) },
        }),
        up('Tanglewood', 220, 'Vines slow to 40% and drag airborne husks down for 2s.', 'roots', {
          mods: { vines: { rider: { slow: { mult: 0.4, ms: 700 }, ground: 2000 } } },
        }),
        up('Thornwall', 800, 'Adds a thorn hedge across the road that husks must chew through.', 'spikes', {
          add: { thornwall: ab(22, 9000, { kind: 'barrier', ms: 6000, hp: 150, color: 0x3f8f2e, label: '🌿' }, 'A thorn hedge across the road.', { name: 'Thornwall', gesture: 'f' }) },
        }),
        up('Strangler Fig', 2400, 'Wider vines that hit ×4; it hits slowed and stuck husks ×1.5.', 'leaves', {
          mods: { vines: { areaMult: 1.4, damageMult: 4 } },
          traits: { bully: 1.5 },
        }),
        up('World Root', 7000, 'Adds a root-grasp that drags the pack backward; vines root husks 0.6s.', { kind: 'halo', color: 0x5fcf6e }, {
          mods: { vines: { damageMult: 3, rider: { stun: 600, chance: 0.25 } } },
          add: { grasp: ab(70, 8000, { kind: 'zone', radius: 130, ms: 5000, color: 0x2f6a1e, shape: 'mold', pull: 50 }, 'Roots that drag the pack back up the road.', { name: 'Root Grasp', rider: { slow: { mult: 0.4, ms: 800 } } }) },
        }),
      ]),
    ],
  },

  crystal: {
    cost: 260, range: 200, role: 'summoner', body: { kind: 'ground' },
    blurb: 'Ricocheting shards, pylons that fire on their own, and a laser that never lets go.',
    signature: { name: 'Faceted', desc: 'Its shards ricochet to a second husk.' },
    traits: {},
    attacks: {
      shard: ab(16, 400, { kind: 'bolt', look: 'shard', color: 0x77c4e8, speed: 600, bounces: 1 }, 'Diamond shards that ricochet once.', { name: 'Shard' }),
    },
    paths: [
      path('Prism', 'A laser that burns hotter the longer it holds', [
        up('Focusing Lens', 180, 'Adds a laser that locks on and grows brighter the longer it holds.', 'crystals', {
          add: { laser: ab(18, 3000, { kind: 'beam', color: 0xc8f0ff, width: 5, ms: 2500, ramp: 0.6 }, 'A laser that ramps while it holds.', { name: 'Atune', gesture: 'r' }) },
        }),
        up('Refraction', 350, 'Laser ramps twice as fast; repeated hits on one husk stack +8% each (up to +80%).', 'crystals', {
          mods: { laser: { fx: { ramp: 1.2 } } },
          traits: { focus: { per: 0.08, cap: 0.8 } },
        }),
        up('Prism Core', 1400, 'The laser hits ×3 and holds without a break.', 'star', {
          mods: { laser: { damageMult: 3, fx: { ms: 3000 } } },
        }),
        up('Spectrum', 4000, 'All hits ×2.2 and leave husks brittle (+6 per hit for 2s).', 'halo', {
          mods: { '*': { damageMult: 2.2, rider: { brittle: { add: 6, ms: 2000 } } } },
        }),
        up('Diamond Lance', 12000, 'Laser ×3.5 and twice as thick, +20% range, bosses take ×1.5.', { kind: 'crown', color: 0xe8fbff }, {
          mods: { laser: { damageMult: 3.5, fx: { width: 12 } } },
          range: 1.2, traits: { bossBane: 1.5 },
        }),
      ]),
      path('Geode Array', 'Pylons that fire alongside it', [
        up('Pylon', 220, 'Grows a crystal pylon beside it that fires its own shards.', 'crystals', {
          add: { pylon: ab(10, 8000, { kind: 'sentry', ms: 20000, max: 1, attackMs: 600, range: 160, color: 0xa8e4ff, look: 'crystal' }, 'A pylon that fires shards for 20s.', { name: 'Pylon', gesture: 'e' }) },
        }),
        up('Twin Pylons', 450, 'Two pylons at once, each hitting +6.', 'crystals', {
          mods: { pylon: { countAdd: 1, damageAdd: 6 } },
        }),
        up('Crystal Portal', 1600, 'ABILITY — Crystal Portal: a portal under the lead husk throws the pack back 160px. Pylons ×1.5.', 'runes', {
          mods: { pylon: { damageMult: 1.5 } },
          active: { name: 'Crystal Portal', desc: 'Throws the pack around the lead husk 160px back.', cooldown: 25000, global: true, cast: ab(150, 0, { kind: 'splash', radius: 140, color: 0x99ddff, shape: 'ring' }, 'A portal that throws husks back.', { rider: { knockback: 160 } }) },
        }),
        up('Lattice', 3800, 'Four pylons hitting ×2; towers within 150px gain +10% range.', 'runes', {
          mods: { pylon: { countAdd: 2, damageMult: 2, fx: { ms: 30000 } } },
          traits: { aura: { radius: 150, range: 1.1, label: 'Lattice', color: 0xa8e4ff } },
        }),
        up('Crystal Cathedral', 11000, 'ABILITY — Trick of the Light: 700 to every husk on the map, leaving them brittle. Pylons ×2.', { kind: 'wings', color: 0xc8f0ff }, {
          mods: { pylon: { damageMult: 2 } },
          active: { name: 'Trick of the Light', desc: '700 to every husk on the map; brittle (+15 per hit) for 6s.', cooldown: 40000, global: true, cast: ab(700, 0, { kind: 'field', color: 0xc8f0ff }, 'Light through every facet.', { rider: { brittle: { add: 15, ms: 6000 } } }) },
        }),
      ]),
      path('Shatterpoint', 'Shards that ricochet and splinter', [
        up('Sharp Facets', 140, 'Shards hit +4 and ricochet twice.', 'spikes', {
          mods: { shard: { damageAdd: 4, fx: { bounces: 2 } } },
        }),
        up('Splinter', 380, 'Husks it kills burst into two shards (10% of their health).', 'spikes', {
          traits: { shrapnel: { count: 2, frac: 0.1 } },
        }),
        up('Fracture', 1300, 'Shards hit ×1.8 and ricochet four times.', 'orbit', {
          mods: { shard: { damageMult: 1.8, fx: { bounces: 4 } } },
        }),
        up('Crystal Shredder', 3400, 'Adds orbiting shards that grind anything close; frozen or frosted husks take ×1.5.', 'orbit', {
          add: { shredder: ab(90, 300, { kind: 'aura', radius: 110, color: 0xa8e4ff, look: 'orbit' }, 'Orbiting shards that grind anything close.', { name: 'Shredder' }) },
          traits: { shatter: 1.5 },
        }),
        up('Supernova Shard', 9500, 'Shards fire in bursts of three at ×2; kills burst into five shards.', { kind: 'star', color: 0xe8fbff }, {
          mods: { shard: { damageMult: 2, fx: { salvo: 3 } } },
          traits: { shrapnel: { count: 5, frac: 0.2 } },
        }),
      ]),
    ],
  },

  soul: {
    cost: 190, range: 180, role: 'summoner', body: { kind: 'ground' },
    blurb: 'Necromancer. The husks that die near it get back up — on your side.',
    signature: { name: 'Arise', desc: 'Some of the husks that die in its reach rise as ghosts marching back up the road.' },
    traits: { raiseDead: { chance: 0.15, hits: 2 } },
    attacks: {
      wisp: ab(15, 550, { kind: 'bolt', color: 0xccaaff, speed: 420, homing: true }, 'A seeking wisp.', { name: 'Wisp' }),
    },
    paths: [
      path('Gravecaller', 'An army of the risen', [
        up('Restless Dead', 150, 'Twice as many of the dead rise (30%).', 'bones', {
          traits: { raiseDead: { chance: 0.3, hits: 2 } },
        }),
        up('Arise!', 350, 'Calls a ghost that marches up the road striking three husks.', 'bones', {
          add: { ghost: ab(20, 4500, { kind: 'minion', hits: 3, speed: 70, ms: 10000, color: 0xccaaff, look: 'ghost' }, 'A ghost marches up the road.', { name: 'Arise!', gesture: 'e' }) },
        }),
        up('Ossuary', 1200, 'Ghosts strike six and hit ×2; 45% of the dead rise, tougher.', 'skull', {
          mods: { ghost: { countAdd: 3, damageMult: 2 } },
          traits: { raiseDead: { chance: 0.45, hits: 4 } },
        }),
        up('Grave Mistake', 3500, 'Adds a lumbering amalgam that crushes twelve husks on its way up.', 'chains', {
          add: { amalgam: ab(80, 9000, { kind: 'minion', hits: 12, speed: 50, ms: 16000, color: 0x9a7aff, look: 'ghost', size: 1.6 }, 'An amalgam of the dead.', { name: 'Grave Mistake', gesture: 'q' }) },
        }),
        up('Lord of the Dead', 10000, '80% of the dead rise to strike eight; all its hits ×2.5.', { kind: 'crown', color: 0x9a7aff }, {
          mods: { '*': { damageMult: 2.5 } },
          traits: { raiseDead: { chance: 0.8, hits: 8 } },
        }),
      ]),
      path('Spirit Walker', 'Turn the living around and send them back', [
        up('Death Whistle', 160, 'Adds a whistle that turns the pack around for 1.5s.', 'notes', {
          add: { whistle: ab(8, 8000, { kind: 'splash', radius: 110, color: 0xddccff, shape: 'ring' }, 'The pack turns and walks back.', { name: 'Death Whistle', rider: { confuse: 1500 }, gesture: 'f' }) },
        }),
        up('Haunting', 400, 'Sees hidden husks; wisps slow to 70%.', 'eye', {
          traits: { detect: true },
          mods: { wisp: { rider: { slow: { mult: 0.7, ms: 1000 } } } },
        }),
        up('Soul Lantern', 1300, 'ABILITY — Lantern: every husk on the map takes 60 and walks backward for 2.5s.', 'lantern', {
          active: { name: 'Lantern', desc: 'Every husk on the map takes 60 and turns back for 2.5s.', cooldown: 35000, global: true, cast: ab(60, 0, { kind: 'field', color: 0xccaaff }, 'The lantern calls them home.', { rider: { confuse: 2500 } }) },
        }),
        up('Crossing Over', 3200, 'Every hit has a 5% chance to send a husk back to its breach; whistle 40% faster.', 'motes', {
          mods: { '*': { rider: { banish: 0.05 } }, whistle: { cooldownMult: 0.6 } },
        }),
        up('The Long Night', 9000, 'ABILITY — Long Night: 500 to every husk, 25% sent back to the breach. Wisps ×3.', { kind: 'moon', color: 0xccaaff }, {
          mods: { wisp: { damageMult: 3 } },
          active: { name: 'Long Night', desc: '500 to every husk on the map; a quarter are sent back to the breach.', cooldown: 45000, global: true, cast: ab(500, 0, { kind: 'field', color: 0x5a3a8a }, 'Night falls on the road.', { rider: { banish: 0.25, confuse: 3000 } }) },
        }),
      ]),
      path('Soul Harvest', 'Feed on the dying: reap, turn, mend', [
        up('Siphon', 120, 'Wisps hit +6 and fly 25% faster.', 'sparks', {
          mods: { wisp: { damageAdd: 6, cooldownMult: 0.8 } },
        }),
        up('Reaping', 450, 'Every 5 deaths in reach charge it; the next cast lands ×4.', 'runes', {
          traits: { reap: { need: 5, mult: 4 } },
        }),
        up('Turn', 1500, 'Adds Turn: a husk under 40% health switches sides and marches back.', 'chains', {
          add: { turn: ab(40, 9000, { kind: 'convert', thresholdFrac: 0.4, color: 0xccaaff, look: 'convert' }, 'A wounded husk switches sides.', { name: 'Turn', gesture: 'q' }) },
        }),
        up('Soul Bank', 3000, 'Wisps ×2; each minute of fighting, spent souls mend the keep for 1 life.', 'halo', {
          mods: { wisp: { damageMult: 2 } },
          add: { mend: ab(0, 60000, { kind: 'mend', amount: 1, color: 0x88ff99 }, 'Spent souls mend the keep.', { name: 'Soul Mend' }) },
        }),
        up('Corpse Prince', 9500, 'Turns husks under 70% twice as often; wisps ×3 and eat 1.5% of current health.', { kind: 'horns', color: 0x9a7aff }, {
          mods: { turn: { cooldownMult: 0.5, fx: { thresholdFrac: 0.7 } }, wisp: { damageMult: 3, rider: { pct: 0.015 } } },
        }),
      ]),
    ],
  },

  hunt: {
    cost: 165, range: 140, role: 'attack', body: { kind: 'roam', leash: 130, speed: 200 },
    blurb: 'Prowler. Leaves its den to run the lead husk down; sees what hides.',
    signature: { name: 'Tracker', desc: 'Sees hidden husks, and its bolts Expose the prey.' },
    traits: { detect: true },
    attacks: {
      crossbow: ab(20, 750, { kind: 'bolt', look: 'dart', color: 0xcc4400, speed: 700 }, 'Crossbow bolts that Expose the prey.', { name: 'Crossbow', rider: { expose: 3000 } }),
    },
    paths: [
      path('Huntsman', 'One shot, one trophy', [
        up('Barbed Bolts', 130, 'Bolts hit +5 and make husks bleed.', 'spikes', {
          mods: { crossbow: { damageAdd: 5, rider: { bleed: 2000 } } },
        }),
        up('Steady Aim', 300, '+25% range; each bolt into the same husk +10% (up to +100%).', 'scope', {
          range: 1.25, traits: { focus: { per: 0.1, cap: 1 } },
        }),
        up('Heavy Crossbow', 1100, 'Bolts ×2.5, and charge up to ×3 while it waits for a target.', 'scope', {
          mods: { crossbow: { damageMult: 2.5, charge: { perSec: 0.5, cap: 3 } } },
        }),
        up('Trophy Hunter', 3200, 'All hits ×1.8; bosses take ×1.8; every kill +2% (up to +100%).', 'horns', {
          mods: { '*': { damageMult: 1.8 } },
          traits: { bossBane: 1.8, killRamp: { per: 0.02, cap: 1 } },
        }),
        up('Apex Predator', 9500, 'Fires bolts in bursts of three at ×2.', { kind: 'skull', color: 0xcc4400 }, {
          mods: { crossbow: { damageMult: 2, fx: { salvo: 3 } } },
        }),
      ]),
      path('Beastmaster', 'Wolves that run the road for it', [
        up('Beastling', 200, 'Sends a wolf cub up the road biting three husks.', 'bones', {
          add: { cub: ab(18, 7000, { kind: 'minion', hits: 3, speed: 160, ms: 6000, color: 0xaa7744, look: 'wolf', size: 0.8 }, 'A cub runs the road and bites.', { name: 'Beastling', gesture: 'e' }) },
        }),
        up('Pack Bond', 420, 'Cubs bite five, come 25% faster; it prowls further and quicker.', 'pennant', {
          mods: { cub: { countAdd: 2, cooldownMult: 0.75 } },
          body: { leash: 180, speed: 260 },
        }),
        up('Release the Beast', 1500, 'ABILITY — Release the Beast: a great wolf runs the road mauling fifteen husks.', 'banner', {
          active: { name: 'Release the Beast', desc: 'A great wolf runs the road, mauling fifteen.', cooldown: 25000, cast: ab(90, 0, { kind: 'minion', hits: 15, speed: 180, ms: 9000, color: 0x8a5a33, look: 'wolf', size: 1.4 }, 'The beast is loose.', { rider: { bleed: 3000 } }) },
        }),
        up('Alpha', 3600, 'Cubs ×2.5 and make husks bleed; everything 20% faster.', 'horns', {
          mods: { cub: { damageMult: 2.5, rider: { bleed: 2500 } }, '*': { cooldownMult: 0.8 } },
        }),
        up('The Wild Hunt', 10500, 'ABILITY — Wild Hunt: 450 to every husk and they bleed, then 10s at double speed. More cubs.', { kind: 'moon', color: 0xffd8a8 }, {
          mods: { cub: { countAdd: 4 } },
          active: {
            name: 'Wild Hunt', desc: '450 and a bleed to every husk on the map, then 10s at double fire rate.', cooldown: 40000, global: true,
            cast: ab(450, 0, { kind: 'field', color: 0xcc4400 }, 'The hunt rides.', { rider: { bleed: 4000 } }),
            selfBuff: { ms: 10000, fireRateMult: 2 },
          },
        }),
      ]),
      path('Trapper', 'Snares, nets and a bounty on every head', [
        up('Snare', 110, 'Lays snares on the road that hold a husk for 0.8s.', 'chains', {
          add: { snare: ab(15, 4000, { kind: 'trap', count: 2, hits: 1, ms: 10000, color: 0x8a6a44, look: 'spike' }, 'Snares that hold whatever steps in.', { name: 'Snare', rider: { stun: 800 }, gesture: 'r' }) },
        }),
        up('Net Launcher', 300, 'Bolts and snares net flyers, dragging them to the road for 2–3s.', 'sack', {
          mods: { snare: { rider: { ground: 3000, slow: { mult: 0.6, ms: 1500 } } }, crossbow: { rider: { ground: 1500 } } },
        }),
        up('Bear Traps', 1000, 'Snares hit ×4, catch two husks each and make them bleed.', 'gears', {
          mods: { snare: { damageMult: 4, pierceAdd: 1, rider: { bleed: 2500 } } },
        }),
        up('Bounty Hunter', 2400, 'Bolts mark husks to pay double; kills in reach pay +25%.', 'coins', {
          mods: { crossbow: { rider: { gild: 2 } } },
          traits: { plunder: 0.25 },
        }),
        up('Big Game Season', 8000, 'Snares explode, five at a time at ×2.5; stuck or slowed husks take ×1.6.', { kind: 'hat', color: 0x6a4a2a }, {
          mods: { snare: { countAdd: 3, damageMult: 2.5, fx: { blast: 60 } } },
          traits: { bully: 1.6 },
        }),
      ]),
    ],
  },

  sand: {
    cost: 300, range: 200, role: 'control', body: { kind: 'ground' },
    blurb: 'Gunslinger out of time. Fast six-gun fire, a clock that slows the road, a noon that stops it.',
    signature: { name: 'Quick Shot', desc: 'Six-gun fire four times a second.' },
    traits: {},
    attacks: {
      quickshot: ab(12, 250, { kind: 'bolt', look: 'dart', color: 0xffdd44, speed: 820 }, 'Six-gun fire.', { name: 'Quick Shot' }),
    },
    paths: [
      path('Gunslinger', 'The fastest gun on the road', [
        up('Fan the Hammer', 250, 'Shots hit +3 and come 15% faster.', 'hat', {
          mods: { quickshot: { damageAdd: 3, cooldownMult: 0.85 } },
        }),
        up('Deadeye', 500, '15% of shots crit for ×3.', 'scope', {
          traits: { crit: { chance: 0.15, mult: 3 } },
        }),
        up('Six-Shooter', 1800, 'Fires in bursts of two at ×1.5.', 'barrel', {
          mods: { quickshot: { damageMult: 1.5, fx: { salvo: 2 } } },
        }),
        up('High Noon Duel', 4500, 'All hits ×2 and pierce one more; 25% crit chance.', 'star', {
          mods: { '*': { damageMult: 2, pierceAdd: 1 } },
          traits: { crit: { chance: 0.25, mult: 3 } },
        }),
        up('Quickdraw Legend', 13000, 'Bursts of three at ×2.5; 30% of shots crit ×4.', { kind: 'star', color: 0xffd700 }, {
          mods: { quickshot: { damageMult: 2.5, fx: { salvo: 3 } } },
          traits: { crit: { chance: 0.3, mult: 4 } },
        }),
      ]),
      path('Clockwork', 'Slow the clock, then stop it', [
        up('Lasso', 200, 'Adds a lasso that drags a husk 80px back through time.', 'gears', {
          add: { lasso: ab(12, 3500, { kind: 'bolt', color: 0xd8b04a, speed: 600, size: 1.2 }, 'Ropes a husk and drags it back.', { name: 'Lasso', rider: { knockback: 80 }, gesture: 'e' }) },
        }),
        up('Slow Time', 450, 'Time runs slow around the tower: husks within 120px move at 65%.', 'gears', {
          add: { slowfield: ab(0, 500, { kind: 'aura', radius: 120, color: 0xffdd44, look: 'pulse' }, 'Husks nearby move at 65%.', { name: 'Slow Time', rider: { slow: { mult: 0.65, ms: 700 } } }) },
        }),
        up('Remain', 1700, 'ABILITY — Remain: every husk on the map takes 50 and stands frozen in time for 2.5s.', 'eye', {
          active: { name: 'Remain', desc: 'Stops every husk on the map for 2.5s (bosses less).', cooldown: 40000, global: true, cast: ab(50, 0, { kind: 'field', color: 0xffdd44 }, 'Time halts.', { rider: { stun: 2500 } }) },
        }),
        up('Rewind', 3800, 'Lasso drags 200px back, 40% faster; the slow deepens to 45%.', 'runes', {
          mods: { lasso: { cooldownMult: 0.6, rider: { knockback: 200 } }, slowfield: { rider: { slow: { mult: 0.45, ms: 700 } } } },
        }),
        up('Always Noon', 12000, 'ABILITY — Always Noon: 800 to every husk, stopped 3s and rewound 120px. All hits ×1.5.', { kind: 'sun', color: 0xffee88 }, {
          mods: { '*': { damageMult: 1.5 } },
          active: { name: 'Always Noon', desc: '800 to every husk on the map; stopped 3s and rewound.', cooldown: 50000, global: true, cast: ab(800, 0, { kind: 'field', color: 0xffee88 }, 'It is always noon.', { rider: { stun: 3000, knockback: 120 } }) },
        }),
      ]),
      path('Bounty', 'Time is money', [
        up('Wanted Poster', 180, 'Adds a bounty shot: the marked husk pays double if it dies soon.', 'coins', {
          add: { bounty: ab(20, 5000, { kind: 'bolt', look: 'coin', color: 0xffd700, speed: 700 }, 'Marks a husk to pay double.', { name: 'Bounty', rider: { gild: 2 }, gesture: 'f' }) },
        }),
        up('Pocket Watch', 400, 'At wave clear, pays 4% of your banked gold as interest.', 'gold-trim', {
          traits: { interest: 0.04 },
        }),
        up('Time Is Money', 1500, 'Every hit pays 1.2 gold (up to 300 a wave).', 'coins', {
          traits: { goldOnHit: { perHit: 1.2, cap: 300 } },
        }),
        up('Dead or Alive', 3500, 'Bounties pay triple, twice as often and hit ×4; interest rises to 6%.', 'sack', {
          mods: { bounty: { damageMult: 4, cooldownMult: 0.5, rider: { gild: 3 } } },
          traits: { interest: 0.06 },
        }),
        up('Gold Rush Era', 9000, 'Hits pay 3 gold (up to 1200 a wave), +10 gold a second in waves; shots ×2.', { kind: 'crown', color: 0xffd700 }, {
          mods: { quickshot: { damageMult: 2 } },
          traits: { goldOnHit: { perHit: 3, cap: 1200 }, trickle: 10 },
        }),
      ]),
    ],
  },

  gravity: {
    cost: 420, range: 280, role: 'artillery', body: { kind: 'ground' },
    blurb: 'Siege. Pulls rocks out of the sky onto the strongest husk — slow, and huge.',
    signature: { name: 'Meteor Siege', desc: 'Long-range artillery. Set a target point, or it shells the strongest husk.' },
    traits: {},
    attacks: {
      rock: ab(90, 1400, { kind: 'bolt', color: 0x8844cc, speed: 520, lob: true, splash: 45 }, 'Drops a rock out of the sky.', { name: 'Space Slash' }),
    },
    paths: [
      path('Meteorologist', 'Bigger rocks, then the moon', [
        up('Heavier Rocks', 300, 'Rocks hit +30 with 30% wider craters.', 'bricks', {
          mods: { rock: { damageAdd: 30, areaMult: 1.3 } },
        }),
        up('Meteor Rain', 600, 'Adds a meteor that lands on the target 0.9s later.', 'star', {
          add: { meteor: ab(110, 3000, { kind: 'splash', radius: 70, color: 0xaa66ff, delayMs: 900, shape: 'meteor' }, 'A meteor lands 0.9s later.', { name: 'Meteor Rain', gesture: 'e' }) },
        }),
        up('Comet Tail', 2000, 'All hits ×1.8 and set husks burning.', 'flame', {
          mods: { '*': { damageMult: 1.8, rider: { burn: 3000 } } },
        }),
        up('Extinction Event', 5000, 'Meteors ×2.5, 40% wider, twice as often.', 'skull', {
          mods: { meteor: { damageMult: 2.5, areaMult: 1.4, cooldownMult: 0.5 } },
        }),
        up('Moonfall', 14000, 'All hits ×3; bosses take ×1.5.', { kind: 'moon', color: 0xbb88ff }, {
          mods: { '*': { damageMult: 3 } },
          traits: { bossBane: 1.5 },
        }),
      ]),
      path('Event Horizon', 'Wells that drag the pack backward', [
        up('Gravity Well', 250, 'Adds a well on the road that drags husks back toward the breach.', 'orbit', {
          add: { well: ab(10, 6000, { kind: 'zone', radius: 80, ms: 2500, color: 0x6633aa, shape: 'rune', pull: 70 }, 'A well that drags husks backward.', { name: 'Gravity Well', gesture: 'r' }) },
        }),
        up('Grav Bomb', 550, 'Adds a bomb that lifts the pack helpless for 0.8s and pulls flyers down.', 'orbit', {
          add: { lift: ab(25, 7000, { kind: 'splash', radius: 100, color: 0xcc99ff, shape: 'ring' }, 'Lifts the pack off the road.', { name: 'Grav Bomb', rider: { stun: 800, ground: 3000 }, gesture: 'f' }) },
        }),
        up('Singularity', 2000, 'ABILITY — Singularity: a 160px hole on the lead husk drags everything back for 5s. Wider wells.', 'moon', {
          mods: { well: { areaMult: 1.3 } },
          active: { name: 'Singularity', desc: 'A 160px hole that drags the pack back for 5s.', cooldown: 30000, global: true, cast: ab(80, 0, { kind: 'zone', radius: 160, ms: 5000, color: 0x331155, shape: 'rune', pull: 120 }, 'A singularity.') },
        }),
        up('Crushing Weight', 4500, 'Wells hit ×5 and leave husks brittle; stuck or slowed husks take ×1.4.', 'chains', {
          mods: { well: { damageMult: 5, rider: { brittle: { add: 10, ms: 2000 } } } },
          traits: { bully: 1.4 },
        }),
        up('Black Hole', 13000, 'ABILITY — Black Hole: 220px, 7s, 400/s, dragging hard. All hits ×2.', { kind: 'star', color: 0x331155 }, {
          mods: { '*': { damageMult: 2 } },
          active: { name: 'Black Hole', desc: 'A 220px black hole: 400/s for 7s, dragging the pack back.', cooldown: 45000, global: true, cast: ab(400, 0, { kind: 'zone', radius: 220, ms: 7000, color: 0x110022, shape: 'rune', pull: 200 }, 'A black hole.') },
        }),
      ]),
      path('Orbital', 'Satellites, debris and flyers brought down', [
        up('Tidal Lock', 200, 'Every hit pulls flyers to the road for 2.5s; airborne husks take ×1.4.', 'antenna', {
          mods: { '*': { rider: { ground: 2500 } } },
          traits: { antiAir: 1.4 },
        }),
        up('Orbiting Debris', 450, 'Rocks orbit the tower, battering anything close.', 'orbit', {
          add: { debris: ab(25, 400, { kind: 'aura', radius: 90, color: 0x8844cc, look: 'orbit' }, 'Orbiting debris batters what comes close.', { name: 'Debris' }) },
        }),
        up('Satellite', 1600, 'Launches a satellite that fires from long range.', 'antenna', {
          add: { satellite: ab(40, 10000, { kind: 'sentry', ms: 30000, max: 1, attackMs: 700, range: 250, color: 0xddbbff, look: 'drone' }, 'A satellite that fires from orbit.', { name: 'Satellite' }) },
        }),
        up('Gravitic Lens', 4000, '+35% range, two satellites ×2; towers within 160px gain +15% range.', 'scope', {
          range: 1.35,
          mods: { satellite: { countAdd: 1, damageMult: 2 } },
          traits: { aura: { radius: 160, range: 1.15, label: 'Gravitic Lens', color: 0xbb88ff } },
        }),
        up('Dyson Ring', 12000, 'Debris ×6 and 50% wider, satellites ×2, rocks fall in pairs.', { kind: 'sun', color: 0xddbbff }, {
          mods: { debris: { damageMult: 6, areaMult: 1.5 }, satellite: { damageMult: 2 }, rock: { fx: { salvo: 2 } } },
        }),
      ]),
    ],
  },

  creation: {
    cost: 280, range: 180, role: 'summoner', body: { kind: 'ground' },
    blurb: 'Engineer. Builds turrets around itself and walls across the road.',
    signature: { name: 'Workshop', desc: 'Throws daggers in a fan of three.' },
    traits: {},
    attacks: {
      spray: ab(6, 400, { kind: 'bolt', look: 'dart', color: 0xcc6622, speed: 620, count: 3, spread: 0.4 }, 'Dagger Spray: a fan of three.', { name: 'Dagger Spray' }),
    },
    paths: [
      path('Workshop', 'Turrets, then a factory of them', [
        up('Wrench', 220, 'Builds a turret beside it.', 'gears', {
          add: { turret: ab(10, 7000, { kind: 'sentry', ms: 18000, max: 1, attackMs: 500, range: 160, color: 0xcc6622, look: 'turret' }, 'A turret that fires for 18s.', { name: 'Turret', gesture: 'r' }) },
        }),
        up('Second Turret', 480, 'Two turrets, each hitting +4.', 'gears', {
          mods: { turret: { countAdd: 1, damageAdd: 4 } },
        }),
        up('Gatling Turrets', 1800, 'Turrets fire twice as fast at ×1.8.', 'barrel', {
          mods: { turret: { damageMult: 1.8, fx: { attackMs: 250 } } },
        }),
        up('Factory Line', 4800, 'Four turrets at ×1.5 that last 40s.', 'bricks', {
          mods: { turret: { countAdd: 2, damageMult: 1.5, fx: { ms: 40000 } } },
        }),
        up('Architect', 14000, 'All hits ×2.5, turrets fire faster still; towers built near it cost 15% less.', { kind: 'hat', color: 0xcc6622 }, {
          mods: { '*': { damageMult: 2.5 }, turret: { fx: { attackMs: 180 } } },
          traits: { discount: { radius: 180, mult: 0.85 } },
        }),
      ]),
      path('Masonry', 'Walls across the road, and a big red button', [
        up('Create Wall', 180, 'Walls the road off; husks must chew through.', 'bricks', {
          add: { wall: ab(10, 8000, { kind: 'barrier', ms: 7000, hp: 120, color: 0xcc8844, label: '🧱' }, 'A wall across the road.', { name: 'Create', gesture: 'f' }) },
        }),
        up('Reinforced', 420, 'Walls twice as tough, biting back harder; soaks 1 life of breaches a wave.', 'shield', {
          mods: { wall: { damageAdd: 15, fx: { hp: 250 } } },
          traits: { keepWard: 1 },
        }),
        up('Self-Destruct', 1500, 'ABILITY — Self-Destruct: the workshop blows for 600 in 170px — and rebuilds at once.', 'skull', {
          active: { name: 'Self-Destruct', desc: 'Blows up for 600 around itself, then rebuilds.', cooldown: 25000, cast: ab(600, 0, { kind: 'nova', radius: 170, color: 0xffaa33 }, 'Boom.') },
        }),
        up('Bastion', 3600, 'Walls of 600 that bite for 60, 40% more often; soaks 3 lives a wave.', 'shield', {
          mods: { wall: { damageMult: 2.4, cooldownMult: 0.6, fx: { hp: 600 } } },
          traits: { keepWard: 3 },
        }),
        up('Grand Design', 11000, 'ABILITY — Grand Design: 900 and a stun to every husk, then 8s at double power. All ×2.', { kind: 'crown', color: 0xffaa33 }, {
          mods: { '*': { damageMult: 2 } },
          active: {
            name: 'Grand Design', desc: '900 and a 1.5s stun to every husk, then 8s at ×2 speed and damage.', cooldown: 40000, global: true,
            cast: ab(900, 0, { kind: 'field', color: 0xffaa33 }, 'The design comes together.', { rider: { stun: 1500 } }),
            selfBuff: { ms: 8000, fireRateMult: 2, damageMult: 2 },
          },
        }),
      ]),
      path('Artificer', 'Charged bolts, and blueprints that cut costs', [
        up('Charged Bolt', 200, 'Adds a charged bolt that punches through three husks.', 'sparks', {
          add: { bolt: ab(30, 2500, { kind: 'bolt', look: 'bolt', color: 0xffaa55, speed: 760, pierce: 3 }, 'A bolt through three husks.', { name: 'Charged Bolt', dtype: 'energy', gesture: 'e' }) },
        }),
        up('Blueprints', 400, 'Towers built or upgraded within 170px cost 10% less.', 'book', {
          traits: { discount: { radius: 170, mult: 0.9 } },
        }),
        up('Capacitor', 1400, 'Bolts ×2, pierce six, and charge up to ×3 while waiting.', 'antenna', {
          mods: { bolt: { damageMult: 2, pierceAdd: 3, charge: { perSec: 0.4, cap: 3 } } },
        }),
        up('Patent Office', 3000, 'The discount grows to 20%, and patents pay 120 gold a wave.', 'book', {
          traits: { discount: { radius: 170, mult: 0.8 }, income: 120 },
        }),
        up('Mortar Command', 9500, 'Adds a mortar team that shells the road; bolts ×3.', { kind: 'banner', color: 0xcc6622 }, {
          mods: { bolt: { damageMult: 3 } },
          add: { mortar: ab(300, 2000, { kind: 'bolt', color: 0x553322, speed: 500, lob: true, splash: 80 }, 'A mortar shell on the road.', { name: 'Mortar Command', gesture: 'q' }) },
        }),
      ]),
    ],
  },

  electricity: {
    cost: 150, range: 170, role: 'attack', body: { kind: 'ground' },
    blurb: 'Chain lightning. Best where the road is soaked, cruel to anything metal.',
    signature: { name: 'Conductor', desc: 'Arcs leap husk to husk. Metal, Magnet, Water and Tech husks take ×1.5.' },
    traits: { bane: { elements: ['metal', 'magnet', 'water', 'technology'], mult: 1.5 } },
    attacks: {
      arc: ab(16, 650, { kind: 'chain', jumps: 2, jumpRange: 90, color: 0xffee00 }, 'An arc that jumps to two more.', { name: 'Electro Ball' }),
    },
    paths: [
      path('Storm Conductor', 'Arcs that leap through the whole pack', [
        up('Forked Arc', 130, 'Arcs hit +3 and jump to two more husks.', 'sparks', {
          mods: { arc: { damageAdd: 3, countAdd: 2 } },
        }),
        up('Overcharge', 300, 'Arcs 35% faster.', 'sparks', {
          mods: { arc: { cooldownMult: 0.65 } },
        }),
        up('Arc Storm', 1100, 'Arcs ×2, four more jumps, 30% further between husks.', 'antenna', {
          mods: { arc: { damageMult: 2, countAdd: 4, areaMult: 1.3 } },
        }),
        up('Tesla Coil', 3000, 'Arcs ×2.5 and have a 30% chance to stun for 0.2s.', 'antenna', {
          mods: { arc: { damageMult: 2.5, rider: { stun: 200, chance: 0.3 } } },
        }),
        up('Thunderhead', 10000, 'Arcs ×3.5, six more jumps, barely losing strength.', { kind: 'star', color: 0xffee00 }, {
          mods: { arc: { damageMult: 3.5, countAdd: 6, fx: { falloff: 0.95 } } },
        }),
      ]),
      path('Battery', 'Power the towers around it', [
        up('Static Field', 160, 'A crackling field around the tower shocks and slows husks.', 'motes', {
          add: { static: ab(10, 500, { kind: 'aura', radius: 90, color: 0xffee44, look: 'pulse' }, 'A field that shocks and slows.', { name: 'Static Field', rider: { slow: { mult: 0.85, ms: 600 } } }) },
        }),
        up('Power Line', 400, 'Every 12s, overclocks the strongest tower nearby: +40% fire rate for 5s.', 'barrel', {
          add: { link: ab(0, 12000, { kind: 'overclock', ms: 5000, fireRateMult: 1.4, damageMult: 1.2, color: 0xffee00 }, 'Overclocks the best tower nearby.', { name: 'Power Line', gesture: 'f' }) },
        }),
        up('Pain Battery', 1300, 'ABILITY — Pain Battery: discharges 200 in 160px with a stun, then 6s at 2.5× fire.', 'barrel', {
          active: {
            name: 'Pain Battery', desc: '200 and a 1s stun in 160px, then 6s at 2.5× fire rate.', cooldown: 30000,
            cast: ab(200, 0, { kind: 'nova', radius: 160, color: 0xffee44 }, 'Discharge.', { rider: { stun: 1000 } }),
            selfBuff: { ms: 6000, fireRateMult: 2.5, damageMult: 1.5 },
          },
        }),
        up('Grid', 3200, 'Power Line overclocks harder (+70%) and more often; the field hits ×4.', 'gears', {
          mods: { link: { cooldownMult: 0.6, fx: { fireRateMult: 1.7 } }, static: { damageMult: 4 } },
        }),
        up('Restart', 10000, 'ABILITY — Restart: 700 and a 2s stun to every husk, then 8s at triple fire. All ×2.', { kind: 'sun', color: 0xffffaa }, {
          mods: { '*': { damageMult: 2 } },
          active: {
            name: 'Restart', desc: '700 and a 2s stun to every husk on the map, then 8s at 3× fire rate.', cooldown: 45000, global: true,
            cast: ab(700, 0, { kind: 'field', color: 0xffffaa }, 'The grid restarts.', { rider: { stun: 2000 } }),
            selfBuff: { ms: 8000, fireRateMult: 3 },
          },
        }),
      ]),
      path('Rail Line', 'Straight lines of pure energy', [
        up('Electro Dash', 180, 'Adds a bolt down the road that stuns what it hits.', 'pennant', {
          add: { dash: ab(30, 3000, { kind: 'line', length: 200, width: 30, color: 0xffff66 }, 'A bolt down the road that stuns.', { name: 'Electro Dash', rider: { stun: 400 }, gesture: 'e' }) },
        }),
        up('Conductive', 450, 'Every hit soaks husks: electric hits on them land ×1.5.', 'bubbles', {
          mods: { '*': { rider: { soak: 2500 } } },
        }),
        up('Railgun', 1500, 'Adds a railgun slug through ten husks that charges up to ×2.', 'scope', {
          add: { rail: ab(220, 3000, { kind: 'bolt', look: 'bolt', color: 0xffffaa, speed: 1200, pierce: 10 }, 'A slug through ten husks.', { name: 'Railgun', dtype: 'energy', charge: { perSec: 0.3, cap: 2 }, gesture: 'q' }) },
        }),
        up('Magnetic Rails', 3800, 'Railgun ×2.5 and 30% faster, dash ×3, +20% range.', 'scope', {
          mods: { rail: { damageMult: 2.5, cooldownMult: 0.7 }, dash: { damageMult: 3 } },
          range: 1.2,
        }),
        up('Ion Cannon', 11000, 'Railgun ×3, twice the size, eats 3% of current health; bosses ×1.5.', { kind: 'halo', color: 0xffffaa }, {
          mods: { rail: { damageMult: 3, fx: { size: 2 }, rider: { pct: 0.03 } } },
          traits: { bossBane: 1.5 },
        }),
      ]),
    ],
  },
};
