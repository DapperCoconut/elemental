/**
 * Stronghold — the tower-defense mode. Shared types.
 *
 * Towers are the elements, but they cannot run the 1v1 ability code: every element kit is
 * hard-wired to the arena's single `player` slot (see DuoKit's header for the long version).
 * So a tower carries a *tower moveset* built from the vocabulary below, keeping the element's
 * colours, statuses and ability names.
 *
 * A tower is placed with one or two base attacks and grows through three upgrade PATHS of five
 * tiers each, BTD-style: any path may go to tier 5, a second path to tier 2, the third stays
 * shut. Each upgrade can retune an attack, add or replace one, change the tower's own stats and
 * passives, and paints a little more onto the tower. The middle path always earns an activated
 * ability. Shop upgrades, perks and masteries play no part here.
 *
 * What else makes towers play differently, all declared here:
 *   - the BODY: where it stands and how it moves (ground, naval, a looping flyer, a hovering
 *     flyer that chases the pack, a drifting storm cloud, a prowler);
 *   - the ROLE: what it is for — printed on its card;
 *   - the effect VOCABULARY: bolts, beams and blasts, but also traps, minions that walk against
 *     the flow, mini-sentries, conversions, fences, overclocks, map-wide fields, keep repairs;
 *   - TRAITS: passives (detection, buff auras, income, discounts, keep wards, veterans...).
 */

/** The old five ability keys. Kept as gesture hints for the rig. */
export type TowerSlot = 'click' | 'e' | 'r' | 'f' | 'q';

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
  /** ace: loop radius. heli/drift/roam: how far from the pad it may go. */
  leash?: number;
  /** px/s for flyers. */
  speed?: number;
}
export const BODY_LABEL: Record<TowerBodyKind, string> = {
  ground: 'GROUND', water: 'NAVAL', amphibious: 'AMPHIBIOUS', ace: 'FLYER', heli: 'HOVER', drift: 'CLOUD', roam: 'PROWLER',
};

/** On-hit statuses a tower attack leaves on a husk. All durations in ms. */
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
  // ── Added with the upgrade-path overhaul ──
  /** Extra damage as a fraction of the husk's CURRENT health (bosses take a quarter of it). */
  pct?: number;
  /** Grounded: an airborne husk drops to the road for ms (traps, walls and zones reach it). */
  ground?: number;
  /** Chance (0–1) to throw a non-boss husk back to its breach. */
  banish?: number;
  /** Strips a hidden husk's camouflage for good. */
  unmask?: boolean;
  /** Brittle: every hit it takes for ms lands `add` extra flat damage. */
  brittle?: { add: number; ms: number };
  /** Chance (0–1) to apply this rider at all — omitted means always. */
  chance?: number;
}

export type ProjectileLook =
  | 'orb' | 'dart' | 'fan' | 'card' | 'shell' | 'star' | 'note' | 'needle' | 'coin'
  | 'bubble' | 'feather' | 'bone' | 'shard' | 'bolt' | 'plane' | 'bee' | 'pawn';
export type TrapLook = 'spike' | 'mine' | 'rune' | 'seed' | 'glue' | 'coin' | 'bone' | 'pin' | 'hive';
export type MinionLook = 'soldier' | 'ghost' | 'golem' | 'car' | 'wolf' | 'convert' | 'curling' | 'stone' | 'piece' | 'crow' | 'shark' | 'spider';
export type SentryLook = 'turret' | 'drone' | 'idol' | 'crystal' | 'barracks' | 'pawn' | 'hive';
export type ZoneShape = 'puddle' | 'fire' | 'ice' | 'rune' | 'sand' | 'acid' | 'paint' | 'mold' | 'storm' | 'glue' | 'holy' | 'smoke' | 'lava';
export type SplashShape = 'burst' | 'ring' | 'crater' | 'strike' | 'geyser' | 'meteor';

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
      /** Fire the volley this many times in a row, 90ms apart (a burst, not a spread). */
      salvo?: number;
    }
  | { kind: 'splash'; radius: number; color: number; delayMs?: number; shape?: SplashShape }
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
  /** Pays `amount` gold. */
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
  | { kind: 'overclock'; ms: number; fireRateMult: number; damageMult: number; color: number }
  /** Hits EVERY husk on the map (hidden and submerged ones too) — for map-wide abilities. */
  | { kind: 'field'; color: number }
  /** Repairs the keep: `amount` lives back (never above the starting count). */
  | { kind: 'mend'; amount: number; color: number };

