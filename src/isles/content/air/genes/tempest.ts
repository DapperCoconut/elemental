import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Squall Line — Tempest's gene tree.
 *
 * Tempest fights on two axes: Gale Burst (charges earned back by walking), Kick Blast (a dodging
 * roll that kicks and refills the click), Summon Front (wind conveyors), Updraft (ride a current
 * into the sky) and Final Forecast (grab someone, hold them three seconds, crash down together).
 * Walls hurt — the Wall Slam passive punishes anyone thrown into one. The tree has three lines:
 * **Kick** (the roll and the Forecast crash), **Draft** (footwork — every 240px walked is a gale
 * charge, so speed is ammunition) and **Eye** (the calm the storm keeps for itself).
 *
 * Only E and Q carry on-cast rules. Gale Burst, Summon Front and Updraft hand their cooldown
 * straight back whenever they are refused (no charge, no front, no current), and a refused press
 * still counts as a cast — a rule on them could be farmed by mashing the key.
 */
export const TEMPEST_GENE_TREE: GeneTree = {
  element: 'tempest',
  name: 'Squall Line',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: the kick lands, and the wall behind them finishes the sentence. */
    gene({
      id: 'gene-tempest-steel-toe', name: 'Steel Toe', tier: 0, col: 0,
      text: 'Kick Blast casts make the foe take +3% damage for 1.5s — the kick, and the wall after it',
      maxLevel: 4, cost: linear(6, 2),
      grant: cast('e', (lv) => ({ damageMult: gain(0.03)(lv), ms: 1500 })),
      mastery: {
        name: 'Thunderclap', cost: 14,
        text: 'Hits have a 12% chance to clap thunder around you: 10 to everything within 90px (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 4, action: 'burstAoe', amount: 10, radius: 90 }),
      },
    }),
    /** Identity root: every stride is a gale in the chamber. */
    gene({
      id: 'gene-tempest-tailwind', name: 'Tailwind', tier: 0, col: 1,
      text: '+2% movement speed — and the 240px a gale charge costs comes round sooner',
      maxLevel: 4, cost: linear(6, 2),
      grant: stat((lv) => ({ speedMult: gain(0.02)(lv) })),
      mastery: {
        name: 'Second Wind', cost: 14,
        text: 'Kick Blast casts have a 15% chance to come straight back — the roll never quite stopped',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: the storm walls that keep the eye calm. */
    gene({
      id: 'gene-tempest-storm-wall', name: 'Storm Wall', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(6, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Grounding Rod', cost: 14,
        text: 'Start every fight with a shield charge — the first strike runs to earth',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Front Line: three seconds held in the sky, and the crash. */
    gene({
      id: 'gene-tempest-front-line', name: 'Front Line', tier: 1, col: 0, needs: ['gene-tempest-steel-toe'],
      text: 'Final Forecast casts make the foe take +5% damage for 4s — the hold and the crash',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('q', (lv) => ({ damageMult: gain(0.05)(lv), ms: 4000 })),
      mastery: {
        name: 'Thunderhead', cost: 18,
        text: 'Final Forecast casts break a thunderhead over you: 18 to everything within 120px',
        grant: onCast('q', { burst: { damage: 18, radius: 120 } }),
      },
    }),
    /** Gust Step: the roll's momentum carries on after it. */
    gene({
      id: 'gene-tempest-gust-step', name: 'Gust Step', tier: 1, col: 1, needs: ['gene-tempest-tailwind'],
      text: 'Kick Blast casts make you 10% faster for 2s',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('e', (lv) => ({ speedMult: gain(0.1)(lv), ms: 2000 })),
      mastery: {
        name: 'Rising Air', cost: 18,
        text: 'Kick Blast casts shave 600ms off every other cooldown',
        grant: onCast('e', { refundOthers: 600 }),
      },
    }),
    /** Ballast: sandbags in the gondola — harder to blow away. */
    gene({
      id: 'gene-tempest-ballast', name: 'Ballast', tier: 1, col: 2, needs: ['gene-tempest-storm-wall'],
      text: '+6 max HP',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ maxHp: flat(6)(lv) })),
      mastery: {
        name: 'Hailguard', cost: 18,
        text: 'When hit, a 20% chance to pelt the attacker with hail: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Downburst: wind that hits the ground and keeps going. */
    gene({
      id: 'gene-tempest-downburst', name: 'Downburst', tier: 2, col: 0, needs: ['gene-tempest-front-line'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Forked Lightning', cost: 22,
        text: '+5% crit chance — one bolt in twenty finds two places at once',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Jet Stream: the high wind that runs the storm on time. */
    gene({
      id: 'gene-tempest-jet-stream', name: 'Jet Stream', tier: 2, col: 1, needs: ['gene-tempest-gust-step'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Pressure Front', cost: 22,
        text: 'Every 10s a front rolls through: 20% faster for 2s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 10, action: 'tempHaste', mult: 1.2, durationMs: 2000 }),
      },
    }),
    /** Isobar: press on the storm and it presses back. */
    gene({
      id: 'gene-tempest-isobar', name: 'Isobar', tier: 2, col: 2, needs: ['gene-tempest-ballast'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Eye Wall', cost: 22,
        text: 'When hit, a 15% chance to wrap yourself in the eye wall — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Long Forecast: the storm sees its next chance coming. */
    gene({
      id: 'gene-tempest-long-forecast', name: 'Long Forecast', tier: 3, col: 0, needs: ['gene-tempest-downburst'],
      text: '−5% Final Forecast (ultimate) cooldown',
      maxLevel: 3, cost: linear(14, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Eye of the Storm', cost: 28,
        text: 'The first time you drop below 30% HP, the storm breaks around you: 30 to everything within 150px',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'burstAoe', amount: 30, radius: 150 }),
      },
    }),
    /** Crosswind Rider: crosses Kick and Draft — the roll pulls clean air into your lungs. */
    gene({
      id: 'gene-tempest-crosswind-rider', name: 'Crosswind Rider', tier: 3, col: 1,
      needs: ['gene-tempest-jet-stream', 'gene-tempest-downburst'],
      text: 'Kick Blast casts heal 2 HP',
      maxLevel: 4, cost: linear(11, 4),
      grant: cast('e', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Ride It Out', cost: 30,
        text: 'Once per fight, a lethal hit is cancelled and the storm sets you down at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Calm Before: the stillness just before the crash. */
    gene({
      id: 'gene-tempest-calm-before', name: 'Calm Before', tier: 3, col: 2, needs: ['gene-tempest-isobar'],
      text: 'Final Forecast casts give you 8 shield HP',
      maxLevel: 3, cost: linear(14, 4),
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Still Air', cost: 28,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more volt in every bolt. */
    enlightened({
      id: 'gene-tempest-enl-bolt', name: 'Enlightened Bolt', col: 0, needs: ['gene-tempest-long-forecast'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: a storm season that never quite ends. */
    enlightened({
      id: 'gene-tempest-enl-season', name: 'Enlightened Season', col: 1, needs: ['gene-tempest-crosswind-rider'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more stone in the storm wall. */
    enlightened({
      id: 'gene-tempest-enl-wall', name: 'Enlightened Wall', col: 2, needs: ['gene-tempest-calm-before'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
