import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from './helpers';

/**
 * Honeywick — Wax's gene tree.
 *
 * Wax is a fencer with a hive, so the tree is part salle, part apiary: **Foil** (Stinger
 * Strikes — thrust, lunge, venom, a killing riposte), **Hive** (Swarm and Hive Hearth — more
 * bees, sooner, and a guard that becomes a shield, ending in Sticky Bombs) and **Candle**
 * (Candle Mount's light — shields, sealing wax and a saint's resurrection).
 */
export const WAX_GENE_TREE: GeneTree = {
  element: 'wax',
  name: 'Honeywick',
  nodes: [
    // ── Tier 0 ────────────────────────────────────────────────────────
    /** Foil Discipline: six thrusts that open the guard. */
    gene({
      id: 'gene-wax-foil-discipline', name: 'Foil Discipline', tier: 0, col: 0,
      text: 'Stinger Strikes casts make the foe take +3% damage for 1.5s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.03)(lv), ms: 1500 })),
      mastery: {
        name: 'Riposte', cost: 10,
        text: 'Reflect 5% of damage taken back at the attacker',
        grant: effect({ reflectFraction: 0.05 }),
      },
    }),
    /** Queen's Scent: bees in a Swarm go where the queen points. */
    gene({
      id: 'gene-wax-queens-scent', name: "Queen's Scent", tier: 0, col: 1,
      text: 'Swarm casts make the foe take +3% damage for 3s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('e', (lv) => ({ damageMult: gain(0.03)(lv), ms: 3000 })),
      mastery: {
        name: 'Royal Jelly', cost: 10,
        text: 'Swarm casts heal 8',
        grant: onCast('e', { heal: 8 }),
      },
    }),
    /** Tallow Coat: a soft, thick layer. */
    gene({
      id: 'gene-wax-tallow-coat', name: 'Tallow Coat', tier: 0, col: 2,
      text: '+12 max HP',
      maxLevel: 4, cost: linear(4, 2),
      grant: stat((lv) => ({ maxHp: flat(12)(lv) })),
      mastery: {
        name: 'Drip Guard', cost: 10,
        text: 'Start every fight with 1 shield charge that blocks a whole hit',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Lunge: the six thrusts carry your feet with them. */
    gene({
      id: 'gene-wax-lunge', name: 'Lunge', tier: 1, col: 0, needs: ['gene-wax-foil-discipline'],
      text: 'Stinger Strikes casts give +5% move speed for 1s',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('click', (lv) => ({ speedMult: gain(0.05)(lv), ms: 1000 })),
      mastery: {
        name: 'Envenomed Tip', cost: 14,
        text: "+10% status duration — the stinger's poison lingers",
        grant: effect({ statusDurMult: 1.1 }),
      },
    }),
    /** Waggle Dance: a Swarm sent out tells the rest of the kit where to go. */
    gene({
      id: 'gene-wax-waggle-dance', name: 'Waggle Dance', tier: 1, col: 1, needs: ['gene-wax-queens-scent'],
      text: 'Swarm casts shave 250ms off every other cooldown',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('e', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'Second Brood', cost: 14,
        text: 'Swarm casts have a 15% chance to come straight back off cooldown',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Candlelight Vigil: a new Candle Mount wraps you in its glow. */
    gene({
      id: 'gene-wax-candlelight-vigil', name: 'Candlelight Vigil', tier: 1, col: 2, needs: ['gene-wax-tallow-coat'],
      text: 'Candle Mount casts grant 5 shield',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('r', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Long Wick', cost: 14,
        text: 'Candle Mount casts also heal 10',
        grant: onCast('r', { heal: 10 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Venom Sac: crosses Foil and Hive — stinger poison and bee bites both run deeper. */
    gene({
      id: 'gene-wax-venom-sac', name: 'Venom Sac', tier: 2, col: 0,
      needs: ['gene-wax-lunge', 'gene-wax-waggle-dance'],
      text: '+4% status damage',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ statusDmgMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Barbed Stinger', cost: 18,
        text: 'Hits have a 10% chance to sting the foe for 10 over 4s (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 4, action: 'sear', amount: 10, durationMs: 4000 }),
      },
    }),
    /** Comb Builder: a fresh Hive Hearth sets the colony humming. */
    gene({
      id: 'gene-wax-comb-builder', name: 'Comb Builder', tier: 2, col: 1, needs: ['gene-wax-waggle-dance'],
      text: 'Hive Hearth casts shave 400ms off every other cooldown',
      maxLevel: 3, cost: linear(9, 4),
      grant: cast('f', (lv) => ({ refundOthers: flat(400)(lv) })),
      mastery: {
        name: 'Guard Bees', cost: 18,
        text: 'Hive Hearth casts grant 20 shield',
        grant: onCast('f', { shield: 20 }),
      },
    }),
    /** Wax Seal: a hardened outer layer. */
    gene({
      id: 'gene-wax-wax-seal', name: 'Wax Seal', tier: 2, col: 2, needs: ['gene-wax-candlelight-vigil'],
      text: '−2.5% damage taken',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ damageTakenMult: cut(0.025)(lv) })),
      mastery: {
        name: 'Set Wax', cost: 18,
        text: 'When hit, a 15% chance to gain a shield charge (at most every 8s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 8, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Fencer's Form: the salle's polish. */
    gene({
      id: 'gene-wax-fencers-form', name: "Fencer's Form", tier: 3, col: 0, needs: ['gene-wax-venom-sac'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(9, 4),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Coup de Grâce', cost: 26,
        text: '+6% crit chance, and crits deal at least 1.75× damage',
        grant: effect({ critChance: 0.06, critMult: 1.75 }),
      },
    }),
    /** Sticky Situation: a foe peppered with Sticky Bombs is a foe waiting to be hurt. */
    gene({
      id: 'gene-wax-sticky-situation', name: 'Sticky Situation', tier: 3, col: 1, needs: ['gene-wax-comb-builder'],
      text: 'Sticky Bombs casts make the foe take +4% damage for 4s',
      maxLevel: 3, cost: linear(12, 4),
      grant: cast('q', (lv) => ({ damageMult: gain(0.04)(lv), ms: 4000 })),
      mastery: {
        name: 'Full Detonation', cost: 24,
        text: '−12% Sticky Bombs (ultimate) cooldown',
        grant: effect({ ultimateCooldownMult: 0.88 }),
      },
    }),
    /** Beeswax Saint: crosses Candle and Hive — the candle that keeps the keeper alive. */
    gene({
      id: 'gene-wax-beeswax-saint', name: 'Beeswax Saint', tier: 3, col: 2,
      needs: ['gene-wax-wax-seal', 'gene-wax-comb-builder'],
      text: '+0.5 HP regenerated every second',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ regenPerSecond: flat(0.5)(lv) })),
      mastery: {
        name: 'Hive Mother', cost: 24,
        text: 'Once per fight, a lethal hit is cancelled and the hive carries you back at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: the blade, sharper by a hair. */
    enlightened({
      id: 'gene-wax-enl-foil', name: 'Enlightened Foil', col: 0, needs: ['gene-wax-fencers-form'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the hive, ever busier. */
    enlightened({
      id: 'gene-wax-enl-hive', name: 'Enlightened Hive', col: 1, needs: ['gene-wax-sticky-situation'],
      text: '+0.5% status damage',
      grant: stat((lv) => ({ statusDmgMult: gain(0.005)(lv) })),
    }),
    /** Enlightened: the candle, ever taller. */
    enlightened({
      id: 'gene-wax-enl-candle', name: 'Enlightened Candle', col: 2, needs: ['gene-wax-beeswax-saint'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
