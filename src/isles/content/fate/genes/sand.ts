import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Long Noon — Time's gene tree (element id `sand`).
 *
 * Time is a gunslinger at high noon: Quick Shot fans a six-round revolver whose bullets age
 * harder, Lasso yanks the foe back to where they stood 3s ago, Remain swallows every blow for
 * 3s and pays 80% of it afterwards, Bounty spends what you have been hit for on a slowing
 * warrant, and Always Noon banks bounty until it can stop the world. Three lines: **Lasso** (the
 * rope), **Standstill** (Remain — the dial that holds the hour) and **Warrant** (Bounty and the
 * duster that has taken the hits that pay for it).
 *
 * Engine note — why no rule here rides Click or Q: the kit fires the revolver and Always Noon
 * from its own input (`fireRevolverShot`, `doTimeAlwaysNoon`) and never stamps either, so a
 * per-cast rule on those slots would never fire; Always Noon also has no cooldown, so an
 * ultimate-cost node would buy nothing. The revolver is served by flat damage and crit instead.
 * Less damage taken also means a little less bounty (one per 5 taken) — the trade is honest.
 */
export const TIME_GENE_TREE: GeneTree = {
  element: 'sand',
  name: 'Long Noon',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Lasso root: a foe dragged backwards through their own afternoon is a foe off balance. */
    gene({
      id: 'gene-time-rawhide-rope', name: 'Rawhide Rope', tier: 0, col: 0,
      text: 'Lasso casts make the foe take +3% damage for 3s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ damageMult: gain(0.03)(lv), ms: 3000 })),
      mastery: {
        name: 'Hogtie', cost: PRICE.rootMastery,
        text: 'Hits have a 12% chance to snag a leg: the foe is 30% slower for 1.5s (at most every 5s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 5, action: 'slowEnemy', mult: 0.7, durationMs: 1500 }),
      },
    }),
    /** Standstill root: while the dial holds, every other clock keeps running for you. */
    gene({
      id: 'gene-time-sundial', name: 'Sundial', tier: 0, col: 1,
      text: 'Remain casts shave 400ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('r', (lv) => ({ refundOthers: flat(400)(lv) })),
      mastery: {
        name: 'Noon Bell', cost: PRICE.rootMastery,
        text: 'Remain casts strike twelve: 14 to everything within 100px',
        grant: onCast('r', { burst: { damage: 14, radius: 100 } }),
      },
    }),
    /** Warrant root: a long coat that has turned a good many bullets. */
    gene({
      id: 'gene-time-dust-coat', name: 'Dust Coat', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Quick on the Draw', cost: PRICE.rootMastery,
        text: '+3% dodge chance — gone from where the shot was aimed a second before it arrived',
        grant: effect({ dodgeChance: 0.03 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Long Throw: the rope goes out, and the roper goes after it. */
    gene({
      id: 'gene-time-long-throw', name: 'Long Throw', tier: 1, col: 0, needs: ['gene-time-rawhide-rope'],
      text: 'Lasso casts make you 5% faster for 2s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('e', (lv) => ({ speedMult: gain(0.05)(lv), ms: 2000 })),
      mastery: {
        name: 'Second Loop', cost: PRICE.t1Mastery,
        text: 'Lasso casts have a 15% chance to come straight back — a second coil was on the saddle',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Hold Still: three seconds where nothing reaches you is three seconds to mend. */
    gene({
      id: 'gene-time-hold-still', name: 'Hold Still', tier: 1, col: 1, needs: ['gene-time-sundial'],
      text: 'Remain casts heal you 3 HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Siesta', cost: PRICE.t1Mastery,
        text: 'Every 12s the hat tips over your eyes for a moment: heal 8',
        grant: behavior({ trigger: 'everyNSec', periodSec: 12, action: 'healBurst', amount: 8 }),
      },
    }),
    /** Wanted Poster: their face on every wall, and every hand against them. */
    gene({
      id: 'gene-time-wanted-poster', name: 'Wanted Poster', tier: 1, col: 2, needs: ['gene-time-dust-coat'],
      text: 'Bounty casts make the foe take +4% damage for 4s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ damageMult: gain(0.04)(lv), ms: 4000 })),
      mastery: {
        name: 'Dead or Alive', cost: PRICE.t1Mastery,
        text: 'Bounty casts fire a warning shot into the dirt: 14 to everything within 120px of you',
        grant: onCast('f', { burst: { damage: 14, radius: 120 } }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Aged Rounds: bullets that have sat in the sun long enough to mean it. */
    gene({
      id: 'gene-time-aged-rounds', name: 'Aged Rounds', tier: 2, col: 0, needs: ['gene-time-long-throw'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Fan the Hammer', cost: PRICE.t2Mastery,
        text: 'Hits have a 10% chance to wind every clock forward 500ms (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 4, action: 'cooldownRefund', amount: 500 }),
      },
    }),
    /** Slow Hours: the afternoon stretches for whoever is holding the watch. */
    gene({
      id: 'gene-time-slow-hours', name: 'Slow Hours', tier: 2, col: 1, needs: ['gene-time-hold-still'],
      text: '−3% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.03)(lv) })),
      mastery: {
        name: 'Pocket Watch', cost: PRICE.t2Mastery,
        text: 'Every 9s the watch in your pocket ticks: 600ms off every cooldown',
        grant: behavior({ trigger: 'everyNSec', periodSec: 9, action: 'cooldownRefund', amount: 600 }),
      },
    }),
    /** Hard Bargain: the price on your head is paid by whoever tries to collect. */
    gene({
      id: 'gene-time-hard-bargain', name: 'Hard Bargain', tier: 2, col: 2, needs: ['gene-time-wanted-poster'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Tin Star', cost: PRICE.t2Mastery,
        text: 'When hit, a 15% chance the badge takes the next one — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Showdown: two figures in the street, and only one of them has done this before. */
    gene({
      id: 'gene-time-showdown', name: 'Showdown', tier: 3, col: 0, needs: ['gene-time-aged-rounds'],
      text: '+2% crit chance',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ critChance: flat(0.02)(lv) })),
      mastery: {
        name: 'Between the Eyes', cost: PRICE.t3Mastery,
        text: 'Critical hits land at 2.4× — the clock strikes, and so do you',
        grant: effect({ critMult: 2.4 }),
      },
    }),
    /** Borrowed Minute: crosses Lasso and Standstill — the warrant is served, and you breathe. */
    gene({
      id: 'gene-time-borrowed-minute', name: 'Borrowed Minute', tier: 3, col: 1,
      needs: ['gene-time-slow-hours', 'gene-time-aged-rounds'],
      text: 'Bounty casts heal you 4 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('f', (lv) => ({ heal: flat(4)(lv) })),
      mastery: {
        name: 'Rewind', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and the dial runs you back to 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Last Light: the warrant is out, and the coat is buttoned for what comes back. */
    gene({
      id: 'gene-time-last-light', name: 'Last Light', tier: 3, col: 2, needs: ['gene-time-hard-bargain'],
      text: 'Bounty casts give you 8 shield HP',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('f', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Tumbleweed', cost: PRICE.t3Mastery,
        text: '+8% movement speed',
        grant: effect({ speedMult: 1.08 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more grain of powder in every round. */
    enlightened({
      id: 'gene-time-enl-powder', name: 'Enlightened Powder', col: 0, needs: ['gene-time-showdown'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: noon comes a moment earlier every day. */
    enlightened({
      id: 'gene-time-enl-hour', name: 'Enlightened Hour', col: 1, needs: ['gene-time-borrowed-minute'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more patch on the duster, forever. */
    enlightened({
      id: 'gene-time-enl-duster', name: 'Enlightened Duster', col: 2, needs: ['gene-time-last-light'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
