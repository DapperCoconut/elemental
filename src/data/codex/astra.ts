import { ElementCodex } from '../AbilityCodex';

/**
 * Astra — the cracked shell with a dwarf star inside.
 *
 * Verified against `src/elements/astra.ts` and `kits/AstraKit.ts`. Every number below is a constant
 * at the top of the kit; the five shop upgrades sit in the same blocks as the abilities they
 * change. No mastery yet. No perks.
 */
const astra: ElementCodex = {
  identity:
    'A shell of deep space with a dwarf star burning inside it. Every attack is locked to a fixed '
    + 'direction — level shots, a plus and an X, a smite on whoever stands highest — until it passes '
    + 'its Star Trial and becomes the star, when everything goes where it is aimed.',

  passives: [
    {
      emoji: '🌟',
      name: 'Locked Aim',
      basics:
        'Outside star mode Astra cannot aim. Starstruck only flies level, left or right; the flares '
        + 'always erupt from Astra in a plus and an X; the smite picks whoever is highest on the '
        + 'screen. Star mode (True Self) frees all of them.',
      effects: [
        { tag: 'utility', label: 'Star mode', detail: 'Click at the cursor; both flares erupt at the cursor (up to 440px away); the smite always strikes the nearest enemy.' },
      ],
    },
  ],

  abilities: {
    'astra-starstruck': {
      basics:
        'A burst of 4 solar shots, perfectly level, to whichever side your cursor is on. Each shot is '
        + 'instant, runs to the arena wall through everything in its line, and does 4 damage.',
      cast: 'Click (hold to keep firing). 0.75s cooldown.',
      effects: [
        { tag: 'damage', label: 'Burst', detail: '4 shots, 0.07s apart, 4 damage each (16 a burst). 12px wide, pierce everything to the wall.' },
      ],
      upgrade: {
        basics:
          'Atomical Excitement: the section of wall each shot hits glows purple for 2s, then fires a '
          + 'level beam back across the arena doing 4 for every shot that excited it (up to 16). Shots '
          + 'within 20px of each other excite the same section. A wall\'s beam never excites another '
          + 'wall — except in star mode, where it can, back and forth.',
        effects: [
          { tag: 'damage', label: 'Wall beam', detail: '4 per exciting shot, up to 16, 2s after the shot.', requiresUpgrade: 'click' },
        ],
      },
    },

    'astra-solar-flares': {
      basics:
        'Two blasts of solar energy erupt from you: a plus, then 0.38s later an X. Every arm is a wide, '
        + 'instant beam to the arena wall doing 12 damage. Standing where a plus arm and an X arm '
        + 'cross takes both.',
      cast: 'E. 5s cooldown.',
      effects: [
        { tag: 'damage', label: 'Each flare', detail: '12 damage to everyone on any of its four arms. Arms 46px wide.' },
        { tag: 'area', label: 'Shape', detail: 'Plus (up, down, left, right), then X (the four diagonals).' },
      ],
      upgrade: {
        basics:
          'Cosmic Combo: a third flare follows — a ring of fire 150px out from the centre. It does 12 '
          + 'damage, or 42 to anyone either of the first two hit.',
        effects: [
          { tag: 'damage', label: 'Ring', detail: '12; 42 on anyone the plus or the X hit. 150px radius, 34px wide.', requiresUpgrade: 'e' },
        ],
      },
      notes: ['A smitten target crawls at a third of its speed — it cannot step off an arm in time.'],
    },

    'astra-smite': {
      basics:
        'After a 0.25s mark, a bolt of purple ethereal lightning strikes whoever is closest to the top '
        + 'of the screen — you included. 18 damage and a heavy slow: a third of normal speed for 2s.',
      cast: 'R. 7s cooldown.',
      effects: [
        { tag: 'damage', label: 'Bolt', detail: '18 damage, after a 0.25s mark that follows the target.' },
        { tag: 'control', label: 'Smitten', detail: 'Speed ×0.35 for 2s.' },
        { tag: 'cost', label: 'Highest body', detail: 'If you are the highest on the screen, it strikes you.' },
      ],
      upgrade: {
        basics:
          'Never Strikes Twice: for 4s after a smite, press R again for a second bolt on whoever is '
          + 'closest to the bottom of the screen.',
        effects: [
          { tag: 'damage', label: 'Second bolt', detail: '18 damage and the same slow, on the lowest body. 4s window.', requiresUpgrade: 'r' },
        ],
      },
    },

    'astra-worm-warp': {
      basics:
        'Fire a wormhole toward your cursor. The first enemy it touches takes 8 damage and swaps '
        + 'places with you. In star mode it also steals: each of their abilities that is ready goes on '
        + 'its full cooldown and the matching one of yours comes off it, and you take 25% of their '
        + 'ultimate charge.',
      cast: 'F. 9s cooldown.',
      effects: [
        { tag: 'damage', label: 'Wormhole', detail: '8 damage. 640px/s, 560px range, radius 12px.' },
        { tag: 'movement', label: 'Swap', detail: 'You and the target trade places.' },
        { tag: 'debuff', label: 'Star theft', detail: 'Star mode: their ready abilities go on cooldown, yours come off; 25% of their charge.' },
      ],
      upgrade: {
        basics:
          'Superiority Complex: a hit also takes 3s off all your cooldowns and puts 3s on all of theirs, '
          + 'and moves 20 ultimate charge from them to you. In star mode it steals harder instead: 40% '
          + 'of their charge, those 3 seconds as well, and 20 of their health.',
        effects: [
          { tag: 'buff', label: 'Cooldown theft', detail: '−3s on yours, +3s on theirs; 20 charge.', requiresUpgrade: 'f' },
          { tag: 'heal', label: 'Star theft+', detail: 'Star mode: 40% of their charge and 20 health drained.', requiresUpgrade: 'f' },
        ],
      },
    },

    'astra-true-self': {
      basics:
        'Begin the 8-second Star Trial. A stability bar appears under your health, starting at 50 of '
        + '100: every point of damage you deal adds 1.2, every point you take costs 1, and it drains 7 '
        + 'a second on its own. Keep it above zero to the end and you become the star for 15 seconds. '
        + 'Let it empty and True Self is gone for the rest of the match.',
      cast: 'Q. An ultimate: paid for in charge.',
      effects: [
        { tag: 'resource', label: 'Stability', detail: 'Starts 50/100. +1.2 per damage dealt, −1 per damage taken, −7 a second.' },
        { tag: 'cost', label: 'Failure', detail: 'True Self locked for the rest of the match.' },
        { tag: 'area', label: 'Corona', detail: 'Star mode: 90px. Burns enemy shots, 4 damage to enemies every 0.5s, destroys summons within 70px each second.' },
        { tag: 'damage', label: 'The slap', detail: 'Star mode, once: Q teleports you to the nearest enemy and slaps them into the wall — 60 damage and a 1.4s stun.' },
      ],
      upgrade: {
        basics:
          'Gods Do Not Fear Mortals: hold Q to make the trial harder — a star over your head for the '
          + 'first 0.35s and each 1.1s after, up to five. While holding you are invincible but cannot '
          + 'move or attack. Each star adds 3 a second to the drain, 40% to what a hit costs, and 3s '
          + 'to star mode. Beat a five-star trial and the giant star you truly are reaches into the '
          + 'arena and crushes your opponent outright.',
        effects: [
          { tag: 'cost', label: 'Harder trial', detail: 'Per star: drain +3/s, hit cost ×(1 + 0.4 per star).', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Longer star', detail: '+3s of star mode per star.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Five stars', detail: 'A beaten five-star trial kills every enemy on the field.', requiresUpgrade: 'q' },
        ],
      },
      notes: ['Click+ in star mode: wall beams can excite the walls they reach.', 'F+ in star mode: the theft is harder and takes health.'],
    },
  },
};

export default astra;
