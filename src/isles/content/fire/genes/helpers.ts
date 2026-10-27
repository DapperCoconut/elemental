import type { GeneGrant, GeneNode, GeneSlot } from '../../../IslesTypes';
import type { ItemBehavior, ItemEffect } from '../../../../data/Items';

/**
 * Shared builders for the Fire Isle gene trees.
 *
 * Convention every tree follows: `grant(level)` returns the node's TOTAL grant at that level
 * (so a "+3% damage per level" node returns ×1.09 at level 3), and `text` states exactly what ONE
 * level adds. Masteries are flat one-off grants layered on top once the node is maxed.
 */

/** The per-cast half of a gene grant, without its slot (the builder adds that). */
export type CastRule = Omit<NonNullable<GeneGrant['onCast']>, 'slot'>;

/** Round away float dust so stat read-outs stay clean (1.0900000001 → 1.09). */
const tidy = (n: number): number => Math.round(n * 10000) / 10000;

/** Orb price that starts at `base` and climbs by `step` each level. */
export const linear = (base: number, step: number) => (level: number): number => base + step * (level - 1);

/** The Enlightened price curve — 14, 17, 20, 23, 27 … geometric, forever. */
export const enlightenedCost = (level: number): number => Math.round(12 * 1.18 ** level);

/** A multiplier that grows `per` each level (damage, speed, status). */
export const gain = (per: number) => (level: number): number => tidy(1 + per * level);

/** A multiplier that shrinks `per` each level (finite nodes only — it is linear). */
export const cut = (per: number) => (level: number): number => tidy(1 - per * level);

/** A multiplier that shrinks by `per` compounding — safe for infinite levels, never reaches 0. */
export const fade = (per: number) => (level: number): number => tidy((1 - per) ** level);

/** A flat amount that grows `per` each level (HP, shield, heal, refund ms). */
export const flat = (per: number) => (level: number): number => tidy(per * level);

/** Grant builder for a pure stat node. */
export const stat = (fn: (level: number) => ItemEffect) => (level: number): GeneGrant => ({ effect: fn(level) });

/** Grant builder for a node that fires when `slot`'s ability is cast. */
export const cast = (slot: GeneSlot, fn: (level: number) => CastRule) =>
  (level: number): GeneGrant => ({ onCast: { slot, ...fn(level) } });

/** A one-off on-cast grant (masteries). */
export const onCast = (slot: GeneSlot, rule: CastRule): GeneGrant => ({ onCast: { slot, ...rule } });

/** A one-off stat grant (masteries). */
export const effect = (e: ItemEffect): GeneGrant => ({ effect: e });

/** A one-off triggered behaviour (masteries). */
export const behavior = (b: ItemBehavior): GeneGrant => ({ effect: { behaviors: [b] } });

/** A regular (masterable) node — just fills `needs` when it is a root. */
export function gene(spec: Omit<GeneNode, 'needs' | 'infinite'> & { needs?: string[] }): GeneNode {
  return { ...spec, needs: spec.needs ?? [] };
}

/** An Enlightened node: tier 4, levels forever on the geometric price curve, no mastery. */
export function enlightened(spec: {
  id: string;
  name: string;
  col: number;
  needs: string[];
  text: string;
  grant(level: number): GeneGrant;
}): GeneNode {
  return { ...spec, tier: 4, maxLevel: 9999, infinite: true, cost: enlightenedCost };
}
