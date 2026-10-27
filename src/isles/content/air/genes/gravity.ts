import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Lodestone — Gravity's gene tree.
 *
 * Gravity drops the sky on people: Space Slash (a drag-slash that lands half a second late, or a
 * tapped meteor that falls 1.5s later), Meteor Rain (up to five shadows placed and released at
 * once), Space Slam (the foe hammered into the floor), Grav Bomb (a vortex pull, or a held bomb)
 * and Lunar Landing (the stage goes dark, and three seconds later the moon arrives). The tree has
 * three lines: **Meteor** (the rain, the slam, the moon), **Orbit** (the bomb's tempo — everything
 * coming round again) and **Mass** (weight that will not be moved).
 *
 * Space Slash's damage lands up to 1.5s after the cast on a 500ms cooldown, so a click window could
 * not cover its own hit without stacking — Gravity's offence root sits on Meteor Rain instead.
 */
export const GRAVITY_GENE_TREE: GeneTree = {
  element: 'gravity',
  name: 'Lodestone',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: the shadows land, and everything under them is softer for it. */
    gene({
      id: 'gene-gravity-heavy-rain', name: 'Heavy Rain', tier: 0, col: 0,
      text: 'Meteor Rain casts make the foe take +3% damage for the 4s the stones are falling',
      maxLevel: 4, cost: linear(6, 2),
      grant: cast('e', (lv) => ({ damageMult: gain(0.03)(lv), ms: 4000 })),
      mastery: {
        name: 'Shooting Star', cost: 14,
        text: 'Hits have a 10% chance to leave the foe smouldering from re-entry: 10 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 10, durationMs: 3000 }),
      },
    }),
    /** Identity root: the vortex pulls more than the foe toward you. */
    gene({
      id: 'gene-gravity-event-horizon', name: 'Event Horizon', tier: 0, col: 1,
      text: 'Grav Bomb casts shave 250ms off every other cooldown',
      maxLevel: 4, cost: linear(6, 2),
      grant: cast('f', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'Slingshot', cost: 14,
        text: 'Grav Bomb casts have a 15% chance to come straight back round the planet',
        grant: onCast('f', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: a body that weighs more than it looks. */
    gene({
      id: 'gene-gravity-dense-mass', name: 'Dense Mass', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(6, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Captured Moon', cost: 14,
        text: 'Start every fight with a shield charge — a little moon that takes the first hit for you',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Crater Maker: a foe pressed into the floor cannot roll with the next blow. */
    gene({
      id: 'gene-gravity-crater-maker', name: 'Crater Maker', tier: 1, col: 0, needs: ['gene-gravity-heavy-rain'],
      text: 'Space Slam casts make the foe take +4% damage for 2s',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('r', (lv) => ({ damageMult: gain(0.04)(lv), ms: 2000 })),
      mastery: {
        name: 'Impact Ring', cost: 18,
        text: 'Space Slam casts send a ring of shockwave out from you: 14 to everything within 110px',
        grant: onCast('r', { burst: { damage: 14, radius: 110 } }),
      },
    }),
    /** Escape Velocity: the vortex flings its owner as well. */
    gene({
      id: 'gene-gravity-escape-velocity', name: 'Escape Velocity', tier: 1, col: 1, needs: ['gene-gravity-event-horizon'],
      text: 'Grav Bomb casts make you 10% faster for 2s',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('f', (lv) => ({ speedMult: gain(0.1)(lv), ms: 2000 })),
      mastery: {
        name: 'Perihelion', cost: 18,
        text: 'Space Slam casts shave 1s off every other cooldown — closest pass, fastest swing',
        grant: onCast('r', { refundOthers: 1000 }),
      },
    }),
    /** Gravity Well: the bomb's pull bends incoming blows away too. */
    gene({
      id: 'gene-gravity-gravity-well', name: 'Gravity Well', tier: 1, col: 2, needs: ['gene-gravity-dense-mass'],
      text: 'Grav Bomb casts give you 5 shield HP',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('f', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Roche Limit', cost: 18,
        text: 'When hit, a 20% chance to make the attacker heavy: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Mass Driver: everything you throw arrives heavier. */
    gene({
      id: 'gene-gravity-mass-driver', name: 'Mass Driver', tier: 2, col: 0, needs: ['gene-gravity-crater-maker'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Bolide', cost: 22,
        text: '+5% crit chance — now and then a stone comes down that does not burn up',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Orbital Period: a shorter year, every year. */
    gene({
      id: 'gene-gravity-orbital-period', name: 'Orbital Period', tier: 2, col: 1, needs: ['gene-gravity-escape-velocity'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Syzygy', cost: 22,
        text: 'Every 15s the bodies line up: every cooldown comes 1s sooner',
        grant: behavior({ trigger: 'everyNSec', periodSec: 15, action: 'cooldownRefund', amount: 1000 }),
      },
    }),
    /** Barycentre: hit the heavier body and the system swings back at you. */
    gene({
      id: 'gene-gravity-barycentre', name: 'Barycentre', tier: 2, col: 2, needs: ['gene-gravity-gravity-well'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Lagrange Point', cost: 22,
        text: 'When hit, a 15% chance to settle into a still point — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Short Month: the moon comes round again before they have forgotten the last one. */
    gene({
      id: 'gene-gravity-short-month', name: 'Short Month', tier: 3, col: 0, needs: ['gene-gravity-mass-driver'],
      text: '−5% Lunar Landing (ultimate) cooldown',
      maxLevel: 3, cost: linear(14, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Moonfall', cost: 28,
        text: 'Lunar Landing casts make the foe take +20% damage for 6s — the shadow, the impact and the fires',
        grant: onCast('q', { damageMult: 1.2, ms: 6000 }),
      },
    }),
    /** Stable Orbit: crosses Meteor and Orbit — every rain you call draws you back to centre. */
    gene({
      id: 'gene-gravity-stable-orbit', name: 'Stable Orbit', tier: 3, col: 1,
      needs: ['gene-gravity-orbital-period', 'gene-gravity-mass-driver'],
      text: 'Meteor Rain casts heal 2 HP',
      maxLevel: 4, cost: linear(11, 4),
      grant: cast('e', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Second Moon', cost: 30,
        text: 'Once per fight, a lethal hit is cancelled and you swing back into orbit at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Lunar Shelter: you stand in the moon's shadow, and it shields you too. */
    gene({
      id: 'gene-gravity-lunar-shelter', name: 'Lunar Shelter', tier: 3, col: 2, needs: ['gene-gravity-barycentre'],
      text: 'Lunar Landing casts give you 8 shield HP',
      maxLevel: 3, cost: linear(14, 4),
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Neutron Star', cost: 28,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more tonne in every stone. */
    enlightened({
      id: 'gene-gravity-enl-tonnage', name: 'Enlightened Tonnage', col: 0, needs: ['gene-gravity-short-month'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: an orbit that tightens forever and never closes. */
    enlightened({
      id: 'gene-gravity-enl-orbit', name: 'Enlightened Orbit', col: 1, needs: ['gene-gravity-stable-orbit'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: a core packed one grain denser. */
    enlightened({
      id: 'gene-gravity-enl-core', name: 'Enlightened Core', col: 2, needs: ['gene-gravity-lunar-shelter'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
