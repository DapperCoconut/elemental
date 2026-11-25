import type { IsleItemDef, ItemEffect, NpcLook, ShopDef } from '../../IslesTypes';
import { hashStr, mulberry } from '../../art/IsleArt';

/**
 * The dark market — what is sold in a court that has fallen to anarchy.
 *
 * Every charm a court's own shops sell has a twin here: the same thing (same script, its numbers pushed
 * further) with a *taint* worked into it — one strong boon, one strong price. Nothing is hand-listed: the
 * registry runs `darken` over every shop charm at boot, so a court added later gets its dark market for
 * free, and the stat lines the counter prints are generated from the very effect that is applied.
 */

export interface Taint {
  id: string;
  /** Goes in front of the item's name — "Bloodpriced Tithe Box". */
  prefix: string;
  /** The dealer's one line about what was done to it. */
  flavor: string;
  boon: ItemEffect;
  curse: ItemEffect;
}

export const TAINTS: Taint[] = [
  { id: 'bloodpriced', prefix: 'Bloodpriced', flavor: 'Quenched in its last owner. It remembers how much that took.',
    boon: { damageMult: 1.3 }, curse: { maxHp: -30 } },
  { id: 'feverish', prefix: 'Feverish', flavor: 'It never cools. Neither will you.',
    boon: { cooldownMult: 0.78 }, curse: { selfDamagePerSec: 1.5 } },
  { id: 'glass', prefix: 'Glass-Cored', flavor: 'Hollowed out to hit harder. Do not drop it. Do not get hit.',
    boon: { damageMult: 1.4 }, curse: { damageTakenMult: 1.3 } },
  { id: 'leaden', prefix: 'Leaden', flavor: 'Lined with something heavy that turns blows. It turns your ankles too.',
    boon: { damageTakenMult: 0.72 }, curse: { speedMult: 0.82 } },
  { id: 'leeching', prefix: 'Leeching', flavor: 'It drinks from whatever you strike — and it took its first drink from you.',
    boon: { lifestealFrac: 0.14 }, curse: { maxHp: -25 } },
  { id: 'reckless', prefix: 'Reckless', flavor: 'The guard was filed off to save weight.',
    boon: { speedMult: 1.22 }, curse: { damageTakenMult: 1.22 } },
  { id: 'usurious', prefix: "Usurer's", flavor: 'Your greatest trick, on credit. Everything else pays the interest.',
    boon: { ultimateCooldownMult: 0.55 }, curse: { cooldownMult: 1.2 } },
  { id: 'hexed', prefix: 'Hexed', flavor: 'Luck, stolen. The one it was stolen from is across the ring, and angry.',
    boon: { critChance: 0.25, critMult: 2.2 }, curse: { enemyDamageMult: 1.2 } },
  { id: 'spiteful', prefix: 'Spiteful', flavor: 'It throws a third of every hurt straight back. It also picks the fights.',
    boon: { reflectFraction: 0.3 }, curse: { enemyMaxHpMult: 1.2 } },
  { id: 'hollow', prefix: 'Hollow', flavor: 'A shell of borrowed armour around a blade with the edge sold off.',
    boon: { shieldHp: 60 }, curse: { damageMult: 0.85 } },
];

/** Stats where smaller is better — pushed down, not up, when an effect is made stronger. */
const LOWER_IS_BETTER = new Set(['damageTakenMult', 'cooldownMult', 'ultimateCooldownMult', 'enemyMaxHpMult', 'enemySpeedMult', 'enemyDamageMult']);
const MULTS = new Set(['damageMult', 'statusDurMult', 'statusDmgMult', 'damageTakenMult', 'speedMult', 'cooldownMult',
  'ultimateCooldownMult', 'enemyMaxHpMult', 'enemySpeedMult', 'enemyDamageMult']);
const FLAT = new Set(['maxHp', 'shieldCharges', 'shieldHp', 'regenPerSecond', 'lifestealFrac', 'critChance', 'dodgeChance']);
const HOW_MUCH = 1.6;
const round = (v: number, step: number) => Math.round(v / step) * step;

