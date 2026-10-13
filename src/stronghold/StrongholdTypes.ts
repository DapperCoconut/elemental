/**
 * Stronghold — the tower-defense mode. Shared types.
 *
 * Towers are the elements, but they cannot run the 1v1 ability code: every element kit is
 * hard-wired to the arena's single `player` slot (see DuoKit's header for the long version).
 * So a tower carries a *tower moveset*: five abilities that keep the element's real names,
 * key order (Click → E → R → F → Q), textures, colours and statuses, with the mechanics bent
 * into shapes a stationary caster can use. Those shapes are the small vocabulary below.
 */

export type TowerSlot = 'click' | 'e' | 'r' | 'f' | 'q';
export const TOWER_SLOTS: TowerSlot[] = ['click', 'e', 'r', 'f', 'q'];
export const TOWER_SLOT_KEYS: Record<TowerSlot, string> = { click: 'Click', e: 'E', r: 'R', f: 'F', q: 'Q' };

/** On-hit statuses a tower ability leaves on a husk. All durations in ms. */
export interface Rider {
  /** Burn DOT (the husk ticks its own burn — 4/s × burnDpsMult). */
  burn?: number;
  toxic?: { ms: number; dps: number };
  /** Frost stacks added; 10% slow each, capped by the husk at 80%. */
  frost?: number;
  /** Hard freeze — the husk stops dead. */
  freeze?: number;
  /** Stun — same as a freeze but reads as a different status. */
  stun?: number;
  /** Walk-speed multiplier for the duration. Stacks by taking the strongest. */
  slow?: { mult: number; ms: number };
  /** Exposed: the next non-DOT hit does 1.5× and clears it. */
  expose?: number;
  /** Takes `mult`× damage from everything for the duration. */
  weaken?: { mult: number; ms: number };
  /** Bleed: 2% of max HP per second, for ms. */
  bleed?: number;
  /** Shove back along the path by this many px. */
  knockback?: number;
  /** Chance (0–1) to apply this rider at all — omitted means always. */
  chance?: number;
}

export type TowerFx =
  /** A projectile toward the target. `damage` per hit. */
  | {
      kind: 'bolt';
      texture?: string;
      color: number;
      speed: number;
      /** Shots per cast; spread (radians) fans them. */
      count?: number;
      spread?: number;
      /** Bodies the shot passes through before dying (0 = stops at first). */
      pierce?: number;
      homing?: boolean;
      /** Display scale of the projectile image. */
      size?: number;
      /** Splash radius on impact; splash damage = damage × splashMult (default 0.5). */
      splash?: number;
      splashMult?: number;
      /** Fire from above the target (artillery) instead of from the tower. */
      lob?: boolean;
    }
  /** Instant blast centred on the target (optionally after a telegraph). `damage` to all in radius. */
  | { kind: 'splash'; radius: number; color: number; delayMs?: number; shape?: 'burst' | 'ring' | 'crater' | 'strike' }
  /** A hitscan line from the tower through the target. `damage` to all along it. */
  | { kind: 'line'; length: number; width: number; color: number }
  /** A lingering ground zone at the target. `damage` is per second. */
  | { kind: 'zone'; radius: number; ms: number; color: number; shape?: 'puddle' | 'fire' | 'ice' | 'rune' }
  /** A permanent aura around the tower. `damage` per second; cooldown = tick interval. */
  | { kind: 'aura'; radius: number; color: number }
  /** A beam locked on the target for `ms`. `damage` per second. */
  | { kind: 'beam'; color: number; width: number; ms: number }
  /** Hits the target, then arcs to `jumps` more husks within jumpRange. */
  | { kind: 'chain'; jumps: number; jumpRange: number; color: number; falloff?: number }
  /** A burst around the tower itself. */
  | { kind: 'nova'; radius: number; color: number }
  /** Buffs every tower in radius (including itself) for ms. */
  | { kind: 'rally'; radius: number; ms: number; fireRateMult?: number; damageMult?: number; color: number }
  /** A guardian stands on the path near the target for ms, striking husks around it. `damage` per strike. */
  | { kind: 'summon'; ms: number; color: number; attackMs: number; attackRange: number; label: string }
  /** A wall on the path. Husks must chew through `hp` before moving on. `damage` is its retaliation per bite. */
  | { kind: 'barrier'; ms: number; hp: number; color: number; label: string }
  /** Kills the target outright under `thresholdFrac` of max HP; otherwise `damage`. */
  | { kind: 'execute'; thresholdFrac: number; color: number }
  /** Pays gold instead of hurting anyone. */
  | { kind: 'gold'; amount: number; color: number };

export interface TowerAbilityDef {
  /** Base damage (per hit, or per second for aura/zone/beam). Scaled by tier and mods. */
  damage: number;
  /** Ms between casts. */
  cooldown: number;
  /** Range multiplier on the tower's base range (default 1). Auras use it as radius scale. */
  range?: number;
  /** Override the name taken from the element's real ability on this slot. */
  name?: string;
  /** One line for the tower panel. */
  desc: string;
  rider?: Rider;
  fx: TowerFx;
}

/** A shop upgrade, perk or mastery folded onto a tower ability. */
export interface TowerMod {
  damageMult?: number;
  cooldownMult?: number;
  rangeMult?: number;
  /** Multiplies radius / length / jumpRange — whichever the fx has. */
  areaMult?: number;
  /** Adds to bolt count / chain jumps / pierce. */
  countAdd?: number;
  pierceAdd?: number;
  /** Merged over the ability's rider. */
  rider?: Rider;
  /** Printed in the tower panel next to the upgrade's own name. */
  note: string;
}

export interface TowerDef {
  /** Tier 0 is the placed tower; tiers 1–4 are the four purchasable upgrades. */
  tiers: [string, string, string, string, string];
  /** Placement cost in gold. */
  cost: number;
  /** Targeting range in px (tier 0). */
  range: number;
  /** One ability per slot, unlocked in slot order as the tower tiers up. */
  abilities: Record<TowerSlot, TowerAbilityDef>;
  /** Owned shop upgrades, by slot. */
  upgrades: Partial<Record<TowerSlot, TowerMod>>;
  /** Element Mastery: a sixth, passive-cast ability the tower gains when mastery is enabled. */
  mastery?: TowerAbilityDef & { name: string };
}

/** Flat stat ramp every tower follows as it tiers up. */
export const TIER_DAMAGE_MULT = [1, 1.18, 1.38, 1.62, 1.9];
export const TIER_RANGE_MULT = [1, 1.05, 1.1, 1.16, 1.22];
export const TIER_COOLDOWN_MULT = [1, 0.96, 0.92, 0.88, 0.82];
/** Tier costs as a fraction of the tower's placement cost. */
export const TIER_COST_MULT = [0, 1.1, 1.6, 2.3, 3.2];
