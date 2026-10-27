import { consumedItemIds, ItemDef, ItemEffect, registerItemResolver } from '../../data/Items';
import * as Save from '../IslesSave';
import { getGeneTree, getIsleItem } from '../IslesRegistry';
import type { GeneGrant, GeneNode } from '../IslesTypes';

/**
 * Genes and loadouts → the fight.
 *
 * Stats ride the old campaign's item engine: every equipped charm, the artifact, the meal and one
 * synthetic `isles-genome` item (the merged stat half of the element's whole gene tree) are put in
 * `consumedItemIds` just before ArenaScene starts, and `ItemsKit` applies them like any shop item.
 * The on-cast half of the genome is handed to IslesFightKit by `genomeCastRules`.
 */

export const GENOME_ITEM_ID = 'isles-genome';

/** The node's stored mastery flag key. */
export const masteryKey = (node: string): string => `${node}*`;

export function isMastered(element: string, node: string): boolean {
  return Save.geneLevel(element, masteryKey(node)) > 0;
}

/** Every grant the element's tree currently gives (levels + masteries). */
export function activeGrants(element: string): GeneGrant[] {
  const tree = getGeneTree(element);
  if (!tree || !Save.hasActive()) return [];
  const out: GeneGrant[] = [];
  for (const n of tree.nodes) {
    const lvl = Save.geneLevel(element, n.id);
    if (lvl <= 0) continue;
    try { out.push(n.grant(lvl)); } catch { /* a bad node never breaks a fight */ }
    if (n.mastery && isMastered(element, n.id)) out.push(n.mastery.grant);
  }
  return out;
}

export function genomeEffect(element: string): ItemEffect {
  return mergeEffects(activeGrants(element).map((g) => g.effect).filter((e): e is ItemEffect => !!e));
}

export function genomeCastRules(element: string): NonNullable<GeneGrant['onCast']>[] {
  return activeGrants(element).map((g) => g.onCast).filter((r): r is NonNullable<GeneGrant['onCast']> => !!r);
}

/** Orbs a node's next level costs, or null when maxed. */
export function nextCost(node: GeneNode, level: number): number | null {
  if (!node.infinite && level >= node.maxLevel) return null;
  return Math.max(1, Math.round(node.cost(level + 1)));
}

export function nodeUnlocked(element: string, node: GeneNode): boolean {
  return node.needs.every((id) => Save.geneLevel(element, id) > 0);
}

const ADD: (keyof ItemEffect)[] = [
  'maxHp', 'shieldCharges', 'shieldHp', 'regenPerSecond', 'lifestealFrac', 'critChance', 'dodgeChance', 'selfDamagePerSec',
];
const MUL: (keyof ItemEffect)[] = [
  'damageMult', 'statusDurMult', 'statusDmgMult', 'damageTakenMult', 'speedMult', 'cooldownMult',
  'ultimateCooldownMult', 'enemyMaxHpMult', 'enemySpeedMult', 'enemyDamageMult',
];
const MAX: (keyof ItemEffect)[] = ['reviveHpFrac', 'critMult', 'invincibleMs'];

export function mergeEffects(list: ItemEffect[]): ItemEffect {
  const out: ItemEffect = {};
  const o = out as Record<string, number | undefined>;
  for (const e of list) {
    const r = e as Record<string, unknown>;
    for (const k of ADD) if (typeof r[k] === 'number') o[k] = (o[k] ?? 0) + (r[k] as number);
    for (const k of MUL) if (typeof r[k] === 'number') o[k] = (o[k] ?? 1) * (r[k] as number);
    for (const k of MAX) if (typeof r[k] === 'number') o[k] = Math.max(o[k] ?? 0, r[k] as number);
    if (typeof e.reflectFraction === 'number') out.reflectFraction = 1 - (1 - (out.reflectFraction ?? 0)) * (1 - e.reflectFraction);
    if (e.behaviors?.length) out.behaviors = [...(out.behaviors ?? []), ...e.behaviors];
  }
  return out;
}

// ── Item resolver — Isles items are visible to ItemsKit ───────────────

registerItemResolver((id): ItemDef | undefined => {
  if (id === GENOME_ITEM_ID) {
    if (!Save.hasActive()) return undefined;
    const el = Save.S().element;
    return {
      id, name: 'Genome', emoji: '🧬', elementId: el, priceSparks: 0,
      flavor: 'Your element, sequenced.', effect: genomeEffect(el),
    };
  }
  const def = getIsleItem(id);
  if (!def) return undefined;
  return {
    id, name: def.name, emoji: def.emoji, elementId: def.isle, priceSparks: def.price ?? 0,
    flavor: def.flavor, effect: def.effect ?? {},
  };
});

/**
 * Fill the match's item set from the active slot. Called right before `scene.start('ArenaScene')`.
 * Returns the meal id that this fight will eat (the caller clears it on the save).
 */
export function prepareLoadout(): string | null {
  consumedItemIds.clear();
  if (!Save.hasActive()) return null;
  const s = Save.S();
  for (const c of s.charms) if (Save.count(c) > 0) consumedItemIds.add(c);
  if (s.artifact && Save.count(s.artifact) > 0) consumedItemIds.add(s.artifact);
  if (s.meal && Save.count(s.meal) > 0) consumedItemIds.add(s.meal);
  if (getGeneTree(s.element) && activeGrants(s.element).some((g) => g.effect)) consumedItemIds.add(GENOME_ITEM_ID);
  return s.meal && Save.count(s.meal) > 0 ? s.meal : null;
}