/** The item's own numbers, pushed 60% further from "nothing" — only ever in the direction that helps. */
function amplify(e: ItemEffect): ItemEffect {
  const out: Record<string, unknown> = { ...e };
  for (const [k, v] of Object.entries(e)) {
    if (typeof v !== 'number') continue;
    if (MULTS.has(k)) {
      const better = LOWER_IS_BETTER.has(k) ? v < 1 : v > 1;
      if (better) out[k] = Math.max(0.3, round(1 + (v - 1) * HOW_MUCH, 0.01));
    } else if (FLAT.has(k) && v > 0) {
      out[k] = k === 'shieldCharges' ? v + 1 : round(v * HOW_MUCH, v < 1 ? 0.01 : 1);
    }
  }
  if (e.behaviors) {
    out.behaviors = e.behaviors.map((b) => ({ ...b, amount: b.amount !== undefined ? Math.round(b.amount * 1.4) : undefined }));
  }
  return out as ItemEffect;
}

/** Fold the taint's two halves into an effect: multipliers multiply, everything else adds. */
function fold(base: ItemEffect, ...more: ItemEffect[]): ItemEffect {
  const out: Record<string, unknown> = { ...base };
  for (const m of more) {
    for (const [k, v] of Object.entries(m)) {
      if (typeof v !== 'number') continue;
      const cur = out[k];
      if (MULTS.has(k)) out[k] = round((typeof cur === 'number' ? cur : 1) * v, 0.01);
      else if (k === 'critMult') out[k] = Math.max(typeof cur === 'number' ? cur : 0, v);
      else out[k] = round((typeof cur === 'number' ? cur : 0) + v, 0.01);
    }
  }
  return out as ItemEffect;
}

export const DARK_PREFIX = 'dark-';
export const darkIdOf = (baseId: string): string => `${DARK_PREFIX}${baseId}`;
/** The honest item a dark one was made from (or null for an honest item). */
export const baseIdOf = (id: string): string | null => (id.startsWith(DARK_PREFIX) ? id.slice(DARK_PREFIX.length) : null);

export const taintOf = (baseId: string): Taint => TAINTS[hashStr(`taint:${baseId}`) % TAINTS.length];

/** The dark twin of a shop charm. Deterministic: the same charm always carries the same taint. */
export function darken(base: IsleItemDef): IsleItemDef {
  const t = taintOf(base.id);
  return {
    ...base,
    id: darkIdOf(base.id),
    name: `${t.prefix} ${base.name}`,
    price: Math.round(((base.price ?? 120) * 2.4 + 60) / 5) * 5,
    sell: undefined,
    flavor: t.flavor,
    effect: fold(amplify(base.effect ?? {}), t.boon, t.curse),
    scriptText: base.scriptText,
  };
}

export const darkShopIdOf = (courtId: string): string => `dark-${courtId}`;

/** A court's dark market: the twins of everything its own counters sell as charms. */
export function darkShop(courtId: string, courtName: string, charmIds: string[]): ShopDef {
  return { id: darkShopIdOf(courtId), name: `${courtName} — the Dark Market`, stock: charmIds.map(darkIdOf) };
}

// ── The dealer ─────────────────────────────────────────────────────────

const DEALER_FIRST = ['Mother', 'Old', 'Lean', 'Quiet', 'Dry', 'Cousin', 'Sister', 'Uncle', 'Little', 'Grey'];
const DEALER_LAST = ['Tallowhand', 'Ninepence', 'Marrow', 'Shutter', 'Lockjaw', 'Halfweight', 'Candle-End', 'Magpie', 'Sly', 'Underhill',
  'Threadbare', 'Pawn', 'Gutter', 'Knuckle', 'Lampblack', 'Scrip'];
const DEALER_HATS: NpcLook['hat'][] = ['cowl', 'hood', 'plague', 'veil', 'tophat'];
const DEALER_TRAITS: NonNullable<NpcLook['traits']>[] = [['lantern', 'satchel'], ['pack', 'eyepatch'], ['satchel', 'mask'], ['lantern', 'cane'], ['pack', 'scarf']];

/** Who keeps a court's dark market — the same face every time that court falls. */
export function darkDealer(courtId: string, accent: number): { name: string; look: NpcLook } {
  const r = mulberry(hashStr(`dealer:${courtId}`));
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
  return {
    name: `${pick(DEALER_FIRST)} ${pick(DEALER_LAST)}`,
    look: { body: 0x3a3440, accent, hand: 0x1c1820, hat: pick(DEALER_HATS), traits: pick(DEALER_TRAITS), size: 0.95 + r() * 0.25, eye: 0xffd27a },
  };
}
