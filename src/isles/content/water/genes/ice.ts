import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Rimeheart — Ice's gene tree.
 *
 * Ice is a stacker and a skater, so the tree splits the same way: **Frostbite** (Ice Spike laying
 * frost, Frost Blast cashing it in, a longer Frozen Solid at the top), **Glide** (Skate — speed off
 * every dash, cooldowns shaved on the turn, a body that thaws back to health) and **Floe** (the
 * stance Block Up teaches: pack ice, a chill on anyone who hits you, an iceberg's bulk).
 *
 * Block Up is a 200ms toggle, so nothing keys off R — the Floe branch is stats and triggers that
 * reward the stance without paying for flicking it.
 */
export const ICE_GENE_TREE: GeneTree = {
  element: 'ice',
  name: 'Rimeheart',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: each spike leaves a rime on the wound. The window lasts as long as the
     *  spike's own cooldown, so it never stacks on itself. */
    gene({
      id: 'gene-ice-hoarfrost-tips', name: 'Hoarfrost Tips', tier: 0, col: 0,
      text: 'Ice Spike casts make the foe take +3% damage for 0.6s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.03)(lv), ms: 600 })),
      mastery: {
        name: 'Rime Splinters', cost: 10,
        text: '+5% crit chance — a frosted spike shatters on the way in',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Identity root: a Skate that keeps its edge after the dash ends. */
    gene({
      id: 'gene-ice-edgework', name: 'Edgework', tier: 0, col: 1,
      text: 'Skate casts give +6% move speed for 1.5s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('f', (lv) => ({ speedMult: gain(0.06)(lv), ms: 1500 })),
      mastery: {
        name: 'Black Ice', cost: 10,
        text: 'Skate casts also spray shards at everything within 80px of you for 10',
        grant: onCast('f', { burst: { damage: 10, radius: 80 } }),
      },
    }),
    /** Defence root: the pack ice that builds up around a body that will not move. */
    gene({
      id: 'gene-ice-pack-ice', name: 'Pack Ice', tier: 0, col: 2,
      text: '+12 max HP',
      maxLevel: 4, cost: linear(4, 2),
      grant: stat((lv) => ({ maxHp: flat(12)(lv) })),
      mastery: {
        name: 'Glacier Shell', cost: 10,
        text: 'Start every fight with 1 shield charge that blocks a whole hit',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Shatterpoint: a foe who has just had its frost blasted off is still cracked. */
    gene({
      id: 'gene-ice-shatterpoint', name: 'Shatterpoint', tier: 1, col: 0, needs: ['gene-ice-hoarfrost-tips'],
      text: 'Frost Blast casts make the foe take +4% damage for 2.5s',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('e', (lv) => ({ damageMult: gain(0.04)(lv), ms: 2500 })),
      mastery: {
        name: 'Cold Snap', cost: 14,
        text: 'Frost Blast casts have a 15% chance to come straight back off cooldown',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Figure Eight: every turn on the ice winds the rest of the kit tighter. */
    gene({
      id: 'gene-ice-figure-eight', name: 'Figure Eight', tier: 1, col: 1, needs: ['gene-ice-edgework'],
      text: 'Skate casts shave 150ms off every other cooldown',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('f', (lv) => ({ refundOthers: flat(150)(lv) })),
      mastery: {
        name: 'Long Glide', cost: 14,
        text: 'Skate casts have a 15% chance to come straight back off cooldown',
        grant: onCast('f', { refundSelfChance: 0.15 }),
      },
    }),
    /** Hunker: what Block Up teaches the body, kept even with the guard down. */
    gene({
      id: 'gene-ice-hunker', name: 'Hunker', tier: 1, col: 2, needs: ['gene-ice-pack-ice'],
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(5, 3),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Chill Touch', cost: 14,
        text: 'When hit, a 20% chance to chill the attacker: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Deep Freeze: frost that goes in deeper and stays longer. */
    gene({
      id: 'gene-ice-deep-freeze', name: 'Deep Freeze', tier: 2, col: 0, needs: ['gene-ice-shatterpoint'],
      text: '+4% status damage and +4% status duration',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ statusDmgMult: gain(0.04)(lv), statusDurMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Brittle', cost: 18,
        text: 'Hits have a 10% chance to give you +15% damage for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 5, action: 'tempDamage', mult: 1.15, durationMs: 2000 }),
      },
    }),
    /** Wind Chill: the cold that rides along with you. */
    gene({
      id: 'gene-ice-wind-chill', name: 'Wind Chill', tier: 2, col: 1, needs: ['gene-ice-figure-eight'],
      text: '+3% move speed',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ speedMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Rink Master', cost: 18,
        text: '+5% dodge chance — nobody lands a clean hit on a skater',
        grant: effect({ dodgeChance: 0.05 }),
      },
    }),
    /** Frozen Moat: the ground around you freezes underfoot — for them. */
    gene({
      id: 'gene-ice-frozen-moat', name: 'Frozen Moat', tier: 2, col: 2, needs: ['gene-ice-hunker'],
      text: 'The foe moves 2% slower',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ enemySpeedMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Icewall', cost: 18,
        text: 'Start every fight behind a 25 HP wall of ice',
        grant: effect({ shieldHp: 25 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Long Winter: the cone comes round again sooner. */
    gene({
      id: 'gene-ice-long-winter', name: 'Long Winter', tier: 3, col: 0, needs: ['gene-ice-deep-freeze'],
      text: '−5% Frozen Solid (ultimate) cooldown',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Absolute Zero', cost: 24,
        text: 'Frozen Solid casts make the foe take +20% damage for the 3s they are frozen',
        grant: onCast('q', { damageMult: 1.2, ms: 3000 }),
      },
    }),
    /** Sublimation: crosses Glide and Frostbite — the dash turns your hurt straight to vapour. */
    gene({
      id: 'gene-ice-sublimation', name: 'Sublimation', tier: 3, col: 1,
      needs: ['gene-ice-wind-chill', 'gene-ice-deep-freeze'],
      text: 'Skate casts heal 2 HP',
      maxLevel: 4, cost: linear(9, 4),
      grant: cast('f', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Cold Heart', cost: 26,
        text: '4% of the damage you deal comes back to you as health',
        grant: effect({ lifestealFrac: 0.04 }),
      },
    }),
    /** Glacial Patience: ice does not hurry, and it does not melt. */
    gene({
      id: 'gene-ice-glacial-patience', name: 'Glacial Patience', tier: 3, col: 2, needs: ['gene-ice-frozen-moat'],
      text: 'The first time you fall below 35% HP, heal 10',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.35, action: 'healBurst', amount: flat(10)(lv) }] })),
      mastery: {
        name: 'Iceberg', cost: 24,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: frost that bites a little deeper every winter. */
    enlightened({
      id: 'gene-ice-enl-frost', name: 'Enlightened Frost', col: 0, needs: ['gene-ice-long-winter'],
      text: '+0.5% status damage',
      grant: stat((lv) => ({ statusDmgMult: gain(0.005)(lv) })),
    }),
    /** Enlightened: the rink that gets a little faster every lap. */
    enlightened({
      id: 'gene-ice-enl-rink', name: 'Enlightened Rink', col: 1, needs: ['gene-ice-sublimation'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: the glacier that never stops growing. */
    enlightened({
      id: 'gene-ice-enl-glacier', name: 'Enlightened Glacier', col: 2, needs: ['gene-ice-glacial-patience'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
