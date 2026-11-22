import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Dynamo Blood — Electricity's gene tree.
 *
 * Electricity runs on kinetic power: Electro Ball from the hand (every 500ms), Electro Dash (a
 * teleport whose free recast costs 15 kinetic), Kinetic Discharge (a cursor blast that only
 * goes off with 20+ kinetic), Pain Battery (hold F to hurt yourself into charge, release to
 * blast) and Restart (5s overcharged — die in it and you come back on your kinetic). Three
 * lines: **Current** (the ball and the discharge — the bolt that lands), **Conductor** (the dash
 * and the cooldowns — current that never stops moving) and **Battery** (the body that soaks the
 * Pain Battery and the Restart that saves it).
 *
 * Engine notes the tree is built round:
 * - Pain Battery has no cooldown; each release counts as an F cast.
 * - Only the first Electro Dash press stamps; the kinetic recast does not, so an E rule fires
 *   once per dash pair and its 1.5s window equals the cooldown — it cannot stack on itself.
 * - Kinetic Discharge stamps only when it actually fires (20+ kinetic), so R rules never pay
 *   out on a refused press.
 */
export const ELECTRICITY_GENE_TREE: GeneTree = {
  element: 'electricity',
  name: 'Dynamo Blood',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: each ball leaves the foe's skin prickling for the next one. */
    gene({
      id: 'gene-elec-hot-lead', name: 'Hot Lead', tier: 0, col: 0,
      text: 'Electro Ball casts make the foe take +2% damage for 0.5s',
      maxLevel: 4, cost: linear(8, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 500 })),
      mastery: {
        name: 'Spark Gap', cost: 18,
        text: '+5% crit chance — the arc jumps the gap where the foe is thinnest',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Identity root: the dash is a short-circuit across the room, and you come out of it running. */
    gene({
      id: 'gene-elec-short-hop', name: 'Short Hop', tier: 0, col: 1,
      text: 'Electro Dash casts give +5% move speed for 1.5s',
      maxLevel: 4, cost: linear(8, 2),
      grant: cast('e', (lv) => ({ speedMult: gain(0.05)(lv), ms: 1500 })),
      mastery: {
        name: 'Double Throw', cost: 18,
        text: 'Electro Dash casts have a 12% chance to come straight back — the switch never opened',
        grant: onCast('e', { refundSelfChance: 0.12 }),
      },
    }),
    /** Defence root: a lineman's skin, taped and lagged. */
    gene({
      id: 'gene-elec-insulation', name: 'Insulation', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(8, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Rubber Soles', cost: 18,
        text: 'Start every fight with a shield charge — the first hit runs straight to earth',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Capacitor Bank: the blast leaves the air ionised round the foe for the whole cooldown. */
    gene({
      id: 'gene-elec-capacitor-bank', name: 'Capacitor Bank', tier: 1, col: 0, needs: ['gene-elec-hot-lead'],
      text: 'Kinetic Discharge casts make the foe take +4% damage for 4s',
      maxLevel: 4, cost: linear(9, 3),
      grant: cast('r', (lv) => ({ damageMult: gain(0.04)(lv), ms: 4000 })),
      mastery: {
        name: 'Ground Strike', cost: 22,
        text: 'Kinetic Discharge casts earth a second strike at your feet: 16 to everything within 110px',
        grant: onCast('r', { burst: { damage: 16, radius: 110 } }),
      },
    }),
    /** Induction: every dash drags the rest of the kit's current round a little faster. */
    gene({
      id: 'gene-elec-induction', name: 'Induction', tier: 1, col: 1, needs: ['gene-elec-short-hop'],
      text: 'Electro Dash casts shave 200ms off every other cooldown',
      maxLevel: 4, cost: linear(9, 3),
      grant: cast('e', (lv) => ({ refundOthers: flat(200)(lv) })),
      mastery: {
        name: 'Afterimage', cost: 22,
        text: '+6% move speed, all fight — part of you is always still arriving',
        grant: effect({ speedMult: 1.06 }),
      },
    }),
    /** Pain Tolerance: the charge you tore out of yourself and did not throw stays in the skin. */
    gene({
      id: 'gene-elec-pain-tolerance', name: 'Pain Tolerance', tier: 1, col: 2, needs: ['gene-elec-insulation'],
      text: 'Pain Battery releases give you 3 shield HP',
      maxLevel: 4, cost: linear(9, 3),
      grant: cast('f', (lv) => ({ shield: flat(3)(lv) })),
      mastery: {
        name: 'Grounding Strap', cost: 22,
        text: 'When hit, a 20% chance the jolt charges you: −0.6s on every cooldown (at most every 4s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 4, action: 'cooldownRefund', amount: 600 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** High Voltage: the whole kit stepped up a transformer. */
    gene({
      id: 'gene-elec-high-voltage', name: 'High Voltage', tier: 2, col: 0, needs: ['gene-elec-capacitor-bank'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(11, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Arc Burn', cost: 26,
        text: 'Hits have a 12% chance to leave an arc burn: 12 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 3, action: 'sear', amount: 12, durationMs: 3000 }),
      },
    }),
    /** Conductive: copper all the way through — less resistance on every key. */
    gene({
      id: 'gene-elec-conductive', name: 'Conductive', tier: 2, col: 1, needs: ['gene-elec-induction'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: linear(11, 3),
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Live Rail', cost: 26,
        text: 'Every 8s the floor under you goes live: +20% move speed for 2s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 8, action: 'tempHaste', mult: 1.2, durationMs: 2000 }),
      },
    }),
    /** Surge Protector: what hits you finds a path back down the wire to whoever sent it. */
    gene({
      id: 'gene-elec-surge-protector', name: 'Surge Protector', tier: 2, col: 2, needs: ['gene-elec-pain-tolerance'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(11, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Breaker Trips', cost: 26,
        text: 'The first time you drop below 35% HP, the breaker trips: two shield charges',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.35, action: 'shieldCharge', amount: 2 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Overcharge: the five seconds of Restart are five seconds the foe is standing in a live field. */
    gene({
      id: 'gene-elec-overcharge', name: 'Overcharge', tier: 3, col: 0, needs: ['gene-elec-high-voltage'],
      text: 'Restart casts make the foe take +8% damage for the 5s you are overcharged',
      maxLevel: 3, cost: linear(16, 4),
      grant: cast('q', (lv) => ({ damageMult: gain(0.08)(lv), ms: 5000 })),
      mastery: {
        name: 'Arc Lamp', cost: 32,
        text: 'Restart casts flash off you like a struck lamp: 24 to everything within 140px',
        grant: onCast('q', { burst: { damage: 24, radius: 140 } }),
      },
    }),
    /** Feedback Loop: crosses Current and Conductor — the discharge runs back up your arm as warmth. */
    gene({
      id: 'gene-elec-feedback-loop', name: 'Feedback Loop', tier: 3, col: 1,
      needs: ['gene-elec-conductive', 'gene-elec-high-voltage'],
      text: 'Kinetic Discharge casts heal 2 HP',
      maxLevel: 4, cost: linear(13, 4),
      grant: cast('r', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Cold Restart', cost: 34,
        text: 'Once per fight, a lethal hit is cancelled and you kick back on at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Faraday Cage: overcharged, the current runs round your skin instead of through it. */
    gene({
      id: 'gene-elec-faraday-cage', name: 'Faraday Cage', tier: 3, col: 2, needs: ['gene-elec-surge-protector'],
      text: 'Restart casts give you 10 shield HP',
      maxLevel: 3, cost: linear(16, 4),
      grant: cast('q', (lv) => ({ shield: flat(10)(lv) })),
      mastery: {
        name: 'Earthed Frame', cost: 32,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: another turn on the coil, storm after storm. */
    enlightened({
      id: 'gene-elec-enl-coil', name: 'Enlightened Coil', col: 0, needs: ['gene-elec-overcharge'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: a hair less resistance in the line, forever. */
    enlightened({
      id: 'gene-elec-enl-superconductor', name: 'Enlightened Superconductor', col: 1, needs: ['gene-elec-feedback-loop'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more cell in the battery. */
    enlightened({
      id: 'gene-elec-enl-cell', name: 'Enlightened Cell', col: 2, needs: ['gene-elec-faraday-cage'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