/**
 * Every tunable field across the fx kinds, so an upgrade can patch one without restating the
 * whole effect. Fields that do not exist on the attack's kind are ignored.
 */
export interface FxPatch {
  color?: number; texture?: string; look?: string; shape?: string; label?: string;
  speed?: number; count?: number; spread?: number; pierce?: number; homing?: boolean; size?: number;
  splash?: number; splashMult?: number; lob?: boolean; returns?: boolean; bounces?: number;
  broadside?: boolean; salvo?: number;
  radius?: number; delayMs?: number; length?: number; width?: number; ms?: number; pull?: number;
  ramp?: number; jumps?: number; jumpRange?: number; falloff?: number;
  fireRateMult?: number; damageMult?: number; rangeMult?: number;
  attackMs?: number; attackRange?: number; hp?: number; thresholdFrac?: number; amount?: number;
  hits?: number; blast?: number; max?: number;
}

export interface TowerAbilityDef {
  /** Base damage (per hit, or per second for aura/zone/beam). */
  damage: number;
  cooldown: number;
  /** Range multiplier on the tower's range (default 1). Auras use it as radius scale. */
  range?: number;
  /** The name the panel and the journal print. */
  name?: string;
  desc: string;
  rider?: Rider;
  /** Overrides the damage type the effect kind implies. */
  dtype?: DamageType;
  /** Which arm move the rig plays when it fires. */
  gesture?: TowerSlot;
  /** Charge-up: damage grows by this fraction per second since the last cast, up to ×chargeCap. */
  charge?: { perSec: number; cap: number };
  fx: TowerFx;
}

/** A change an upgrade makes to one of the tower's attacks. */
export interface TowerMod {
  damageMult?: number;
  /** Flat damage added before the multiplier. */
  damageAdd?: number;
  cooldownMult?: number;
  rangeMult?: number;
  /** Scales every area field (radius, length, splash, jumpRange, attackRange, blast, line width). */
  areaMult?: number;
  /** +shots / +jumps / +traps / +sentries / +minion hits. */
  countAdd?: number;
  /** +bodies pierced / +trap hits / +minion hits. */
  pierceAdd?: number;
  /** Merged over the attack's rider. */
  rider?: Rider;
  dtype?: DamageType;
  fx?: FxPatch;
  charge?: { perSec: number; cap: number };
}

/**
 * The passives that make a tower its own. The scene and combat engine implement them. Upgrades
 * merge their own `traits` over the base ones (later tiers overwrite).
 */
export interface TowerTraits {
  /** Can target hidden husks. */
  detect?: boolean;
  /** A permanent buff to towers around it (Sound's drum, Psychic's pieces). */
  aura?: {
    radius: number; fireRate?: number; damage?: number; range?: number;
    detect?: boolean; pierce?: number; label: string; color: number;
  };
  /** Gold paid every wave clear. */
  income?: number;
  /** Pays this fraction of your banked gold at wave clear (capped at 50 + 2 per wave). */
  interest?: number;
  crit?: { chance: number; mult: number };
  /** Every instant cast repeats itself `delayMs` later at `mult` strength. */
  echo?: { delayMs: number; mult: number };
  /** Its main attack copies the nearest other tower's main attack. */
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
  /** Kills in range pay this fraction extra gold. */
  plunder?: number;
  /** Damage multiplier on frozen or heavily frosted husks. */
  shatter?: number;
  /** Damage multiplier on hidden husks. */
  vsHidden?: number;
  /** Damage multiplier on husks of these categories (normal / abstract / corrupt). */
  vsCategory?: { cats: string[]; mult: number };
  // ── Added with the upgrade-path overhaul ──
  /** Towers built or upgraded within radius cost `mult` as much (the best discount applies). */
  discount?: { radius: number; mult: number };
  /** Soaks this many lives' worth of breaches each wave before the keep loses any. */
  keepWard?: number;
  /** +per damage for every wave cleared while it stands, up to cap. */
  veteran?: { per: number; cap: number };
  /** Each hit it lands pays `perHit` gold, up to `cap` gold a wave. */
  goldOnHit?: { perHit: number; cap: number };
  /** Consecutive hits on the same husk ramp +per damage each, up to cap. */
  focus?: { per: number; cap: number };
  /** Husks it kills burst into `count` shards that hit the husks around for `frac` of their max HP... of the victim's max HP. */
  shrapnel?: { count: number; frac: number };
  /** Gold paid every second while a wave is on. */
  trickle?: number;
  /** Damage multiplier on husks that are slowed, stunned, frozen, asleep or encased. */
  bully?: number;
}

