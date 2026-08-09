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
      magic:
        'Every fan that opens throws air, and the dancer keeps some of it wound around her. It is not a '
        + 'shield and not a heal — it is a chance that an incoming hit simply finds nobody there. The '
        + 'pool only ever spends itself on hits it actually saved, so a stockpile is never wasted on a '
        + 'blow that was going to miss anyway.',
      effects: [
        { tag: 'shield', label: 'Dodge pool', detail: 'A percentage chance to void an incoming hit outright. Banked by landing abilities rather than granted on a timer.' },
        { tag: 'buff', label: 'Base earn rate', detail: '+10% per successful dodge, +25% from a grapple ram, +15% from a returning glaive, +20% from Hundred Winds.' },
      ],
    },
    {
      emoji: '🌀',
      name: 'Momentum',
      magic:
        'Staying in motion is the whole discipline. The longer the dancer goes untouched the faster the '
        + 'routine runs — and a single clean hit knocks the rhythm back down.',
      effects: [
        { tag: 'buff', label: 'Build', detail: '+5% per second while the dance is unbroken, capped at 100%.' },
        { tag: 'cost', label: 'Break', detail: '−10% every time you are hit. Nothing else reduces it.' },
      ],
    },
  ],

  abilities: {
    'wind-splice': {
      magic:
        'The basic figure of the whole style: one fan snaps open across the near arc and the displaced '
        + 'air keeps travelling after the blade has already closed. Two hits from one motion, at two '
        + 'ranges — the cut for anyone who let her get close, and the shear for whoever backed off.',
      cast: 'Click, aimed at the cursor. Instant, no lock.',
      effects: [
        { tag: 'damage', label: 'Fan cut', detail: '20 damage inside 100px, across a 0.95 radian half-arc (~109° of total sweep) on the aim line.' },
        { tag: 'damage', label: 'Wind shear', detail: '12 damage from the shear thrown off the cut — 640 px/s, up to 760px of travel, 28px hit radius.' },
        { tag: 'utility', label: 'Rate', detail: '0.7s cooldown. Both halves fire from the same press; you do not choose between them.' },
      ],
      upgrade: {
        magic:
          'Whirlwind counts the routine. Every third figure carries a full turn with it, thrown free — '
          + 'the dancer is no longer alternating between attacks and spins, she is doing both.',
        effects: [
          { tag: 'damage', label: 'Free Spin Dance', detail: 'Every 3rd Wind Splice throws a full-damage Spin Dance alongside it, off cooldown.', requiresUpgrade: 'click' },
          { tag: 'buff', label: 'Still refunds', detail: 'The free spin refunds cooldown on contact exactly as a manual one does — 2s off every other ability.', requiresUpgrade: 'click' },
        ],
      },
    },

    'spin-dance': {
      magic:
        'A full 360° turn with both fans extended, taking everything within reach. It is the tempo '
        + 'ability rather than the damage one: connecting with it pulls the rest of the kit forward in '
        + 'time, which is how the dance keeps going instead of stalling on cooldowns.',
      cast: 'E. Instant, centred on the caster — it has no aim.',
      effects: [
        { tag: 'damage', label: 'Sweep', detail: '20 damage to everything within 115px of the caster.' },
        { tag: 'buff', label: 'Tempo refund', detail: 'On contact, every other ability comes back 2s sooner. This is the ability\'s real purpose.' },
        { tag: 'utility', label: 'Availability', detail: '6s cooldown, and it refunds itself through the free spins Whirlwind grants.' },
      ],
      upgrade: {
        magic:
          'Expert Dancer banks the turn. Used back to back the second is not a spin at all — she flips '
          + 'along the cursor line, ending up somewhere else with a long rectangle of cut air behind her.',
        effects: [
          { tag: 'resource', label: 'Two charges', detail: 'Spin Dance banks up to 2 charges instead of one.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'The flip', detail: 'The second consecutive cast is a flip along the cursor: a rectangle 135px half-length by 46px half-width with the caster in the middle of it, inside a 1.8s window.', requiresUpgrade: 'e' },
          { tag: 'buff', label: 'Clean pair', detail: 'Land both halves cleanly for +15% wind dodge.', requiresUpgrade: 'e' },
        ],
      },
    },

    'gale-glaive': {
      magic:
        'Both fans locked together and thrown as a single spinning glaive. It flies to the cursor, parks '
        + 'itself on the spot and keeps cutting whatever stands there, then comes back to her hand — and '
        + 'the return trip hits harder than the throw did.',
      cast: 'R, thrown at the cursor. The dancer is unarmed until it returns.',
      effects: [
        { tag: 'damage', label: 'Outbound', detail: '15 damage on the way out, at 940 px/s with a 30px hit radius.' },
        { tag: 'area', label: 'Parked', detail: 'Holds position for 2s, ticking 10 damage every 0.4s to anything standing in it — up to 50 damage to someone who does not move.' },
        { tag: 'damage', label: 'Return', detail: '20 damage on the way back, more than the throw.' },
        { tag: 'buff', label: 'Dodge bank', detail: '+15% wind dodge when the glaive returns to hand.' },
      ],
      upgrade: {
        magic:
          'Gale Afterimage leaves the shape of the fans behind. When the real pair comes home a pair of '
          + 'wooden phantoms stays parked where they were, still turning, still cutting — the spot stays '
          + 'denied long after the dancer has moved on.',
        effects: [
          { tag: 'summon', label: 'Phantom fans', detail: 'A pair of wooden phantoms remains on the park spot for 5s after the return.', requiresUpgrade: 'r' },
          { tag: 'dot', label: 'Phantom ticks', detail: '7 damage per tick to anything standing in them.', requiresUpgrade: 'r' },
        ],
      },
    },

    'sky-grapple': {
      magic:
        'A hook of hard air thrown at the cursor, and the dancer pulled along it faster than anything '
        + 'else in the game moves. For the length of the flight she is not really present — she is air '
        + 'travelling between two points, and nothing can touch her until she arrives.',
      cast: 'F, aimed at the cursor. Untouchable for the duration of the flight.',
      effects: [
        { tag: 'movement', label: 'Grapple flight', detail: '1400 px/s for up to 420ms — the fastest movement available to any element.' },
        { tag: 'shield', label: 'Untouchable', detail: 'Nothing connects with the dancer while she is in flight.' },
        { tag: 'damage', label: 'Ram', detail: 'Flying into a fighter inside a 44px radius rams them.' },
        { tag: 'buff', label: 'Dodge bank', detail: '+25% wind dodge on a ram — the largest single grant in the kit.' },
      ],
      upgrade: {
        magic:
          'Final Flight makes the ram a settling of accounts. Everything she has dealt over the last ten '
          + 'seconds is totted up, half of it goes into the body she just hit, and the same figure comes '
          + 'back to her as dodge. A long clean routine turns the grapple into a finisher.',
        effects: [
          { tag: 'damage', label: 'Accumulated damage', detail: 'The ram deals 50% of all damage you have dealt in the previous 10s, on top of the ram itself.', requiresUpgrade: 'f' },
          { tag: 'control', label: 'Knockback', detail: '620 units of knockback on the rammed target.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Dodge conversion', detail: 'Grants wind dodge equal to that damage figure as a percentage.', requiresUpgrade: 'f' },
        ],
      },
    },

    'wind-breaker': {
      magic:
        'Five seconds of being the weather. The dancer stops being a figure in the arena and becomes a '
        + 'tornado standing in it — debris orbiting out to 140px, everything inside taking a beating twice '
        + 'a second — and when it collapses she throws the whole stored column along the cursor line.',
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
        magic:
          'Eye of the Storm removes the one restriction that made the tornado a commitment. She keeps her '
          + 'whole kit inside it — and every hit that lands while the storm is up feeds the dodge pool, '
          + 'which in turn feeds the damage. It is the kit\'s only genuine scaling loop.',
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
      magic:
        'The grapple is thrown as a bird rather than a hook, and it reverses the whole ability. '
        + 'Instead of hauling the dancer to the point, the hawk takes hold of whoever it hits and '
        + 'hauls *them* to her cursor. F stops being an escape and becomes a summons.',
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
      magic:
        'Uninterrupted motion is the reward. Every second nobody has touched the dancer the '
        + 'routine runs faster, all the way to double speed — and the first hit that lands takes '
        + 'a tenth of it back. There is no cast and no key; it is the difference between a Air '
        + 'player who has been left alone and one who has not.',
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
      magic:
        'Blossom sweeps up around the dancer and the routine restarts from the top. Everything is '
        + 'off cooldown, the spins are refilled, and the dodge pool grows on top of whatever was '
        + 'already banked. It is not a new ability so much as permission to do the last ten seconds '
        + 'again immediately.',
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
