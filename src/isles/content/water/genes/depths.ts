import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Leviathan Lung — Depths' gene tree.
 *
 * Depths is the trench's angler and its hunter, and the tree is the food chain: **Shoal**
 * (Piranhas that soften, a Lungfish Strike that drags them under, the Megalodon at the top),
 * **Lure** (the patient half — Angler's wait, Eutrophication's bloom, gills that keep you
 * breathing long after the foe has run out of air) and **Hull** (the pressure a body learns at
 * the bottom of the sea: cold water, the bends for whoever hits you, a hadal last breath).
 */
export const DEPTHS_GENE_TREE: GeneTree = {
  element: 'depths',
  name: 'Leviathan Lung',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: every Piranha that latches on tells the rest of the shoal where to bite. */
    gene({
      id: 'gene-depths-schooling', name: 'Schooling', tier: 0, col: 0,
      text: 'Piranha casts make the foe take +3% damage for 1.2s',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.03)(lv), ms: 1200 })),
      mastery: {
        name: 'Blood in the Water', cost: 10,
        text: '+8% status damage — the chewing never lets up',
        grant: effect({ statusDmgMult: 1.08 }),
      },
    }),
    /** Identity root: sitting still on the Angler's wait, the water wraps around you. */
    gene({
      id: 'gene-depths-patient-line', name: 'Patient Line', tier: 0, col: 1,
      text: 'Angler casts give 4 shield HP while you wait for a bite',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('f', (lv) => ({ shield: flat(4)(lv) })),
      mastery: {
        name: 'Lucky Catch', cost: 10,
        text: 'Angler casts have a 15% chance to come straight back off cooldown',
        grant: onCast('f', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: a swim bladder that holds you up under any weight of sea. */
    gene({
      id: 'gene-depths-swim-bladder', name: 'Swim Bladder', tier: 0, col: 2,
      text: '+12 max HP',
      maxLevel: 4, cost: linear(4, 2),
      grant: stat((lv) => ({ maxHp: flat(12)(lv) })),
      mastery: {
        name: 'Abyssal Skin', cost: 10,
        text: 'Start every fight under a 20 HP shell of trench-hardened skin',
        grant: effect({ shieldHp: 20 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Lungfish Lunge: the dash-and-slash keeps its momentum. */
    gene({
      id: 'gene-depths-lungfish-lunge', name: 'Lungfish Lunge', tier: 1, col: 0, needs: ['gene-depths-schooling'],
      text: 'Lungfish Strike casts give +8% move speed for 1.2s',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('e', (lv) => ({ speedMult: gain(0.08)(lv), ms: 1200 })),
      mastery: {
        name: 'Drag Under', cost: 14,
        text: 'Lungfish Strike casts make the foe take +25% damage for 5s — the length of their air',
        grant: onCast('e', { damageMult: 1.25, ms: 5000 }),
      },
    }),
    /** Algal Bloom: the one who seeds the bloom gets the first mouthful. */
    gene({
      id: 'gene-depths-algal-bloom', name: 'Algal Bloom', tier: 1, col: 1, needs: ['gene-depths-patient-line'],
      text: 'Eutrophication casts heal 4 HP',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('r', (lv) => ({ heal: flat(4)(lv) })),
      mastery: {
        name: 'Red Tide', cost: 14,
        text: 'Eutrophication casts shave 1.5s off every other cooldown',
        grant: onCast('r', { refundOthers: 1500 }),
      },
    }),
    /** Cold Water: nothing reaches you at full strength through that much sea. */
    gene({
      id: 'gene-depths-cold-water', name: 'Cold Water', tier: 1, col: 2, needs: ['gene-depths-swim-bladder'],
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(5, 3),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'The Bends', cost: 14,
        text: 'When hit, a 15% chance to give the attacker the bends: 30% slower for 2s (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'slowEnemy', mult: 0.7, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Serrated Teeth: more teeth, and further back. */
    gene({
      id: 'gene-depths-serrated-teeth', name: 'Serrated Teeth', tier: 2, col: 0, needs: ['gene-depths-lungfish-lunge'],
      text: '+2% crit chance',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ critChance: flat(0.02)(lv) })),
      mastery: {
        name: 'Feeding Frenzy', cost: 18,
        text: 'Hits have a 10% chance to give you +20% damage for 2s (at most every 6s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 6, action: 'tempDamage', mult: 1.2, durationMs: 2000 }),
      },
    }),
    /** Gill Breathing: you never run out of air down here. They do. */
    gene({
      id: 'gene-depths-gill-breathing', name: 'Gill Breathing', tier: 2, col: 1, needs: ['gene-depths-algal-bloom'],
      text: '+0.5 HP regenerated every second',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ regenPerSecond: flat(0.5)(lv) })),
      mastery: {
        name: 'Benthic Calm', cost: 18,
        text: 'Every 10s, the still water mends you for 6',
        grant: behavior({ trigger: 'everyNSec', periodSec: 10, action: 'healBurst', amount: 6 }),
      },
    }),
    /** Pressure Dark: whatever comes down after you arrives weaker. */
    gene({
      id: 'gene-depths-pressure-dark', name: 'Pressure Dark', tier: 2, col: 2, needs: ['gene-depths-cold-water'],
      text: 'The foe deals 2% less damage',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ enemyDamageMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Crushing Depth', cost: 18,
        text: 'Reflect 6% of damage taken back at the attacker',
        grant: effect({ reflectFraction: 0.06 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Megalodon Hunger: the shark is hungry again sooner. */
    gene({
      id: 'gene-depths-megalodon-hunger', name: 'Megalodon Hunger', tier: 3, col: 0, needs: ['gene-depths-serrated-teeth'],
      text: '−5% Megalodon (ultimate) cooldown',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Jaws', cost: 24,
        text: 'Megalodon casts make the foe take +15% damage for the 8s it holds them',
        grant: onCast('q', { damageMult: 1.15, ms: 8000 }),
      },
    }),
    /** Bottom Feeder: crosses Lure and Shoal — what the shoal tears loose drifts down to you. */
    gene({
      id: 'gene-depths-bottom-feeder', name: 'Bottom Feeder', tier: 3, col: 1,
      needs: ['gene-depths-gill-breathing', 'gene-depths-serrated-teeth'],
      text: '1% of the damage you deal comes back to you as health',
      maxLevel: 4, cost: linear(9, 4),
      grant: stat((lv) => ({ lifestealFrac: flat(0.01)(lv) })),
      mastery: {
        name: 'Second Gill', cost: 26,
        text: 'Once per fight, a lethal hit is cancelled and you surface again at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Hadal Zone: the deepest water there is keeps one breath back for you. */
    gene({
      id: 'gene-depths-hadal-zone', name: 'Hadal Zone', tier: 3, col: 2, needs: ['gene-depths-pressure-dark'],
      text: 'The first time you fall below 30% HP, heal 12',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: flat(12)(lv) }] })),
      mastery: {
        name: 'Trench Pressure', cost: 24,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: the bite that keeps getting bigger. */
    enlightened({
      id: 'gene-depths-enl-bite', name: 'Enlightened Bite', col: 0, needs: ['gene-depths-megalodon-hunger'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the gill that keeps getting wider. */
    enlightened({
      id: 'gene-depths-enl-gill', name: 'Enlightened Gill', col: 1, needs: ['gene-depths-bottom-feeder'],
      text: '+0.05 HP regenerated every second',
      grant: stat((lv) => ({ regenPerSecond: flat(0.05)(lv) })),
    }),
    /** Enlightened: the trench that has no bottom. */
    enlightened({
      id: 'gene-depths-enl-trench', name: 'Enlightened Trench', col: 2, needs: ['gene-depths-hadal-zone'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
