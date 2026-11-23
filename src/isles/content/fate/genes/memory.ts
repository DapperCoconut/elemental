import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Palimpsest — Memory's gene tree.
 *
 * Memory is a faceless figure in a top hat whose passive, Guilt, makes the foe take 1% more for
 * every hit they have ever taken. Forget throws obsidian shards that latch on and fill their
 * screen with static (every 500ms), Memory Snatch spins the cane for 2s (slowed) and steals back
 * the time their ready abilities sat idle, Practice sweeps a line round the arena and strikes
 * harder every time it is used, Repression records them for 6s and sends a static copy to do it
 * again, and Trauma opens a 5s window whose damage they relive every second for the rest of the
 * match. Three lines: **Static** (the shards and the snatch), **Rehearsal** (Practice and
 * Repression — the things done again) and **Guilt** (the blank face and the wound that stays).
 *
 * Trauma's wound is measured from what they take in its 5s window, so the Q damage window and
 * burst both feed it — that is the point of them. Forget's window is its 0.5s cooldown.
 */
export const MEMORY_GENE_TREE: GeneTree = {
  element: 'memory',
  name: 'Palimpsest',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Static root: a shard of black glass, and the cut it leaves remembers being made. */
    gene({
      id: 'gene-memory-obsidian-edge', name: 'Obsidian Edge', tier: 0, col: 0,
      text: 'Forget casts make the foe take +2% damage for 0.5s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 500 })),
      mastery: {
        name: 'Splinter', cost: PRICE.rootMastery,
        text: 'Hits have a 10% chance to leave a splinter of obsidian: 12 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 12, durationMs: 3000 }),
      },
    }),
    /** Rehearsal root: the line you have practised leaves the rest of you free. */
    gene({
      id: 'gene-memory-rote', name: 'Rote', tier: 0, col: 1,
      text: 'Practice casts shave 400ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('r', (lv) => ({ refundOthers: flat(400)(lv) })),
      mastery: {
        name: 'Encore', cost: PRICE.rootMastery,
        text: 'Practice casts have a 12% chance to come straight back — and every strike still counts',
        grant: onCast('r', { refundSelfChance: 0.12 }),
      },
    }),
    /** Guilt root: no face to strike, and nothing behind it to bruise. */
    gene({
      id: 'gene-memory-faceless', name: 'Faceless', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Blank Stare', cost: PRICE.rootMastery,
        text: 'The foe deals 5% less damage — it is hard to hit what you cannot remember the shape of',
        grant: effect({ enemyDamageMult: 0.95 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Cane Spin: the wind-up slows you — this buys the step back. */
    gene({
      id: 'gene-memory-cane-spin', name: 'Cane Spin', tier: 1, col: 0, needs: ['gene-memory-obsidian-edge'],
      text: 'Memory Snatch casts make you 6% faster for the 2s wind-up',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('e', (lv) => ({ speedMult: gain(0.06)(lv), ms: 2000 })),
      mastery: {
        name: 'Snatched Breath', cost: PRICE.t1Mastery,
        text: 'Memory Snatch casts heal you 10 — what they forget, you keep',
        grant: onCast('e', { heal: 10 }),
      },
    }),
    /** Recital: six seconds on the record, and every one of them counts against them. */
    gene({
      id: 'gene-memory-recital', name: 'Recital', tier: 1, col: 1, needs: ['gene-memory-rote'],
      text: 'Repression casts make the foe take +3% damage for the 6s recording',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ damageMult: gain(0.03)(lv), ms: 6000 })),
      mastery: {
        name: 'Stage Fright', cost: PRICE.t1Mastery,
        text: 'Repression casts give you 12 shield HP while the grey aura is listening',
        grant: onCast('f', { shield: 12 }),
      },
    }),
    /** Guilty Conscience: they hit you, and it stays with them. */
    gene({
      id: 'gene-memory-guilty-conscience', name: 'Guilty Conscience', tier: 1, col: 2, needs: ['gene-memory-faceless'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: PRICE.t1,
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Fugue State', cost: PRICE.t1Mastery,
        text: 'The first time you fall below 40% HP, you wander off without knowing why: 30% faster for 4s',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.4, oncePerMatch: true, action: 'tempHaste', mult: 1.3, durationMs: 4000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** White Noise: static under the skin, where it does the most harm. */
    gene({
      id: 'gene-memory-white-noise', name: 'White Noise', tier: 2, col: 0, needs: ['gene-memory-cane-spin'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Feedback', cost: PRICE.t2Mastery,
        text: 'Every 10s the static in your face howls: 14 to everything within 110px',
        grant: behavior({ trigger: 'everyNSec', periodSec: 10, action: 'burstAoe', amount: 14, radius: 110 }),
      },
    }),
    /** Habit: done so often it no longer takes any time at all. */
    gene({
      id: 'gene-memory-habit', name: 'Habit', tier: 2, col: 1, needs: ['gene-memory-recital'],
      text: '−3% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.03)(lv) })),
      mastery: {
        name: 'Muscle Memory', cost: PRICE.t2Mastery,
        text: 'Repression casts shave 800ms off every other cooldown — the body knows the steps already',
        grant: onCast('f', { refundOthers: 800 }),
      },
    }),
    /** Scar Tissue: every old wound teaches the body to take back what it lost. */
    gene({
      id: 'gene-memory-scar-tissue', name: 'Scar Tissue', tier: 2, col: 2, needs: ['gene-memory-guilty-conscience'],
      text: '1% of the damage you deal comes back to you as health',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ lifestealFrac: flat(0.01)(lv) })),
      mastery: {
        name: 'Numb', cost: PRICE.t2Mastery,
        text: '−5% damage taken — you have forgotten how this is supposed to feel',
        grant: effect({ damageTakenMult: 0.95 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Relived: the wound is cut from the window — so make the window bleed. */
    gene({
      id: 'gene-memory-relived', name: 'Relived', tier: 3, col: 0, needs: ['gene-memory-white-noise'],
      text: 'Trauma casts make the foe take +4% damage for its 5s window — the wound they relive grows with it',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ damageMult: gain(0.04)(lv), ms: 5000 })),
      mastery: {
        name: 'Flashback', cost: PRICE.t3Mastery,
        text: 'Trauma casts open with a red flash: 20 to everything within 130px, counted in the wound',
        grant: onCast('q', { burst: { damage: 20, radius: 130 } }),
      },
    }),
    /** Keepsake: crosses Static and Rehearsal — each strike practised is a little held back. */
    gene({
      id: 'gene-memory-keepsake', name: 'Keepsake', tier: 3, col: 1,
      needs: ['gene-memory-habit', 'gene-memory-white-noise'],
      text: 'Practice casts heal you 4 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('r', (lv) => ({ heal: flat(4)(lv) })),
      mastery: {
        name: 'Unforgotten', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and you are remembered back at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Locked Away: what was put down once is easier to put down again. */
    gene({
      id: 'gene-memory-locked-away', name: 'Locked Away', tier: 3, col: 2, needs: ['gene-memory-scar-tissue'],
      text: '−5% Trauma (ultimate) cost',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Wander Off', cost: PRICE.t3Mastery,
        text: '+8% movement speed',
        grant: effect({ speedMult: 1.08 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: they come in carrying a little more of what you did last time. */
    enlightened({
      id: 'gene-memory-enl-guilt', name: 'Enlightened Guilt', col: 0, needs: ['gene-memory-relived'],
      text: 'The foe starts 0.2% thinner (compounding)',
      grant: stat((lv) => ({ enemyMaxHpMult: fade(0.002)(lv) })),
    }),
    /** Enlightened: one more step that no longer needs thinking about. */
    enlightened({
      id: 'gene-memory-enl-habit', name: 'Enlightened Habit', col: 1, needs: ['gene-memory-keepsake'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more layer of static over the place a face should be. */
    enlightened({
      id: 'gene-memory-enl-static', name: 'Enlightened Static', col: 2, needs: ['gene-memory-locked-away'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
