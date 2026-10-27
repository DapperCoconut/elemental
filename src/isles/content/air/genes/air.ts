import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Fanwind — Air's gene tree.
 *
 * Air is a fan dancer: Wind Splice cuts from the hand and throws a shear, Spin Dance whirls and
 * (on contact) brings every other ability back sooner, Gale Glaive is both fans thrown as one and
 * parked on the cursor, Sky Grapple hooks across the arena untouchable, and Wind Breaker turns her
 * into a tornado that cannot attack. Her defence is *wind dodge*, banked by landing dances. The tree
 * has three lines: **Fans** (the cut and the glaive), **Dance** (tempo — the spin's refunds and the
 * grapple's footwork) and **Sky** (dodge, the hook's landing, and the eye of the tornado).
 *
 * Wind Splice fires every 700ms, so its window is 0.7s and never stacks on itself. Spin Dance runs
 * on the kit's own charges, not a Fighter cooldown — so no node refunds *it*; E nodes pay out
 * elsewhere instead.
 */
export const AIR_GENE_TREE: GeneTree = {
  element: 'air',
  name: 'Fanwind',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: a fan edge honed thin enough to part the breath-meter's brass. */
    gene({
      id: 'gene-air-keen-fans', name: 'Keen Fans', tier: 0, col: 0,
      text: 'Wind Splice casts make the foe take +2% damage for 0.7s',
      maxLevel: 4, cost: linear(6, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 700 })),
      mastery: {
        name: 'Crosswind', cost: 14,
        text: 'Hits have a 10% chance to catch the foe in a crosswind: 20% slower for 1.5s (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 4, action: 'slowEnemy', mult: 0.8, durationMs: 1500 }),
      },
    }),
    /** Identity root: every turn of the dance loosens the rest of the routine. */
    gene({
      id: 'gene-air-light-feet', name: 'Light Feet', tier: 0, col: 1,
      text: 'Spin Dance casts shave 200ms off every other cooldown',
      maxLevel: 4, cost: linear(6, 2),
      grant: cast('e', (lv) => ({ refundOthers: flat(200)(lv) })),
      mastery: {
        name: 'Turnout', cost: 14,
        text: '+5% movement speed — hips open, feet already pointed where you mean to go',
        grant: effect({ speedMult: 1.05 }),
      },
    }),
    /** Defence root: lungs that need less of the King's metered air. */
    gene({
      id: 'gene-air-thin-air', name: 'Thin Air', tier: 0, col: 2,
      text: '+1.5% dodge chance, on top of your wind dodge',
      maxLevel: 4, cost: linear(6, 2),
      grant: stat((lv) => ({ dodgeChance: flat(0.015)(lv) })),
      mastery: {
        name: 'Feather Fall', cost: 14,
        text: 'Untouchable for the first 1.5s of every fight — you drift in on the breeze',
        grant: effect({ invincibleMs: 1500 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Parked Glaive: two seconds of fans spinning over the foe, then the return. */
    gene({
      id: 'gene-air-parked-glaive', name: 'Parked Glaive', tier: 1, col: 0, needs: ['gene-air-keen-fans'],
      text: 'Gale Glaive casts make the foe take +4% damage for the 3s it is out',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('r', (lv) => ({ damageMult: gain(0.04)(lv), ms: 3000 })),
      mastery: {
        name: 'Fan Flurry', cost: 18,
        text: 'Gale Glaive casts kick up a ring of cut air: 14 to everything within 110px',
        grant: onCast('r', { burst: { damage: 14, radius: 110 } }),
      },
    }),
    /** Ballon: the lightness of a dancer between two steps. */
    gene({
      id: 'gene-air-ballon', name: 'Ballon', tier: 1, col: 1, needs: ['gene-air-light-feet'],
      text: 'Spin Dance casts make you 8% faster for 2s',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('e', (lv) => ({ speedMult: gain(0.08)(lv), ms: 2000 })),
      mastery: {
        name: 'Grand Jeté', cost: 18,
        text: 'Sky Grapple casts shave 1s off every other cooldown — the leap is part of the dance',
        grant: onCast('f', { refundOthers: 1000 }),
      },
    }),
    /** Hook and Line: you land braced against the wind that carried you. */
    gene({
      id: 'gene-air-hook-and-line', name: 'Hook and Line', tier: 1, col: 2, needs: ['gene-air-thin-air'],
      text: 'Sky Grapple casts give you 5 shield HP',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('f', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Cloud Cover', cost: 18,
        text: 'When hit, a 20% chance to be blown clear: 25% faster for 1.5s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'tempHaste', mult: 1.25, durationMs: 1500 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Honed Edge: the fans' ribs filed to a whistle. */
    gene({
      id: 'gene-air-honed-edge', name: 'Honed Edge', tier: 2, col: 0, needs: ['gene-air-parked-glaive'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Razor Ribs', cost: 22,
        text: '+5% crit chance — a rib of the fan finds the gap in the brass',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Tempo: the routine runs faster every time it is danced. */
    gene({
      id: 'gene-air-tempo', name: 'Tempo', tier: 2, col: 1, needs: ['gene-air-ballon'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Encore', cost: 22,
        text: 'Every 12s the wind picks up: every cooldown comes 1s sooner',
        grant: behavior({ trigger: 'everyNSec', periodSec: 12, action: 'cooldownRefund', amount: 1000 }),
      },
    }),
    /** Slipstream: blows that land glance off the air around you. */
    gene({
      id: 'gene-air-slipstream', name: 'Slipstream', tier: 2, col: 2, needs: ['gene-air-hook-and-line'],
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Weathervane', cost: 22,
        text: 'When hit, a 15% chance to turn into the wind — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Eye of the Gale: the tornado comes back round sooner. */
    gene({
      id: 'gene-air-eye-of-the-gale', name: 'Eye of the Gale', tier: 3, col: 0, needs: ['gene-air-honed-edge'],
      text: '−5% Wind Breaker (ultimate) cooldown',
      maxLevel: 3, cost: linear(14, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Thrown Clear', cost: 28,
        text: 'Wind Breaker casts blast the air out of the funnel: 20 to everything within 140px',
        grant: onCast('q', { burst: { damage: 20, radius: 140 } }),
      },
    }),
    /** Pas de Deux: crosses Fans and Dance — every spin catches your breath for you. */
    gene({
      id: 'gene-air-pas-de-deux', name: 'Pas de Deux', tier: 3, col: 1,
      needs: ['gene-air-tempo', 'gene-air-honed-edge'],
      text: 'Spin Dance casts heal 2 HP',
      maxLevel: 4, cost: linear(11, 4),
      grant: cast('e', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Curtain Call', cost: 30,
        text: 'Once per fight, a lethal hit is cancelled and you take one more bow at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Calm Eye: the tornado cannot attack, so it learns to hold. */
    gene({
      id: 'gene-air-calm-eye', name: 'Calm Eye', tier: 3, col: 2, needs: ['gene-air-slipstream'],
      text: 'Wind Breaker casts give you 8 shield HP for the 5s you cannot attack',
      maxLevel: 3, cost: linear(14, 4),
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'High Pressure', cost: 28,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more fold in the fan. */
    enlightened({
      id: 'gene-air-enl-fold', name: 'Enlightened Fold', col: 0, needs: ['gene-air-eye-of-the-gale'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the dance a beat quicker every time it is learned again. */
    enlightened({
      id: 'gene-air-enl-step', name: 'Enlightened Step', col: 1, needs: ['gene-air-pas-de-deux'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more breath the King will never meter. */
    enlightened({
      id: 'gene-air-enl-lungs', name: 'Enlightened Lungs', col: 2, needs: ['gene-air-calm-eye'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
