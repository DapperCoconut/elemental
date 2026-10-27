import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Germline — Growth's gene tree.
 *
 * Growth is a culture dish that fights: Bacterium flicks from the hand, Virus infects the foe so
 * it sheds viruses onto the floor, Spore Spray lays a wall of growing spores, Evolve opens the
 * DNA tree mid-fight, and Auxiliary Growth spends DNA on a nest that hatches a clone. The tree
 * has three strains: **Motile** (the bacterium's flagellum, every strand of you quicker),
 * **Virulent** (Virus — a body that is infected is a body that breaks, and the infection comes
 * back round sooner) and **Encysted** (Spore Spray and the cell wall — the dish that will not die).
 *
 * Evolve's own cooldown is 200ms (it is a menu with a 20s invincible gray phase on top), so no
 * node keys off E. Auxiliary Growth is paid for in DNA, not time, so its node is a hatching
 * shield rather than an ultimate-cooldown cut.
 */
export const GROWTH_GENE_TREE: GeneTree = {
  element: 'growth',
  name: 'Germline',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Speed root: a longer whip on the tail. */
    gene({
      id: 'gene-growth-flagellum', name: 'Flagellum', tier: 0, col: 0,
      text: 'Bacterium casts give +4% move speed for 0.7s',
      maxLevel: 4, cost: linear(5, 2),
      grant: cast('click', (lv) => ({ speedMult: gain(0.04)(lv), ms: 700 })),
      mastery: {
        name: 'Swarm Drift', cost: 12,
        text: '+5% move speed',
        grant: effect({ speedMult: 1.05 }),
      },
    }),
    /** Identity root: an infected body is a weaker body. */
    gene({
      id: 'gene-growth-viral-load', name: 'Viral Load', tier: 0, col: 1,
      text: 'Virus casts make the foe take +3% damage for 4s',
      maxLevel: 4, cost: linear(5, 2),
      grant: cast('r', (lv) => ({ damageMult: gain(0.03)(lv), ms: 4000 })),
      mastery: {
        name: 'Viral Shedding', cost: 12,
        text: 'Hits have a 12% chance to seed an infection that eats 10 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 3, action: 'sear', amount: 10, durationMs: 3000 }),
      },
    }),
    /** Defence root: a thicker wall around the cell. */
    gene({
      id: 'gene-growth-cell-wall', name: 'Cell Wall', tier: 0, col: 2,
      text: '+12 max HP',
      maxLevel: 4, cost: linear(5, 2),
      grant: stat((lv) => ({ maxHp: flat(12)(lv) })),
      mastery: {
        name: 'Capsule', cost: 12,
        text: 'Start every fight in a 20 HP slime capsule shield',
        grant: effect({ shieldHp: 20 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Binary Fission: every bacterium you loose splits the work of the others. */
    gene({
      id: 'gene-growth-binary-fission', name: 'Binary Fission', tier: 1, col: 0, needs: ['gene-growth-flagellum'],
      text: 'Bacterium casts shave 25ms off every other cooldown',
      maxLevel: 4, cost: linear(6, 3),
      grant: cast('click', (lv) => ({ refundOthers: flat(25)(lv) })),
      mastery: {
        name: 'Conjugation', cost: 16,
        text: 'Spore Spray casts make the foe take +12% damage for the 5s the spores take to mature',
        grant: onCast('f', { damageMult: 1.12, ms: 5000 }),
      },
    }),
    /** Lytic Cycle: the virus bursts the cell and the next one is ready. */
    gene({
      id: 'gene-growth-lytic-cycle', name: 'Lytic Cycle', tier: 1, col: 1, needs: ['gene-growth-viral-load'],
      text: 'Virus casts shave 250ms off every other cooldown',
      maxLevel: 4, cost: linear(6, 3),
      grant: cast('r', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'Replication', cost: 16,
        text: 'Virus casts have a 15% chance to come straight back off cooldown',
        grant: onCast('r', { refundSelfChance: 0.15 }),
      },
    }),
    /** Sporulation: the spores you spray leave a coat on you too. */
    gene({
      id: 'gene-growth-sporulation', name: 'Sporulation', tier: 1, col: 2, needs: ['gene-growth-cell-wall'],
      text: 'Spore Spray casts give 6 shield HP',
      maxLevel: 4, cost: linear(6, 3),
      grant: cast('f', (lv) => ({ shield: flat(6)(lv) })),
      mastery: {
        name: 'Puffball', cost: 16,
        text: 'Spore Spray casts puff a cloud round you first: 14 to everything within 110px',
        grant: onCast('f', { burst: { damage: 14, radius: 110 } }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Point Mutation: one base pair changed, and the culture bites harder. */
    gene({
      id: 'gene-growth-point-mutation', name: 'Point Mutation', tier: 2, col: 0, needs: ['gene-growth-binary-fission'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Toxin Gene', cost: 20,
        text: '+5% crit chance',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Incubation: an infection that lasts longer and hurts more. */
    gene({
      id: 'gene-growth-incubation', name: 'Incubation', tier: 2, col: 1, needs: ['gene-growth-lytic-cycle'],
      text: '+4% status damage and +4% status duration',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ statusDmgMult: gain(0.04)(lv), statusDurMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Mitosis', cost: 20,
        text: 'Every 9s you split and keep the better half: heal 5',
        grant: behavior({ trigger: 'everyNSec', periodSec: 9, action: 'healBurst', amount: 5 }),
      },
    }),
    /** Biofilm: a slick of colony over every wound, slowly closing it. */
    gene({
      id: 'gene-growth-biofilm', name: 'Biofilm', tier: 2, col: 2, needs: ['gene-growth-sporulation'],
      text: '+0.5 HP regenerated every second',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ regenPerSecond: flat(0.5)(lv) })),
      mastery: {
        name: 'Antigenic Drift', cost: 20,
        text: '+5% dodge chance — the foe keeps aiming at the strain you were',
        grant: effect({ dodgeChance: 0.05 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Exponential Phase: the culture doubling, and doubling again. */
    gene({
      id: 'gene-growth-exponential-phase', name: 'Exponential Phase', tier: 3, col: 0, needs: ['gene-growth-point-mutation'],
      text: '−4% cooldowns',
      maxLevel: 3, cost: linear(13, 4),
      grant: stat((lv) => ({ cooldownMult: cut(0.04)(lv) })),
      mastery: {
        name: 'Hatchling\'s Gift', cost: 26,
        text: 'Auxiliary Growth casts wrap you in 25 shield HP while the nest hatches',
        grant: onCast('q', { shield: 25 }),
      },
    }),
    /** Symbiont: crosses Motile and Virulent — every spore wall feeds the body behind it. */
    gene({
      id: 'gene-growth-symbiont', name: 'Symbiont', tier: 3, col: 1,
      needs: ['gene-growth-incubation', 'gene-growth-point-mutation'],
      text: 'Spore Spray casts heal 4 HP',
      maxLevel: 4, cost: linear(10, 4),
      grant: cast('f', (lv) => ({ heal: flat(4)(lv) })),
      mastery: {
        name: 'Primordial Soup', cost: 28,
        text: 'Once per fight, a lethal hit is cancelled and you re-form from the soup at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Endospore: when the dish dries out, the culture goes dormant and waits. */
    gene({
      id: 'gene-growth-endospore', name: 'Endospore', tier: 3, col: 2, needs: ['gene-growth-biofilm'],
      text: 'The first time you fall below 30% HP, heal 12',
      maxLevel: 3, cost: linear(13, 4),
      grant: stat((lv) => ({ behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: flat(12)(lv) }] })),
      mastery: {
        name: 'Resistant Strain', cost: 26,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: a mutation that never stops paying off. */
    enlightened({
      id: 'gene-growth-enl-strain', name: 'Enlightened Strain', col: 0, needs: ['gene-growth-exponential-phase'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: a generation that turns over a little faster each time. */
    enlightened({
      id: 'gene-growth-enl-generation', name: 'Enlightened Generation', col: 1, needs: ['gene-growth-symbiont'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more cell in the colony, forever. */
    enlightened({
      id: 'gene-growth-enl-colony', name: 'Enlightened Colony', col: 2, needs: ['gene-growth-endospore'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
