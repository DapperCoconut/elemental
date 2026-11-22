import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Serpent's Gall — Venom's gene tree (element id `slime`).
 *
 * Venom is a serpent on a floor of acid: Poison Whip lashes toward the cursor (one cast per press,
 * every 400ms), Vile Spray lays three splashes that never dry, Snake Burrow dives into that acid
 * (only usable standing in it — the press is refused before any cooldown is paid, and surfacing
 * is free), Festering Bite purges and bites forward, and Acid Apocalypse rains on every cell of
 * acid you own. Three lines: **Fang** (the whip and the bite — the strike), **Fen** (the spray and
 * the burrow — the swamp you lay and live in) and **Scale** (the hide that comes through it, and
 * the rain).
 *
 * The whip's window is 0.4s — the length of its own cooldown — so it can never stack on itself.
 * Burrow's speed window is 2s for the same reason. Toxin stacks are the kit's own arithmetic and
 * do not read status multipliers, so nothing here promises "more toxin".
 */
export const VENOM_GENE_TREE: GeneTree = {
  element: 'slime',
  name: "Serpent's Gall",
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Fang root: every lash opens the skin a little wider for the next. */
    gene({
      id: 'gene-venom-hollow-fangs', name: 'Hollow Fangs', tier: 0, col: 0,
      text: 'Poison Whip casts make the foe take +2% damage for 0.4s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 400 })),
      mastery: {
        name: 'Milked Gland', cost: PRICE.rootMastery,
        text: 'Hits have a 10% chance to leave a drop of venom in the wound: 12 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 12, durationMs: 3000 }),
      },
    }),
    /** Fen root: a mouthful spat on the floor buys time for everything else. */
    gene({
      id: 'gene-venom-spitting-glands', name: 'Spitting Glands', tier: 0, col: 1,
      text: 'Vile Spray casts shave 300ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ refundOthers: flat(300)(lv) })),
      mastery: {
        name: 'Second Gland', cost: PRICE.rootMastery,
        text: 'Vile Spray casts have a 15% chance to come straight back — there was more in the sac',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Scale root: a hide grown in a fen where everything bites. */
    gene({
      id: 'gene-venom-shed-scales', name: 'Shed Scales', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Moult', cost: PRICE.rootMastery,
        text: 'The first time you fall below 40% HP, slough the bitten skin: heal 25',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.4, oncePerMatch: true, action: 'healBurst', amount: 25 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Purging Bite: a foe stripped of every buff is a foe with nothing between it and you. */
    gene({
      id: 'gene-venom-purging-bite', name: 'Purging Bite', tier: 1, col: 0, needs: ['gene-venom-hollow-fangs'],
      text: 'Festering Bite casts make the foe take +4% damage for 3s — as long as the shortest Purge',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ damageMult: gain(0.04)(lv), ms: 3000 })),
      mastery: {
        name: 'Lockjaw', cost: PRICE.t1Mastery,
        text: 'Festering Bite casts clamp down on everything close: 16 to all within 100px',
        grant: onCast('f', { burst: { damage: 16, radius: 100 } }),
      },
    }),
    /** Mire Stride: the serpent comes out of the acid moving. */
    gene({
      id: 'gene-venom-mire-stride', name: 'Mire Stride', tier: 1, col: 1, needs: ['gene-venom-spitting-glands'],
      text: 'Snake Burrow casts make you 5% faster for 2s, on top of the burrow\'s own speed',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ speedMult: gain(0.05)(lv), ms: 2000 })),
      mastery: {
        name: 'Tunnel Network', cost: PRICE.t1Mastery,
        text: 'Snake Burrow casts shave 300ms off every other cooldown — the fen is honeycombed with your runs',
        grant: onCast('r', { refundOthers: 300 }),
      },
    }),
    /** Snakeskin: a longer body, a thicker coil. */
    gene({
      id: 'gene-venom-snakeskin', name: 'Snakeskin', tier: 1, col: 2, needs: ['gene-venom-shed-scales'],
      text: '+5 max HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: stat((lv) => ({ maxHp: flat(5)(lv) })),
      mastery: {
        name: 'Hiss', cost: PRICE.t1Mastery,
        text: 'When hit, a 15% chance to strike back from the coil: 18 to all within 90px (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'burstAoe', amount: 18, radius: 90 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Concentrated Toxin: venom milked, settled and milked again. */
    gene({
      id: 'gene-venom-concentrated-toxin', name: 'Concentrated Toxin', tier: 2, col: 0, needs: ['gene-venom-purging-bite'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Neurotoxin', cost: PRICE.t2Mastery,
        text: '+5% crit chance — some bites find the nerve',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Acid Bath: the serpent soaks in what would strip anyone else to the bone. */
    gene({
      id: 'gene-venom-acid-bath', name: 'Acid Bath', tier: 2, col: 1, needs: ['gene-venom-mire-stride'],
      text: 'Vile Spray casts heal you 3 HP',
      maxLevel: 4, cost: PRICE.t2,
      grant: cast('e', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Slick Belly', cost: PRICE.t2Mastery,
        text: 'Vile Spray casts make you 8% faster for 3s — you slide down your own spit',
        grant: onCast('e', { speedMult: 1.08, ms: 3000 }),
      },
    }),
    /** Venomous Skin: like the fen frogs, touching you is the mistake. */
    gene({
      id: 'gene-venom-venomous-skin', name: 'Venomous Skin', tier: 2, col: 2, needs: ['gene-venom-snakeskin'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Hard Scute', cost: PRICE.t2Mastery,
        text: 'When hit, a 15% chance to grow a hard scute — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Rain of Gall: the clouds over the fen are always half full of you. */
    gene({
      id: 'gene-venom-rain-of-gall', name: 'Rain of Gall', tier: 3, col: 0, needs: ['gene-venom-concentrated-toxin'],
      text: '−5% Acid Apocalypse (ultimate) cost',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Downpour', cost: PRICE.t3Mastery,
        text: 'Acid Apocalypse casts burst off you like the first fat drops: 22 to all within 140px',
        grant: onCast('q', { burst: { damage: 22, radius: 140 } }),
      },
    }),
    /** Bitter Cure: crosses Fang and Fen — the bite that takes their buffs gives you a little back. */
    gene({
      id: 'gene-venom-bitter-cure', name: 'Bitter Cure', tier: 3, col: 1,
      needs: ['gene-venom-acid-bath', 'gene-venom-concentrated-toxin'],
      text: 'Festering Bite casts heal you 3 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('f', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Contraband Antidote', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and you get up at 25% HP — a dose not from her hand',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Coiled Guard: when the rain comes the serpent wraps itself tight. */
    gene({
      id: 'gene-venom-coiled-guard', name: 'Coiled Guard', tier: 3, col: 2, needs: ['gene-venom-venomous-skin'],
      text: 'Acid Apocalypse casts give you 8 shield HP',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Old Serpent', cost: PRICE.t3Mastery,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: the gall grows stronger every year the serpent lives. */
    enlightened({
      id: 'gene-venom-enl-gall', name: 'Enlightened Gall', col: 0, needs: ['gene-venom-rain-of-gall'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: one more tunnel under the fen. */
    enlightened({
      id: 'gene-venom-enl-fen', name: 'Enlightened Fen', col: 1, needs: ['gene-venom-bitter-cure'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: another ring of scales along the length. */
    enlightened({
      id: 'gene-venom-enl-coil', name: 'Enlightened Coil', col: 2, needs: ['gene-venom-coiled-guard'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
