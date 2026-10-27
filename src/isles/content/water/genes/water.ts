import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Saltvein — Water's gene tree.
 *
 * Three branches run off the spring: **Current** (Splash puddles that soften the foe, Pressure
 * Dagger feeding the kit, a heavier Pain Rain at the end), **Wellspring** (Geyser as a place you
 * come back from faster and fuller — speed, mending, a sea that gives you back) and
 * **Breakwater** (the defensive branch: sea-glass skin, ballast, a high-water mark).
 *
 * Water Cut fires every 250ms, so no node keys off the click — a per-cast window on a cut that
 * fast would stack out of hand. Pain Rain's rules key off Pain Rain alone; Bubble Barrage (the
 * alternate ultimate) still enjoys the plain ultimate-cooldown nodes.
 */
export const WATER_GENE_TREE: GeneTree = {
  element: 'water',
  name: 'Saltvein',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: a foe standing in Splash puddles is a foe off its footing. */
    gene({
      id: 'gene-water-brackish-puddles', name: 'Brackish Puddles', tier: 0, col: 0,
      text: 'Splash casts make the foe take +3% damage for 2s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('e', (lv) => ({ damageMult: gain(0.03)(lv), ms: 2000 })),
      mastery: {
        name: 'Rip Current', cost: 10,
        text: 'Hits have a 10% chance to slow the foe by 20% for 1.5s (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 4, action: 'slowEnemy', mult: 0.8, durationMs: 1500 }),
      },
    }),
    /** Identity root: stepping off a Geyser keeps some of its push. */
    gene({
      id: 'gene-water-spring-heels', name: 'Spring Heels', tier: 0, col: 1,
      text: 'Geyser casts give +6% move speed for 2s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('r', (lv) => ({ speedMult: gain(0.06)(lv), ms: 2000 })),
      mastery: {
        name: 'Wellhead Burst', cost: 10,
        text: 'Geyser casts also blast everything within 100px of you for 12',
        grant: onCast('r', { burst: { damage: 12, radius: 100 } }),
      },
    }),
    /** Defence root: skin worn smooth as surf-tumbled glass. */
    gene({
      id: 'gene-water-sea-glass-skin', name: 'Sea-Glass Skin', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(4, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Bubble Wrap', cost: 10,
        text: 'Start every fight wrapped in a 20 HP bubble shield',
        grant: effect({ shieldHp: 20 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Honed Dagger: the pressure you let go of rushes back into the other abilities. */
    gene({
      id: 'gene-water-honed-dagger', name: 'Honed Dagger', tier: 1, col: 0, needs: ['gene-water-brackish-puddles'],
      text: 'Pressure Dagger casts shave 200ms off every other cooldown',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('f', (lv) => ({ refundOthers: flat(200)(lv) })),
      mastery: {
        name: 'Second Pressure', cost: 14,
        text: 'Pressure Dagger casts have a 15% chance to come straight back off cooldown',
        grant: onCast('f', { refundSelfChance: 0.15 }),
      },
    }),
    /** Freshet: the spring that lifts you also washes you. */
    gene({
      id: 'gene-water-freshet', name: 'Freshet', tier: 1, col: 1, needs: ['gene-water-spring-heels'],
      text: 'Geyser casts heal 3 HP',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('r', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Hot Spring', cost: 14,
        text: '+1 HP regenerated every second',
        grant: effect({ regenPerSecond: 1 }),
      },
    }),
    /** Ballast: the hull rides lower and takes more sea. */
    gene({
      id: 'gene-water-ballast', name: 'Ballast', tier: 1, col: 2, needs: ['gene-water-sea-glass-skin'],
      text: '+12 max HP',
      maxLevel: 4, cost: linear(5, 3),
      grant: stat((lv) => ({ maxHp: flat(12)(lv) })),
      mastery: {
        name: 'Breakwater', cost: 14,
        text: 'When hit, a 15% chance to gain a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Abyssal Pressure: water at depth cuts like a blade. */
    gene({
      id: 'gene-water-abyssal-pressure', name: 'Abyssal Pressure', tier: 2, col: 0, needs: ['gene-water-honed-dagger'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Waterjet', cost: 18,
        text: '+5% crit chance — a cut at full pressure goes straight through',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Brine Soak: salt in every wound your puddles open. */
    gene({
      id: 'gene-water-brine-soak', name: 'Brine Soak', tier: 2, col: 1, needs: ['gene-water-freshet'],
      text: '+4% status damage and +4% status duration',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ statusDmgMult: gain(0.04)(lv), statusDurMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Spring Tide', cost: 18,
        text: 'Every 12s the tide turns in your favour: +15% move speed for 3s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 12, action: 'tempHaste', mult: 1.15, durationMs: 3000 }),
      },
    }),
    /** Rebound Wave: a wave that hits the seawall comes back. */
    gene({
      id: 'gene-water-rebound-wave', name: 'Rebound Wave', tier: 2, col: 2, needs: ['gene-water-ballast'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Slippery as Eels', cost: 18,
        text: '+5% dodge chance',
        grant: effect({ dodgeChance: 0.05 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Stormhead: the clouds over the arena gather again sooner. */
    gene({
      id: 'gene-water-stormhead', name: 'Stormhead', tier: 3, col: 0, needs: ['gene-water-abyssal-pressure'],
      text: '−5% ultimate cooldown (Pain Rain or Bubble Barrage)',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Monsoon', cost: 24,
        text: 'Pain Rain casts make the foe take +20% damage for 5s while the drops come down',
        grant: onCast('q', { damageMult: 1.2, ms: 5000 }),
      },
    }),
    /** Tidal Reprieve: crosses Current and Wellspring — every Splash pools a little back to you. */
    gene({
      id: 'gene-water-tidal-reprieve', name: 'Tidal Reprieve', tier: 3, col: 1,
      needs: ['gene-water-brine-soak', 'gene-water-abyssal-pressure'],
      text: 'Splash casts heal 2 HP',
      maxLevel: 4, cost: linear(9, 4),
      grant: cast('e', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'The Sea Gives Back', cost: 26,
        text: 'Once per fight, a lethal hit is cancelled and you wash back up at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** High-Water Mark: the line on the wall the flood never got past. */
    gene({
      id: 'gene-water-high-water-mark', name: 'High-Water Mark', tier: 3, col: 2, needs: ['gene-water-rebound-wave'],
      text: 'The first time you fall below 30% HP, heal 12',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: flat(12)(lv) }] })),
      mastery: {
        name: 'Seawall', cost: 24,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: the current that never stops cutting the channel deeper. */
    enlightened({
      id: 'gene-water-enl-current', name: 'Enlightened Current', col: 0, needs: ['gene-water-stormhead'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the tide that comes round a little earlier every day. */
    enlightened({
      id: 'gene-water-enl-tide', name: 'Enlightened Tide', col: 1, needs: ['gene-water-tidal-reprieve'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: the sea that is always a little deeper than you thought. */
    enlightened({
      id: 'gene-water-enl-fathom', name: 'Enlightened Fathom', col: 2, needs: ['gene-water-high-water-mark'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
