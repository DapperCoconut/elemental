import { ElementCodex } from '../AbilityCodex';

/**
 * Venom (element id `slime`) — the serpent. It was Acid, and Slime before that; the id never moved.
 *
 * Verified against `src/elements/slime.ts`, `kits/SlimeKit.ts`, `kits/AcidGrid.ts`, the slime
 * block of `data/Upgrades.ts` and Venom Mastery in `data/Mastery.ts`. Numbers here are the ones
 * the kit actually applies.
 */
const slime: ElementCodex = {
  identity:
    'A serpent that wins on two clocks at once. Every lash, bite and second spent on its acid lays '
    + 'toxin, and toxin never fades: it burns, then drips, then weakens, then eats maximum HP, and at '
    + '1000 it kills outright. The second clock is the floor — a grid of permanent acid whose coverage, '
    + 'shown on the gauge across the top, decides how hard the bite lands, whether the whip carries '
    + 'double toxin and when the mastery can shed. The long tail is part of its hitbox, so it is easy to '
    + 'hit and hard to run from.',

  passives: [
    {
      emoji: '🐍',
      name: 'Serpentine',
      basics:
        'A long tail trails behind you, sampled from the path you walked — 14 knots 13px apart, about '
        + '180px of serpent — and it counts as part of your hitbox. Any enemy shot that crosses it hits '
        + 'you, even if it never came near your body. It adds no health. While you dodge the tail drops '
        + 'out of the hitbox entirely, and the dodge itself carries you three times as far.',
      effects: [
        { tag: 'cost', label: 'The tail', detail: '14 knots 13px apart — about 180px behind you — and every one of them is hitbox. A shot within 9px of it hits you for its full damage. No extra health comes with it.' },
        { tag: 'movement', label: 'Long dodge', detail: 'The Space dodge goes 3× as far: 1560 px/s for the 280ms dash instead of 520.' },
        { tag: 'shield', label: 'Tail drops', detail: 'While the dodge lasts, the tail is not a hitbox at all — it is drawn as a faint after-image.' },
        { tag: 'utility', label: 'Under the acid', detail: 'Burrowed, the tail goes under with you and cannot be hit either.' },
      ],
      notes: [
        'An idle serpent still lies at full length: standing still does not shorten the tail.',
        'Shed Skin (mastery) shortens it by a third each time, for the rest of the match.',
      ],
    },
    {
      emoji: '☠️',
      name: 'Toxin',
      basics:
        'Stacks laid by the whip (1 a lash, 2 at 50% acid), the bite (12), standing on your acid (3 a '
        + 'second) and Rattling Strike (×1.5). They never fade, and each tier keeps everything below it: '
        + '25 burns for 3 a second; 50 makes the victim drip acid as they walk; 100 cuts their damage by '
        + '20% and burns for 5; 250 takes 50 off their maximum HP; 500 takes another 100, cuts their damage '
        + 'by a further 20% and burns for 8; and 1000 kills them.',
      effects: [
        { tag: 'dot', label: '25+', detail: '3 damage a second, every second, forever.' },
        { tag: 'summon', label: '50+', detail: 'They drip acid as they walk — a 12px splash of your acid every 30px, laid a step behind them.' },
        { tag: 'debuff', label: '100+', detail: 'They deal 20% less damage, and the burn rises to 5 a second.' },
        { tag: 'debuff', label: '250+', detail: '50 maximum HP gone (not health — the cap).' },
        { tag: 'debuff', label: '500+', detail: 'Another 100 maximum HP gone, another 20% off their damage (40% in all), and 8 a second.' },
        { tag: 'damage', label: '1000', detail: 'Instant death — true damage, retried every 0.6s if something refuses it.' },
      ],
      notes: [
        'The drips at 50+ are your acid, so they count towards coverage and they poison whoever stands in them — usually the dripper.',
        'Online, the stacks are decided on the serpent\'s machine and mirrored to the victim.',
      ],
    },
    {
      emoji: '🟢',
      name: 'Acid Floor',
      basics:
        'Your acid is a grid of 16px cells across the whole arena, so overlapping sprays never count '
        + 'twice. Fresh acid glows: the first body to walk over a fresh cell takes 0.3 damage for it '
        + 'and cools it — about 4 damage crossing a whole splash. Spent acid stays forever, and anyone '
        + 'standing on any of your acid takes 1 damage and 3 toxin every second.',
      effects: [
        { tag: 'damage', label: 'Fresh cells', detail: '0.3 damage per fresh cell walked over, which cools it — roughly 4 for crossing a full Vile Spray splash.' },
        { tag: 'dot', label: 'Standing', detail: '1 damage and 3 toxin a second to anyone on your acid, the moment they step on and every second after.' },
        { tag: 'area', label: 'Permanent', detail: 'Acid never dries — 100% of what you lay is still on the floor when the match ends.' },
        { tag: 'utility', label: 'Re-lighting', detail: 'Spraying over spent acid makes it fresh again.' },
      ],
      notes: [
        'Your acid only hurts your enemies. Standing in it is the precondition for Snake Burrow and the 20-lash whip.',
      ],
    },
    {
      emoji: '📊',
      name: 'Acidification',
      basics:
        'The gauge across the top of the screen is the share of the arena that is your acid. At 24% and '
        + '50% Festering Bite reaches its second and third stage; at 50% every Poison Whip lash carries 2 '
        + 'toxin instead of 1; and at 20%, 40%, 60% and 80% Venom Mastery earns one Shed Skin each.',
      effects: [
        { tag: 'buff', label: 'Bite stages', detail: 'Under 24%: stage 1. 24–50%: stage 2. 50% or more: stage 3, which is also what Meltdown (F+) needs.' },
        { tag: 'buff', label: 'Double toxin', detail: 'At 50% or more every whip lash lands 2 toxin instead of 1 — the red line on the gauge.' },
        { tag: 'utility', label: 'Milestones', detail: '20%, 40%, 60% and 80% each hand over one Shed Skin, once per match — the diamonds on the gauge light up as you pass them.' },
      ],
      notes: [
        'Venom Mastery tracks it two ways: 500% laid down across all matches, and a single-match high of 80%.',
      ],
    },
  ],

  abilities: {
    'poison-whip': {
      basics:
        'A barrage of 15 lashes at 1 damage and 1 toxin each, staggered 25ms apart — or 20 lashes if '
        + 'you are standing in your own acid when you press it. At 50% coverage every lash carries 2 '
        + 'toxin. They fly 650 px/s from 30px out with up to ±5° of jitter. 0.4s cooldown.',
      cast: 'Click, aimed at the cursor. The barrage is fired on the press.',
      effects: [
        { tag: 'damage', label: 'The barrage', detail: '15 lashes at 1 damage each, 25ms apart — 15 damage if every one connects.' },
        { tag: 'debuff', label: 'Toxin', detail: '1 toxin per lash that lands, or 2 at 50% coverage — up to 40 a volley.' },
        { tag: 'damage', label: 'In your own acid', detail: '20 lashes instead of 15 while you stand on any of your acid.' },
        { tag: 'utility', label: 'Availability', detail: '0.4s cooldown; 650 px/s with ±5° of jitter per lash.' },
      ],
      upgrade: {
        basics:
          'Every lash that connects also eats 1 point of the target\'s maximum HP — 15 or 20 a full volley, '
          + 'gone for the rest of the match.',
        effects: [
          { tag: 'debuff', label: 'Max HP eaten', detail: 'Every lash that connects reduces the target\'s maximum HP by the 1 damage it dealt — 15 or 20 per full volley.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Each lash is its own projectile, so a shield charge is spent on a single lash — strip it first with Festering Bite.',
      ],
    },

    'vile-spray': {
      basics:
        'Throws three 58px splashes of acid along the aim line at 110px, 180px and 250px. Each one lays '
        + 'fresh acid on the grid — roughly 1.5% of the arena per splash once it is not overlapping '
        + 'anything. 6s cooldown, which is the real limit on how fast the gauge fills.',
      cast: 'E, along the aim. Instant.',
      effects: [
        { tag: 'summon', label: 'Three splashes', detail: 'At 110px, 180px and 250px along the aim, each 58px in radius.' },
        { tag: 'area', label: 'Coverage', detail: 'About 1.5% of a full arena per clean splash — fourteen casts to the 20% milestone if none of them overlap.' },
        { tag: 'dot', label: 'On it', detail: 'Fresh cells nip (0.3 each), and standing on it is 1 damage and 3 toxin a second.' },
        { tag: 'utility', label: 'Availability', detail: '6s cooldown.' },
      ],
      upgrade: {
        basics:
          'Splashes spread on their own: every 2 seconds each one rolls a 20% chance to bud a smaller '
          + 'splash 20–50px away, at 55% of the parent\'s radius with a floor of 18px. Budding stops at 60 '
          + 'splashes.',
        effects: [
          { tag: 'summon', label: 'Budding', detail: 'Every 2s each splash rolls a 20% chance to spawn a child 20–50px away.', requiresUpgrade: 'e' },
          { tag: 'area', label: 'Child size', detail: '55% of the parent\'s radius, floored at 18px.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Capped', detail: 'Budding stops at 60 splashes.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Placement is fixed at 110/180/250 regardless of the cursor distance.',
      ],
    },

    'snake-burrow': {
      basics:
        'Submerges you: fully invincible at ×1.25 move speed, drawn at 40% alpha under a churning mound, '
        + 'with the tail under too. Only enterable while standing on your acid, and drifting off it forces '
        + 'you up. 2s cooldown to enter; surfacing is free.',
      cast: 'R to submerge, R again to surface.',
      effects: [
        { tag: 'shield', label: 'Invincible', detail: 'Fully invincible while burrowed — a flat immunity, not a reduction.' },
        { tag: 'movement', label: 'Faster underground', detail: '×1.25 move speed while under.' },
        { tag: 'cost', label: 'Acid only', detail: 'Entry needs acid underfoot; leaving your acid surfaces you.' },
        { tag: 'utility', label: 'Availability', detail: '2s cooldown on entering. Surfacing is free and instant.' },
      ],
      upgrade: {
        basics:
          'Coming up is an attack: 20 damage in a 90px radius every time you surface, and everyone caught '
          + 'has their toxin multiplied by 1.5 and drips a 22px splash of your acid every second for 5 '
          + 'seconds.',
        effects: [
          { tag: 'damage', label: 'Surfacing blast', detail: '20 damage in a 90px radius whenever you un-burrow, by choice or forced out.', requiresUpgrade: 'r' },
          { tag: 'debuff', label: 'Toxin ×1.5', detail: 'Every toxin stack on everyone caught is multiplied by 1.5 — 400 becomes 600.', requiresUpgrade: 'r' },
          { tag: 'summon', label: 'Dripping', detail: 'They drop a 22px splash of your acid every 1s for 5s.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'The ×1.5 is worth most late: surfacing under someone sitting at 340 toxin pushes them through 500.',
        'With the Murk divine perk, a toad hops about on the surface while you are under, dribbling 26px of acid wherever it lands.',
      ],
    },

    'festering-bite': {
      basics:
        'Bite forward in a 110° arc. Purge goes first — it strips every buff the target has, shields '
        + 'included — then the fangs deal 15 damage and 12 toxin. The bite grows with your coverage: '
        + 'under 24% it reaches 70px and purges for 3s; at 24% it is 30 damage, 85px and 8s; at 50% it is '
        + '45 damage, 100px and 15s. 6s cooldown.',
      cast: 'F, toward the cursor. Instant, melee — every enemy in the arc is bitten.',
      effects: [
        { tag: 'damage', label: 'Stage 1 — under 24% acid', detail: '15 damage, 70px reach, 3s of Purged.' },
        { tag: 'damage', label: 'Stage 2 — 24% to 50%', detail: '30 damage, 85px reach, 8s of Purged.' },
        { tag: 'damage', label: 'Stage 3 — 50% or more', detail: '45 damage, 100px reach, 15s of Purged.' },
        { tag: 'debuff', label: 'Toxin', detail: '12 toxin on every bite that lands.' },
        { tag: 'debuff', label: 'Purged', detail: 'Every buff is stripped on the bite — shield charges, shield HP, clotted, weak and sap HP, evasion and timed buffs — and positive speed boosts stay suppressed for the duration.' },
        { tag: 'debuff', label: 'Husks', detail: 'Against an invasion husk it also cancels a baked-in speed bonus and removes a variant\'s bonus max HP, once per husk.' },
      ],
      upgrade: {
        basics:
          'A stage-3 bite now melts: 3 seconds ticking once a second for 10% of current HP, 10% of max HP '
          + 'and 10% of size (floored at 30%). Each tick drops a puddle dyed their colour that carries the '
          + 'buffs the bite stripped; walk into one to wear them for 8 seconds.',
        effects: [
          { tag: 'dot', label: 'The melt', detail: 'A stage-3 bite melts for 3s: once a second, 10% of their current HP, 10% of their max HP and 10% of their size.', requiresUpgrade: 'f' },
          { tag: 'summon', label: 'Melt puddles', detail: 'One 24px puddle per tick, each carrying a snapshot of the buffs the bite took.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Stealing them', detail: 'Walking into a puddle grants you those buffs for 8s, at their values.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Because the strip lands before the damage, a shield never absorbs the bite.',
      ],
    },

    'acid-apocalypse': {
      basics:
        'Eight seconds of acid rain over all of your acid at once. Every enemy standing on it takes 6 '
        + 'damage every 0.5s — 12 a second, up to 96 — on top of the floor\'s own 1 damage and 3 toxin. '
        + 'With no acid down it does nothing. 25s cooldown.',
      cast: 'Q. Instant, no lock.',
      effects: [
        { tag: 'dot', label: 'Rain damage', detail: '6 damage every 0.5s to every enemy on your acid, for 8s — up to 96.' },
        { tag: 'area', label: 'Reach', detail: 'There is no radius: every one of your 16px acid cells is under the rain.' },
        { tag: 'utility', label: 'Availability', detail: '25s cooldown, a 320ms camera shake on the cast.' },
      ],
      upgrade: {
        basics:
          'Your acid creeps outward while the rain falls: every 0.5s, every clean cell touching acid has a '
          + '15% chance to fill, and the new acid stays.',
        effects: [
          { tag: 'area', label: 'Creep', detail: 'Each rain beat (0.5s), every clean cell bordering your acid has a 15% chance to become acid — roughly a cell every 3 seconds at the edge.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Permanent gain', detail: 'The new acid never dries, so every cast permanently raises the gauge.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Rain kills count toward the mastery\'s Meltdown requirement.',
      ],
    },
  },

  perks: {
    electrolysis: {
      basics:
        'Your splashes become a circuit. Every 1.4 seconds a current arcs between two Vile Spray splashes '
        + 'within 220px of each other, chosen at random, dealing 12 damage to anything within 20px of the '
        + 'line and jolting it to 45% speed for 0.45s. One arc in five surges: 36 damage, and it jumps on to '
        + 'a third splash.',
      cast: 'Passive. It starts arcing the moment you have two splashes close enough to conduct.',
      effects: [
        { tag: 'damage', label: 'The arc', detail: '12 damage to anything within 20px of the line between two splashes, every 1.4 seconds.' },
        { tag: 'debuff', label: 'The jolt', detail: 'Anything the current crosses is dropped to 45% speed for 0.45s.' },
        { tag: 'damage', label: 'Surge', detail: 'A 20% chance per arc: 36 damage instead of 12, and it chains to a third splash.' },
        { tag: 'area', label: 'Conducting range', detail: '220px between splash centres.' },
      ],
      notes: [
        'One Vile Spray already leaves two pairs inside conducting range, and Spray Spread buds splashes 20–50px off their parents.',
      ],
    },
  },

  mastery: {
    'acid-walker': {
      basics:
        'Stepping off your acid starts a 5-second window in which you lay a print every 34px walked. '
        + 'Prints are 15px and deal 2 damage every 0.5s for 3 seconds, or 26px and 4 if laid within 3 '
        + 'seconds of surfacing from Snake Burrow.',
      effects: [
        { tag: 'utility', label: 'The window', detail: '5 seconds of prints from the moment you step off your acid.' },
        { tag: 'summon', label: 'Spacing', detail: 'One print every 34px walked.' },
        { tag: 'dot', label: 'Normal prints', detail: '15px, 2 damage every 0.5s, lasting 3 seconds.' },
        { tag: 'dot', label: 'Boosted prints', detail: '26px and 4 damage every 0.5s within 3s of surfacing.' },
      ],
      notes: [
        'Prints are their own thing, not acid: they do not count toward coverage and do not poison.',
      ],
    },
    'shed-skin': {
      basics:
        'No cooldown. Each acidification milestone — 20%, 40%, 60% and 80% — banks one shed, so a match '
        + 'holds at most four. Shedding leaves your old skin lying where you were: your tail comes out 33% '
        + 'shorter and you 15% faster, for the rest of the match and stacking each time, while 48 lashes '
        + 'spiral out of you over 0.6s and a 48px pool and six 22px splashes of acid land around you.',
      cast: 'Bindable to R, F or Q, replacing that slot\'s ability for the match. Refuses without a banked shed and says where the next one is.',
      effects: [
        { tag: 'utility', label: 'Charges', detail: 'One shed at each of 20%, 40%, 60% and 80% coverage — four per match at most, no cooldown between them.' },
        { tag: 'buff', label: 'Smaller', detail: 'Tail ×0.67 per shed — after four, about a fifth of its length.' },
        { tag: 'movement', label: 'Quicker', detail: '+15% move speed per shed, stacking: +60% after all four.' },
        { tag: 'damage', label: 'The barrage', detail: '48 lashes spiralling out over 0.6s, each 1 damage with whip toxin (2 at 50% coverage).' },
        { tag: 'summon', label: 'Acid', detail: 'A 48px pool under you and six 22px splashes 40–80px around.' },
      ],
      notes: [
        'A shorter tail is a smaller hitbox, so every shed makes you harder to hit as well as faster.',
      ],
    },
  },
};

export default slime;
