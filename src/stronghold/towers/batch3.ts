import type { TowerDef } from '../StrongholdTypes';
import { ab, path, up } from './helpers';

/** Venom, Fate, Sound, Light, Magnet, Metal, Plasma, Gunpowder. */
export const BATCH3_TOWERS: Record<string, TowerDef> = {
  // ── Venom (id `slime`) ──────────────────────────────────────────────
  slime: {
    cost: 110, range: 170, role: 'control', body: { kind: 'ground' },
    blurb: 'Venom. Poisons and eats armour off husks so the rest of your towers get through.',
    signature: { name: 'Corrosion', desc: 'Its lashes Corrode and poison: armour, shells and banners stop counting.' },
    traits: {},
    attacks: {
      whip: ab(10, 600, { kind: 'bolt', color: 0x66cc44, speed: 520 }, 'Poison Whip: lashes that corrode and poison.', { name: 'Poison Whip', rider: { toxic: { ms: 3000, dps: 4 }, corrode: 3000 } }),
    },
    paths: [
      path('Toxin', 'Venom that spreads from body to body', [
        up('Potent Venom', 120, 'Poison deals 9/s for 4s and lashes hit +3.', 'motes', {
          mods: { whip: { damageAdd: 3, rider: { toxic: { ms: 4000, dps: 9 } } } },
        }),
        up('Viper Strike', 260, 'Lashes 30% faster.', 'sparks', {
          mods: { whip: { cooldownMult: 0.7 } },
        }),
        up('Plague Carrier', 950, 'Poisoned husks infect their neighbours when they die. Adds a burrowing snake.', { kind: 'skull', color: 0x88bb22 }, {
          mods: { whip: { rider: { infect: 4000 } } },
          add: { burrow: ab(45, 3000, { kind: 'line', length: 220, width: 30, color: 0x44aa22 }, 'A snake tunnels down the road and bites.', { name: 'Snake Burrow', rider: { corrode: 4000, toxic: { ms: 4000, dps: 9 }, infect: 4000 }, gesture: 'r' }) },
        }),
        up('Necrotic', 2700, 'Lashes ×2.2, poison 30/s, and each lash eats 2% of current health.', { kind: 'skull', color: 0x55aa22 }, {
          mods: { whip: { damageMult: 2.2, rider: { toxic: { ms: 4000, dps: 30 }, pct: 0.02 } }, burrow: { damageMult: 2 } },
        }),
        up('Black Mamba', 8600, 'All venom ×3, poison 90/s, lashes eat 4% of current health.', { kind: 'horns', color: 0x223311 }, {
          mods: { '*': { damageMult: 3 }, whip: { rider: { toxic: { ms: 5000, dps: 90 }, pct: 0.04 } } },
        }),
      ]),
      path('Acid Bath', 'Pools of acid and a sky that rains it', [
        up('Vile Spray', 150, 'Sprays a pool of acid on the road that corrodes and slows.', 'bubbles', {
          add: { pool: ab(12, 4500, { kind: 'zone', radius: 70, ms: 4500, color: 0x66cc44, shape: 'acid' }, 'A pool of acid on the road.', { name: 'Vile Spray', rider: { corrode: 1500, slow: { mult: 0.75, ms: 600 } }, gesture: 'e' }) },
        }),
        up('Caustic', 340, 'Pools are 1.4× wider and leave husks brittle (+3 per hit).', 'bubbles', {
          mods: { pool: { areaMult: 1.4, damageMult: 1.5, rider: { brittle: { add: 3, ms: 2000 } } } },
        }),
        up('Acid Rain', 1250, 'ABILITY — Acid Rain: a vast acid storm over the lead husk for 6s. Pools hit ×2.', { kind: 'runes', color: 0x88ee44 }, {
          mods: { pool: { damageMult: 2 } },
          active: { name: 'Acid Rain', desc: 'A 220px acid storm on the lead husk for 6s.', cooldown: 35000, global: true, cast: ab(70, 0, { kind: 'zone', radius: 220, ms: 6000, color: 0x55bb33, shape: 'acid' }, 'An acid storm.', { rider: { corrode: 3000, slow: { mult: 0.6, ms: 600 } } }) },
        }),
        up('Dissolve', 3300, 'Pools ×2.5 and weaken: husks in them take 25% more from everything.', { kind: 'runes', color: 0x66cc44 }, {
          mods: { pool: { damageMult: 2.5, rider: { weaken: { mult: 1.25, ms: 1500 } } } },
        }),
        up('Acid Apocalypse', 9800, 'ABILITY — Acid Apocalypse: every husk on the map takes 450, corrodes and is poisoned. Pools ×2.', { kind: 'crown', color: 0x88ee44 }, {
          mods: { pool: { damageMult: 2, areaMult: 1.2 } },
          active: { name: 'Acid Apocalypse', desc: 'Every husk on the map takes 450, corrodes 8s and is poisoned 60/s.', cooldown: 40000, global: true, cast: ab(450, 0, { kind: 'field', color: 0x66cc44 }, 'The whole road dissolves.', { rider: { corrode: 8000, toxic: { ms: 6000, dps: 60 } } }) },
        }),
      ]),
      path('Serpent', 'Snakes that slither up the road', [
        up('Hatchling', 110, 'Sends a snake slithering up the road, biting three husks.', 'bones', {
          add: { snake: ab(14, 4000, { kind: 'minion', hits: 3, speed: 120, ms: 6000, color: 0x55bb33, look: 'wolf' }, 'A snake slithers up the road.', { name: 'Hatchling', rider: { corrode: 2000, toxic: { ms: 3000, dps: 5 } }, gesture: 'f' }) },
        }),
        up('Brood', 320, 'Snakes bite two more husks and hatch 20% faster.', 'bones', {
          mods: { snake: { countAdd: 2, cooldownMult: 0.8 } },
        }),
        up('Spitting Cobras', 1150, 'Two cobra idols rise beside it and spit venom.', { kind: 'crystals', color: 0x66cc44 }, {
          add: { cobras: ab(12, 9000, { kind: 'sentry', ms: 20000, max: 2, attackMs: 500, range: 150, color: 0x66cc44, look: 'idol' }, 'Cobra idols that spit venom.', { name: 'Spitting Cobras', rider: { toxic: { ms: 3000, dps: 6 } } }) },
        }),
        up('Constrictor', 3100, 'Snakes are huge: ×2.5 bites through four more, and they squeeze husks still.', { kind: 'chains', color: 0x447722 }, {
          mods: { snake: { damageMult: 2.5, countAdd: 4, fx: { size: 1.4 }, rider: { stun: 600 } }, cobras: { damageMult: 2 } },
        }),
        up('Basilisk', 9200, 'A basilisk crawls up the road through thirty husks. Everything hits stopped husks ×1.5.', { kind: 'eye', color: 0xaaff44 }, {
          add: { basilisk: ab(220, 9000, { kind: 'minion', hits: 30, speed: 70, ms: 14000, color: 0x88cc33, look: 'wolf', size: 2 }, 'A basilisk whose gaze stops husks dead.', { name: 'Basilisk', rider: { stun: 1200, corrode: 4000 } }) },
          traits: { bully: 1.5 },
        }),
      ]),
    ],
  },

  // ── Fate ────────────────────────────────────────────────────────────
  fate: {
    cost: 100, range: 190, role: 'attack', body: { kind: 'ground' },
    blurb: 'Gambler. Plays the odds — and the house is rigged in its favour.',
    signature: { name: 'Loaded Deck', desc: '12% of its hits are crits for ×3.' },
    traits: { crit: { chance: 0.12, mult: 3 } },
    attacks: {
      card: ab(10, 550, { kind: 'bolt', look: 'card', color: 0x88eecc, speed: 620 }, 'Card Throw: a flicked card.', { name: 'Card Throw' }),
    },
    paths: [
      path('High Roller', 'Crits, crits and bigger crits', [
        up('Marked Cards', 130, 'Crits land 20% of the time for ×3.5.', 'cards', {
          traits: { crit: { chance: 0.2, mult: 3.5 } },
        }),
        up('Quick Shuffle', 280, 'Throws 30% faster.', 'cards', {
          mods: { card: { cooldownMult: 0.7 } },
        }),
        up('Royal Flush', 1050, 'Throws three-card bursts, each card +20%.', { kind: 'crown', color: 0xffe066 }, {
          mods: { card: { damageMult: 1.2, fx: { salvo: 3 } } },
        }),
        up('Loaded Dice', 2900, 'Crits 35% for ×5; cards ×1.6.', { kind: 'star', color: 0xffe066 }, {
          traits: { crit: { chance: 0.35, mult: 5 } },
          mods: { card: { damageMult: 1.6 } },
        }),
        up('Ace of Aces', 9000, 'Half its hits crit for ×8. Cards ×2.5 and cut through three husks.', { kind: 'crown', color: 0xffffff }, {
          traits: { crit: { chance: 0.5, mult: 8 } },
          mods: { card: { damageMult: 2.5, pierceAdd: 3 } },
        }),
      ]),
      path('The House', 'Gold off every hit, and a jackpot button', [
        up('Lucky Coin', 120, 'Every 4 hits pay 1 gold (up to 30 a wave).', 'coins', {
          traits: { goldOnHit: { perHit: 0.25, cap: 30 } },
        }),
        up('Side Bet', 380, 'Cards may Gild: 30% of husks struck pay ×1.5 if they die soon.', 'coins', {
          mods: { card: { rider: { gild: 1.5, chance: 0.3 } } },
        }),
        up('All In', 1300, 'ABILITY — All In: nine golden cards that Gild ×3. Pays 40 every wave.', { kind: 'sack', color: 0xffd700 }, {
          traits: { income: 40 },
          active: { name: 'All In', desc: 'Nine golden cards; every husk struck pays ×3.', cooldown: 30000, cast: ab(70, 0, { kind: 'bolt', look: 'card', color: 0xffe066, speed: 560, count: 9, spread: 1.4 }, 'Nine cards.', { rider: { gild: 3 } }) },
        }),
        up('House Edge', 3300, 'Every hit pays 1 gold (up to 120 a wave) and banks 4% interest each wave.', { kind: 'gold-trim' }, {
          traits: { goldOnHit: { perHit: 1, cap: 120 }, interest: 0.04 },
        }),
        up('Grand Casino', 9200, 'ABILITY — Wheel of Fortune: every husk on the map takes 600 and is Gilded ×3. Pays 150 a wave.', { kind: 'hat', color: 0xffd700 }, {
          traits: { income: 150 },
          active: { name: 'Wheel of Fortune', desc: 'Every husk on the map takes 600 and pays ×3 if it dies soon.', cooldown: 45000, global: true, cast: ab(600, 0, { kind: 'field', color: 0xffd700 }, 'The wheel spins.', { rider: { gild: 3 } }) },
        }),
      ]),
      path('Fortune Teller', 'Curses: weaken, doom and banish', [
        up('Bad Omen', 90, 'Cards Weaken: husks take 15% more from everything for 3s.', 'eye', {
          mods: { card: { rider: { weaken: { mult: 1.15, ms: 3000 } } } },
        }),
        up('Tarot', 300, 'Adds a seeking tarot card that weakens harder and leaves husks brittle.', 'book', {
          add: { tarot: ab(30, 3000, { kind: 'bolt', look: 'card', color: 0xccffee, speed: 500, homing: true, size: 1.3 }, 'A seeking tarot card that curses.', { name: 'Tarot', rider: { weaken: { mult: 1.3, ms: 4000 }, brittle: { add: 4, ms: 4000 } }, gesture: 'f' }) },
        }),
        up('Death Card', 1250, 'Tarot cards have an 8% chance to banish a husk back to its breach.', { kind: 'skull', color: 0xccffee }, {
          mods: { tarot: { rider: { banish: 0.08 }, cooldownMult: 0.8 } },
        }),
        up('Hex', 3400, 'Tarot ×2.5 and eats 5% of current health; cards ×1.5.', { kind: 'moon', color: 0x88eecc }, {
          mods: { tarot: { damageMult: 2.5, rider: { pct: 0.05 } }, card: { damageMult: 1.5 } },
        }),
        up('The Wheel Turns', 9600, 'Tarot flies in threes and banishes 15%; everything ×2.', { kind: 'moon', color: 0xffffff }, {
          mods: { '*': { damageMult: 2 }, tarot: { fx: { salvo: 3 }, rider: { banish: 0.15 } } },
        }),
      ]),
    ],
  },

  // ── Sound ───────────────────────────────────────────────────────────
  sound: {
    cost: 230, range: 160, role: 'support', body: { kind: 'ground' },
    blurb: 'The band. Keeps time for every tower around it, and stops the pack mid-step.',
    signature: { name: 'Drum Line', desc: 'Towers within 150px fire 15% faster.' },
    traits: { aura: { radius: 150, fireRate: 1.15, label: 'Drum Line', color: 0xc0304f } },
    attacks: {
      baton: ab(8, 700, { kind: 'bolt', look: 'note', color: 0xc0304f, speed: 520, pierce: 1 }, 'Baton: a thrown note.', { name: 'Baton' }),
    },
    paths: [
      path('Drum Line', 'Every tower near the band plays faster', [
        up('Snare', 200, 'Nearby towers fire 22% faster.', 'drum', {
          traits: { aura: { radius: 150, fireRate: 1.22, label: 'Drum Line', color: 0xc0304f } },
        }),
        up('Bass Drum', 460, 'The beat carries 180px, and nearby towers hit 10% harder.', 'drum', {
          traits: { aura: { radius: 180, fireRate: 1.22, damage: 1.1, label: 'Bass Drum', color: 0xc0304f } },
        }),
        up('Marching Band', 1650, 'Nearby towers fire 35% faster, hit 15% harder and pierce one more.', { kind: 'pennant', color: 0xffd36a }, {
          traits: { aura: { radius: 190, fireRate: 1.35, damage: 1.15, pierce: 1, label: 'Marching Band', color: 0xffd36a } },
        }),
        up('Percussion Corps', 4300, 'Nearby towers fire 45% faster, hit 25% harder and reach 10% further.', { kind: 'pennant', color: 0xffaa44 }, {
          traits: { aura: { radius: 200, fireRate: 1.45, damage: 1.25, range: 1.1, pierce: 1, label: 'Percussion Corps', color: 0xffaa44 } },
        }),
        up('Grand March', 12000, 'A 220px parade: towers fire 65% faster, hit 40% harder, reach 15% further, pierce two.', { kind: 'hat', color: 0xffd36a }, {
          traits: { aura: { radius: 220, fireRate: 1.65, damage: 1.4, range: 1.15, pierce: 2, label: 'Grand March', color: 0xffd36a } },
        }),
      ]),
      path('Conductor', 'Waves, holds, and a solo for the whole field', [
        up('Crescendo', 160, 'Adds a sonic wave down the road that shoves husks back.', 'notes', {
          add: { wave: ab(22, 3200, { kind: 'line', length: 200, width: 50, color: 0xff5577 }, 'A sonic wave down the road.', { name: 'Crescendo', rider: { knockback: 25 }, gesture: 'e' }) },
        }),
        up('Fermata', 420, 'Holds the note: a ring that stops the pack mid-step for 1.2s.', 'notes', {
          add: { hold: ab(6, 8000, { kind: 'nova', radius: 130, color: 0xffaacc }, 'The pack freezes mid-step.', { name: 'Fermata', rider: { stun: 1200 }, gesture: 'r' }) },
        }),
        up('Bugle Solo', 1450, 'ABILITY — Bugle Solo: every tower within 240px fires 70% faster for 7s.', { kind: 'banner', color: 0xffd36a }, {
          active: { name: 'Bugle Solo', desc: 'Towers within 240px fire 70% faster for 7s.', cooldown: 30000, cast: ab(0, 0, { kind: 'rally', radius: 240, ms: 7000, fireRateMult: 1.7, color: 0xffd36a }, 'A bugle solo.') },
        }),
        up('Forte', 3600, 'Waves ×2.5 and wider; Fermata hits hard and holds a wider ring.', { kind: 'notes', color: 0xff5577 }, {
          mods: { wave: { damageMult: 2.5, areaMult: 1.3 }, hold: { damageAdd: 54, areaMult: 1.25 } },
        }),
        up('Symphony', 10500, 'ABILITY — Grand Finale: every husk on the map takes 350 and stands stunned 2.5s.', { kind: 'crown', color: 0xffd36a }, {
          mods: { wave: { cooldownMult: 0.7 } },
          active: { name: 'Grand Finale', desc: 'Every husk on the map takes 350 and is stunned 2.5s.', cooldown: 50000, global: true, cast: ab(350, 0, { kind: 'field', color: 0xffaacc }, 'The finale.', { rider: { stun: 2500 } }) },
        }),
      ]),
      path('Shriek', 'Sound that cracks husks apart', [
        up('Loud', 120, 'Notes hit +6 and pass through two more husks.', 'sparks', {
          mods: { baton: { damageAdd: 6, pierceAdd: 2 } },
        }),
        up('Resonance', 380, 'Notes leave husks brittle: +3 damage per hit for 4s.', 'sparks', {
          mods: { baton: { rider: { brittle: { add: 3, ms: 4000 } } } },
        }),
        up('Sonic Boom', 1300, 'Adds a booming ring every 2s that unmasks hidden husks for good.', { kind: 'antenna', color: 0xff5577 }, {
          add: { boom: ab(50, 2000, { kind: 'nova', radius: 110, color: 0xff6688 }, 'A boom that strips camouflage.', { name: 'Sonic Boom', rider: { unmask: true } }) },
        }),
        up('Shatterpoint', 3500, 'Everything ×2, and stunned or slowed husks take ×1.5.', { kind: 'antenna', color: 0xffffff }, {
          mods: { '*': { damageMult: 2 } },
          traits: { bully: 1.5 },
        }),
        up('Brown Note', 10000, 'Everything ×3, booms 1.4× wider and eat 3% of current health.', { kind: 'skull', color: 0xc0304f }, {
          mods: { '*': { damageMult: 3 }, boom: { areaMult: 1.4, rider: { pct: 0.03, unmask: true } } },
        }),
      ]),
    ],
  },

  // ── Light ───────────────────────────────────────────────────────────
  light: {
    cost: 175, range: 210, role: 'attack', body: { kind: 'ground' },
    blurb: 'Racer. Lances down the line, sends light-cars up the road, and lights up what hides.',
    signature: { name: 'Headlights', desc: 'Sees hidden husks, and lets every tower within 160px see them too.' },
    traits: { detect: true, aura: { radius: 160, detect: true, label: 'Headlights', color: 0xfff4a8 } },
    attacks: {
      lance: ab(20, 700, { kind: 'bolt', look: 'bolt', color: 0xfff4a8, speed: 900, pierce: 4 }, 'Light Lance: a spear of light through four.', { name: 'Light Lance', dtype: 'energy' }),
    },
    paths: [
      path('Prism', 'Focus the light into a burning ray', [
        up('Focused Lens', 180, 'Lances hit +8.', 'eye', {
          mods: { lance: { damageAdd: 8 } },
        }),
        up('Refraction', 420, 'Each throw splits into three lances.', { kind: 'crystals', color: 0xfff4a8 }, {
          mods: { lance: { countAdd: 2, fx: { spread: 0.3 } } },
        }),
        up('Laser', 1500, 'Adds a ramping laser; the longer it holds a husk, the harder every hit lands.', { kind: 'scope', color: 0xffffaa }, {
          add: { laser: ab(40, 3000, { kind: 'beam', color: 0xffffaa, width: 5, ms: 3000, ramp: 0.5 }, 'A laser that burns hotter as it holds.', { name: 'Laser' }) },
          traits: { focus: { per: 0.1, cap: 1 } },
        }),
        up('Solar Lens', 4200, 'Laser ×3 and ramps twice as fast; lances ×1.8.', { kind: 'sun', color: 0xffee66 }, {
          mods: { laser: { damageMult: 3, fx: { ramp: 1, width: 7 } }, lance: { damageMult: 1.8 } },
        }),
        up('Death Ray', 11500, 'All light ×3, leaves husks brittle, and bosses take ×1.5.', { kind: 'sun', color: 0xffffff }, {
          mods: { '*': { damageMult: 3, rider: { brittle: { add: 10, ms: 3000 } } }, laser: { fx: { width: 10 } } },
          traits: { bossBane: 1.5, focus: { per: 0.1, cap: 1.5 } },
        }),
      ]),
      path('Racer', 'Light-cars that tear up the road', [
        up('Light Car', 170, 'Sends a light-car racing up the road through five husks.', 'wings', {
          add: { car: ab(18, 5000, { kind: 'minion', hits: 5, speed: 200, ms: 6000, color: 0xfff4a8, look: 'car' }, 'A light-car races up the road.', { name: 'Prism Ramp', gesture: 'r' }) },
        }),
        up('Turbo', 400, 'Cars launch 30% more often and plough three more husks.', 'wings', {
          mods: { car: { cooldownMult: 0.7, countAdd: 3 } },
        }),
        up('Nitro', 1400, 'ABILITY — Racing Line: a supercar tears up the road through twenty. Cars ×1.5.', { kind: 'pennant', color: 0xffee66 }, {
          mods: { car: { damageMult: 1.5 } },
          active: { name: 'Racing Line', desc: 'A supercar ploughs up the road through twenty husks.', cooldown: 25000, cast: ab(140, 0, { kind: 'minion', hits: 20, speed: 260, ms: 6000, color: 0xffee66, look: 'car', size: 1.4 }, 'A supercar.', { rider: { knockback: 30 } }) },
        }),
        up('Pit Crew', 3500, 'Cars ×2.5 and shove husks back as they hit.', { kind: 'gears', color: 0xfff4a8 }, {
          mods: { car: { damageMult: 2.5, rider: { knockback: 30 } } },
        }),
        up('Hyperdrive', 10000, 'ABILITY — Light Speed: every husk on the map takes 700 and is Exposed. Cars ×2.', { kind: 'star', color: 0xffffff }, {
          mods: { car: { damageMult: 2 } },
          active: { name: 'Light Speed', desc: 'Every husk on the map takes 700 and is Exposed.', cooldown: 40000, global: true, cast: ab(700, 0, { kind: 'field', color: 0xfff4a8 }, 'Light speed.', { rider: { expose: 4000 } }) },
        }),
      ]),
      path('Beacon', 'Reveal, expose and empower', [
        up('Flashbang', 120, 'Adds a flash that dazzles the pack for 0.9s and reveals them.', 'motes', {
          add: { flash: ab(8, 6000, { kind: 'splash', radius: 80, color: 0xffffff }, 'A flash that dazzles the pack.', { name: 'Light Trick', rider: { stun: 900, reveal: 5000 }, gesture: 'f' }) },
        }),
        up('Searchlight', 300, 'Reaches 20% further and lets towers within 220px see hidden husks.', 'lantern', {
          range: 1.2,
          traits: { aura: { radius: 220, detect: true, label: 'Searchlight', color: 0xfff4a8 } },
        }),
        up('Revelation', 1050, 'Lances strip camouflage for good and Expose: the next hit lands ×1.5.', { kind: 'lantern', color: 0xffffaa }, {
          mods: { lance: { rider: { unmask: true, expose: 3000 } } },
        }),
        up('Halo', 2900, 'Towers within 220px see hidden husks and hit 15% harder.', { kind: 'halo', color: 0xfff4a8 }, {
          traits: { aura: { radius: 220, detect: true, damage: 1.15, label: 'Halo', color: 0xfff4a8 } },
        }),
        up('Lighthouse', 8200, 'Towers within 260px see all, hit 30% harder and fire 15% faster. Hidden husks take ×2.', { kind: 'halo', color: 0xffffff }, {
          traits: { aura: { radius: 260, detect: true, damage: 1.3, fireRate: 1.15, label: 'Lighthouse', color: 0xffffff }, vsHidden: 2 },
        }),
      ]),
    ],
  },

  // ── Magnet ──────────────────────────────────────────────────────────
  magnet: {
    cost: 135, range: 180, role: 'control', body: { kind: 'ground' },
    blurb: 'Scrapper. Flings ricocheting coins, hauls the pack around, and tears metal apart.',
    signature: { name: 'Polarity', desc: 'Metal, Magnet and Tech husks take ×2 from it.' },
    traits: { bane: { elements: ['metal', 'magnet', 'technology'], mult: 2 } },
    attacks: {
      coin: ab(13, 550, { kind: 'bolt', look: 'coin', color: 0xcc2244, speed: 600, bounces: 1 }, 'Coin Flip: a coin that ricochets once.', { name: 'Coin Flip' }),
    },
    paths: [
      path('Scrapyard', 'Ricochets, shrapnel and a railgun', [
        up('Lucky Bounce', 140, 'Coins ricochet three times.', 'coins', {
          mods: { coin: { fx: { bounces: 3 } } },
        }),
        up('Rapid Flip', 300, 'Flips 30% faster.', 'coins', {
          mods: { coin: { cooldownMult: 0.7 } },
        }),
        up('Scrap Shrapnel', 1100, 'Kills burst into three shards of scrap. Coins +8.', { kind: 'gears', color: 0xaaaaaa }, {
          mods: { coin: { damageAdd: 8 } },
          traits: { shrapnel: { count: 3, frac: 0.08 } },
        }),
        up('Railgun', 3200, 'Coins become rail slugs: ×2.5, pierce three, twice as fast.', { kind: 'scope', color: 0xcc2244 }, {
          mods: { coin: { damageMult: 2.5, pierceAdd: 3, fx: { speed: 1300, look: 'needle' } } },
        }),
        up('Magnetar', 9500, 'Everything ×3, kills burst into six big shards, bosses take ×1.4.', { kind: 'star', color: 0xff4466 }, {
          mods: { '*': { damageMult: 3 } },
          traits: { shrapnel: { count: 6, frac: 0.15 }, bossBane: 1.4 },
        }),
      ]),
      path('Polarity', 'Push the pack back, pull it in, flip the poles', [
        up('Repulse', 160, 'Adds a pulse that blasts the pack back up the road.', 'orbit', {
          add: { repulse: ab(10, 4500, { kind: 'nova', radius: 110, color: 0xff4466 }, 'Blasts the pack back up the road.', { name: 'Repulse', rider: { knockback: 70 }, gesture: 'e' }) },
        }),
        up('Mag-Lev', 420, 'Adds a field on the road that hauls husks backward.', 'orbit', {
          add: { maglev: ab(12, 5000, { kind: 'zone', radius: 90, ms: 4000, color: 0xcc2244, shape: 'rune', pull: 70 }, 'A field that hauls husks backward.', { name: 'Mag-Lev' }) },
        }),
        up('Pole Flip', 1400, 'ABILITY — Pole Reversal: every husk on the map is flung back 150px and stunned 1s.', { kind: 'antenna', color: 0xcc2244 }, {
          active: { name: 'Pole Reversal', desc: 'Flings every husk on the map back 150px and stuns it 1s.', cooldown: 30000, global: true, cast: ab(60, 0, { kind: 'field', color: 0xcc2244 }, 'The poles flip.', { rider: { knockback: 150, stun: 1000 } }) },
        }),
        up('Lodestar', 3400, 'Mag-Lev hauls harder over a wider field, ×3; Repulse ×3.', { kind: 'runes', color: 0xcc2244 }, {
          mods: { maglev: { damageMult: 3, areaMult: 1.4, fx: { pull: 120 } }, repulse: { damageMult: 3 } },
        }),
        up('Black Pole', 9800, 'ABILITY — Collapse: every husk takes 500, is flung back 300px and pulled out of the sky for 8s.', { kind: 'horns', color: 0x220011 }, {
          active: { name: 'Collapse', desc: 'Every husk takes 500, is flung back 300px and grounded 8s.', cooldown: 45000, global: true, cast: ab(500, 0, { kind: 'field', color: 0x220011 }, 'The poles collapse.', { rider: { knockback: 300, ground: 8000, stun: 1000 } }) },
        }),
      ]),
      path('Mech', 'Spikes, nails and a scrap mech', [
        up('Steel Spike', 130, 'Drives spikes into the road; each bites three husks.', 'spikes', {
          add: { spikes: ab(12, 5000, { kind: 'trap', count: 4, hits: 3, ms: 14000, color: 0x99aabb, look: 'spike' }, 'Spikes driven into the road.', { name: 'Steel Spike', gesture: 'f' }) },
        }),
        up('Nail Implant', 380, 'Adds a nail that Weakens: husks take 25% more for 5s.', 'spikes', {
          add: { nail: ab(18, 3000, { kind: 'bolt', look: 'needle', color: 0xaaaaaa, speed: 760 }, 'A nail that Weakens.', { name: 'Nail Implant', rider: { weaken: { mult: 1.25, ms: 5000 } }, gesture: 'r' }) },
        }),
        up('Ground Wire', 1200, 'Its pull drags flyers to the road for 4s. Airborne husks take ×1.5.', { kind: 'chains', color: 0x99aabb }, {
          mods: { '*': { rider: { ground: 4000 } } },
          traits: { antiAir: 1.5 },
        }),
        up('Scrap Mech', 3600, 'Builds a scrap mech beside it that hoses the road.', { kind: 'gears', color: 0xcc2244 }, {
          add: { mech: ab(30, 6000, { kind: 'sentry', ms: 30000, max: 1, attackMs: 350, range: 190, color: 0xcc2244, look: 'turret' }, 'A scrap mech that hoses the road.', { name: 'Scrap Mech', rider: { ground: 2000 } }) },
        }),
        up('Mecha Massacre', 10500, 'Two mechs ×3, spikes ×3, and 20% of its hits crit ×3.', { kind: 'shield', color: 0xcc2244 }, {
          mods: { mech: { damageMult: 3, countAdd: 1 }, spikes: { damageMult: 3, countAdd: 2 } },
          traits: { crit: { chance: 0.2, mult: 3 } },
        }),
      ]),
    ],
  },

  // ── Metal ───────────────────────────────────────────────────────────
  metal: {
    cost: 360, range: 480, role: 'sniper', body: { kind: 'ground' },
    blurb: 'Sniper. Reaches most of the field; every shot bleeds. Picks the strongest by default.',
    signature: { name: 'Bloodletter', desc: 'Huge range; its shots Bleed. Bosses take ×1.25.' },
    traits: { bossBane: 1.25 },
    attacks: {
      shot: ab(80, 1600, { kind: 'bolt', look: 'needle', color: 0xddddee, speed: 1400 }, 'A long shot that bleeds.', { name: 'Blood Shot', rider: { bleed: 2500 } }),
    },
    paths: [
      path('Marksman', 'One shot, one husk', [
        up('Full Metal Jacket', 260, 'Shots hit +40 and punch through one husk.', 'scope', {
          mods: { shot: { damageAdd: 40, pierceAdd: 1 } },
        }),
        up('Steady Aim', 560, 'Holds its breath: a shot grows 30% per second waited, up to ×2.', 'scope', {
          mods: { shot: { charge: { perSec: 0.3, cap: 2 } } },
        }),
        up('Deadeye', 1950, 'Shots ×1.6, and a quarter of them crit ×3.', { kind: 'eye', color: 0xff4455 }, {
          mods: { shot: { damageMult: 1.6 } },
          traits: { crit: { chance: 0.25, mult: 3 } },
        }),
        up('Armour Piercer', 5100, 'Shots ×2.2 and each tears off 4% of current health.', { kind: 'spikes', color: 0xddddee }, {
          mods: { shot: { damageMult: 2.2, rider: { pct: 0.04, corrode: 3000 } } },
        }),
        up('Cripple Shot', 14500, 'Shots ×3, leave husks brittle (+30 per hit), and bosses take ×2.', { kind: 'skull', color: 0xff4455 }, {
          mods: { shot: { damageMult: 3, rider: { brittle: { add: 30, ms: 5000 } } } },
          traits: { bossBane: 2 },
        }),
      ]),
      path('Gunsmith', 'Faster triggers and a blood rite', [
        up('Bolt Action', 200, 'Fires 25% faster.', 'gears', {
          mods: { shot: { cooldownMult: 0.75 } },
        }),
        up('Semi-Auto', 520, 'Fires two-round bursts.', 'gears', {
          mods: { shot: { fx: { salvo: 2 } } },
        }),
        up('Blood Rite', 1750, 'ABILITY — Clot Round: a skewering round through seven. Also finishes husks under 15%.', { kind: 'banner', color: 0xcc3344 }, {
          add: { execute: ab(60, 4000, { kind: 'execute', thresholdFrac: 0.15, color: 0xcc3344 }, 'Finishes husks under 15%.', { name: 'Blood Transfusion' }) },
          active: { name: 'Clot Round', desc: 'A 1200-damage round through seven husks that bleeds.', cooldown: 25000, global: true, cast: ab(1200, 0, { kind: 'bolt', look: 'needle', color: 0xff4455, speed: 1600, pierce: 6, size: 1.6 }, 'A skewering round.', { rider: { bleed: 6000 } }) },
        }),
        up('Full Auto', 4900, 'Fires twice as fast, each round ×1.4.', { kind: 'barrel', color: 0x8899aa }, {
          mods: { shot: { cooldownMult: 0.5, damageMult: 1.4 } },
        }),
        up('Iron Rain', 14000, 'ABILITY — Iron Rain: every husk on the map takes 1500 and bleeds. All shots ×2.', { kind: 'crown', color: 0xddddee }, {
          mods: { '*': { damageMult: 2 } },
          active: { name: 'Iron Rain', desc: 'Every husk on the map takes 1500 and bleeds.', cooldown: 45000, global: true, cast: ab(1500, 0, { kind: 'field', color: 0xddddee }, 'Iron from the sky.', { rider: { bleed: 6000 } }) },
        }),
      ]),
      path('Foundry', 'Smelt gold, arm the towers around it', [
        up('Scrap Smelter', 180, 'Smelts 1 gold every second a wave is on.', 'bricks', {
          traits: { trickle: 1 },
        }),
        up('Bounty Hunter', 460, 'Kills in its range pay 25% more gold.', 'sack', {
          traits: { trickle: 1, plunder: 0.25 },
        }),
        up('Armory', 1500, 'Towers built or upgraded within 200px cost 15% less.', { kind: 'gold-trim' }, {
          traits: { discount: { radius: 200, mult: 0.85 } },
        }),
        up('Veteran Steel', 4300, 'Shots ×1.5, and +4% damage every wave it survives (up to +150%).', { kind: 'shield', color: 0xaabbcc }, {
          mods: { shot: { damageMult: 1.5 } },
          traits: { veteran: { per: 0.04, cap: 1.5 } },
        }),
        up('Adamant Foundry', 12500, 'Towers within 220px cost 30% less; smelts 6 gold a second; shots ×2; veteran to +300%.', { kind: 'crown', color: 0xffd700 }, {
          mods: { shot: { damageMult: 2 } },
          traits: { discount: { radius: 220, mult: 0.7 }, trickle: 6, veteran: { per: 0.05, cap: 3 } },
        }),
      ]),
    ],
  },

  // ── Plasma ──────────────────────────────────────────────────────────
  plasma: {
    cost: 330, range: 170, role: 'attack', body: { kind: 'ground' },
    blurb: 'A beam that never lets go and burns hotter every second it holds.',
    signature: { name: 'Pure Chaos', desc: 'Its beam ramps up: +70% damage for every second it stays locked on.' },
    traits: {},
    attacks: {
      beam: ab(50, 2600, { kind: 'beam', color: 0xaa22ff, width: 5, ms: 2500, ramp: 0.7 }, 'Plasma Burst: a beam that ramps the longer it holds.', { name: 'Plasma Burst' }),
    },
    paths: [
      path('Pure Chaos', 'A beam that runs away with itself', [
        up('Hot Plasma', 260, 'Beam burns +15 a second.', 'flame', {
          mods: { beam: { damageAdd: 15 } },
        }),
        up('Runaway', 620, 'Beam ramps +120% a second instead of +70%.', 'flame', {
          mods: { beam: { fx: { ramp: 1.2 } } },
        }),
        up('Twin Beams', 2050, 'A second beam locks on beside the first.', { kind: 'horns', color: 0xcc55ff }, {
          add: { beam2: ab(65, 2600, { kind: 'beam', color: 0xdd88ff, width: 4, ms: 2500, ramp: 1.2 }, 'A second ramping beam.', { name: 'Twin Beam' }) },
        }),
        up('Fusion', 5300, 'Both beams ×2.2 and run without a break.', { kind: 'orbit', color: 0xaa22ff }, {
          mods: { '*': { damageMult: 2.2, fx: { ms: 2600 } } },
        }),
        up('Star Core', 15000, 'Beams ×3 and ramp +200% a second. Bosses take ×1.6.', { kind: 'sun', color: 0xee99ff }, {
          mods: { '*': { damageMult: 3, fx: { ramp: 2, width: 9 } } },
          traits: { bossBane: 1.6 },
        }),
      ]),
      path('Arena', 'Unstable ground and orbital strikes', [
        up('Unstable Arena', 200, 'Adds a crackling zone on the road.', 'runes', {
          add: { arena: ab(22, 5000, { kind: 'zone', radius: 90, ms: 3500, color: 0xcc55ff, shape: 'rune' }, 'A crackling zone on the road.', { name: 'Unstable Arena', gesture: 'e' }) },
        }),
        up('Crackle', 500, 'Zones 1.3× wider; husks in them may be stunned.', 'runes', {
          mods: { arena: { areaMult: 1.3, rider: { stun: 500, chance: 0.2 } } },
        }),
        up('Orbital', 1750, 'ABILITY — Unstable Orbital: a plasma strike from orbit on the lead husk. Zones ×1.5.', { kind: 'antenna', color: 0xff66ff }, {
          mods: { arena: { damageMult: 1.5 } },
          active: { name: 'Unstable Orbital', desc: 'A 650-damage strike from orbit on the lead husk.', cooldown: 25000, global: true, cast: ab(650, 0, { kind: 'splash', radius: 150, color: 0xff66ff, delayMs: 1000, shape: 'strike' }, 'An orbital strike.', { rider: { stun: 800 } }) },
        }),
        up('Chaos Field', 4700, 'Zones ×3 and drag husks backward.', { kind: 'moat', color: 0xaa22ff }, {
          mods: { arena: { damageMult: 3, fx: { pull: 40 } } },
        }),
        up('Pure CHAOS', 13500, 'ABILITY — Pure CHAOS!: every husk on the map takes 1400 and is stunned 1.5s.', { kind: 'skull', color: 0xee99ff }, {
          mods: { arena: { damageMult: 1.5 } },
          active: { name: 'Pure CHAOS!', desc: 'Every husk on the map takes 1400 and is stunned 1.5s.', cooldown: 45000, global: true, cast: ab(1400, 0, { kind: 'field', color: 0xaa22ff }, 'Everything detonates.', { rider: { stun: 1500 } }) },
        }),
      ]),
      path('Current', 'Arcs and orbiting blades', [
        up('Arc', 220, 'Adds an arc that jumps through four husks.', 'sparks', {
          add: { arc: ab(25, 2800, { kind: 'chain', jumps: 3, jumpRange: 100, color: 0xdd88ff }, 'An arc through four.', { name: 'Plasma Current', gesture: 'r' }) },
        }),
        up('Chaos Blades', 560, 'Blades orbit the tower and cut anything close.', 'orbit', {
          add: { blades: ab(25, 400, { kind: 'aura', radius: 80, color: 0xaa22ff, look: 'orbit' }, 'Blades orbiting the tower.', { name: 'Chaos Blades' }) },
        }),
        up('Overcharge', 1850, 'Arcs jump three more, hit ×2 and fire 30% faster.', { kind: 'sparks', color: 0xffffff }, {
          mods: { arc: { countAdd: 3, damageMult: 2, cooldownMult: 0.7 } },
        }),
        up('Storm Blades', 4900, 'Blades ×3 over a wider ring and leave husks brittle.', { kind: 'orbit', color: 0xffffff }, {
          mods: { blades: { damageMult: 3, areaMult: 1.3, rider: { brittle: { add: 5, ms: 2000 } } } },
        }),
        up('Plasma Storm', 13000, 'Arcs ×3 jump six more without fading; blades ×2; slowed or stunned husks take ×1.4.', { kind: 'crown', color: 0xdd88ff }, {
          mods: { arc: { damageMult: 3, countAdd: 6, fx: { falloff: 0.97 } }, blades: { damageMult: 2 } },
          traits: { bully: 1.4 },
        }),
      ]),
    ],
  },

  // ── Gunpowder ───────────────────────────────────────────────────────
  gunpowder: {
    cost: 290, range: 2000, role: 'artillery', body: { kind: 'ground' },
    blurb: 'Mortar. Shells anywhere on the map — point it with SET TARGET, or let it pick the strongest.',
    signature: { name: 'Mortar Crew', desc: 'Unlimited range. Set a target point and it shells that spot.' },
    traits: {},
    attacks: {
      shell: ab(65, 1500, { kind: 'bolt', look: 'shell', color: 0x553377, speed: 600, lob: true, splash: 50 }, 'Musket Shot: a mortar shell.', { name: 'Mortar Shell' }),
    },
    paths: [
      path('Cannonade', 'Bigger shells, more of them', [
        up('Heavy Shell', 230, 'Shells hit +25 over a wider blast.', 'barrel', {
          mods: { shell: { damageAdd: 25, areaMult: 1.2 } },
        }),
        up('Rapid Reload', 520, 'Reloads 30% faster.', 'barrel', {
          mods: { shell: { cooldownMult: 0.7 } },
        }),
        up('Fire at Will', 1850, 'Lobs a three-shell volley every time.', { kind: 'gears', color: 0x775599 }, {
          mods: { shell: { countAdd: 2, fx: { spread: 0.6 } } },
        }),
        up('Siege Mortar', 5100, 'Shells ×2.2 over 1.4× the blast and stun for 0.4s.', { kind: 'bricks', color: 0x553377 }, {
          mods: { shell: { damageMult: 1.8, areaMult: 1.4, rider: { stun: 400 } } },
        }),
        up('Grand Battery', 14500, 'Shells ×2.5 and two more per volley; kills burst into shrapnel.', { kind: 'crown', color: 0xffaa44 }, {
          mods: { shell: { damageMult: 2.5, countAdd: 2, fx: { spread: 0.9 } } },
          traits: { shrapnel: { count: 4, frac: 0.1 } },
        }),
      ]),
      path('Demolition', 'Mines and the biggest bang there is', [
        up('Powder Mines', 180, 'Drops two mines on the road where it aims.', 'spikes', {
          add: { mines: ab(50, 5000, { kind: 'trap', count: 2, hits: 1, ms: 15000, color: 0xff6633, look: 'mine', blast: 55 }, 'Mines dropped where it aims.', { name: 'Explosive Retreat', gesture: 'e' }) },
        }),
        up('Big Bang', 460, 'Mines ×1.8 and three at a time.', 'spikes', {
          mods: { mines: { damageMult: 1.8, countAdd: 1 } },
        }),
        up('BlunderBlast', 1650, 'ABILITY — BlunderBlast: one enormous 700-damage shell on the lead husk.', { kind: 'skull', color: 0xff7722 }, {
          active: { name: 'BlunderBlast', desc: 'One enormous 700-damage shell on the lead husk.', cooldown: 25000, global: true, cast: ab(700, 0, { kind: 'splash', radius: 160, color: 0xff7722, delayMs: 1200, shape: 'strike' }, 'One enormous shell.', { rider: { stun: 600 } }) },
        }),
        up('Powder Kegs', 4300, 'Everything ×1.8; mines blast wider and shove.', { kind: 'barrel', color: 0xff6633 }, {
          mods: { '*': { damageMult: 1.8 }, mines: { areaMult: 1.4, rider: { knockback: 30 } } },
        }),
        up('Doomsday', 13000, 'ABILITY — Doomsday Barrage: every husk on the map takes 1600 and burns.', { kind: 'flame', color: 0xff3300 }, {
          mods: { '*': { damageMult: 1.5 } },
          active: { name: 'Doomsday Barrage', desc: 'Every husk on the map takes 1600 and burns.', cooldown: 50000, global: true, cast: ab(1600, 0, { kind: 'field', color: 0xff7722 }, 'A barrage over the whole map.', { rider: { burn: 4000 } }) },
        }),
      ]),
      path('Firebrand', 'Incendiaries that keep burning', [
        up('Incendiary', 150, 'Shells set husks burning.', 'flame', {
          mods: { shell: { rider: { burn: 3000 } } },
        }),
        up('Napalm', 430, 'Adds napalm that burns on the road where it lands.', 'flame', {
          add: { napalm: ab(25, 3000, { kind: 'zone', radius: 70, ms: 4000, color: 0xff6622, shape: 'fire' }, 'A pool of burning napalm.', { name: 'Napalm', rider: { burn: 2000 } }) },
        }),
        up('Cluster Fire', 1500, 'Napalm ×2 over a wider pool; shells leave husks brittle.', { kind: 'motes', color: 0xff6622 }, {
          mods: { napalm: { damageMult: 2, areaMult: 1.3 }, shell: { rider: { brittle: { add: 5, ms: 3000 } } } },
        }),
        up('Phosphorus', 4100, 'Napalm ×3 and corrodes; slowed or stunned husks take ×1.4.', { kind: 'lantern', color: 0xffee88 }, {
          mods: { napalm: { damageMult: 3, rider: { corrode: 2000 } } },
          traits: { bully: 1.4 },
        }),
        up('Inferno Battery', 12500, 'Everything ×2.5; napalm 1.5× wider for 6s; the burning dead set others alight.', { kind: 'wings', color: 0xff6622 }, {
          mods: { '*': { damageMult: 2.5 }, napalm: { areaMult: 1.5, fx: { ms: 6000 } } },
          traits: { wildfire: true },
        }),
      ]),
    ],
  },
};
