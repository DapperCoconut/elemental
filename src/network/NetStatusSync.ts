import type { Fighter } from '../entities/Fighter';
import { STATUS_DESCRIPTORS, remainingMs, type StatusDescriptor } from '../combat/StatusEffects';

/**
 * Generic status-effect mirroring for online PvP.
 *
 * Damage is attacker-authoritative (see `Fighter.netAuthoritativeDamage`), which fixes
 * "my attacks do nothing" — but a debuff is not a hit. An opponent's freeze, silence,
 * slow or poison is applied by *their* sim to *their* replica of us, and only reaches
 * our real fighter if the ability's npc-side replay happens to reproduce it. Rather than
 * trust ~200 replay paths to each apply their own effects, this diffs the generic
 * `Fighter` status fields off the replica and ships them across at 10 Hz.
 *
 * Merge rule: a mirrored effect is only ever *added*. Anything the opponent isn't
 * applying is left alone, so our own self-applied buffs and locally-replayed debuffs
 * are never stomped. Timers are relayed as remaining milliseconds — the two machines
 * share no clock — and re-based on arrival.
 */

/** One mirrored effect: a timer (`ms` left) or a plain magnitude (`v`). */
export interface NetStatusEntry {
  /** Descriptor id (timers) or field key (numerics). */
  i: string;
  /** Milliseconds left, for timers. */
  ms?: number;
  /** 1 when the source expiry is on the wall clock rather than the game clock. */
  w?: 1;
  /** Magnitude, for numeric fields. */
  v?: number;
}

/**
 * Timer statuses worth mirroring: every generic debuff a fighter can put on another one.
 * Buff timers are omitted — they are always self-applied, so the owner's own sim has them.
 */
const MIRRORED_TIMERS = new Set([
  'molten', 'burning', 'lava-burn', 'oily-burn', 'toxic', 'bleeding', 'sickness',
  'frozen', 'chicken', 'disarmed', 'silenced', 'chain-bound', 'skewered', 'vibration', 'wrenched',
  'confused', 'wandering', 'hallucinating', 'lagging', 'panicked', 'intoxicated', 'unsteady',
  'high-gravity', 'inverted', 'exposed', 'purged', 'heal-block', 'dark-link', 'oily',
]);

const TIMER_DESCRIPTORS: StatusDescriptor[] = STATUS_DESCRIPTORS
  .filter((d) => d.kind === 'timer' && !!d.write && MIRRORED_TIMERS.has(d.id));

interface NetNumericField {
  i: string;
  read(f: Fighter): number;
  /** Applied only when the incoming value is "worse" than what we already have. */
  apply(f: Fighter, v: number): void;
  /**
   * Undo the mirror. Called the first tick the opponent stops sending this one, so a
   * stack or flag we only ever learned about over the wire can't stick forever.
   */
  clear(f: Fighter): void;
}

/**
 * Numeric companions to the timers above (a toxic timer with no dps ticks nothing), plus
 * the stack-based debuffs and the two aggregate channels that have no field of their own.
 */
const NUMERIC_FIELDS: NetNumericField[] = [
  { i: 'bleed', read: (f) => (f.bleeding ? 1 : 0), apply: (f, v) => { if (v > 0) f.bleeding = true; }, clear: (f) => { f.bleeding = false; } },
  { i: 'chain', read: (f) => (f.magicChainBound ? 1 : 0), apply: (f, v) => { if (v > 0) f.magicChainBound = true; }, clear: (f) => { f.magicChainBound = false; } },
  { i: 'toxdps', read: (f) => f.toxicDps, apply: (f, v) => { f.toxicDps = Math.max(f.toxicDps, v); }, clear: (f) => { f.toxicDps = 0; } },
  { i: 'wrench', read: (f) => f.castPunishDamage, apply: (f, v) => { f.castPunishDamage = Math.max(f.castPunishDamage, v); }, clear: (f) => { f.castPunishDamage = 0; } },
  { i: 'aimoff', read: (f) => f.aimOffsetBonusDeg, apply: (f, v) => { f.aimOffsetBonusDeg = Math.max(f.aimOffsetBonusDeg, v); }, clear: (f) => { f.aimOffsetBonusDeg = 0; } },
  { i: 'stoke', read: (f) => f.fireStokeBonus, apply: (f, v) => { f.fireStokeBonus = Math.max(f.fireStokeBonus, v); }, clear: (f) => { f.fireStokeBonus = 0; } },
  { i: 'darkv', read: (f) => f.darkVulnStacks, apply: (f, v) => { f.darkVulnStacks = Math.max(f.darkVulnStacks, v); }, clear: (f) => { f.darkVulnStacks = 0; } },
  { i: 'hope', read: (f) => f.hopelessness, apply: (f, v) => { f.hopelessness = Math.max(f.hopelessness, v); }, clear: (f) => { f.hopelessness = 0; } },
  { i: 'vuln', read: (f) => (f.vulnerableNextHit ? 1 : 0), apply: (f, v) => { if (v > 0) f.vulnerableNextHit = true; }, clear: (f) => { f.vulnerableNextHit = false; } },
  // Permanent by design on both sims — mirrored once, never cleared.
  { i: 'carrier', read: (f) => (f.sicknessCarrier ? 1 : 0), apply: (f, v) => { if (v > 0) f.sicknessCarrier = true; }, clear: () => {} },
  { i: 'atkint', read: (f) => f.attackIntervalMult, apply: (f, v) => { f.attackIntervalMult = Math.max(f.attackIntervalMult, v); }, clear: (f) => { f.attackIntervalMult = 1; } },
  { i: 'incdmg', read: (f) => f.incomingDamageMultiplier, apply: (f, v) => { f.incomingDamageMultiplier = Math.max(f.incomingDamageMultiplier, v); }, clear: (f) => { f.incomingDamageMultiplier = 1; } },
  { i: 'outdmg', read: (f) => f.outgoingDamageMult, apply: (f, v) => { f.outgoingDamageMult = Math.min(f.outgoingDamageMult, v); }, clear: (f) => { f.outgoingDamageMult = 1; } },
  { i: 'frost', read: (f) => f.frostStacks, apply: applyFrost, clear: (f) => { f.frostStacks = 0; f.frostStackTimers.length = 0; } },
  { i: 'vfrost', read: (f) => f.voidFrostStacks, apply: applyVoidFrost, clear: (f) => { f.voidFrostStacks = 0; f.voidFrostStackTimers.length = 0; } },
  { i: 'pfrost', read: (f) => f.permafrostStacks, apply: (f, v) => { f.permafrostStacks = Math.max(f.permafrostStacks, v); }, clear: () => {} },
  { i: 'pvoid', read: (f) => f.permavoidStacks, apply: (f, v) => { f.permavoidStacks = Math.max(f.permavoidStacks, v); }, clear: () => {} },
];

