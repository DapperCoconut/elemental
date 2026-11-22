import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Chainbred — Bind's gene tree.
 *
 * Bind is cursed and lives off the dead: Chainbound Daggers thrown as fast as Click is held
 * (every 380ms), the Bind chain that leashes a foe or takes a lost soul, Blackened Eyes that show
 * the souls and shrink you to your inner one, Siphon to drink a soul (and wear the curse down),
 * and the Ritual that pays the old god in every soul on your chain. Three lines: **Dagger** (the
 * steel and the god it serves), **Tether** (the chain and the drinking — souls as currency) and
 * **Curse** (the body that carries it, and the eyes that see past it).
 *
 * Bind, Siphon and the Ritual are refused (stamp handed back, nothing paid) when there is nothing
 * to bind, no soul to drink or no soul to offer — so their genes only ever pay out on a real cast.
 * The dagger window is 0.35s, inside its own cooldown.
 */
export const BIND_GENE_TREE: GeneTree = {
  element: 'bind',
  name: 'Chainbred',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Dagger root: links filed to edges, so the chain cuts on its way past. */
    gene({
      id: 'gene-bind-whetted-links', name: 'Whetted Links', tier: 0, col: 0,
      text: 'Chainbound Dagger casts make the foe take +2% damage for 0.35s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 350 })),
      mastery: {
        name: 'Chain Fragments', cost: PRICE.rootMastery,
        text: 'Hits have a 10% chance to burst a link into shards: 12 to all within 80px of you (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 4, action: 'burstAoe', amount: 12, radius: 80 }),
      },
    }),
    /** Tether root: something on the end of the chain, and your hands free for the rest. */
    gene({
      id: 'gene-bind-long-chain', name: 'Long Chain', tier: 0, col: 1,
      text: 'Bind casts shave 200ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ refundOthers: flat(200)(lv) })),
      mastery: {
        name: 'Second Shackle', cost: PRICE.rootMastery,
        text: 'Bind casts have a 15% chance to come straight back — a spare cuff on the ring',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Curse root: skin gone hard under the irons. */
    gene({
      id: 'gene-bind-calloused', name: 'Calloused', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Iron Collar', cost: PRICE.rootMastery,
        text: 'Start every fight in an iron collar that turns the first blow — a shield charge',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Soul-Fed Steel: what you drink sharpens what you throw. */
    gene({
      id: 'gene-bind-soul-fed-steel', name: 'Soul-Fed Steel', tier: 1, col: 0, needs: ['gene-bind-whetted-links'],
      text: 'Siphon casts make the foe take +4% damage for 3s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ damageMult: gain(0.04)(lv), ms: 3000 })),
      mastery: {
        name: 'Drink Deep', cost: PRICE.t1Mastery,
        text: 'Siphon casts heal you 6 — the first swallow is always the sweetest',
        grant: onCast('f', { heal: 6 }),
      },
    }),
    /** Gaoler's Gait: the gaoler walks; the chained one follows. */
    gene({
      id: 'gene-bind-gaolers-gait', name: "Gaoler's Gait", tier: 1, col: 1, needs: ['gene-bind-long-chain'],
      text: 'Bind casts make you 4% faster for 2s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('e', (lv) => ({ speedMult: gain(0.04)(lv), ms: 2000 })),
      mastery: {
        name: 'Dragging Weight', cost: PRICE.t1Mastery,
        text: 'Hits have a 10% chance to hang a weight on the foe: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),
    /** Blackened Sight: shrunk to your inner soul, the outer one hardens around it. */
    gene({
      id: 'gene-bind-blackened-sight', name: 'Blackened Sight', tier: 1, col: 2, needs: ['gene-bind-calloused'],
      text: 'Blackened Eyes casts give you 6 shield HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ shield: flat(6)(lv) })),
      mastery: {
        name: 'Inverted', cost: PRICE.t1Mastery,
        text: 'Blackened Eyes casts make you 15% faster for its 8s — the world turned over runs downhill',
        grant: onCast('r', { speedMult: 1.15, ms: 8000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Executioner's Weight: a heavier dagger, thrown just as fast. */
    gene({
      id: 'gene-bind-executioners-weight', name: "Executioner's Weight", tier: 2, col: 0, needs: ['gene-bind-soul-fed-steel'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Red Runes', cost: PRICE.t2Mastery,
        text: '+5% crit chance — the old runes on the blade wake now and then',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Tithe of Souls: every soul drunk pays a little toward everything else. */
    gene({
      id: 'gene-bind-tithe-of-souls', name: 'Tithe of Souls', tier: 2, col: 1, needs: ['gene-bind-gaolers-gait'],
      text: 'Siphon casts shave 300ms off every other cooldown',
      maxLevel: 4, cost: PRICE.t2,
      grant: cast('f', (lv) => ({ refundOthers: flat(300)(lv) })),
      mastery: {
        name: "Revenant's Debt", cost: PRICE.t2Mastery,
        text: 'When hit, a 15% chance a revenant you owe answers for you: 16 to all within 100px (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 5, action: 'burstAoe', amount: 16, radius: 100 }),
      },
    }),
    /** Curse-Worn: a body that has carried the curse this long carries more. */
    gene({
      id: 'gene-bind-curse-worn', name: 'Curse-Worn', tier: 2, col: 2, needs: ['gene-bind-blackened-sight'],
      text: '+5 max HP',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ maxHp: flat(5)(lv) })),
      mastery: {
        name: 'Loosened', cost: PRICE.t2Mastery,
        text: '+1 HP regenerated every second — the irons sit a little looser every day',
        grant: effect({ regenPerSecond: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Greedy God: the old god comes sooner for a regular. */
    gene({
      id: 'gene-bind-greedy-god', name: 'Greedy God', tier: 3, col: 0, needs: ['gene-bind-executioners-weight'],
      text: '−5% Ritual (ultimate) cost',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Judgement', cost: PRICE.t3Mastery,
        text: 'Ritual casts crack the runes outward as the god arrives: 26 to everything within 150px',
        grant: onCast('q', { burst: { damage: 26, radius: 150 } }),
      },
    }),
    /** Prophet's Mercy: crosses Dagger and Tether — a soul drunk is a wound closed. */
    gene({
      id: 'gene-bind-prophets-mercy', name: "Prophet's Mercy", tier: 3, col: 1,
      needs: ['gene-bind-tithe-of-souls', 'gene-bind-executioners-weight'],
      text: 'Siphon casts heal you 2 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('f', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: "The Old Prophet's Hand", cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and the old prophet stands you up at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Unbroken: while the god stands over you, nothing else gets close. */
    gene({
      id: 'gene-bind-unbroken', name: 'Unbroken', tier: 3, col: 2, needs: ['gene-bind-curse-worn'],
      text: 'Ritual casts give you 10 shield HP',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(10)(lv) })),
      mastery: {
        name: 'Bound in Iron', cost: PRICE.t3Mastery,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more edge filed onto the chain. */
    enlightened({
      id: 'gene-bind-enl-edge', name: 'Enlightened Edge', col: 0, needs: ['gene-bind-greedy-god'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: another link added to the chain, forever. */
    enlightened({
      id: 'gene-bind-enl-link', name: 'Enlightened Link', col: 1, needs: ['gene-bind-prophets-mercy'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more year carried under the curse. */
    enlightened({
      id: 'gene-bind-enl-burden', name: 'Enlightened Burden', col: 2, needs: ['gene-bind-unbroken'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
