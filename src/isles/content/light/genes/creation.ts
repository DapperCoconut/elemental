import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Workbench — Creation's gene tree.
 *
 * Creation is an artificer: Dagger Spray's fan of blades that converge on the cursor, Charged
 * Bolts (copper, silver, gold) loaded two at a time into the Nexus to brew a potion, the Wrench
 * in your Plans that makes every ability the foe uses cost them HP, Create's dragged-out
 * barrier, and the big red Self-Destruct button that blows up everything you built. The tree
 * has three benches: **Forge** (the wrench, the daggers and the big red button — the workshop
 * that bites), **Nexus** (bolts and barriers — parts coming off the line faster) and
 * **Bulwark** (riveted aprons, plating and blast shields — the workshop that holds).
 *
 * Create pays only for a real block (a drag under 12px builds nothing and stamps nothing);
 * Self-Destruct refuses without a cast when nothing stands to blow. Build Mode's own keys (block
 * launch, speed pad, spike block) are run by the kit with no cast, so they pay nothing. Dagger
 * Spray re-arms in 500ms, so its window is exactly that and never stacks on itself.
 */
export const CREATION_GENE_TREE: GeneTree = {
  element: 'creation',
  name: 'Workbench',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: a foe with a wrench in their works is a foe coming apart. */
    gene({
      id: 'gene-creation-monkey-wrench', name: 'Monkey Wrench', tier: 0, col: 0,
      text: 'Wrench casts make the foe take +4% damage for 5s — as long as the wrench bites',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('r', (lv) => ({ damageMult: gain(0.04)(lv), ms: 5000 })),
      mastery: {
        name: 'Backswing', cost: PRICE.rootMastery,
        text: 'Wrench casts swing the handle round you on the way out: 16 to everything within 100px',
        grant: onCast('r', { burst: { damage: 16, radius: 100 } }),
      },
    }),
    /** Identity root: a slug off the anvil, and the rest of the bench is already warm. */
    gene({
      id: 'gene-creation-quick-quench', name: 'Quick Quench', tier: 0, col: 1,
      text: 'Charged Bolt casts shave 200ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ refundOthers: flat(200)(lv) })),
      mastery: {
        name: 'Spare Slug', cost: PRICE.rootMastery,
        text: 'Charged Bolt casts have a 15% chance to come straight back — one more in the apron pocket',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: leather and brass rivets, scorched by every glassblower's furnace on the isle. */
    gene({
      id: 'gene-creation-riveted-apron', name: 'Riveted Apron', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Hard Hat', cost: PRICE.rootMastery,
        text: 'Start every fight with a shield charge — the first falling thing bounces off',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Whetstone: a fresh fan of blades, and the foe flinches from every edge. */
    gene({
      id: 'gene-creation-whetstone', name: 'Whetstone', tier: 1, col: 0, needs: ['gene-creation-monkey-wrench'],
      text: 'Dagger Spray casts make the foe take +2% damage for 0.5s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 500 })),
      mastery: {
        name: 'Serrated', cost: PRICE.t1Mastery,
        text: 'Hits have a 10% chance to leave a serrated cut: 10 over 2.5s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 10, durationMs: 2500 }),
      },
    }),
    /** Alloy: a barrier poured from the right mix sets before the next job starts. */
    gene({
      id: 'gene-creation-alloy', name: 'Alloy', tier: 1, col: 1, needs: ['gene-creation-quick-quench'],
      text: 'Create casts shave 300ms off every other cooldown',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ refundOthers: flat(300)(lv) })),
      mastery: {
        name: 'Prefab', cost: PRICE.t1Mastery,
        text: 'Create casts have a 15% chance to come straight back — the next panel was already cut',
        grant: onCast('f', { refundSelfChance: 0.15 }),
      },
    }),
    /** Load-Bearing: the wall you raise braces you as well. */
    gene({
      id: 'gene-creation-load-bearing', name: 'Load-Bearing', tier: 1, col: 2, needs: ['gene-creation-riveted-apron'],
      text: 'Create casts give you 4 shield HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ shield: flat(4)(lv) })),
      mastery: {
        name: 'Spiked Plating', cost: PRICE.t1Mastery,
        text: 'Reflect 8% of damage taken back at the attacker — the plates were bolted on point-out',
        grant: effect({ reflectFraction: 0.08 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Tempered: every blade and bolt quenched twice. */
    gene({
      id: 'gene-creation-tempered', name: 'Tempered', tier: 2, col: 0, needs: ['gene-creation-whetstone'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Overclock', cost: PRICE.t2Mastery,
        text: 'When hit, a 15% chance the engine redlines: +30% damage for 2s (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'tempDamage', mult: 1.3, durationMs: 2000 }),
      },
    }),
    /** Assembly Line: the parts arrive at the bench before you reach for them. */
    gene({
      id: 'gene-creation-assembly-line', name: 'Assembly Line', tier: 2, col: 1, needs: ['gene-creation-alloy'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Conveyor', cost: PRICE.t2Mastery,
        text: 'Every 6s the belt clanks forward and every cooldown skips 0.35s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 6, action: 'cooldownRefund', amount: 350 }),
      },
    }),
    /** Scrap Plating: whatever is left on the floor gets riveted on. */
    gene({
      id: 'gene-creation-scrap-plating', name: 'Scrap Plating', tier: 2, col: 2, needs: ['gene-creation-load-bearing'],
      text: '+5 max HP',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ maxHp: flat(5)(lv) })),
      mastery: {
        name: 'Field Repair', cost: PRICE.t2Mastery,
        text: 'Every 12s you tighten a loose rivet: heal 8',
        grant: behavior({ trigger: 'everyNSec', periodSec: 12, action: 'healBurst', amount: 8 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Big Red Button: the orbital beam is rewired for another run sooner. */
    gene({
      id: 'gene-creation-big-red-button', name: 'Big Red Button', tier: 3, col: 0, needs: ['gene-creation-tempered'],
      text: '−5% Self-Destruct (ultimate) cooldown',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Chain Reaction', cost: PRICE.t3Mastery,
        text: 'Self-Destruct casts blow the button panel too: 24 to everything within 140px',
        grant: onCast('q', { burst: { damage: 24, radius: 140 } }),
      },
    }),
    /** Potion Craft: crosses Forge and Nexus — a wrench thrown is a hand free for the flask. */
    gene({
      id: 'gene-creation-potion-craft', name: 'Potion Craft', tier: 3, col: 1,
      needs: ['gene-creation-assembly-line', 'gene-creation-tempered'],
      text: 'Wrench casts heal 3 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('r', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Spare Parts', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and you bolt yourself back together at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Blast Shield: the one sheet of steel you never build into anything. */
    gene({
      id: 'gene-creation-blast-shield', name: 'Blast Shield', tier: 3, col: 2, needs: ['gene-creation-scrap-plating'],
      text: 'Self-Destruct casts give you 8 shield HP — before the shrapnel lands',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Bulkhead', cost: PRICE.t3Mastery,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more grind on the edge, every batch. */
    enlightened({
      id: 'gene-creation-enl-edge', name: 'Enlightened Edge', col: 0, needs: ['gene-creation-big-red-button'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the line runs a hair faster after every shift. */
    enlightened({
      id: 'gene-creation-enl-line', name: 'Enlightened Line', col: 1, needs: ['gene-creation-potion-craft'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more plate riveted on, forever. */
    enlightened({
      id: 'gene-creation-enl-plate', name: 'Enlightened Plate', col: 2, needs: ['gene-creation-blast-shield'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
