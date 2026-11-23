import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Mirage — Illusion's gene tree.
 *
 * Illusion wins by making the foe's aim run out: Crack Shot (miss and the wall cracks at them
 * anyway), the Veil's pane that bends their shots and fans yours, Relocate to a random corner,
 * Guise's tiny invisible you behind a full-size clone, and the twenty-second Illusion Dance. The
 * tree has three acts: **Glass** (Crack Shot and the Veil — the crack that always comes back),
 * **Sleight** (Relocate and Guise — being somewhere else, sooner) and **Gauze** (what is left to
 * hit when they finally find you).
 *
 * Crack Shot's cooldown is 0.9s, so its window is 0.9s. Guise's Re-Trick swap (F+) is a free
 * recast and reports no cast, so only the Guise itself pays out.
 */
export const ILLUSION_GENE_TREE: GeneTree = {
  element: 'illusion',
  name: 'Mirage',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: the hairline crack every shot leaves in their nerve. */
    gene({
      id: 'gene-illusion-hairline', name: 'Hairline Crack', tier: 0, col: 0,
      text: 'Crack Shot casts make the foe take +2% damage for 0.9s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 900 })),
      mastery: {
        name: 'Spiderweb Glass', cost: PRICE.rootMastery,
        text: '+5% crit chance — the crack finds the weak pane',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Identity root: every corner you vanish to, the next trick is already palmed. */
    gene({
      id: 'gene-illusion-sleight', name: 'Sleight of Hand', tier: 0, col: 1,
      text: 'Relocate casts shave 250ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('r', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'Nowhere to Be', cost: PRICE.rootMastery,
        text: 'Relocate casts have a 15% chance to come straight back — were you ever in that corner?',
        grant: onCast('r', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: they swing at where you seemed to be. */
    gene({
      id: 'gene-illusion-smoke-mirrors', name: 'Smoke and Mirrors', tier: 0, col: 2,
      text: '+2% dodge chance',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ dodgeChance: flat(0.02)(lv) })),
      mastery: {
        name: 'Stage Fog', cost: PRICE.rootMastery,
        text: 'Start every fight inside a 22 HP bank of stage fog',
        grant: effect({ shieldHp: 22 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Warped Pane: while the Veil hangs, nothing they see is quite where it is. */
    gene({
      id: 'gene-illusion-warped-pane', name: 'Warped Pane', tier: 1, col: 0, needs: ['gene-illusion-hairline'],
      text: 'Illusion Veil casts make the foe take +3% damage for the 6s the pane hangs',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('e', (lv) => ({ damageMult: gain(0.03)(lv), ms: 6000 })),
      mastery: {
        name: 'Hall of Mirrors', cost: PRICE.t1Mastery,
        text: 'Illusion Veil casts throw off splinters of space: 14 to everything within 100px',
        grant: onCast('e', { burst: { damage: 14, radius: 100 } }),
      },
    }),
    /** Quick Change: you land in the corner already running. */
    gene({
      id: 'gene-illusion-quick-change', name: 'Quick Change', tier: 1, col: 1, needs: ['gene-illusion-sleight'],
      text: 'Relocate casts give +6% move speed for 2s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ speedMult: gain(0.06)(lv), ms: 2000 })),
      mastery: {
        name: 'Vanishing Act', cost: PRICE.t1Mastery,
        text: 'Relocate casts heal 5 HP — the wound stayed behind in the old corner',
        grant: onCast('r', { heal: 5 }),
      },
    }),
    /** Understudy: while the clone takes the bows, you wear a little armour. */
    gene({
      id: 'gene-illusion-understudy', name: 'Understudy', tier: 1, col: 2, needs: ['gene-illusion-smoke-mirrors'],
      text: 'Guise casts give you 5 shield HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Misdirection', cost: PRICE.t1Mastery,
        text: 'When hit, a 20% chance they lose track of you: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Sharpened Glass: every crack a little deeper. */
    gene({
      id: 'gene-illusion-sharp-glass', name: 'Sharpened Glass', tier: 2, col: 0, needs: ['gene-illusion-warped-pane'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Shatterpoint', cost: PRICE.t2Mastery,
        text: 'Crits shatter for at least ×1.8',
        grant: effect({ critMult: 1.8 }),
      },
    }),
    /** Patter: the magician's talk that keeps every hand moving. */
    gene({
      id: 'gene-illusion-patter', name: 'Patter', tier: 2, col: 1, needs: ['gene-illusion-quick-change'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'The Prestige', cost: PRICE.t2Mastery,
        text: 'Every 9s, for no reason anyone can see: +25% speed for 1.5s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 9, action: 'tempHaste', mult: 1.25, durationMs: 1500 }),
      },
    }),
    /** Thin Air: there is less of you to hit than it looks. */
    gene({
      id: 'gene-illusion-thin-air', name: 'Thin Air', tier: 2, col: 2, needs: ['gene-illusion-understudy'],
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Body Double', cost: PRICE.t2Mastery,
        text: 'When hit, a 12% chance a double steps in for the next one — a shield charge (at most every 7s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.12, cooldownSec: 7, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Long Dance: the curtain rises on the Dance sooner. */
    gene({
      id: 'gene-illusion-long-dance', name: 'Long Dance', tier: 3, col: 0, needs: ['gene-illusion-sharp-glass'],
      text: '−5% Illusion Dance (ultimate) cooldown',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Curtain Call', cost: PRICE.t3Mastery,
        text: 'Illusion Dance casts make the foe take +12% damage for 5s while they hunt the corners',
        grant: onCast('q', { damageMult: 1.12, ms: 5000 }),
      },
    }),
    /** Reflection: crosses Glass and Sleight — the clone takes the hurt with it. */
    gene({
      id: 'gene-illusion-reflection', name: 'Reflection', tier: 3, col: 1,
      needs: ['gene-illusion-patter', 'gene-illusion-sharp-glass'],
      text: 'Guise casts heal 3 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('f', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'It Was the Clone', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled — that was the clone — and you are back at 20% HP',
        grant: effect({ reviveHpFrac: 0.2 }),
      },
    }),
    /** Gauze: the Dance lets shots through you; this is for everything else. */
    gene({
      id: 'gene-illusion-gauze', name: 'Gauze', tier: 3, col: 2, needs: ['gene-illusion-thin-air'],
      text: 'Illusion Dance casts give you 8 shield HP — for the blasts and beams that still land',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Mirror Skin', cost: PRICE.t3Mastery,
        text: 'Reflect 6% of damage taken back at the attacker',
        grant: effect({ reflectFraction: 0.06 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: the weak pane is easier to find every time. */
    enlightened({
      id: 'gene-illusion-enl-glass', name: 'Enlightened Glass', col: 0, needs: ['gene-illusion-long-dance'],
      text: '+0.2% crit chance',
      grant: stat((lv) => ({ critChance: flat(0.002)(lv) })),
    }),
    /** Enlightened: the hand a hair quicker than the eye, forever. */
    enlightened({
      id: 'gene-illusion-enl-hand', name: 'Enlightened Hand', col: 1, needs: ['gene-illusion-reflection'],
      text: '+0.3% move speed',
      grant: stat((lv) => ({ speedMult: gain(0.003)(lv) })),
    }),
    /** Enlightened: one more veil of gauze between you and the blow. */
    enlightened({
      id: 'gene-illusion-enl-veil', name: 'Enlightened Veil', col: 2, needs: ['gene-illusion-gauze'],
      text: '−0.3% damage taken (compounding)',
      grant: stat((lv) => ({ damageTakenMult: fade(0.003)(lv) })),
    }),
  ],
};
