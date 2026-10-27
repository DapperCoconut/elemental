import { ElementCodex } from '../AbilityCodex';

/**
 * Pressure — the boiler-robot with the giant gauntlet.
 *
 * Verified against `src/elements/pressure.ts` and `kits/PressureKit.ts`. Every number below is a
 * constant at the top of the kit; the five shop upgrades sit in the same blocks as the abilities
 * they change. No mastery yet. No perks.
 */
const pressure: ElementCodex = {
  identity:
    'A riveted steel boiler-robot with one giant gauntlet. Every key is held to build pressure and '
    + 'let go to spend it, and every ability gets something extra at 50 and again at 100. Slam a '
    + 'target into the floor, then wind up the punch they cannot walk away from.',

  passives: [
    {
      emoji: '🔩',
      name: 'Pressure',
      basics:
        'Click, E and R are held to charge: the pressure bar under you climbs from 0 to 100 over 6 '
        + 'seconds, and letting go casts the ability at whatever it reached. You walk slower while '
        + 'holding (45% slower for the punch, 30% for E and R, 15% for Release). Only one key '
        + 'charges at a time; a stun or a disarm empties it.',
      effects: [
        { tag: 'resource', label: 'Charge rate', detail: '100 pressure in 6s (16.7 a second). The cooldown starts when you let go.' },
        { tag: 'cost', label: 'Slow walk', detail: 'Holding: Click ×0.55 speed, E/R ×0.7, F ×0.85.' },
        { tag: 'buff', label: 'Faster charging', detail: 'Exceed ×2. A full Release bank +20%. Compression Charge (R+) +15–30%, and ×2 for 1s after you are hurt.' },
      ],
      notes: [
        'Each ability states its 50 and 100 breakpoints. Above 100 (Q+ Overcharge) the scaling simply continues.',
      ],
    },
  ],

  abilities: {
    'pressure-punch': {
      basics:
        'Wind up the gauntlet and punch the nearest enemy in front of you: 8 damage plus 0.32 per '
        + 'point of pressure (40 at 100, plus a 10 bonus). At 50+ the punch carries you forward first '
        + 'and slows them; at 100 it stuns them instead.',
      cast: 'Hold Click to charge, let go to punch toward the cursor. 0.45s cooldown.',
      effects: [
        { tag: 'damage', label: 'Punch', detail: '8 + 0.32 × pressure; +10 at 100 (50 total). Reach 64px, 60° either side of your aim.' },
        { tag: 'movement', label: 'Lunge (50+)', detail: '90px at 50, up to 130px at 100, over 0.14s — the punch lands at the end of it.' },
        { tag: 'control', label: 'Slow (50+)', detail: '40% slower for 1.5s.' },
        { tag: 'control', label: 'Stun (100)', detail: '1.2s stun in place of the slow.' },
      ],
      upgrade: {
        basics:
          'Pressure-gear: the gauntlet winds itself up — 5 pressure a second while you are not holding '
          + 'Click, up to 100, shown on the ability card. Your next punch starts from it and spends it.',
        effects: [
          { tag: 'resource', label: 'Gear', detail: '+5 pressure a second, banked up to 100 for the next punch.', requiresUpgrade: 'click' },
        ],
      },
      notes: ['A 100 punch on a grounded target knocks it loose, so time the slam and the punch together.'],
    },

    'pressure-slam': {
      basics:
        'Charge a slam and drive the gauntlet into the floor: 10 damage plus 0.3 per point of pressure '
        + '(40 at 100) to everyone within 110px. At 50+ the ring is 160px. At 100 everyone hit is '
        + 'driven into the floor for 3 seconds — they cannot move, but they can still attack, and any '
        + 'hit knocks them loose.',
      cast: 'Hold E to charge, let go to slam around you. 4.5s cooldown.',
      effects: [
        { tag: 'damage', label: 'Slam', detail: '10 + 0.3 × pressure to everyone in the ring.' },
        { tag: 'area', label: 'Ring', detail: '110px; 160px at 50+.' },
        { tag: 'control', label: 'Grounded (100)', detail: 'Pinned in place for 3s. Still able to attack. Any damage frees them.' },
      ],
      upgrade: {
        basics:
          'Shell-Shock: a grounded enemy hit by one of your abilities charged to 30 or more is knocked '
          + 'loose as usual — and then stunned for 5 seconds.',
        effects: [
          { tag: 'control', label: 'Shell-Shock', detail: '5s stun when a 30+ Pressure hit frees a grounded enemy.', requiresUpgrade: 'e' },
        ],
      },
    },

    'pressure-point': {
      basics:
        'Push out a slow red orb of pure pain. The first enemy it touches takes 6 damage plus 0.14 per '
        + 'point of pressure (20 at 100) and is PainLocked for 3 seconds plus 0.07s per point (10s at '
        + '100): every ability they use stuns them for 0.3s and costs them 5 health. At 50+ the stun '
        + 'is 0.5s. At 100 the orb is bigger and faster, and each ability costs them 8.',
      cast: 'Hold R to charge, let go to launch toward the cursor. 7s cooldown.',
      effects: [
        { tag: 'damage', label: 'Orb', detail: '6 + 0.14 × pressure on contact. 85px/s, radius 14px, lasts 5.5s.' },
        { tag: 'debuff', label: 'PainLock', detail: '3s + 0.07s × pressure. Each ability they use: 0.3s stun and 5 damage.' },
        { tag: 'control', label: '50+', detail: 'PainLock stun is 0.5s.' },
        { tag: 'debuff', label: '100', detail: 'Orb 150px/s, radius 22px; each ability costs them 8.' },
      ],
      upgrade: {
        basics:
          'Compression Charge: your own orb can hit you (after its first 0.6s). It Compresses you for '
          + '12s plus 0.06s per point (18s at 100): every ability you use costs you 5 health plus 0.03 '
          + 'per point (8 at 100), but every ability charges 15% faster plus 0.15% per point (30% at '
          + '100) — and twice as fast for 1 second after you take any damage.',
        effects: [
          { tag: 'buff', label: 'Compressed', detail: '+15–30% charge rate for 12–18s; ×2 for 1s after each hit you take.', requiresUpgrade: 'r' },
          { tag: 'cost', label: 'Self-pain', detail: '5–8 health per ability used while Compressed.', requiresUpgrade: 'r' },
        ],
      },
    },

    'pressure-release': {
      basics:
        'Hold F to bank pressure, three times slower than the other keys; it keeps what it has when you '
        + 'let go. Tap F to vent it: a jet of steam along your aim for 1.5s plus 0.025s per point (4s '
        + 'at 100), doing 4 damage a second plus 0.08 per point (12 at 100). Anyone in the jet cannot '
        + 'use abilities, though they can still move. At 50+ it also slows them 15%. At 100 the jet '
        + 'ends in a blast for 30 that stuns for 1 second.',
      cast: 'Hold F to bank (18s to fill), tap F to vent toward the cursor. 9s cooldown.',
      effects: [
        { tag: 'dot', label: 'Steam jet', detail: '4 + 0.08 × pressure per second, ticking every 0.25s. 230px long (260 at 100), widening to 70px.' },
        { tag: 'control', label: 'Disarm', detail: 'Abilities locked while inside the jet.' },
        { tag: 'control', label: 'Slow (50+)', detail: '15% slower while inside.' },
        { tag: 'damage', label: 'Blast (100)', detail: '30 damage and a 1s stun to everyone in the jet as it ends.' },
        { tag: 'buff', label: 'Full bank', detail: 'While 100 is banked, every other key charges 20% faster.' },
      ],
      upgrade: {
        basics:
          'Depressurize: while 75 or more is banked, every Pressure hit does 20% more damage and bursts '
          + 'a puff of steam off its target — 6 damage and a 25% slow for 1.5s to everyone within 60px.',
        effects: [
          { tag: 'buff', label: 'Pressurized hits', detail: '+20% damage on every Pressure hit at 75+ banked.', requiresUpgrade: 'f' },
          { tag: 'damage', label: 'Steam puff', detail: '6 damage and 25% slow for 1.5s within 60px of each target.', requiresUpgrade: 'f' },
        ],
      },
      notes: ['Venting spends the whole bank, and with it the full-bank charge bonus and Depressurize.'],
    },

    'pressure-exceed': {
      basics:
        'Run the boiler past its limit for 15 seconds: you glow red and pour steam, and every ability '
        + 'charges twice as fast. When it ends you are stunned for 3 seconds.',
      cast: 'Q, instantly. An ultimate: paid for in charge.',
      effects: [
        { tag: 'buff', label: 'Exceed', detail: 'Every charge rate ×2 for 15s.' },
        { tag: 'cost', label: 'Overheat', detail: '3s stun when it runs out.' },
      ],
      upgrade: {
        basics:
          'Overcharge: during Exceed every gauge can climb past 100, up to 125. Damage, durations, '
          + 'reach and speed keep scaling with the extra pressure.',
        effects: [
          { tag: 'resource', label: 'Overcharge', detail: 'Pressure cap 125 while Exceed lasts.', requiresUpgrade: 'q' },
        ],
      },
    },
  },
};

export default pressure;
