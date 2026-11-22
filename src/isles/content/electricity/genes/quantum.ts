import type { GeneTree, GeneGrant } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Superposition — Quantum's gene tree.
 *
 * Quantum carries five other elements' abilities, one per key, and shifts the whole body onto
 * whichever key it presses; every hit it takes adds Quantum Instability (+1% incoming damage,
 * capped at 50%). Three lines: **Collapse** (what lands when the wavefunction picks an answer),
 * **Entanglement** (cooldowns that move together across every kit carried) and **Coherence** (a
 * body held together against its own instability).
 *
 * Slot rules key off the key pressed, not the element carrying it: a Fire E cast by Quantum is
 * an E cast here. "Any cast" triggers are behaviours with `trigger: 'onCast'`, which fire for
 * every ability whatever kit it came from.
 */

/** A level-scaled behaviour node: the whole behaviour is rebuilt at each level. */
const scaled = (fn: (level: number) => NonNullable<GeneGrant['effect']>['behaviors']) =>
  (level: number): GeneGrant => ({ effect: { behaviors: fn(level) } });

export const QUANTUM_GENE_TREE: GeneTree = {
  element: 'quantum',
  name: 'Superposition',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: every state you might be in hits a little harder than the last. */
    gene({
      id: 'gene-quantum-spin-up', name: 'Spin Up', tier: 0, col: 0,
      text: 'Click casts make the foe take +2% damage for 0.5s, whichever element is carrying Click',
      maxLevel: 4, cost: linear(8, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 500 })),
      mastery: {
        name: 'Collapse', cost: 18,
        text: 'Hits have a 10% chance to collapse onto the strong answer: +12% damage for 2s (at most every 6s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 6, action: 'tempDamage', mult: 1.12, durationMs: 2000 }),
      },
    }),
    /** Identity root: cooldowns tunnel through the wait instead of climbing over it. */
    gene({
      id: 'gene-quantum-tunnelling', name: 'Tunnelling', tier: 0, col: 1,
      text: '−1.5% cooldowns',
      maxLevel: 4, cost: linear(8, 2),
      grant: stat((lv) => ({ cooldownMult: cut(0.015)(lv) })),
      mastery: {
        name: 'Quantum Leap', cost: 18,
        text: 'Any cast has a 15% chance to land you a step ahead: +25% move speed for 1.5s (at most every 4s)',
        grant: behavior({ trigger: 'onCast', chance: 0.15, cooldownSec: 4, action: 'tempHaste', mult: 1.25, durationMs: 1500 }),
      },
    }),
    /** Defence root: harder to hit something that is not sure where it is. */
    gene({
      id: 'gene-quantum-uncertainty', name: 'Uncertainty', tier: 0, col: 2,
      text: '−2% damage taken — a counterweight to Instability',
      maxLevel: 4, cost: linear(8, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Decoherence Shield', cost: 18,
        text: 'Start every fight with a shield charge — the first hit lands on a version of you that was not there',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Interference: two waves meeting on the foe, crest on crest. */
    gene({
      id: 'gene-quantum-interference', name: 'Interference', tier: 1, col: 0, needs: ['gene-quantum-spin-up'],
      text: '+1.5% crit chance',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ critChance: flat(0.015)(lv) })),
      mastery: {
        name: 'Wavefunction Burst', cost: 22,
        text: 'Any cast has a 12% chance to ripple out of you: 14 to everything within 110px (at most every 5s)',
        grant: behavior({ trigger: 'onCast', chance: 0.12, cooldownSec: 5, action: 'burstAoe', amount: 14, radius: 110 }),
      },
    }),
    /** Entanglement: use one kit and every other kit you carry feels it. */
    gene({
      id: 'gene-quantum-entanglement', name: 'Entanglement', tier: 1, col: 1, needs: ['gene-quantum-tunnelling'],
      text: 'Any cast shaves 150ms off every cooldown (at most every 3s)',
      maxLevel: 4, cost: linear(9, 3),
      grant: scaled((lv) => [{ trigger: 'onCast', cooldownSec: 3, action: 'cooldownRefund', amount: flat(150)(lv) }]),
      mastery: {
        name: 'Spooky Action', cost: 22,
        text: 'Any cast has a 10% chance to reach the foe from where you stand: 12 over 3s (at most every 6s)',
        grant: behavior({ trigger: 'onCast', chance: 0.1, cooldownSec: 6, action: 'sear', amount: 12, durationMs: 3000 }),
      },
    }),
    /** Coherence Length: every F you press, a little more of you holds together. */
    gene({
      id: 'gene-quantum-coherence-length', name: 'Coherence Length', tier: 1, col: 2, needs: ['gene-quantum-uncertainty'],
      text: 'F casts give you 4 shield HP, whichever element is carrying F',
      maxLevel: 4, cost: linear(9, 3),
      grant: cast('f', (lv) => ({ shield: flat(4)(lv) })),
      mastery: {
        name: 'Ground State', cost: 22,
        text: '+1 HP regenerated every second — the body settles back to its lowest energy',
        grant: effect({ regenPerSecond: 1 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Superposed Strike: the R that landed and the one that did not, both counted. */
    gene({
      id: 'gene-quantum-superposed-strike', name: 'Superposed Strike', tier: 2, col: 0, needs: ['gene-quantum-interference'],
      text: 'R casts make the foe take +4% damage for 3s, whichever element is carrying R',
      maxLevel: 4, cost: linear(11, 3),
      grant: cast('r', (lv) => ({ damageMult: gain(0.04)(lv), ms: 3000 })),
      mastery: {
        name: 'Observer Effect', cost: 26,
        text: 'The foe, watched, hits 5% softer',
        grant: effect({ enemyDamageMult: 0.95 }),
      },
    }),
    /** Zero-Point: the ultimate draws on a floor of energy that is never quite empty. */
    gene({
      id: 'gene-quantum-zero-point', name: 'Zero-Point', tier: 2, col: 1, needs: ['gene-quantum-entanglement'],
      text: '−4% ultimate cooldown, whichever element is carrying Q',
      maxLevel: 4, cost: linear(11, 3),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.04)(lv) })),
      mastery: {
        name: 'Many Worlds', cost: 26,
        text: 'Q casts open a world where you waited less: −1.5s on every other cooldown',
        grant: onCast('q', { refundOthers: 1500 }),
      },
    }),
    /** Vacuum Hum: a body that is always very slightly mending. */
    gene({
      id: 'gene-quantum-vacuum-hum', name: 'Vacuum Hum', tier: 2, col: 2, needs: ['gene-quantum-coherence-length'],
      text: '+0.3 HP regenerated every second',
      maxLevel: 4, cost: linear(11, 3),
      grant: stat((lv) => ({ regenPerSecond: flat(0.3)(lv) })),
      mastery: {
        name: 'Tunnel Out', cost: 26,
        text: 'The first time you drop below 35% HP, you tunnel clear: +40% move speed for 3s',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.35, action: 'tempHaste', mult: 1.4, durationMs: 3000 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Eigenstate: some hits resolve into something much worse for the foe. */
    gene({
      id: 'gene-quantum-eigenstate', name: 'Eigenstate', tier: 3, col: 0, needs: ['gene-quantum-superposed-strike'],
      text: 'Hits get a 5% chance to resolve into a burst: 12 to everything within 100px (at most every 4s)',
      maxLevel: 3, cost: linear(16, 4),
      grant: scaled((lv) => [{
        trigger: 'onHitDealt', chance: flat(0.05)(lv), cooldownSec: 4, action: 'burstAoe', amount: 12, radius: 100,
      }]),
      mastery: {
        name: 'Double Slit', cost: 32,
        text: '+5% crit chance — the shot goes through both gaps at once',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Phase Shift: crosses Collapse and Entanglement — every E shifts you a little ahead of where they aim. */
    gene({
      id: 'gene-quantum-phase-shift', name: 'Phase Shift', tier: 3, col: 1,
      needs: ['gene-quantum-zero-point', 'gene-quantum-superposed-strike'],
      text: 'E casts give +5% move speed for 1.5s, whichever element is carrying E',
      maxLevel: 4, cost: linear(13, 4),
      grant: cast('e', (lv) => ({ speedMult: gain(0.05)(lv), ms: 1500 })),
      mastery: {
        name: 'Both Alive', cost: 34,
        text: 'Once per fight, a lethal hit lands on the version of you that died — you go on at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Quantum Lock: pinned in place by being looked at, a hit sometimes cannot get in. */
    gene({
      id: 'gene-quantum-quantum-lock', name: 'Quantum Lock', tier: 3, col: 2, needs: ['gene-quantum-vacuum-hum'],
      text: 'When hit, a 5% chance to lock: a shield charge (at most every 6s)',
      maxLevel: 3, cost: linear(16, 4),
      grant: scaled((lv) => [{
        trigger: 'onHitTaken', chance: flat(0.05)(lv), cooldownSec: 6, action: 'shieldCharge', amount: 1,
      }]),
      mastery: {
        name: 'Observed Body', cost: 32,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more state folded into every hit. */
    enlightened({
      id: 'gene-quantum-enl-state', name: 'Enlightened State', col: 0, needs: ['gene-quantum-eigenstate'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the wait between collapses shortens, forever. */
    enlightened({
      id: 'gene-quantum-enl-tunnel', name: 'Enlightened Tunnel', col: 1, needs: ['gene-quantum-phase-shift'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: a little more of you in every world. */
    enlightened({
      id: 'gene-quantum-enl-world', name: 'Enlightened World', col: 2, needs: ['gene-quantum-quantum-lock'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
