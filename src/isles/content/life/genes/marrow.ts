import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Red Marrow — Marrow's gene tree.
 *
 * Marrow is an immune system with its ribcage open: Anti-Body Blast coats the foe in antibodies
 * that never fade, Macrosma summons a slow biting macrophage that heals you, Neutralize sends a
 * neutrophil that is meant to die in a web of spiked protein, Dendricles whips five tentacles
 * (land four and the next cast is a T-cell), and Mastacre looses five mast cells that home and
 * detonate five seconds later. Inflammation — the bar that fills as you get hurt — makes the
 * whole board faster. The tree has three lineages: **Adaptive** (antibodies and dendritic cells
 * — marking the body, priming the response), **Innate** (macrophages and neutrophils — the
 * first wave, the cells that burst) and **Skeleton** (bone, callus and the fever that wants to
 * be hit).
 *
 * Anti-Body Blast fires every 440ms, so its window is 0.44s.
 */
export const MARROW_GENE_TREE: GeneTree = {
  element: 'marrow',
  name: 'Red Marrow',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: an antibody tags the body for everything else. */
    gene({
      id: 'gene-marrow-opsonin', name: 'Opsonin', tier: 0, col: 0,
      text: 'Anti-Body Blast casts make the foe take +2% damage for 0.44s',
      maxLevel: 4, cost: linear(5, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 440 })),
      mastery: {
        name: 'Complement Cascade', cost: 12,
        text: 'Hits have a 12% chance to punch pores in the foe that bleed 10 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 3, action: 'sear', amount: 10, durationMs: 3000 }),
      },
    }),
    /** Identity root: the macrophage shares more of what it eats. */
    gene({
      id: 'gene-marrow-phagocyte', name: 'Phagocyte', tier: 0, col: 1,
      text: 'Macrosma casts heal 3 HP',
      maxLevel: 4, cost: linear(5, 2),
      grant: cast('e', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Fever Pitch', cost: 12,
        text: '+1 HP regenerated every second — the inflamed body knits as it burns',
        grant: effect({ regenPerSecond: 1 }),
      },
    }),
    /** Defence root: denser bone round the cavity. */
    gene({
      id: 'gene-marrow-compact-bone', name: 'Compact Bone', tier: 0, col: 2,
      text: '+12 max HP',
      maxLevel: 4, cost: linear(5, 2),
      grant: stat((lv) => ({ maxHp: flat(12)(lv) })),
      mastery: {
        name: 'Periosteum', cost: 12,
        text: 'Start every fight under a 20 HP sheath of bone (shield)',
        grant: effect({ shieldHp: 20 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Antigen Presentation: the tentacles show the board what to hit. */
    gene({
      id: 'gene-marrow-antigen-presentation', name: 'Antigen Presentation', tier: 1, col: 0, needs: ['gene-marrow-opsonin'],
      text: 'Dendricles casts make the foe take +3% damage for 3s',
      maxLevel: 4, cost: linear(6, 3),
      grant: cast('f', (lv) => ({ damageMult: gain(0.03)(lv), ms: 3000 })),
      mastery: {
        name: 'T-Cell Priming', cost: 16,
        text: 'Dendricles casts have a 15% chance to come straight back off cooldown',
        grant: onCast('f', { refundSelfChance: 0.15 }),
      },
    }),
    /** Neutrophil Swarm: one cell spent, and the marrow is already making the next. */
    gene({
      id: 'gene-marrow-neutrophil-swarm', name: 'Neutrophil Swarm', tier: 1, col: 1, needs: ['gene-marrow-phagocyte'],
      text: 'Neutralize casts shave 250ms off every other cooldown',
      maxLevel: 4, cost: linear(6, 3),
      grant: cast('r', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'NET Burst', cost: 16,
        text: 'Neutralize casts throw a net of protein off you: 14 to everything within 110px',
        grant: onCast('r', { burst: { damage: 14, radius: 110 } }),
      },
    }),
    /** Callus: bone that broke once and set thicker. */
    gene({
      id: 'gene-marrow-callus', name: 'Callus', tier: 1, col: 2, needs: ['gene-marrow-compact-bone'],
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(6, 3),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Scar Tissue', cost: 16,
        text: 'When hit, a 15% chance to lay down scar tissue — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Cytokine Storm: every cell on the board bites a little harder. */
    gene({
      id: 'gene-marrow-cytokine', name: 'Cytokine Storm', tier: 2, col: 0, needs: ['gene-marrow-antigen-presentation'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Killer Cell', cost: 20,
        text: '+5% crit chance',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Pyrexia: the spiked web grinds longer and harder. */
    gene({
      id: 'gene-marrow-pyrexia', name: 'Pyrexia', tier: 2, col: 1, needs: ['gene-marrow-neutrophil-swarm'],
      text: '+4% status damage and +4% status duration',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ statusDmgMult: gain(0.04)(lv), statusDurMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Inflamed', cost: 20,
        text: 'When hit, a 20% chance the fever spikes: +15% move speed for 3s (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 6, action: 'tempHaste', mult: 1.15, durationMs: 3000 }),
      },
    }),
    /** Ossify: what strikes the open ribcage strikes bone. */
    gene({
      id: 'gene-marrow-ossify', name: 'Ossify', tier: 2, col: 2, needs: ['gene-marrow-callus'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Rib Cage', cost: 20,
        text: 'When hit, a 20% chance the ribs snap shut on the attacker: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Degranulation: the mast cells refill sooner. */
    gene({
      id: 'gene-marrow-degranulation', name: 'Degranulation', tier: 3, col: 0, needs: ['gene-marrow-cytokine'],
      text: '−5% Mastacre (ultimate) cooldown',
      maxLevel: 3, cost: linear(13, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Histamine Storm', cost: 26,
        text: 'Mastacre casts make the foe take +20% damage for 6s — through the detonation',
        grant: onCast('q', { damageMult: 1.2, ms: 6000 }),
      },
    }),
    /** Transfusion: crosses Adaptive and Innate — each macrophage brings a little blood back. */
    gene({
      id: 'gene-marrow-transfusion', name: 'Transfusion', tier: 3, col: 1,
      needs: ['gene-marrow-pyrexia', 'gene-marrow-cytokine'],
      text: 'Macrosma casts give 5 shield HP',
      maxLevel: 4, cost: linear(10, 4),
      grant: cast('e', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Stem Cells', cost: 28,
        text: 'Once per fight, a lethal hit is cancelled and the marrow rebuilds you at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Red Reserve: the blood the marrow keeps back for the worst day. */
    gene({
      id: 'gene-marrow-red-reserve', name: 'Red Reserve', tier: 3, col: 2, needs: ['gene-marrow-ossify'],
      text: 'The first time you fall below 30% HP, heal 12',
      maxLevel: 3, cost: linear(13, 4),
      grant: stat((lv) => ({ behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: flat(12)(lv) }] })),
      mastery: {
        name: 'Ivory', cost: 26,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: an antibody that remembers every body it ever met. */
    enlightened({
      id: 'gene-marrow-enl-memory', name: 'Enlightened Memory', col: 0, needs: ['gene-marrow-degranulation'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the marrow making cells a little faster, always. */
    enlightened({
      id: 'gene-marrow-enl-blood', name: 'Enlightened Blood', col: 1, needs: ['gene-marrow-transfusion'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more layer of bone, forever. */
    enlightened({
      id: 'gene-marrow-enl-bone', name: 'Enlightened Bone', col: 2, needs: ['gene-marrow-red-reserve'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
