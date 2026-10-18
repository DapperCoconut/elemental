import { ElementCodex } from '../AbilityCodex';

/**
 * Wax — verified against `src/elements/wax.ts`, `kits/WaxKit.ts` and the wax block of
 * `data/Upgrades.ts`. The mastery (2026-10-18) is the "Mastery" block of the kit.
 */
const wax: ElementCodex = {
  identity:
    'Apiary magic fought with a fencer\'s discipline. Wax carries a foil for the close work and a hive\'s '
    + 'worth of bees for everything else, and it builds its fights out of beeswax: candles whose light is '
    + 'armour, hives that store bees and pay them back five to one, and sticky bombs that cash in either '
    + 'one early. Every bee on an enemy is another percent of damage they take.',

  passives: [
    {
      emoji: '🍯',
      name: 'Wax Works',
      basics:
        'Everything Wax places is made of the same stuff, and the pieces feed each other. A bee flown '
        + 'into one of your hives is stored in a cell instead of spent. A sticky bomb that hits one of '
        + 'your candles snuffs it and banks its full aura on you for 15s wherever you walk. A bomb that '
        + 'hits one of your hives cashes it in on the spot, and the stored bees fly out in every '
        + 'direction. Every bee attached to a fighter is 1% more damage taken for as long as it stays.',
      effects: [
        { tag: 'resource', label: 'Stored bees', detail: 'A flying bee of yours that crosses one of your hives with a free cell is stored (1 cell per bee, 5 cells). Stored bees come back 5 to 1 when the hive is redeemed.' },
        { tag: 'buff', label: 'Banked candlelight', detail: 'A sticky bomb of yours that hits your own candle destroys it and grants one full candle aura (15% armour, +2s bee latch) that follows you for 15s.' },
        { tag: 'summon', label: 'Violent redemption', detail: 'A sticky bomb of yours that hits your own hive redeems it instantly and adds 15 loose bees per filled cell, scattered in random directions.' },
        { tag: 'debuff', label: 'Bee vulnerability', detail: '+1% incoming damage on a fighter for every bee currently attached to them. There is no cap.' },
      ],
    },
  ],

  abilities: {
    'wax-stinger-strikes': {
      basics:
        'Six foil thrusts along the cursor line, 70ms apart and fanned across 15°, 4 damage each with a '
        + '190px reach. An enemy that catches all six is run through by a seventh: 12 damage, a shove '
        + 'away from you, and 8 seconds of poison that ticks 1 a second and adds a percent of damage '
        + 'taken with every tick.',
      cast: 'Click. 190px reach, 19px either side of the line. 1.2s cooldown.',
      effects: [
        { tag: 'damage', label: 'Six thrusts', detail: '6 thrusts of 4 damage, 70ms apart, each angled 2.5° further across the line (−7.5° to +7.5°).' },
        { tag: 'damage', label: 'The stinger', detail: 'An enemy hit by all 6 takes a 12-damage finishing thrust 110ms after the last, with 28px more reach.' },
        { tag: 'control', label: 'Shove', detail: 'The stinger throws its victim away along the line at 285px/s, bleeding off over 0.26s (knockback-immune fighters excepted).' },
        { tag: 'dot', label: 'Poison', detail: '8s: 1 damage a second, and +1% damage taken per tick, to a cap of 8%. A fresh stinger refreshes the clock. Bees bite a poisoned enemy for 1 more.' },
      ],
      upgrade: {
        basics:
          'Stinger Strike gives the foil a ranged form. With nobody inside its reach, Click fires five darts '
          + 'down the line for 3 each; land all five on one enemy and a black grapple follows for 12 and '
          + 'hauls them to arm\'s length.',
        effects: [
          { tag: 'damage', label: 'Five darts', detail: 'When no enemy is within 190px: 5 darts at 650px/s, 3 damage each, fanned 1.5° apart.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'The grapple', detail: 'All 5 on one enemy launches a grapple dart at 760px/s for 12 damage.', requiresUpgrade: 'click' },
          { tag: 'control', label: 'Hauled in', detail: 'A grappled enemy is pulled toward you at 720px/s for up to 0.75s, stopping 92px away.', requiresUpgrade: 'click' },
        ],
      },
    },

    'wax-swarm': {
      basics:
        'Fifteen bees pour out of your hands in a 48° cone at 350px/s. They hunt: a bee bends toward the '
        + 'nearest enemy inside 230px. One that reaches an enemy latches on for 3 seconds, biting 2 every '
        + 'second and making them take 1% more damage for as long as it stays. A bee that flies through one '
        + 'of your hives is stored instead.',
      cast: 'E. 15 bees in a cone. 8s cooldown.',
      effects: [
        { tag: 'summon', label: 'Fifteen bees', detail: '15 bees across a 48° cone at 350px/s, alive for 2.6s in flight, that turn toward the nearest enemy inside 230px at up to 4.2 rad/s.' },
        { tag: 'dot', label: 'The bite', detail: 'An attached bee deals 2 damage a second for 3s (3 ticks), 3 a second against a poisoned enemy.' },
        { tag: 'debuff', label: 'Opened up', detail: '+1% damage taken per attached bee, uncapped.' },
        { tag: 'buff', label: 'Candlelight', detail: 'Bees loosed while you stand in candlelight stay attached 2s longer per candle covering you.' },
      ],
      upgrade: {
        basics:
          'Elite Swarm turns three of every fifteen red. An elite bites for 3, stays 5 seconds, and poisons '
          + 'on the bite exactly as the stinger does.',
        effects: [
          { tag: 'summon', label: 'Three elites', detail: 'The three middle lanes of every Swarm are elite bees.', requiresUpgrade: 'e' },
          { tag: 'dot', label: 'Elite bite', detail: '3 damage a second for 5s (plus candle time) instead of 2 for 3s.', requiresUpgrade: 'e' },
          { tag: 'debuff', label: 'Elite poison', detail: 'An elite that latches applies the full 8s stinger poison.', requiresUpgrade: 'e' },
        ],
      },
    },

    'wax-candle-mount': {
      basics:
        'Plant a candle at the cursor. It burns for 12 seconds and lights a 125px circle: while you stand '
        + 'in it you take 15% less damage, and bees you loose latch 2s longer. Candles stack to 45% armour. '
        + 'A sticky bomb of yours that hits a candle snuffs it and banks its aura on you for 15s.',
      cast: 'R. Placed at the cursor. 12s burn, 7s cooldown.',
      effects: [
        { tag: 'shield', label: 'Candlelight', detail: '15% less damage taken while within 125px of one of your candles. Each further candle covering you adds 15%, to a cap of 45%.' },
        { tag: 'buff', label: 'Longer bees', detail: 'Bees you loose while covered stay attached 2s longer per candle.' },
        { tag: 'utility', label: 'Banking', detail: 'A sticky bomb of yours that hits the candle destroys it and grants one aura (15% / +2s) that rides on you for 15s.' },
        { tag: 'area', label: 'Burn', detail: 'The candle melts down visibly over 12s and gutters out.' },
      ],
      upgrade: {
        basics:
          'Melting Point makes the light harden under fire. Every hit you take in candlelight sets 2% more '
          + 'armour for 5s (stacking to 10) and spits a pool of hot wax where you stand, 3 a second for 6s '
          + 'to anyone else in it. Candles drip a pool of their own every 3–4 seconds.',
        effects: [
          { tag: 'shield', label: 'Set wax', detail: '+2% damage resistance for 5s per damaging hit taken while covered, up to 10 stacks (20%).', requiresUpgrade: 'r' },
          { tag: 'dot', label: 'Hot wax', detail: 'Each such hit leaves a 44px pool for 6s: 3 damage a second to enemies standing in it.', requiresUpgrade: 'r' },
          { tag: 'area', label: 'Dripping candles', detail: 'Every candle spills a hot wax pool 18–48px from itself every 3–4s while it burns.', requiresUpgrade: 'r' },
        ],
      },
    },

    'wax-hive-hearth': {
      basics:
        'Build a five-cell hive at the cursor. Your bees that fly into it are stored, one per cell. Press F '
        + 'within 92px of it to redeem it: 5 bees per filled cell (5 for an empty hive) orbit you for 12 '
        + 'seconds and latch onto anything they touch, and for the same 12 seconds every hit you take sends '
        + 'bees at the nearest enemy — 1 for 1–2 cells, 2 for 3–4, 3 for a full hive. Two hives at once; a '
        + 'third cashes in the oldest.',
      cast: 'F to build at the cursor; F within 92px of a hive to redeem it (no cooldown). 10s cooldown on the build.',
      effects: [
        { tag: 'resource', label: 'Five cells', detail: 'A flying bee of yours within 36px of the hive is stored while a cell is free.' },
        { tag: 'summon', label: 'The guard', detail: 'Redeeming spawns 5 bees per filled cell (minimum 5) that orbit you at 46–72px for 12s and latch onto any enemy they touch.' },
        { tag: 'shield', label: 'Bee shield', detail: 'For 12s after redeeming, each damaging hit you take attaches 1 (1–2 cells), 2 (3–4) or 3 (5) bees to the nearest enemy.' },
        { tag: 'utility', label: 'Violent redemption', detail: 'A sticky bomb of yours that hits the hive redeems it at once and adds 15 loose bees per filled cell.' },
      ],
      upgrade: {
        basics:
          'Honey Making gives every hive a honey bar. It fills by 0.35 a second plus 0.23 for each filled '
          + 'cell, to 50. Redeeming heals you for the honey and leaves a 10-second healing puddle for every '
          + '10 of it.',
        effects: [
          { tag: 'resource', label: 'Honey', detail: '0.35 honey a second, +0.23 per filled cell, up to 50.', requiresUpgrade: 'f' },
          { tag: 'heal', label: 'Collected', detail: 'Redeeming heals you for the honey stored, rounded down, up to 50.', requiresUpgrade: 'f' },
          { tag: 'heal', label: 'Puddles', detail: 'One 34px honey puddle per full 10 honey, for 10s each, healing you 3 a second while you stand in it.', requiresUpgrade: 'f' },
        ],
      },
    },

    'wax-sticky-bombs': {
      basics:
        'Lob eight wax bombs in a tight 22° cone at 315px/s. A bomb that hits an enemy sticks for 20 '
        + 'seconds and opens them by 10%. Press Q again to detonate every bomb you have stuck anywhere: 10 '
        + 'per bomb, with the whole blast 10% bigger for every bomb on that enemy. Bombs that hit your own '
        + 'candles or hives cash those in instead.',
      cast: 'Q to lob; Q again to detonate. 16s cooldown from the lob.',
      effects: [
        { tag: 'debuff', label: 'Opened', detail: 'A fighter wearing any of your bombs takes 10% more damage.' },
        { tag: 'damage', label: 'Detonation', detail: '10 damage per bomb × (1 + 0.1 per bomb on that enemy). All 8 on one enemy is 144. The bombs come off before the blast, so the 10% does not multiply it.' },
        { tag: 'utility', label: 'Twenty seconds', detail: 'Bombs stick for 20s, then fall off; a bomb in flight lasts 1.5s.' },
        { tag: 'utility', label: 'Your own wax', detail: 'A bomb that hits your candle banks its aura; one that hits your hive redeems it violently.' },
      ],
      upgrade: {
        basics:
          'Rule Beetanica lets you wear the bombs. Hold Q for 2 seconds with none out to strap all eight '
          + 'to yourself: you take 25% more until you tap Q and go off in a 165px blast for the full stacked '
          + '144, cashing in every candle and hive in reach, and taking a third of it yourself.',
        effects: [
          { tag: 'utility', label: 'The hold', detail: 'Hold Q for 2s with no bombs out and the ability ready: all 8 strap onto you and the cooldown starts.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'Live payload', detail: '+25% damage taken while strapped.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'The blast', detail: 'Tap Q: 144 damage to every enemy within 165px, 0.65s after strapping at the earliest.', requiresUpgrade: 'q' },
          { tag: 'utility', label: 'Chain reaction', detail: 'Every candle of yours in the blast banks its aura; every hive is redeemed violently.', requiresUpgrade: 'q' },
          { tag: 'cost', label: 'A third', detail: 'You take 48 of it yourself.', requiresUpgrade: 'q' },
        ],
      },
    },
  },

  mastery: {
    'wax-honey-shell': {
      basics:
        'You start every match inside a dome of honey comb. The first attack of 30 damage or more to '
        + 'reach you breaks on the shell instead — all of it, nothing gets through. Anything under 30 '
        + 'goes straight through to you and leaves the shell standing. Eight seconds after it cracks it '
        + 'sets again, and it keeps doing that for the whole match.',
      cast: 'Passive. Always on while Wax Mastery is enabled and Wax is the element being played.',
      effects: [
        { tag: 'shield', label: 'The shell', detail: 'Blocks one whole attack of 30 or more, measured before your armour. Smaller hits pass through without touching it.' },
        { tag: 'utility', label: 'Re-forms', detail: '8 seconds after it cracks, from the moment of the crack.' },
      ],
      notes: [
        'Piercing and true damage go through the shell, as they go through every block.',
        'Pick your fights by it: an opponent\'s chip damage never spends it, so their big hit is the one that is wasted.',
        'Online, the shell is checked on your own machine, so the opponent may see a number pop that never reached you.',
      ],
    },
    'wax-smoke-out': {
      basics:
        'Hold the bound key to work the smoker. A cloud of smoke starts 70px in front of you and grows '
        + 'for as long as you hold, from 34px up to 170px across. Walk more than 50px past its edge and '
        + 'the smoke starts a new cloud in front of you instead. Standing in your own smoke you are '
        + 'invisible to enemies and 20% of the hits aimed at you are lost in it. Your own clouds are thin '
        + 'on your screen; to everyone else they are solid, and they hide whatever is in or behind them.',
      cast: 'Hold the bound key (R, F or Q). The smoker holds 5 seconds of smoke, needs 1 to light, and refills at 0.4 a second while it is out.',
      effects: [
        { tag: 'utility', label: 'A growing cloud', detail: 'Starts at 34px, grows 42px a second while fed, up to 170px. Lingers 9 seconds after you stop feeding it. Four clouds at most; a fifth replaces the oldest.' },
        { tag: 'movement', label: 'Moves with you', detail: 'Walk more than 50px past the edge of the cloud you are feeding and the smoke starts a fresh one ahead of you.' },
        { tag: 'buff', label: 'Invisible', detail: 'Inside 85% of one of your clouds, enemies cannot see you: bots lose you and wander, husks walk past.' },
        { tag: 'shield', label: 'Lost in the smoke', detail: '20% of hits that reach you while you stand in your smoke never land.' },
        { tag: 'control', label: 'One-way', detail: 'Enemies see your clouds as solid smoke; you see through them. A bot cannot see you through a cloud between you, either.' },
      ],
      notes: [
        'Invisible is not untouchable: anything that hits the spot you are standing in still hits you.',
        'Smoke in front of a strapped Rule Beetanica is the walk-in: they cannot see the payload coming.',
        'A Wax NPC on Nightmare binds it over Hive Hearth, smokes ahead of itself to carry strapped bombs in, and smokes its own feet when it is losing.',
      ],
    },
  },
};

export default wax;
