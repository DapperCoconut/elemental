import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Liturgy — Devotion's gene tree (element id `passion`).
 *
 * Devotion never deals damage: Sermon's Greek letters, Holy Water's boiling puddle, the Holy
 * Hand Grenade, the Crucifix's aura and Ascendance's chariot all fill the foe's **faith** bar,
 * and at 200 they are converted. Faith ignores damage, crit and status multipliers, so this tree
 * buys none of them — no node here deals or scales damage. It buys *more sermons*: cooldowns,
 * pace, and a priest who lives long enough to finish preaching. Three parts of the service:
 * **Pulpit** (Sermon — tempo), **Font** (Holy Water and the Grenade — grace and the pin) and
 * **Sanctuary** (the Crucifix and the believer's softened blows).
 *
 * Sermon re-casts every 0.48s (a held sermon reports once, on release), and Holy Water's 0.35s
 * cooldown stamps once per bottle thrown — an empty-handed press is refused before the cast and
 * pays nothing. Gene cooldown cuts never refill bottles: those come back on the kit's own 7s clock.
 */
export const DEVOTION_GENE_TREE: GeneTree = {
  element: 'passion',
  name: 'Liturgy',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Pulpit root: every homily hurries the rest of the service along. */
    gene({
      id: 'gene-passion-homily', name: 'Homily', tier: 0, col: 0,
      text: 'Sermon casts shave 25ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ refundOthers: flat(25)(lv) })),
      mastery: {
        name: 'Shuffling Pews', cost: PRICE.rootMastery,
        text: 'The congregation drags its feet: the foe moves 5% slower',
        grant: effect({ enemySpeedMult: 0.95 }),
      },
    }),
    /** Font root: the water that blesses them blesses the hand that throws it. */
    gene({
      id: 'gene-passion-font-of-grace', name: 'Font of Grace', tier: 0, col: 1,
      text: 'Holy Water casts heal 1 HP per bottle thrown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ heal: flat(1)(lv) })),
      mastery: {
        name: 'Baptism', cost: PRICE.rootMastery,
        text: '+1 HP regenerated every second',
        grant: effect({ regenPerSecond: 1 }),
      },
    }),
    /** Sanctuary root: vestments stitched with a prayer in every seam. */
    gene({
      id: 'gene-passion-vestments', name: 'Vestments', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Sanctified', cost: PRICE.rootMastery,
        text: 'Start every fight with a shield charge',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Speaking in Tongues: the words come faster than you can think them. */
    gene({
      id: 'gene-passion-tongues', name: 'Speaking in Tongues', tier: 1, col: 0, needs: ['gene-passion-homily'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: PRICE.t1,
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Litany', cost: PRICE.t1Mastery,
        text: 'Every 9s the litany turns over: every cooldown skips 0.5s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 9, action: 'cooldownRefund', amount: 500 }),
      },
    }),
    /** Pull the Pin: three seconds of bouncing, and the priest is already reaching for the next thing. */
    gene({
      id: 'gene-passion-pull-the-pin', name: 'Pull the Pin', tier: 1, col: 1, needs: ['gene-passion-font-of-grace'],
      text: 'Holy Hand Grenade casts shave 350ms off every other cooldown',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ refundOthers: flat(350)(lv) })),
      mastery: {
        name: 'Count to Three', cost: PRICE.t1Mastery,
        text: 'Holy Hand Grenade casts have a 15% chance to come straight back — five is right out',
        grant: onCast('r', { refundSelfChance: 0.15 }),
      },
    }),
    /** Holy Ground: plant the cross and stand behind it. */
    gene({
      id: 'gene-passion-holy-ground', name: 'Holy Ground', tier: 1, col: 2, needs: ['gene-passion-vestments'],
      text: 'Mount Crucifix casts give you 5 shield HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Sanctuary Bell', cost: PRICE.t1Mastery,
        text: 'When hit, a 20% chance the bell tolls them still: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Pilgrim's Stride: the road to the holy water is always a little shorter. */
    gene({
      id: 'gene-passion-pilgrim', name: "Pilgrim's Stride", tier: 2, col: 0, needs: ['gene-passion-tongues'],
      text: '+3% move speed',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ speedMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Processional', cost: PRICE.t2Mastery,
        text: 'Every 8s the procession moves on: +30% speed for 1.5s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 8, action: 'tempHaste', mult: 1.3, durationMs: 1500 }),
      },
    }),
    /** Mercy: every grenade thrown in love comes back to you as grace. */
    gene({
      id: 'gene-passion-mercy', name: 'Mercy', tier: 2, col: 1, needs: ['gene-passion-pull-the-pin'],
      text: 'Holy Hand Grenade casts heal 3 HP',
      maxLevel: 4, cost: PRICE.t2,
      grant: cast('r', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Absolution', cost: PRICE.t2Mastery,
        text: 'The first time you drop below 30% HP, you are absolved: heal 30',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: 30 }),
      },
    }),
    /** The Meek: the half-converted already hit like they are sorry. */
    gene({
      id: 'gene-passion-the-meek', name: 'The Meek', tier: 2, col: 2, needs: ['gene-passion-holy-ground'],
      text: 'The foe deals −2% damage',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ enemyDamageMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Turn the Cheek', cost: PRICE.t2Mastery,
        text: 'When hit, a 12% chance to turn the other cheek — a shield charge (at most every 7s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.12, cooldownSec: 7, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Chariot Wheels: the fiery chariot is harnessed sooner. */
    gene({
      id: 'gene-passion-chariot-wheels', name: 'Chariot Wheels', tier: 3, col: 0, needs: ['gene-passion-pilgrim'],
      text: '−5% Ascendance (ultimate) cooldown',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Rapture', cost: PRICE.t3Mastery,
        text: 'Ascendance casts give +25% move speed for the 3s before the chariot comes — catch it, or herd them',
        grant: onCast('q', { speedMult: 1.25, ms: 3000 }),
      },
    }),
    /** Vigil Candle: crosses Pulpit and Font — every cross planted, a candle lit for yourself. */
    gene({
      id: 'gene-passion-vigil-candle', name: 'Vigil Candle', tier: 3, col: 1,
      needs: ['gene-passion-mercy', 'gene-passion-pilgrim'],
      text: 'Mount Crucifix casts heal 2 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('f', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Resurrection', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and you rise again at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Reliquary: the chariot leaves the priest wrapped in its afterglow. */
    gene({
      id: 'gene-passion-reliquary', name: 'Reliquary', tier: 3, col: 2, needs: ['gene-passion-the-meek'],
      text: 'Ascendance casts give you 8 shield HP',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Halo', cost: PRICE.t3Mastery,
        text: '+3% dodge chance — blows glance off the light',
        grant: effect({ dodgeChance: 0.03 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: the service runs a breath shorter every Sunday. */
    enlightened({
      id: 'gene-passion-enl-office', name: 'Enlightened Office', col: 0, needs: ['gene-passion-chariot-wheels'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more drop in the font, forever. */
    enlightened({
      id: 'gene-passion-enl-font', name: 'Enlightened Font', col: 1, needs: ['gene-passion-vigil-candle'],
      text: '+0.02 HP regenerated every second',
      grant: stat((lv) => ({ regenPerSecond: flat(0.02)(lv) })),
    }),
    /** Enlightened: the believer's hand a little gentler each time it is raised. */
    enlightened({
      id: 'gene-passion-enl-meekness', name: 'Enlightened Meekness', col: 2, needs: ['gene-passion-reliquary'],
      text: 'The foe deals −0.2% damage (compounding)',
      grant: stat((lv) => ({ enemyDamageMult: fade(0.002)(lv) })),
    }),
  ],
};
