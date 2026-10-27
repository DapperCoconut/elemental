import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Warp and Weft — Cloth's gene tree.
 *
 * Cloth fights with a hand on the end of a scarf, a box of giant needles and a pincushion, so the
 * tree is a tailor's shop: **Needlework** (Needle Nexus and the Pincushion — sharper eyes, pins
 * that guard you, barbed points, ending in a Burning Man that comes round sooner), **Scarf**
 * (the Scarf Hand and the bola — every haul a little quicker, a bound foe opened up) and
 * **Quilting** (the layers: padded lining, a double stitch, a snag on whoever grabs at you).
 *
 * Scarf Hand recasts every 420ms, so its one rule is a speed window no longer than that — it
 * never stacks on itself.
 */
export const CLOTH_GENE_TREE: GeneTree = {
  element: 'cloth',
  name: 'Warp and Weft',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: while the needles stand in the floor, you are picking where to throw. */
    gene({
      id: 'gene-cloth-tailors-eye', name: "Tailor's Eye", tier: 0, col: 0,
      text: 'Needle Nexus casts make the foe take +3% damage for 3s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('e', (lv) => ({ damageMult: gain(0.03)(lv), ms: 3000 })),
      mastery: {
        name: 'Thimble Point', cost: 10,
        text: '+5% crit chance — a thrown needle finds the gap in the seams',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Identity root: each grip of the Scarf Hand hauls you a little harder. */
    gene({
      id: 'gene-cloth-long-scarf', name: 'Long Scarf', tier: 0, col: 1,
      text: 'Scarf Hand casts give +4% move speed for 0.4s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('click', (lv) => ({ speedMult: gain(0.04)(lv), ms: 400 })),
      mastery: {
        name: 'Bolt of Silk', cost: 10,
        text: '+5% move speed',
        grant: effect({ speedMult: 1.05 }),
      },
    }),
    /** Defence root: a lining of wadding under the coat. */
    gene({
      id: 'gene-cloth-padded-lining', name: 'Padded Lining', tier: 0, col: 2,
      text: '+12 max HP',
      maxLevel: 4, cost: linear(4, 2),
      grant: stat((lv) => ({ maxHp: flat(12)(lv) })),
      mastery: {
        name: 'Quilted Vest', cost: 10,
        text: 'Start every fight wearing a 20 HP quilted shield',
        grant: effect({ shieldHp: 20 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Pin Money: setting the cushion down leaves a few pins in your sleeve for luck. */
    gene({
      id: 'gene-cloth-pin-money', name: 'Pin Money', tier: 1, col: 0, needs: ['gene-cloth-tailors-eye'],
      text: 'Pincushion casts give 4 shield HP',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('f', (lv) => ({ shield: flat(4)(lv) })),
      mastery: {
        name: 'Loose Pins', cost: 14,
        text: 'Pincushion casts spill pins around you: 12 to everything within 100px',
        grant: onCast('f', { burst: { damage: 12, radius: 100 } }),
      },
    }),
    /** Bola Spin: the throw unwinds the rest of the kit. */
    gene({
      id: 'gene-cloth-bola-spin', name: 'Bola Spin', tier: 1, col: 1, needs: ['gene-cloth-long-scarf'],
      text: 'Constraining Cloth casts shave 200ms off every other cooldown',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('r', (lv) => ({ refundOthers: flat(200)(lv) })),
      mastery: {
        name: 'Tight Knot', cost: 14,
        text: 'Constraining Cloth casts make the foe take +15% damage for the 5s they are bound',
        grant: onCast('r', { damageMult: 1.15, ms: 5000 }),
      },
    }),
    /** Double Stitch: every seam sewn twice. */
    gene({
      id: 'gene-cloth-double-stitch', name: 'Double Stitch', tier: 1, col: 2, needs: ['gene-cloth-padded-lining'],
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(5, 3),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Snag', cost: 14,
        text: 'When hit, a 20% chance to snag the attacker in loose thread: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Bespoke Cut: everything you throw is made to measure. */
    gene({
      id: 'gene-cloth-bespoke-cut', name: 'Bespoke Cut', tier: 2, col: 0, needs: ['gene-cloth-pin-money'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Barbed Needle', cost: 18,
        text: 'Hits have a 12% chance to leave a barb that bleeds the foe for 10 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 3, action: 'sear', amount: 10, durationMs: 3000 }),
      },
    }),
    /** Loose Threads: binding and burning both cling to whatever they catch. */
    gene({
      id: 'gene-cloth-loose-threads', name: 'Loose Threads', tier: 2, col: 1, needs: ['gene-cloth-bola-spin'],
      text: '+4% status damage and +4% status duration',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ statusDmgMult: gain(0.04)(lv), statusDurMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Darning', cost: 18,
        text: 'Every 8s, you darn the worst of the holes: heal 5',
        grant: behavior({ trigger: 'everyNSec', periodSec: 8, action: 'healBurst', amount: 5 }),
      },
    }),
    /** Fray Guard: a fraying edge cuts the hand that grabs it. */
    gene({
      id: 'gene-cloth-fray-guard', name: 'Fray Guard', tier: 2, col: 2, needs: ['gene-cloth-double-stitch'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Patchwork', cost: 18,
        text: 'When hit, a 15% chance to stitch on a patch — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Tinder Hem: the hem was always going to catch. */
    gene({
      id: 'gene-cloth-tinder-hem', name: 'Tinder Hem', tier: 3, col: 0, needs: ['gene-cloth-bespoke-cut'],
      text: '−5% Burning Man (ultimate) cooldown',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Wicker Effigy', cost: 24,
        text: 'Burning Man casts go up with a whoomph: 20 to everything within 120px of you',
        grant: onCast('q', { burst: { damage: 20, radius: 120 } }),
      },
    }),
    /** Mend: crosses Scarf and Needlework — each needle you call down sews a little of you shut. */
    gene({
      id: 'gene-cloth-mend', name: 'Mend', tier: 3, col: 1,
      needs: ['gene-cloth-loose-threads', 'gene-cloth-bespoke-cut'],
      text: 'Needle Nexus casts heal 2 HP',
      maxLevel: 4, cost: linear(9, 4),
      grant: cast('e', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Second Skin', cost: 26,
        text: '4% of the damage you deal comes back to you as health',
        grant: effect({ lifestealFrac: 0.04 }),
      },
    }),
    /** Sailcloth: the heaviest canvas on the isle, kept for the worst weather. */
    gene({
      id: 'gene-cloth-sailcloth', name: 'Sailcloth', tier: 3, col: 2, needs: ['gene-cloth-fray-guard'],
      text: 'The first time you fall below 30% HP, heal 12',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: flat(12)(lv) }] })),
      mastery: {
        name: 'Canvas Hide', cost: 24,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: a needle ground a little finer every night. */
    enlightened({
      id: 'gene-cloth-enl-needle', name: 'Enlightened Needle', col: 0, needs: ['gene-cloth-tinder-hem'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: a scarf a stitch longer every time you look. */
    enlightened({
      id: 'gene-cloth-enl-scarf', name: 'Enlightened Scarf', col: 1, needs: ['gene-cloth-mend'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more layer of quilting, forever. */
    enlightened({
      id: 'gene-cloth-enl-quilt', name: 'Enlightened Quilt', col: 2, needs: ['gene-cloth-sailcloth'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
