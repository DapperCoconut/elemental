import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Strata — Earth's gene tree.
 *
 * Earth fights behind a stone plate: Bash (hold to charge, release to dash shield-first, or
 * launch a rock), Repair (a 3s slow, then the plate mended or a golem healed), Rock Dance (four
 * orbiting rocks to launch), Quake (a fractured zone that trips for 5s) and Biome Builder (stand
 * rooted at the arena's heart and lay quarters of weather for 20s). The tree has three seams:
 * **Fault** (Bash and Quake — the ground that breaks people), **Scree** (Rock Dance and Repair's
 * tempo — the slow worked off, stones coming round) and **Bedrock** (the plate, and what is under it).
 *
 * Bash stamps on release, right as the dash leaves, so its window is its own 1.4s cooldown.
 * Repair's own 20% slow lasts 3s, and the Mortar line is sized to cancel it at four levels.
 */
export const EARTH_GENE_TREE: GeneTree = {
  element: 'earth',
  name: 'Strata',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: a plate driven shoulder-first leaves the foe reeling for the next blow. */
    gene({
      id: 'gene-earth-shoulder-charge', name: 'Shoulder Charge', tier: 0, col: 0,
      text: 'Bash casts make the foe take +2% damage for 1.4s',
      maxLevel: 4, cost: linear(7, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 1400 })),
      mastery: {
        name: 'Grit in the Eyes', cost: 16,
        text: 'Hits have a 12% chance to throw grit: the foe is 20% slower for 1.5s (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 4, action: 'slowEnemy', mult: 0.8, durationMs: 1500 }),
      },
    }),
    /** Identity root: four stones lifted into orbit, and your hands are free again. */
    gene({
      id: 'gene-earth-orbit-of-stones', name: 'Orbit of Stones', tier: 0, col: 1,
      text: 'Rock Dance casts shave 250ms off every other cooldown',
      maxLevel: 4, cost: linear(7, 2),
      grant: cast('r', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'The Fifth Stone', cost: 16,
        text: 'Rock Dance casts have a 15% chance to come straight back — one more stone was loose',
        grant: onCast('r', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: skin weathered like the mesa's face. */
    gene({
      id: 'gene-earth-weathered-face', name: 'Weathered Face', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(7, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Plate Under the Plate', cost: 16,
        text: 'Start every fight with a shield charge — a second slab behind the first',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Fault Line: the fractured zone is soft footing for everyone you put in it. */
    gene({
      id: 'gene-earth-fault-line', name: 'Fault Line', tier: 1, col: 0, needs: ['gene-earth-shoulder-charge'],
      text: 'Quake casts make the foe take +4% damage for the 5s the ground is fractured',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('f', (lv) => ({ damageMult: gain(0.04)(lv), ms: 5000 })),
      mastery: {
        name: 'Aftershock', cost: 20,
        text: 'Quake casts heave the ground under you too: 14 to everything within 110px',
        grant: onCast('f', { burst: { damage: 14, radius: 110 } }),
      },
    }),
    /** Mortar: the mason's hands are quick, so the mending does not weigh you down. */
    gene({
      id: 'gene-earth-mortar', name: 'Mortar', tier: 1, col: 1, needs: ['gene-earth-orbit-of-stones'],
      text: 'Repair casts give +5% move speed for the 3s Repair slows you',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('e', (lv) => ({ speedMult: gain(0.05)(lv), ms: 3000 })),
      mastery: {
        name: 'Keystone', cost: 20,
        text: 'Repair casts shave 1.5s off every other cooldown — set the keystone and the arch stands',
        grant: onCast('e', { refundOthers: 1500 }),
      },
    }),
    /** Buttress: mending the plate shores up the body holding it. */
    gene({
      id: 'gene-earth-buttress', name: 'Buttress', tier: 1, col: 2, needs: ['gene-earth-weathered-face'],
      text: 'Repair casts give you 5 shield HP',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('e', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Talus Skirt', cost: 20,
        text: 'When hit, a 20% chance the attacker slips on scree: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Iron Seam: a vein of ore runs through every stone you throw. */
    gene({
      id: 'gene-earth-iron-seam', name: 'Iron Seam', tier: 2, col: 0, needs: ['gene-earth-fault-line'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(10, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Cleavage Grain', cost: 24,
        text: '+5% crit chance — strike the stone along its grain and it splits clean',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Rolling Scree: rocks in orbit, feet on the move. */
    gene({
      id: 'gene-earth-rolling-scree', name: 'Rolling Scree', tier: 2, col: 1, needs: ['gene-earth-mortar'],
      text: 'Rock Dance casts give +4% move speed for 4s while the stones spin up',
      maxLevel: 4, cost: linear(10, 3),
      grant: cast('r', (lv) => ({ speedMult: gain(0.04)(lv), ms: 4000 })),
      mastery: {
        name: 'Cairn', cost: 24,
        text: 'Every 10s another stone settles on the cairn: heal 6',
        grant: behavior({ trigger: 'everyNSec', periodSec: 10, action: 'healBurst', amount: 6 }),
      },
    }),
    /** Load-Bearing: whatever leans on you finds out how much you carry. */
    gene({
      id: 'gene-earth-load-bearing', name: 'Load-Bearing', tier: 2, col: 2, needs: ['gene-earth-buttress'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(10, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Menhir', cost: 24,
        text: 'When hit, a 15% chance to stand like a menhir — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Deep Time: the dais is ready for you again sooner than the world expects. */
    gene({
      id: 'gene-earth-deep-time', name: 'Deep Time', tier: 3, col: 0, needs: ['gene-earth-iron-seam'],
      text: '−5% Biome Builder (ultimate) cooldown',
      maxLevel: 3, cost: linear(15, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Continental Drift', cost: 30,
        text: 'Biome Builder casts make the foe take +15% damage for 8s while the quarters settle',
        grant: onCast('q', { damageMult: 1.15, ms: 8000 }),
      },
    }),
    /** Tectonic: crosses Fault and Scree — every quake you raise knits your own bones a little. */
    gene({
      id: 'gene-earth-tectonic', name: 'Tectonic', tier: 3, col: 1,
      needs: ['gene-earth-rolling-scree', 'gene-earth-iron-seam'],
      text: 'Quake casts heal 2 HP',
      maxLevel: 4, cost: linear(12, 4),
      grant: cast('f', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Fossil Record', cost: 32,
        text: 'Once per fight, a lethal hit is cancelled and you rise from the rock at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Mantle: the world you build at the heart of the arena wraps round you as you leave it. */
    gene({
      id: 'gene-earth-mantle', name: 'Mantle', tier: 3, col: 2, needs: ['gene-earth-load-bearing'],
      text: 'Biome Builder casts give you 8 shield HP, still there when you step off the dais',
      maxLevel: 3, cost: linear(15, 4),
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Bedrock', cost: 30,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more grain of ore in the vein, forever. */
    enlightened({
      id: 'gene-earth-enl-ore', name: 'Enlightened Ore', col: 0, needs: ['gene-earth-deep-time'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: erosion that never stops wearing the wait away. */
    enlightened({
      id: 'gene-earth-enl-erosion', name: 'Enlightened Erosion', col: 1, needs: ['gene-earth-tectonic'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more band laid down in the mesa. */
    enlightened({
      id: 'gene-earth-enl-stratum', name: 'Enlightened Stratum', col: 2, needs: ['gene-earth-mantle'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
