import { ElementCodex } from '../AbilityCodex';

/**
 * Light — a racing game wearing a fighting game's clothes.
 *
 * Verified against `src/elements/light.ts`, `kits/LightKit.ts`, the light block of
 * `data/Upgrades.ts`, the Flicker perk in `data/Perks.ts` and Light Mastery in
 * `data/Mastery.ts`. Numbers here are the ones the kit actually applies.
 */
const light: ElementCodex = {
  identity:
    'Hold the mouse and you stop being a fighter and become a car: half size, permanently moving, '
    + 'steering with the cursor, gaining speed on the straights and losing it in the corners. All '
    + 'the damage is in the lance out front, and the lance is worth six at a crawl and a hundred and '
    + 'six flat out. Every other key exists to keep the needle up — a heading snap that costs no '
    + 'speed, ramps that boost, a trick that boosts, and an ultimate that is 125 teleports.',

  passives: [
    {
      emoji: '🏎️',
      name: 'The Acceleration Meter',
      basics:
        'Light is driven, not walked, and this is the throttle. Holding your heading within about 23° '
        + 'of where the cursor asks builds +175 px/s² to a top speed of 620 — 1240 with Redline. '
        + 'Cornering costs −3600 px/s² scaled by how sharp the turn is, floored at a 160 px/s coast, so a '
        + 'full reversal empties the meter almost instantly. Steering itself tightens as you go: 2.6π '
        + 'rad/s at a standstill down to 1.1π at top speed. The meter is also your damage: the lance '
        + 'deals 6 + 100 × ratio², so half a bar is 31 and a full one 106, and Prism Ramp lances read the '
        + 'same figure when they fire. Blink, Prism Ramp and Light Trick all grant the same boost — a '
        + 'window with your speed floored at 207 px/s, a third of top — so they only accelerate you if '
        + 'you were slower than that.',
      effects: [
        { tag: 'buff', label: 'Straightaway', detail: '+175 px/s² of speed while your heading is within 0.4 radians (about 23°) of where the cursor is asking you to go. Top speed 620 px/s, or 1240 with the Click+ Redline upgrade.' },
        { tag: 'cost', label: 'Cornering', detail: '−3600 px/s² scaled by how sharp the turn is, floored at a 160 px/s coast. A full 180° reversal empties the meter almost instantly.' },
        { tag: 'utility', label: 'Steering', detail: 'Turn rate falls from 2.6π rad/s at a standstill to 1.1π rad/s at top speed — the faster you go, the wider you have to take the line.' },
        { tag: 'damage', label: 'What it is worth', detail: 'The lance deals 6 + 100 × ratio², so half a meter is 31 damage and a full one is 106. Prism Ramp lances read the same figure at the moment they fire.' },
        { tag: 'buff', label: 'Boosts', detail: 'Blink, Prism Ramp and Light Trick all grant the same thing: a window during which your speed is held at a floor of 207 px/s (a third of top speed). They accelerate you only if you were slower than that.' },
      ],
      notes: [
        'The meter only runs while Click is held. Letting go stands you back up at full size and freezes the number where it was.',
        'The Aurora divine perk feeds the meter directly: every wound you take adds 70 speed plus 4 per point of damage, straight onto the car.',
      ],
    },
  ],

  abilities: {
    'light-lance': {
      basics:
        'Hold Click to drop into car mode: drawn at half scale and given a constant velocity along your '
        + 'heading, unable to stop, with a 160 px/s floor. The lance tip sits 34px ahead and deals 6 + '
        + '100 × (speed ratio)² to anything within 30px of it — 6 at a crawl, 106 at a full meter — on a '
        + '250ms per-target cooldown, so driving through somebody at speed lands about four hits a '
        + 'second. No cooldown at all; the only cost of standing up is that you stop accelerating.',
      cast: 'Hold Click to enter car mode; release to stand back up. No cooldown at all.',
      effects: [
        { tag: 'movement', label: 'Car mode', detail: 'The fighter is drawn at 0.5 scale and given a constant velocity along its heading. You cannot stop; the floor of the meter is a 160 px/s coast.' },
        { tag: 'damage', label: 'Lance contact', detail: '6 + 100 × (speed ratio)² damage to anything within 30px of the lance tip, which sits 34px out in front. That is 6 at a crawl and 106 at a full meter.' },
        { tag: 'utility', label: 'Hit rate', detail: 'A 250ms per-target cooldown on the tip, so driving straight through somebody at speed lands roughly four hits a second.' },
        { tag: 'utility', label: 'No cooldown', detail: 'Free to flick in and out of. The only cost of standing back up is that you stop accelerating.' },
      ],
      upgrade: {
        basics:
          'Top speed doubles from 620 to 1240 px/s, and since the lance formula reads the ratio against '
          + 'the new ceiling the top of the meter is still 106. Above 75% of the doubled bar the four '
          + 'screen edges tint red, up to 0.4 alpha at full — and touching any arena wall while in that '
          + 'danger zone deals 50 damage to you, shatters the lance and drops your speed to 0 outright.',
        effects: [
          { tag: 'buff', label: 'Doubled ceiling', detail: 'Top speed goes from 620 to 1240 px/s. The lance damage formula reads the ratio against the new ceiling, so the top of the meter is still 106.', requiresUpgrade: 'click' },
          { tag: 'utility', label: 'The danger zone', detail: 'Above 75% of the doubled meter the four screen edges tint red, fading up to 0.4 alpha at a full bar.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'Wall crash', detail: 'Touching any arena wall while in the danger zone deals 50 damage to you, shatters the lance and drops your speed to 0 outright.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'A boost floor of 207 px/s is less than a sixth of the Redline ceiling, so with this upgrade the three boost abilities stop meaningfully accelerating you and become pure anti-stall.',
        'While Killer Kebab riders are on the lance the wall-crash check is skipped entirely — riders take the impact instead of you.',
      ],
    },

    blink: {
      basics:
        'Snaps your heading straight to the cursor with no speed lost — the one turn the meter does not '
        + 'charge you for — plus 600ms with your speed floored at 207 px/s, so it is also a small push '
        + 'out of a stall. Two charges, each refilling 5 seconds after it is spent, and it refuses to '
        + 'fire while Speed \'O\' Light is running.',
      cast: 'E. Instant. Spends one charge; charges refill independently.',
      effects: [
        { tag: 'movement', label: 'Free corner', detail: 'Heading snaps straight to the cursor with no speed loss — the one turn the acceleration meter does not charge you for.' },
        { tag: 'resource', label: 'Charges', detail: '2 charges held, each refilling 5s after it was spent. Two hard corners back to back, then a wait.' },
        { tag: 'buff', label: 'Blink boost', detail: '600ms with your speed floored at 207 px/s, so blinking out of a stall is also a small push.' },
        { tag: 'cost', label: 'Not during Q', detail: 'Blink refuses to fire while Speed \'O\' Light is running.' },
      ],
      upgrade: {
        basics:
          'E becomes hold-and-release. Your velocity is zeroed while it is down but your acceleration is '
          + 'preserved, so a charge is a pause rather than a reset, and the release grants a boost scaling '
          + 'from 400ms at a tap to 1600ms at a full 2-second hold on top of the heading snap. The charge '
          + 'is spent on the press, not the release, so starting one you never finish still costs it. Steam '
          + 'vents every 130ms and reddens with the hold, so an opponent can read exactly how big the '
          + 'launch will be.',
        effects: [
          { tag: 'cost', label: 'Rooted while held', detail: 'Velocity is zeroed for as long as E is down. Your acceleration is preserved rather than lost, so a charge is a pause, not a reset.', requiresUpgrade: 'e' },
          { tag: 'buff', label: 'Scaling boost', detail: 'Release grants a boost window that scales linearly from 400ms at a tap to 1600ms at a full 2s hold, on top of the heading snap.', requiresUpgrade: 'e' },
          { tag: 'resource', label: 'Same charges', detail: 'A charge is spent the moment you press, not when you release — starting a charge you never finish still costs one of the two.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Visible wind-up', detail: 'Steam vents every 130ms and reddens with the hold, so an opponent can read exactly how big the launch is going to be.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'With the Flicker perk this is 3 charges on a 3s refill, and each Blink leaves an afterimage of the car that flares 0.4s later for 12 damage inside 62px.',
        'Standing still under Steam Charge means the lance is not moving either, so a charge is 2 seconds of dealing nothing.',
      ],
    },

    'prism-ramp': {
      basics:
        'Plants a permanent ramp 56px ahead along your heading — or at the cursor if you are not '
        + 'driving — triggered by anything within 34px. Driving over your own gives you 1.5 seconds of '
        + 'speed floored at 207 px/s and fires 3 prism lances at 520 px/s in a 22°-spaced cone along the '
        + 'ramp\'s heading, each dealing the same 6 + 100 × ratio² as the lance, read off your speed at '
        + 'the moment of the trigger. Five ramps may exist and a sixth silently removes the oldest. 8s '
        + 'cooldown, so a five-ramp course takes 32 seconds to lay.',
      cast: 'R, planted 56px ahead of you along your heading (or the cursor, if you are not driving).',
      effects: [
        { tag: 'summon', label: 'The ramp', detail: 'Permanent. Five may exist at once; planting a sixth silently removes the oldest. Triggered by anything coming within 34px.' },
        { tag: 'buff', label: 'Ramp boost', detail: '1.5s of your speed floored at 207 px/s when you drive over your own ramp.' },
        { tag: 'damage', label: 'Prism lances', detail: '3 projectiles at 520 px/s in a 22°-spaced cone along the ramp\'s heading, each dealing the same 6 + 100 × ratio² the lance does — read off your speed at the moment of the trigger.' },
        { tag: 'utility', label: 'Availability', detail: '8s cooldown, so a five-ramp course takes 32 seconds to lay.' },
      ],
      upgrade: {
        basics:
          'Driving into your own ramp no longer rides it: your speed is set to 0, car mode ends, the ramp '
          + 'is destroyed and a drill is launched instead. It flies 900 px/s until it touches something and '
          + 'then 90 px/s while it bites, lives 4 seconds with a 26px contact radius, deals 2 to 5 damage '
          + 'scaling with the speed ratio you paid in, and re-applies a 0.5s stun every 0.5s for as long as '
          + 'it is grinding — the target is held until the drill dies.',
        effects: [
          { tag: 'cost', label: 'Everything you had', detail: 'Your speed is set to 0, car mode ends, and the ramp is destroyed rather than being ridden.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Drill damage', detail: '2 to 5 damage on contact, scaling linearly with the speed ratio you paid in.', requiresUpgrade: 'r' },
          { tag: 'control', label: 'Pinned', detail: 'A 0.5s stun re-applied every 0.5s for as long as it is grinding into them — held in place until the drill dies.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Flight', detail: '900 px/s until it touches something, then 90 px/s (10%) while it bites. 4s lifetime, 26px contact radius.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Ramps are triggered by anybody, not just their owner — an opponent who runs over your ramp still eats the three lances, they just get no boost.',
        'Drill hits are the mastery\'s Driller requirement (50) and riding your own ramps is Stunt Course (150).',
        'The damage on the drill is tiny; its value is the lock, not the number.',
      ],
    },

    'light-trick': {
      basics:
        'A 5-damage burst of everything within 50px, in or out of car mode, with no lock. If it '
        + 'actually hits something it also grants 1.2 seconds with your speed floored at 207 px/s; a '
        + 'whiff grants nothing. 1s cooldown, the shortest in the kit after the lance itself.',
      cast: 'F. Instant, no lock, works in or out of car mode.',
      effects: [
        { tag: 'damage', label: 'The burst', detail: '5 damage to everything within 50px of you.' },
        { tag: 'buff', label: 'Trick boost', detail: '1.2s of your speed floored at 207 px/s — but only if the burst actually hit something. A whiff grants nothing.' },
        { tag: 'utility', label: 'Availability', detail: '1s cooldown, the shortest in the kit after the lance itself.' },
      ],
      upgrade: {
        basics:
          'F now pops a ramp into twelve javelins: evenly spaced around a full circle at 480 px/s, 5 '
          + 'damage each — 60 damage of coverage off a 1-second cooldown. The boost becomes the longer of '
          + 'the two windows, 1.5 seconds rather than 1.2, and the ramp is not consumed, so the same one '
          + 'can be popped again on the next cooldown.',
        effects: [
          { tag: 'damage', label: 'Twelve javelins', detail: '12 projectiles evenly spaced around a full circle at 480 px/s, 5 damage each — 60 damage of coverage from a 1s-cooldown ability.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Both boosts', detail: 'The boost window becomes the longer of the two — 1.5s, the ramp figure — rather than the trick\'s 1.2s.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'No ramp consumed', detail: 'The ramp is not destroyed by a javelin burst. The same ramp can be popped again on the next cooldown.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'The ramp search includes the opponent\'s ramps, and the javelins belong to whoever owns the ramp — popping an enemy ramp with your trick fires twelve of their javelins at you.',
        'Trick hits are the mastery\'s Showboat requirement — 100 of them.',
      ],
    },

    'speed-o-light': {
      basics:
        '125 teleports to random points on the arena walls, one every 60ms — 7.5 seconds in total, with '
        + 'no aim and no control. Each hop leaves a lit line for 900ms dealing 15 damage to anything '
        + 'within 40px of it, once per target per streak, and you hold +100% dodge chance for the whole '
        + 'duration, dropped the moment the last bounce lands. 45s cooldown, so one and maybe two in a '
        + 'long fight.',
      cast: 'Q. No aim and no control — the destinations are random points on the arena walls.',
      effects: [
        { tag: 'movement', label: 'The bounces', detail: '125 teleports to random wall positions, one every 60ms — 7.5 seconds of it in total.' },
        { tag: 'damage', label: 'Streaks', detail: 'Each hop leaves a lit line for 900ms that deals 15 damage to anything within 40px of it, once per target per streak.' },
        { tag: 'shield', label: 'Untouchable', detail: '+100% dodge chance for the whole duration, removed the moment the last bounce lands.' },
        { tag: 'utility', label: 'Availability', detail: '45s cooldown — one, maybe two, in a long fight.' },
      ],
      upgrade: {
        basics:
          'Every 10th teleport leaves a beam behind — 12 across a full cast — each lasting 35 seconds, '
          + 'with no cap on how many can exist. Standing within 40px of one of your own raises your '
          + 'acceleration from 175 to 525 px/s². They do no damage and have no effect on enemies at all: '
          + 'they are pure road surface.',
        effects: [
          { tag: 'summon', label: 'Beams laid', detail: 'Every 10th teleport leaves a beam — 12 of them over a full 125-bounce cast — each lasting 35s. There is no cap on how many can exist.', requiresUpgrade: 'q' },
          { tag: 'buff', label: 'Triple acceleration', detail: 'Standing within 40px of one of your own beams raises the acceleration rate from 175 to 525 px/s².', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Yours alone', detail: 'Beams do no damage and have no effect on enemies whatsoever. They are pure road surface.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'The ability card says 25 bounces at 10 damage each; the kit runs 125 bounces at 15 damage. The figures above are the kit\'s.',
        'Killing somebody with a streak is the mastery\'s Hit and Run requirement — 5 of them.',
        'The destinations are uniformly random along the walls, so the damage output against a fighter hugging one edge is wildly higher than against one standing dead centre.',
      ],
    },
  },

  perks: {
    flicker: {
      basics:
        'Rides on Blink, including the E+ Steam Charge press. Three charges instead of two, each '
        + 'refilling in 3 seconds instead of 5 — twice the throughput — and every blink leaves an '
        + 'afterimage that flares 0.4 seconds later for 12 damage inside 62px, centred on the spot you '
        + 'left rather than the one you arrived at. The outline tightens and brightens across the whole '
        + 'delay, so it is a mine that announces itself.',
      cast: 'No key of its own — it rides on Blink, including the E+ Steam Charge press.',
      effects: [
        { tag: 'resource', label: 'Deeper magazine', detail: '3 Blink charges instead of 2, each refilling in 3s instead of 5s — twice the throughput.' },
        { tag: 'damage', label: 'Afterimage flare', detail: '12 damage inside 62px, 0.4s after the blink, centred on the spot you left rather than the one you arrived at.' },
        { tag: 'utility', label: 'Telegraphed', detail: 'The outline visibly tightens and brightens across the whole 0.4s, so it is a mine that announces itself.' },
      ],
      notes: [
        'The flare fires at the departure point, which means blinking *away* from somebody is what puts the damage on them.',
        'The perk\'s ingredients are acid, fate and light.',
      ],
    },
  },

  mastery: {
    unstoppable: {
      basics:
        'Two always-on changes, in and out of car mode. Cornering costs 1260 px/s² instead of 3600 — '
        + '35% of the usual, so hard turns bleed off less than half as much speed — and every stun, '
        + 'freeze, root and slow applied to you is ignored outright, with your speed multiplier never '
        + 'allowed below 1.',
      effects: [
        { tag: 'buff', label: 'Cornering', detail: 'The turn brake drops from 3600 to 1260 px/s² — 35% of the usual cost, so hard turns bleed off less than half as much speed.' },
        { tag: 'shield', label: 'Immovable', detail: 'Every stun, freeze, root and slow applied to you is ignored outright, and your speed multiplier is never allowed below 1.' },
        { tag: 'utility', label: 'Always on', detail: 'No key, no cooldown, no cost. It applies in and out of car mode.' },
      ],
      notes: [
        'This is the passive half of Light Mastery — it needs no bind and no key.',
        'It also cancels the R+ Prism Drill\'s own stun if somebody uses one on you.',
      ],
    },
    'killer-kebab': {
      basics:
        'A bindable 5-second window in which a lance contact impales instead of damaging: the lance '
        + 'sits 44px out rather than 34 and wears a gold collar. Up to 3 riders at once are pinned at '
        + '46px, 76px and 106px along your heading, position-locked to the shaft and disarmed '
        + 'continuously while they are on it. Ramming any wall tears every rider off for 25 + 130 × '
        + '(speed ratio)² each — 25 at a crawl, 155 at a full meter — plus 180 of knockback, and you take '
        + 'no wall damage at all while anybody is on the lance, including the Redline crash, though the '
        + 'slam still zeroes your speed. A rider that survives 12 seconds without a wall slides off '
        + 'unharmed. 20s cooldown.',
      cast:
        'Bindable to E, R, F or Q, replacing that slot\'s base ability for the match. Instant; it '
        + 'enhances the lance rather than firing anything.',
      effects: [
        { tag: 'buff', label: 'The window', detail: '5 seconds during which a lance contact impales instead of dealing damage. The lance sits 44px out rather than 34 and wears a gold collar.' },
        { tag: 'control', label: 'Riders', detail: 'Up to 3 at once, pinned at 46px, 76px and 106px along your heading. They are position-locked to the shaft and disarmed continuously for as long as they are on it.' },
        { tag: 'damage', label: 'Wall slam', detail: 'Ramming any wall tears every rider off for 25 + 130 × (speed ratio)² damage each — 25 at a crawl, 155 at a full meter — plus 180 of knockback away from you.' },
        { tag: 'shield', label: 'They take the impact', detail: 'You take no wall damage at all while anything is on the lance, including the Click+ Redline crash. The slam still zeroes your own speed.' },
        { tag: 'utility', label: 'Slide free', detail: 'A rider that survives 12 seconds without a wall comes off on its own, unharmed.' },
        { tag: 'utility', label: 'Availability', detail: '20s cooldown, independent of whichever slot it is bound over.' },
      ],
      notes: [
        'While the window is open the lance does no damage on contact at all — a full spit is three enemies carried and nothing dealt until you find a wall.',
        'Riders are removed with no damage if you die, and a rider that dies while carried simply falls off.',
      ],
    },
  },
};

export default light;
