import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Lattice — Crystal's gene tree.
 *
 * Crystal builds a mirror-room and shoots through it: Diamond Shard (a kite that flies until it
 * hits, ×1.5 per bounce), Place Crystal (up to six reflecting lances), Atune (every shard on
 * screen stops for 2s, aims at the cursor, then launches), Crystal Portal (two gates; foes that
 * enter are stunned) and Trick of the Light (two clones for 12s). The tree has three faces:
 * **Brilliance** (Atune's volley and the cut that makes it sing), **Growth** (the lattice
 * itself — lances and gates coming round) and **Hardness** (a body that scatters what hits it).
 *
 * Diamond Shard's damage lands whenever the kite finally strikes — often seconds after the
 * cast, off several bounces — so no window keyed to the click could cover its hit. Crystal's
 * offence root sits on Atune, whose 2s hold and launch is a known moment.
 */
export const CRYSTAL_GENE_TREE: GeneTree = {
  element: 'crystal',
  name: 'Lattice',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: every frozen shard finds its line, and the foe stands on it. */
    gene({
      id: 'gene-crystal-cleavage-plane', name: 'Cleavage Plane', tier: 0, col: 0,
      text: 'Atune casts make the foe take +3% damage for the 3s the shards hold and fly',
      maxLevel: 4, cost: linear(7, 2),
      grant: cast('r', (lv) => ({ damageMult: gain(0.03)(lv), ms: 3000 })),
      mastery: {
        name: 'Prismatic Burn', cost: 16,
        text: 'Hits have a 10% chance to split the light into the wound: 12 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 12, durationMs: 3000 }),
      },
    }),
    /** Identity root: a lance grown from the floor, and the rest of the room speeds up. */
    gene({
      id: 'gene-crystal-seed-crystal', name: 'Seed Crystal', tier: 0, col: 1,
      text: 'Place Crystal casts shave 120ms off every other cooldown',
      maxLevel: 4, cost: linear(7, 2),
      grant: cast('e', (lv) => ({ refundOthers: flat(120)(lv) })),
      mastery: {
        name: 'Twinned Growth', cost: 16,
        text: 'Place Crystal casts have a 12% chance to come straight back — the lance grew a twin',
        grant: onCast('e', { refundSelfChance: 0.12 }),
      },
    }),
    /** Defence root: a body cut too hard to scratch. */
    gene({
      id: 'gene-crystal-hardness', name: 'Hardness', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(7, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Refracted Outline', cost: 16,
        text: '+4% dodge chance — the foe aims at where the light says you are',
        grant: effect({ dodgeChance: 0.04 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Fire in the Stone: the flash inside a well-cut gem, caught on the edge of every shard. */
    gene({
      id: 'gene-crystal-fire-in-the-stone', name: 'Fire in the Stone', tier: 1, col: 0, needs: ['gene-crystal-cleavage-plane'],
      text: '+1.5% crit chance',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ critChance: flat(0.015)(lv) })),
      mastery: {
        name: 'Chime', cost: 20,
        text: 'Atune casts ring the whole lattice round you: 14 to everything within 110px',
        grant: onCast('r', { burst: { damage: 14, radius: 110 } }),
      },
    }),
    /** Gatekeeper: you know the way through your own doors. */
    gene({
      id: 'gene-crystal-gatekeeper', name: 'Gatekeeper', tier: 1, col: 1, needs: ['gene-crystal-seed-crystal'],
      text: 'Crystal Portal casts give +5% move speed for 3s',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('f', (lv) => ({ speedMult: gain(0.05)(lv), ms: 3000 })),
      mastery: {
        name: 'Twin Gates', cost: 20,
        text: 'Crystal Portal casts shave 1s off every other cooldown',
        grant: onCast('f', { refundOthers: 1000 }),
      },
    }),
    /** Geode Shell: the stopped shards turn their edges outward round you. */
    gene({
      id: 'gene-crystal-geode-shell', name: 'Geode Shell', tier: 1, col: 2, needs: ['gene-crystal-hardness'],
      text: 'Atune casts give you 4 shield HP',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('r', (lv) => ({ shield: flat(4)(lv) })),
      mastery: {
        name: 'Facet Ward', cost: 20,
        text: 'When hit, a 15% chance a facet turns the next blow — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Refractive Index: light bent harder through denser stone. */
    gene({
      id: 'gene-crystal-refractive-index', name: 'Refractive Index', tier: 2, col: 0, needs: ['gene-crystal-fire-in-the-stone'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(10, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Brilliant Cut', cost: 24,
        text: 'Crits hit harder: critical multiplier raised to at least ×1.8',
        grant: effect({ critMult: 1.8 }),
      },
    }),
    /** Piezoelectric: squeeze the lattice and it gives the time back. */
    gene({
      id: 'gene-crystal-piezoelectric', name: 'Piezoelectric', tier: 2, col: 1, needs: ['gene-crystal-gatekeeper'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: linear(10, 3),
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Resonant Lattice', cost: 24,
        text: 'Every 8s the lattice hums: every cooldown skips 1s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 8, action: 'cooldownRefund', amount: 1000 }),
      },
    }),
    /** Mohs Ten: nothing on the isle scratches it, and what tries is cut. */
    gene({
      id: 'gene-crystal-mohs-ten', name: 'Mohs Ten', tier: 2, col: 2, needs: ['gene-crystal-geode-shell'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(10, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Glare', cost: 24,
        text: 'The foe deals 5% less damage — it is fighting with the sun in its eyes',
        grant: effect({ enemyDamageMult: 0.95 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Hall of Mirrors: the clones are ready to step out of the glass again sooner. */
    gene({
      id: 'gene-crystal-hall-of-mirrors', name: 'Hall of Mirrors', tier: 3, col: 0, needs: ['gene-crystal-refractive-index'],
      text: '−5% Trick of the Light (ultimate) cooldown',
      maxLevel: 3, cost: linear(15, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Every Face a Blade', cost: 30,
        text: 'Trick of the Light casts make the foe take +12% damage for the 12s your clones stand',
        grant: onCast('q', { damageMult: 1.12, ms: 12000 }),
      },
    }),
    /** Perfect Lattice: crosses Brilliance and Growth — each lance set true mends a flaw in you. */
    gene({
      id: 'gene-crystal-perfect-lattice', name: 'Perfect Lattice', tier: 3, col: 1,
      needs: ['gene-crystal-piezoelectric', 'gene-crystal-refractive-index'],
      text: 'Place Crystal casts heal 1 HP',
      maxLevel: 4, cost: linear(12, 4),
      grant: cast('e', (lv) => ({ heal: flat(1)(lv) })),
      mastery: {
        name: 'Glass Double', cost: 32,
        text: 'Once per fight, a lethal hit shatters a glass double instead — you stand at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Mirror Guard: the clones stand in front of you, and so does their light. */
    gene({
      id: 'gene-crystal-mirror-guard', name: 'Mirror Guard', tier: 3, col: 2, needs: ['gene-crystal-mohs-ten'],
      text: 'Trick of the Light casts give you 8 shield HP',
      maxLevel: 3, cost: linear(15, 4),
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Diamond Heart', cost: 30,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more facet on the cut, forever. */
    enlightened({
      id: 'gene-crystal-enl-facet', name: 'Enlightened Facet', col: 0, needs: ['gene-crystal-hall-of-mirrors'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: a lattice that keeps growing, a molecule a year. */
    enlightened({
      id: 'gene-crystal-enl-lattice', name: 'Enlightened Lattice', col: 1, needs: ['gene-crystal-perfect-lattice'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more carat on the stone. */
    enlightened({
      id: 'gene-crystal-enl-carat', name: 'Enlightened Carat', col: 2, needs: ['gene-crystal-mirror-guard'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
