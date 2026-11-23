import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Stacked Deck — Fate's gene tree.
 *
 * Fate is a card-sharp with a hand of three: Card Throw pitches the highlighted card (every 350ms,
 * three throws a card before it shreds), Side Shuffle sidesteps and leaves decoy cards that draw
 * when shot, Dice of Doom rolls a die to click, throw or hold, Cursed Talisman sticks a crit curse
 * on the foe, and All In! wagers cards on a slow orbiting strike. Three lines: **Deal** (the throw
 * and the talisman — the card that cuts), **Shuffle** (Side Shuffle and the die — the hand kept
 * moving), and **Stake** (the poker face and the wager on the table).
 *
 * The throw's window is 0.35s, its own cooldown, so it never stacks on itself. The talisman's
 * window is 4s because the cursed foe is usually being shot inside it. A refused throw
 * (an empty hand, a curse-locked hand) is checked before the cooldown is paid, so the per-cast
 * rules never fire on a card that never left the hand.
 */
export const FATE_GENE_TREE: GeneTree = {
  element: 'fate',
  name: 'Stacked Deck',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Deal root: a nick in the corner only the dealer can feel — and only the dealer aims for. */
    gene({
      id: 'gene-fate-marked-cards', name: 'Marked Cards', tier: 0, col: 0,
      text: 'Card Throw casts make the foe take +2% damage for 0.35s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 350 })),
      mastery: {
        name: 'Ace up the Sleeve', cost: PRICE.rootMastery,
        text: '+4% crit chance — there was always one more card than the deck should hold',
        grant: effect({ critChance: 0.04 }),
      },
    }),
    /** Shuffle root: a riffle so quick the table forgets what it was waiting on. */
    gene({
      id: 'gene-fate-riffle', name: 'Riffle', tier: 0, col: 1,
      text: 'Side Shuffle casts shave 300ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ refundOthers: flat(300)(lv) })),
      mastery: {
        name: 'Cold Deck', cost: PRICE.rootMastery,
        text: 'Side Shuffle casts have a 15% chance to come straight back — a second deck was up your sleeve',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Stake root: nothing on the face, so nothing for the blow to find. */
    gene({
      id: 'gene-fate-poker-face', name: 'Poker Face', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Card Counter', cost: PRICE.rootMastery,
        text: 'When hit, a 20% chance to count the shoe: 600ms off every cooldown (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'cooldownRefund', amount: 600 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Purple Ink: the talisman's sigil marks the foe for every card that follows it. */
    gene({
      id: 'gene-fate-purple-ink', name: 'Purple Ink', tier: 1, col: 0, needs: ['gene-fate-marked-cards'],
      text: 'Cursed Talisman casts make the foe take +4% damage for 4s — long enough to throw the hand at them',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ damageMult: gain(0.04)(lv), ms: 4000 })),
      mastery: {
        name: 'Double Down', cost: PRICE.t1Mastery,
        text: 'Cursed Talisman casts crack the air with violet: 14 to everything within 100px',
        grant: onCast('f', { burst: { damage: 14, radius: 100 } }),
      },
    }),
    /** Loaded Dice: a die that always lands kindly on the one who threw it. */
    gene({
      id: 'gene-fate-gilt-edge', name: 'Loaded Dice', tier: 1, col: 1, needs: ['gene-fate-riffle'],
      text: 'Dice of Doom casts heal you 3 HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Weighted Pips', cost: PRICE.t1Mastery,
        text: 'Dice of Doom casts give you 10 shield HP — the weight is on your side of the table',
        grant: onCast('r', { shield: 10 }),
      },
    }),
    /** Read the Table: you saw their hand before they played it, and played round it. */
    gene({
      id: 'gene-fate-read-the-table', name: 'Read the Table', tier: 1, col: 2, needs: ['gene-fate-poker-face'],
      text: 'The foe deals 2% less damage',
      maxLevel: 4, cost: PRICE.t1,
      grant: stat((lv) => ({ enemyDamageMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Fold', cost: PRICE.t1Mastery,
        text: 'The first time you fall below 35% HP, fold the hand: 2 shield charges',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.35, oncePerMatch: true, action: 'shieldCharge', amount: 2 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Sharp Corners: new stock, cut on a guillotine and never rounded. */
    gene({
      id: 'gene-fate-sharp-corners', name: 'Sharp Corners', tier: 2, col: 0, needs: ['gene-fate-purple-ink'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Paper Cut', cost: PRICE.t2Mastery,
        text: 'Hits have a 10% chance to leave a paper cut that stings for 12 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 12, durationMs: 3000 }),
      },
    }),
    /** Sleight of Hand: the hand moves before the eye does. */
    gene({
      id: 'gene-fate-sleight-of-hand', name: 'Sleight of Hand', tier: 2, col: 1, needs: ['gene-fate-gilt-edge'],
      text: '−3% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.03)(lv) })),
      mastery: {
        name: 'Second Deal', cost: PRICE.t2Mastery,
        text: 'Dice of Doom casts shave 500ms off every other cooldown — dealt from under the top card',
        grant: onCast('r', { refundOthers: 500 }),
      },
    }),
    /** Bluff: whatever they hit you with, they wonder if it was their own idea. */
    gene({
      id: 'gene-fate-bluff', name: 'Bluff', tier: 2, col: 2, needs: ['gene-fate-read-the-table'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Called Bluff', cost: PRICE.t2Mastery,
        text: 'When hit, a 15% chance to slap the hand down: 12 to everything within 100px (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'burstAoe', amount: 12, radius: 100 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** High Roller: the House extends credit to the regulars. */
    gene({
      id: 'gene-fate-high-roller', name: 'High Roller', tier: 3, col: 0, needs: ['gene-fate-sharp-corners'],
      text: '−5% All In! (ultimate) cost',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Jackpot', cost: PRICE.t3Mastery,
        text: 'All In! casts spill the pot: 24 to everything within 120px before the wheel even turns',
        grant: onCast('q', { burst: { damage: 24, radius: 120 } }),
      },
    }),
    /** Lucky Draw: crosses Deal and Shuffle — a fresh hand is a fresh breath. */
    gene({
      id: 'gene-fate-lucky-draw', name: 'Lucky Draw', tier: 3, col: 1,
      needs: ['gene-fate-sleight-of-hand', 'gene-fate-sharp-corners'],
      text: 'Side Shuffle casts heal you 3 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('e', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: "Dead Man's Hand", cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and you are dealt back in at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Insured Stake: the House covers you while the wheel is still turning. */
    gene({
      id: 'gene-fate-insured-stake', name: 'Insured Stake', tier: 3, col: 2, needs: ['gene-fate-bluff'],
      text: 'All In! casts give you 10 shield HP — cover while the wheel turns',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(10)(lv) })),
      mastery: {
        name: 'Walk Away', cost: PRICE.t3Mastery,
        text: '+8% movement speed — never be at the table when the bill comes',
        grant: effect({ speedMult: 1.08 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more card marked in every deck you touch. */
    enlightened({
      id: 'gene-fate-enl-suit', name: 'Enlightened Suit', col: 0, needs: ['gene-fate-high-roller'],
      text: '+0.2% crit chance',
      grant: stat((lv) => ({ critChance: flat(0.002)(lv) })),
    }),
    /** Enlightened: the shuffle gets a hair quicker, game after game. */
    enlightened({
      id: 'gene-fate-enl-shuffle', name: 'Enlightened Shuffle', col: 1, needs: ['gene-fate-lucky-draw'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more chip in the stack, forever. */
    enlightened({
      id: 'gene-fate-enl-stake', name: 'Enlightened Stake', col: 2, needs: ['gene-fate-insured-stake'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
