import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Saga — Myth's gene tree.
 *
 * Myth is every story at once: Cosmic Whip (a star mace on the tip), Truth Breaker (Excalibur's
 * true-damage arc), Parry (turn a hit aside, stun the dealer, go Indomitable), Beast of Myth (a
 * portal-beast that drags its catch to the wall) and Final Destiny — fifteen seconds in first
 * person with five guns on the five keys. The crowd throws Echo Shards that buy each ability a
 * second act. The tree has three lines: **Excalibur** (the whip and the blade), **Chorus** (the
 * telling and retelling — tempo) and **Indomitable** (the parry and the hero who will not fall).
 *
 * Final Destiny re-arms the same keys, so a slot's rule fires for its gun too: Click is the whip
 * (650ms) and the pistol (360ms), so its window is 0.3s and never stacks; E is Truth Breaker and
 * the shotgun (2.2s); R the Parry and the grenades; F the beast and the hunter rifle; Q Final
 * Destiny and the shadow rocket.
 */
export const MYTH_GENE_TREE: GeneTree = {
  element: 'myth',
  name: 'Saga',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: the mace at the tip leaves a star in the foe's eyes. */
    gene({
      id: 'gene-myth-star-mace', name: 'Star Mace', tier: 0, col: 0,
      text: 'Cosmic Whip (and pistol) casts make the foe take +2% damage for 0.3s',
      maxLevel: 4, cost: linear(6, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 300 })),
      mastery: {
        name: 'Comet Tail', cost: 14,
        text: 'Hits have a 10% chance to leave a comet\'s tail burning on the foe: 10 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 10, durationMs: 3000 }),
      },
    }),
    /** Identity root: every time the tale is told, the next chapter comes sooner. */
    gene({
      id: 'gene-myth-retold', name: 'Retold', tier: 0, col: 1,
      text: 'Truth Breaker (and shotgun) casts shave 250ms off every other cooldown',
      maxLevel: 4, cost: linear(6, 2),
      grant: cast('e', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'Twice-Told Tale', cost: 14,
        text: 'Truth Breaker (and shotgun) casts have a 15% chance to come straight back',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: the hero does not die in the second act. */
    gene({
      id: 'gene-myth-plot-armour', name: 'Plot Armour', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(6, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Chosen One', cost: 14,
        text: 'Start every fight with a shield charge — the first blow was always going to miss',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** True Name: Excalibur names the foe, and a named thing can be cut. */
    gene({
      id: 'gene-myth-true-name', name: 'True Name', tier: 1, col: 0, needs: ['gene-myth-star-mace'],
      text: 'Truth Breaker (and shotgun) casts make the foe take +4% damage for 2s',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('e', (lv) => ({ damageMult: gain(0.04)(lv), ms: 2000 })),
      mastery: {
        name: 'Excalibur Drawn', cost: 18,
        text: 'Truth Breaker (and shotgun) casts ring the blade out around you: 14 to everything within 110px',
        grant: onCast('e', { burst: { damage: 14, radius: 110 } }),
      },
    }),
    /** Hero's Stride: a parry is a step forward, not back. */
    gene({
      id: 'gene-myth-heros-stride', name: 'Hero\'s Stride', tier: 1, col: 1, needs: ['gene-myth-retold'],
      text: 'Parry (and grenade) casts make you 10% faster for 2s',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('r', (lv) => ({ speedMult: gain(0.1)(lv), ms: 2000 })),
      mastery: {
        name: 'Deus ex Machina', cost: 18,
        text: 'Parry (and grenade) casts shave 1s off every other cooldown',
        grant: onCast('r', { refundOthers: 1000 }),
      },
    }),
    /** Squire's Shield: the blade held out, and a buckler behind it. */
    gene({
      id: 'gene-myth-squires-shield', name: 'Squire\'s Shield', tier: 1, col: 2, needs: ['gene-myth-plot-armour'],
      text: 'Parry (and grenade) casts give you 5 shield HP',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('r', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Stunned Silence', cost: 18,
        text: 'When hit, a 20% chance the attacker falters at your legend: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Epic: the tale grows in the telling, and so do the blows. */
    gene({
      id: 'gene-myth-epic', name: 'Epic', tier: 2, col: 0, needs: ['gene-myth-true-name'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Fated Blow', cost: 22,
        text: '+5% crit chance — some blows were written down before the fight began',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Oral Tradition: told so often it tells itself. */
    gene({
      id: 'gene-myth-oral-tradition', name: 'Oral Tradition', tier: 2, col: 1, needs: ['gene-myth-heros-stride'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Applause', cost: 22,
        text: 'Every 12s the crowd roars your name: 15% faster for 3s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 12, action: 'tempHaste', mult: 1.15, durationMs: 3000 }),
      },
    }),
    /** Dragon Hide: a cloak cut from the beast in the third chapter. */
    gene({
      id: 'gene-myth-dragon-hide', name: 'Dragon Hide', tier: 2, col: 2, needs: ['gene-myth-squires-shield'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Last Stand', cost: 22,
        text: 'When hit, a 15% chance to dig in — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Sequel: the finale comes back for another run. */
    gene({
      id: 'gene-myth-sequel', name: 'Sequel', tier: 3, col: 0, needs: ['gene-myth-epic'],
      text: '−5% Final Destiny (ultimate) cooldown',
      maxLevel: 3, cost: linear(14, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Final Chapter', cost: 28,
        text: 'Final Destiny (and rocket) casts make the foe take +20% damage for 8s',
        grant: onCast('q', { damageMult: 1.2, ms: 8000 }),
      },
    }),
    /** Happily Ever After: crosses Excalibur and Chorus — every turned blow mends a little. */
    gene({
      id: 'gene-myth-happily-ever-after', name: 'Happily Ever After', tier: 3, col: 1,
      needs: ['gene-myth-oral-tradition', 'gene-myth-epic'],
      text: 'Parry (and grenade) casts heal 3 HP',
      maxLevel: 4, cost: linear(11, 4),
      grant: cast('r', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Resurrection Arc', cost: 30,
        text: 'Once per fight, a lethal hit is cancelled and the hero rises again at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Beast Tamer: the beast pours out of the portal and stands guard as it goes. */
    gene({
      id: 'gene-myth-beast-tamer', name: 'Beast Tamer', tier: 3, col: 2, needs: ['gene-myth-dragon-hide'],
      text: 'Beast of Myth (and hunter rifle) casts give you 8 shield HP',
      maxLevel: 3, cost: linear(14, 4),
      grant: cast('f', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Legendary', cost: 28,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more verse to the ballad. */
    enlightened({
      id: 'gene-myth-enl-verse', name: 'Enlightened Verse', col: 0, needs: ['gene-myth-sequel'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the story told a breath quicker each time. */
    enlightened({
      id: 'gene-myth-enl-retelling', name: 'Enlightened Retelling', col: 1, needs: ['gene-myth-happily-ever-after'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: the legend outlives the hero, one page at a time. */
    enlightened({
      id: 'gene-myth-enl-page', name: 'Enlightened Page', col: 2, needs: ['gene-myth-beast-tamer'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
