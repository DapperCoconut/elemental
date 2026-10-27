import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Sweet and Salt — Savor's gene tree (element id `gum`).
 *
 * Savor is two rows on one body and Space flips them, and gene rules key off the KEY, so every
 * slot rule names both: Click is Sugar Slam / Salt Slice, E is Sweet Tooth / Salt Shield, R is
 * Sugar Diffusion / Salt Infusion, F is Caring Share / Salt in the Wounds, Q is Sugar Rush! /
 * Salt Crash. The tree has three jars: **Seasoning** (the bombs and shards and the cone that
 * stings for what you just dealt — opening the foe), **Confection** (the candy bag and the
 * sugar loop — speed, cooldowns, the bag refilling) and **Cure** (the salt crust — shield,
 * hard candy, brine).
 *
 * Salt Slice fires every 500ms, so the Click window is 0.5s. Gene grants cannot touch candy
 * stacks or blood sugar, so the candy-flavoured nodes speak in the ordinary stats those candies
 * stand for (Cinnamon → damage, Mint → resistance, Lemon → speed, Fruit Punch → dodge).
 */
export const SAVOR_GENE_TREE: GeneTree = {
  element: 'gum',
  name: 'Sweet and Salt',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: sugar in the eyes, salt in the cut. */
    gene({
      id: 'gene-savor-rock-candy', name: 'Rock Candy', tier: 0, col: 0,
      text: 'Click casts (Sugar Slam, Salt Slice) make the foe take +2% damage for 0.5s',
      maxLevel: 4, cost: linear(5, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 500 })),
      mastery: {
        name: 'Brine Sting', cost: 12,
        text: 'Hits have a 10% chance to rub salt in: 10 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 10, durationMs: 3000 }),
      },
    }),
    /** Identity root: the loop round the foe goes quicker on a sugar high. */
    gene({
      id: 'gene-savor-sugar-high', name: 'Sugar High', tier: 0, col: 1,
      text: 'R casts (Sugar Diffusion, Salt Infusion) give +6% move speed for 3s',
      maxLevel: 4, cost: linear(5, 2),
      grant: cast('r', (lv) => ({ speedMult: gain(0.06)(lv), ms: 3000 })),
      mastery: {
        name: 'Lemon Drop', cost: 12,
        text: '+5% move speed',
        grant: effect({ speedMult: 1.05 }),
      },
    }),
    /** Defence root: a salt crust that forms a little faster. */
    gene({
      id: 'gene-savor-salt-crust', name: 'Salt Crust', tier: 0, col: 2,
      text: 'E casts (Sweet Tooth, Salt Shield) give 3 shield HP',
      maxLevel: 4, cost: linear(5, 2),
      grant: cast('e', (lv) => ({ shield: flat(3)(lv) })),
      mastery: {
        name: 'Hard Candy Shell', cost: 12,
        text: 'Start every fight in a 20 HP hard-candy shell (shield)',
        grant: effect({ shieldHp: 20 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Seasoning: a chocolate ball or a salt cone, and the foe is dressed for eating. */
    gene({
      id: 'gene-savor-seasoning', name: 'Seasoning', tier: 1, col: 0, needs: ['gene-savor-rock-candy'],
      text: 'F casts (Caring Share, Salt in the Wounds) make the foe take +4% damage for 4s',
      maxLevel: 4, cost: linear(6, 3),
      grant: cast('f', (lv) => ({ damageMult: gain(0.04)(lv), ms: 4000 })),
      mastery: {
        name: 'Rub It In', cost: 16,
        text: 'F casts spray a puff of salt off you: 14 to everything within 110px',
        grant: onCast('f', { burst: { damage: 14, radius: 110 } }),
      },
    }),
    /** Candy Bag: tearing the bag open frees up the rest of the kit. */
    gene({
      id: 'gene-savor-candy-bag', name: 'Candy Bag', tier: 1, col: 1, needs: ['gene-savor-sugar-high'],
      text: 'E casts (Sweet Tooth, Salt Shield) shave 200ms off every other cooldown',
      maxLevel: 4, cost: linear(6, 3),
      grant: cast('e', (lv) => ({ refundOthers: flat(200)(lv) })),
      mastery: {
        name: 'Bottomless Bag', cost: 16,
        text: 'E casts have a 15% chance to come straight back off cooldown',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Cured: salted all the way through. */
    gene({
      id: 'gene-savor-cured', name: 'Cured', tier: 1, col: 2, needs: ['gene-savor-salt-crust'],
      text: '−2% damage taken (Mint)',
      maxLevel: 4, cost: linear(6, 3),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Salt Flats', cost: 16,
        text: 'When hit, a 15% chance the crust re-forms — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Caramelised: sugar taken right to the edge of burning. */
    gene({
      id: 'gene-savor-caramelised', name: 'Caramelised', tier: 2, col: 0, needs: ['gene-savor-seasoning'],
      text: '+3% damage dealt (Cinnamon)',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Flaky Salt', cost: 20,
        text: '+5% crit chance — a salt flake finds the soft spot',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Sugar Glaze: the clouds and trails Sugar Slam leaves sting longer. */
    gene({
      id: 'gene-savor-sugar-glaze', name: 'Sugar Glaze', tier: 2, col: 1, needs: ['gene-savor-candy-bag'],
      text: '+4% status damage and +4% status duration',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ statusDmgMult: gain(0.04)(lv), statusDurMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Rainbow Lollipop', cost: 20,
        text: 'Every 10s a lick of the lollipop: +15% damage for 3s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 10, action: 'tempDamage', mult: 1.15, durationMs: 3000 }),
      },
    }),
    /** Sea Salt: the crust bites back at whatever cracks it. */
    gene({
      id: 'gene-savor-sea-salt', name: 'Sea Salt', tier: 2, col: 2, needs: ['gene-savor-cured'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Fruit Punch', cost: 20,
        text: '+5% dodge chance',
        grant: effect({ dodgeChance: 0.05 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Sugar Crash: the rush (or the crash) comes round sooner. */
    gene({
      id: 'gene-savor-sugar-crash', name: 'Sugar Crash', tier: 3, col: 0, needs: ['gene-savor-caramelised'],
      text: '−5% ultimate cooldown (Sugar Rush! or Salt Crash)',
      maxLevel: 3, cost: linear(13, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Spun Sugar', cost: 26,
        text: 'Q casts (Sugar Rush!, Salt Crash) make the foe take +20% damage for 6s',
        grant: onCast('q', { damageMult: 1.2, ms: 6000 }),
      },
    }),
    /** Comfort Food: crosses Seasoning and Confection — sharing the chocolate feeds you too. */
    gene({
      id: 'gene-savor-comfort-food', name: 'Comfort Food', tier: 3, col: 1,
      needs: ['gene-savor-sugar-glaze', 'gene-savor-caramelised'],
      text: 'F casts (Caring Share, Salt in the Wounds) heal 3 HP',
      maxLevel: 4, cost: linear(10, 4),
      grant: cast('f', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Second Helping', cost: 28,
        text: 'Once per fight, a lethal hit is cancelled and you come back for more at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Brined: pickled against the worst of it. */
    gene({
      id: 'gene-savor-brined', name: 'Brined', tier: 3, col: 2, needs: ['gene-savor-sea-salt'],
      text: 'The first time you fall below 30% HP, heal 12',
      maxLevel: 3, cost: linear(13, 4),
      grant: stat((lv) => ({ behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: flat(12)(lv) }] })),
      mastery: {
        name: 'Salt Pillar', cost: 26,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: a pinch more salt, every time. */
    enlightened({
      id: 'gene-savor-enl-pinch', name: 'Enlightened Pinch', col: 0, needs: ['gene-savor-sugar-crash'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the next sugar rush, always a little sooner. */
    enlightened({
      id: 'gene-savor-enl-rush', name: 'Enlightened Rush', col: 1, needs: ['gene-savor-comfort-food'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more layer of crust, forever. */
    enlightened({
      id: 'gene-savor-enl-crust', name: 'Enlightened Crust', col: 2, needs: ['gene-savor-brined'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
