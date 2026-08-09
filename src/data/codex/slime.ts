import { ElementCodex } from '../AbilityCodex';

/**
 * Acid (element id `slime`) — an element that wins by changing the floor.
 *
 * Verified against `src/elements/slime.ts`, `kits/SlimeKit.ts`, the slime block of
 * `data/Upgrades.ts` and Acid Mastery in `data/Mastery.ts`. Numbers here are the ones the kit
 * actually applies.
 */
const slime: ElementCodex = {
  identity:
    'The only element whose real resource is square footage. Acid puts permanent pools on the '
    + 'ground and then reads how much of the arena they cover: coverage decides how hard Purge '
    + 'hits, whether Snake Burrow can be entered at all, how many lashes a click throws, and '
    + 'whether the mastery bindable is castable. Its damage per second is unremarkable and its '
    + 'damage per minute is not, because nothing it puts down ever goes away.',

  passives: [
    {
      emoji: '🟢',
      name: 'Acid Pools',
      magic:
        'Every pool this element lays down is permanent. A fresh one is neon and visibly eating '
        + 'outward at its rim; the first thing that steps in it takes a real bite and the pool goes '
        + 'dark for the rest of the match — still there, still bubbling, still burning anyone who '
        + 'stands in it, just quietly.',
      effects: [
        { tag: 'dot', label: 'First touch', detail: '5 damage the first time any enemy enters a fresh (neon) pool. That spends the pool\'s bite; it cools permanently.' },
        { tag: 'dot', label: 'Cooled tick', detail: '2 damage every 2s to anything standing in a cooled pool, forever. Nothing expires a pool — only the end of the match removes it.' },
        { tag: 'area', label: 'The pool', detail: '56px radius from Vile Spray. Budded, dripped, leaked and toad pools are smaller — 18–31px, 22px and 20px and 26px respectively.' },
        { tag: 'utility', label: 'Board limit', detail: 'A hard cap of 60 pools at once. Past that, every automatic source (Spray Spread, Rattling Strike drips, Breakdown leaks, Murk toads) silently stops making new ones.' },
      ],
      notes: [
        'Pools damage enemies only. Standing in your own is free and is the precondition for half the kit.',
        'Cooling is per-pool and per-match. There is no way to re-light a spent pool.',
      ],
    },
    {
      emoji: '🌊',
      name: 'Acid Coverage',
      magic:
        'The kit keeps a running figure for how much of the arena is under acid — the total area of '
        + 'every live pool against the size of the screen. Nothing displays it, but four separate '
        + 'things read it, and an acid fighter who spends the opening of a fight painting the floor '
        + 'is not stalling; they are charging.',
      effects: [
        { tag: 'buff', label: 'Purge stages', detail: 'Under 24% coverage Purge is 15 damage / 3s strip; under 50% it is 30 / 8s at 1.25× size and speed; at 50% or more it is 45 / 15s at 1.5×.' },
        { tag: 'buff', label: 'Denser barrage', detail: 'Poison Whip throws 20 lashes instead of 15 while you are standing in any pool — 20 damage a volley rather than 15.' },
        { tag: 'utility', label: 'Burrow gate', detail: 'Snake Burrow can only be entered while standing in acid, and surfaces you automatically the moment you drift out of every pool.' },
        { tag: 'utility', label: 'Breakdown gate', detail: 'The Breakdown mastery bindable refuses to cast below 50% coverage and says so.' },
      ],
      notes: [
        'Coverage is computed as overlapping circle area against screen area, so stacked pools count twice — a tight cluster reads as more coverage than the ground it actually covers.',
        'Acid Mastery tracks it two ways: 500% laid down across all matches, and a single-match high of 80%.',
      ],
    },
  ],

  abilities: {
    'poison-whip': {
      magic:
        'Not one shot but a spit — fifteen thin lashes of acid flung out of the hands in a ragged '
        + 'burst over about a third of a second, each one leaving a tail of droplets behind it. '
        + 'Individually they are nothing. As a stream they are the element\'s entire single-target '
        + 'answer, and standing in your own acid makes the stream thicker.',
      cast: 'Click, aimed at the cursor. The barrage is fired on the press; holding does nothing.',
      effects: [
        { tag: 'damage', label: 'The barrage', detail: '15 lashes at 1 damage each, staggered 25ms apart — 15 damage if every one connects.' },
        { tag: 'damage', label: 'In your own acid', detail: '20 lashes instead of 15 while you are standing in any pool, checked at the moment of the press.' },
        { tag: 'utility', label: 'Flight', detail: '650 px/s, spawned 30px out, with up to ±5° of jitter per lash so the stream fans slightly rather than stacking on one line.' },
        { tag: 'utility', label: 'Availability', detail: '0.4s cooldown, so the barrages overlap slightly at full rate of fire.' },
      ],
      upgrade: {
        magic:
          'Corrosive Bite takes something the target cannot get back. Each lash still only does its '
          + 'one point, but it eats an equal point out of their maximum, so a full volley into '
          + 'somebody who then heals to the top is a volley they never really undid.',
        effects: [
          { tag: 'debuff', label: 'Max HP eaten', detail: 'Every lash that connects reduces the target\'s maximum HP by the damage it dealt — 1 per lash, so 15 or 20 per full volley.', requiresUpgrade: 'click' },
          { tag: 'debuff', label: 'Permanent', detail: 'The loss is not a timed debuff. It is gone for the rest of the match and healing cannot restore it.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Because each lash is a separate projectile, anything that blocks one shot blocks one point of damage — a shield charge is spent on a single lash.',
        'The barrage keeps firing from wherever the caster is when each lash goes out, so walking sideways mid-volley genuinely spreads it.',
      ],
    },

    'vile-spray': {
      magic:
        'The caster sweeps an arm and throws three mouthfuls of acid down the aim line, spaced out '
        + 'so they land near, middle and far. Each one breaks on the floor and starts eating. This '
        + 'is not a damage ability so much as the ability that builds every other one — three pools '
        + 'is roughly 4% of the arena, and 50% is what the good version of the kit needs.',
      cast: 'E, along the aim. Instant.',
      effects: [
        { tag: 'summon', label: 'Three pools', detail: 'Placed at 110px, 180px and 250px along the aim line, each 56px in radius.' },
        { tag: 'damage', label: 'Fresh bite', detail: '5 damage to the first enemy to touch each pool, then that pool cools to the standing 2-per-2s tick.' },
        { tag: 'area', label: 'Coverage gained', detail: 'Three 56px circles is roughly 4% of a full arena — six casts to reach the Purge stage-2 threshold, thirteen to reach stage 3.' },
        { tag: 'utility', label: 'Availability', detail: '6s cooldown, which is the real limit on how fast the floor can be painted.' },
      ],
      upgrade: {
        magic:
          'Spray Spread stops the pools from being a fixed footprint. Every couple of seconds each '
          + 'one may quietly bud a smaller pool beside it, and those bud in turn — left alone, a '
          + 'single spray becomes a creeping colony, and the coverage figure climbs while you are '
          + 'doing something else entirely.',
        effects: [
          { tag: 'summon', label: 'Budding', detail: 'Every 2s each pool independently rolls a 20% chance to spawn a child pool 20–50px away.', requiresUpgrade: 'e' },
          { tag: 'area', label: 'Child size', detail: '55% of the parent\'s radius, floored at 18px. A 56px pool buds a 31px one; that buds an 18px one; those bud 18px ones forever.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Capped', detail: 'Budding stops entirely at the 60-pool board limit, which a spreading colony reaches on its own in a long fight.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'Children are fresh pools, so each one carries its own 5-damage first bite.',
        'Placement is fixed at 110/180/250 regardless of how far the cursor is — aiming at your own feet still throws all three pools out to full range.',
      ],
    },

    'snake-burrow': {
      magic:
        'The surface closes over the caster and they go under it. While they are down there they '
        + 'cannot be touched by anything and they move faster than they walk — but only along their '
        + 'own acid, because the moment they run out of pool to swim through the ground spits them '
        + 'back out. It is the most complete defence in the game and it is only available on ground '
        + 'you have already spent six-second cooldowns preparing.',
      cast:
        'R to submerge, R again to surface. Refuses to start unless you are standing in a pool, and '
        + 'surfaces you automatically the moment you leave every pool.',
      effects: [
        { tag: 'shield', label: 'Invincible', detail: 'Fully invincible while burrowed — not damage reduction, a flat immunity to everything.' },
        { tag: 'movement', label: 'Faster underground', detail: '×1.25 move speed while under, and the fighter is drawn at 40% alpha under a churning mound.' },
        { tag: 'cost', label: 'Acid only', detail: 'Entry requires standing in acid; drifting off the last pool forces a surface with the message "Out of acid — surfaced!".' },
        { tag: 'utility', label: 'Availability', detail: '2s cooldown on entering. Surfacing is free and instant.' },
      ],
      upgrade: {
        magic:
          'Rattling Strike makes coming back up an attack. The mound does not open, it bursts — and '
          + 'it bursts red, the one warm colour in the element. Anything standing over the hole is '
          + 'hit, and then keeps leaking acid out of the wound wherever it walks for the next five '
          + 'seconds.',
        effects: [
          { tag: 'damage', label: 'Surfacing blast', detail: '20 damage in a 90px radius every time you un-burrow, however you un-burrow — pressing R or being forced out both count.', requiresUpgrade: 'r' },
          { tag: 'dot', label: 'Dripping', detail: 'Enemies caught by the blast drop a 22px acid pool at their own feet every 1s for 5s — 5 fresh pools each, and they choose where.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Impact', detail: 'A 180ms camera shake on the burst, so an ambush is felt as well as seen.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Surfacing next to somebody with this upgrade is the mastery\'s Ambush Predator requirement — 50 of them.',
        'The drip pools are laid where the victim runs, which is normally away from your acid, so this upgrade paints the parts of the arena you were not going to reach.',
        'With the Murk divine perk, burrowing also leaves an acid toad on the surface that hops 130px at a time and dribbles a 26px pool on every landing until you come up.',
      ],
    },

    purge: {
      magic:
        'A heavy, slow ball of concentrated acid, thrown with the whole body. It does not just hurt '
        + '— it strips. Whoever it lands on has their speed boosts boiled off and can be seen '
        + 'steaming for the duration. How big and how fast and how hard it is depends entirely on '
        + 'how much of the floor you have already ruined.',
      cast: 'F, aimed at the cursor. Instant. Stage is read off arena acid coverage at the moment of the throw.',
      effects: [
        { tag: 'damage', label: 'Stage 1 — under 24% acid', detail: '15 damage, 3s of Purged, 220 px/s at normal size.' },
        { tag: 'damage', label: 'Stage 2 — under 50% acid', detail: '30 damage, 8s of Purged, 275 px/s at 1.25× size.' },
        { tag: 'damage', label: 'Stage 3 — 50% acid or more', detail: '45 damage, 15s of Purged, 330 px/s at 1.5× size.' },
        { tag: 'debuff', label: 'Purged', detail: 'For the duration, any positive speed multiplier on the target is clamped to 1. Slows still apply — it removes their buffs, not their debuffs.' },
        { tag: 'debuff', label: 'Strips built-in bonuses', detail: 'Against an invasion husk it also cancels a baked-in speed bonus outright and removes the whole of a variant\'s bonus maximum HP, once per target.' },
        { tag: 'utility', label: 'Availability', detail: '6s cooldown at every stage.' },
      ],
      upgrade: {
        magic:
          'Meltdown only fires off a fully-charged throw, and when it does the target stops being hit '
          + 'and starts dissolving — visibly smaller every second, leaking puddles dyed their own '
          + 'colour. Whatever the Purge stripped off them is sitting in those puddles, and you can '
          + 'walk over and put it on.',
        effects: [
          { tag: 'dot', label: 'The melt', detail: 'A stage-3 Purge melts the target for 3s, ticking once a second: 10% of their current HP as damage, 10% of their maximum HP removed, and their body shrunk by 10%.', requiresUpgrade: 'f' },
          { tag: 'debuff', label: 'Shrink floor', detail: 'Size bottoms out at 30% of normal, which three ticks of ×0.9 does not reach — one melt takes them to about 73%.', requiresUpgrade: 'f' },
          { tag: 'summon', label: 'Melt puddles', detail: 'One 24px puddle per tick — 3 per melt — dyed the victim\'s element colour, each carrying a snapshot of every stat buff they had.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Stealing them', detail: 'Walking into a melt puddle grants you every buff it carries for 8s: their speed, damage, crit, dodge, cooldown or regen figures, at their values, not yours.', requiresUpgrade: 'f' },
          { tag: 'cost', label: 'One set at a time', detail: 'Picking up a second puddle reverts the first grant before applying the new one, and an empty puddle just says "Empty puddle...".', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Stage 3 requires 50% coverage — the same threshold Breakdown needs — so Meltdown and the mastery bindable come online together.',
        'The maximum HP removed by the melt is permanent for the match, as with Corrosive Bite.',
      ],
    },

    'acid-apocalypse': {
      magic:
        'The sky opens over everything you have already ruined. For eight seconds acid rain falls '
        + 'in real drops that break where they land, and every pool on the board becomes lethal '
        + 'rather than merely unpleasant. It adds no acid of its own — it is a multiplier on work '
        + 'already done, which is why an acid player opens with E and not with Q.',
      cast: 'Q. Instant, no lock. Every live pool flares on the cast.',
      effects: [
        { tag: 'dot', label: 'Rain damage', detail: '6 damage every 0.5s — 12 a second — to every enemy standing in any pool, for the full 8s. That is up to 96 damage to somebody who never moves.' },
        { tag: 'area', label: 'Duration and reach', detail: '8 seconds, over every pool simultaneously. There is no radius; the pools are the radius.' },
        { tag: 'cost', label: 'Needs a board', detail: 'With no pools down it does nothing at all. The ability is worth exactly as much as the floor you painted before casting it.' },
        { tag: 'utility', label: 'Availability', detail: '25s cooldown, and a 320ms camera shake on the cast.' },
      ],
      upgrade: {
        magic:
          'Acid Flood makes the rain constructive. For as long as it is falling, every pool on the '
          + 'board is slowly widening — so the ultimate no longer just spends your coverage, it '
          + 'raises it, and the arena you fight in afterwards is a worse place than the one you cast '
          + 'it in.',
        effects: [
          { tag: 'area', label: 'Growth', detail: 'Every pool grows 6px of radius per second while the rain is up — 48px over the full 8s, if it has room.', requiresUpgrade: 'q' },
          { tag: 'area', label: 'Growth cap', detail: 'Each pool stops at 2.2× the radius it was created with, so a 56px Vile Spray pool caps at 123px and an 18px bud caps at 40px.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Permanent gain', detail: 'The new size does not shrink back when the rain stops. Every cast permanently enlarges the whole board.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The rain tick is per pool, so a target standing where two pools overlap takes 6 from each — overlapping deliberately is worth doing.',
        'Rain kills count toward the mastery\'s Meltdown requirement, as do pool ticks and footprints.',
      ],
    },
  },

  mastery: {
    'acid-walker': {
      magic:
        'The acid stops needing to be poured. For a few seconds after stepping off a pool, a '
        + 'mastered acid fighter is still tracking it — burning prints appearing behind them on '
        + 'clean ground as they walk. Come up out of a burrow and the next few prints are worse: '
        + 'darker, wider and hotter, because you brought half the pool up with you.',
      effects: [
        { tag: 'utility', label: 'The window', detail: '5 seconds of print-laying begins the moment you step off your last pool onto clean ground.' },
        { tag: 'summon', label: 'Spacing', detail: 'One print every 34px walked, so standing still lays nothing and sprinting lays a solid line.' },
        { tag: 'dot', label: 'Normal prints', detail: '15px radius, 2 damage every 0.5s, lasting 3 seconds each.' },
        { tag: 'dot', label: 'Boosted prints', detail: '26px radius and 4 damage every 0.5s for prints laid within 3s of surfacing from Snake Burrow.' },
        { tag: 'utility', label: 'Always on', detail: 'No key, no cooldown, no cost. It is purely a consequence of where you have walked.' },
      ],
      notes: [
        'Footprints do not count toward acid coverage — they are their own list, so they cannot push Purge into a higher stage or unlock Breakdown.',
        'This is the passive half of Acid Mastery — it needs no bind and no key.',
      ],
    },
    breakdown: {
      magic:
        'The body gives up holding its shape. The caster roots where they stand, comes apart, and '
        + 'sprays two hundred lashes of acid outward in every direction at once for three seconds '
        + 'while acid leaks out of them and pools underneath. It is only castable when the arena is '
        + 'already half acid, which means it is the reward for having played the element properly.',
      cast:
        'Bindable to E, R, F or Q, replacing that slot\'s base ability for the match. Refuses to cast '
        + 'below 50% arena acid coverage.',
      effects: [
        { tag: 'damage', label: 'The spray', detail: '200 lashes at 1 damage each, released evenly over 3 seconds — one every 15ms — in fully random directions at 650 px/s.' },
        { tag: 'cost', label: 'Rooted', detail: 'Move speed is set to 0 for the whole 3 seconds. You cannot walk out of anything while it runs.' },
        { tag: 'summon', label: 'Leaked pools', detail: '12 pools of 20px radius dropped under you over the 3 seconds, one every 250ms, scattered up to 16px either way.' },
        { tag: 'cost', label: 'Coverage gate', detail: 'Under 50% coverage the cast is refused outright with "NEED 50% ACID" and the cooldown is not spent.' },
        { tag: 'utility', label: 'Availability', detail: '12s cooldown, independent of whichever slot it is bound over.' },
      ],
      notes: [
        'The lashes are aimed nowhere, so its damage against a single target is a function of how close they are standing — at point blank a large fraction of 200 connects.',
        'Binding it deletes that slot\'s base ability for the match, and Breakdown wants coverage, so binding it over E (Vile Spray) fights itself.',
      ],
    },
  },
};

export default slime;
