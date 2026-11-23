import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Spellwright — Magic's gene tree.
 *
 * Magic is a book-mage: Sparkle Shot's star that stops and bursts, the Grimoire's wheel of five
 * spells (Flare, Splash, Spur, Gust, Ward), Magic Missiles' crosshair that pays a missile per
 * click, Duplication's scroll that records a square of your own spellwork and conjures it again,
 * and the Summon wheel's five elementals. The tree has three chapters: **Hex** (the star, the
 * crosshair and the summons — the spell that hurts), **Rote** (the wheel and the scroll — the
 * pages turning faster) and **Ward** (chalk circles and the mana font — the spell that shelters).
 *
 * Both wheels count their cast when the spell actually lands, two seconds after the key comes up,
 * so a Grimoire or Summon window starts with the spell, not with the menu. The missiles fired by
 * clicking a marked foe are not casts; the crosshair is.
 */
export const MAGIC_GENE_TREE: GeneTree = {
  element: 'magic',
  name: 'Spellwright',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: the star hangs in the air, and the foe is marked by it until it bursts. */
    gene({
      id: 'gene-magic-sigil-sting', name: 'Sigil Sting', tier: 0, col: 0,
      text: 'Sparkle Shot casts make the foe take +3% damage for 2s — through the burst',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ damageMult: gain(0.03)(lv), ms: 2000 })),
      mastery: {
        name: 'Hexed Ink', cost: PRICE.rootMastery,
        text: 'Hits have a 10% chance to hex the foe\'s feet: 30% slower for 1.5s (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 4, action: 'slowEnemy', mult: 0.7, durationMs: 1500 }),
      },
    }),
    /** Identity root: a spell learned by rote leaves the mind free for the next. */
    gene({
      id: 'gene-magic-rote-learning', name: 'Rote Learning', tier: 0, col: 1,
      text: 'Grimoire casts shave 300ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ refundOthers: flat(300)(lv) })),
      mastery: {
        name: 'Dog-eared Page', cost: PRICE.rootMastery,
        text: 'Grimoire casts have a 15% chance to come straight back — the book falls open at the same page',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: a ring of chalk round your boots, redrawn every morning. */
    gene({
      id: 'gene-magic-warding-chalk', name: 'Warding Chalk', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Abjuration', cost: PRICE.rootMastery,
        text: 'Start every fight inside an 18 HP abjuration shield',
        grant: effect({ shieldHp: 18 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Arcane Mark: the crosshair does more than count clicks. */
    gene({
      id: 'gene-magic-arcane-mark', name: 'Arcane Mark', tier: 1, col: 0, needs: ['gene-magic-sigil-sting'],
      text: 'Magic Missiles casts make the foe take +4% damage for 3s — the whole crosshair',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ damageMult: gain(0.04)(lv), ms: 3000 })),
      mastery: {
        name: 'Overchannel', cost: PRICE.t1Mastery,
        text: '+5% crit chance — a little more mana than the spell asked for',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Palimpsest: a page written over keeps the ghost of the last spell under it. */
    gene({
      id: 'gene-magic-palimpsest', name: 'Palimpsest', tier: 1, col: 1, needs: ['gene-magic-rote-learning'],
      text: 'Duplication casts shave 350ms off every other cooldown',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ refundOthers: flat(350)(lv) })),
      mastery: {
        name: 'Fair Copy', cost: PRICE.t1Mastery,
        text: 'Duplication casts have a 20% chance to come straight back — a second scroll under the first',
        grant: onCast('f', { refundSelfChance: 0.2 }),
      },
    }),
    /** Ward Sigil: every page turned draws a faint circle round the reader. */
    gene({
      id: 'gene-magic-ward-sigil', name: 'Ward Sigil', tier: 1, col: 2, needs: ['gene-magic-warding-chalk'],
      text: 'Grimoire casts give you 4 shield HP — whichever spell you picked',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('e', (lv) => ({ shield: flat(4)(lv) })),
      mastery: {
        name: 'Counterspell', cost: PRICE.t1Mastery,
        text: 'When hit, a 15% chance to snap a counter-sigil up: a shield charge (at most every 7s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 7, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Wyrd Power: the runes cut a little deeper into the world. */
    gene({
      id: 'gene-magic-wyrd-power', name: 'Wyrd Power', tier: 2, col: 0, needs: ['gene-magic-arcane-mark'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Mana Surge', cost: PRICE.t2Mastery,
        text: 'Hits have an 8% chance to surge: +20% damage for 2s (at most every 8s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.08, cooldownSec: 8, action: 'tempDamage', mult: 1.2, durationMs: 2000 }),
      },
    }),
    /** Spell Slots: one more prepared, one less to scribble mid-fight. */
    gene({
      id: 'gene-magic-spell-slots', name: 'Spell Slots', tier: 2, col: 1, needs: ['gene-magic-palimpsest'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Ley Line', cost: PRICE.t2Mastery,
        text: 'Every 9s a ley line pulses under the arena and every cooldown skips 0.5s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 9, action: 'cooldownRefund', amount: 500 }),
      },
    }),
    /** Mana Font: a sip from the spring of liquid light, still glowing in the blood. */
    gene({
      id: 'gene-magic-mana-font', name: 'Mana Font', tier: 2, col: 2, needs: ['gene-magic-ward-sigil'],
      text: '+0.5 HP regenerated every second',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ regenPerSecond: flat(0.5)(lv) })),
      mastery: {
        name: "Familiar's Bond", cost: PRICE.t2Mastery,
        text: '+20 max HP — some of the elementals\' strength stays behind when they go',
        grant: effect({ maxHp: 20 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Archmage: the second book opens again sooner. */
    gene({
      id: 'gene-magic-archmage', name: 'Archmage', tier: 3, col: 0, needs: ['gene-magic-wyrd-power'],
      text: '−5% Summon (ultimate) cooldown',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Grand Summoning', cost: PRICE.t3Mastery,
        text: 'Summon casts blow the circle open round you: 24 to everything within 140px',
        grant: onCast('q', { burst: { damage: 24, radius: 140 } }),
      },
    }),
    /** Transmutation: crosses Hex and Rote — the wheel turns harm into health on the way round. */
    gene({
      id: 'gene-magic-transmutation', name: 'Transmutation', tier: 3, col: 1,
      needs: ['gene-magic-spell-slots', 'gene-magic-wyrd-power'],
      text: 'Grimoire casts heal 3 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('e', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Phylactery', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and you reform from the phylactery at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Summoner's Circle: the circle that calls an elemental also keeps the caller. */
    gene({
      id: 'gene-magic-summoners-circle', name: "Summoner's Circle", tier: 3, col: 2, needs: ['gene-magic-mana-font'],
      text: 'Summon casts give you 8 shield HP',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Ward of Ages', cost: PRICE.t3Mastery,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more rune in the margin of every spell. */
    enlightened({
      id: 'gene-magic-enl-rune', name: 'Enlightened Rune', col: 0, needs: ['gene-magic-archmage'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the pages turn a little faster every year. */
    enlightened({
      id: 'gene-magic-enl-page', name: 'Enlightened Page', col: 1, needs: ['gene-magic-transmutation'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more ring of chalk round the circle, forever. */
    enlightened({
      id: 'gene-magic-enl-circle', name: 'Enlightened Circle', col: 2, needs: ['gene-magic-summoners-circle'],
      text: '−0.3% damage taken (compounding)',
      grant: stat((lv) => ({ damageTakenMult: fade(0.003)(lv) })),
    }),
  ],
};
