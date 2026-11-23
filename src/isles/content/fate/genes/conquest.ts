import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Iron Crown — Conquest's gene tree.
 *
 * Conquest owns rather than does: a town center pays two Authority a second, and the kit spends
 * it. Banner Bash is a 260px pike (every 700ms; a quarter damage on your own land), Place
 * Barracks, Place Turret and Place Barricade raise buildings on the square you stand on (35, 25
 * and 10 Authority), and Expansion plants a second town for 150. Three lines: **Pike** (the
 * thrust and the turret — the parts that shoot back), **Garrison** (the barracks and the
 * expansion — the army and the economy) and **Rampart** (the barricade and the mail).
 *
 * Every build and the Expansion are refused before the press when the square, the cap or the
 * purse says no, so their rules only pay out on a building that actually went up — the economy
 * is the real cooldown on all of them, not the 600ms on the key.
 */
export const CONQUEST_GENE_TREE: GeneTree = {
  element: 'conquest',
  name: 'Iron Crown',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Pike root: an ash shaft long enough that they bleed before they reach you. */
    gene({
      id: 'gene-conquest-ash-pike', name: 'Ash-Shafted Pike', tier: 0, col: 0,
      text: 'Banner Bash casts make the foe take +2% damage for 0.7s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 700 })),
      mastery: {
        name: 'Rally Cry', cost: PRICE.rootMastery,
        text: 'Hits have a 12% chance to raise a cheer from the ranks: +20% damage for 3s (at most every 8s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 8, action: 'tempDamage', mult: 1.2, durationMs: 3000 }),
      },
    }),
    /** Garrison root: a barracks up, and the sergeant hurries everyone else along. */
    gene({
      id: 'gene-conquest-drill-sergeant', name: 'Drill Sergeant', tier: 0, col: 1,
      text: 'Place Barracks casts shave 400ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ refundOthers: flat(400)(lv) })),
      mastery: {
        name: 'Muster', cost: PRICE.rootMastery,
        text: 'Place Barracks casts heal you 10 — the quartermaster has bandages',
        grant: onCast('e', { heal: 10 }),
      },
    }),
    /** Rampart root: riveted rings under the surcoat. */
    gene({
      id: 'gene-conquest-mail-shirt', name: 'Mail Shirt', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Stockade', cost: PRICE.rootMastery,
        text: 'Start every fight behind a stockade: 1 shield charge',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Covering Fire: a turret up is a gun on them while you close. */
    gene({
      id: 'gene-conquest-covering-fire', name: 'Covering Fire', tier: 1, col: 0, needs: ['gene-conquest-ash-pike'],
      text: 'Place Turret casts make the foe take +4% damage for 4s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ damageMult: gain(0.04)(lv), ms: 4000 })),
      mastery: {
        name: 'Grapeshot', cost: PRICE.t1Mastery,
        text: 'Place Turret casts fire a ranging round: 14 to everything within 100px',
        grant: onCast('r', { burst: { damage: 14, radius: 100 } }),
      },
    }),
    /** Quartermaster: the barracks issues you a shield along with the recruits. */
    gene({
      id: 'gene-conquest-quartermaster', name: 'Quartermaster', tier: 1, col: 1, needs: ['gene-conquest-drill-sergeant'],
      text: 'Place Barracks casts give you 5 shield HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('e', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Forced March', cost: PRICE.t1Mastery,
        text: 'Place Barracks casts make you 12% faster for 3s — off to find the next square',
        grant: onCast('e', { speedMult: 1.12, ms: 3000 }),
      },
    }),
    /** Earthworks: dig the wall in, and dig yourself in behind it. */
    gene({
      id: 'gene-conquest-earthworks', name: 'Earthworks', tier: 1, col: 2, needs: ['gene-conquest-mail-shirt'],
      text: 'Place Barricade casts give you 4 shield HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ shield: flat(4)(lv) })),
      mastery: {
        name: 'Last Stand', cost: PRICE.t1Mastery,
        text: 'The first time you fall below 30% HP, the colours are planted: 30 to everything within 140px',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.3, oncePerMatch: true, action: 'burstAoe', amount: 30, radius: 140 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Tempered Steel: the pike head quenched twice. */
    gene({
      id: 'gene-conquest-tempered-steel', name: 'Tempered Steel', tier: 2, col: 0, needs: ['gene-conquest-covering-fire'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Couched Lance', cost: PRICE.t2Mastery,
        text: '+5% crit chance',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Logistics: wars are won by whoever's carts arrive first. */
    gene({
      id: 'gene-conquest-logistics', name: 'Logistics', tier: 2, col: 1, needs: ['gene-conquest-quartermaster'],
      text: '−3% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.03)(lv) })),
      mastery: {
        name: 'Supply Lines', cost: PRICE.t2Mastery,
        text: '+1 HP regenerated every second — the wagons keep coming',
        grant: effect({ regenPerSecond: 1 }),
      },
    }),
    /** Shield Wall: locked shields, and every blow on them rings back down the arm that swung. */
    gene({
      id: 'gene-conquest-shield-wall', name: 'Shield Wall', tier: 2, col: 2, needs: ['gene-conquest-earthworks'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Caltrops', cost: PRICE.t2Mastery,
        text: 'The foe moves 6% slower — the ground round your squares is sown with iron',
        grant: effect({ enemySpeedMult: 0.94 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Manifest Destiny: the next town is founded on the confidence of the last. */
    gene({
      id: 'gene-conquest-manifest-destiny', name: 'Manifest Destiny', tier: 3, col: 0, needs: ['gene-conquest-tempered-steel'],
      text: '−5% Expansion (ultimate) cost — the Authority is still the Authority',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Founding Feast', cost: PRICE.t3Mastery,
        text: 'Expansion casts throw a feast for the new town: heal 20',
        grant: onCast('q', { heal: 20 }),
      },
    }),
    /** Standing Army: crosses Pike and Garrison — every gun raised steadies the general. */
    gene({
      id: 'gene-conquest-standing-army', name: 'Standing Army', tier: 3, col: 1,
      needs: ['gene-conquest-logistics', 'gene-conquest-tempered-steel'],
      text: 'Place Turret casts heal you 3 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('r', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Unconquered', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and you rise from the rubble at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Citadel: a second capital is a second wall round the crown. */
    gene({
      id: 'gene-conquest-citadel', name: 'Citadel', tier: 3, col: 2, needs: ['gene-conquest-shield-wall'],
      text: 'Expansion casts give you 12 shield HP',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(12)(lv) })),
      mastery: {
        name: 'Curtain Wall', cost: PRICE.t3Mastery,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more rivet in the pike head, campaign after campaign. */
    enlightened({
      id: 'gene-conquest-enl-pike', name: 'Enlightened Pike', col: 0, needs: ['gene-conquest-manifest-destiny'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the levy comes in a day sooner every season. */
    enlightened({
      id: 'gene-conquest-enl-levy', name: 'Enlightened Levy', col: 1, needs: ['gene-conquest-standing-army'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more course of stone on the keep, forever. */
    enlightened({
      id: 'gene-conquest-enl-keep', name: 'Enlightened Keep', col: 2, needs: ['gene-conquest-citadel'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
