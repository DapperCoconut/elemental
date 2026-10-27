import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from './helpers';

/**
 * Hearthblood — Fire's gene tree.
 *
 * Three branches grow from the coal: **Kindling** (Fireball and Pressure Bomb hitting harder and
 * coming back sooner, ending in a faster Flame Nuke), **Trailblaze** (Flame Dash as a moving
 * hearth — speed, healing on the dash, a last-breath rebirth) and **Soot** (the defensive
 * branch: thick skin, backdraft reflection, a coal that will not go out at low HP).
 */
export const FIRE_GENE_TREE: GeneTree = {
  element: 'fire',
  name: 'Hearthblood',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: every Fireball softens the foe for a moment. */
    gene({
      id: 'gene-fire-kindling-cough', name: 'Kindling Cough', tier: 0, col: 0,
      text: 'Fireball casts make the foe take +3% damage for 1.5s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.03)(lv), ms: 1500 })),
      mastery: {
        name: 'White Coal', cost: 10,
        text: 'Fireballs burn white-hot: +5% crit chance',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Identity root: Flame Dash leaves you running hot. */
    gene({
      id: 'gene-fire-trailblaze', name: 'Trailblaze', tier: 0, col: 1,
      text: 'Flame Dash casts give +6% move speed for 1.5s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('e', (lv) => ({ speedMult: gain(0.06)(lv), ms: 1500 })),
      mastery: {
        name: 'Cinder Wake', cost: 10,
        text: 'Flame Dash casts also scorch everything within 90px of you for 10',
        grant: onCast('e', { burst: { damage: 10, radius: 90 } }),
      },
    }),
    /** Defence root: soot-blackened skin. */
    gene({
      id: 'gene-fire-soot-hide', name: 'Soot Hide', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(4, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Clinker Plate', cost: 10,
        text: 'Start every fight with 1 shield charge that blocks a whole hit',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Pressure Bomb's fuse feeds the rest of the kit. */
    gene({
      id: 'gene-fire-short-fuse', name: 'Short Fuse', tier: 1, col: 0, needs: ['gene-fire-kindling-cough'],
      text: 'Pressure Bomb casts shave 150ms off every other cooldown',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('r', (lv) => ({ refundOthers: flat(150)(lv) })),
      mastery: {
        name: 'Chain Charge', cost: 14,
        text: 'Pressure Bomb casts have a 15% chance to come straight back off cooldown',
        grant: onCast('r', { refundSelfChance: 0.15 }),
      },
    }),
    /** Banked coals: a slow, steady warmth that offsets Flame Body's burn. */
    gene({
      id: 'gene-fire-banked-coals', name: 'Banked Coals', tier: 1, col: 1, needs: ['gene-fire-trailblaze'],
      text: '+0.5 HP regenerated every second',
      maxLevel: 4, cost: linear(5, 3),
      grant: stat((lv) => ({ regenPerSecond: flat(0.5)(lv) })),
      mastery: {
        name: 'Hearth Heart', cost: 14,
        text: '+25 max HP',
        grant: effect({ maxHp: 25 }),
      },
    }),
    /** A body of banked fire is a bigger body. */
    gene({
      id: 'gene-fire-hearthguard', name: 'Hearthguard', tier: 1, col: 2, needs: ['gene-fire-soot-hide'],
      text: '+12 max HP',
      maxLevel: 4, cost: linear(5, 3),
      grant: stat((lv) => ({ maxHp: flat(12)(lv) })),
      mastery: {
        name: 'Smoke Screen', cost: 14,
        text: 'When hit, a 15% chance to gain a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Bellows lungs: plain, honest heat. */
    gene({
      id: 'gene-fire-bellows-lungs', name: 'Bellows Lungs', tier: 2, col: 0, needs: ['gene-fire-short-fuse'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Forge Breath', cost: 18,
        text: 'Hits have a 12% chance to sear the foe for 10 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 3, action: 'sear', amount: 10, durationMs: 3000 }),
      },
    }),
    /** Lamp-oil blood: every burn you set lingers and bites. */
    gene({
      id: 'gene-fire-lamp-oil-blood', name: 'Lamp-Oil Blood', tier: 2, col: 1, needs: ['gene-fire-banked-coals'],
      text: '+4% status damage and +4% status duration',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ statusDmgMult: gain(0.04)(lv), statusDurMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Ember Veins', cost: 18,
        text: 'Hits have an 8% chance to make every cooldown skip 0.4s (at most every 2s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.08, cooldownSec: 2, action: 'cooldownRefund', amount: 400 }),
      },
    }),
    /** Backdraft: open the door on a fire and it answers. */
    gene({
      id: 'gene-fire-backdraft', name: 'Backdraft', tier: 2, col: 2, needs: ['gene-fire-hearthguard'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Flashback', cost: 18,
        text: 'When hit, a 20% chance to blast foes near you for 14 (at most every 4s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 4, action: 'burstAoe', amount: 14, radius: 120 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Nuke Primer: the big one comes round faster. */
    gene({
      id: 'gene-fire-nuke-primer', name: 'Nuke Primer', tier: 3, col: 0, needs: ['gene-fire-bellows-lungs'],
      text: '−5% Flame Nuke (ultimate) cooldown',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Second Sun', cost: 24,
        text: 'Flame Nuke casts make the foe take +20% damage for 4s',
        grant: onCast('q', { damageMult: 1.2, ms: 4000 }),
      },
    }),
    /** Phoenix Step: crosses the Kindling and Trailblaze branches — the dash that mends. */
    gene({
      id: 'gene-fire-phoenix-step', name: 'Phoenix Step', tier: 3, col: 1,
      needs: ['gene-fire-lamp-oil-blood', 'gene-fire-bellows-lungs'],
      text: 'Flame Dash casts heal 2 HP',
      maxLevel: 4, cost: linear(9, 4),
      grant: cast('e', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Ash Rebirth', cost: 26,
        text: 'Once per fight, a lethal hit is cancelled and you rise from the ash at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Last Coal: the ember at the bottom of the grate. */
    gene({
      id: 'gene-fire-last-coal', name: 'Last Coal', tier: 3, col: 2, needs: ['gene-fire-backdraft'],
      text: 'The first time you fall below 30% HP, heal 12',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: flat(12)(lv) }] })),
      mastery: {
        name: 'Hold the Hearth', cost: 24,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: the flame that keeps getting hotter. */
    enlightened({
      id: 'gene-fire-enl-flame', name: 'Enlightened Flame', col: 0, needs: ['gene-fire-nuke-primer'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the wick that burns down faster every time. */
    enlightened({
      id: 'gene-fire-enl-wick', name: 'Enlightened Wick', col: 1, needs: ['gene-fire-phoenix-step'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: the hearth that never stops growing. */
    enlightened({
      id: 'gene-fire-enl-hearth', name: 'Enlightened Hearth', col: 2, needs: ['gene-fire-last-coal'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
