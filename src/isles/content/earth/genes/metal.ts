import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Wrought — Metal's gene tree.
 *
 * Metal is a blood-smith: Slash (25 and Aggressive Bleeding; your own blood puddles fill the
 * blood bar), Flail Craft (a chained head that trails you, then swings for 10s), Blood Transfusion
 * (hold to drain the bar into HP), Chain Tether (a 5s tether that bleeds) and Clot Armor (the
 * whole bar spent as shield that sheds blood shards as it breaks). The tree has three works:
 * **Edge** (the sword and the flail), **Chain** (the tether's tempo) and **Blood** (what the
 * transfusion and the clot make of a body).
 *
 * Blood Transfusion has no cooldown: each fresh hold counts as an R cast.
 */
export const METAL_GENE_TREE: GeneTree = {
  element: 'metal',
  name: 'Wrought',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: an edge kept keen, and the cut opens wider. */
    gene({
      id: 'gene-metal-whetstone', name: 'Whetstone', tier: 0, col: 0,
      text: 'Slash casts make the foe take +2% damage for 0.6s',
      maxLevel: 4, cost: linear(7, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 600 })),
      mastery: {
        name: 'Red Iron', cost: 16,
        text: 'Hits have a 10% chance to burn with a hot edge: 12 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 12, durationMs: 3000 }),
      },
    }),
    /** Identity root: the chain goes out, and the forge behind you keeps working. */
    gene({
      id: 'gene-metal-bellows', name: 'Bellows', tier: 0, col: 1,
      text: 'Chain Tether casts shave 250ms off every other cooldown',
      maxLevel: 4, cost: linear(7, 2),
      grant: cast('f', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'Spare Links', cost: 16,
        text: 'Chain Tether casts have a 15% chance to come straight back — there was more chain on the drum',
        grant: onCast('f', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: rings of iron under the apron. */
    gene({
      id: 'gene-metal-chainmail', name: 'Chainmail', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(7, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Gorget', cost: 16,
        text: 'Start every fight with a shield charge — a steel collar that takes the first blow',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Spiked Head: a flail forged with points on it, for the whole ten seconds it lives. */
    gene({
      id: 'gene-metal-spiked-head', name: 'Spiked Head', tier: 1, col: 0, needs: ['gene-metal-whetstone'],
      text: 'Flail Craft casts make the foe take +4% damage for the flail\'s 10s',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('e', (lv) => ({ damageMult: gain(0.04)(lv), ms: 10000 })),
      mastery: {
        name: 'Morning Star', cost: 20,
        text: 'Flail Craft casts throw sparks off the anvil: 16 to everything within 110px',
        grant: onCast('e', { burst: { damage: 16, radius: 110 } }),
      },
    }),
    /** Reel In: you haul on the chain and close the distance. */
    gene({
      id: 'gene-metal-reel-in', name: 'Reel In', tier: 1, col: 1, needs: ['gene-metal-bellows'],
      text: 'Chain Tether casts give +5% move speed for the tether\'s 5s',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('f', (lv) => ({ speedMult: gain(0.05)(lv), ms: 5000 })),
      mastery: {
        name: 'Drag Chain', cost: 20,
        text: 'Chain Tether casts make the foe take +10% damage for 5s — they cannot roll with it',
        grant: onCast('f', { damageMult: 1.1, ms: 5000 }),
      },
    }),
    /** Iron in the Blood: what you drink back sets in you as iron. */
    gene({
      id: 'gene-metal-iron-in-the-blood', name: 'Iron in the Blood', tier: 1, col: 2, needs: ['gene-metal-chainmail'],
      text: 'Blood Transfusion holds give you 2 shield HP',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('r', (lv) => ({ shield: flat(2)(lv) })),
      mastery: {
        name: 'Scab', cost: 20,
        text: 'When hit, a 20% chance the wound clots at once: heal 8 (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'healBurst', amount: 8 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Tempered Edge: drawn, quenched and drawn again. */
    gene({
      id: 'gene-metal-tempered-edge', name: 'Tempered Edge', tier: 2, col: 0, needs: ['gene-metal-spiked-head'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(10, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Serrations', cost: 24,
        text: '+10% status damage and duration — Aggressive Bleeding runs longer and redder',
        grant: effect({ statusDmgMult: 1.1, statusDurMult: 1.1 }),
      },
    }),
    /** Quench Oil: steel that cools fast and comes back to the hand fast. */
    gene({
      id: 'gene-metal-quench-oil', name: 'Quench Oil', tier: 2, col: 1, needs: ['gene-metal-reel-in'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: linear(10, 3),
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Anvil Ring', cost: 24,
        text: 'Every 9s the anvil rings: every cooldown skips 0.8s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 9, action: 'cooldownRefund', amount: 800 }),
      },
    }),
    /** Riveted: plates hammered on cold, so what strikes them rings back. */
    gene({
      id: 'gene-metal-riveted', name: 'Riveted', tier: 2, col: 2, needs: ['gene-metal-iron-in-the-blood'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(10, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Rivet Plate', cost: 24,
        text: 'When hit, a 15% chance to hammer on a fresh plate — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Hot Iron: the blood clots into armour again sooner. */
    gene({
      id: 'gene-metal-hot-iron', name: 'Hot Iron', tier: 3, col: 0, needs: ['gene-metal-tempered-edge'],
      text: '−5% Clot Armor (ultimate) cooldown',
      maxLevel: 3, cost: linear(15, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Blood Forge', cost: 30,
        text: 'Clot Armor casts make the foe take +15% damage for 6s while the shards fly',
        grant: onCast('q', { damageMult: 1.15, ms: 6000 }),
      },
    }),
    /** Smelt: crosses Edge and Chain — every flail you forge pours a little heat back into you. */
    gene({
      id: 'gene-metal-smelt', name: 'Smelt', tier: 3, col: 1,
      needs: ['gene-metal-quench-oil', 'gene-metal-tempered-edge'],
      text: 'Flail Craft casts heal 4 HP',
      maxLevel: 4, cost: linear(12, 4),
      grant: cast('e', (lv) => ({ heal: flat(4)(lv) })),
      mastery: {
        name: 'Recast', cost: 32,
        text: 'Once per fight, a lethal hit is cancelled — melted down and poured again at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Plate and Blood: the clot sets over a layer of real steel, even with the bar dry. */
    gene({
      id: 'gene-metal-plate-and-blood', name: 'Plate and Blood', tier: 3, col: 2, needs: ['gene-metal-riveted'],
      text: 'Clot Armor casts give you 8 shield HP, even with an empty blood bar',
      maxLevel: 3, cost: linear(15, 4),
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Wrought Iron', cost: 30,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more fold in the steel, forever. */
    enlightened({
      id: 'gene-metal-enl-fold', name: 'Enlightened Fold', col: 0, needs: ['gene-metal-hot-iron'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: a forge that never quite goes cold. */
    enlightened({
      id: 'gene-metal-enl-forge', name: 'Enlightened Forge', col: 1, needs: ['gene-metal-smelt'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more pint of iron in the veins. */
    enlightened({
      id: 'gene-metal-enl-vein', name: 'Enlightened Vein', col: 2, needs: ['gene-metal-plate-and-blood'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
