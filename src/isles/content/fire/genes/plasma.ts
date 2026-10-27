import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from './helpers';

/**
 * Arcblood — Plasma's gene tree.
 *
 * Plasma's kit bites its own caster (missed Plasma Bursts snap back, Chaos Blades and Unstable
 * Arena hit you too, Pure CHAOS! orbs turn on you), so its tree is about *riding* the chaos:
 * **Arc** (precision with Plasma Burst and Plasma Current, ending in a harder Pure CHAOS!),
 * **Entropy** (Chaos Blades as a dance you shield through) and **Ground** (insulation — taking
 * your own lightning without flinching, and getting out of your own Unstable Arena).
 */
export const PLASMA_GENE_TREE: GeneTree = {
  element: 'plasma',
  name: 'Arcblood',
  nodes: [
    // ── Tier 0 ────────────────────────────────────────────────────────
    /** Steady Arc: good aim is rewarded twice. */
    gene({
      id: 'gene-plasma-steady-arc', name: 'Steady Arc', tier: 0, col: 0,
      text: 'Plasma Burst casts make the foe take +3% damage for 1.5s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.03)(lv), ms: 1500 })),
      mastery: {
        name: 'Earthing Strap', cost: 10,
        text: 'Plasma Burst casts heal 1 — enough to pay for a snap-back',
        grant: onCast('click', { heal: 1 }),
      },
    }),
    /** Grounded: your own lightning finds the floor before it finds you. */
    gene({
      id: 'gene-plasma-grounded', name: 'Grounded', tier: 0, col: 1,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(4, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Faraday Skin', cost: 10,
        text: 'Reflect 6% of damage taken back at the attacker',
        grant: effect({ reflectFraction: 0.06 }),
      },
    }),
    /** Ion Wake: summon the Unstable Arena and be out of it before the count of three. */
    gene({
      id: 'gene-plasma-ion-wake', name: 'Ion Wake', tier: 0, col: 2,
      text: 'Unstable Arena casts give +6% move speed for 2s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('e', (lv) => ({ speedMult: gain(0.06)(lv), ms: 2000 })),
      mastery: {
        name: 'Clean Exit', cost: 10,
        text: 'Unstable Arena casts also wrap you in 15 shield',
        grant: onCast('e', { shield: 15 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Current Gain: launching the Plasma Current tops up the rest of the grid. */
    gene({
      id: 'gene-plasma-current-gain', name: 'Current Gain', tier: 1, col: 0, needs: ['gene-plasma-steady-arc'],
      text: 'Plasma Current casts shave 200ms off every other cooldown',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('r', (lv) => ({ refundOthers: flat(200)(lv) })),
      mastery: {
        name: 'Live Wire', cost: 14,
        text: 'Plasma Current casts make the foe take +10% damage for 3s',
        grant: onCast('r', { damageMult: 1.1, ms: 3000 }),
      },
    }),
    /** Chaos Theory: crosses Arc and Ground — you brace for your own blades. */
    gene({
      id: 'gene-plasma-chaos-theory', name: 'Chaos Theory', tier: 1, col: 1,
      needs: ['gene-plasma-grounded', 'gene-plasma-steady-arc'],
      text: 'Chaos Blades casts grant 5 shield (they will come back for you)',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('f', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Blade Dancer', cost: 14,
        text: 'Chaos Blades casts give +20% move speed for 3s',
        grant: onCast('f', { speedMult: 1.2, ms: 3000 }),
      },
    }),
    /** Pressure Cell: the arena's first pulse crackles off you too. */
    gene({
      id: 'gene-plasma-pressure-cell', name: 'Pressure Cell', tier: 1, col: 2, needs: ['gene-plasma-ion-wake'],
      text: 'Unstable Arena casts arc 6 damage into everything within 120px of you',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('e', (lv) => ({ burst: { damage: flat(6)(lv), radius: 120 } })),
      mastery: {
        name: 'Critical Zone', cost: 14,
        text: 'Unstable Arena casts have a 15% chance to come straight back off cooldown',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Plasma Density: hotter, denser arcs. */
    gene({
      id: 'gene-plasma-density', name: 'Plasma Density', tier: 2, col: 0, needs: ['gene-plasma-current-gain'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Arc Flash', cost: 18,
        text: '+6% crit chance',
        grant: effect({ critChance: 0.06 }),
      },
    }),
    /** Entropy: Chaos lingers on what it touches. */
    gene({
      id: 'gene-plasma-entropy', name: 'Entropy', tier: 2, col: 1, needs: ['gene-plasma-chaos-theory'],
      text: '+4% status damage and +4% status duration',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ statusDmgMult: gain(0.04)(lv), statusDurMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Feedback Loop', cost: 18,
        text: 'Hits have an 8% chance to make every cooldown skip 0.5s (at most every 2s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.08, cooldownSec: 2, action: 'cooldownRefund', amount: 500 }),
      },
    }),
    /** Insulation: slow repair under the rubber. */
    gene({
      id: 'gene-plasma-insulation', name: 'Insulation', tier: 2, col: 2, needs: ['gene-plasma-pressure-cell'],
      text: '+0.5 HP regenerated every second',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ regenPerSecond: flat(0.5)(lv) })),
      mastery: {
        name: 'Ozone Lungs', cost: 18,
        text: '+20 max HP',
        grant: effect({ maxHp: 20 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Overcharge: going Pure CHAOS! marks the foe as the orbs' favourite target. */
    gene({
      id: 'gene-plasma-overcharge', name: 'Overcharge', tier: 3, col: 0, needs: ['gene-plasma-density'],
      text: 'Pure CHAOS! casts make the foe take +5% damage for 5s',
      maxLevel: 3, cost: linear(12, 4),
      grant: cast('q', (lv) => ({ damageMult: gain(0.05)(lv), ms: 5000 })),
      mastery: {
        name: 'Hungry Orbs', cost: 24,
        text: 'Heal 4% of the damage you deal',
        grant: effect({ lifestealFrac: 0.04 }),
      },
    }),
    /** Strange Attractor: crosses Entropy and Ground — the blades want to come back to your hand. */
    gene({
      id: 'gene-plasma-strange-attractor', name: 'Strange Attractor', tier: 3, col: 1,
      needs: ['gene-plasma-entropy', 'gene-plasma-insulation'],
      text: 'Chaos Blades casts have a 6% chance to come straight back off cooldown',
      maxLevel: 4, cost: linear(9, 4),
      grant: cast('f', (lv) => ({ refundSelfChance: flat(0.06)(lv) })),
      mastery: {
        name: 'Eye of the Storm', cost: 26,
        text: 'Pure CHAOS! casts wrap you in 40 shield — the orbs that turn on you hit that first',
        grant: onCast('q', { shield: 40 }),
      },
    }),
    /** Lightning Rod: the storm finds you sooner. */
    gene({
      id: 'gene-plasma-lightning-rod', name: 'Lightning Rod', tier: 3, col: 2, needs: ['gene-plasma-insulation'],
      text: '−5% Pure CHAOS! (ultimate) cooldown',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Discharge', cost: 24,
        text: 'The first time you fall below 30% HP, dump 40 damage into foes within 180px',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'burstAoe', amount: 40, radius: 180 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: the arc burns ever hotter. */
    enlightened({
      id: 'gene-plasma-enl-arc', name: 'Enlightened Arc', col: 0, needs: ['gene-plasma-overcharge'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the chaos sinks a hair further into the floor. */
    enlightened({
      id: 'gene-plasma-enl-ground', name: 'Enlightened Ground', col: 2, needs: ['gene-plasma-strange-attractor', 'gene-plasma-lightning-rod'],
      text: '−0.3% damage taken (compounding)',
      grant: stat((lv) => ({ damageTakenMult: fade(0.003)(lv) })),
    }),
  ],
};
