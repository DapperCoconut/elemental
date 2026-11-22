import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Dirty Money — Subterfuge's gene tree.
 *
 * Subterfuge is a crook with a purse: Molecular Cutter daggers that plant and recall, a held
 * Spray of hitscan bullets, Recruit and Bribe (one money each), and Dark Treachery, which steals
 * the foe's own ultimate. Three lines: **Trigger** (the daggers and the spray — the wet work),
 * **Payroll** (hiring and bribing — the money moving) and **Alibi** (never being where the blame
 * lands, and the double-cross at the end).
 *
 * Cast timing matters here. The Cutter never stamps a cast (its cooldown is 0 and the kit throws
 * or recalls straight from the press), so nothing in this tree hangs off Click — the Trigger line
 * pays out as stats and on-hit rolls instead. Spray stamps when a burst ENDS (or a reload is
 * bought), so its genes pay out after the bullets, not before. Recruit and Bribe stamp only when
 * the money is paid, so a broke press earns nothing.
 */
export const SUBTERFUGE_GENE_TREE: GeneTree = {
  element: 'subterfuge',
  name: 'Dirty Money',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Trigger root: the spray stops, the daggers come in behind it. */
    gene({
      id: 'gene-sub-follow-through', name: 'Follow-Through', tier: 0, col: 0,
      text: 'When a Spray burst ends (or you buy a reload), the foe takes +3% damage for 2s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ damageMult: gain(0.03)(lv), ms: 2000 })),
      mastery: {
        name: 'Hot Streak', cost: PRICE.rootMastery,
        text: 'Hits have a 10% chance to put you on a streak: +15% damage for 2s (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 4, action: 'tempDamage', mult: 1.15, durationMs: 2000 }),
      },
    }),
    /** Payroll root: a hire signed is a debt called in elsewhere. */
    gene({
      id: 'gene-sub-payroll', name: 'Payroll', tier: 0, col: 1,
      text: 'Recruit casts shave 400ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('r', (lv) => ({ refundOthers: flat(400)(lv) })),
      mastery: {
        name: 'Clean Getaway', cost: PRICE.rootMastery,
        text: 'Bribe casts make you 10% faster for 3s — never be there when they count the money',
        grant: onCast('f', { speedMult: 1.1, ms: 3000 }),
      },
    }),
    /** Alibi root: it was somebody else, and there are witnesses. */
    gene({
      id: 'gene-sub-body-double', name: 'Body Double', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Plausible Deniability', cost: PRICE.rootMastery,
        text: '+4% dodge chance — that blow was meant for someone who looked like you',
        grant: effect({ dodgeChance: 0.04 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Honed Edge: molecular steel, sharpened to a finer molecule. */
    gene({
      id: 'gene-sub-honed-edge', name: 'Honed Edge', tier: 1, col: 0, needs: ['gene-sub-follow-through'],
      text: '+2% damage dealt',
      maxLevel: 4, cost: PRICE.t1,
      grant: stat((lv) => ({ damageMult: gain(0.02)(lv) })),
      mastery: {
        name: 'Recall Drill', cost: PRICE.t1Mastery,
        text: 'Hits have a 10% chance to shave 400ms off every cooldown (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'cooldownRefund', amount: 400 }),
      },
    }),
    /** Hush Money: a censored foe hits softer — and is that much easier to cut. */
    gene({
      id: 'gene-sub-hush-money', name: 'Hush Money', tier: 1, col: 1, needs: ['gene-sub-payroll'],
      text: 'Bribe casts make the foe take +4% damage for the bribe\'s 8s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ damageMult: gain(0.04)(lv), ms: 8000 })),
      mastery: {
        name: 'Kickback', cost: PRICE.t1Mastery,
        text: 'Bribe casts give you 10 shield HP — the payoff comes back in your coat lining',
        grant: onCast('f', { shield: 10 }),
      },
    }),
    /** Safehouse: when the shooting stops, you are already behind cover. */
    gene({
      id: 'gene-sub-safehouse', name: 'Safehouse', tier: 1, col: 2, needs: ['gene-sub-body-double'],
      text: 'When a Spray burst ends (or you buy a reload), you get 4 shield HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('e', (lv) => ({ shield: flat(4)(lv) })),
      mastery: {
        name: 'Exit Strategy', cost: PRICE.t1Mastery,
        text: 'The first time you fall below 40% HP, run: 40% faster for 4s',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.4, oncePerMatch: true, action: 'tempHaste', mult: 1.4, durationMs: 4000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Dumdum Rounds: an ugly bullet for an ugly trade. */
    gene({
      id: 'gene-sub-dumdum-rounds', name: 'Dumdum Rounds', tier: 2, col: 0, needs: ['gene-sub-honed-edge'],
      text: '+2% crit chance',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ critChance: flat(0.02)(lv) })),
      mastery: {
        name: 'Double Tap', cost: PRICE.t2Mastery,
        text: 'Crits hit for ×2.4 instead of ×2',
        grant: effect({ critMult: 2.4 }),
      },
    }),
    /** Laundered: the books run faster when nobody reads them. */
    gene({
      id: 'gene-sub-laundered', name: 'Laundered', tier: 2, col: 1, needs: ['gene-sub-hush-money'],
      text: '−3% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.03)(lv) })),
      mastery: {
        name: 'Offshore Account', cost: PRICE.t2Mastery,
        text: 'Every 15s the books balance: every cooldown 1.5s shorter',
        grant: behavior({ trigger: 'everyNSec', periodSec: 15, action: 'cooldownRefund', amount: 1500 }),
      },
    }),
    /** Fall Guy: someone always takes the blame, and the blame is sharp. */
    gene({
      id: 'gene-sub-fall-guy', name: 'Fall Guy', tier: 2, col: 2, needs: ['gene-sub-safehouse'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Muscle', cost: PRICE.t2Mastery,
        text: 'When hit, a 15% chance the muscle steps in: 14 to all within 110px (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 5, action: 'burstAoe', amount: 14, radius: 110 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Inside Job: the treachery was planned months ago. */
    gene({
      id: 'gene-sub-inside-job', name: 'Inside Job', tier: 3, col: 0, needs: ['gene-sub-dumdum-rounds'],
      text: '−5% Dark Treachery (ultimate) cost',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Double Cross', cost: PRICE.t3Mastery,
        text: 'Dark Treachery casts make the foe take +10% damage for 4s — the fog, then their own ultimate',
        grant: onCast('q', { damageMult: 1.1, ms: 4000 }),
      },
    }),
    /** Cooked Books: crosses Trigger and Payroll — every bribe skims a little for you. */
    gene({
      id: 'gene-sub-cooked-books', name: 'Cooked Books', tier: 3, col: 1,
      needs: ['gene-sub-laundered', 'gene-sub-dumdum-rounds'],
      text: 'Bribe casts heal you 3 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('f', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Witness Protection', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and you turn up again at 25% HP under a new name',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Golden Parachute: whoever's ultimate it was, you land soft. */
    gene({
      id: 'gene-sub-golden-parachute', name: 'Golden Parachute', tier: 3, col: 2, needs: ['gene-sub-fall-guy'],
      text: 'Dark Treachery casts give you 8 shield HP',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Silent Partner', cost: PRICE.t3Mastery,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: a finer edge, a fatter cut. */
    enlightened({
      id: 'gene-sub-enl-cut', name: 'Enlightened Cut', col: 0, needs: ['gene-sub-inside-job'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: interest, compounding. */
    enlightened({
      id: 'gene-sub-enl-interest', name: 'Enlightened Interest', col: 1, needs: ['gene-sub-cooked-books'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more alias in the drawer. */
    enlightened({
      id: 'gene-sub-enl-alias', name: 'Enlightened Alias', col: 2, needs: ['gene-sub-golden-parachute'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
