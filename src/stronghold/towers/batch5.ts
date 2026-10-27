import type { TowerDef } from '../StrongholdTypes';
import { ab, path, up } from './helpers';

/** Magma, Illusion, Depths, Ruin, Sand (`dune`), Conquest, Devotion (`passion`), Paper. */
export const BATCH5_TOWERS: Record<string, TowerDef> = {
  magma: {
    cost: 400, range: 200, role: 'attack', body: { kind: 'water' },
    blurb: 'Naval. A pirate ship firing broadsides out of both rails.',
    signature: { name: 'Broadside', desc: 'Builds only in water. Its cannons fire out of both sides of the hull at once.' },
    traits: {},
    attacks: {
      cannon: ab(28, 900, { kind: 'bolt', look: 'shell', color: 0xff5a1e, speed: 500, count: 2, spread: 0.2, splash: 35, broadside: true }, 'Cannonballs out of both rails.', { name: 'Broadside' }),
    },
    paths: [
      path('Gun Decks', 'More guns, hotter shot, and chain', [
        up('Third Deck', 250, 'A third gun deck: three cannonballs a rail.', 'barrel', {
          mods: { cannon: { countAdd: 1 } },
        }),
        up('Hot Shot', 480, 'Heated shot: +6 damage and the hits burn.', 'flame', {
          mods: { cannon: { damageAdd: 6, rider: { burn: 2500 } } },
        }),
        up('Grapeshot', 1400, 'Cannons fire twice per volley, and a blunderbuss sprays grapeshot.', 'gears', {
          mods: { cannon: { fx: { salvo: 2 } } },
          add: { grape: ab(10, 2000, { kind: 'bolt', look: 'shell', color: 0xffaa55, speed: 560, count: 6, spread: 0.7, size: 0.7 }, 'A blunderbuss of grapeshot.', { name: 'Blunder-Boil', gesture: 'f' }) },
        }),
        up('Chain Shot', 3600, 'Kills burst into three shrapnel shards; all guns hit ×1.6.', 'chains', {
          traits: { shrapnel: { count: 3, frac: 0.1 } },
          mods: { '*': { damageMult: 1.6 } },
        }),
        up('Ship of the Line', 11000, 'A first-rate warship: every gun hits ×2.8 and bosses take ×1.4.', { kind: 'pennant', color: 0x15151a }, {
          mods: { '*': { damageMult: 2.8 } },
          traits: { bossBane: 1.4 },
          range: 1.1,
        }),
      ]),
      path('Volcano', 'Lava bombs, pools, and an eruption', [
        up('Lava Bomb', 300, 'Lobs a lava bomb onto the road every 3.5s.', 'sparks', {
          add: { volcano: ab(50, 3500, { kind: 'splash', radius: 70, color: 0xff7a22, delayMs: 900, shape: 'meteor' }, 'A lava bomb arcs onto the road.', { name: 'Volcano', rider: { burn: 2000 }, gesture: 'e' }) },
        }),
        up('Magma Pool', 600, 'Leaves pools of lava on the road that burn whatever wades in.', { kind: 'moat', color: 0xff5a1e }, {
          add: { pool: ab(20, 5000, { kind: 'zone', radius: 70, ms: 4000, color: 0xff5a1e, shape: 'lava' }, 'A pool of lava on the road.', { name: 'Magma Bloat', rider: { burn: 1500 }, gesture: 'r' }) },
        }),
        up('Eruption', 1900, 'ABILITY — Eruption: a 600-damage meteor on the lead husk. Lava bombs ×1.5.', 'flame', {
          mods: { volcano: { damageMult: 1.5 } },
          active: { name: 'Eruption', desc: 'A huge meteor of magma on the lead husk.', cooldown: 35000, cast: ab(600, 0, { kind: 'splash', radius: 160, color: 0xff7a22, delayMs: 1200, shape: 'meteor' }, 'A huge magma meteor.', { rider: { burn: 4000 } }) },
        }),
        up('Caldera', 4200, 'Bombs ×2 and wider; pools ×2.5 and leave husks brittle.', { kind: 'crystals', color: 0xff5a1e }, {
          mods: { volcano: { damageMult: 2, areaMult: 1.3 }, pool: { damageMult: 2.5, areaMult: 1.2, rider: { brittle: { add: 6, ms: 3000 } } } },
        }),
        up('Krakatoa', 12500, 'ABILITY — Krakatoa: every husk on the map takes 1200, burns and is grounded. All fire ×2.', { kind: 'horns', color: 0xff3300 }, {
          mods: { '*': { damageMult: 2 } },
          active: { name: 'Krakatoa', desc: 'Every husk on the map takes 1200, burns, and falls from the sky.', cooldown: 50000, global: true, cast: ab(1200, 0, { kind: 'field', color: 0xff5a1e }, 'The whole map erupts.', { rider: { burn: 5000, ground: 4000 } }) },
        }),
      ]),
      path('Cursed Crew', 'Plunder, boarders and ghost pirates', [
        up('Plunder Rights', 200, 'Kills in range pay 25% more gold.', 'coins', {
          traits: { plunder: 0.25 },
        }),
        up('Boarding Party', 550, 'The cursed crew boards the road and cuts through six husks.', { kind: 'banner', color: 0x15151a }, {
          add: { mutiny: ab(30, 9000, { kind: 'minion', hits: 6, speed: 110, ms: 10000, color: 0xff7a22, look: 'ghost', size: 1.2 }, 'The cursed crew marches up the road.', { name: 'Molten Mutiny', rider: { burn: 3000 }, gesture: 'q' }) },
        }),
        up('Treasure Hold', 1500, 'Every hit pays 0.5 gold (60 a wave); boarders cut four more.', 'sack', {
          traits: { goldOnHit: { perHit: 0.5, cap: 60 } },
          mods: { mutiny: { countAdd: 4 } },
        }),
        up('Ghost Crew', 3800, 'Boarders ×2.5 and come 40% sooner; 20% of the dead join the crew.', 'bones', {
          mods: { mutiny: { damageMult: 2.5, cooldownMult: 0.6 } },
          traits: { raiseDead: { chance: 0.2, hits: 4 } },
        }),
        up('Pirate King', 10000, 'Plunder 60%, boarders ×3, cannons ×1.5.', { kind: 'hat', color: 0x15151a }, {
          traits: { plunder: 0.6 },
          mods: { mutiny: { damageMult: 3 }, cannon: { damageMult: 1.5 } },
        }),
      ]),
    ],
  },

  illusion: {
    cost: 145, range: 190, role: 'support', body: { kind: 'ground' },
    blurb: 'Phantom. Copies its neighbour\'s attack and leads the pack astray.',
    signature: { name: 'Mimic', desc: 'Its main attack casts the nearest other tower\'s main attack instead of its own.' },
    traits: { mimic: true },
    attacks: {
      trick: ab(14, 600, { kind: 'bolt', color: 0xb45cff, speed: 620 }, 'Crack Shot — or whatever the nearest tower fires.', { name: 'Crack Shot' }),
    },
    paths: [
      path('Mirror Image', 'Phantom copies that fight beside it', [
        up('Better Forgery', 120, 'Its copied shots hit ×1.4.', 'cards', {
          mods: { trick: { damageMult: 1.4 } },
        }),
        up('Phantom Twin', 300, 'A phantom copy stands beside it and shoots.', 'cape', {
          add: { guise: ab(12, 10000, { kind: 'sentry', ms: 12000, max: 1, attackMs: 600, range: 170, color: 0xb45cff, look: 'idol' }, 'A phantom copy fights beside it.', { name: 'Guise', gesture: 'f' }) },
        }),
        up('Hall of Mirrors', 1000, 'Three phantom copies at once, and every shot fires twice.', 'crystals', {
          mods: { guise: { countAdd: 2 }, trick: { fx: { salvo: 2 } } },
        }),
        up('Doppelganger', 2800, 'All its attacks ×2, and 20% of hits crit for ×2.5.', 'star', {
          mods: { '*': { damageMult: 2 } },
          traits: { crit: { chance: 0.2, mult: 2.5 } },
        }),
        up('Grand Delusion', 8500, 'Five copies, and every attack hits ×3.', 'moon', {
          mods: { '*': { damageMult: 3 }, guise: { countAdd: 2 } },
        }),
      ]),
      path('Veil', 'Turn the pack around and send it home', [
        up('Lost Way', 150, 'A veil every 6s: the pack is confused and walks back for 2s.', 'motes', {
          add: { veil: ab(4, 6000, { kind: 'splash', radius: 80, color: 0xd8a8ff }, 'The pack loses its way and turns back.', { name: 'Illusion Veil', rider: { confuse: 2000 }, gesture: 'e' }) },
        }),
        up('Relocate', 380, 'Blinks a husk 120px back up the road; 8% are sent to the breach.', 'runes', {
          add: { relocate: ab(8, 4500, { kind: 'bolt', color: 0xb45cff, speed: 700 }, 'Blinks a husk back up the road.', { name: 'Relocate', rider: { knockback: 120, banish: 0.08 }, gesture: 'r' }) },
        }),
        up('Masquerade', 1200, 'ABILITY — Masquerade: towers within 200px fire 40% faster, hit 20% harder for 8s. Veil 3s.', { kind: 'halo', color: 0xb45cff }, {
          mods: { veil: { rider: { confuse: 3000 } } },
          active: { name: 'Masquerade', desc: 'Every tower within 200px fires 40% faster and hits 20% harder for 8s.', cooldown: 40000, cast: ab(0, 0, { kind: 'rally', radius: 200, ms: 8000, fireRateMult: 1.4, damageMult: 1.2, color: 0xb45cff }, 'Nearby towers wear masks.') },
        }),
        up('Wandering Pack', 2600, 'Veils are 1.5× wider and 40% more often; relocates banish 15%.', 'bubbles', {
          mods: { veil: { areaMult: 1.5, cooldownMult: 0.6 }, relocate: { rider: { banish: 0.15 } } },
        }),
        up('Mass Delusion', 9000, 'ABILITY — Mass Delusion: every husk on the map takes 200, turns back 4s; 10% are banished.', 'eye', {
          active: { name: 'Mass Delusion', desc: 'Every husk on the map takes 200 and turns back for 4s; 10% are banished.', cooldown: 45000, global: true, cast: ab(200, 0, { kind: 'field', color: 0xb45cff }, 'The whole road forgets where it was going.', { rider: { confuse: 4000, banish: 0.1 } }) },
        }),
      ]),
      path('Smoke & Mirrors', 'See through tricks and shatter what it finds', [
        up('True Sight', 100, 'Sees hidden husks.', 'lantern', {
          traits: { detect: true },
        }),
        up('Unmasking', 280, 'Its shots strip hidden husks\' camouflage for good.', 'scope', {
          mods: { trick: { rider: { unmask: true } } },
        }),
        up('Shattered Glass', 900, 'Shots pierce two husks and leave them brittle (+5 per hit taken).', 'spikes', {
          mods: { trick: { pierceAdd: 2, rider: { brittle: { add: 5, ms: 3000 } } } },
        }),
        up('Mirror Maze', 2400, 'Shards of mirror circle the tower, cutting husks near it.', 'orbit', {
          add: { maze: ab(40, 400, { kind: 'aura', radius: 110, color: 0xd8a8ff, look: 'orbit' }, 'Mirror shards cut anything close.', { name: 'Mirror Maze', rider: { brittle: { add: 4, ms: 2000 } } }) },
        }),
        up('Kaleidoscope', 7500, 'Shots ×2.5, the maze ×3, and hidden husks take ×2.', 'sun', {
          mods: { trick: { damageMult: 2.5 }, maze: { damageMult: 3, areaMult: 1.2 } },
          traits: { vsHidden: 2 },
        }),
      ]),
    ],
  },

  depths: {
    cost: 310, range: 210, role: 'attack', body: { kind: 'water' },
    blurb: 'Naval. A submarine of the deep that feeds on every kill.',
    signature: { name: 'Feeding Frenzy', desc: 'Builds only in water. +4% damage for every kill, up to +60%.' },
    traits: { killRamp: { per: 0.04, cap: 0.6 } },
    attacks: {
      piranha: ab(12, 500, { kind: 'bolt', look: 'dart', color: 0x0e8f9c, speed: 600, count: 2, spread: 0.3 }, 'A pair of biters that bleed.', { name: 'Piranha', rider: { bleed: 1500 } }),
    },
    paths: [
      path('School', 'More teeth, and a frenzy that never stops', [
        up('More Piranha', 240, 'Three biters a volley.', 'bubbles', {
          mods: { piranha: { countAdd: 1 } },
        }),
        up('Frenzy', 520, 'Bites 25% faster; each bite on the same husk adds +8%, up to +80%.', 'spikes', {
          mods: { piranha: { cooldownMult: 0.8 } },
          traits: { focus: { per: 0.08, cap: 0.8 } },
        }),
        up('Barracuda', 1600, 'Bigger teeth: +10 damage and each biter passes through one husk.', 'bones', {
          mods: { piranha: { damageAdd: 10, pierceAdd: 1 } },
        }),
        up('Blood in Water', 4000, 'Bleeds last 4s, everything hits ×1.8, and kills feed up to +100%.', 'skull', {
          mods: { '*': { damageMult: 1.8, rider: { bleed: 4000 } } },
          traits: { killRamp: { per: 0.05, cap: 1 } },
        }),
        up('Megalodon', 12000, 'A megalodon tears up the road every 6s; all bites ×2.', { kind: 'horns', color: 0x0e6f7c }, {
          mods: { '*': { damageMult: 2 } },
          add: { shark: ab(150, 6000, { kind: 'minion', hits: 15, speed: 170, ms: 8000, color: 0x0e6f7c, look: 'shark', size: 1.8 }, 'A shark tears up the road.', { name: 'Megalodon', rider: { bleed: 3000 }, gesture: 'q' }) },
        }),
      ]),
      path('Kraken', 'Tentacles that drag the pack back down', [
        up('Lungfish', 260, 'A lunge down the road every 3s that shoves husks back.', { kind: 'roots', color: 0x22bbcc }, {
          add: { lunge: ab(40, 3000, { kind: 'line', length: 200, width: 40, color: 0x22bbcc }, 'A lunge down the road.', { name: 'Lungfish Strike', rider: { knockback: 30 }, gesture: 'e' }) },
        }),
        up('Algae Bloom', 500, 'Algae blooms on the road that slow what wades through.', 'leaves', {
          add: { bloom: ab(10, 6000, { kind: 'zone', radius: 90, ms: 5000, color: 0x2a8a5a, shape: 'puddle' }, 'An algae bloom that slows.', { name: 'Eutrophication', rider: { slow: { mult: 0.65, ms: 600 } }, gesture: 'r' }) },
        }),
        up('Release the Kraken', 1700, 'ABILITY — Kraken: tentacles grip the road for 6s, dragging husks back.', 'eye', {
          active: { name: 'Kraken', desc: 'Tentacles drag the pack backward for 6s.', cooldown: 30000, cast: ab(60, 0, { kind: 'zone', radius: 140, ms: 6000, color: 0x0e8f9c, shape: 'puddle', pull: 80 }, 'Tentacles that drag.') },
        }),
        up('Undertow', 3800, 'Blooms pull husks back and spread 30%; lunges ×2.', 'chains', {
          mods: { bloom: { fx: { pull: 40 }, areaMult: 1.3 }, lunge: { damageMult: 2 } },
        }),
        up('Leviathan', 11500, 'ABILITY — Leviathan: an 8s maelstrom drags hard, hits 300/s and drags flyers down. All ×1.8.', { kind: 'crown', color: 0x0e8f9c }, {
          mods: { '*': { damageMult: 1.8 } },
          active: { name: 'Leviathan', desc: 'A huge maelstrom: 300/s, drags the pack back and pulls flyers under.', cooldown: 45000, cast: ab(300, 0, { kind: 'zone', radius: 200, ms: 8000, color: 0x0e6f7c, shape: 'storm', pull: 120 }, 'The leviathan rises.', { rider: { ground: 3000 } }) },
        }),
      ]),
      path('Abyss', 'Sonar, lures and the crushing deep', [
        up('Sonar', 200, 'Sees hidden and diving husks\' wakes — detects hidden.', 'antenna', {
          traits: { detect: true },
        }),
        up('Angler', 450, 'A lure reels in and eats any non-boss husk under 20% health.', 'lantern', {
          add: { angler: ab(30, 5000, { kind: 'execute', thresholdFrac: 0.2, color: 0xffee88 }, 'The lure reels in a weak husk.', { name: 'Angler', gesture: 'f' }) },
        }),
        up('Crushing Depth', 1300, 'Bites crush 1% of current health; the lure takes under 30%.', 'shield', {
          mods: { piranha: { rider: { pct: 0.01 } }, angler: { fx: { thresholdFrac: 0.3 } } },
        }),
        up('Hadal Dark', 3500, 'Everything ×1.6, hidden husks take ×1.5, the lure strikes twice as often.', 'moon', {
          mods: { '*': { damageMult: 1.6 }, angler: { cooldownMult: 0.5 } },
          traits: { vsHidden: 1.5 },
        }),
        up('Trench Maw', 10000, 'The lure eats under 40% and bites for ×10; bites crush 2%; bosses take ×1.5.', { kind: 'skull', color: 0x0e8f9c }, {
          mods: { angler: { fx: { thresholdFrac: 0.4 }, damageMult: 10, cooldownMult: 0.6 }, piranha: { rider: { pct: 0.02 } } },
          traits: { bossBane: 1.5 },
        }),
      ]),
    ],
  },

  ruin: {
    cost: 170, range: 180, role: 'control', body: { kind: 'ground' },
    blurb: 'Disabler. Stacks ruin on husks until they collapse.',
    signature: { name: 'Collapse', desc: 'Its hits add Ruin; the fifth stack collapses for 12% of max health.' },
    traits: {},
    attacks: {
      shred: ab(14, 600, { kind: 'bolt', color: 0xc4392c, speed: 560 }, 'Shred Slice: adds a Ruin stack.', { name: 'Shred Slice', rider: { ruin: 1 } }),
    },
    paths: [
      path('Rust', 'Corrode the armour, skewer the column', [
        up('Corrode', 110, 'Hits corrode for 2s: armour and shells stop counting.', 'gears', {
          mods: { shred: { rider: { corrode: 2000 } } },
        }),
        up('Rusty Skewer', 300, 'A rusty skewer through five husks: two Ruin stacks and corrosion.', 'spikes', {
          add: { skewer: ab(22, 3500, { kind: 'bolt', look: 'needle', color: 0x8a6a5a, speed: 720, pierce: 4 }, 'Two Ruin stacks and corrosion through five.', { name: 'Rusty Skewer', rider: { ruin: 2, corrode: 3000 }, gesture: 'r' }) },
        }),
        up('Oxidize', 950, 'Skewers pierce 4 more and come 40% faster; slices ×1.5 and leave husks brittle.', 'spikes', {
          mods: { skewer: { pierceAdd: 4, cooldownMult: 0.6, rider: { brittle: { add: 4, ms: 3000 } } }, shred: { damageMult: 1.5 } },
        }),
        up('Iron Rot', 2600, 'Every attack hits ×2.2.', 'chains', {
          mods: { '*': { damageMult: 2.2 } },
        }),
        up('Wasteland', 8000, 'Everything ×3.5; slices fire in pairs and add two Ruin stacks each.', { kind: 'skull', color: 0xc4392c }, {
          mods: { '*': { damageMult: 3.5 }, shred: { fx: { salvo: 2 }, rider: { ruin: 2 } } },
        }),
      ]),
      path('Lockdown', 'Seize the pack in place', [
        up('Lockdown', 200, 'Every 4.5s, locks the husks around its target in place for 0.9s.', 'runes', {
          add: { lock: ab(10, 4500, { kind: 'splash', radius: 70, color: 0xaa3322 }, 'Locks the pack in place.', { name: 'Lockdown', rider: { stun: 900, ruin: 1 }, gesture: 'e' }) },
        }),
        up('Seized Joints', 420, 'Lockdowns 30% wider and 20% sooner; stopped or slowed husks take ×1.25.', 'bricks', {
          mods: { lock: { areaMult: 1.3, cooldownMult: 0.8 } },
          traits: { bully: 1.25 },
        }),
        up('Collapse', 1500, 'ABILITY — Collapse: every husk on the map takes 3 Ruin stacks and freezes up for 1s.', 'crystals', {
          active: { name: 'Collapse', desc: 'Every husk on the map takes 50, 3 Ruin stacks, and a 1s stun.', cooldown: 30000, global: true, cast: ab(50, 0, { kind: 'field', color: 0xc4392c }, 'Ruin falls on the whole road.', { rider: { ruin: 3, stun: 1000 } }) },
        }),
        up('Entropy', 3400, 'Stopped or slowed husks take ×1.6; lockdowns ×3.', 'bricks', {
          traits: { bully: 1.6 },
          mods: { lock: { damageMult: 3 } },
        }),
        up('Total Ruin', 10000, 'ABILITY — Total Ruin: every husk takes 400, collapses at once, and is stunned 2s. All ×2.', 'horns', {
          mods: { '*': { damageMult: 2 } },
          active: { name: 'Total Ruin', desc: 'Every husk on the map takes 400, collapses, and is stunned 2s.', cooldown: 40000, global: true, cast: ab(400, 0, { kind: 'field', color: 0xc4392c }, 'Everything falls apart.', { rider: { ruin: 5, stun: 2000 } }) },
        }),
      ]),
      path('Decay', 'Rot the road itself', [
        up('Spikes of Ruin', 150, 'Scatters spikes on the road that add Ruin.', 'roots', {
          add: { spikes: ab(12, 5000, { kind: 'trap', count: 3, hits: 2, ms: 13000, color: 0xc4392c, look: 'spike' }, 'Spikes that add Ruin.', { name: 'Spikes of Ruin', rider: { ruin: 1 }, gesture: 'f' }) },
        }),
        up('Mould', 380, 'Patches of mould rot husks walking through, sometimes adding Ruin.', { kind: 'leaves', color: 0x7a2a1a }, {
          add: { decay: ab(8, 7000, { kind: 'zone', radius: 100, ms: 5000, color: 0x7a2a1a, shape: 'mold' }, 'The road rots and Ruin piles up.', { name: 'Unstoppable Decay', rider: { ruin: 1, chance: 0.3 }, gesture: 'q' }) },
        }),
        up('Rot Spread', 1100, 'Mould poisons and infects: poison jumps to neighbours on death.', { kind: 'motes', color: 0x88bb22 }, {
          mods: { decay: { rider: { toxic: { ms: 4000, dps: 10 }, infect: 4000 } } },
        }),
        up('Blight', 3000, 'Mould ×3 and 40% wider; three more spikes, ×2.', 'bones', {
          mods: { decay: { damageMult: 3, areaMult: 1.4 }, spikes: { countAdd: 3, damageMult: 2 } },
        }),
        up('Unstoppable Decay', 9000, 'Mould ×4 and drags husks back as they rot; spikes ×3.', { kind: 'moon', color: 0x7a2a1a }, {
          mods: { decay: { damageMult: 4, areaMult: 1.2, fx: { pull: 30 } }, spikes: { damageMult: 3 } },
        }),
      ]),
    ],
  },

  dune: {
    cost: 105, range: 190, role: 'control', body: { kind: 'ground' },
    blurb: 'Terraformer. Turns the road to quicksand that drags the pack back.',
    signature: { name: 'Quicksand', desc: 'Its grit slows, and its sand drags husks backward along the road.' },
    traits: {},
    attacks: {
      grit: ab(10, 600, { kind: 'bolt', color: 0xe8c87a, speed: 560 }, 'A blast of grit that slows.', { name: 'Sand Striker', rider: { slow: { mult: 0.85, ms: 1000 } } }),
    },
    paths: [
      path('Quicksand', 'Pull the pack under, over and over', [
        up('Sinkhole', 90, 'Opens a quicksand pit on the road that drags husks back.', { kind: 'moat', color: 0xe8c87a }, {
          add: { pit: ab(6, 6000, { kind: 'zone', radius: 80, ms: 5000, color: 0xe8c87a, shape: 'sand', pull: 40 }, 'Quicksand that drags.', { name: 'Cursed Pyramid', rider: { slow: { mult: 0.6, ms: 600 } }, gesture: 'r' }) },
        }),
        up('Deeper Pit', 220, 'Pits 30% wider and pull harder.', { kind: 'moat', color: 0xe8c87a }, {
          mods: { pit: { areaMult: 1.3, fx: { pull: 60 } } },
        }),
        up('Sand Trap', 750, 'Pits open 40% more often and drag flyers down into them.', { kind: 'crystals', color: 0xd8b86a }, {
          mods: { pit: { cooldownMult: 0.6, rider: { ground: 2000 } } },
        }),
        up('Sinking Sands', 2000, 'Pits pull hard and hit ×4; slowed husks take ×1.4 from it.', 'runes', {
          mods: { pit: { fx: { pull: 90 }, damageMult: 4 } },
          traits: { bully: 1.4 },
        }),
        up('Sea of Dunes', 6500, 'Pits 60% wider, pull like a tide, ×3 damage.', { kind: 'sun', color: 0xe8c87a }, {
          mods: { pit: { areaMult: 1.6, fx: { pull: 120 }, damageMult: 3 } },
        }),
      ]),
      path('Pharaoh', 'Ruins, worms, and the sandstorm', [
        up('Sandstone Ruins', 150, 'A ruin rises across the road; husks must chew through it.', 'bricks', {
          add: { ruins: ab(0, 7000, { kind: 'barrier', ms: 6000, hp: 120, color: 0xc8a85a, label: '🏛️' }, 'A ruin rises across the road.', { name: 'Sandstone Ruins', gesture: 'e' }) },
        }),
        up('Sandworm', 380, 'A sandworm surfaces along the road every 4s.', 'roots', {
          add: { worm: ab(30, 4000, { kind: 'line', length: 240, width: 36, color: 0xd8b86a }, 'A sandworm surfaces along the road.', { name: 'Sandwalk', gesture: 'f' }) },
        }),
        up('Sandstorm', 1200, 'ABILITY — Sandstorm: a 6s storm over the lead husk drags, slows and scours.', 'crown', {
          active: { name: 'Sandstorm', desc: 'A 180px sandstorm for 6s: 30/s, drags the pack back and slows it.', cooldown: 30000, cast: ab(30, 0, { kind: 'zone', radius: 180, ms: 6000, color: 0xe8c87a, shape: 'sand', pull: 50 }, 'A sandstorm.', { rider: { slow: { mult: 0.5, ms: 700 } } }) },
        }),
        up('Great Worm', 2800, 'The worm ×3 and 30% longer; ruins hold 300 and bite back.', 'roots', {
          mods: { worm: { damageMult: 3, areaMult: 1.3 }, ruins: { damageAdd: 30, fx: { hp: 300 } } },
        }),
        up('Sahara', 9500, 'ABILITY — Sahara: every husk on the map takes 150, slowed 60% and grounded 6s. Worm ×2.', 'eye', {
          mods: { worm: { damageMult: 2 } },
          active: { name: 'Sahara', desc: 'Every husk on the map takes 150, is slowed 60% and grounded for 6s.', cooldown: 40000, global: true, cast: ab(150, 0, { kind: 'field', color: 0xe8c87a }, 'The desert swallows the road.', { rider: { slow: { mult: 0.4, ms: 6000 }, ground: 6000 } }) },
        }),
      ]),
      path('Glassblower', 'Fuse sand into glass, then shatter it', [
        up('Grit', 80, 'Grit leaves husks brittle: +2 damage on every hit they take.', 'sparks', {
          mods: { grit: { rider: { brittle: { add: 2, ms: 2000 } } } },
        }),
        up('Coarse Sand', 200, 'Two blasts of grit at once, +6 damage each.', 'motes', {
          mods: { grit: { damageAdd: 6, countAdd: 1, fx: { spread: 0.25 } } },
        }),
        up('Fused Glass', 800, 'Fuses the road to glass under the pack: 40 and a 1s stun.', 'crystals', {
          add: { glass: ab(40, 6000, { kind: 'splash', radius: 100, color: 0xffe0a0, shape: 'crater' }, 'Sand fused to glass beneath them.', { name: 'Tempered Temptation', rider: { stun: 1000 }, gesture: 'q' }) },
        }),
        up('Tempered', 2200, 'Everything ×2; glass encases husks and encased husks shatter for ×1.6.', 'shield', {
          mods: { '*': { damageMult: 2 }, glass: { rider: { encase: 1200 } } },
          traits: { shatter: 1.6 },
        }),
        up('Glass Storm', 7000, 'Grit fires in bursts of three; everything ×2.', 'halo', {
          mods: { grit: { fx: { salvo: 3 } }, '*': { damageMult: 2 } },
        }),
      ]),
    ],
  },

  conquest: {
    cost: 450, range: 180, role: 'summoner', body: { kind: 'ground' },
    blurb: 'Warlord. Sends soldiers marching up the road to meet the pack.',
    signature: { name: 'Barracks', desc: 'Soldiers march out every few seconds to meet the pack head-on.' },
    traits: {},
    attacks: {
      bash: ab(20, 800, { kind: 'bolt', color: 0xc23a2e, speed: 600 }, 'A heavy banner bash.', { name: 'Banner Bash' }),
      soldiers: ab(35, 3000, { kind: 'minion', hits: 3, speed: 80, ms: 12000, color: 0xc23a2e, look: 'soldier' }, 'A soldier marches out to fight.', { name: 'Place Barracks', gesture: 'e' }),
    },
    paths: [
      path('Legion', 'An army that grows with every wave', [
        up('Veterans', 300, 'Soldiers fight through two more husks.', 'shield', {
          mods: { soldiers: { pierceAdd: 2 } },
        }),
        up('Drill Sergeant', 600, 'Soldiers march out 30% sooner; the tower grows 5% stronger each wave (up to +100%).', 'pennant', {
          mods: { soldiers: { cooldownMult: 0.7 } },
          traits: { veteran: { per: 0.05, cap: 1 } },
        }),
        up('Cavalry', 1900, 'Knights charge up the road, trampling six and shoving them back.', 'banner', {
          add: { knights: ab(60, 5000, { kind: 'minion', hits: 6, speed: 160, ms: 8000, color: 0xd8a040, look: 'soldier', size: 1.3 }, 'Knights charge up the road.', { name: 'Cavalry', rider: { knockback: 30 }, gesture: 'q' }) },
        }),
        up('Phalanx', 4500, 'Everything ×2, and soldiers fight through three more.', 'shield', {
          mods: { '*': { damageMult: 2 }, soldiers: { pierceAdd: 3 } },
        }),
        up('Grand Army', 14000, 'Everything ×2.5, soldiers 40% sooner, knights in pairs.', { kind: 'horns', color: 0xc23a2e }, {
          mods: { '*': { damageMult: 2.5 }, soldiers: { cooldownMult: 0.6 }, knights: { cooldownMult: 0.5 } },
        }),
      ]),
      path('Fortify', 'Walls, turrets, and an empire\'s banner', [
        up('Barricade', 250, 'A barricade across the road that bites back.', 'bricks', {
          add: { barricade: ab(10, 8000, { kind: 'barrier', ms: 7000, hp: 160, color: 0x8a5a3a, label: '🚧' }, 'A barricade across the road.', { name: 'Place Barricade', gesture: 'f' }) },
        }),
        up('Turrets', 650, 'Builds two turrets beside it.', 'gears', {
          add: { turret: ab(12, 8000, { kind: 'sentry', ms: 20000, max: 2, attackMs: 600, range: 160, color: 0xc23a2e, look: 'barracks' }, 'A turret for 20s.', { name: 'Place Turret', gesture: 'r' }) },
        }),
        up('Expansion', 2000, 'ABILITY — Expansion: towers within 220px hit 30% harder and fire 30% faster for 10s. Three turrets.', 'banner', {
          mods: { turret: { countAdd: 1 } },
          active: { name: 'Expansion', desc: 'Every tower within 220px hits 30% harder and fires 30% faster for 10s.', cooldown: 40000, cast: ab(0, 0, { kind: 'rally', radius: 220, ms: 10000, damageMult: 1.3, fireRateMult: 1.3, color: 0xff6644 }, 'Claims the territory.') },
        }),
        up('Citadel', 5000, 'Wards the keep against 3 lives of breaches a wave; turrets ×2.5, barricades hold 400.', 'bricks', {
          traits: { keepWard: 3 },
          mods: { turret: { damageMult: 2.5 }, barricade: { fx: { hp: 400 } } },
        }),
        up('Empire', 15000, 'ABILITY — Empire: towers within 400px hit 60% harder, fire 50% faster for 12s. Turrets ×2.', 'sun', {
          mods: { turret: { damageMult: 2 } },
          active: { name: 'Empire', desc: 'Every tower within 400px hits 60% harder and fires 50% faster for 12s.', cooldown: 50000, cast: ab(0, 0, { kind: 'rally', radius: 400, ms: 12000, damageMult: 1.6, fireRateMult: 1.5, color: 0xffd700 }, 'An empire\'s banner.'), selfBuff: { ms: 12000, fireRateMult: 1.5 } },
        }),
      ]),
      path('Tribute', 'Tolls, markets and a treasury', [
        up('Toll Road', 200, 'Every hit pays 0.3 gold, up to 40 a wave.', 'coins', {
          traits: { goldOnHit: { perHit: 0.3, cap: 40 } },
        }),
        up('Market', 500, 'A market pays 30 gold every 15s while husks are in range.', 'sack', {
          add: { market: ab(0, 15000, { kind: 'gold', amount: 30, color: 0xffd700 }, 'Trade pays 30 gold.', { name: 'Market' }) },
        }),
        up('Tax Collector', 1500, 'Kills in range pay 30% more; 60 gold every wave cleared.', 'gold-trim', {
          traits: { plunder: 0.3, income: 60 },
        }),
        up('Trade Empire', 4000, 'Pays 180 every wave cleared; markets pay 80.', 'coins', {
          traits: { income: 180 },
          mods: { market: { fx: { amount: 80 } } },
        }),
        up('Golden Age', 12000, 'Pays 500 every wave cleared and 5% interest on your bank.', { kind: 'crown', color: 0xffd700 }, {
          traits: { income: 500, interest: 0.05 },
        }),
      ]),
    ],
  },

  passion: {
    cost: 240, range: 180, role: 'support', body: { kind: 'ground' },
    blurb: 'Priest. Blesses the towers around it and converts the wounded.',
    signature: { name: 'Blessing', desc: 'Towers within 140px deal 15% more damage.' },
    traits: { aura: { radius: 140, damage: 1.15, label: 'Blessing', color: 0xf5e08a } },
    attacks: {
      sermon: ab(16, 600, { kind: 'bolt', color: 0xf5e08a, speed: 520 }, 'Holy words that reveal hidden husks.', { name: 'Sermon', rider: { reveal: 3000 } }),
    },
    paths: [
      path('Temple', 'Tithes, cheaper builds and a mended keep', [
        up('Tithe', 180, 'Pays 25 gold every wave cleared.', 'coins', {
          traits: { income: 25 },
        }),
        up('Holy Ground', 450, 'Towers built or upgraded within 170px cost 15% less.', { kind: 'runes', color: 0xffd700 }, {
          traits: { discount: { radius: 170, mult: 0.85 } },
        }),
        up('Cathedral', 1500, 'Builds nearby cost 25% less; a prayer mends the keep for a life every 40s.', { kind: 'bricks', color: 0xf4f0d8 }, {
          traits: { discount: { radius: 190, mult: 0.75 } },
          add: { prayer: ab(0, 40000, { kind: 'mend', amount: 1, color: 0x88ff99 }, 'A prayer mends the keep.', { name: 'Prayer' }) },
        }),
        up('Pilgrimage', 3600, 'Pays 120 every wave cleared; prayers come 40% sooner.', 'lantern', {
          traits: { income: 120 },
          mods: { prayer: { cooldownMult: 0.6 } },
        }),
        up('Holy See', 10000, 'Builds nearby cost 35% less, pays 300 a wave, and wards 5 lives of breaches each wave.', 'halo', {
          traits: { discount: { radius: 220, mult: 0.65 }, income: 300, keepWard: 5 },
        }),
      ]),
      path('Crusade', 'Holy fire and a blessed army', [
        up('Holy Water', 200, 'Consecrated puddles that burn the unholy and slow.', 'bubbles', {
          add: { water: ab(10, 5000, { kind: 'zone', radius: 80, ms: 4000, color: 0xf5e08a, shape: 'holy' }, 'Consecrated ground that slows.', { name: 'Holy Water', rider: { slow: { mult: 0.7, ms: 600 } }, gesture: 'e' }) },
        }),
        up('Holy Grenade', 500, 'Lobs a holy hand grenade every 5s.', 'star', {
          add: { grenade: ab(60, 5000, { kind: 'bolt', color: 0xffd700, speed: 460, lob: true, splash: 70 }, 'Count to three.', { name: 'Holy Hand Grenade', gesture: 'r' }) },
        }),
        up('Mount Crucifix', 1600, 'ABILITY — Crusade: towers within 220px hit 40% harder and fire 30% faster for 8s. Grenades ×1.5.', { kind: 'banner', color: 0xf4f0d8 }, {
          mods: { grenade: { damageMult: 1.5 } },
          active: { name: 'Crusade', desc: 'Every tower within 220px hits 40% harder and fires 30% faster for 8s.', cooldown: 35000, cast: ab(0, 0, { kind: 'rally', radius: 220, ms: 8000, damageMult: 1.4, fireRateMult: 1.3, color: 0xffe08a }, 'A crusade.') },
        }),
        up('Zealotry', 3800, 'The blessing grows to 180px and +25%; its own attacks ×2.', 'cape', {
          traits: { aura: { radius: 180, damage: 1.25, label: 'Zealotry', color: 0xf5e08a } },
          mods: { '*': { damageMult: 2 } },
        }),
        up('Ark', 11000, 'ABILITY — Ark: every husk on the map takes 500 and is weakened ×1.3 for 8s.', 'crown', {
          active: { name: 'Ark of the Covenant', desc: 'Every husk on the map takes 500 and takes ×1.3 damage for 8s.', cooldown: 45000, global: true, cast: ab(500, 0, { kind: 'field', color: 0xffd700 }, 'The Ark is opened.', { rider: { weaken: { mult: 1.3, ms: 8000 } } }) },
        }),
      ]),
      path('Conversion', 'Turn the wounded against their own', [
        up('Revelation', 150, 'Sermons strip hidden husks\' camouflage for good.', 'eye', {
          mods: { sermon: { rider: { unmask: true } } },
        }),
        up('Ascendance', 420, 'Every 9s converts a husk under 40% health; it marches back up the road.', 'wings', {
          add: { convert: ab(20, 9000, { kind: 'convert', thresholdFrac: 0.4, color: 0xffe08a, look: 'convert' }, 'Converts a weakened husk.', { name: 'Ascendance', gesture: 'q' }) },
        }),
        up('Revival', 1300, 'Converts husks under 55%, 40% more often.', 'wings', {
          mods: { convert: { fx: { thresholdFrac: 0.55 }, cooldownMult: 0.6 } },
        }),
        up('Mass Baptism', 3500, 'Converts twice as often; sermons ×2 in bursts of two.', 'sun', {
          mods: { convert: { cooldownMult: 0.5 }, sermon: { damageMult: 2, fx: { salvo: 2 } } },
        }),
        up('Saint', 9500, 'Converts husks under 75%; all attacks ×3; corrupt husks take ×1.5.', 'star', {
          mods: { convert: { fx: { thresholdFrac: 0.75 } }, '*': { damageMult: 3 } },
          traits: { vsCategory: { cats: ['corrupt'], mult: 1.5 } },
        }),
      ]),
    ],
  },

  paper: {
    cost: 55, range: 150, role: 'attack', body: { kind: 'ace', leash: 150, speed: 210 },
    blurb: 'Ace flyer. A cheap paper plane looping the field.',
    signature: { name: 'Paper Plane', desc: 'Flies wide loops around its pad and fires from the air. Airborne husks take ×1.6.' },
    traits: { antiAir: 1.6 },
    attacks: {
      dart: ab(5, 500, { kind: 'bolt', look: 'plane', color: 0xf2ead6, speed: 600, pierce: 1 }, 'Origami darts.', { name: 'Origami Dart' }),
    },
    paths: [
      path('Origami', 'Squadrons of planes and an ace pilot', [
        up('Double Fold', 70, 'Two darts a throw.', 'cards', {
          mods: { dart: { countAdd: 1, fx: { spread: 0.2 } } },
        }),
        up('Paper Cuts', 160, 'Darts +2 damage and make husks bleed.', 'spikes', {
          mods: { dart: { damageAdd: 2, rider: { bleed: 1500 } } },
        }),
        up('Squadron', 650, 'Launches three seeking planes every 1.5s.', 'wings', {
          add: { squadron: ab(14, 1500, { kind: 'bolt', look: 'plane', color: 0xffffff, speed: 420, count: 3, spread: 0.5, homing: true }, 'Three seeking planes.', { name: 'Paper Plane', gesture: 'e' }) },
        }),
        up('Fighter Ace', 1900, 'Everything ×2, 15% of hits crit ×3, and it flies faster.', 'scope', {
          mods: { '*': { damageMult: 2 } },
          traits: { crit: { chance: 0.15, mult: 3 } },
          body: { speed: 260 },
        }),
        up('Blue Angel', 6000, 'Darts fire in bursts of three; everything ×2.5; airborne husks take ×2.5.', { kind: 'star', color: 0x6aa8ff }, {
          mods: { dart: { fx: { salvo: 3 } }, '*': { damageMult: 2.5 } },
          traits: { antiAir: 2.5 },
        }),
      ]),
      path('Shuriken', 'Blades that cut out and back', [
        up('Shuriken', 90, 'Throws a paper shuriken that cuts out through the line and back.', 'orbit', {
          add: { shuriken: ab(10, 2500, { kind: 'bolt', look: 'star', color: 0xe8e0c8, speed: 480, pierce: 99, returns: true }, 'Out through the line and back.', { name: 'Paper Shuriken', gesture: 'r' }) },
        }),
        up('Sharp Crease', 220, 'Shuriken ×1.6 and 30% more often.', 'orbit', {
          mods: { shuriken: { damageMult: 1.6, cooldownMult: 0.7 } },
        }),
        up('Climax', 700, 'ABILITY — Climax: sixteen planes burst out in every direction.', 'sparks', {
          active: { name: 'Climax', desc: 'Sixteen planes in every direction, 80 each.', cooldown: 25000, cast: ab(80, 0, { kind: 'bolt', look: 'plane', color: 0xffe8a0, speed: 560, count: 16, spread: 6.28, pierce: 2 }, 'A ring of planes.') },
        }),
        up('Thousand Cranes', 2200, 'Three shuriken a throw, ×2.', { kind: 'leaves', color: 0xffffff }, {
          mods: { shuriken: { countAdd: 2, damageMult: 2, fx: { spread: 0.6 } } },
        }),
        up('Final Chapter', 7000, 'ABILITY — Final Chapter: thirty seeking planes, 250 each. Shuriken ×2.5.', 'book', {
          mods: { shuriken: { damageMult: 2.5 } },
          active: { name: 'Final Chapter', desc: 'Thirty seeking planes, 250 each.', cooldown: 30000, cast: ab(250, 0, { kind: 'bolt', look: 'plane', color: 0xffe8a0, speed: 520, count: 30, spread: 6.28, homing: true }, 'The last page.') },
        }),
      ]),
      path('Papier-Mâché', 'Paper brutes, nets and a library', [
        up('Mâché Monster', 80, 'A papier-mâché brute marches up the road through five husks.', { kind: 'bricks', color: 0xf2ead6 }, {
          add: { brute: ab(15, 7000, { kind: 'minion', hits: 5, speed: 90, ms: 9000, color: 0xf2ead6, look: 'golem' }, 'A papier-mâché brute marches up the road.', { name: 'Mâché Monsters', gesture: 'f' }) },
        }),
        up('Paper Net', 200, 'Darts net flyers and drag them to the ground for 2s.', 'chains', {
          mods: { dart: { rider: { ground: 2000 } } },
        }),
        up('Paper Giant', 750, 'Brutes ×2.5, bigger, and crush five more.', { kind: 'bricks', color: 0xf2ead6 }, {
          mods: { brute: { damageMult: 2.5, pierceAdd: 5, fx: { size: 1.6 } } },
        }),
        up('Library', 2000, 'Two paper idols stand by the pad and shoot.', 'book', {
          add: { library: ab(18, 8000, { kind: 'sentry', ms: 15000, max: 2, attackMs: 500, range: 150, color: 0xf2ead6, look: 'idol' }, 'A paper idol that shoots.', { name: 'Library' }) },
        }),
        up('Papercraft Legion', 6500, 'Brutes march 2.5× as often and ×3; four idols.', { kind: 'crown', color: 0xf2ead6 }, {
          mods: { brute: { cooldownMult: 0.4, damageMult: 3 }, library: { countAdd: 2 } },
        }),
      ]),
    ],
  },
};
