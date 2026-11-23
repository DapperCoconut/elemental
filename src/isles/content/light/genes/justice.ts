import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Magistracy — Justice's gene tree.
 *
 * Justice fights in two stances on one bar. On the ground: Spear Thrust, the Coliseum ring,
 * Sheer Will (burning Willpower for speed and a grudge), take to the air, and Judgement Day —
 * the foe weighed on the scales by the raw damage they have done you. In the air: Spear of
 * Heaven, the Bind chain that rips a wall out, Pillar of Flame, Descend, and Seraphim's Gaze. So
 * every key means two abilities, and every node below names both. The tree has three benches:
 * **Spear** (the ring and the sentence — the verdict that hurts), **Wings** (stance swaps and the
 * chain — the court in motion) and **Scales** (robes, oaths and sanctuary — the law that holds).
 *
 * No node keys off Click (the F+ axe re-fires every 100ms on a held button) or R (Sheer Will
 * re-presses every 1.2s, and its release and a dry "No willpower" press both stamp a cast). E is
 * paid on the Coliseum or the chain's throw; ripping the wall out is a free recast and pays
 * nothing. Damage reduction here pardons nobody: Judgement Day reads the tally before mitigation.
 */
export const JUSTICE_GENE_TREE: GeneTree = {
  element: 'justice',
  name: 'Magistracy',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: fenced in or chained, the accused is in no position to argue. */
    gene({
      id: 'gene-justice-contempt', name: 'Contempt of Court', tier: 0, col: 0,
      text: 'Coliseum or Bind casts make the foe take +4% damage for 3s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ damageMult: gain(0.04)(lv), ms: 3000 })),
      mastery: {
        name: 'Cornerstone', cost: PRICE.rootMastery,
        text: 'Coliseum or Bind casts crack the marble round you: 16 to everything within 100px',
        grant: onCast('e', { burst: { damage: 16, radius: 100 } }),
      },
    }),
    /** Identity root: the Valkyrie never lands or lifts without a step in it. */
    gene({
      id: 'gene-justice-valkyrie-stride', name: "Valkyrie's Stride", tier: 0, col: 1,
      text: 'Taking wing or Descending gives +4% move speed for 2.5s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('f', (lv) => ({ speedMult: gain(0.04)(lv), ms: 2500 })),
      mastery: {
        name: 'Second Wind', cost: PRICE.rootMastery,
        text: 'Taking wing or Descending shaves 200ms off every other cooldown',
        grant: onCast('f', { refundOthers: 200 }),
      },
    }),
    /** Defence root: the oath sworn on taking the bench, worn under the robe like mail. */
    gene({
      id: 'gene-justice-oath-of-office', name: 'Oath of Office', tier: 0, col: 2,
      text: '−2% damage taken (the scales still weigh every blow before it is softened)',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: "Gavel's Rest", cost: PRICE.rootMastery,
        text: 'Every 14s the gavel comes down and you gain a shield charge',
        grant: behavior({ trigger: 'everyNSec', periodSec: 14, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Sentencing: in chains or in a trance, the condemned takes everything that is coming. */
    gene({
      id: 'gene-justice-sentencing', name: 'Sentencing', tier: 1, col: 0, needs: ['gene-justice-contempt'],
      text: "Judgement Day or Seraphim's Gaze casts make the foe take +5% damage for 8s",
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('q', (lv) => ({ damageMult: gain(0.05)(lv), ms: 8000 })),
      mastery: {
        name: 'Capital Verdict', cost: PRICE.t1Mastery,
        text: 'Ultimate casts strike where you stand when the scene opens: 22 to everything within 140px',
        grant: onCast('q', { burst: { damage: 22, radius: 140 } }),
      },
    }),
    /** Updraft: a ring raised or a chain thrown, and the court moves on to the next case. */
    gene({
      id: 'gene-justice-updraft', name: 'Updraft', tier: 1, col: 1, needs: ['gene-justice-valkyrie-stride'],
      text: 'Coliseum or Bind casts shave 300ms off every other cooldown',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('e', (lv) => ({ refundOthers: flat(300)(lv) })),
      mastery: {
        name: 'Talon Grip', cost: PRICE.t1Mastery,
        text: 'Coliseum or Bind casts have a 15% chance to come straight back — a second chain on the belt',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Aegis Column: one pillar of the ring stands at your back as well. */
    gene({
      id: 'gene-justice-aegis-column', name: 'Aegis Column', tier: 1, col: 2, needs: ['gene-justice-oath-of-office'],
      text: 'Coliseum or Bind casts give you 5 shield HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('e', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Witness Stand', cost: PRICE.t1Mastery,
        text: 'When hit, a 20% chance the attacker is called to the stand: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Weight of Law: the spear carries the whole statute book behind it. */
    gene({
      id: 'gene-justice-weight-of-law', name: 'Weight of Law', tier: 2, col: 0, needs: ['gene-justice-sentencing'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Hell-Pricked Tip', cost: PRICE.t2Mastery,
        text: '+5% crit chance — the spearhead was dipped in the Burning Glass',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Clerk's Ledger: the docket runs with a stopwatch, and you are first on it. */
    gene({
      id: 'gene-justice-clerks-ledger', name: "Clerk's Ledger", tier: 2, col: 1, needs: ['gene-justice-updraft'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Recess', cost: PRICE.t2Mastery,
        text: 'Every 12s the court rises and every cooldown skips 0.9s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 12, action: 'cooldownRefund', amount: 900 }),
      },
    }),
    /** Steadfast: the will that drives the wings knits the wounds as well. */
    gene({
      id: 'gene-justice-steadfast', name: 'Steadfast', tier: 2, col: 2, needs: ['gene-justice-aegis-column'],
      text: '+0.5 HP regenerated every second',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ regenPerSecond: flat(0.5)(lv) })),
      mastery: {
        name: 'Iron Halo', cost: PRICE.t2Mastery,
        text: '+20 max HP — a ring of black iron where a gold one should be',
        grant: effect({ maxHp: 20 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Swift Justice: the scales are ready for the next trial sooner. */
    gene({
      id: 'gene-justice-swift-justice', name: 'Swift Justice', tier: 3, col: 0, needs: ['gene-justice-weight-of-law'],
      text: "−5% Judgement Day / Seraphim's Gaze (ultimate) cooldown",
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Last Word', cost: PRICE.t3Mastery,
        text: 'The first time you fall below 30% HP, +30% damage for 5s — the defence rests, the judge does not',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'tempDamage', mult: 1.3, durationMs: 5000 }),
      },
    }),
    /** Due Process: crosses Spear and Wings — every case heard properly restores the court. */
    gene({
      id: 'gene-justice-due-process', name: 'Due Process', tier: 3, col: 1,
      needs: ['gene-justice-clerks-ledger', 'gene-justice-weight-of-law'],
      text: 'Coliseum or Bind casts heal 3 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('e', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Acquittal', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and the case is dismissed: back up at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Sanctuary: while the court is in session, the judge is not to be touched. */
    gene({
      id: 'gene-justice-sanctuary', name: 'Sanctuary', tier: 3, col: 2, needs: ['gene-justice-steadfast'],
      text: 'Ultimate casts give you 8 shield HP — still there when the scene ends',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Unimpeachable', cost: PRICE.t3Mastery,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more precedent behind every thrust. */
    enlightened({
      id: 'gene-justice-enl-precedent', name: 'Enlightened Precedent', col: 0, needs: ['gene-justice-swift-justice'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: one more feather in the Valkyrie's wing. */
    enlightened({
      id: 'gene-justice-enl-pinion', name: 'Enlightened Pinion', col: 1, needs: ['gene-justice-due-process'],
      text: '+0.3% move speed',
      grant: stat((lv) => ({ speedMult: gain(0.003)(lv) })),
    }),
    /** Enlightened: the robe a thread heavier every year on the bench. */
    enlightened({
      id: 'gene-justice-enl-robe', name: 'Enlightened Robe', col: 2, needs: ['gene-justice-sanctuary'],
      text: '−0.3% damage taken (compounding)',
      grant: stat((lv) => ({ damageTakenMult: fade(0.003)(lv) })),
    }),
  ],
};
