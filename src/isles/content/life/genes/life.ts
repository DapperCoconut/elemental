import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Rootstock — Life's gene tree.
 *
 * Life is a gardener: Petal Shotgun from the hand, a bar of eight seeds planted at the cursor
 * (Plant, max five), Fertilize to heal and power them, Root Shield over the cursored plant, and
 * Thrive! to split the hits you take across the bed. The tree has three beds: **Petals** (the
 * shotgun and Fertilize's power boost — the garden that bites), **Sowing** (Plant and the
 * seedbank — cooldowns coming round, the bed refilling itself) and **Hedgerow** (Root Shield
 * and Thrive! — bark, brambles and old growth).
 *
 * Petal Shotgun fires every 500ms, so its one window is 0.5s — it can never stack on itself.
 */
export const LIFE_GENE_TREE: GeneTree = {
  element: 'life',
  name: 'Rootstock',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: three petals land, and the foe flinches from the thorn on each. */
    gene({
      id: 'gene-life-thorned-petals', name: 'Thorned Petals', tier: 0, col: 0,
      text: 'Petal Shotgun casts make the foe take +2% damage for 0.5s',
      maxLevel: 4, cost: linear(5, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 500 })),
      mastery: {
        name: 'Rose Hips', cost: 12,
        text: 'Hits have a 10% chance to leave a thorn that festers for 10 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 10, durationMs: 3000 }),
      },
    }),
    /** Identity root: a seed in the ground and your hands are free for everything else. */
    gene({
      id: 'gene-life-green-thumb', name: 'Green Thumb', tier: 0, col: 1,
      text: 'Plant casts shave 250ms off every other cooldown',
      maxLevel: 4, cost: linear(5, 2),
      grant: cast('e', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'Seed Pouch', cost: 12,
        text: 'Plant casts have a 15% chance to come straight back — a second seed was in your palm',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: the gardener's own skin, weathered to bark. */
    gene({
      id: 'gene-life-weathered-bark', name: 'Weathered Bark', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(5, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Clipped Hedge', cost: 12,
        text: 'Start every fight behind a 20 HP hedge shield',
        grant: effect({ shieldHp: 20 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Pollen Fury: a fertilized bed fights for five seconds as if it means it. */
    gene({
      id: 'gene-life-pollen-fury', name: 'Pollen Fury', tier: 1, col: 0, needs: ['gene-life-thorned-petals'],
      text: 'Fertilize casts make the foe take +4% damage for the 5s your plants are powered',
      maxLevel: 4, cost: linear(6, 3),
      grant: cast('r', (lv) => ({ damageMult: gain(0.04)(lv), ms: 5000 })),
      mastery: {
        name: 'Bumper Crop', cost: 16,
        text: 'Fertilize casts shake a cloud of pollen off you: 14 to everything within 110px',
        grant: onCast('r', { burst: { damage: 14, radius: 110 } }),
      },
    }),
    /** Compost: what feeds the bed feeds the gardener. */
    gene({
      id: 'gene-life-compost', name: 'Compost', tier: 1, col: 1, needs: ['gene-life-green-thumb'],
      text: 'Fertilize casts heal you 3 HP as well as the plants',
      maxLevel: 4, cost: linear(6, 3),
      grant: cast('r', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Photosynthesis', cost: 16,
        text: '+1 HP regenerated every second — the Sunflower link runs both ways',
        grant: effect({ regenPerSecond: 1 }),
      },
    }),
    /** Deep Roots: shielding a plant digs your own feet in too. */
    gene({
      id: 'gene-life-deep-roots', name: 'Deep Roots', tier: 1, col: 2, needs: ['gene-life-weathered-bark'],
      text: 'Root Shield casts give you 5 shield HP',
      maxLevel: 4, cost: linear(6, 3),
      grant: cast('f', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Bramble Coat', cost: 16,
        text: 'When hit, a 20% chance to catch the attacker in brambles: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Hardy Cultivar: seed stock bred for the worst soil on the isle. */
    gene({
      id: 'gene-life-hardy-cultivar', name: 'Hardy Cultivar', tier: 2, col: 0, needs: ['gene-life-pollen-fury'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Frost Lily Edge', cost: 20,
        text: '+5% crit chance — a petal grown sharp as the lily\'s ice',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Nightshade: the Nightcap's poison and the Frost Lily's chill both take deeper. */
    gene({
      id: 'gene-life-nightshade', name: 'Nightshade', tier: 2, col: 1, needs: ['gene-life-compost'],
      text: '+4% status damage and +4% status duration',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ statusDmgMult: gain(0.04)(lv), statusDurMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Lotus Bloom', cost: 20,
        text: 'Every 10s a lotus opens at your feet: heal 6',
        grant: behavior({ trigger: 'everyNSec', periodSec: 10, action: 'healBurst', amount: 6 }),
      },
    }),
    /** Thornwall: a hedge you cannot push through without bleeding. */
    gene({
      id: 'gene-life-thornwall', name: 'Thornwall', tier: 2, col: 2, needs: ['gene-life-deep-roots'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Graft', cost: 20,
        text: 'When hit, a 15% chance to graft on fresh bark — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Overgrowth: the bed is ready to take your wounds again sooner. */
    gene({
      id: 'gene-life-overgrowth', name: 'Overgrowth', tier: 3, col: 0, needs: ['gene-life-hardy-cultivar'],
      text: '−5% Thrive! (ultimate) cooldown',
      maxLevel: 3, cost: linear(13, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'The Grove Answers', cost: 26,
        text: 'Thrive! casts throw the whole bed\'s bloom outward: 20 to everything within 130px',
        grant: onCast('q', { burst: { damage: 20, radius: 130 } }),
      },
    }),
    /** Perennial: crosses Petals and Sowing — every seed you set down roots you a little too. */
    gene({
      id: 'gene-life-perennial', name: 'Perennial', tier: 3, col: 1,
      needs: ['gene-life-nightshade', 'gene-life-hardy-cultivar'],
      text: 'Plant casts heal 2 HP',
      maxLevel: 4, cost: linear(10, 4),
      grant: cast('e', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Seedbank', cost: 28,
        text: 'Once per fight, a lethal hit is cancelled and you sprout back up at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Windbreak: a planted row that holds when the storm comes. */
    gene({
      id: 'gene-life-windbreak', name: 'Windbreak', tier: 3, col: 2, needs: ['gene-life-thornwall'],
      text: 'Thrive! casts give you 8 shield HP before the bed takes the hits',
      maxLevel: 3, cost: linear(13, 4),
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Old Growth', cost: 26,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more thorn on every petal, season after season. */
    enlightened({
      id: 'gene-life-enl-thorn', name: 'Enlightened Thorn', col: 0, needs: ['gene-life-overgrowth'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: a spring that comes a day earlier every year. */
    enlightened({
      id: 'gene-life-enl-season', name: 'Enlightened Season', col: 1, needs: ['gene-life-perennial'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more ring in the trunk, forever. */
    enlightened({
      id: 'gene-life-enl-heartwood', name: 'Enlightened Heartwood', col: 2, needs: ['gene-life-windbreak'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
