import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Erg — Sand's gene tree (element id `dune`; `sand` is Time).
 *
 * Sand fights from height: Sand Striker (a reloading flintlock hitscan, 30 flat, +10 off a
 * platform, +5 in the air), Sandstone Ruins (a short course with a golden orb that halves the
 * reload for 8s), Cursed Pyramid (a long, poisoned course with a laser idol at the end), Sandwalk
 * (a running-sand bridge to the next platform, 6s, everything 25% faster on it) and Final Trail
 * (both of you thrown up rival pyramids over rising lava; second to the crown takes 70). The tree
 * has three dunes: **Powder** (the flintlock and the idol), **Caravan** (the courses and the
 * bridge — feet that keep moving) and **Sandstone** (a hide that takes the falls).
 *
 * Sand Striker is hitscan and the kit only lets it stamp once the barrel is loaded, so a 0.9s
 * window always covers its own shot and can never overlap the next.
 */
export const DUNE_GENE_TREE: GeneTree = {
  element: 'dune',
  name: 'Erg',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: a charge rammed down hard, and the lance goes in deeper. */
    gene({
      id: 'gene-dune-packed-charge', name: 'Packed Charge', tier: 0, col: 0,
      text: 'Sand Striker casts make the foe take +3% damage for 0.9s — the shot that just left',
      maxLevel: 4, cost: linear(7, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.03)(lv), ms: 900 })),
      mastery: {
        name: 'Glass in the Wound', cost: 16,
        text: 'Hits have a 10% chance to leave fused sand in the wound: 12 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 12, durationMs: 3000 }),
      },
    }),
    /** Identity root: a course raised from the floor, and every other plan is closer. */
    gene({
      id: 'gene-dune-masons-mark', name: 'Mason\'s Mark', tier: 0, col: 1,
      text: 'Sandstone Ruins casts shave 300ms off every other cooldown',
      maxLevel: 4, cost: linear(7, 2),
      grant: cast('e', (lv) => ({ refundOthers: flat(300)(lv) })),
      mastery: {
        name: 'Hidden Chamber', cost: 16,
        text: 'Sandstone Ruins casts have a 15% chance to come straight back — there was another ruin under it',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: a hide baked hard by the rain-shadow sun. */
    gene({
      id: 'gene-dune-sunbaked-hide', name: 'Sunbaked Hide', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(7, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Heat Shimmer', cost: 16,
        text: '+4% dodge chance — the air over the dunes never quite tells the truth about you',
        grant: effect({ dodgeChance: 0.04 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Pharaoh's Due: the pyramid rises, and the foe is already paying for it. */
    gene({
      id: 'gene-dune-pharaohs-due', name: 'Pharaoh\'s Due', tier: 1, col: 0, needs: ['gene-dune-packed-charge'],
      text: 'Cursed Pyramid casts make the foe take +3% damage for the 10s you spend climbing',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('r', (lv) => ({ damageMult: gain(0.03)(lv), ms: 10000 })),
      mastery: {
        name: 'Scarab Swarm', cost: 20,
        text: 'Cursed Pyramid casts loose the scarabs under it: 16 to everything within 120px of you',
        grant: onCast('r', { burst: { damage: 16, radius: 120 } }),
      },
    }),
    /** Running Sand: the bridge keeps carrying you after you step off it. */
    gene({
      id: 'gene-dune-running-sand', name: 'Running Sand', tier: 1, col: 1, needs: ['gene-dune-masons-mark'],
      text: 'Sandwalk casts give +5% move speed for the bridge\'s 6s',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('f', (lv) => ({ speedMult: gain(0.05)(lv), ms: 6000 })),
      mastery: {
        name: 'Long Caravan', cost: 20,
        text: 'Sandwalk casts shave 1s off every other cooldown',
        grant: onCast('f', { refundOthers: 1000 }),
      },
    }),
    /** Caravan Awning: you raise the ruins, and some of the shade comes with you. */
    gene({
      id: 'gene-dune-caravan-awning', name: 'Caravan Awning', tier: 1, col: 2, needs: ['gene-dune-sunbaked-hide'],
      text: 'Sandstone Ruins casts give you 4 shield HP — a cushion for the fall off the course',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('e', (lv) => ({ shield: flat(4)(lv) })),
      mastery: {
        name: 'Sand in the Boots', cost: 20,
        text: 'When hit, a 20% chance to kick sand at the attacker: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Rifling: the barrel cut so the lance spins true. */
    gene({
      id: 'gene-dune-rifling', name: 'Rifling', tier: 2, col: 0, needs: ['gene-dune-pharaohs-due'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(10, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Dead Eye', cost: 24,
        text: '+5% crit chance — a marksman picks the moment the foe is still',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Slipface: the steep lee of a dune, where sand never stops sliding. */
    gene({
      id: 'gene-dune-slipface', name: 'Slipface', tier: 2, col: 1, needs: ['gene-dune-running-sand'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: linear(10, 3),
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Shifting Ground', cost: 24,
        text: 'Every 10s the dunes shift under you: +20% move speed for 2s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 10, action: 'tempHaste', mult: 1.2, durationMs: 2000 }),
      },
    }),
    /** Sandstone: sand pressed into rock — what hits it grinds itself down. */
    gene({
      id: 'gene-dune-sandstone', name: 'Sandstone', tier: 2, col: 2, needs: ['gene-dune-caravan-awning'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(10, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Buried Shield', cost: 24,
        text: 'When hit, a 15% chance to dig up an old bronze shield — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Crown's Weight: the race up the pyramid is on offer again sooner. */
    gene({
      id: 'gene-dune-crowns-weight', name: 'Crown\'s Weight', tier: 3, col: 0, needs: ['gene-dune-rifling'],
      text: '−5% Final Trail (ultimate) cooldown',
      maxLevel: 3, cost: linear(15, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'First to the Crown', cost: 30,
        text: 'Final Trail casts give +15% move speed for 8s — you were always going to win that race',
        grant: onCast('q', { speedMult: 1.15, ms: 8000 }),
      },
    }),
    /** Oasis: crosses Powder and Caravan — every bridge you lay runs past water. */
    gene({
      id: 'gene-dune-oasis', name: 'Oasis', tier: 3, col: 1,
      needs: ['gene-dune-slipface', 'gene-dune-rifling'],
      text: 'Sandwalk casts heal 2 HP',
      maxLevel: 4, cost: linear(12, 4),
      grant: cast('f', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Sealed Tomb', cost: 32,
        text: 'Once per fight, a lethal hit is cancelled — you dig yourself out of the dune at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Sun Shrine: you climb toward the crown wrapped in the pyramid's old blessing. */
    gene({
      id: 'gene-dune-sun-shrine', name: 'Sun Shrine', tier: 3, col: 2, needs: ['gene-dune-sandstone'],
      text: 'Final Trail casts give you 8 shield HP before the race begins',
      maxLevel: 3, cost: linear(15, 4),
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Mudbrick Wall', cost: 30,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more grain of powder behind every lance. */
    enlightened({
      id: 'gene-dune-enl-powder', name: 'Enlightened Powder', col: 0, needs: ['gene-dune-crowns-weight'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: a dune that walks a little further every year. */
    enlightened({
      id: 'gene-dune-enl-drift', name: 'Enlightened Drift', col: 1, needs: ['gene-dune-oasis'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more course of mudbrick on the wall. */
    enlightened({
      id: 'gene-dune-enl-mudbrick', name: 'Enlightened Mudbrick', col: 2, needs: ['gene-dune-sun-shrine'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
