import { ElementCodex } from '../AbilityCodex';

/** Wax's complete base kit and upgrades. Mastery intentionally arrives later. */
const wax: ElementCodex = {
  identity:
    'Wax is a setup-heavy swarm fighter. Its foil barrage rewards precise melee spacing, while '
    + 'bees, candles, hives and sticky bombs turn placed objects into a growing damage engine.',

  passives: [
    {
      emoji: '🐝',
      name: 'Bee Vulnerability',
      basics: 'Every attached bee makes its host take 1% more damage while it remains. There is no bee cap.',
      effects: [
        { tag: 'debuff', label: 'Per-bee vulnerability', detail: '+1% incoming damage for every bee currently attached to the fighter.' },
        { tag: 'utility', label: 'No stack cap', detail: 'Swarm, Hive Hearth and the reactive bee shield can all add bees to the same enemy.' },
      ],
    },
  ],

  abilities: {
    'wax-stinger-strikes': {
      basics: 'Six narrow fencing thrusts sweep across the cursor line for 5 damage each. An enemy hit by all six is struck once more for 10 damage, knocked back and poisoned.',
      cast: 'Click. 190px melee reach. 1.1s cooldown.',
      effects: [
        { tag: 'damage', label: 'Barrage', detail: '6 thrusts, 5 damage each, separated by 70ms and angled slightly apart.' },
        { tag: 'damage', label: 'Perfect sequence', detail: 'Landing all 6 on one enemy triggers a straight 10-damage final strike.' },
        { tag: 'control', label: 'Final knockback', detail: 'The perfect-sequence strike pushes the enemy away from the Wax fighter.' },
        { tag: 'dot', label: 'Light poison', detail: 'For 8s, deals 1 damage each second and adds 1 percentage point of vulnerability each second. Bees deal +1 damage per tick to the poisoned enemy.' },
      ],
      upgrade: {
        basics: 'Stinger Strike replaces the melee fan whenever no enemy is within its reach. Five ranged darts lead into a black rope grapple if one target catches the complete volley.',
        effects: [
          { tag: 'damage', label: 'Ranged volley', detail: 'Outside 190px, fires 5 slightly spread darts at 650 px/s for 3 damage each.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Grapple dart', detail: 'Landing all 5 darts on one target launches a larger black dart for 12 damage.', requiresUpgrade: 'click' },
          { tag: 'control', label: 'Rope pull', detail: 'A grapple hit pulls its target to within 92px of the Wax fighter.', requiresUpgrade: 'click' },
        ],
      },
    },

    'wax-swarm': {
      basics: 'Fifteen bees launch in a cone toward the cursor. A bee that touches an enemy latches on, ticks three times, and makes every other attack slightly stronger while it remains.',
      cast: 'E. 15 projectiles in a 48° cone. 8s cooldown.',
      effects: [
        { tag: 'summon', label: 'Fifteen bees', detail: 'Each bee flies independently and can latch onto the first enemy it touches.' },
        { tag: 'dot', label: 'Attached damage', detail: '2 damage every second for 3s; 3 damage per tick while the host is poisoned.' },
        { tag: 'debuff', label: 'Open target', detail: 'Each living attachment adds +1% incoming damage. Bee stacks have no limit.' },
      ],
      upgrade: {
        basics: 'Elite Swarm turns three members of every fifteen-bee cast red. Elite bees bite harder, remain longer, and immediately apply Stinger Strike poison when they latch.',
        effects: [
          { tag: 'summon', label: 'Three elites', detail: '3 of the 15 bees are red elite bees.', requiresUpgrade: 'e' },
          { tag: 'dot', label: 'Elite bite', detail: 'Elite bees deal 3 damage per second and remain attached for 5s before candle bonuses.', requiresUpgrade: 'e' },
          { tag: 'debuff', label: 'Poison delivery', detail: 'An elite bee applies the full 8s light poison as soon as it latches.', requiresUpgrade: 'e' },
        ],
      },
    },

    'wax-candle-mount': {
      basics: 'Place a candle at the cursor. Its aura protects the Wax fighter and makes newly summoned bees remain attached longer. The candle visibly melts away over 12 seconds.',
      cast: 'R. Place at the cursor. 12s duration, 7s cooldown.',
      effects: [
        { tag: 'shield', label: 'Candle aura', detail: '15% less damage taken while the Wax fighter is within 125px.' },
        { tag: 'buff', label: 'Longer-lived bees', detail: 'Bees summoned under the aura remain attached for 2 additional seconds.' },
        { tag: 'utility', label: 'Stacking auras', detail: 'Every overlapping candle adds another 15 percentage points of resistance and another 2s of bee lifetime.' },
        { tag: 'utility', label: 'Sticky ignition', detail: 'A sticky bomb that hits the candle destroys it and banks one full aura stack on the Wax fighter for 15s.' },
      ],
      upgrade: {
        basics: 'Melting Point makes candle protection harden under fire and turns melting wax into damaging floor hazards.',
        effects: [
          { tag: 'shield', label: 'Set under pressure', detail: 'Every damaging hit taken while candle-buffed grants +2 percentage points of damage resistance for 5s. Hits create independent stacks.', requiresUpgrade: 'r' },
          { tag: 'dot', label: 'Boiling spill', detail: 'Each qualifying hit leaves a 44px hot-wax puddle for 6s, dealing 3 damage each second.', requiresUpgrade: 'r' },
          { tag: 'area', label: 'Melting candle', detail: 'Every upgraded candle also spills a hot-wax puddle at a random nearby point every 3–4s while it survives.', requiresUpgrade: 'r' },
        ],
      },
    },

    'wax-hive-hearth': {
      basics: 'Place a five-cell hive. Flying bees that touch it are stored instead of attacking. Press F near the hive to consume it and turn its stored cells into an orbiting swarm and retaliatory bee shield.',
      cast: 'F to place; F again within 92px to redeem. 10s cooldown on placement.',
      effects: [
        { tag: 'resource', label: 'Five hive cells', detail: 'Each bee projectile that reaches a non-full hive fills one miniature bar and is consumed.' },
        { tag: 'summon', label: 'Redeemed swarm', detail: 'Creates 5 bees per filled cell, or 5 bees from an empty hive, orbiting for up to 12s before latching on contact.' },
        { tag: 'shield', label: 'Bee shield', detail: 'For 12s, attackers receive 1 bee at 1–2 cells, 2 bees at 3–4 cells, or 3 bees at all 5 cells.' },
        { tag: 'utility', label: 'Sticky hive burst', detail: 'A sticky bomb redeems the hive instantly and also launches 25 bees per filled cell in random directions.' },
      ],
      upgrade: {
        basics: 'Honey Making adds a slow secondary resource to every hive. Redeeming converts stored honey directly into health and long-lived healing puddles.',
        effects: [
          { tag: 'resource', label: 'Honey bar', detail: 'Stores up to 50 honey at 0.35 per second plus 0.23 per second for each bee cell filled.', requiresUpgrade: 'f' },
          { tag: 'heal', label: 'Collected honey', detail: 'Redeeming heals the Wax fighter for the whole-number honey currently stored, up to 50 HP.', requiresUpgrade: 'f' },
          { tag: 'heal', label: 'Honey puddles', detail: 'Every complete 10 honey creates one non-overlapping 34px puddle for 10s. Its owner heals 3 HP each second while standing inside.', requiresUpgrade: 'f' },
        ],
      },
    },

    'wax-sticky-bombs': {
      basics: 'Ten wax bombs launch in a cone and stick to enemies for up to 20 seconds. Recast Q to detonate every attached bomb everywhere.',
      cast: 'Q to launch; Q again to detonate attached bombs. 12s cooldown begins on launch.',
      effects: [
        { tag: 'debuff', label: 'Sticky opening', detail: 'A fighter carrying one or more bombs takes 10% more damage.' },
        { tag: 'damage', label: 'Detonation', detail: '20 damage per attached bomb, with the combined blast gaining +15% damage for every bomb on that enemy.' },
        { tag: 'utility', label: 'Twenty-second fuse', detail: 'Bombs remain attached for up to 20s and have no per-enemy stack limit.' },
        { tag: 'utility', label: 'Wax structures', detail: 'Flying bombs can bank a candle aura or violently redeem a hive instead of attaching to an enemy.' },
      ],
      upgrade: {
        basics: 'Rule Beetanica turns a full hold into a self-carried bomb cast. The Wax fighter becomes vulnerable while armed, then detonates the fully stacked blast around their body and suffers one third of it.',
        effects: [
          { tag: 'utility', label: 'Two-second hold', detail: 'Hold Q for 2s while the ability is ready and no owned bombs are active to strap all 10 bombs onto yourself.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'Live payload', detail: 'Take 25% more incoming damage while the bombs remain strapped on.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Stacked blast', detail: 'Tap Q to explode in a 165px radius. Ten bombs deal 500 damage after their +15%-per-bomb bonus; the caster takes 33% of that base blast.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Chain reaction', detail: 'The body-centered explosion banks every friendly candle and violently redeems every friendly hive inside its radius.', requiresUpgrade: 'q' },
        ],
      },
    },
  },
};

export default wax;
