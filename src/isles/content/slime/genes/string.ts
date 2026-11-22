import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Gossamer — String's gene tree.
 *
 * String is a velvet-black spider: Tension Snag throws hooked strings as fast as Click is held
 * (every 700ms), Spider Dance walks five spiders along them (refused, and paid nothing, with no
 * strings out), the Hexing Strand slows what brushes it (the recast that snaps it is free and
 * pays no genes), Marionette puts a foe's feet on your arrow keys, and Linen Tomb wraps them in
 * silk. Three lines: **Snag** (the hooks and the snap — tension), **Web** (the spiders and the
 * dance) and **Cocoon** (silk round yourself, and silk round them).
 *
 * The snag window is 0.7s, inside its own cooldown, so held Click never stacks it.
 */
export const STRING_GENE_TREE: GeneTree = {
  element: 'string',
  name: 'Gossamer',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Snag root: barbs on every hook, so the string bites where it lands. */
    gene({
      id: 'gene-string-barbed-hooks', name: 'Barbed Hooks', tier: 0, col: 0,
      text: 'Tension Snag casts make the foe take +2% damage for 0.7s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 700 })),
      mastery: {
        name: 'Fishhook', cost: PRICE.rootMastery,
        text: 'Hits have a 10% chance to leave a hook in, worrying at them: 9 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 9, durationMs: 3000 }),
      },
    }),
    /** Web root: the brood climbs on, and the spider gets on with spinning. */
    gene({
      id: 'gene-string-spinnerets', name: 'Spinnerets', tier: 0, col: 1,
      text: 'Spider Dance casts shave 500ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ refundOthers: flat(500)(lv) })),
      mastery: {
        name: 'Brood', cost: PRICE.rootMastery,
        text: 'Spider Dance casts have a 15% chance to come straight back — another clutch has hatched',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Cocoon root: a lining of silk under the velvet. */
    gene({
      id: 'gene-string-silk-lining', name: 'Silk Lining', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Silk Shroud', cost: PRICE.rootMastery,
        text: 'Start every fight wrapped in a 24 HP silk shroud',
        grant: effect({ shieldHp: 24 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Taut Line: a hexed foe moves like a fly in the web — and is as easy to hit. */
    gene({
      id: 'gene-string-taut-line', name: 'Taut Line', tier: 1, col: 0, needs: ['gene-string-barbed-hooks'],
      text: 'Hexing Strand throws make the foe take +4% damage for 4s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ damageMult: gain(0.04)(lv), ms: 4000 })),
      mastery: {
        name: 'Snapback', cost: PRICE.t1Mastery,
        text: 'Hexing Strand throws twang off your wrist: 16 to everything within 110px',
        grant: onCast('r', { burst: { damage: 16, radius: 110 } }),
      },
    }),
    /** Puppeteer: steering them takes your feet with it. */
    gene({
      id: 'gene-string-puppeteer', name: 'Puppeteer', tier: 1, col: 1, needs: ['gene-string-spinnerets'],
      text: 'Marionette casts make you 5% faster for the puppet\'s 5s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ speedMult: gain(0.05)(lv), ms: 5000 })),
      mastery: {
        name: 'Strings Attached', cost: PRICE.t1Mastery,
        text: 'Marionette casts shave 1s off every other cooldown — a puppet frees your other hands',
        grant: onCast('f', { refundOthers: 1000 }),
      },
    }),
    /** Orb Weaver: a fat-bodied spider, the kind that sits the winter out. */
    gene({
      id: 'gene-string-orb-weaver', name: 'Orb Weaver', tier: 1, col: 2, needs: ['gene-string-silk-lining'],
      text: '+5 max HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: stat((lv) => ({ maxHp: flat(5)(lv) })),
      mastery: {
        name: 'Web Sense', cost: PRICE.t1Mastery,
        text: '+4% dodge chance — you feel the blow coming down the threads',
        grant: effect({ dodgeChance: 0.04 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Tension: every string strung a little tighter than it should hold. */
    gene({
      id: 'gene-string-tension', name: 'Tension', tier: 2, col: 0, needs: ['gene-string-taut-line'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Garrote', cost: PRICE.t2Mastery,
        text: '+5% crit chance — now and then the string finds the throat',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Weaver's Patience: the dance goes on without you, and you mend while it does. */
    gene({
      id: 'gene-string-weavers-patience', name: "Weaver's Patience", tier: 2, col: 1, needs: ['gene-string-puppeteer'],
      text: 'Spider Dance casts heal you 4 HP',
      maxLevel: 4, cost: PRICE.t2,
      grant: cast('e', (lv) => ({ heal: flat(4)(lv) })),
      mastery: {
        name: 'Venom Sacs', cost: PRICE.t2Mastery,
        text: 'Spider Dance casts make the foe take +8% damage for the dance\'s 8s',
        grant: onCast('e', { damageMult: 1.08, ms: 8000 }),
      },
    }),
    /** Dragline: whoever breaks your thread feels it come back. */
    gene({
      id: 'gene-string-dragline', name: 'Dragline', tier: 2, col: 2, needs: ['gene-string-orb-weaver'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Molt', cost: PRICE.t2Mastery,
        text: 'When hit, a 15% chance to leave them the old skin — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Linen Shroud: there is always another bolt of linen in the larder. */
    gene({
      id: 'gene-string-linen-shroud', name: 'Linen Shroud', tier: 3, col: 0, needs: ['gene-string-tension'],
      text: '−5% Linen Tomb (ultimate) cost',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Burial Silk', cost: PRICE.t3Mastery,
        text: 'Linen Tomb casts make the foe take +10% damage for 5s while they cut at the silk',
        grant: onCast('q', { damageMult: 1.1, ms: 5000 }),
      },
    }),
    /** Spun Fate: crosses Snag and Web — the hex thrown is a thread you can hang on. */
    gene({
      id: 'gene-string-spun-fate', name: 'Spun Fate', tier: 3, col: 1,
      needs: ['gene-string-weavers-patience', 'gene-string-tension'],
      text: 'Hexing Strand throws heal you 3 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('r', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Cocoon', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and you crawl out of a cocoon at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Funnel Web: you wrap them, and you wrap yourself while you're at it. */
    gene({
      id: 'gene-string-funnel-web', name: 'Funnel Web', tier: 3, col: 2, needs: ['gene-string-dragline'],
      text: 'Linen Tomb casts give you 8 shield HP',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Black Widow', cost: PRICE.t3Mastery,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: another turn of the windlass on every string. */
    enlightened({
      id: 'gene-string-enl-tension', name: 'Enlightened Tension', col: 0, needs: ['gene-string-linen-shroud'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: a little more silk in the gland each season. */
    enlightened({
      id: 'gene-string-enl-silk', name: 'Enlightened Silk', col: 1, needs: ['gene-string-spun-fate'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more layer on the cocoon. */
    enlightened({
      id: 'gene-string-enl-cocoon', name: 'Enlightened Cocoon', col: 2, needs: ['gene-string-funnel-web'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
