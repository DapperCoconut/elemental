import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Squash and Stretch — Ink's gene tree.
 *
 * Ink is a black-and-white cartoon, so the tree runs on cartoon rules: **Gag** (the setups — a
 * banana peel that softens the mark, a heavier Ol' 6 Ton, a studio that opens up sooner),
 * **Chase** (Skedaddle's wind-up and rebound — speed, cooldowns shaken loose, healing on the run)
 * and **Rubber Hose** (a body drawn in bendy lines: it takes the anvil, walks it off, and gets
 * redrawn).
 *
 * Finger Guns has no cooldown — every click is a shot — so nothing keys off the click; the
 * shooting nodes are crit stats instead.
 */
export const INK_GENE_TREE: GeneTree = {
  element: 'ink',
  name: 'Squash and Stretch',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: anyone watching a banana peel is not watching you. */
    gene({
      id: 'gene-ink-pratfall', name: 'Pratfall', tier: 0, col: 0,
      text: 'Oooo Banana casts make the foe take +3% damage for 2s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('e', (lv) => ({ damageMult: gain(0.03)(lv), ms: 2000 })),
      mastery: {
        name: 'Bunch of Bananas', cost: 10,
        text: 'Oooo Banana casts have a 15% chance to come straight back off cooldown',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Identity root: the legs are still spinning after Skedaddle lets go. */
    gene({
      id: 'gene-ink-wind-up', name: 'Wind-Up', tier: 0, col: 1,
      text: 'Skedaddle casts give +6% move speed for 2s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('r', (lv) => ({ speedMult: gain(0.06)(lv), ms: 2000 })),
      mastery: {
        name: 'Dust Cloud', cost: 10,
        text: 'Skedaddle casts kick up a cartoon dust cloud: 12 to everything within 90px of you',
        grant: onCast('r', { burst: { damage: 12, radius: 90 } }),
      },
    }),
    /** Defence root: arms and legs drawn as hoses bend instead of breaking. */
    gene({
      id: 'gene-ink-rubber-hose', name: 'Rubber Hose', tier: 0, col: 2,
      text: '+12 max HP',
      maxLevel: 4, cost: linear(4, 2),
      grant: stat((lv) => ({ maxHp: flat(12)(lv) })),
      mastery: {
        name: 'Hammerspace', cost: 10,
        text: 'Start every fight with 1 shield charge — a frying pan pulled from nowhere',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Heavier Anvil: the stamp on the side now reads 7 TON. The window covers the 3s haul and
     *  the hold, so the slam lands inside it. */
    gene({
      id: 'gene-ink-heavier-anvil', name: 'Heavier Anvil', tier: 1, col: 0, needs: ['gene-ink-pratfall'],
      text: "Ol' 6 Ton casts make the foe take +3% damage for 7s",
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('f', (lv) => ({ damageMult: gain(0.03)(lv), ms: 7000 })),
      mastery: {
        name: 'Mail-Order Delivery', cost: 14,
        text: "Ol' 6 Ton casts shave 1.5s off every other cooldown",
        grant: onCast('f', { refundOthers: 1500 }),
      },
    }),
    /** Squash: every bounce off the wall knocks something loose. */
    gene({
      id: 'gene-ink-squash', name: 'Squash', tier: 1, col: 1, needs: ['gene-ink-wind-up'],
      text: 'Skedaddle casts shave 200ms off every other cooldown',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('r', (lv) => ({ refundOthers: flat(200)(lv) })),
      mastery: {
        name: 'Stretch', cost: 14,
        text: '+5% move speed',
        grant: effect({ speedMult: 1.05 }),
      },
    }),
    /** Toon Physics: a hit is a gag, and gags do not really hurt. */
    gene({
      id: 'gene-ink-toon-physics', name: 'Toon Physics', tier: 1, col: 2, needs: ['gene-ink-rubber-hose'],
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(5, 3),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Walk It Off', cost: 14,
        text: 'When hit, a 20% chance to shake the stars off and heal 6 (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'healBurst', amount: 6 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Fanning the Hammer: the finger guns go off faster than the eye — and find the soft spot. */
    gene({
      id: 'gene-ink-fanning', name: 'Fanning the Hammer', tier: 2, col: 0, needs: ['gene-ink-heavier-anvil'],
      text: '+2% crit chance',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ critChance: flat(0.02)(lv) })),
      mastery: {
        name: 'BANG! Flag', cost: 18,
        text: 'Hits have a 6% chance to give you +25% damage for 2s (at most every 6s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.06, cooldownSec: 6, action: 'tempDamage', mult: 1.25, durationMs: 2000 }),
      },
    }),
    /** Cartoon Momentum: once the feet are a blur they stay a blur. */
    gene({
      id: 'gene-ink-cartoon-momentum', name: 'Cartoon Momentum', tier: 2, col: 1, needs: ['gene-ink-squash'],
      text: '+3% move speed',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ speedMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Hole in the Pocket', cost: 18,
        text: 'Every 15s, every cooldown skips 1s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 15, action: 'cooldownRefund', amount: 1000 }),
      },
    }),
    /** Thick Outline: a heavier line round the character holds the shape. */
    gene({
      id: 'gene-ink-thick-outline', name: 'Thick Outline', tier: 2, col: 2, needs: ['gene-ink-toon-physics'],
      text: 'Start every fight with +6 shield HP',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ shieldHp: flat(6)(lv) })),
      mastery: {
        name: 'Smear Frame', cost: 18,
        text: '+5% dodge chance — for one frame you are a streak',
        grant: effect({ dodgeChance: 0.05 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Off the Desk: the animator pulls the camera back more often. */
    gene({
      id: 'gene-ink-off-the-desk', name: 'Off the Desk', tier: 3, col: 0, needs: ['gene-ink-fanning'],
      text: '−5% Foux World (ultimate) cooldown',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Studio Lights', cost: 24,
        text: 'Foux World casts make the foe take +15% damage for the full 10s on the desk',
        grant: onCast('q', { damageMult: 1.15, ms: 10000 }),
      },
    }),
    /** Run on Air: crosses Chase and Gag — it does not hurt until you look down. */
    gene({
      id: 'gene-ink-run-on-air', name: 'Run on Air', tier: 3, col: 1,
      needs: ['gene-ink-cartoon-momentum', 'gene-ink-fanning'],
      text: 'Skedaddle casts heal 3 HP',
      maxLevel: 4, cost: linear(9, 4),
      grant: cast('r', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: "That's Not All", cost: 26,
        text: 'Once per fight, a lethal hit is cancelled and you are redrawn at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Iris Out: the circle closes in — and then, at the last second, does not. */
    gene({
      id: 'gene-ink-iris-out', name: 'Iris Out', tier: 3, col: 2, needs: ['gene-ink-thick-outline'],
      text: 'The first time you fall below 30% HP, heal 12',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: flat(12)(lv) }] })),
      mastery: {
        name: 'Ink-Proof', cost: 24,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: the gag that gets a bigger laugh every rerun. */
    enlightened({
      id: 'gene-ink-enl-gag', name: 'Enlightened Gag', col: 0, needs: ['gene-ink-off-the-desk'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: a few frames cut from every reel. */
    enlightened({
      id: 'gene-ink-enl-reel', name: 'Enlightened Reel', col: 1, needs: ['gene-ink-run-on-air'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more coat of ink on the outline, forever. */
    enlightened({
      id: 'gene-ink-enl-line', name: 'Enlightened Line', col: 2, needs: ['gene-ink-iris-out'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
