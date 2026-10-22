/**
 * Stronghold — the tower-defense mode. Shared types.
 *
 * Towers are the elements, but they cannot run the 1v1 ability code: every element kit is
 * hard-wired to the arena's single `player` slot (see DuoKit's header for the long version).
 * So a tower carries a *tower moveset*: five abilities that keep the element's real names,
 * key order (Click → E → R → F → Q), colours and statuses, with the mechanics bent into shapes a
 * tower can use.
 *
 * What makes towers play differently is not the numbers but four other axes, all declared here:
 *   - the BODY: where it stands and how it moves (ground, naval, a looping flyer, a hovering
 *     flyer that chases the pack, a drifting storm cloud);
 *   - the ROLE: what it is for (attack, support, control, traps, summons, economy, sniping,
 *     artillery) — printed on its card;
 *   - the effect VOCABULARY: bolts, beams and blasts, but also traps on the road, minions that
 *     walk against the flow, mini-sentries, conversions, fences, overclocks;
 *   - its SIGNATURE: one passive only that element has (Echo recasts, Illusion mimics, Soul
 *     raises the fallen, Gold banks interest...).
 */

export type TowerSlot = 'click' | 'e' | 'r' | 'f' | 'q';
export const TOWER_SLOTS: TowerSlot[] = ['click', 'e', 'r', 'f', 'q'];
export const TOWER_SLOT_KEYS: Record<TowerSlot, string> = { click: 'Click', e: 'E', r: 'R', f: 'F', q: 'Q' };

/**
 * What kind of hurt a hit is. Husk armour cares: Metal shrugs off sharp, Earth blunts blasts,
 * Plasma drinks energy. Default comes from the effect kind (bolt → sharp, splash → blast, beam
 * and chain → energy, zones and auras → magic).
 */
export type DamageType = 'sharp' | 'blast' | 'energy' | 'magic';
export const DAMAGE_TYPE_LABEL: Record<DamageType, string> = { sharp: 'SHARP', blast: 'BLAST', energy: 'ENERGY', magic: 'MAGIC' };

export type TargetMode = 'first' | 'last' | 'strong' | 'close';
export const TARGET_MODES: TargetMode[] = ['first', 'last', 'strong', 'close'];

export type TowerRole = 'attack' | 'support' | 'control' | 'trap' | 'summoner' | 'economy' | 'sniper' | 'artillery';
export const ROLE_LABEL: Record<TowerRole, string> = {
  attack: 'ATTACK', support: 'SUPPORT', control: 'CONTROL', trap: 'TRAPPER',
  summoner: 'SUMMONER', economy: 'ECONOMY', sniper: 'SNIPER', artillery: 'ARTILLERY',
};

/**
 * Where a tower stands and how it moves.
 *   ground     — dry land beside the road (the default).
 *   water      — naval: only in water.
 *   amphibious — land or water.
 *   ace        — built on a pad, flies wide loops around it and fires from the air.
 *   heli       — built on a pad, hovers over the lead husk within `leash` of it.
 *   drift      — a slow cloud that drifts to wherever the pack is thickest within `leash`.
 *   roam       — a ground hunter that leaves its post to run down the lead husk within `leash`.
 */
export type TowerBodyKind = 'ground' | 'water' | 'amphibious' | 'ace' | 'heli' | 'drift' | 'roam';
export interface TowerBody {
  kind: TowerBodyKind;
  /** ace: loop radius. heli/drift: how far from the pad it may go. */
  leash?: number;
  /** px/s for flyers. */
  speed?: number;
}
export const BODY_LABEL: Record<TowerBodyKind, string> = {
  ground: 'GROUND', water: 'NAVAL', amphibious: 'AMPHIBIOUS', ace: 'FLYER', heli: 'HOVER', drift: 'CLOUD', roam: 'PROWLER',
};

/** On-hit statuses a tower ability leaves on a husk. All durations in ms. */
export interface Rider {
  burn?: number;
  toxic?: { ms: number; dps: number };
  /** Frost stacks added; 10% slow each, capped at 80%. */
  frost?: number;
  freeze?: number;
  stun?: number;
  slow?: { mult: number; ms: number };
  /** Exposed: the next non-DOT hit does 1.5× and clears it. */
  expose?: number;
  /** Takes `mult`× damage from everything for the duration. */
  weaken?: { mult: number; ms: number };
  /** Bleed: 2% of max HP per second. */
  bleed?: number;
  /** Shove back along the road by this many px. */
  knockback?: number;
  /** Soaked: electric hits ×1.5, frost doubled. */
  soak?: number;
  /** Corroded: armour, shells and wards stop counting. */
  corrode?: number;
  /** Asleep until it runs out or takes three hits. */
  sleep?: number;
  /** Turned around: walks back toward the breach. */
  confuse?: number;
  /** Everything one cast hits is stitched together; each shares 30% of its hits with the rest. */
  link?: number;
  /** Radiation stacks (0.4% max HP/s each, up to 12). */
  radiate?: number;
  /** Ruin stacks; the fifth collapses for 12% max HP. */
  ruin?: number;
  /** Infected: its toxic spreads to neighbours on death. Needs `toxic` alongside. */
  infect?: number;
  /** Gilded: pays this multiple of its bounty if it dies inside 6s. */
  gild?: number;
  /** Reveals a hidden husk for ms. */
  reveal?: number;
  /** Encased in wax: stopped, and blasts land ×1.6. */
  encase?: number;
  /** Chance (0–1) to apply this rider at all — omitted means always. */
  chance?: number;
}

