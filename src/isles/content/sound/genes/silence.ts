import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Stillness — Silence's gene tree.
 *
 * Silence is the thing in the hallway: Stab's dash that spends stealth for damage (a backstab
 * Silences), Watch's stalkers that feed that stealth and mature, Ritual's red beam that Silences
 * for 20s (or turns a mature stalker into a Grabber), Stalk's three-second shadow aura, and Run —
 * the gangly arm and the chase down the hall. The tree has three rooms: **Blade** (Stab and the
 * Ritual — what lands), **Watch** (stalkers and Stalk — patience, coming back round) and
 * **Dark** (not being there to hit).
 *
 * Stab's cooldown is 1s, so its window is 1s. Run hands back only part of its cooldown on a
 * whiff, not the cast — so Run's per-cast rules pay out even when the arm closes on nothing.
 * The Striker and Puppetmaster forms stamp these same ids, so their moves feed the tree too.
 */
export const SILENCE_GENE_TREE: GeneTree = {
  element: 'silence',
  name: 'Stillness',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: the first stab opens the way for the second. */
    gene({
      id: 'gene-silence-quiet-blade', name: 'Quiet Blade', tier: 0, col: 0,
      text: 'Stab casts make the foe take +2% damage for 1s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 1000 })),
      mastery: {
        name: 'Cutthroat', cost: PRICE.rootMastery,
        text: '+3% crit chance, and crits cut for at least ×1.75',
        grant: effect({ critChance: 0.03, critMult: 1.75 }),
      },
    }),
    /** Identity root: set a watcher down and the dark is already working for you. */
    gene({
      id: 'gene-silence-vigil', name: 'Vigil', tier: 0, col: 1,
      text: 'Watch casts shave 250ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'The Fourth Watcher', cost: PRICE.rootMastery,
        text: 'Watch casts have a 15% chance to come straight back — something else was already in the corner',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: you are hard to hit when nobody is sure you are there. */
    gene({
      id: 'gene-silence-muffled-step', name: 'Muffled Step', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Unheard', cost: PRICE.rootMastery,
        text: 'Nothing can touch you for the first 1.5s of every fight',
        grant: effect({ invincibleMs: 1500 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Red Circle: a foe under the ritual's beam has nowhere quiet to stand. */
    gene({
      id: 'gene-silence-red-circle', name: 'Red Circle', tier: 1, col: 0, needs: ['gene-silence-quiet-blade'],
      text: 'Ritual casts make the foe take +4% damage for 3s — the beam lands 1s in',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ damageMult: gain(0.04)(lv), ms: 3000 })),
      mastery: {
        name: 'Bloodlet', cost: PRICE.t1Mastery,
        text: 'Hits have a 10% chance to open a wound that bleeds 12 over 3s (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 4, action: 'sear', amount: 12, durationMs: 3000 }),
      },
    }),
    /** Lurk: the Stalk aura only bites if they stay in it — so you keep up. */
    gene({
      id: 'gene-silence-lurk', name: 'Lurk', tier: 1, col: 1, needs: ['gene-silence-vigil'],
      text: 'Stalk casts give +5% move speed for the 3s the aura is out',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ speedMult: gain(0.05)(lv), ms: 3000 })),
      mastery: {
        name: 'Patient Hunger', cost: PRICE.t1Mastery,
        text: 'Stalk casts heal 8 HP',
        grant: onCast('f', { heal: 8 }),
      },
    }),
    /** Shroud: the shadow aura is thick enough to stop a blade. */
    gene({
      id: 'gene-silence-shroud', name: 'Shroud', tier: 1, col: 2, needs: ['gene-silence-muffled-step'],
      text: 'Stalk casts give you 5 shield HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Gone', cost: PRICE.t1Mastery,
        text: 'When hit, a 15% chance to slip back into the dark: +40% speed for 1.2s (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'tempHaste', mult: 1.4, durationMs: 1200 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Hollow Point: every edge filed in the dark. */
    gene({
      id: 'gene-silence-hollow-point', name: 'Hollow Point', tier: 2, col: 0, needs: ['gene-silence-red-circle'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Cornered', cost: PRICE.t2Mastery,
        text: 'The first time you drop below 35% HP: +30% damage for 4s',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.35, action: 'tempDamage', mult: 1.3, durationMs: 4000 }),
      },
    }),
    /** Dead Air: a Silence that holds longer, and hurts while it holds. */
    gene({
      id: 'gene-silence-dead-air', name: 'Dead Air', tier: 2, col: 1, needs: ['gene-silence-lurk'],
      text: '+4% status damage and +4% status duration',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ statusDmgMult: gain(0.04)(lv), statusDurMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Hush Money', cost: PRICE.t2Mastery,
        text: 'Every 10s the quiet pays out: every cooldown skips 0.6s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 10, action: 'cooldownRefund', amount: 600 }),
      },
    }),
    /** Thick Dark: more of you than anyone guessed. */
    gene({
      id: 'gene-silence-thick-dark', name: 'Thick Dark', tier: 2, col: 2, needs: ['gene-silence-shroud'],
      text: '+4 max HP',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ maxHp: flat(4)(lv) })),
      mastery: {
        name: 'Shadowskin', cost: PRICE.t2Mastery,
        text: 'Start every fight with a shield charge',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Long Hallway: the arm reaches out again sooner. */
    gene({
      id: 'gene-silence-long-hallway', name: 'Long Hallway', tier: 3, col: 0, needs: ['gene-silence-hollow-point'],
      text: '−5% Run (ultimate) cooldown',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'The Blob Remembers', cost: PRICE.t3Mastery,
        text: 'Run casts burst out of you as the arm unfolds: 20 to everything within 130px',
        grant: onCast('q', { burst: { damage: 20, radius: 130 } }),
      },
    }),
    /** Mature Watch: crosses Blade and Watch — each new watcher is something to feed on. */
    gene({
      id: 'gene-silence-mature-watch', name: 'Mature Watch', tier: 3, col: 1,
      needs: ['gene-silence-dead-air', 'gene-silence-hollow-point'],
      text: 'Watch casts heal 2 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('e', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: "Grabber's Reach", cost: PRICE.crossMastery,
        text: 'Ritual casts have a 15% chance to come straight back — the circle never quite closed',
        grant: onCast('r', { refundSelfChance: 0.15 }),
      },
    }),
    /** Pitch Black: you take the hallway with you. */
    gene({
      id: 'gene-silence-pitch-black', name: 'Pitch Black', tier: 3, col: 2, needs: ['gene-silence-thick-dark'],
      text: 'Run casts give you 10 shield HP — hit or miss',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(10)(lv) })),
      mastery: {
        name: 'Nothing There', cost: PRICE.t3Mastery,
        text: '+3% dodge chance',
        grant: effect({ dodgeChance: 0.03 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: the blade a whisker sharper every night. */
    enlightened({
      id: 'gene-silence-enl-edge', name: 'Enlightened Edge', col: 0, needs: ['gene-silence-long-hallway'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the quiet lasts a moment longer, always. */
    enlightened({
      id: 'gene-silence-enl-quiet', name: 'Enlightened Quiet', col: 1, needs: ['gene-silence-mature-watch'],
      text: '+0.4% status duration',
      grant: stat((lv) => ({ statusDurMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: one more shadow folded into the coat. */
    enlightened({
      id: 'gene-silence-enl-shade', name: 'Enlightened Shade', col: 2, needs: ['gene-silence-pitch-black'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
