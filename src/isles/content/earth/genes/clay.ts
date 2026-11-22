import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Slipware — Clay's gene tree.
 *
 * Clay is two bodies on one set of keys: the fighter, and an immortal golem on the cursor that
 * does the hitting. Slam (the golem's ring, or yours when fused), Rupture (the golem bursts into
 * eight piercing shards), Clay Clot (3s to draw a shield that orbits you), Slink (race the wall,
 * up to three shard barrages) and Fuse (merge with the golem: fast, immune, eight hits to live).
 * The tree has three wares: **Golem** (Slam and Rupture — the lump that hits), **Wheel** (Slink
 * and the tempo of the throw) and **Slip** (the clot, and a skin that sets hard).
 *
 * On the wall, a click past the third barrage is refused after its cooldown is stamped — so
 * nothing here hangs a heal or shield on the click, only a window the size of its own 1.1s.
 * Fuse's split is a recast that never stamps; its rules fire on going in, never on coming out.
 */
export const CLAY_GENE_TREE: GeneTree = {
  element: 'clay',
  name: 'Slipware',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: the golem lands with its whole weight, and the foe staggers under it. */
    gene({
      id: 'gene-clay-heavy-hands', name: 'Heavy Hands', tier: 0, col: 0,
      text: 'Slam casts make the foe take +2% damage for 1.1s',
      maxLevel: 4, cost: linear(7, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 1100 })),
      mastery: {
        name: 'Grog', cost: 16,
        text: 'Hits have a 10% chance to grind crushed fired clay in: 12 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 12, durationMs: 3000 }),
      },
    }),
    /** Identity root: the golem breaks apart, and the rest of you is already reshaping. */
    gene({
      id: 'gene-clay-wedging', name: 'Wedging', tier: 0, col: 1,
      text: 'Rupture casts shave 250ms off every other cooldown',
      maxLevel: 4, cost: linear(7, 2),
      grant: cast('e', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'Second Throw', cost: 16,
        text: 'Rupture casts have a 15% chance to come straight back — the golem was already whole',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: clay left to dry until it will not dent. */
    gene({
      id: 'gene-clay-leather-hard', name: 'Leather-Hard', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(7, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Bisque', cost: 16,
        text: 'Start every fight behind a 15 HP bisque-fired shell',
        grant: effect({ shieldHp: 15 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Sharp Grog: eight shards in the air, and every one of them has an edge. */
    gene({
      id: 'gene-clay-sharp-grog', name: 'Sharp Grog', tier: 1, col: 0, needs: ['gene-clay-heavy-hands'],
      text: 'Rupture casts make the foe take +4% damage for the 3s the shards are flying',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('e', (lv) => ({ damageMult: gain(0.04)(lv), ms: 3000 })),
      mastery: {
        name: 'Spitting Slip', cost: 20,
        text: 'Rupture casts fling clay off your own hands too: 14 to everything within 110px of you',
        grant: onCast('e', { burst: { damage: 14, radius: 110 } }),
      },
    }),
    /** Wall Runner: a body that knows the rim of the wheel. */
    gene({
      id: 'gene-clay-wall-runner', name: 'Wall Runner', tier: 1, col: 1, needs: ['gene-clay-wedging'],
      text: 'Slink casts give +5% move speed for 4s',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('f', (lv) => ({ speedMult: gain(0.05)(lv), ms: 4000 })),
      mastery: {
        name: 'Coiling', cost: 20,
        text: 'Slink casts shave 1.5s off every other cooldown — one lap of the rim, one coil of clay',
        grant: onCast('f', { refundOthers: 1500 }),
      },
    }),
    /** Thick Slip: the clot goes on in a heavier coat. */
    gene({
      id: 'gene-clay-thick-slip', name: 'Thick Slip', tier: 1, col: 2, needs: ['gene-clay-leather-hard'],
      text: 'Clay Clot casts give you 4 shield HP on top of the clay you draw',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('r', (lv) => ({ shield: flat(4)(lv) })),
      mastery: {
        name: 'Slip Spatter', cost: 20,
        text: 'When hit, a 20% chance to spatter the attacker with slip: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Greenware: unfired, but already the shape it will be. */
    gene({
      id: 'gene-clay-greenware', name: 'Greenware', tier: 2, col: 0, needs: ['gene-clay-sharp-grog'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(10, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Fired Edge', cost: 24,
        text: '+5% crit chance — a shard that came out of the kiln sharp',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Pug Mill: clay worked through the mill until it runs without a lump. */
    gene({
      id: 'gene-clay-pug-mill', name: 'Pug Mill', tier: 2, col: 1, needs: ['gene-clay-wall-runner'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: linear(10, 3),
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'The Wheel Turns', cost: 24,
        text: 'Casts have a 10% chance to turn the wheel: every cooldown skips 0.5s (at most every 3s)',
        grant: behavior({ trigger: 'onCast', chance: 0.1, cooldownSec: 3, action: 'cooldownRefund', amount: 500 }),
      },
    }),
    /** Terra Sigillata: burnished slip so fine that blows slide off it and back. */
    gene({
      id: 'gene-clay-terra-sigillata', name: 'Terra Sigillata', tier: 2, col: 2, needs: ['gene-clay-thick-slip'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(10, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Saggar', cost: 24,
        text: 'When hit, a 15% chance to close a saggar box round you — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Long Firing: the golem is ready to take you in again sooner. */
    gene({
      id: 'gene-clay-long-firing', name: 'Long Firing', tier: 3, col: 0, needs: ['gene-clay-greenware'],
      text: '−5% Fuse (ultimate) cooldown',
      maxLevel: 3, cost: linear(15, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'One Body', cost: 30,
        text: 'Fuse casts make the foe take +15% damage for 6s — two bodies\' worth of weight in one',
        grant: onCast('q', { damageMult: 1.15, ms: 6000 }),
      },
    }),
    /** Reclaim: crosses Golem and Wheel — the shards of every rupture find their way back to you. */
    gene({
      id: 'gene-clay-reclaim', name: 'Reclaim', tier: 3, col: 1,
      needs: ['gene-clay-pug-mill', 'gene-clay-greenware'],
      text: 'Rupture casts heal 2 HP',
      maxLevel: 4, cost: linear(12, 4),
      grant: cast('e', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Back in the Bucket', cost: 32,
        text: 'Once per fight, a lethal hit is cancelled — slaked down and rewedged at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Stoneware: you come out of the golem mended, whatever it took for you. */
    gene({
      id: 'gene-clay-stoneware', name: 'Stoneware', tier: 3, col: 2, needs: ['gene-clay-terra-sigillata'],
      text: 'Fuse casts heal you 6 HP as you sink into the golem',
      maxLevel: 3, cost: linear(15, 4),
      grant: cast('q', (lv) => ({ heal: flat(6)(lv) })),
      mastery: {
        name: 'Vitrified', cost: 30,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: the golem packed one handful heavier. */
    enlightened({
      id: 'gene-clay-enl-heft', name: 'Enlightened Heft', col: 0, needs: ['gene-clay-long-firing'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: a wheel that spins one turn faster every season. */
    enlightened({
      id: 'gene-clay-enl-wheel', name: 'Enlightened Wheel', col: 1, needs: ['gene-clay-reclaim'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more coat of glaze. */
    enlightened({
      id: 'gene-clay-enl-glaze', name: 'Enlightened Glaze', col: 2, needs: ['gene-clay-stoneware'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
