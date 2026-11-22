import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Hopeless Dark — Shadow's gene tree.
 *
 * Shadow fights from the floor up: obsidian caltrops thrown as fast as Click is held (every
 * 650ms), a Tentacle that snares what it touches, a Snap Trap at its feet, a growing Tentacle Wall,
 * and the Black Hole that drags the foe in — every hit feeding Hopelessness. Three lines:
 * **Snare** (caltrops and traps — the floor that bites), **Grasp** (the tentacles, single and
 * walled) and **Void** (the self in the dark, and the hole at the end of it).
 *
 * The caltrop window is 0.6s, inside its own cooldown, so held Click never stacks it. Q nodes are
 * written for Black Hole, the ultimate the element ships with.
 */
export const SHADOW_GENE_TREE: GeneTree = {
  element: 'shadow',
  name: 'Hopeless Dark',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Snare root: obsidian, knapped to a point on every face. */
    gene({
      id: 'gene-shadow-obsidian-points', name: 'Obsidian Points', tier: 0, col: 0,
      text: 'Shadow Caltrop casts make the foe take +2% damage for 0.6s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 600 })),
      mastery: {
        name: 'Hobbled', cost: PRICE.rootMastery,
        text: 'Hits have a 12% chance to lame the foe: 20% slower for 1.5s (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 4, action: 'slowEnemy', mult: 0.8, durationMs: 1500 }),
      },
    }),
    /** Grasp root: the arm reaches, and the rest of the dark gets on with things. */
    gene({
      id: 'gene-shadow-reaching-dark', name: 'Reaching Dark', tier: 0, col: 1,
      text: 'Tentacle casts shave 250ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'Undertow', cost: PRICE.rootMastery,
        text: 'Tentacle casts make you 10% faster for 3s — the tentacle drags you along behind it',
        grant: onCast('e', { speedMult: 1.1, ms: 3000 }),
      },
    }),
    /** Void root: skin the light slides off. */
    gene({
      id: 'gene-shadow-umbra-skin', name: 'Umbra Skin', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Lights Out', cost: PRICE.rootMastery,
        text: 'The fight opens in the dark: 1.5s of invincibility at the bell',
        grant: effect({ invincibleMs: 1500 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Jaws: the trap goes down hard enough to bite whatever is standing over it. */
    gene({
      id: 'gene-shadow-jaws', name: 'Jaws', tier: 1, col: 0, needs: ['gene-shadow-obsidian-points'],
      text: 'Snap Trap casts slam the jaws open: 8 to everything within 90px',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ burst: { damage: flat(8)(lv), radius: 90 } })),
      mastery: {
        name: 'Hair Trigger', cost: PRICE.t1Mastery,
        text: 'Snap Trap casts have a 15% chance to come straight back — a second trap was already set',
        grant: onCast('r', { refundSelfChance: 0.15 }),
      },
    }),
    /** Writhing Wall: the foe pinned against eight spiked arms has nowhere to flinch. */
    gene({
      id: 'gene-shadow-writhing-wall', name: 'Writhing Wall', tier: 1, col: 1, needs: ['gene-shadow-reaching-dark'],
      text: 'Tentacle Wall casts make the foe take +4% damage for the wall\'s 6s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ damageMult: gain(0.04)(lv), ms: 6000 })),
      mastery: {
        name: 'Thicket of Arms', cost: PRICE.t1Mastery,
        text: 'Tentacle Wall casts burst from the floor round you first: 18 to everything within 120px',
        grant: onCast('f', { burst: { damage: 18, radius: 120 } }),
      },
    }),
    /** Shade Step: you move like a shadow moves — before anyone sees you start. */
    gene({
      id: 'gene-shadow-shade-step', name: 'Shade Step', tier: 1, col: 2, needs: ['gene-shadow-umbra-skin'],
      text: '+2% movement speed',
      maxLevel: 4, cost: PRICE.t1,
      grant: stat((lv) => ({ speedMult: gain(0.02)(lv) })),
      mastery: {
        name: 'Gloaming', cost: PRICE.t1Mastery,
        text: 'When hit, a 20% chance to slip back into shadow: 25% faster for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'tempHaste', mult: 1.25, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Despair: hope is the first thing the dark takes, and it hurts more without. */
    gene({
      id: 'gene-shadow-despair', name: 'Despair', tier: 2, col: 0, needs: ['gene-shadow-jaws'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Abyssal Gaze', cost: PRICE.t2Mastery,
        text: 'The foe deals 5% less damage — a hopeless arm swings half-hearted',
        grant: effect({ enemyDamageMult: 0.95 }),
      },
    }),
    /** Deep Shadow: the tentacle draws something back up its length. */
    gene({
      id: 'gene-shadow-deep-shadow', name: 'Deep Shadow', tier: 2, col: 1, needs: ['gene-shadow-writhing-wall'],
      text: 'Tentacle casts heal you 2 HP',
      maxLevel: 4, cost: PRICE.t2,
      grant: cast('e', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Feeding Dark', cost: PRICE.t2Mastery,
        text: 'Hits have an 8% chance to feed the dark: heal 6 (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.08, cooldownSec: 4, action: 'healBurst', amount: 6 }),
      },
    }),
    /** Darkened Hide: there is more of you in the dark than the light shows. */
    gene({
      id: 'gene-shadow-darkened-hide', name: 'Darkened Hide', tier: 2, col: 2, needs: ['gene-shadow-shade-step'],
      text: '+6 max HP',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ maxHp: flat(6)(lv) })),
      mastery: {
        name: 'Void Mantle', cost: PRICE.t2Mastery,
        text: 'Every 15s the dark closes over you: a shield charge',
        grant: behavior({ trigger: 'everyNSec', periodSec: 15, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Event Horizon: the hole is never quite closed. */
    gene({
      id: 'gene-shadow-event-horizon', name: 'Event Horizon', tier: 3, col: 0, needs: ['gene-shadow-despair'],
      text: '−5% Black Hole (ultimate) cost',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Collapse', cost: PRICE.t3Mastery,
        text: 'Black Hole casts make the foe take +12% damage for the 3s it drags them',
        grant: onCast('q', { damageMult: 1.12, ms: 3000 }),
      },
    }),
    /** Lightless: crosses Snare and Grasp — a trap set is a moment to breathe. */
    gene({
      id: 'gene-shadow-lightless', name: 'Lightless', tier: 3, col: 1,
      needs: ['gene-shadow-deep-shadow', 'gene-shadow-despair'],
      text: 'Snap Trap casts heal you 3 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('r', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Shadow Self', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and your shadow stands you back up at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Umbral Guard: when the hole opens, the dark wraps you first. */
    gene({
      id: 'gene-shadow-umbral-guard', name: 'Umbral Guard', tier: 3, col: 2, needs: ['gene-shadow-darkened-hide'],
      text: 'Black Hole casts give you 8 shield HP',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Eclipse', cost: PRICE.t3Mastery,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more facet knapped on every point. */
    enlightened({
      id: 'gene-shadow-enl-obsidian', name: 'Enlightened Obsidian', col: 0, needs: ['gene-shadow-event-horizon'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the night comes a minute earlier. */
    enlightened({
      id: 'gene-shadow-enl-night', name: 'Enlightened Night', col: 1, needs: ['gene-shadow-lightless'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: hope wears thinner in the foe, a hair at a time. */
    enlightened({
      id: 'gene-shadow-enl-despond', name: 'Enlightened Despond', col: 2, needs: ['gene-shadow-umbral-guard'],
      text: 'The foe deals 0.2% less damage (compounding)',
      grant: stat((lv) => ({ enemyDamageMult: fade(0.002)(lv) })),
    }),
  ],
};
