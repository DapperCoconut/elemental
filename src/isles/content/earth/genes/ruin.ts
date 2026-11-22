import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Dereliction — Ruin's gene tree.
 *
 * Ruin only takes things away: Shred Slice (a wedge that tears through bodies and shots alike),
 * Lockdown (a padlock on the foe's last real ability for 20s), Rusty Skewer (thread them on a
 * spike to the wall and rust 10% of their health into weak HP), Spikes of Ruin (a ring worn for
 * 2s, then an eruption that inverts buffs and kills whatever was built) and Unstoppable Decay (a
 * permanent rot that stacks to ten). The tree has three wrecks: **Rust** (the wedge and the
 * spike), **Collapse** (the ring's tempo — getting close and staying there) and **Rubble** (a
 * frame that is falling apart and will not fall).
 *
 * Lockdown hands its cooldown back when it finds nobody in reach, and a refunded cast pays out
 * no rules, so E rules only fire on a padlock that lands. Decay past its tenth stack still pays
 * its ultimate charge, so Q's rules stay: they are what keep a tenth-stack Decay worth casting.
 */
export const RUIN_GENE_TREE: GeneTree = {
  element: 'ruin',
  name: 'Dereliction',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: a wedge with a ragged edge leaves a ragged wound. */
    gene({
      id: 'gene-ruin-ragged-wedge', name: 'Ragged Wedge', tier: 0, col: 0,
      text: 'Shred Slice casts make the foe take +2% damage for 0.75s',
      maxLevel: 4, cost: linear(7, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 750 })),
      mastery: {
        name: 'Lockjaw', cost: 16,
        text: 'Hits have a 10% chance to leave rust in the wound: 12 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 12, durationMs: 3000 }),
      },
    }),
    /** Identity root: the spike flies, and everything else is that much closer to breaking. */
    gene({
      id: 'gene-ruin-corrosion', name: 'Corrosion', tier: 0, col: 1,
      text: 'Rusty Skewer casts shave 250ms off every other cooldown',
      maxLevel: 4, cost: linear(7, 2),
      grant: cast('r', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'Barbed Return', cost: 16,
        text: 'Rusty Skewer casts have a 15% chance to come straight back — the barb tore loose',
        grant: onCast('r', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: a body that has been broken before and set badly. */
    gene({
      id: 'gene-ruin-scar-tissue', name: 'Scar Tissue', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(7, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Rust Crust', cost: 16,
        text: 'Start every fight behind a 20 HP crust of rust',
        grant: effect({ shieldHp: 20 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Tetanus: whoever rides the spike to the wall arrives softened for what follows. */
    gene({
      id: 'gene-ruin-tetanus', name: 'Tetanus', tier: 1, col: 0, needs: ['gene-ruin-ragged-wedge'],
      text: 'Rusty Skewer casts make the foe take +4% damage for 3s while the spike carries them',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('r', (lv) => ({ damageMult: gain(0.04)(lv), ms: 3000 })),
      mastery: {
        name: 'Pulled Nails', cost: 20,
        text: 'Rusty Skewer casts shed a ring of old nails round you: 14 to everything within 110px',
        grant: onCast('r', { burst: { damage: 14, radius: 110 } }),
      },
    }),
    /** Crumbling Ground: the ring follows you for two seconds — so walk it onto them. */
    gene({
      id: 'gene-ruin-crumbling-ground', name: 'Crumbling Ground', tier: 1, col: 1, needs: ['gene-ruin-corrosion'],
      text: 'Spikes of Ruin casts give +5% move speed for the 2s the ring follows you',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('f', (lv) => ({ speedMult: gain(0.05)(lv), ms: 2000 })),
      mastery: {
        name: 'Short Fuse', cost: 20,
        text: 'Spikes of Ruin casts shave 1.5s off every other cooldown',
        grant: onCast('f', { refundOthers: 1500 }),
      },
    }),
    /** Scrap Armour: the spikes come up round you, and some stay stuck in your coat. */
    gene({
      id: 'gene-ruin-scrap-armour', name: 'Scrap Armour', tier: 1, col: 2, needs: ['gene-ruin-scar-tissue'],
      text: 'Spikes of Ruin casts give you 4 shield HP',
      maxLevel: 4, cost: linear(8, 3),
      grant: cast('f', (lv) => ({ shield: flat(4)(lv) })),
      mastery: {
        name: 'Spiked Coat', cost: 20,
        text: 'When hit, a 20% chance the attacker catches a spike: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Entropy: a foe with its best key padlocked is a foe already running down. */
    gene({
      id: 'gene-ruin-entropy', name: 'Entropy', tier: 2, col: 0, needs: ['gene-ruin-tetanus'],
      text: 'Lockdown casts make the foe take +4% damage for 6s',
      maxLevel: 4, cost: linear(10, 3),
      grant: cast('e', (lv) => ({ damageMult: gain(0.04)(lv), ms: 6000 })),
      mastery: {
        name: 'Condemned', cost: 24,
        text: 'The foe starts every fight with 5% less max HP — the inspector has already been',
        grant: effect({ enemyMaxHpMult: 0.95 }),
      },
    }),
    /** Neglect: lock a thing away long enough and everything else gives way on its own. */
    gene({
      id: 'gene-ruin-neglect', name: 'Neglect', tier: 2, col: 1, needs: ['gene-ruin-crumbling-ground'],
      text: 'Lockdown casts shave 500ms off every other cooldown',
      maxLevel: 4, cost: linear(10, 3),
      grant: cast('e', (lv) => ({ refundOthers: flat(500)(lv) })),
      mastery: {
        name: 'Time Takes Everything', cost: 24,
        text: 'Every 10s a little more falls down: every cooldown skips 1s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 10, action: 'cooldownRefund', amount: 1000 }),
      },
    }),
    /** Rubble Heap: hit a pile of broken stone and the stone hits back. */
    gene({
      id: 'gene-ruin-rubble-heap', name: 'Rubble Heap', tier: 2, col: 2, needs: ['gene-ruin-scrap-armour'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(10, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Fallen Masonry', cost: 24,
        text: 'When hit, a 15% chance a slab drops in the way — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Inevitable: the rot is ready to deepen again sooner. */
    gene({
      id: 'gene-ruin-inevitable', name: 'Inevitable', tier: 3, col: 0, needs: ['gene-ruin-entropy'],
      text: '−5% Unstoppable Decay (ultimate) cooldown',
      maxLevel: 3, cost: linear(15, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Nothing Lasts', cost: 30,
        text: 'Decay casts crack the floor round you: 24 to everything within 140px — even at ten stacks',
        grant: onCast('q', { burst: { damage: 24, radius: 140 } }),
      },
    }),
    /** Salvage: crosses Rust and Collapse — you pick something useful off every spike you throw. */
    gene({
      id: 'gene-ruin-salvage', name: 'Salvage', tier: 3, col: 1,
      needs: ['gene-ruin-neglect', 'gene-ruin-entropy'],
      text: 'Rusty Skewer casts heal 2 HP',
      maxLevel: 4, cost: linear(12, 4),
      grant: cast('r', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Still Standing', cost: 32,
        text: 'Once per fight, a lethal hit is cancelled — the ruin is still standing, at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Dilapidated: the rot you spread settles on you as a crust they cannot get through. */
    gene({
      id: 'gene-ruin-dilapidated', name: 'Dilapidated', tier: 3, col: 2, needs: ['gene-ruin-rubble-heap'],
      text: 'Unstoppable Decay casts give you 8 shield HP',
      maxLevel: 3, cost: linear(15, 4),
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Nothing Left to Break', cost: 30,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more flake of rust off the blade, forever. */
    enlightened({
      id: 'gene-ruin-enl-rust', name: 'Enlightened Rust', col: 0, needs: ['gene-ruin-inevitable'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: a crack that widens a hair every year. */
    enlightened({
      id: 'gene-ruin-enl-crack', name: 'Enlightened Crack', col: 1, needs: ['gene-ruin-salvage'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more brick that refuses to fall. */
    enlightened({
      id: 'gene-ruin-enl-brick', name: 'Enlightened Brick', col: 2, needs: ['gene-ruin-dilapidated'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
