import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * The Last Minute — Death's gene tree.
 *
 * Death draws no blood. Styx Shurikens brand (slower, weaker), Disarm cashes the brands in for a
 * stun, Riposte cuts shots out of the air, Amputate takes limbs, the Deal moves the clock — and
 * at midnight, sixty seconds in, the foe simply dies. Damage multipliers would be worth nothing
 * to him, so this tree never sells one. Three lines instead: **Toll** (bursts and seared wounds —
 * the only blood the genes can give him), **Hourglass** (the tools coming round sooner) and
 * **Shroud** (lasting to midnight: dodges, shields, a foe that hits softer — and shields that
 * keep the Deal's 50-damage bargain).
 *
 * Styx fires every 620ms; its refund is kept small because it is pressed all fight long. A
 * refused Deal or Amputate (nobody to deal with, mid-dash) hands its stamp back and pays nothing.
 */
export const DEATH_GENE_TREE: GeneTree = {
  element: 'death',
  name: 'The Last Minute',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Toll root: the katana comes down and, for once, something bleeds. */
    gene({
      id: 'gene-death-ferrymans-fee', name: "Ferryman's Fee", tier: 0, col: 0,
      text: 'Disarm casts cut everything within 100px for 6',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ burst: { damage: flat(6)(lv), radius: 100 } })),
      mastery: {
        name: 'Quarter Bell', cost: PRICE.rootMastery,
        text: 'Every 15s the clock chimes the quarter: 12 to everything within 140px',
        grant: behavior({ trigger: 'everyNSec', periodSec: 15, action: 'burstAoe', amount: 12, radius: 140 }),
      },
    }),
    /** Hourglass root: every star on the river is a grain of sand moved. */
    gene({
      id: 'gene-death-river-current', name: 'River Current', tier: 0, col: 1,
      text: 'Styx Shuriken casts shave 20ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ refundOthers: flat(20)(lv) })),
      mastery: {
        name: 'Second Stroke', cost: PRICE.rootMastery,
        text: 'Disarm casts have a 15% chance to come straight back — the blade never left your hand',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Shroud root: there is less of you to hit than there looks. */
    gene({
      id: 'gene-death-pallor', name: 'Pallor', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Winding Sheet', cost: PRICE.rootMastery,
        text: '+4% dodge chance — blows catch the cloth and nothing under it',
        grant: effect({ dodgeChance: 0.04 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Edge of the Styx: the blade held out is a blade that can still be swung. */
    gene({
      id: 'gene-death-flick-of-the-blade', name: 'Flick of the Blade', tier: 1, col: 0, needs: ['gene-death-ferrymans-fee'],
      text: 'Riposte casts flick the katana round you: 7 to everything within 110px',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ burst: { damage: flat(7)(lv), radius: 110 } })),
      mastery: {
        name: 'Edge of the Styx', cost: PRICE.t1Mastery,
        text: 'Riposte casts make you 10% faster for 3s — the guard walks with you',
        grant: onCast('r', { speedMult: 1.1, ms: 3000 }),
      },
    }),
    /** Borrowed Time: the Deal's ten seconds are ten seconds of being hard to catch. */
    gene({
      id: 'gene-death-borrowed-time', name: 'Borrowed Time', tier: 1, col: 1, needs: ['gene-death-river-current'],
      text: 'Deal with Death casts make you 4% faster for the Deal\'s 10s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('q', (lv) => ({ speedMult: gain(0.04)(lv), ms: 10000 })),
      mastery: {
        name: 'Fine Print', cost: PRICE.t1Mastery,
        text: 'Deal with Death casts heal you 15 — read the clause about the signatory\'s health',
        grant: onCast('q', { heal: 15 }),
      },
    }),
    /** Mourning Veil: they cannot look straight at you, and it spoils their aim. */
    gene({
      id: 'gene-death-mourning-veil', name: 'Mourning Veil', tier: 1, col: 2, needs: ['gene-death-pallor'],
      text: 'The foe deals 2% less damage',
      maxLevel: 4, cost: PRICE.t1,
      grant: stat((lv) => ({ enemyDamageMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Last Rites', cost: PRICE.t1Mastery,
        text: 'The first time you fall below 35% HP, two blows pass through you — 2 shield charges',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.35, oncePerMatch: true, action: 'shieldCharge', amount: 2 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Reaper's Harvest: the limb comes off, and the cut goes on past it. */
    gene({
      id: 'gene-death-reapers-harvest', name: "Reaper's Harvest", tier: 2, col: 0, needs: ['gene-death-flick-of-the-blade'],
      text: 'Amputate casts open the air around you: 12 to everything within 80px',
      maxLevel: 4, cost: PRICE.t2,
      grant: cast('f', (lv) => ({ burst: { damage: flat(12)(lv), radius: 80 } })),
      mastery: {
        name: 'Tick of the Clock', cost: PRICE.t2Mastery,
        text: 'Every 8s the clock ticks into the foe: 12 over 4s, wherever they are',
        grant: behavior({ trigger: 'everyNSec', periodSec: 8, action: 'sear', amount: 12, durationMs: 4000 }),
      },
    }),
    /** Dead Calm: no hurry. There has never been any hurry. */
    gene({
      id: 'gene-death-dead-calm', name: 'Dead Calm', tier: 2, col: 1, needs: ['gene-death-borrowed-time'],
      text: '−3% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.03)(lv) })),
      mastery: {
        name: 'Sundial', cost: PRICE.t2Mastery,
        text: 'Riposte casts shave 500ms off every other cooldown — the blade\'s shadow moves the hour',
        grant: onCast('r', { refundOthers: 500 }),
      },
    }),
    /** Cold Flesh: the blow lands, and finds you were not quite there. */
    gene({
      id: 'gene-death-cold-flesh', name: 'Cold Flesh', tier: 2, col: 2, needs: ['gene-death-mourning-veil'],
      text: '+2% dodge chance',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ dodgeChance: flat(0.02)(lv) })),
      mastery: {
        name: 'Hollow Ribs', cost: PRICE.t2Mastery,
        text: 'When hit, a 15% chance the next blow goes clean through the ribcage — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Midnight Bell: deals come round sooner for the one who keeps the clock. */
    gene({
      id: 'gene-death-midnight-bell', name: 'Midnight Bell', tier: 3, col: 0, needs: ['gene-death-reapers-harvest'],
      text: '−5% Deal with Death (ultimate) cost',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Handshake', cost: PRICE.t3Mastery,
        text: 'Deal with Death casts: the hand they shake is cold — 24 to everything within 120px',
        grant: onCast('q', { burst: { damage: 24, radius: 120 } }),
      },
    }),
    /** Eleventh Hour: crosses Toll and Hourglass — every stun you cash in buys you a breath. */
    gene({
      id: 'gene-death-eleventh-hour', name: 'Eleventh Hour', tier: 3, col: 1,
      needs: ['gene-death-dead-calm', 'gene-death-reapers-harvest'],
      text: 'Disarm casts heal you 3 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('e', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'No Catch, No Save', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and you stand back up at 25% HP — midnight is not yours',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Shroud of Ages: the Deal is off at 50 damage — so take less of it. */
    gene({
      id: 'gene-death-shroud-of-ages', name: 'Shroud of Ages', tier: 3, col: 2, needs: ['gene-death-cold-flesh'],
      text: 'Deal with Death casts give you 8 shield HP to keep the bargain with',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Pale Horse', cost: PRICE.t3Mastery,
        text: '+8% movement speed',
        grant: effect({ speedMult: 1.08 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: they arrive a little more spent each time. Never none of them. */
    enlightened({
      id: 'gene-death-enl-toll', name: 'Enlightened Toll', col: 0, needs: ['gene-death-midnight-bell'],
      text: 'The foe starts 0.2% thinner (compounding)',
      grant: stat((lv) => ({ enemyMaxHpMult: fade(0.002)(lv) })),
    }),
    /** Enlightened: one grain fewer in the glass. */
    enlightened({
      id: 'gene-death-enl-hourglass', name: 'Enlightened Hourglass', col: 1, needs: ['gene-death-eleventh-hour'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more fold in the shroud. */
    enlightened({
      id: 'gene-death-enl-shroud', name: 'Enlightened Shroud', col: 2, needs: ['gene-death-shroud-of-ages'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
