import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Sonar — Echo's gene tree.
 *
 * Echo is a cave bat: Echolocation's shockwave bouncing off the walls, Guess's blind strike at
 * the cursor (right pays, wrong slows you), Lantern for sight or an Echo of the foe, Bat Form to
 * shrink and fly or latch on and drain, and Total Eclipse. The tree has three galleries:
 * **Ricochet** (the shout and the Lantern — what the walls send back), **Wing** (Guess and Bat
 * Form — knowing where they are, and getting there) and **Roost** (hide, hearing and the long
 * dark of the Eclipse).
 *
 * Echolocation's cooldown is 2s, so its window is 2s — it never stacks on itself. Every cast
 * reports through `startCooldown`; Bat Form's free Alpha Bat cancel and an empty Beacon refusal
 * report nothing, so neither pays out.
 */
export const ECHO_GENE_TREE: GeneTree = {
  element: 'echo',
  name: 'Sonar',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: each bounce of the shout rattles the foe a little more. */
    gene({
      id: 'gene-echo-ricochet', name: 'Ricochet', tier: 0, col: 0,
      text: 'Echolocation casts make the foe take +2% damage for 2s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 2000 })),
      mastery: {
        name: 'Hard Walls', cost: PRICE.rootMastery,
        text: 'Echolocation casts have a 12% chance to come straight back — the cave answered twice',
        grant: onCast('click', { refundSelfChance: 0.12 }),
      },
    }),
    /** Identity root: a guess made, and the rest of the kit is already moving. */
    gene({
      id: 'gene-echo-educated-guess', name: 'Educated Guess', tier: 0, col: 1,
      text: 'Guess casts shave 300ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ refundOthers: flat(300)(lv) })),
      mastery: {
        name: 'Second Sight', cost: PRICE.rootMastery,
        text: '+5% crit chance — some guesses are not guesses',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Defence root: wing-leather that has brushed every stalactite in the cave. */
    gene({
      id: 'gene-echo-leather-wings', name: 'Leather Wings', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Roost', cost: PRICE.rootMastery,
        text: 'Start every fight wrapped in your wings: 22 shield HP',
        grant: effect({ shieldHp: 22 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Lantern Glare: a foe caught in the lamp cannot find the dark to hide in. */
    gene({
      id: 'gene-echo-lantern-glare', name: 'Lantern Glare', tier: 1, col: 0, needs: ['gene-echo-ricochet'],
      text: 'Lantern casts make the foe take +4% damage for 4s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ damageMult: gain(0.04)(lv), ms: 4000 })),
      mastery: {
        name: 'Wick Flare', cost: PRICE.t1Mastery,
        text: 'Lantern casts flare the wick: 14 to everything within 100px of you',
        grant: onCast('r', { burst: { damage: 14, radius: 100 } }),
      },
    }),
    /** Night Flight: the bat keeps its speed a beat after the wings fold. */
    gene({
      id: 'gene-echo-night-flight', name: 'Night Flight', tier: 1, col: 1, needs: ['gene-echo-educated-guess'],
      text: 'Bat Form casts give +5% move speed for 4s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ speedMult: gain(0.05)(lv), ms: 4000 })),
      mastery: {
        name: 'Blood Meal', cost: PRICE.t1Mastery,
        text: 'Bat Form casts heal 8 HP — a sip before the flight',
        grant: onCast('f', { heal: 8 }),
      },
    }),
    /** Sonar Shell: half-size, and wrapped in its own returning ping. */
    gene({
      id: 'gene-echo-sonar-shell', name: 'Sonar Shell', tier: 1, col: 2, needs: ['gene-echo-leather-wings'],
      text: 'Bat Form casts give you 5 shield HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Startle', cost: PRICE.t1Mastery,
        text: 'When hit, a 15% chance to shriek in their ear: 20% slower for 2s (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'slowEnemy', mult: 0.8, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Resonance: the cave adds its own voice to every blow. */
    gene({
      id: 'gene-echo-resonance', name: 'Resonance', tier: 2, col: 0, needs: ['gene-echo-lantern-glare'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Harmonic', cost: PRICE.t2Mastery,
        text: 'Hits have an 8% chance to ring the rock: 14 to everything within 100px (at most every 5s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.08, cooldownSec: 5, action: 'burstAoe', amount: 14, radius: 100 }),
      },
    }),
    /** Cave Sense: you hear the swing before you see it. */
    gene({
      id: 'gene-echo-cave-sense', name: 'Cave Sense', tier: 2, col: 1, needs: ['gene-echo-night-flight'],
      text: '+2% dodge chance',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ dodgeChance: flat(0.02)(lv) })),
      mastery: {
        name: 'Perfect Pitch', cost: PRICE.t2Mastery,
        text: 'Every 15s the dark tells you what is coming: gain a shield charge',
        grant: behavior({ trigger: 'everyNSec', periodSec: 15, action: 'shieldCharge', amount: 1 }),
      },
    }),
    /** Reverb: what is shouted at you comes back off the walls. */
    gene({
      id: 'gene-echo-reverb', name: 'Reverb', tier: 2, col: 2, needs: ['gene-echo-sonar-shell'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Hang Upside Down', cost: PRICE.t2Mastery,
        text: '+1 HP regenerated every second — blood to the head',
        grant: effect({ regenPerSecond: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Long Night: the Eclipse comes round again sooner. */
    gene({
      id: 'gene-echo-long-night', name: 'Long Night', tier: 3, col: 0, needs: ['gene-echo-resonance'],
      text: '−5% Total Eclipse (ultimate) cooldown',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Darkest Hour', cost: PRICE.t3Mastery,
        text: 'Total Eclipse casts make the foe take +12% damage for 4s — the whole reveal',
        grant: onCast('q', { damageMult: 1.12, ms: 4000 }),
      },
    }),
    /** Afterimage: crosses Ricochet and Wing — a right guess warms the blood. */
    gene({
      id: 'gene-echo-afterimage', name: 'Afterimage', tier: 3, col: 1,
      needs: ['gene-echo-cave-sense', 'gene-echo-resonance'],
      text: 'Guess casts heal 2 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('e', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Echo of an Echo', cost: PRICE.crossMastery,
        text: '4% of the damage you deal comes back to you as health',
        grant: effect({ lifestealFrac: 0.04 }),
      },
    }),
    /** Cavern Calm: under the Eclipse the bat settles, wrapped and still. */
    gene({
      id: 'gene-echo-cavern-calm', name: 'Cavern Calm', tier: 3, col: 2, needs: ['gene-echo-reverb'],
      text: 'Total Eclipse casts give you 8 shield HP',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Stone Roof', cost: PRICE.t3Mastery,
        text: '+25 max HP',
        grant: effect({ maxHp: 25 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: the guess gets a little surer every time it is made. */
    enlightened({
      id: 'gene-echo-enl-ping', name: 'Enlightened Ping', col: 0, needs: ['gene-echo-long-night'],
      text: '+0.2% crit chance',
      grant: stat((lv) => ({ critChance: flat(0.002)(lv) })),
    }),
    /** Enlightened: the cave's answer comes back a fraction faster. */
    enlightened({
      id: 'gene-echo-enl-return', name: 'Enlightened Return', col: 1, needs: ['gene-echo-afterimage'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more layer of drip-stone over the roost. */
    enlightened({
      id: 'gene-echo-enl-stone', name: 'Enlightened Stone', col: 2, needs: ['gene-echo-cavern-calm'],
      text: '−0.3% damage taken (compounding)',
      grant: stat((lv) => ({ damageTakenMult: fade(0.003)(lv) })),
    }),
  ],
};
