import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Marginalia — Paper's gene tree.
 *
 * Paper reads from three storybooks (Knight's Excalibur, Alien's laser, Fantasy's portal spike —
 * cycled with right-click), throws or rides a Paper Plane, buries a bleeding Shuriken in the
 * wall, scatters six Mâché Monsters on the floor, and closes the open book with its Climax. The
 * tree has three parts of a page: **Text** (the storybook and the Shuriken's bleed — what is
 * written in red), **Fold** (the Plane and the monsters — creases, drafts and redrafts) and
 * **Binding** (card, leather and the epilogue).
 *
 * The storybook's cooldown is 0.9s, so its window is 0.9s. An Alien click mid-burst or
 * mid-reload hands its cooldown straight back and pays out nothing. Right-click book changes are
 * free and report no cast.
 */
export const PAPER_GENE_TREE: GeneTree = {
  element: 'paper',
  name: 'Marginalia',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: every page turned leaves a paper cut. */
    gene({
      id: 'gene-paper-paper-cut', name: 'Paper Cut', tier: 0, col: 0,
      text: 'Storybook casts make the foe take +2% damage for 0.9s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 900 })),
      mastery: {
        name: 'Dog-Ear', cost: PRICE.rootMastery,
        text: '+5% crit chance — you marked the good bits',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Identity root: the plane goes, and you go with the draught it leaves. */
    gene({
      id: 'gene-paper-tailwind', name: 'Tailwind', tier: 0, col: 1,
      text: 'Paper Plane casts give +4% move speed for 2s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ speedMult: gain(0.04)(lv), ms: 2000 })),
      mastery: {
        name: 'Second Fold', cost: PRICE.rootMastery,
        text: 'Paper Plane casts have a 15% chance to come straight back — there was another sheet under it',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: heavier stock than they bargained for. */
    gene({
      id: 'gene-paper-cardstock', name: 'Cardstock', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Hardback', cost: PRICE.rootMastery,
        text: 'Start every fight with a shield charge',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Bleeding Ink: the Shuriken's bleed runs longer and deeper into the margin. */
    gene({
      id: 'gene-paper-bleeding-ink', name: 'Bleeding Ink', tier: 1, col: 0, needs: ['gene-paper-paper-cut'],
      text: '+4% status damage and +4% status duration',
      maxLevel: 4, cost: PRICE.t1,
      grant: stat((lv) => ({ statusDmgMult: gain(0.04)(lv), statusDurMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Red Pen', cost: PRICE.t1Mastery,
        text: 'Paper Shuriken casts make the foe take +10% damage for the 4s of its bleed',
        grant: onCast('r', { damageMult: 1.1, ms: 4000 }),
      },
    }),
    /** Quick Fold: six monsters on the floor, and your hands are free again. */
    gene({
      id: 'gene-paper-quick-fold', name: 'Quick Fold', tier: 1, col: 1, needs: ['gene-paper-tailwind'],
      text: 'Mâché Monsters casts shave 400ms off every other cooldown',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ refundOthers: flat(400)(lv) })),
      mastery: {
        name: 'Fortune Told', cost: PRICE.t1Mastery,
        text: 'Mâché Monsters casts heal 8 HP — one of them opened on a kind fortune',
        grant: onCast('f', { heal: 8 }),
      },
    }),
    /** Papier Shell: folding the big shuriken folds a sheet round you too. */
    gene({
      id: 'gene-paper-papier-shell', name: 'Papier Shell', tier: 1, col: 2, needs: ['gene-paper-cardstock'],
      text: 'Paper Shuriken casts give you 5 shield HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Paper Trail', cost: PRICE.t1Mastery,
        text: 'When hit, a 20% chance to tangle them in loose sheets: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Bold Type: every word pressed a little harder into the page. */
    gene({
      id: 'gene-paper-bold-type', name: 'Bold Type', tier: 2, col: 0, needs: ['gene-paper-bleeding-ink'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Footnote', cost: PRICE.t2Mastery,
        text: 'Hits have a 10% chance to leave a footnote that stings for 10 over 3s (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 4, action: 'sear', amount: 10, durationMs: 3000 }),
      },
    }),
    /** Second Draft: you have written this fight before, and it goes quicker now. */
    gene({
      id: 'gene-paper-second-draft', name: 'Second Draft', tier: 2, col: 1, needs: ['gene-paper-quick-fold'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Errata', cost: PRICE.t2Mastery,
        text: 'Every 10s a correction slip comes in: every cooldown skips 0.6s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 10, action: 'cooldownRefund', amount: 600 }),
      },
    }),
    /** Leather Binding: the spine pushes back. */
    gene({
      id: 'gene-paper-leather-binding', name: 'Leather Binding', tier: 2, col: 2, needs: ['gene-paper-papier-shell'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Flyleaf', cost: PRICE.t2Mastery,
        text: 'The first time you drop below 35% HP, two blank flyleaves fold over you: 2 shield charges',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.35, action: 'shieldCharge', amount: 2 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Last Chapter: the ending arrives sooner. */
    gene({
      id: 'gene-paper-last-chapter', name: 'Last Chapter', tier: 3, col: 0, needs: ['gene-paper-bold-type'],
      text: '−5% Climax (ultimate) cooldown',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Cliffhanger', cost: PRICE.t3Mastery,
        text: 'Climax casts slam the book shut: 20 to everything within 130px',
        grant: onCast('q', { burst: { damage: 20, radius: 130 } }),
      },
    }),
    /** Revision: crosses Text and Fold — every flight is a chance to rewrite the wound out. */
    gene({
      id: 'gene-paper-revision', name: 'Revision', tier: 3, col: 1,
      needs: ['gene-paper-second-draft', 'gene-paper-bold-type'],
      text: 'Paper Plane casts heal 2 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('e', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Sequel', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled — the story continues at 20% HP',
        grant: effect({ reviveHpFrac: 0.2 }),
      },
    }),
    /** Epilogue: when the book closes, its covers close round you. */
    gene({
      id: 'gene-paper-epilogue', name: 'Epilogue', tier: 3, col: 2, needs: ['gene-paper-leather-binding'],
      text: 'Climax casts give you 8 shield HP',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Rice Paper Ward', cost: PRICE.t3Mastery,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more line of red ink in the margin. */
    enlightened({
      id: 'gene-paper-enl-ink', name: 'Enlightened Ink', col: 0, needs: ['gene-paper-last-chapter'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: every fight filed in the Journal makes the next one shorter. */
    enlightened({
      id: 'gene-paper-enl-journal', name: 'Enlightened Journal', col: 1, needs: ['gene-paper-revision'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more page in the binding, forever. */
    enlightened({
      id: 'gene-paper-enl-page', name: 'Enlightened Page', col: 2, needs: ['gene-paper-epilogue'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