/**
 * A button the player presses. Fired at the tower's current target (or, when `global`, the
 * lead husk anywhere on the map); `selfBuff` also pumps the tower itself for ms.
 */
export interface TowerActive {
  name: string;
  desc: string;
  /** ms between uses. */
  cooldown: number;
  /** Optional: an attack cast once when pressed. */
  cast?: TowerAbilityDef;
  /** Optional: a burst of speed/damage on the tower for ms. */
  selfBuff?: { ms: number; fireRateMult?: number; damageMult?: number; rangeMult?: number };
  /** Aim at the lead husk anywhere on the map, not just in range. */
  global?: boolean;
}

/**
 * The little things an upgrade paints onto the tower, so a glance tells you what it has bought.
 * Each kind has a home on the tower (head, orbit, base, side) and grows with its tier.
 */
export type DecoKind =
  // over the head
  | 'crown' | 'halo' | 'horns' | 'antenna' | 'hat' | 'eye' | 'star' | 'moon' | 'sun' | 'skull' | 'flame'
  // circling
  | 'orbit' | 'sparks' | 'bubbles' | 'coins' | 'leaves' | 'motes' | 'notes' | 'bees' | 'cards'
  // on the plinth
  | 'spikes' | 'runes' | 'gears' | 'chains' | 'crystals' | 'roots' | 'bricks' | 'gold-trim' | 'moat' | 'bones'
  // at the side
  | 'banner' | 'shield' | 'barrel' | 'scope' | 'drum' | 'book' | 'wings' | 'cape' | 'lantern' | 'sack' | 'pennant';

export interface TowerDeco {
  kind: DecoKind;
  /** Defaults to the tower's colour. */
  color?: number;
}

export interface TowerUpgrade {
  name: string;
  /** One line: what buying it does. */
  desc: string;
  cost: number;
  /** Changes to attacks by id; '*' applies to every attack the tower has at that point. */
  mods?: Record<string, TowerMod>;
  /** Attacks added, or replaced when the id already exists. */
  add?: Record<string, TowerAbilityDef>;
  /** Attack ids taken away (when an upgrade turns one attack into another). */
  remove?: string[];
  /** Tower reach multiplier (stacks). */
  range?: number;
  /** Merged over the tower's traits. */
  traits?: Partial<TowerTraits>;
  /** Grants or replaces the tower's activated ability. Middle path only. */
  active?: TowerActive;
  /** Patches the tower's body (a longer leash, faster flight). */
  body?: Partial<TowerBody>;
  deco: TowerDeco;
}

export interface TowerPath {
  name: string;
  /** What the path is about, in a few words. */
  theme: string;
  upgrades: [TowerUpgrade, TowerUpgrade, TowerUpgrade, TowerUpgrade, TowerUpgrade];
}

export interface TowerDef {
  /** Placement price. */
  cost: number;
  /** Targeting range in px. */
  range: number;
  role: TowerRole;
  body: TowerBody;
  /** One line on how this tower plays — the card and the panel print it. */
  blurb: string;
  /** Signature passive: its name and one-line description. */
  signature: { name: string; desc: string };
  traits: TowerTraits;
  /** What it does the moment it is built. Keyed by attack id; upgrades refer to these ids. */
  attacks: Record<string, TowerAbilityDef>;
  /** Top (0), middle (1, carries the activated ability) and bottom (2). */
  paths: [TowerPath, TowerPath, TowerPath];
}

/** BTD crosspathing: one path may reach 5, a second may reach 2, the third stays at 0. */
export const PATH_MAX_TIER = 5;
export const CROSSPATH_MAX = 2;

/** Which path tiers can be bought from here. Returns null when allowed, or why not. */
export function pathBlock(tiers: readonly number[], path: number): string | null {
  const t = tiers[path];
  if (t >= PATH_MAX_TIER) return 'MAXED';
  const others = tiers.filter((_, i) => i !== path);
  const opened = others.filter((x) => x > 0).length;
  if (t === 0 && opened >= 2) return 'TWO PATHS ALREADY CHOSEN';
  // Going past 2 is only allowed if no other path is past 2.
  if (t + 1 > CROSSPATH_MAX && others.some((x) => x > CROSSPATH_MAX)) return 'ANOTHER PATH IS PAST TIER 2';
  return null;
}

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