export type ProjectileLook =
  | 'orb' | 'dart' | 'fan' | 'card' | 'shell' | 'star' | 'note' | 'needle' | 'coin'
  | 'bubble' | 'feather' | 'bone' | 'shard' | 'bolt' | 'plane' | 'bee' | 'pawn';
export type TrapLook = 'spike' | 'mine' | 'rune' | 'seed' | 'glue' | 'coin' | 'bone' | 'pin' | 'hive';
export type MinionLook = 'soldier' | 'ghost' | 'golem' | 'car' | 'wolf' | 'convert' | 'curling' | 'stone' | 'piece' | 'crow' | 'shark';
export type SentryLook = 'turret' | 'drone' | 'idol' | 'crystal' | 'barracks' | 'pawn' | 'hive';

export type TowerFx =
  /** A projectile toward the target. */
  | {
      kind: 'bolt';
      texture?: string;
      look?: ProjectileLook;
      color: number;
      speed: number;
      count?: number;
      spread?: number;
      /** Bodies the shot passes through before dying. */
      pierce?: number;
      homing?: boolean;
      size?: number;
      splash?: number;
      splashMult?: number;
      /** Artillery: drop from above onto the target. */
      lob?: boolean;
      /** Flies out to max range and comes back (glaives, boomerangs). */
      returns?: boolean;
      /** Ricochets to this many further husks after the first hit. */
      bounces?: number;
      /** Fire two volleys out of the tower's sides instead of at the target (a broadside). */
      broadside?: boolean;
    }
  | { kind: 'splash'; radius: number; color: number; delayMs?: number; shape?: 'burst' | 'ring' | 'crater' | 'strike' | 'geyser' | 'meteor' }
  | { kind: 'line'; length: number; width: number; color: number }
  /** A lingering ground zone at the target. `damage` is per second. `pull` drags husks back toward the breach (px/s). */
  | { kind: 'zone'; radius: number; ms: number; color: number; shape?: ZoneShape; pull?: number }
  /** A permanent aura around the tower. `damage` per second; cooldown = tick interval. */
  | { kind: 'aura'; radius: number; color: number; look?: 'heat' | 'orbit' | 'frost' | 'rad' | 'pulse' }
  /** A beam locked on the target. `damage` per second. `ramp` adds that fraction per second held. */
  | { kind: 'beam'; color: number; width: number; ms: number; ramp?: number }
  | { kind: 'chain'; jumps: number; jumpRange: number; color: number; falloff?: number }
  | { kind: 'nova'; radius: number; color: number }
  /** Buffs every tower in radius (radius ≤ 1 = only itself) for ms. */
  | { kind: 'rally'; radius: number; ms: number; fireRateMult?: number; damageMult?: number; rangeMult?: number; color: number }
  /** A guardian stands on the road near the target, striking husks around it. `damage` per strike. */
  | { kind: 'summon'; ms: number; color: number; attackMs: number; attackRange: number; label: string }
  /** A wall on the road. Husks must chew through `hp`. `damage` is its retaliation per second. */
  | { kind: 'barrier'; ms: number; hp: number; color: number; label: string }
  | { kind: 'execute'; thresholdFrac: number; color: number }
  | { kind: 'gold'; amount: number; color: number }
  /** Drops `count` traps on the road near the target. Each hurts `hits` husks for `damage`, then breaks. `blast` makes it a mine. */
  | { kind: 'trap'; count: number; hits: number; ms: number; color: number; look: TrapLook; blast?: number }
  /** A unit that marches from the keep end of the road back toward the breach, hitting every husk it meets for `damage`. */
  | { kind: 'minion'; hits: number; speed: number; ms: number; color: number; look: MinionLook; size?: number }
  /** Builds a mini-tower beside this one that fires bolts for `damage` every attackMs. */
  | { kind: 'sentry'; ms: number; max: number; attackMs: number; range: number; color: number; look: SentryLook }
  /** Turns a non-boss husk under the threshold into a minion that marches back up the road. */
  | { kind: 'convert'; thresholdFrac: number; color: number; look: MinionLook }
  /** A line across the road at the target; every husk that crosses it takes `damage` once. */
  | { kind: 'fence'; ms: number; color: number; width: number }
  /** Supercharges the strongest other tower in range. */
  | { kind: 'overclock'; ms: number; fireRateMult: number; damageMult: number; color: number };

export type ZoneShape = 'puddle' | 'fire' | 'ice' | 'rune' | 'sand' | 'acid' | 'paint' | 'mold' | 'storm' | 'glue' | 'holy' | 'smoke' | 'lava';

