import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Atelier — Paint's gene tree (the id is `chalk`: Paint kept Chalk's id).
 *
 * Paint is a messy painter with a very large brush: Splotch throws whatever you last drew on the
 * Splotch canvas, Volatile Orange paints a fuse under the cursor that goes off end to end,
 * Congealed Paint sets a fine line into a wall, Still Life turns the foe into the picture you
 * paint (hitbox and all), and Masterpiece makes you untouchable for eight seconds while you paint
 * a map of the floor in red, blue and green. The tree has three rooms: **Palette** (orange and
 * the Still Life — paint that hurts), **Brushwork** (walls and fuses — a quicker hand) and
 * **Varnish** (gesso, drop-cloths and fixative — paint that protects).
 *
 * Still Life counts its cast when the easel opens, five seconds before the foe becomes the
 * picture, so its window is 12s (the easel plus the 7s transformation). Masterpiece's shield is
 * granted while you are already untouchable; it is still there when the eight seconds end.
 * Splotch re-arms every 500ms, so no node pays on it.
 */
export const PAINT_GENE_TREE: GeneTree = {
  element: 'chalk',
  name: 'Atelier',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: a foe standing near wet orange is a foe who knows what comes next. */
    gene({
      id: 'gene-chalk-cadmium', name: 'Cadmium Orange', tier: 0, col: 0,
      text: 'Volatile Orange casts make the foe take +4% damage for 4s — the stroke and the blasts',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ damageMult: gain(0.04)(lv), ms: 4000 })),
      mastery: {
        name: 'Linseed Fire', cost: PRICE.rootMastery,
        text: 'Hits have a 12% chance to splash burning oil: 9 over 2.5s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 3, action: 'sear', amount: 9, durationMs: 2500 }),
      },
    }),
    /** Identity root: a loaded brush lays the wall and is already reaching for the next colour. */
    gene({
      id: 'gene-chalk-loaded-brush', name: 'Loaded Brush', tier: 0, col: 1,
      text: 'Congealed Paint casts shave 300ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('r', (lv) => ({ refundOthers: flat(300)(lv) })),
      mastery: {
        name: 'Second Coat', cost: PRICE.rootMastery,
        text: 'Congealed Paint casts have a 15% chance to come straight back — the pot is still open',
        grant: onCast('r', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: a painter primed like a canvas, white and hard and ready for anything. */
    gene({
      id: 'gene-chalk-gesso', name: 'Gesso', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Primed Canvas', cost: PRICE.rootMastery,
        text: 'Start every fight behind a 22 HP coat of primer',
        grant: effect({ shieldHp: 22 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Still Hunt: a foe who has been painted is a foe who has been studied. */
    gene({
      id: 'gene-chalk-still-hunt', name: 'Still Hunt', tier: 1, col: 0, needs: ['gene-chalk-cadmium'],
      text: 'Still Life casts make the foe take +4% damage for 12s — the easel and the whole picture',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ damageMult: gain(0.04)(lv), ms: 12000 })),
      mastery: {
        name: 'Chiaroscuro', cost: PRICE.t1Mastery,
        text: '+5% crit chance — the hardest shadow on the isle, painted in',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Wet on Wet: painting a fuse puts a spring in the painter's step. */
    gene({
      id: 'gene-chalk-wet-on-wet', name: 'Wet on Wet', tier: 1, col: 1, needs: ['gene-chalk-loaded-brush'],
      text: 'Volatile Orange casts give +4% move speed for 2s — while you paint the fuse',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('e', (lv) => ({ speedMult: gain(0.04)(lv), ms: 2000 })),
      mastery: {
        name: 'Impasto', cost: PRICE.t1Mastery,
        text: 'Volatile Orange casts shave 400ms off every other cooldown',
        grant: onCast('e', { refundOthers: 400 }),
      },
    }),
    /** Drop Cloth: the wall you paint hangs a sheet in front of you too. */
    gene({
      id: 'gene-chalk-drop-cloth', name: 'Drop Cloth', tier: 1, col: 2, needs: ['gene-chalk-gesso'],
      text: 'Congealed Paint casts give you 4 shield HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ shield: flat(4)(lv) })),
      mastery: {
        name: 'Sfumato', cost: PRICE.t1Mastery,
        text: 'When hit, a 20% chance to smudge out of reach: +25% speed for 2s (at most every 7s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 7, action: 'tempHaste', mult: 1.25, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Saturation: every colour on the palette a shade louder. */
    gene({
      id: 'gene-chalk-saturation', name: 'Saturation', tier: 2, col: 0, needs: ['gene-chalk-still-hunt'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Glaze', cost: PRICE.t2Mastery,
        text: '+8% status damage and +8% status duration — a coat that will not wash off',
        grant: effect({ statusDmgMult: 1.08, statusDurMult: 1.08 }),
      },
    }),
    /** Quick Sketch: the hand knows the shape before the eye does. */
    gene({
      id: 'gene-chalk-quick-sketch', name: 'Quick Sketch', tier: 2, col: 1, needs: ['gene-chalk-wet-on-wet'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Gallery Hours', cost: PRICE.t2Mastery,
        text: 'Every 10s the gallery bell rings and every cooldown skips 0.7s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 10, action: 'cooldownRefund', amount: 700 }),
      },
    }),
    /** Varnish: a clear coat that keeps the colours under it from cracking. */
    gene({
      id: 'gene-chalk-varnish', name: 'Varnish', tier: 2, col: 2, needs: ['gene-chalk-drop-cloth'],
      text: '+0.5 HP regenerated every second',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ regenPerSecond: flat(0.5)(lv) })),
      mastery: {
        name: 'Gilt Frame', cost: PRICE.t2Mastery,
        text: '+20 max HP — every masterpiece deserves a heavy frame',
        grant: effect({ maxHp: 20 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Magnum Opus: the next Masterpiece is ready to begin sooner. */
    gene({
      id: 'gene-chalk-magnum-opus', name: 'Magnum Opus', tier: 3, col: 0, needs: ['gene-chalk-saturation'],
      text: '−5% Masterpiece (ultimate) cooldown',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Unveiling', cost: PRICE.t3Mastery,
        text: 'Masterpiece casts whip the dust-sheet off round you: 22 to everything within 140px',
        grant: onCast('q', { burst: { damage: 22, radius: 140 } }),
      },
    }),
    /** Restoration: crosses Palette and Brushwork — the restorer's brush works on the painter too. */
    gene({
      id: 'gene-chalk-restoration', name: 'Restoration', tier: 3, col: 1,
      needs: ['gene-chalk-quick-sketch', 'gene-chalk-saturation'],
      text: 'Volatile Orange casts heal 3 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('e', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Pentimento', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled — painted over — and you return at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Fixative: sprayed on the finished work, and on whoever is standing in front of it. */
    gene({
      id: 'gene-chalk-fixative', name: 'Fixative', tier: 3, col: 2, needs: ['gene-chalk-varnish'],
      text: 'Masterpiece casts give you 8 shield HP — still there when the 8 untouchable seconds end',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Museum Glass', cost: PRICE.t3Mastery,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more pigment ground into every colour. */
    enlightened({
      id: 'gene-chalk-enl-pigment', name: 'Enlightened Pigment', col: 0, needs: ['gene-chalk-magnum-opus'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the brush a little lighter in the hand every season. */
    enlightened({
      id: 'gene-chalk-enl-stroke', name: 'Enlightened Stroke', col: 1, needs: ['gene-chalk-restoration'],
      text: '+0.3% move speed',
      grant: stat((lv) => ({ speedMult: gain(0.003)(lv) })),
    }),
    /** Enlightened: one more coat of varnish, forever. */
    enlightened({
      id: 'gene-chalk-enl-varnish', name: 'Enlightened Varnish', col: 2, needs: ['gene-chalk-fixative'],
      text: '−0.3% damage taken (compounding)',
      grant: stat((lv) => ({ damageTakenMult: fade(0.003)(lv) })),
    }),
  ],
};
