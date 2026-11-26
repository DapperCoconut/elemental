import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from './helpers';

/**
 * Molten Keel — Magma's gene tree.
 *
 * Magma is a pirate made of the melt, so the tree reads like a ship's articles: **Broadside**
 * (the Blunderblast and the Unstable Core, ending in Limoncello's galleon), **Powder** (the
 * Hotshot flintlocks at the centre — draws that feed cooldowns and burst around you) and
 * **Crust** (the Nice Hot Drink and a cooling shell that will not crack).
 *
 * Gene ids predate the 2026-11-25 pirate rework and are save keys, so they keep their old
 * names (`plume-spread`, `bloat-lining`, `pendant-hunger`); only what the player reads changed.
 */
export const MAGMA_GENE_TREE: GeneTree = {
  element: 'magma',
  name: 'Molten Keel',
  nodes: [
    // ── Tier 0 ────────────────────────────────────────────────────────
    /** A faceful of shot leaves the foe open. */
    gene({
      id: 'gene-magma-plume-spread', name: 'Scattershot', tier: 0, col: 0,
      text: 'Blunderblast casts make the foe take +3% damage for 2s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.03)(lv), ms: 2000 })),
      mastery: {
        name: 'Sulphur Reek', cost: 10,
        text: 'The stink of the powder hangs on them: foes move 6% slower',
        grant: effect({ enemySpeedMult: 0.94 }),
      },
    }),
    /** Vent Pipes: drawing the flintlocks lets off steam everywhere else. */
    gene({
      id: 'gene-magma-vent-pipes', name: 'Vent Pipes', tier: 0, col: 1,
      text: 'Hotshot casts shave 250ms off every other cooldown',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('e', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'Steam Cap', cost: 10,
        text: '+6% move speed',
        grant: effect({ speedMult: 1.06 }),
      },
    }),
    /** Thick Crust: cooled rock over the hot core. */
    gene({
      id: 'gene-magma-thick-crust', name: 'Thick Crust', tier: 0, col: 2,
      text: '+12 max HP',
      maxLevel: 4, cost: linear(4, 2),
      grant: stat((lv) => ({ maxHp: flat(12)(lv) })),
      mastery: {
        name: 'Basalt Skin', cost: 10,
        text: '−5% damage taken',
        grant: effect({ damageTakenMult: 0.95 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Core Clamps: setting the core, he is already leaving. */
    gene({
      id: 'gene-magma-recoil-rigging', name: 'Core Clamps', tier: 1, col: 0, needs: ['gene-magma-plume-spread'],
      text: 'Unstable Core casts give +5% move speed for 1s',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('f', (lv) => ({ speedMult: gain(0.05)(lv), ms: 1000 })),
      mastery: {
        name: 'Hairline Fracture', cost: 14,
        text: 'Unstable Core casts make the foe take +8% damage for 1.5s',
        grant: onCast('f', { damageMult: 1.08, ms: 1500 }),
      },
    }),
    /** Magma Chamber: a hotter chamber means shorter waits. */
    gene({
      id: 'gene-magma-chamber', name: 'Magma Chamber', tier: 1, col: 1, needs: ['gene-magma-vent-pipes'],
      text: '−3% cooldowns',
      maxLevel: 4, cost: linear(5, 3),
      grant: stat((lv) => ({ cooldownMult: cut(0.03)(lv) })),
      mastery: {
        name: 'Fissure Sense', cost: 14,
        text: 'Hotshot casts have a 20% chance to come straight back off cooldown',
        grant: onCast('e', { refundSelfChance: 0.2 }),
      },
    }),
    /** Tankard Lining: the drink leaves something behind. */
    gene({
      id: 'gene-magma-bloat-lining', name: 'Tankard Lining', tier: 1, col: 2, needs: ['gene-magma-thick-crust'],
      text: 'Nice Hot Drink casts grant 5 shield',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('r', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Pressure Valve', cost: 14,
        text: 'Nice Hot Drink casts also heal 10',
        grant: onCast('r', { heal: 10 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Cannon Crew: the three guns, better served. */
    gene({
      id: 'gene-magma-cannon-crew', name: 'Cannon Crew', tier: 2, col: 0, needs: ['gene-magma-recoil-rigging'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Full Broadside', cost: 18,
        text: '+6% crit chance, and crits deal at least 1.75× damage',
        grant: effect({ critChance: 0.06, critMult: 1.75 }),
      },
    }),
    /** Lava Tide: crosses Broadside into Volcanism — burns that run long and deep. */
    gene({
      id: 'gene-magma-lava-tide', name: 'Lava Tide', tier: 2, col: 1,
      needs: ['gene-magma-chamber', 'gene-magma-recoil-rigging'],
      text: '+4% status damage and +4% status duration',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ statusDmgMult: gain(0.04)(lv), statusDurMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Ashfall', cost: 18,
        text: 'Every 8s, cinders rain on foes within 140px of you for 10',
        grant: behavior({ trigger: 'everyNSec', periodSec: 8, action: 'burstAoe', amount: 10, radius: 140 }),
      },
    }),
    /** Slag Plating: what hits you comes back hot. */
    gene({
      id: 'gene-magma-slag-plating', name: 'Slag Plating', tier: 2, col: 2, needs: ['gene-magma-bloat-lining'],
      text: 'Reflect 4% of damage taken back at the attacker',
      maxLevel: 3, cost: linear(7, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.04)(lv) })),
      mastery: {
        name: 'Cooling Shell', cost: 18,
        text: 'When hit, a 15% chance to gain a shield charge (at most every 8s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 8, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Jolly Roger: the ship coming up marks the foe for plunder. */
    gene({
      id: 'gene-magma-pendant-hunger', name: 'Jolly Roger', tier: 3, col: 0, needs: ['gene-magma-cannon-crew'],
      text: 'Limoncello casts make the foe take +5% damage for 4s',
      maxLevel: 3, cost: linear(12, 4),
      grant: cast('q', (lv) => ({ damageMult: gain(0.05)(lv), ms: 4000 })),
      mastery: {
        name: "Dead Man's Tithe", cost: 24,
        text: 'Heal 4% of the damage you deal',
        grant: effect({ lifestealFrac: 0.04 }),
      },
    }),
    /** Critical Mass: every draw heaves the ground under your feet too. */
    gene({
      id: 'gene-magma-critical-mass', name: 'Critical Mass', tier: 3, col: 1, needs: ['gene-magma-lava-tide'],
      text: 'Hotshot casts hurl rock at everything within 160px of you for 6',
      maxLevel: 4, cost: linear(9, 4),
      grant: cast('e', (lv) => ({ burst: { damage: flat(6)(lv), radius: 160 } })),
      mastery: {
        name: 'Pyroclastic', cost: 26,
        text: 'Hotshot casts make the foe take +15% damage for 3s',
        grant: onCast('e', { damageMult: 1.15, ms: 3000 }),
      },
    }),
    /** Hull Integrity: the keel bends but holds. */
    gene({
      id: 'gene-magma-hull-integrity', name: 'Hull Integrity', tier: 3, col: 2, needs: ['gene-magma-slag-plating'],
      text: 'The first time you fall below 35% HP, heal 14',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.35, action: 'healBurst', amount: flat(14)(lv) }] })),
      mastery: {
        name: 'The Keel Never Breaks', cost: 24,
        text: 'Once per fight, a lethal hit is cancelled and you come back at 20% HP',
        grant: effect({ reviveHpFrac: 0.2 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: the mantle rises, forever. */
    enlightened({
      id: 'gene-magma-enl-mantle', name: 'Enlightened Mantle', col: 0, needs: ['gene-magma-pendant-hunger', 'gene-magma-critical-mass'],
      text: '+0.5% status damage and +0.3% damage dealt',
      grant: stat((lv) => ({ statusDmgMult: gain(0.005)(lv), damageMult: gain(0.003)(lv) })),
    }),
    /** Enlightened: the crust thickens a hair each age. */
    enlightened({
      id: 'gene-magma-enl-crust', name: 'Enlightened Crust', col: 2, needs: ['gene-magma-hull-integrity'],
      text: '−0.3% damage taken (compounding)',
      grant: stat((lv) => ({ damageTakenMult: fade(0.003)(lv) })),
    }),
  ],
};
