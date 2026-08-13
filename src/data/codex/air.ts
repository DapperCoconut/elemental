import { ElementCodex } from '../AbilityCodex';

/**
 * Air — the wind dancer. Verified against `src/elements/air.ts`, `kits/AirKit.ts` (whose
 * tuning constants are all named and at the top of the file) and the air block of
 * `data/Upgrades.ts`.
 */
const air: ElementCodex = {
  identity:
    'Not a caster — a dancer with two war fans, who treats the air she displaces as the weapon and '
    + 'the momentum she keeps as the defence. Air is the only element whose survivability is something '
    + 'you build during the fight rather than something you spend.',

  passives: [
    {
      emoji: '🍃',
      name: 'Wind Dodge',
      basics:
        'A banked chance to void an incoming hit outright, earned by landing abilities rather than '
        + 'ticking up on a timer: +10% per successful dodge, +25% from a grapple ram, +15% from a '
        + 'returning glaive and +20% from Hundred Winds.',
      effects: [
        { tag: 'shield', label: 'Dodge pool', detail: 'A percentage chance to void an incoming hit outright. Banked by landing abilities rather than granted on a timer.' },
        { tag: 'buff', label: 'Base earn rate', detail: '+10% per successful dodge, +25% from a grapple ram, +15% from a returning glaive, +20% from Hundred Winds.' },
      ],
    },
    {
      emoji: '🌀',
      name: 'Momentum',
      basics:
        'A speed meter that fills 5% per second for as long as the dance goes unbroken, capped at 100%, '
        + 'and drops 10% every time you are hit. Nothing else reduces it.',
      effects: [
        { tag: 'buff', label: 'Build', detail: '+5% per second while the dance is unbroken, capped at 100%.' },
        { tag: 'cost', label: 'Break', detail: '−10% every time you are hit. Nothing else reduces it.' },
      ],
    },
  ],

  abilities: {
    'wind-splice': {
      basics:
        'One press, two attacks. A 20-damage fan cut inside 100px across roughly 109° of sweep, and a '
        + '12-damage shear thrown down the aim line at 640 px/s for up to 760px with a 28px hit radius. '
        + 'You do not choose between them. 0.7s cooldown.',
      cast: 'Click, aimed at the cursor. Instant, no lock.',
      effects: [
        { tag: 'damage', label: 'Fan cut', detail: '20 damage inside 100px, across a 0.95 radian half-arc (~109° of total sweep) on the aim line.' },
        { tag: 'damage', label: 'Wind shear', detail: '12 damage from the shear thrown off the cut — 640 px/s, up to 760px of travel, 28px hit radius.' },
        { tag: 'utility', label: 'Rate', detail: '0.7s cooldown. Both halves fire from the same press; you do not choose between them.' },
      ],
      upgrade: {
        basics:
          'Every third Wind Splice throws a full-damage Spin Dance alongside it, off cooldown — and the '
          + 'free spin refunds cooldown on contact exactly as a manual one does, 2 seconds off every other '
          + 'ability.',
        effects: [
          { tag: 'damage', label: 'Free Spin Dance', detail: 'Every 3rd Wind Splice throws a full-damage Spin Dance alongside it, off cooldown.', requiresUpgrade: 'click' },
          { tag: 'buff', label: 'Still refunds', detail: 'The free spin refunds cooldown on contact exactly as a manual one does — 2s off every other ability.', requiresUpgrade: 'click' },
        ],
      },
    },

    'spin-dance': {
      basics:
        'A 20-damage sweep of everything within 115px, with no aim of its own. The real purpose is the '
        + 'refund: on contact every other ability comes back 2 seconds sooner. 6s cooldown.',
      cast: 'E. Instant, centred on the caster — it has no aim.',
      effects: [
        { tag: 'damage', label: 'Sweep', detail: '20 damage to everything within 115px of the caster.' },
        { tag: 'buff', label: 'Tempo refund', detail: 'On contact, every other ability comes back 2s sooner. This is the ability\'s real purpose.' },
        { tag: 'utility', label: 'Availability', detail: '6s cooldown, and it refunds itself through the free spins Whirlwind grants.' },
      ],
      upgrade: {
        basics:
          'Banks 2 charges instead of one, and a second cast inside 1.8s becomes a flip along the cursor '
          + '— a rectangle 135px by 46px half-extents with you in the middle of it. Land both halves '
          + 'cleanly for +15% wind dodge.',
        effects: [
          { tag: 'resource', label: 'Two charges', detail: 'Spin Dance banks up to 2 charges instead of one.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'The flip', detail: 'The second consecutive cast is a flip along the cursor: a rectangle 135px half-length by 46px half-width with the caster in the middle of it, inside a 1.8s window.', requiresUpgrade: 'e' },
          { tag: 'buff', label: 'Clean pair', detail: 'Land both halves cleanly for +15% wind dodge.', requiresUpgrade: 'e' },
        ],
      },
    },

    'gale-glaive': {
      basics:
        'Thrown at the cursor for 15 damage at 940 px/s, it parks for 2 seconds ticking 10 damage every '
        + '0.4s — up to 50 to somebody who will not move — then returns for 20, more than the throw, and '
        + 'banks +15% wind dodge as it reaches your hand. The dancer is unarmed until it does.',
      cast: 'R, thrown at the cursor. The dancer is unarmed until it returns.',
      effects: [
        { tag: 'damage', label: 'Outbound', detail: '15 damage on the way out, at 940 px/s with a 30px hit radius.' },
        { tag: 'area', label: 'Parked', detail: 'Holds position for 2s, ticking 10 damage every 0.4s to anything standing in it — up to 50 damage to someone who does not move.' },
        { tag: 'damage', label: 'Return', detail: '20 damage on the way back, more than the throw.' },
        { tag: 'buff', label: 'Dodge bank', detail: '+15% wind dodge when the glaive returns to hand.' },
      ],
      upgrade: {
        basics:
          'A pair of wooden phantoms stays on the park spot for 5 seconds after the glaive comes home, '
          + 'ticking 7 damage into anything standing in them.',
        effects: [
          { tag: 'summon', label: 'Phantom fans', detail: 'A pair of wooden phantoms remains on the park spot for 5s after the return.', requiresUpgrade: 'r' },
          { tag: 'dot', label: 'Phantom ticks', detail: '7 damage per tick to anything standing in them.', requiresUpgrade: 'r' },
        ],
      },
    },

    'sky-grapple': {
      basics:
        '1400 px/s toward the cursor for up to 420ms — the fastest movement available to any element — '
        + 'and nothing can touch you while you are in flight. Flying into a fighter inside 44px rams them '
        + 'and banks +25% wind dodge, the largest single grant in the kit.',
      cast: 'F, aimed at the cursor. Untouchable for the duration of the flight.',
      effects: [
        { tag: 'movement', label: 'Grapple flight', detail: '1400 px/s for up to 420ms — the fastest movement available to any element.' },
        { tag: 'shield', label: 'Untouchable', detail: 'Nothing connects with the dancer while she is in flight.' },
        { tag: 'damage', label: 'Ram', detail: 'Flying into a fighter inside a 44px radius rams them.' },
        { tag: 'buff', label: 'Dodge bank', detail: '+25% wind dodge on a ram — the largest single grant in the kit.' },
      ],
      upgrade: {
        basics:
          'The ram now also deals half of all the damage you have dealt in the previous 10 seconds, '
          + 'knocks the target back 620 units, and hands you wind dodge equal to that damage figure as a '
          + 'percentage.',
        effects: [
          { tag: 'damage', label: 'Accumulated damage', detail: 'The ram deals 50% of all damage you have dealt in the previous 10s, on top of the ram itself.', requiresUpgrade: 'f' },
          { tag: 'control', label: 'Knockback', detail: '620 units of knockback on the rammed target.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Dodge conversion', detail: 'Grants wind dodge equal to that damage figure as a percentage.', requiresUpgrade: 'f' },
        ],
      },
    },

    'wind-breaker': {
      basics:
        'Five seconds as a 155px tornado with debris orbiting between 62 and 140px, dealing 12 damage '
        + 'every 0.5s to anything inside — 120 to a target that stays for all of it. You move at 0.6× and '
        + 'cannot cast while it is up. The collapse throws you along your aim at 1150 speed, deals 25 on '
        + 'a wall impact, and banks +20% wind dodge. 25s cooldown.',
      cast: 'Q. 5s of tornado form, then the throw along wherever you are aiming at the end.',
      effects: [
        { tag: 'area', label: 'Tornado form', detail: '5s, 155px radius, with debris orbiting between 62px and 140px at 3.4 rad/s.' },
        { tag: 'dot', label: 'Storm ticks', detail: '12 damage every 0.5s to anything inside — 120 damage to a target that stays in it for the whole duration.' },
        { tag: 'cost', label: 'Slowed', detail: 'You move at 0.6× speed while the tornado is up, and cannot cast.' },
        { tag: 'damage', label: 'The launch', detail: 'The collapse throws along the aim at 1150 speed; 25 damage on a wall impact.' },
        { tag: 'buff', label: 'Dodge bank', detail: '+20% wind dodge from Hundred Winds.' },
        { tag: 'utility', label: 'Availability', detail: '25s cooldown.' },
      ],
      upgrade: {
        basics:
          'Every ability stays usable inside the funnel, every attack that lands during the storm banks '
          + '+10% wind dodge, and every attack you land — at all times, not only in the tornado — deals '
          + 'bonus damage equal to a fifth of your wind dodge percentage. A 60% pool is +12 on every hit.',
        effects: [
          { tag: 'utility', label: 'Free casting', detail: 'Every ability is usable while in tornado form.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Dodge per hit', detail: '+10% wind dodge for each attack that lands during the storm.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Dodge as damage', detail: 'Every attack you land deals bonus damage equal to your wind dodge percentage divided by 5 — a 60% pool is +12 on every hit. It applies at all times, not only inside the funnel.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Storm bolts thrown during tornado form deal 10 damage each.',
      ],
    },
  },

  perks: {
    hawk: {
      basics:
        'F fires an eagle at the cursor instead of a grapple, and on a hit it drags the enemy to your '
        + 'cursor rather than dragging you to them. The price is the whole escape: no more 1400 px/s '
        + 'untouchable flight, which was the kit\'s only disengage.',
      cast: 'Passive. Replaces what F does.',
      effects: [
        { tag: 'control', label: 'Reversed grapple', detail: 'F fires an eagle at the cursor. On hit it drags the enemy to your cursor instead of dragging you.' },
        { tag: 'cost', label: 'No longer an escape', detail: 'You give up the 1400 px/s untouchable flight — the kit\'s only disengage — in exchange for the pull.' },
      ],
    },
  },
  mastery: {
    /**
     * The Momentum passive above only exists once mastery is on — `AirKit.updateMomentum` zeroes
     * the meter outright when `masteryActive` is false. It is listed in both places on purpose:
     * as a passive because that is how it plays, and here because that is what you are buying.
     */
    'dancers-momentum': {
      basics:
        'Switched off entirely unless Air Mastery is on. +5% move speed for every second you go '
        + 'untouched, to a ceiling of +100% at twenty clean seconds, less 10% for every hit that actually '
        + 'gets through — a dodged hit costs nothing. A second draft ring under you brightens from 0.55 '
        + 'to 1.5 intensity as the meter fills.',
      cast: 'Passive. It is switched off entirely until Air Mastery is active.',
      effects: [
        { tag: 'buff', label: 'The climb', detail: '+5% move speed every second untouched — twenty clean seconds is the cap.' },
        { tag: 'buff', label: 'The ceiling', detail: '+100%. At full momentum the dancer moves at double speed.' },
        { tag: 'cost', label: 'The setback', detail: '−10% for every hit that actually gets through. A dodged hit costs nothing.' },
        { tag: 'utility', label: 'The tell', detail: 'A second draft ring builds under you, brightening from 0.55 to 1.5 intensity as the meter fills — distinct from the wind-dodge ring so the two read apart.' },
      ],
      notes: [
        'Only damage taken reduces it. Standing still, casting, being slowed and being grabbed all leave the meter alone.',
        'Because the wind dodge voids a hit outright rather than reducing it, a dodged blow does not break the dance — the two mastery-era systems are built to compound.',
      ],
    },
    'winds-of-change': {
      basics:
        'A bindable reset: every ability comes off cooldown at once, Spin Dance refills all of its '
        + 'charges — both, with Expert Dancer — and you bank +20 wind dodge on top of whatever you had '
        + 'already earned. 25s cooldown.',
      cast: 'Bindable to E, R, F or Q.',
      effects: [
        { tag: 'buff', label: 'Full reset', detail: 'Every ability comes off cooldown at once.' },
        { tag: 'resource', label: 'Refilled spins', detail: 'Spin Dance refills all of its charges — both of them with Expert Dancer.' },
        { tag: 'shield', label: 'Banked dodge', detail: '+20 wind dodge on top of whatever you had already earned.' },
        { tag: 'utility', label: 'Availability', detail: '25s cooldown.' },
      ],
    },
  },
};

export default air;
