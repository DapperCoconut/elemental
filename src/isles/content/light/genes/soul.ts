import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Lanternwake — Soul's gene tree.
 *
 * Soul is a necromancer with a lamp: the Lantern of the Damned's wisps (and a right-click soul
 * beam), Arise to raise the newest corpse in the queue as an Amalgam, Graves that spit out
 * zombies that hunt YOU until you burn them into corpses, the Death Whistle that hauls your
 * Amalgams to a point and heals them, and Turn — every hostile body near you changes sides. The
 * tree has three wicks: **Wick** (the lantern and the whistle's rush — the flame that burns),
 * **Wake** (Arise and Turn — the dead getting up, the cooldowns coming round with them) and
 * **Shroud** (pale skin, ectoplasm and the lantern-ward — the dead that will not lie down).
 *
 * No node keys off Grave: it re-arms every 500ms, so anything it paid would pay for planting a
 * field of headstones. The soul beam is fired by the kit without a cast, so only the wisp pays on
 * Click, and its window is the wisp's 350ms — it can never stack on itself. Arise, the Whistle and
 * Turn all count as cast even when they find nothing to raise, recall or turn.
 */
export const SOUL_GENE_TREE: GeneTree = {
  element: 'soul',
  name: 'Lanternwake',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: a wisp that lands leaves the soul under it flickering. */
    gene({
      id: 'gene-soul-witchfire', name: 'Witchfire', tier: 0, col: 0,
      text: 'Lantern wisp casts make the foe take +2% damage for 0.35s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 350 })),
      mastery: {
        name: 'Corpse Candle', cost: PRICE.rootMastery,
        text: 'Hits have a 12% chance to set a pale flame on the foe: 12 over 4s (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 4, action: 'sear', amount: 12, durationMs: 4000 }),
      },
    }),
    /** Identity root: reaching into the grave, the rest of the rite comes round quicker. */
    gene({
      id: 'gene-soul-gravedigger', name: 'Gravedigger', tier: 0, col: 1,
      text: 'Arise casts shave 250ms off every other cooldown — even when the queue is empty',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'Restless', cost: PRICE.rootMastery,
        text: 'Arise casts have a 15% chance to come straight back — the next one was already stirring',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: skin gone the colour of the lanterns, and as hard to grip as smoke. */
    gene({
      id: 'gene-soul-pale-skin', name: 'Pale Skin', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Winding Sheet', cost: PRICE.rootMastery,
        text: 'Start every fight wrapped in a 25 HP shroud shield',
        grant: effect({ shieldHp: 25 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Mourning Bell: the whistle sets the dead running, and the living flinch from the sound. */
    gene({
      id: 'gene-soul-mourning-bell', name: 'Mourning Bell', tier: 1, col: 0, needs: ['gene-soul-witchfire'],
      text: 'Death Whistle casts make the foe take +4% damage for 4s — while your Amalgams arrive',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ damageMult: gain(0.04)(lv), ms: 4000 })),
      mastery: {
        name: 'Banshee', cost: PRICE.t1Mastery,
        text: 'Death Whistle casts tear a shriek off your own lips: 16 to everything within 100px',
        grant: onCast('f', { burst: { damage: 16, radius: 100 } }),
      },
    }),
    /** Pallbearer: the bodies that change sides carry the whole procession forward. */
    gene({
      id: 'gene-soul-pallbearer', name: 'Pallbearer', tier: 1, col: 1, needs: ['gene-soul-gravedigger'],
      text: 'Turn casts shave 600ms off every other cooldown',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('q', (lv) => ({ refundOthers: flat(600)(lv) })),
      mastery: {
        name: 'Lych Bell', cost: PRICE.t1Mastery,
        text: 'Every 12s a bell tolls in the gorge and you heal 5',
        grant: behavior({ trigger: 'everyNSec', periodSec: 12, action: 'healBurst', amount: 5 }),
      },
    }),
    /** Lantern Glass: the whistle draws a pane of soul-light round the one who blew it. */
    gene({
      id: 'gene-soul-lantern-glass', name: 'Lantern Glass', tier: 1, col: 2, needs: ['gene-soul-pale-skin'],
      text: 'Death Whistle casts give you 5 shield HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Cold Hands', cost: PRICE.t1Mastery,
        text: 'When hit, a 20% chance a dead hand grips the attacker: 30% slower for 1.8s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.7, durationMs: 1800 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Soul Hunger: the flame eats a little more of whatever it touches. */
    gene({
      id: 'gene-soul-soul-hunger', name: 'Soul Hunger', tier: 2, col: 0, needs: ['gene-soul-mourning-bell'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Soul Drink', cost: PRICE.t2Mastery,
        text: '3% of the damage you deal comes back to you as health',
        grant: effect({ lifestealFrac: 0.03 }),
      },
    }),
    /** Ferryman's Coin: the boat across is paid in advance, and leaves on the hour. */
    gene({
      id: 'gene-soul-ferrymans-coin', name: "Ferryman's Coin", tier: 2, col: 1, needs: ['gene-soul-pallbearer'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Passage Paid', cost: PRICE.t2Mastery,
        text: 'Every 7s the ferry pushes off and every cooldown skips 0.4s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 7, action: 'cooldownRefund', amount: 400 }),
      },
    }),
    /** Ectoplasm: half of you is already on the other side, and blows pass through that half. */
    gene({
      id: 'gene-soul-ectoplasm', name: 'Ectoplasm', tier: 2, col: 2, needs: ['gene-soul-lantern-glass'],
      text: '+2% dodge chance',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ dodgeChance: flat(0.02)(lv) })),
      mastery: {
        name: 'Haunt', cost: PRICE.t2Mastery,
        text: '+20 max HP — something else has moved in, and it fights for the body too',
        grant: effect({ maxHp: 20 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Lich Wick: the whole gorge answers to you again sooner. */
    gene({
      id: 'gene-soul-lich-wick', name: 'Lich Wick', tier: 3, col: 0, needs: ['gene-soul-soul-hunger'],
      text: '−5% Turn (ultimate) cooldown',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Mass Grave', cost: PRICE.t3Mastery,
        text: 'Turn casts heave the ground under you open: 22 to everything within 150px',
        grant: onCast('q', { burst: { damage: 22, radius: 150 } }),
      },
    }),
    /** Undertaker: crosses Wick and Wake — every body you lift lifts you a little too. */
    gene({
      id: 'gene-soul-undertaker', name: 'Undertaker', tier: 3, col: 1,
      needs: ['gene-soul-ferrymans-coin', 'gene-soul-soul-hunger'],
      text: 'Arise casts heal 2 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('e', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Rise Again', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and you Arise yourself at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Lantern Ward: when the dead change sides, they close ranks round their new master. */
    gene({
      id: 'gene-soul-lantern-ward', name: 'Lantern Ward', tier: 3, col: 2, needs: ['gene-soul-ectoplasm'],
      text: 'Turn casts give you 8 shield HP',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Shroud of the Gorge', cost: PRICE.t3Mastery,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more soul in the lamp, every night that never comes. */
    enlightened({
      id: 'gene-soul-enl-flame', name: 'Enlightened Flame', col: 0, needs: ['gene-soul-lich-wick'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the procession a step quicker every time it passes. */
    enlightened({
      id: 'gene-soul-enl-procession', name: 'Enlightened Procession', col: 1, needs: ['gene-soul-undertaker'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more thread of shroud, forever. */
    enlightened({
      id: 'gene-soul-enl-shroud', name: 'Enlightened Shroud', col: 2, needs: ['gene-soul-lantern-ward'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