/** Frost/void stacks carry a per-stack expiry array; top it up so mirrored stacks still thaw. */
function applyFrost(f: Fighter, v: number): void {
  const now = Date.now();
  while (f.frostStacks < v) {
    f.frostStacks++;
    f.frostStackTimers.push(now + 3000);
  }
}

function applyVoidFrost(f: Fighter, v: number): void {
  const now = Date.now();
  while (f.voidFrostStacks < v) {
    f.voidFrostStacks++;
    f.voidFrostStackTimers.push(now + 3000);
  }
}

/** Neutral value for a numeric field — anything at neutral is simply not sent. */
function isNeutral(i: string, v: number): boolean {
  if (i === 'outdmg' || i === 'atkint' || i === 'incdmg') return Math.abs(v - 1) < 0.001;
  return v <= 0;
}

/**
 * Read every mirrored effect off `replica` — the local copy of the remote player, which
 * carries exactly the debuffs *we* have applied to them and nothing else.
 */
export function collectNetStatuses(replica: Fighter, nowWall: number, nowGame: number): NetStatusEntry[] {
  const out: NetStatusEntry[] = [];
  for (const desc of TIMER_DESCRIPTORS) {
    const until = desc.read(replica);
    const left = remainingMs(until, nowWall, nowGame);
    if (left <= 0) continue;
    // The two timebases are told apart by magnitude, the same way the tray does it.
    const entry: NetStatusEntry = { i: desc.id, ms: Math.round(left) };
    if (until > 1e11) entry.w = 1;
    out.push(entry);
  }
  for (const field of NUMERIC_FIELDS) {
    const v = field.read(replica);
    if (isNeutral(field.i, v)) continue;
    out.push({ i: field.i, v: Math.round(v * 1000) / 1000 });
  }
  return out;
}

const TIMER_BY_ID = new Map(TIMER_DESCRIPTORS.map((d) => [d.id, d]));
const NUMERIC_BY_ID = new Map(NUMERIC_FIELDS.map((f) => [f.i, f]));

/**
 * Apply a mirrored effect set to our own fighter, re-basing timers onto our clocks.
 *
 * `mirrored` is the id set applied last tick, owned by the caller: a stack or flag that
 * stops arriving is undone, since the only thing that knew about it was the wire. Timers
 * need no such bookkeeping — they run out on their own.
 */
export function applyNetStatuses(
  f: Fighter,
  entries: NetStatusEntry[],
  nowWall: number,
  nowGame: number,
  mirrored: Set<string>,
): void {
  const seen = new Set<string>();
  for (const e of entries) {
    if (e.ms !== undefined) {
      const desc = TIMER_BY_ID.get(e.i);
      if (!desc?.write) continue;
      const base = e.w ? nowWall : nowGame;
      const until = base + e.ms;
      // Only ever extend: a longer local copy (ours, or one the replay already applied) wins.
      if (remainingMs(desc.read(f), nowWall, nowGame) < e.ms) desc.write(f, until);
    } else if (e.v !== undefined) {
      const field = NUMERIC_BY_ID.get(e.i);
      if (!field) continue;
      field.apply(f, e.v);
      seen.add(e.i);
    }
  }
  for (const id of mirrored) {
    if (!seen.has(id)) NUMERIC_BY_ID.get(id)?.clear(f);
  }
  mirrored.clear();
  for (const id of seen) mirrored.add(id);
}
