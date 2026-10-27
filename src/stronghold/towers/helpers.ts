import type { TowerAbilityDef, TowerDeco, TowerPath, TowerUpgrade } from '../StrongholdTypes';

/** Shorthand for an attack: damage, cooldown ms, effect, description, extras. */
export type Fx = TowerAbilityDef['fx'];
export const ab = (damage: number, cooldown: number, fx: Fx, desc: string, extra: Partial<TowerAbilityDef> = {}): TowerAbilityDef =>
  ({ damage, cooldown, fx, desc, ...extra });

/** Shorthand for an upgrade: name, cost, one-line description, the deco it paints, and what it changes. */
export const up = (name: string, cost: number, desc: string, deco: TowerDeco['kind'] | TowerDeco, body: Omit<TowerUpgrade, 'name' | 'cost' | 'desc' | 'deco'> = {}): TowerUpgrade =>
  ({ name, cost, desc, deco: typeof deco === 'string' ? { kind: deco } : deco, ...body });

/** Shorthand for a path. */
export const path = (name: string, theme: string, upgrades: TowerPath['upgrades']): TowerPath => ({ name, theme, upgrades });

export const CORRUPT_AND_ABSTRACT = ['abstract', 'corrupt'];
