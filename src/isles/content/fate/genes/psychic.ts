import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Third Eye — Psychic's gene tree.
 *
 * Psychic is a monk who sees the foe's presses two seconds early and plays the board: En Passant
 * throws a pawn that captures on its diagonals (every 650ms), Bisharp, Knightly Mandate and Rook
 * Battery stand a piece on the cursor for 8s with an aura (less damage taken, speed, more damage)
 * and can be moved the way the piece moves, and Queen crowns him for 15s — every aura three
 * times over, moving only in queen lines. Three lines: **Attack** (pawns and the rook — the
 * pieces that take), **Development** (bishop and knight — the board built up) and **Crown** (the
 * calm mind and the queen).
 *
 * Only the summons are casts: moving a piece, castling and the queen's own moves are free and
 * never fire a rule. While crowned there is no pawn to throw, so Click rules sit out the 15s.
 */
export const PSYCHIC_GENE_TREE: GeneTree = {
  element: 'psychic',
  name: 'Third Eye',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Attack root: a wall of pawns, each one a threat they have to answer. */
    gene({
      id: 'gene-psychic-pawn-storm', name: 'Pawn Storm', tier: 0, col: 0,
      text: 'En Passant casts make the foe take +2% damage for 0.65s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 650 })),
      mastery: {
        name: 'Tempo', cost: PRICE.rootMastery,
        text: 'Hits have a 10% chance to gain a tempo: 20% faster for 2s (at most every 6s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 6, action: 'tempHaste', mult: 1.2, durationMs: 2000 }),
      },
    }),
    /** Development root: a bishop out early frees the whole back rank. */
    gene({
      id: 'gene-psychic-opening-book', name: 'Opening Book', tier: 0, col: 1,
      text: 'Bisharp casts shave 300ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ refundOthers: flat(300)(lv) })),
      mastery: {
        name: 'Book Move', cost: PRICE.rootMastery,
        text: 'Bisharp casts have a 15% chance to come straight back — you had seen this line before',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Crown root: a still mind is a hard target. */
    gene({
      id: 'gene-psychic-calm-mind', name: 'Calm Mind', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Foresight', cost: PRICE.rootMastery,
        text: '+4% dodge chance — the eye saw it coming two seconds ago',
        grant: effect({ dodgeChance: 0.04 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Rook Lift: a rook brought up the board is a threat on every file. */
    gene({
      id: 'gene-psychic-rook-lift', name: 'Rook Lift', tier: 1, col: 0, needs: ['gene-psychic-pawn-storm'],
      text: 'Rook Battery casts make the foe take +3% damage for the rook\'s 8s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ damageMult: gain(0.03)(lv), ms: 8000 })),
      mastery: {
        name: 'Back Rank', cost: PRICE.t1Mastery,
        text: 'Rook Battery casts thud the board round you: 14 to everything within 100px',
        grant: onCast('f', { burst: { damage: 14, radius: 100 } }),
      },
    }),
    /** Knight's Tour: every square the knight can reach is one you are already walking to. */
    gene({
      id: 'gene-psychic-knights-tour', name: "Knight's Tour", tier: 1, col: 1, needs: ['gene-psychic-opening-book'],
      text: 'Knightly Mandate casts make you 4% faster for 3s — reach its aura sooner',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ speedMult: gain(0.04)(lv), ms: 3000 })),
      mastery: {
        name: 'Fork', cost: PRICE.t1Mastery,
        text: 'Knightly Mandate casts heal you 8 — two threats at once, and one of them is to their nerve',
        grant: onCast('r', { heal: 8 }),
      },
    }),
    /** Premonition: the eye shows the blow, and the body leans out of its heaviest part. */
    gene({
      id: 'gene-psychic-premonition', name: 'Premonition', tier: 1, col: 2, needs: ['gene-psychic-calm-mind'],
      text: 'The foe deals 2% less damage',
      maxLevel: 4, cost: PRICE.t1,
      grant: stat((lv) => ({ enemyDamageMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Zugzwang', cost: PRICE.t1Mastery,
        text: 'When hit, a 20% chance every move they have is a bad one: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Mind over Matter: the piece hits as hard as you believe it does. */
    gene({
      id: 'gene-psychic-mind-over-matter', name: 'Mind over Matter', tier: 2, col: 0, needs: ['gene-psychic-rook-lift'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Discovered Attack', cost: PRICE.t2Mastery,
        text: 'Every 8s a line you opened long ago bites: 12 to the foe over 4s, wherever they are',
        grant: behavior({ trigger: 'everyNSec', periodSec: 8, action: 'sear', amount: 12, durationMs: 4000 }),
      },
    }),
    /** Clock Pressure: their flag is falling; yours never does. */
    gene({
      id: 'gene-psychic-clock-pressure', name: 'Clock Pressure', tier: 2, col: 1, needs: ['gene-psychic-knights-tour'],
      text: '−3% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.03)(lv) })),
      mastery: {
        name: 'Fianchetto', cost: PRICE.t2Mastery,
        text: 'Bisharp casts give you 10 shield HP — the bishop tucked in front of the king',
        grant: onCast('e', { shield: 10 }),
      },
    }),
    /** Meditation: between moves, the monk breathes. */
    gene({
      id: 'gene-psychic-meditation', name: 'Meditation', tier: 2, col: 2, needs: ['gene-psychic-premonition'],
      text: '+0.3 HP regenerated every second',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ regenPerSecond: flat(0.3)(lv) })),
      mastery: {
        name: 'Inner Sanctum', cost: PRICE.t2Mastery,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Coronation: the pawn that walked the whole board is promoted sooner each time. */
    gene({
      id: 'gene-psychic-coronation', name: 'Coronation', tier: 3, col: 0, needs: ['gene-psychic-mind-over-matter'],
      text: '−5% Queen (ultimate) cost',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Royal Fork', cost: PRICE.t3Mastery,
        text: 'Queen casts break over the board as the crown lands: 22 to everything within 130px',
        grant: onCast('q', { burst: { damage: 22, radius: 130 } }),
      },
    }),
    /** Endgame: crosses Attack and Development — few pieces left, and each one heals the position. */
    gene({
      id: 'gene-psychic-endgame', name: 'Endgame', tier: 3, col: 1,
      needs: ['gene-psychic-clock-pressure', 'gene-psychic-mind-over-matter'],
      text: 'Bisharp casts heal you 4 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('e', (lv) => ({ heal: flat(4)(lv) })),
      mastery: {
        name: 'Perpetual Check', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and the game goes on at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Ivory Crown: the queen is the strongest piece, and the one most worth guarding. */
    gene({
      id: 'gene-psychic-ivory-crown', name: 'Ivory Crown', tier: 3, col: 2, needs: ['gene-psychic-meditation'],
      text: 'Queen casts give you 10 shield HP',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(10)(lv) })),
      mastery: {
        name: 'Third Eye Open', cost: PRICE.t3Mastery,
        text: '+5% crit chance — you see exactly where it hurts',
        grant: effect({ critChance: 0.05 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more move seen through to the end. */
    enlightened({
      id: 'gene-psychic-enl-eye', name: 'Enlightened Eye', col: 0, needs: ['gene-psychic-coronation'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: a second shaved off the clock, game after game. */
    enlightened({
      id: 'gene-psychic-enl-clock', name: 'Enlightened Clock', col: 1, needs: ['gene-psychic-endgame'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: a stiller mind, and a slower foe with it. */
    enlightened({
      id: 'gene-psychic-enl-calm', name: 'Enlightened Calm', col: 2, needs: ['gene-psychic-ivory-crown'],
      text: 'The foe deals 0.2% less damage (compounding)',
      grant: stat((lv) => ({ enemyDamageMult: fade(0.002)(lv) })),
    }),
  ],
};
