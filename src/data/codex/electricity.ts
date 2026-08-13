import { ElementCodex } from '../AbilityCodex';

/**
 * Electricity — a battery that has to be beaten to be charged.
 *
 * Verified against `src/elements/electricity.ts`, `kits/ElectricityKit.ts`, the electricity
 * block of `data/Upgrades.ts`, the Phoenix perk in `data/Perks.ts` and Electricity Mastery in
 * `data/Mastery.ts`. Numbers here are the ones the kit actually applies.
 */
const electricity: ElementCodex = {
  identity:
    'The only element whose resource bar fills when things go badly. Every point of damage that '
    + 'lands on an electricity fighter is charge going in, and four of its five keys are ways to '
    + 'spend that charge back out — bigger shots, a longer blink, a bomb sized by the meter, and a '
    + 'revive whose health is literally the number on the bar. It is built to be losing and then '
    + 'suddenly not be.',

  passives: [
    {
      emoji: '⚡',
      name: 'Kinetic Power',
      basics:
        'The kit\'s battery, charged by being hurt: every 1 damage you take from any source — a hit, a '
        + 'burn tick, a wall, your own Pain Battery — is 1 kinetic power, with sparks flying off you on '
        + 'every intake. It caps at 50, or 100 with Overclock, and overflow is lost. Holding 20 or more '
        + 'makes every Electro Ball shock once for 4 in an 80px radius; at 50 or more it shocks twice, '
        + '300ms apart, in 120px, and the bead is drawn 1.25× larger. Four abilities spend it: Electro '
        + 'Dash\'s recast takes 15, Kinetic Discharge takes 20 and scales its damage off what is left, '
        + 'Ball Lightning drains 25 a second while held, and Restart consumes the whole bar to set your '
        + 'revive HP. The ⚡ counter above the arena reads current over cap.',
      effects: [
        { tag: 'resource', label: 'Charge on damage', detail: 'Every 1 damage you take adds 1 kinetic power, from any source — a hit, a burn tick, a wall, or your own Pain Battery. Sparks fly off you on every intake.' },
        { tag: 'resource', label: 'The cap', detail: '50 kinetic power, raised to 100 by the R+ Overclock upgrade. Overflow past the cap is simply lost.' },
        { tag: 'buff', label: 'Charged shots', detail: 'At 20+ kinetic every Electro Ball shocks once for 4 in an 80px radius; at 50+ it shocks twice, 300ms apart, in 120px, and the projectile itself is drawn 1.25× larger.' },
        { tag: 'cost', label: 'Spent by four abilities', detail: 'Electro Dash recast takes 15, Kinetic Discharge takes 20 and scales its damage off what is left, Ball Lightning drains 25/second while held, and Restart consumes the entire bar to set your revive HP.' },
        { tag: 'utility', label: 'Readout', detail: 'The ⚡ counter above the arena reads current/cap and is the number every other ability in the kit is quoting.' },
      ],
      notes: [
        'The bar starts every match at 0, so an electricity fighter opens the fight with the weakest version of its own kit.',
        'With Electricity Mastery the bar is also armour — see Kinetic Shield.',
        'Under the Copper divine perk every wound also earths itself into the floor: a spark at the spot you were hurt, biting for a fifth of that wound (minimum 1) twice a second for 3s inside 26px. Up to 40 of them can be lying around at once.',
      ],
    },
  ],

  abilities: {
    'electro-ball': {
      basics:
        'A bead thrown at the cursor for 15 damage to the first fighter it touches, flying 520 px/s and '
        + 'spawned 32px out so it clears your own body. While you hold 20 or more kinetic power it also '
        + 'arcs once into an enemy within 80px for 4 — damage without touching them — and at 50 or more '
        + 'it arcs twice, 300ms apart, out to 120px. Two shocks is the ceiling. 0.5s cooldown, and it is '
        + 'the only electricity ability that spends no charge at all.',
      cast: 'Click, aimed at the cursor. No wind-up. Hold does nothing without the Click+ upgrade.',
      effects: [
        { tag: 'damage', label: 'Impact', detail: '15 damage to the first fighter it touches, and the bead is consumed.' },
        { tag: 'utility', label: 'Flight', detail: '520 px/s in a straight line, spawned 32px out from the caster so it clears their own body.' },
        { tag: 'damage', label: 'Shock at 20+', detail: 'While you hold 20 or more kinetic power, each bead arcs once into an enemy within 80px for 4 damage — a hit it can land without touching them.' },
        { tag: 'damage', label: 'Shock at 50+', detail: 'At 50 or more the same bead arcs twice, 300ms apart, and the reach grows to 120px. Two shocks is the ceiling; no amount of charge buys a third.' },
        { tag: 'utility', label: 'Rate of fire', detail: '0.5s cooldown — the only electricity ability you can lean on continuously, and the one that spends no kinetic power at all.' },
      ],
      upgrade: {
        basics:
          'Holding Click drains 25 kinetic power a second to grow an orb: 25 drained is tier I, 50 tier '
          + 'II, 75 tier III and 100 tier IV, and the top two only exist with the Overclock cap of 100. '
          + 'Releasing under 200ms, or under 25 drained, just fires an ordinary bead. The orb drifts toward '
          + 'the cursor direction at 55 px/s and lives 6 seconds without stopping, expiring or shrinking on '
          + 'contact. It is 12/15/18/21px by tier, deals 18/28/40/55 damage within 14/19/24/29px on a '
          + '1-second re-hit cooldown per enemy — anyone standing inside a tier IV is taking 55 a second — '
          + 'and fires a 4-damage shock ring out to 80/100/120/140px every 1000ms at tier I, 500ms at tiers '
          + 'II and III and 333ms at tier IV.',
        effects: [
          { tag: 'resource', label: 'Drain to charge', detail: 'Holding Click drains 25 kinetic power per second. A release under 200ms held, or under 25 drained, just fires an ordinary Electro Ball instead.', requiresUpgrade: 'click' },
          { tag: 'summon', label: 'Four tiers', detail: '25 drained → tier I, 50 → tier II, 75 → tier III, 100 → tier IV. Tiers III and IV need the R+ Overclock cap of 100 to exist at all.', requiresUpgrade: 'click' },
          { tag: 'summon', label: 'The orb', detail: 'Drifts toward the cursor direction at 55 px/s and lives 6s. Radius 12/15/18/21px by tier; it does not stop, expire or shrink on contact.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Contact', detail: '18 / 28 / 40 / 55 damage by tier to anything within 14/19/24/29px, with a 1s re-hit cooldown per enemy. A fighter that stays inside a tier IV orb is taking 55 a second.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Shock pulse', detail: 'A ring of 4 damage out to 80/100/120/140px, fired every 1000ms at tier I, 500ms at tiers II and III, and 333ms at tier IV.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The shock thresholds are checked live, so a bead already in the air starts shocking the moment the bar crosses 20 — and stops if you spend back below it.',
        'A tier IV ball costs the entire 100-point bar and takes a full 4 seconds of held Click to fill. There is no way to bank one before the fight.',
        'An expiring orb collapses in a discharge that deals nothing. The 6s is a hard limit, not a fuse.',
      ],
    },

    'electro-dash': {
      basics:
        'A 215px blink toward the cursor, clamped 30px inside the walls. It is a hard reposition rather '
        + 'than a slide, so nothing can body-block it, and it deals 15 damage to every enemy within 45px '
        + 'of the whole line you crossed rather than just the endpoint. A second E inside 1.5 seconds is '
        + 'a recast: one extra blink for 15 kinetic power and no cooldown, and only one — the window '
        + 'closes after it is used. 1.5s cooldown otherwise, so a recast is always cheaper than waiting.',
      cast:
        'E, toward the cursor. Instant, no lock. A second E within 1.5s of the first is a recast and '
        + 'costs kinetic power rather than waiting on the cooldown.',
      effects: [
        { tag: 'movement', label: 'Blink', detail: '215px toward the cursor, clamped to stay 30px inside the arena walls. It is a hard reposition, not a slide — nothing can body-block it.' },
        { tag: 'damage', label: 'Corridor damage', detail: '15 damage to every enemy within 45px of the line you crossed, measured against the whole segment rather than the endpoint.' },
        { tag: 'resource', label: 'Recast', detail: 'One extra blink inside a 1.5s window for 15 kinetic power and no cooldown. Only one — the window closes after it is used.' },
        { tag: 'utility', label: 'Availability', detail: '1.5s cooldown on the first blink. The recast window is the same 1.5s, so a recast is always cheaper than waiting.' },
      ],
      upgrade: {
        basics:
          'Every dash leaves a storm cloud at the landing point for 8 seconds, and recasts spawn their '
          + 'own, so a double blink leaves two. Each drops a sky bolt every 2 seconds for 18 damage to '
          + 'anything within 70px — four strikes over its life if nobody walks out — and it visibly charges '
          + 'across each window, lighting along its underside past 55% wound-up, so every strike is '
          + 'announced about a second early.',
        effects: [
          { tag: 'summon', label: 'The cloud', detail: 'One cloud at the landing point per dash, lasting 8s. Recasts spawn their own, so a double blink leaves two.', requiresUpgrade: 'e' },
          { tag: 'damage', label: 'Strikes', detail: 'A sky bolt every 2s for 18 damage to anything within 70px of the cloud — 4 strikes over its life if nobody walks out.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Telegraph', detail: 'The cloud visibly charges over each 2s window and lights along its underside past 55% wound-up, so every strike is announced about a second early.', requiresUpgrade: 'e' },
        ],
      },
      notes: [
        'The recast checks kinetic power, so at under 15 the second blink simply does not happen and the window is wasted.',
        'Corridor damage is the mastery\'s Human Bullet requirement — 250 dash hits — and blinking through a crowd counts each of them.',
      ],
    },

    'kinetic-discharge': {
      basics:
        'Detonates at the cursor for half your current kinetic power to everything within 100px — 25 at '
        + 'a full 50-bar. It costs 20 charge and refuses to cast below that, but the damage is read off '
        + 'the bar before the 20 comes out, so you are paid for the full charge. Past 60% of the bar it '
        + 'also calls a 260px sky strike onto the point, so a big discharge is visibly a different event '
        + 'from a minimum one. 4s cooldown.',
      cast: 'R, placed at the cursor. Instant. Refuses to cast below 20 kinetic power.',
      effects: [
        { tag: 'damage', label: 'Detonation', detail: 'Half your current kinetic power as damage, to everything within 100px of the cursor. At a full 50-bar that is 25.' },
        { tag: 'resource', label: 'Cost', detail: '20 kinetic power, minimum 20 to cast. The damage is read off the bar before the 20 comes out, so you are paid for the full charge.' },
        { tag: 'utility', label: 'Availability', detail: '4s cooldown.' },
        { tag: 'utility', label: 'Charge tell', detail: 'Past 60% of the bar the blast also calls a 260px sky strike down onto the point, so a big discharge is visibly a different event from a minimum one.' },
      ],
      upgrade: {
        basics:
          'The kinetic cap doubles from 50 to 100, and everything that reads the bar scales with it — '
          + 'Restart\'s revive HP, Kinetic Shield, Ball Lightning\'s tiers. Above 50 charge the discharge '
          + 'also converts better: 25 + 0.8 per point over 50 instead of a flat half, so a 100-point '
          + 'discharge deals 65 rather than 50. It is also what unlocks Ball Lightning tiers III and IV, '
          + 'which are gated on the cap rather than on the drain alone.',
        effects: [
          { tag: 'resource', label: 'Doubled cap', detail: 'Kinetic power cap goes from 50 to 100. Everything that reads the bar — Restart\'s revive HP, Kinetic Shield, Ball Lightning tiers — scales with it.', requiresUpgrade: 'r' },
          { tag: 'damage', label: 'Better conversion', detail: 'Above 50 kinetic the damage becomes 25 + 0.8 per point over 50, instead of a flat half. A 100-point discharge deals 65, not 50.', requiresUpgrade: 'r' },
          { tag: 'summon', label: 'Top-tier orbs', detail: 'Unlocks Ball Lightning tiers III and IV, which are gated on the cap being 100 rather than on the drain alone.', requiresUpgrade: 'r' },
        ],
      },
      notes: [
        'Discharging at exactly 100 kinetic is the mastery\'s Overload requirement — 5 of them — and needs the R+ cap to be possible at all.',
        'The cost is a flat 20 regardless of the bar, so a 100-point discharge leaves you at 80 and can be followed by another 4 seconds later.',
      ],
    },

    'pain-battery': {
      basics:
        'Hold F to hurt yourself for charge: 5 damage every 0.25s — 20 HP a second, no cap and no '
        + 'timer, with the first tick at 250ms so a tap costs nothing. Each 5 self-damage is 5 kinetic '
        + 'power in, because the battery does not care where the wound came from, so 2.5 seconds fills an '
        + 'empty 50-bar. Releasing fires 75% of everything you did to yourself at every enemy within '
        + '120px: a 4-second hold is 80 self-damage and a 60-damage ring. No cooldown and no cast lock — '
        + 'you can walk while charging, and the only limit is how much health you will convert.',
      cast: 'Hold F. No cooldown at all, and no cast lock — you can walk while charging. Release to fire.',
      effects: [
        { tag: 'cost', label: 'Self-damage', detail: '5 damage to yourself every 0.25s held — 20 HP per second, with no cap and no timer. The first tick lands at 250ms, so a tap costs nothing.' },
        { tag: 'resource', label: 'Charge gained', detail: 'Each 5 self-damage is 5 kinetic power in, because the battery does not care where the wound came from. 2.5 seconds of holding fills an empty 50-bar.' },
        { tag: 'damage', label: 'Release blast', detail: '75% of everything you did to yourself, to every enemy within 120px. A 4-second hold is 80 self-damage and a 60-damage ring.' },
        { tag: 'utility', label: 'Free to hold', detail: '0s cooldown. The only limit on how often you do this is how much health you are prepared to convert.' },
      ],
      upgrade: {
        basics:
          'A tap under 200ms becomes a jumpstart instead: 20 damage to the nearest enemy within 200px, '
          + 'and 1 HP every 0.2s for 6 seconds — 5 a second, 30 in total. Nothing in range means no damage '
          + 'but the heal still runs, and any damage taken cancels the regeneration outright with a "Regen '
          + 'cancelled" notice, losing whatever was left. Holding F past 200ms is still the ordinary Pain '
          + 'Battery at the same rates.',
        effects: [
          { tag: 'damage', label: 'Jumpstart hit', detail: 'A tap under 200ms deals 20 damage to the nearest enemy within 200px. Nothing in range means no damage, but the heal still runs.', requiresUpgrade: 'f' },
          { tag: 'heal', label: 'Regeneration', detail: '1 HP every 0.2s for 6 seconds — 5 HP/s, 30 HP in total.', requiresUpgrade: 'f' },
          { tag: 'cost', label: 'Fragile', detail: 'Any damage taken cancels the regeneration outright and prints "Regen cancelled". Whatever is left of the 30 is lost.', requiresUpgrade: 'f' },
          { tag: 'utility', label: 'Hold is unchanged', detail: 'Holding F past 200ms is still the ordinary Pain Battery, at the same 5-per-0.25s and the same 75% release.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Self-damage is the mastery\'s Self Destructive requirement — 500 points of it — and this is the only ability that generates any.',
        'A release that soaked nothing fires nothing: the blast only happens when the 75% figure rounds above 0.',
        'A hold that kills you is entirely possible. Nothing in the base ability stops the ticks.',
      ],
    },

    restart: {
      basics:
        'Five seconds of overcharge that does nothing defensive on its own — it only matters if a '
        + 'killing blow lands inside the window, in which case you get back up at HP equal to your '
        + 'current kinetic power, clamped between 1 and your maximum. A full 100-bar is 100 HP of a 400 '
        + 'HP fighter. The revive empties the bar to 0 and ends the overcharge, so you come back at your '
        + 'weakest with no charged shots and no discharge. 60s cooldown, roughly one guaranteed revive a '
        + 'fight.',
      cast: 'Q. Instant, no lock. The 5s overcharge window starts immediately; the revive is what happens inside it.',
      effects: [
        { tag: 'buff', label: 'Overcharged', detail: '5 seconds of the overcharge cage. Nothing about it is defensive on its own — it only matters if you actually take lethal damage inside the window.' },
        { tag: 'heal', label: 'The revive', detail: 'A killing blow inside the window leaves you at HP equal to your current kinetic power, clamped between 1 and your maximum. At a full 100-bar that is 100 HP of a 400 HP fighter.' },
        { tag: 'resource', label: 'Consumes everything', detail: 'The revive empties the bar to 0 and ends the overcharge, so you come back at your weakest with no charged shots and no discharge.' },
        { tag: 'utility', label: 'Availability', detail: '60s cooldown — roughly one guaranteed revive per fight.' },
      ],
      upgrade: {
        basics:
          'Dying with Restart off cooldown and no overcharge up revives you anyway, at half your kinetic '
          + 'power rounded down and clamped to at least 1. It still puts Restart on its whole 60-second '
          + 'cooldown and still empties the bar, so the half-rate revive costs the same charge the '
          + 'full-rate one would. Casting Q first and dying inside the 5-second window is still worth twice '
          + 'as much — this is the safety net for the deaths you did not see coming.',
        effects: [
          { tag: 'heal', label: 'Automatic revive', detail: 'Dying with Restart off cooldown and no overcharge up revives you at half your kinetic power, rounded down, clamped to at least 1.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'Full cooldown', detail: 'The automatic version puts Restart on its whole 60s cooldown, exactly as if you had pressed Q.', requiresUpgrade: 'q' },
          { tag: 'resource', label: 'Consumes everything', detail: 'It still empties the bar to 0, so the half-rate revive costs the same charge the full-rate one would.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Manual still better', detail: 'Casting Q first and dying inside the 5s window gives the full-value revive. Q+ is the safety net for the deaths you did not see coming.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Both revive routes count toward the mastery\'s Second Wind requirement — 10 revives.',
        'Overcharge that expires without you dying does nothing at all and the 60s cooldown is spent anyway.',
        'Reviving at kinetic power means an electricity fighter who has been losing badly revives highest. A clean fight makes Q worth almost nothing.',
      ],
    },
  },

  perks: {
    phoenix: {
      basics:
        'Fires automatically on any Restart revive, manual or automatic. Five seconds in which every '
        + 'incoming hit is absorbed entirely rather than reduced, at ×2 move speed, restored exactly when '
        + 'it ends. You drop a flame at your feet every second — five over the window — each lying there '
        + 'for 30 seconds. They are inert while phoenix runs, so you cannot heal during the invincible '
        + 'window; once it ends, stepping within 28px consumes one for 5 HP a second for 3 seconds, 15 HP '
        + 'a flame and 75 if you collect all five. The trail is deliberately a debt you go back for.',
      cast: 'No key. Triggers automatically on any Restart revive, manual or Q+ automatic.',
      effects: [
        { tag: 'shield', label: 'Untouchable', detail: '5 seconds during which every incoming hit is absorbed entirely. Not reduced — absorbed.' },
        { tag: 'movement', label: 'Double speed', detail: 'Move speed ×2 for the same 5 seconds, restored exactly to what it was when the window ends.' },
        { tag: 'summon', label: 'Flame trail', detail: 'One flame dropped at your feet every 1 second while phoenix is up — 5 of them over the window. Each lies there for 30 seconds.' },
        { tag: 'heal', label: 'Picking them back up', detail: 'Once phoenix has ended, stepping within 28px of a flame consumes it for 5 HP a second for 3 seconds — 15 HP a flame, 75 HP if you collect all five.' },
        { tag: 'cost', label: 'Cannot collect early', detail: 'Flames are inert while phoenix is still running, so you cannot heal during the invincible window; the trail is deliberately a debt you go back for.' },
      ],
      notes: [
        'The 30s flame lifetime starts when the flame drops, not when phoenix ends, so the first one dropped has 25 seconds left to be collected.',
        'The perk\'s ingredients are electricity, fate and sound.',
      ],
    },
  },

  mastery: {
    'kinetic-shield': {
      basics:
        'Your charge is armour: +1% damage resistance for every 3% of the kinetic bar, so a full bar is '
        + '33% off everything, rounded down. No key, no cooldown and no cost — it reads the bar live in '
        + 'both directions, so spending charge lowers your resistance instantly. It reads percentage '
        + 'rather than points, so it is 33% at a full bar whether the cap is 50 or 100; Overclock does '
        + 'not weaken it, it just makes the top harder to reach.',
      effects: [
        { tag: 'shield', label: 'Charge as armour', detail: '+1% damage resistance for every 3% of your kinetic bar, so a full bar is 33% off everything. Rounded down, so 3% of the bar is the smallest step.' },
        { tag: 'utility', label: 'Always on', detail: 'No key, no cooldown, no cost. It reads the bar live and updates every frame, in both directions — spending charge lowers your resistance instantly.' },
        { tag: 'utility', label: 'Reads percentage, not points', detail: 'It is 33% at a full bar whether the cap is 50 or 100, so R+ Overclock does not weaken it; it just makes the top of the bar harder to reach.' },
      ],
      notes: [
        'This is the passive half of Electricity Mastery — it needs no bind and no key.',
      ],
    },
    'kinetic-bomb': {
      basics:
        'A bindable bomb that replaces its slot\'s ability for the match. It flies 460 px/s until it '
        + 'latches within 26px or leaves the arena, then sticks to that enemy for 10 seconds, riding 24px '
        + 'above their head and following them everywhere. It detonates for 10 damage in a 150px radius '
        + 'plus 1 more for every 3 damage the carrier took while wearing it, with the meter reading full '
        + 'at 120 soaked. A carrier who dies while wearing it sets it off immediately at whatever it had '
        + 'accumulated rather than wasting the payload. 14s cooldown.',
      cast:
        'Bindable to E, R, F or Q, replacing that slot\'s base ability entirely for the match. Fired '
        + 'toward the cursor, instant.',
      effects: [
        { tag: 'utility', label: 'Flight', detail: '460 px/s in a straight line until it latches or leaves the arena. Latch radius is 26px.' },
        { tag: 'debuff', label: 'Latch', detail: 'Sticks to the first enemy it touches for 10 seconds, riding 24px above their head and following them wherever they go.' },
        { tag: 'damage', label: 'Detonation', detail: '10 base damage in a 150px radius, plus 1 more for every 3 damage the carrier took while it was attached. The meter reads full at 120 damage soaked.' },
        { tag: 'damage', label: 'Death trigger', detail: 'A carrier who dies while wearing it detonates it immediately at whatever it had accumulated — 10 plus a third of everything they had soaked — rather than wasting the payload.' },
        { tag: 'utility', label: 'Availability', detail: '14s cooldown, independent of whichever slot it is bound over.' },
      ],
      notes: [
        'It counts damage from every source, including the carrier\'s own self-damage and anything a third fighter does to them.',
        'A bomb that never latches simply flies off the edge of the arena and is gone — there is no timed detonation in flight.',
        'Binding it over F, Q, E or R deletes that ability for the match, so the choice is which of Pain Battery, Restart, Electro Dash or Kinetic Discharge you can do without.',
      ],
    },
  },
};

export default electricity;
