import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Midas Vein — Gold's gene tree (element id `fortune`).
 *
 * Gold is an alchemist with a factory: a tycoon along the top of the screen fills his purse all
 * match. Fray throws a clump of grass gilded in the air (every 520ms, held), Advance spends ten
 * gold on one of three stat cards kept all match, Billiards racks five golden pool balls and
 * brings the cane out as a cue, Heart of Gold lunges with the cane and plants a heart that bursts
 * if they move too much, and Rebirth trades a finished tycoon for a better alchemist (three times
 * at most). Three lines: **Gilt** (the blades and the cane — the hands that hurt), **Purse**
 * (Advance and the table — the gold going out and the balls coming back) and **Bullion** (a hide
 * gone heavy and yellow, and the rebirth).
 *
 * Advance is refused before the press when the purse is short (and while cards are still up),
 * so its rules only pay out on ten gold actually spent. Fray's window is 0.52s — its cooldown —
 * so it never stacks. Rebirth is refused before the press unless the tycoon is complete, so its
 * rules pay out three times a fight at most — they are sized for that. Nothing here can mint
 * gold: the purse is the kit's own arithmetic.
 */
export const GOLD_GENE_TREE: GeneTree = {
  element: 'fortune',
  name: 'Midas Vein',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Gilt root: grass turned to gold on the wing keeps a gold edge when it lands. */
    gene({
      id: 'gene-gold-gilded-blades', name: 'Gilded Blades', tier: 0, col: 0,
      text: 'Fray casts make the foe take +2% damage for 0.52s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 520 })),
      mastery: {
        name: "Alchemist's Grip", cost: PRICE.rootMastery,
        text: '3% of the damage you deal comes back to you as health — everything has its price',
        grant: effect({ lifestealFrac: 0.03 }),
      },
    }),
    /** Purse root: ten gold spent is ten gold that hurries everything else along. */
    gene({
      id: 'gene-gold-compound-interest', name: 'Compound Interest', tier: 0, col: 1,
      text: 'Advance casts shave 300ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ refundOthers: flat(300)(lv) })),
      mastery: {
        name: 'Dividend', cost: PRICE.rootMastery,
        text: 'Advance casts heal you 10 — every card bought pays a little back',
        grant: onCast('e', { heal: 10 }),
      },
    }),
    /** Bullion root: a skin of beaten leaf, thin as breath and still metal. */
    gene({
      id: 'gene-gold-leaf-skin', name: 'Gold-Leaf Skin', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Bank Holiday', cost: PRICE.rootMastery,
        text: 'Untouchable for the first 1.5s of every fight — the counting-house is shut',
        grant: effect({ invincibleMs: 1500 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Weighted Cane: a heart of gold only bursts if they run — so run them. */
    gene({
      id: 'gene-gold-weighted-cane', name: 'Weighted Cane', tier: 1, col: 0, needs: ['gene-gold-gilded-blades'],
      text: 'Heart of Gold casts make you 4% faster for the 6s the heart beats — chase them into it',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ speedMult: gain(0.04)(lv), ms: 6000 })),
      mastery: {
        name: 'Cardiac Arrest', cost: PRICE.t1Mastery,
        text: 'Heart of Gold casts ring the cane like a bell: 16 to everything within 90px',
        grant: onCast('f', { burst: { damage: 16, radius: 90 } }),
      },
    }),
    /** Chalk Dust: gold chalk off the cue gets into everything, wounds included. */
    gene({
      id: 'gene-gold-golden-dust', name: 'Chalk Dust', tier: 1, col: 1, needs: ['gene-gold-compound-interest'],
      text: 'Billiards casts make the foe take +3% damage for 6s — long enough to take the shot',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ damageMult: gain(0.03)(lv), ms: 6000 })),
      mastery: {
        name: 'Table Stakes', cost: PRICE.t1Mastery,
        text: 'Billiards casts heal you 8 — the house always takes a little off the top',
        grant: onCast('r', { heal: 8 }),
      },
    }),
    /** Tarnish: gold dust in the joints, and they never quite shake it out. */
    gene({
      id: 'gene-gold-tarnish', name: 'Tarnish', tier: 1, col: 2, needs: ['gene-gold-leaf-skin'],
      text: 'The foe moves 2% slower',
      maxLevel: 4, cost: PRICE.t1,
      grant: stat((lv) => ({ enemySpeedMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Bolt for the Vault', cost: PRICE.t1Mastery,
        text: 'When hit, a 20% chance to run for it: 25% faster for 2s (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 6, action: 'tempHaste', mult: 1.25, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Twenty-Four Karat: no alloy, no give, no mercy. */
    gene({
      id: 'gene-gold-karat', name: 'Twenty-Four Karat', tier: 2, col: 0, needs: ['gene-gold-weighted-cane'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Heavy Coin', cost: PRICE.t2Mastery,
        text: 'Critical hits land at 2.3× — a gold bar weighs what it weighs',
        grant: effect({ critMult: 2.3 }),
      },
    }),
    /** Liquid Assets: money moves, and so does everything it buys. */
    gene({
      id: 'gene-gold-liquid-assets', name: 'Liquid Assets', tier: 2, col: 1, needs: ['gene-gold-golden-dust'],
      text: '−3% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.03)(lv) })),
      mastery: {
        name: 'Reinvest', cost: PRICE.t2Mastery,
        text: 'Billiards casts shave 600ms off every other cooldown — every rack is working capital',
        grant: onCast('r', { refundOthers: 600 }),
      },
    }),
    /** Solid Gold: heavier all through, and harder to knock down. */
    gene({
      id: 'gene-gold-solid-gold', name: 'Solid Gold', tier: 2, col: 2, needs: ['gene-gold-tarnish'],
      text: '+6 max HP',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ maxHp: flat(6)(lv) })),
      mastery: {
        name: 'Emergency Fund', cost: PRICE.t2Mastery,
        text: 'The first time you fall below 35% HP, break the jar under the floor: heal 30',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.35, oncePerMatch: true, action: 'healBurst', amount: 30 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Midas Touch: whatever comes back from a rebirth comes back plated. */
    gene({
      id: 'gene-gold-midas-touch', name: 'Midas Touch', tier: 3, col: 0, needs: ['gene-gold-karat'],
      text: 'Rebirth casts give you 12 shield HP',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(12)(lv) })),
      mastery: {
        name: 'Gilded Flare', cost: PRICE.t3Mastery,
        text: 'Rebirth casts flash the floor gold round you: 22 to everything within 130px',
        grant: onCast('q', { burst: { damage: 22, radius: 130 } }),
      },
    }),
    /** Interest Accrues: crosses Gilt and Purse — every card bought is plate on the chest. */
    gene({
      id: 'gene-gold-interest-accrues', name: 'Interest Accrues', tier: 3, col: 1,
      needs: ['gene-gold-liquid-assets', 'gene-gold-karat'],
      text: 'Advance casts give you 4 shield HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('e', (lv) => ({ shield: flat(4)(lv) })),
      mastery: {
        name: 'Golden Parachute', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and you are bought back at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Gold Standard: reborn, and for a while he walks like it. */
    gene({
      id: 'gene-gold-gold-standard', name: 'Gold Standard', tier: 3, col: 2, needs: ['gene-gold-solid-gold'],
      text: 'Rebirth casts make you 4% faster for 20s',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ speedMult: gain(0.04)(lv), ms: 20000 })),
      mastery: {
        name: 'Bullion Hide', cost: PRICE.t3Mastery,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more karat than there are karats. */
    enlightened({
      id: 'gene-gold-enl-karat', name: 'Enlightened Karat', col: 0, needs: ['gene-gold-midas-touch'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the interest compounds, and so does the hurry. */
    enlightened({
      id: 'gene-gold-enl-interest', name: 'Enlightened Interest', col: 1, needs: ['gene-gold-interest-accrues'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: a little more of the alchemist turns to metal, and mends like it. */
    enlightened({
      id: 'gene-gold-enl-reserve', name: 'Enlightened Reserve', col: 2, needs: ['gene-gold-gold-standard'],
      text: '+0.05 HP regenerated every second',
      grant: stat((lv) => ({ regenPerSecond: flat(0.05)(lv) })),
    }),
  ],
};
