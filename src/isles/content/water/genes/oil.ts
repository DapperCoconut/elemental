import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Slickworks — Oil's gene tree.
 *
 * Oil is a refinery on legs, so the tree is three shop floors: **Laser Bay** (the Arm Laser and
 * the drone line — focusing lenses, Drone Destroy turning the kit over, a hotter fuel mix that
 * ends in a faster Train Morph), **Railyard** (On a Roll's barrels and their puddles — greased
 * axles, a slick that softens the foe, coal in the stoker) and **Generator Hall** (the Shield
 * Generator's side of things: hex plating, a field that wraps you, a blast door at the end).
 */
export const OIL_GENE_TREE: GeneTree = {
  element: 'oil',
  name: 'Slickworks',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: a laser through a ground lens marks what it touches. */
    gene({
      id: 'gene-oil-focusing-lens', name: 'Focusing Lens', tier: 0, col: 0,
      text: 'Arm Laser casts make the foe take +3% damage for 1.5s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.03)(lv), ms: 1500 })),
      mastery: {
        name: 'Tracer Rounds', cost: 10,
        text: '+5% crit chance — every fifth shot glows and finds the seam',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Identity root: you push the barrel, the barrel pulls you. */
    gene({
      id: 'gene-oil-greased-axle', name: 'Greased Axle', tier: 0, col: 1,
      text: 'On a Roll casts give +5% move speed for 2s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('e', (lv) => ({ speedMult: gain(0.05)(lv), ms: 2000 })),
      mastery: {
        name: 'Oil-Soaked', cost: 10,
        text: '+10% status duration — Oily and burning both cling longer',
        grant: effect({ statusDurMult: 1.1 }),
      },
    }),
    /** Defence root: hexagonal plates bolted over the overalls. */
    gene({
      id: 'gene-oil-hex-plating', name: 'Hex Plating', tier: 0, col: 2,
      text: 'Start every fight with +6 shield HP',
      maxLevel: 4, cost: linear(4, 2),
      grant: stat((lv) => ({ shieldHp: flat(6)(lv) })),
      mastery: {
        name: 'Capacitor', cost: 10,
        text: 'Start every fight with 1 shield charge that blocks a whole hit',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Drone Bay: every drone you spend frees a bench for the next job. */
    gene({
      id: 'gene-oil-drone-bay', name: 'Drone Bay', tier: 1, col: 0, needs: ['gene-oil-focusing-lens'],
      text: 'Drone Destroy casts shave 150ms off every other cooldown',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('r', (lv) => ({ refundOthers: flat(150)(lv) })),
      mastery: {
        name: 'Kamikaze Line', cost: 14,
        text: 'Drone Destroy casts have a 15% chance to come straight back off cooldown',
        grant: onCast('r', { refundSelfChance: 0.15 }),
      },
    }),
    /** Rail Gauge: a foe standing in your slick has nowhere good to put its feet. */
    gene({
      id: 'gene-oil-rail-gauge', name: 'Rail Gauge', tier: 1, col: 1, needs: ['gene-oil-greased-axle'],
      text: 'On a Roll casts make the foe take +3% damage for 3s',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('e', (lv) => ({ damageMult: gain(0.03)(lv), ms: 3000 })),
      mastery: {
        name: 'Flashpoint', cost: 14,
        text: '+10% status damage — a lit puddle burns hotter',
        grant: effect({ statusDmgMult: 1.1 }),
      },
    }),
    /** Field Generator: setting a generator down throws its field over you first. */
    gene({
      id: 'gene-oil-field-generator', name: 'Field Generator', tier: 1, col: 2, needs: ['gene-oil-hex-plating'],
      text: 'Shield Generator casts give 5 shield HP',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('f', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Overcharge', cost: 14,
        text: 'Shield Generator casts shave 1s off every other cooldown',
        grant: onCast('f', { refundOthers: 1000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** High Octane: a better grade of fuel in every tank. */
    gene({
      id: 'gene-oil-high-octane', name: 'High Octane', tier: 2, col: 0, needs: ['gene-oil-drone-bay'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Arc Welder', cost: 18,
        text: 'Hits have a 12% chance to weld the foe for 10 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 3, action: 'sear', amount: 10, durationMs: 3000 }),
      },
    }),
    /** Coal Stoker: you keep a shovel of coal in your own firebox too. */
    gene({
      id: 'gene-oil-coal-stoker', name: 'Coal Stoker', tier: 2, col: 1, needs: ['gene-oil-rail-gauge'],
      text: '+3% move speed',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ speedMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Black Smoke', cost: 18,
        text: 'When hit, a 15% chance to blow off steam: +25% move speed for 2s (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'tempHaste', mult: 1.25, durationMs: 2000 }),
      },
    }),
    /** Insulated: rubber soles and lagged pipes. */
    gene({
      id: 'gene-oil-insulated', name: 'Insulated', tier: 2, col: 2, needs: ['gene-oil-field-generator'],
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Ground Wire', cost: 18,
        text: 'Reflect 5% of damage taken back at the attacker',
        grant: effect({ reflectFraction: 0.05 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Boiler Pressure: the train is ready to leave the shed sooner. */
    gene({
      id: 'gene-oil-boiler-pressure', name: 'Boiler Pressure', tier: 3, col: 0, needs: ['gene-oil-high-octane'],
      text: '−5% Train Morph (ultimate) cooldown',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Express Line', cost: 24,
        text: 'Train Morph casts make the foe take +15% damage for 6s',
        grant: onCast('q', { damageMult: 1.15, ms: 6000 }),
      },
    }),
    /** Refinery: crosses the Railyard and the Laser Bay — every barrel sent out tops your tank up. */
    gene({
      id: 'gene-oil-refinery', name: 'Refinery', tier: 3, col: 1,
      needs: ['gene-oil-coal-stoker', 'gene-oil-high-octane'],
      text: 'On a Roll casts heal 2 HP',
      maxLevel: 4, cost: linear(9, 4),
      grant: cast('e', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Rebuilt from Scrap', cost: 26,
        text: 'Once per fight, a lethal hit is cancelled and you bolt yourself back together at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Fail-Safe: the valve that opens on its own when the gauge goes red. */
    gene({
      id: 'gene-oil-fail-safe', name: 'Fail-Safe', tier: 3, col: 2, needs: ['gene-oil-insulated'],
      text: 'The first time you fall below 30% HP, heal 12',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: flat(12)(lv) }] })),
      mastery: {
        name: 'Blast Door', cost: 24,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: a fuel that refines a little cleaner every batch. */
    enlightened({
      id: 'gene-oil-enl-octane', name: 'Enlightened Octane', col: 0, needs: ['gene-oil-boiler-pressure'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the line that runs a little faster every shift. */
    enlightened({
      id: 'gene-oil-enl-line', name: 'Enlightened Line', col: 1, needs: ['gene-oil-refinery'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more plate bolted on, forever. */
    enlightened({
      id: 'gene-oil-enl-plate', name: 'Enlightened Plate', col: 2, needs: ['gene-oil-fail-safe'],
      text: '+1 shield HP at the start of every fight',
      grant: stat((lv) => ({ shieldHp: flat(1)(lv) })),
    }),
  ],
};
