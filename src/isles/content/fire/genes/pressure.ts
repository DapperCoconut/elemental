import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from './helpers';

/**
 * Boilerheart — Pressure's gene tree.
 *
 * Pressure is a man with a boiler in his gauntlet, so the tree is a boiler-room schematic:
 * **Piston** (Pressure Punch and Seismic Slam — held charge let go hard), **Valve** (Release and
 * Exceed — venting safely, running past the redline and surviving the cool-down stun) and
 * **Nerve** (Pressure Point's PainLock — pain that lasts, foes that seize up).
 */
export const PRESSURE_GENE_TREE: GeneTree = {
  element: 'pressure',
  name: 'Boilerheart',
  nodes: [
    // ── Tier 0 ────────────────────────────────────────────────────────
    /** Knuckle Gauge: a punch that dents leaves the dent open. */
    gene({
      id: 'gene-pressure-knuckle-gauge', name: 'Knuckle Gauge', tier: 0, col: 0,
      text: 'Pressure Punch casts make the foe take +3% damage for 1.5s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.03)(lv), ms: 1500 })),
      mastery: {
        name: 'Rivet Fist', cost: 10,
        text: '+5% crit chance',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Riveted Boiler: a bigger tank under the coat. */
    gene({
      id: 'gene-pressure-riveted-boiler', name: 'Riveted Boiler', tier: 0, col: 1,
      text: '+12 max HP',
      maxLevel: 4, cost: linear(4, 2),
      grant: stat((lv) => ({ maxHp: flat(12)(lv) })),
      mastery: {
        name: 'Lagging', cost: 10,
        text: '−5% damage taken',
        grant: effect({ damageTakenMult: 0.95 }),
      },
    }),
    /** Pain Primer: PainLock and every other hold you put on them lasts longer. */
    gene({
      id: 'gene-pressure-pain-primer', name: 'Pain Primer', tier: 0, col: 2,
      text: '+5% status duration (PainLock, slows, stuns you apply)',
      maxLevel: 4, cost: linear(4, 2),
      grant: stat((lv) => ({ statusDurMult: gain(0.05)(lv) })),
      mastery: {
        name: 'Nerve Map', cost: 10,
        text: 'Pressure Point casts make the foe take +10% damage for 3s',
        grant: onCast('r', { damageMult: 1.1, ms: 3000 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Slam Rebound: the gauntlet comes up off the floor already pumping. */
    gene({
      id: 'gene-pressure-slam-rebound', name: 'Slam Rebound', tier: 1, col: 0, needs: ['gene-pressure-knuckle-gauge'],
      text: 'Seismic Slam casts shave 200ms off every other cooldown',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('e', (lv) => ({ refundOthers: flat(200)(lv) })),
      mastery: {
        name: 'Aftershock', cost: 14,
        text: 'Seismic Slam casts send a second tremor through everything within 160px for 12',
        grant: onCast('e', { burst: { damage: 12, radius: 160 } }),
      },
    }),
    /** Safety Valve: venting with Release lets the heat out of you, too. */
    gene({
      id: 'gene-pressure-safety-valve', name: 'Safety Valve', tier: 1, col: 1, needs: ['gene-pressure-riveted-boiler'],
      text: 'Release casts heal 4 HP',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('f', (lv) => ({ heal: flat(4)(lv) })),
      mastery: {
        name: 'Steam Curtain', cost: 14,
        text: 'Release casts also wrap you in 20 shield',
        grant: onCast('f', { shield: 20 }),
      },
    }),
    /** Trigger Points: a lucky jab and the red orb is ready again. */
    gene({
      id: 'gene-pressure-trigger-points', name: 'Trigger Points', tier: 1, col: 2, needs: ['gene-pressure-pain-primer'],
      text: 'Pressure Point casts have a 6% chance to come straight back off cooldown',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('r', (lv) => ({ refundSelfChance: flat(0.06)(lv) })),
      mastery: {
        name: 'Ache', cost: 14,
        text: 'Foes deal 5% less damage — everything they do hurts them a little',
        grant: effect({ enemyDamageMult: 0.95 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Hydraulic Arm: more force behind every swing. */
    gene({
      id: 'gene-pressure-hydraulic-arm', name: 'Hydraulic Arm', tier: 2, col: 0, needs: ['gene-pressure-slam-rebound'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Overdrive Piston', cost: 18,
        text: 'Hits have a 10% chance to give +25% damage for 3s (at most every 6s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 6, action: 'tempDamage', mult: 1.25, durationMs: 3000 }),
      },
    }),
    /** Exceed Tolerance: the boiler can be pushed past the line more often. */
    gene({
      id: 'gene-pressure-exceed-tolerance', name: 'Exceed Tolerance', tier: 2, col: 1, needs: ['gene-pressure-safety-valve'],
      text: '−5% Exceed (ultimate) cooldown',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Cold Jacket', cost: 18,
        text: 'Exceed casts grant 30 shield — something between you and the world when the stun comes',
        grant: onCast('q', { shield: 30 }),
      },
    }),
    /** Scalding Jet: crosses Nerve into Valve — Release's steam and PainLock both bite deeper. */
    gene({
      id: 'gene-pressure-scalding-jet', name: 'Scalding Jet', tier: 2, col: 2,
      needs: ['gene-pressure-trigger-points', 'gene-pressure-safety-valve'],
      text: '+4% status damage',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ statusDmgMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Steam Burns', cost: 18,
        text: 'Hits have a 12% chance to scald the foe for 10 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 3, action: 'sear', amount: 10, durationMs: 3000 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Steamroller: a foe driven into the floor is a foe standing still for the next one. */
    gene({
      id: 'gene-pressure-steamroller', name: 'Steamroller', tier: 3, col: 0, needs: ['gene-pressure-hydraulic-arm'],
      text: 'Seismic Slam casts make the foe take +5% damage for 3s',
      maxLevel: 3, cost: linear(12, 4),
      grant: cast('e', (lv) => ({ damageMult: gain(0.05)(lv), ms: 3000 })),
      mastery: {
        name: 'Bedrock Break', cost: 24,
        text: 'Seismic Slam casts have a 20% chance to come straight back off cooldown',
        grant: onCast('e', { refundSelfChance: 0.2 }),
      },
    }),
    /** Boiler Discipline: every charge builds a touch faster. */
    gene({
      id: 'gene-pressure-boiler-discipline', name: 'Boiler Discipline', tier: 3, col: 1, needs: ['gene-pressure-exceed-tolerance'],
      text: '−3% cooldowns',
      maxLevel: 4, cost: linear(9, 4),
      grant: stat((lv) => ({ cooldownMult: cut(0.03)(lv) })),
      mastery: {
        name: 'Redline', cost: 26,
        text: 'The first time you fall below 30% HP, every cooldown skips 3s',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'cooldownRefund', amount: 3000 }),
      },
    }),
    /** Lockjaw: PainLocked muscles stop answering. */
    gene({
      id: 'gene-pressure-lockjaw', name: 'Lockjaw', tier: 3, col: 2, needs: ['gene-pressure-scalding-jet'],
      text: 'Foes move 3% slower',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ enemySpeedMult: cut(0.03)(lv) })),
      mastery: {
        name: 'Seized Joints', cost: 24,
        text: 'Release casts make the foe take +12% damage for 4s',
        grant: onCast('f', { damageMult: 1.12, ms: 4000 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: the piston never stops gaining stroke. */
    enlightened({
      id: 'gene-pressure-enl-piston', name: 'Enlightened Piston', col: 0, needs: ['gene-pressure-steamroller'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: a boiler that charges ever so slightly quicker. */
    enlightened({
      id: 'gene-pressure-enl-boiler', name: 'Enlightened Boiler', col: 1, needs: ['gene-pressure-boiler-discipline'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: pain that lingers a hair longer every time. */
    enlightened({
      id: 'gene-pressure-enl-nerve', name: 'Enlightened Nerve', col: 2, needs: ['gene-pressure-lockjaw'],
      text: '+0.5% status duration',
      grant: stat((lv) => ({ statusDurMult: gain(0.005)(lv) })),
    }),
  ],
};