export interface TowerAbilityDef {
  /** Base damage (per hit, or per second for aura/zone/beam). Scaled by tier and mods. */
  damage: number;
  cooldown: number;
  /** Range multiplier on the tower's base range (default 1). Auras use it as radius scale. */
  range?: number;
  name?: string;
  desc: string;
  rider?: Rider;
  /** Overrides the damage type the effect kind implies. */
  dtype?: DamageType;
  fx: TowerFx;
}

/** A shop upgrade, perk or mastery folded onto a tower ability. */
export interface TowerMod {
  damageMult?: number;
  cooldownMult?: number;
  rangeMult?: number;
  areaMult?: number;
  countAdd?: number;
  pierceAdd?: number;
  rider?: Rider;
  note: string;
}

/**
 * The passives that make an element's tower its own. Each key is one mechanic; the scene and
 * combat engine implement them. A tower carries one or two, never all.
 */
export interface TowerTraits {
  /** Can target hidden husks from the start. */
  detect?: boolean;
  /** Learns to see hidden husks at this tier (0–4). */
  detectTier?: number;
  /** A permanent buff to towers around it (Sound's drum, Psychic's pieces). */
  aura?: {
    radius: number; fireRate?: number; damage?: number; range?: number;
    detect?: boolean; pierce?: number; label: string; color: number;
  };
  /** Gold paid every wave clear, + perTier each tier. */
  income?: { perWave: number; perTier: number };
  /** Pays this fraction of your banked gold at wave clear (capped at 10% of 1000). */
  interest?: number;
  crit?: { chance: number; mult: number };
  /** Every cast repeats itself `delayMs` later at `mult` strength. */
  echo?: { delayMs: number; mult: number };
  /** Its Click copies the nearest other tower's Click. */
  mimic?: boolean;
  /** +per damage for every kill it lands, up to cap. */
  killRamp?: { per: number; cap: number };
  /** Burning husks that die set their neighbours alight. */
  wildfire?: boolean;
  /** Husks that die in its range rise as ghosts marching back up the road. */
  raiseDead?: { chance: number; hits: number };
  /** Deaths in range charge it; at `need` charges its next cast lands ×mult. */
  reap?: { need: number; mult: number };
  /** Damage multiplier vs airborne husks. */
  antiAir?: number;
  /** Damage multiplier vs bosses. */
  bossBane?: number;
  /** Damage multiplier against husks of these elements (an elemental counter). */
  bane?: { elements: string[]; mult: number };
  /** Immune to husk sabotage (stuns, hacks, blinds). */
  steadfast?: boolean;
  /** Kills pay this fraction extra gold. */
  plunder?: number;
  /** Damage multiplier on frozen or heavily frosted husks. */
  shatter?: number;
  /** Damage multiplier on hidden husks. */
  vsHidden?: number;
  /** Damage multiplier on husks of these categories (normal / abstract / corrupt). */
  vsCategory?: { cats: string[]; mult: number };
}

export interface TowerDef {
  /** Tier 0 is the placed tower; tiers 1–4 are the four purchasable upgrades. */
  tiers: [string, string, string, string, string];
  cost: number;
  /** Targeting range in px (tier 0). */
  range: number;
  role: TowerRole;
  body: TowerBody;
  /** One line on how this tower plays — the card and the panel print it. */
  blurb: string;
  /** Signature passive: its name and one-line description, plus the mechanics. */
  signature: { name: string; desc: string };
  traits: TowerTraits;
  /** One ability per slot, unlocked in slot order as the tower tiers up. */
  abilities: Record<TowerSlot, TowerAbilityDef>;
  upgrades: Partial<Record<TowerSlot, TowerMod>>;
  mastery?: TowerAbilityDef & { name: string };
}

/** Flat stat ramp every tower follows as it tiers up. */
export const TIER_DAMAGE_MULT = [1, 1.2, 1.42, 1.7, 2.05];
export const TIER_RANGE_MULT = [1, 1.05, 1.1, 1.16, 1.22];
export const TIER_COOLDOWN_MULT = [1, 0.95, 0.9, 0.85, 0.78];
/** Tier costs as a fraction of the tower's placement cost. */
export const TIER_COST_MULT = [0, 1.1, 1.6, 2.3, 3.2];

/** The damage type an ability's effect implies, unless it says otherwise. */
export function damageTypeOf(a: TowerAbilityDef): DamageType {
  if (a.dtype) return a.dtype;
  switch (a.fx.kind) {
    case 'bolt': return a.fx.lob || a.fx.splash ? 'blast' : 'sharp';
    case 'splash': case 'nova': return 'blast';
    case 'line': case 'beam': case 'chain': case 'fence': return 'energy';
    case 'trap': return a.fx.blast ? 'blast' : 'sharp';
    case 'minion': case 'summon': case 'sentry': case 'barrier': case 'convert': return 'sharp';
    default: return 'magic';
  }
}
