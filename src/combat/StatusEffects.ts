import type { Fighter } from '../entities/Fighter';

/**
 * Status-effect descriptor table driving the top-left effect indicator tray.
 *
 * This file is pure data + pure functions — no Phaser, no scene access — so it can be
 * read from any sim (1v1, online, invasion) without dragging in rendering concerns.
 * `StatusHudKit` owns all the drawing.
 */

export type StatusKind =
  /** `read()` returns an expiry timestamp; the box drains as it approaches. */
  | 'timer'
  /** `read()` returns a stack count, rendered as `xN`. */
  | 'stack'
  /** `read()` returns a magnitude (HP, %, per-second), rendered as a bare number. */
  | 'amount'
  /** `read()` returns 0/1; the box is either shown full or hidden. */
  | 'flag';

export interface StatusDescriptor {
  id: string;
  /** Tooltip title. */
  name: string;
  /** Box icon. */
  emoji: string;
  /** Box stroke + fill colour, chosen to match the emoji. */
  color: number;
  /** Tooltip body — what the effect actually does to you. */
  description: string;
  /** Sort order. Debuffs 0–99, buffs 100–149, always-on passives 150+. */
  priority: number;
  kind: StatusKind;
  read(f: Fighter): number;
  /**
   * Writes a new expiry back, for `timer` kinds only. Present purely so the Creation Gold
   * Potion can stretch a status it did not apply itself — see `stretchNewEffects`.
   */
  write?(f: Fighter, until: number): void;
  /**
   * Optional expiry for `stack`/`amount` kinds, so a stacking effect can still show a
   * draining bar. Ignored for `timer` (which reads its expiry from `read`) and `flag`.
   */
  readUntil?(f: Fighter): number;
  /** Suffix appended to the count text (e.g. '%', '/s'). */
  suffix?: string;
}

export interface ActiveStatus {
  desc: StatusDescriptor;
  /** Raw expiry timestamp in whichever clock the source field uses; 0 when untimed. */
  until: number;
  /** Milliseconds left, or 0 for untimed effects. */
  remainingMs: number;
  /** Stack count / magnitude; 0 when not applicable. */
  count: number;
}

/**
 * Fighter expiry fields are a mix of two timebases: `Date.now()` epochs
 * (`disarmedUntil`, `silencedUntil`, `chickenUntil`, …) and `scene.time.now` elapsed-ms
 * (`burningUntil`, `moltenUntil`, `exposedUntil`, …). Rather than tag every descriptor
 * with a clock — which silently rots the first time a field switches — separate them by
 * magnitude: epochs are ~1.7e12, elapsed-ms never realistically passes 1e10.
 */
export function remainingMs(until: number, nowWall: number, nowGame: number): number {
  if (until <= 0) return 0;
  return until > 1e11 ? until - nowWall : until - nowGame;
}

/** Newest (largest) entry in a stack-timer array, or 0 when empty. */
function latest(timers: number[]): number {
  let max = 0;
  for (const t of timers) if (t > max) max = t;
  return max;
}

/**
 * Every status the tray knows how to render, sourced from generic `Fighter` fields so it
 * works identically for 1v1, online and invasion. Element-specific effects that don't live
 * on Fighter are pushed in separately via `StatusHudKit.setCustom()`.
 */
export const STATUS_DESCRIPTORS: StatusDescriptor[] = [
  // ── Damage over time ─────────────────────────────────────────────
  {
    id: 'molten', name: 'Molten', emoji: '🌋', color: 0xff2200, priority: 0, kind: 'timer',
    description: 'Upgraded fire burn. Ticks heavier damage than a normal burn until it runs out.',
    read: (f) => f.moltenUntil,
    write: (f, t) => { f.moltenUntil = t; },
  },
  {
    id: 'burning', name: 'Burning', emoji: '🔥', color: 0xff6600, priority: 1, kind: 'timer',
    description: 'On fire. Takes damage every tick until the burn expires.',
    read: (f) => f.burningUntil,
    write: (f, t) => { f.burningUntil = t; },
  },
  {
    id: 'lava-burn', name: 'Scorched', emoji: '🪨', color: 0xdd5511, priority: 2, kind: 'timer',
    description: 'Standing lava rock is cooking you. Takes damage every tick.',
    read: (f) => f.lavaRockBurnUntil,
    write: (f, t) => { f.lavaRockBurnUntil = t; },
  },
  {
    id: 'oily-burn', name: 'Ignited Oil', emoji: '💥', color: 0xffaa22, priority: 3, kind: 'timer',
    description: 'The oil coating you caught fire. Takes damage every tick.',
    read: (f) => f.oilyBurnUntil,
    write: (f, t) => { f.oilyBurnUntil = t; },
  },
  {
    id: 'toxic', name: 'Toxic', emoji: '🤢', color: 0x66cc22, priority: 4, kind: 'timer',
    description: 'Poisoned. Takes damage every tick until it wears off.',
    read: (f) => f.toxicUntil,
    write: (f, t) => { f.toxicUntil = t; },
  },
  {
    id: 'bleeding', name: 'Bleeding', emoji: '🩸', color: 0xcc1122, priority: 5, kind: 'timer',
    description: 'Open wound. Loses health over time.',
    read: (f) => (f.bleeding ? f.bleedingUntil : 0),
    write: (f, t) => { f.bleedingUntil = t; },
  },
  {
    id: 'sickness', name: 'Sickness', emoji: '🩸', color: 0xdd2233, priority: 6, kind: 'timer',
    description: 'A syringe plague. Ticks damage on a timer, and carries every upgrade the syringe was built with — mounting vulnerability, slows, weakened attacks and contagion all ride on this one effect.',
    read: (f) => f.sicknessUntil,
    write: (f, t) => { f.sicknessUntil = t; },
  },

  // ── Hard control ─────────────────────────────────────────────────
  {
    id: 'frozen', name: 'Frozen', emoji: '🧊', color: 0x88ddff, priority: 10, kind: 'timer',
    description: 'Frozen solid. Cannot move until the ice breaks.',
    read: (f) => f.frozenUntil,
    write: (f, t) => { f.frozenUntil = t; },
  },
  {
    id: 'chicken', name: 'Chicken', emoji: '🐔', color: 0xffcc33, priority: 11, kind: 'timer',
    description: 'Transmogrified. Cannot cast any ability while a chicken.',
    read: (f) => f.chickenUntil,
    write: (f, t) => { f.chickenUntil = t; },
  },
  {
    id: 'disarmed', name: 'Disarmed', emoji: '🚫', color: 0xcc4444, priority: 12, kind: 'timer',
    description: 'Cannot cast any ability until this expires.',
    read: (f) => f.disarmedUntil,
    write: (f, t) => { f.disarmedUntil = t; },
  },
  {
    id: 'silenced', name: 'Silenced', emoji: '🤐', color: 0x8844aa, priority: 13, kind: 'timer',
    description: 'Only your click attack works — every other ability is locked out.',
    read: (f) => f.silencedUntil,
    write: (f, t) => { f.silencedUntil = t; },
  },
  {
    id: 'chain-bound', name: 'Chain Bound', emoji: '⛓️', color: 0x99aabb, priority: 14, kind: 'timer',
    description: 'Chained in place by dark magic.',
    read: (f) => (f.magicChainBound ? f.magicChainBoundEnd : 0),
    write: (f, t) => { f.magicChainBoundEnd = t; },
  },
  {
    id: 'skewered', name: 'Skewered', emoji: '🍢', color: 0xffaa22, priority: 15, kind: 'timer',
    description: 'Impaled. Dragged wherever the thing through you goes, and unable to act — until it meets a wall.',
    read: (f) => f.skeweredUntil,
    write: (f, t) => { f.skeweredUntil = t; },
  },
  {
    id: 'wrenched', name: 'Wrenched', emoji: '🔧', color: 0xcc6622, priority: 17, kind: 'timer',
    description: 'A wrench is jammed in your gear. Every ability you use costs you health until it works loose.',
    read: (f) => f.castPunishUntil,
    write: (f, t) => { f.castPunishUntil = t; },
  },

  // ── Frost / void stacks ──────────────────────────────────────────
  {
    id: 'frost', name: 'Frost', emoji: '❄️', color: 0x66ccff, priority: 20, kind: 'stack',
    description: 'Chilled. Each stack slows you further; enough stacks freeze you solid.',
    read: (f) => f.frostStacks,
    readUntil: (f) => latest(f.frostStackTimers),
  },
  {
    id: 'void-frost', name: 'Void Frost', emoji: '🟣', color: 0x8844cc, priority: 21, kind: 'stack',
    description: 'Void chill. Stacks slow you and drain health over time.',
    read: (f) => f.voidFrostStacks,
    readUntil: (f) => latest(f.voidFrostStackTimers),
  },
  {
    id: 'permafrost', name: 'Permafrost', emoji: '🥶', color: 0x44aadd, priority: 22, kind: 'stack',
    description: 'Permanent chill stacks. These do not expire for the rest of the match.',
    read: (f) => f.permafrostStacks,
  },
  {
    id: 'permavoid', name: 'Permavoid', emoji: '🕳️', color: 0x552277, priority: 23, kind: 'stack',
    description: 'Permanent void stacks. These do not expire for the rest of the match.',
    read: (f) => f.permavoidStacks,
  },

  // ── Soft control / disruption ────────────────────────────────────
  {
    id: 'confused', name: 'Confused', emoji: '💫', color: 0xffdd55, priority: 30, kind: 'timer',
    description: 'Your movement drifts in random directions.',
    read: (f) => f.slimeConfusedUntil,
    write: (f, t) => { f.slimeConfusedUntil = t; },
  },
  {
    id: 'wandering', name: 'Disoriented', emoji: '🌀', color: 0xccaa66, priority: 31, kind: 'timer',
    description: 'Dust in your eyes — movement and aim wander off target.',
    read: (f) => f.confusedWanderUntil,
    write: (f, t) => { f.confusedWanderUntil = t; },
  },
  {
    id: 'hallucinating', name: 'Hallucinating', emoji: '👁️', color: 0x772299, priority: 32, kind: 'timer',
    description: 'Seeing things that are not there.',
    read: (f) => f.hallucinatingUntil,
    write: (f, t) => { f.hallucinatingUntil = t; },
  },
  {
    id: 'migraine', name: 'Migraine', emoji: '🤯', color: 0xff3355, priority: 33, kind: 'timer',
    description: 'Splitting psychological distress. Two casts in every three go up to 30 degrees wide of whatever you aimed them at.',
    read: (f) => f.aimScatterUntil,
    write: (f, t) => { f.aimScatterUntil = t; },
  },
  {
    id: 'lagging', name: 'Lag', emoji: '📶', color: 0x2288cc, priority: 34, kind: 'timer',
    description: 'Bad connection. You rubber-band backwards, freeze in place at random, and your cooldowns stall out.',
    read: (f) => f.laggedUntil,
    write: (f, t) => { f.laggedUntil = t; },
  },
  {
    id: 'panicked', name: 'Panicked', emoji: '😱', color: 0xff44aa, priority: 33, kind: 'timer',
    description: 'Panicking — stabs against you drain far less stealth.',
    read: (f) => f.panickedUntil,
    write: (f, t) => { f.panickedUntil = t; },
  },
  {
    id: 'intoxicated', name: 'Intoxicated', emoji: '🍺', color: 0xddaa33, priority: 34, kind: 'timer',
    description: 'Drunk. Control is unreliable and a slow follows when it wears off.',
    read: (f) => f.intoxicatedUntil,
    write: (f, t) => { f.intoxicatedUntil = t; },
  },
  {
    id: 'unsteady', name: 'Unsteady Aim', emoji: '🎯', color: 0xbb7744, priority: 35, kind: 'timer',
    description: 'Your shots scatter off-target.',
    read: (f) => (f.aimOffsetBonusDeg > 0 ? f.aimOffsetBonusUntil : 0),
    write: (f, t) => { f.aimOffsetBonusUntil = t; },
  },
  {
    id: 'high-gravity', name: 'High Gravity', emoji: '⬇️', color: 0x8844cc, priority: 37, kind: 'timer',
    description: 'Crushed under enormous gravity. Speed boosts are cancelled, the Space dodge is dead, and no dash or movement ability will fire.',
    read: (f) => f.highGravityUntil,
    write: (f, t) => { f.highGravityUntil = t; },
  },
  {
    id: 'inverted', name: 'Inverted', emoji: '🔄', color: 0x9966ff, priority: 36, kind: 'timer',
    description: 'Your movement keys are mirrored — every direction goes the opposite way.',
    read: (f) => f.invertedControlsUntil,
    write: (f, t) => { f.invertedControlsUntil = t; },
  },

  // ── Amplifiers / suppressors ─────────────────────────────────────
  {
    id: 'exposed', name: 'Exposed', emoji: '💢', color: 0xff8844, priority: 40, kind: 'timer',
    description: 'The next hit you take is amplified 1.5x, then this is consumed.',
    read: (f) => f.exposedUntil,
    write: (f, t) => { f.exposedUntil = t; },
  },
  {
    id: 'marked', name: 'Marked', emoji: '🦴', color: 0xddccaa, priority: 39, kind: 'flag',
    description: 'The next hit you take deals double damage, then this is consumed.',
    read: (f) => (f.vulnerableNextHit ? 1 : 0),
  },
  {
    id: 'vulnerable', name: 'Vulnerable', emoji: '🔻', color: 0xcc2288, priority: 41, kind: 'stack',
    description: 'Dark corrosion. Each stack raises the damage you take by 25%.',
    read: (f) => f.darkVulnStacks,
  },
  {
    id: 'purged', name: 'Purged', emoji: '☠️', color: 0x99ff33, priority: 42, kind: 'timer',
    description: 'Acid purge — your speed boosts are suppressed while this lasts.',
    read: (f) => f.purgedUntil,
    write: (f, t) => { f.purgedUntil = t; },
  },
  {
    id: 'heal-block', name: 'Heal Block', emoji: '💔', color: 0x992233, priority: 43, kind: 'timer',
    description: 'All healing on you is ignored until this expires.',
    read: (f) => f.healStopUntil,
    write: (f, t) => { f.healStopUntil = t; },
  },
  {
    id: 'dark-link', name: 'Torture Link', emoji: '🕸️', color: 0x663388, priority: 44, kind: 'timer',
    description: 'Linked to your attacker — damage you take heals them.',
    read: (f) => f.darkLinkedUntil,
    write: (f, t) => { f.darkLinkedUntil = t; },
  },
  {
    id: 'oily', name: 'Oily', emoji: '🛢️', color: 0x664422, priority: 45, kind: 'timer',
    description: 'Coated in oil. Fire damage will set the coating alight.',
    read: (f) => f.oilyUntil,
    write: (f, t) => { f.oilyUntil = t; },
  },
  {
    id: 'fragile', name: 'Fragile', emoji: '📛', color: 0xdd3355, priority: 46, kind: 'amount',
    description: 'Taking extra damage from every source.',
    read: (f) => {
      const mult = f.incomingDamageMultiplier * f.gauntletDamageTakenMult * f.cardDamageTakenMult
        * f.empoweredIncomingMult * f.fortuneIncomingMult;
      return mult > 1.001 ? Math.round((mult - 1) * 100) : 0;
    },
    suffix: '%',
  },
  {
    id: 'weakened', name: 'Weakened', emoji: '🥀', color: 0x886699, priority: 47, kind: 'amount',
    description: 'Your outgoing damage is reduced.',
    read: (f) => {
      const mult = f.outgoingDamageMult * f.cardOutgoingDamageMult;
      return mult < 0.999 ? Math.round((1 - mult) * 100) : 0;
    },
    suffix: '%',
  },
  {
    id: 'hopeless', name: 'Hopelessness', emoji: '🕳️', color: 0x220033, priority: 47.5, kind: 'amount',
    description: 'Consumed by shadow. Every 2% cuts your outgoing damage by 1%, up to half at 100%. Drains 1% per second.',
    read: (f) => Math.round(f.hopelessness),
    suffix: '%',
  },
  {
    id: 'sluggish', name: 'Sluggish', emoji: '🐌', color: 0x998866, priority: 48, kind: 'amount',
    description: 'Your cooldowns tick over more slowly than normal.',
    read: (f) => (f.cooldownMult > 1.001 ? Math.round((f.cooldownMult - 1) * 100) : 0),
    suffix: '%',
  },
  {
    id: 'hobbled', name: 'Hobbled', emoji: '🦵', color: 0x8899aa, priority: 49, kind: 'amount',
    description: 'Your attack cadence has been slowed.',
    read: (f) => (f.attackIntervalMult > 1.001 ? Math.round((f.attackIntervalMult - 1) * 100) : 0),
    suffix: '%',
  },
  {
    id: 'slowed', name: 'Slowed', emoji: '🧱', color: 0x7788aa, priority: 50, kind: 'amount',
    description: 'Your movement speed is reduced.',
    read: (f) => {
      const mult = f.walkSpeedMult * f.purgeSpeedMult;
      return mult < 0.999 ? Math.round((1 - mult) * 100) : 0;
    },
    suffix: '%',
  },

  // ── Protective layers (buffs) ────────────────────────────────────
  {
    id: 'invincible', name: 'Invincible', emoji: '✨', color: 0xffff88, priority: 100, kind: 'flag',
    description: 'Immune to all incoming damage right now.',
    read: (f) => (f.isInvincible ? 1 : 0),
  },
  {
    id: 'shield-charge', name: 'Shield', emoji: '🛡️', color: 0x66aaff, priority: 101, kind: 'stack',
    description: 'Each charge fully blocks one incoming hit, no matter how big.',
    read: (f) => f.shieldCharges,
  },
  {
    id: 'shield-hp', name: 'Shield HP', emoji: '💠', color: 0x44ccff, priority: 102, kind: 'amount',
    description: 'A bonus health pool that soaks damage before your real health.',
    read: (f) => Math.round(f.shieldHp),
  },
  {
    id: 'clotted', name: 'Clotted', emoji: '🫀', color: 0x882233, priority: 103, kind: 'amount',
    description: 'Clotted health. Spent before normal health and soaks damage at half rate.',
    read: (f) => Math.round(f.clottedHp),
  },
  {
    id: 'weak-hp', name: 'Weak HP', emoji: '🩶', color: 0x999999, priority: 104, kind: 'amount',
    description: 'Temporary bonus health that soaks damage but decays at 3/s.',
    read: (f) => Math.round(f.weakHp),
  },
  {
    id: 'absorbing', name: 'Absorbing', emoji: '🌫️', color: 0xaaccdd, priority: 105, kind: 'flag',
    description: 'An absorber is intercepting hits before they reach your shields.',
    read: (f) => (f.damageAbsorber ? 1 : 0),
  },
  {
    id: 'armored', name: 'Armored', emoji: '🪖', color: 0x88aacc, priority: 106, kind: 'amount',
    description: 'Incoming damage is reduced by an active armor effect.',
    read: (f) => {
      const mult = f.droneArmorMult * f.kineticShieldMult * f.steelShieldMult
        * f.bribeIncomingMult * f.cardDamageTakenMult * f.potionArmorMult * f.hopelessIncomingMult;
      return mult < 0.999 ? Math.round((1 - mult) * 100) : 0;
    },
    suffix: '%',
  },
  {
    id: 'thorns', name: 'Thorns', emoji: '🌵', color: 0x448833, priority: 107, kind: 'amount',
    description: 'A share of the damage you take is reflected back at your attacker.',
    read: (f) => Math.round(f.reflectFraction * 100),
    suffix: '%',
  },

  // ── Offensive / utility buffs ────────────────────────────────────
  {
    id: 'empowered', name: 'Empowered', emoji: '💪', color: 0xff8844, priority: 110, kind: 'amount',
    description: 'Your outgoing damage is increased.',
    read: (f) => {
      const mult = f.outgoingDamageMult * f.cardOutgoingDamageMult;
      return mult > 1.001 ? Math.round((mult - 1) * 100) : 0;
    },
    suffix: '%',
  },
  {
    id: 'haste', name: 'Haste', emoji: '⚡', color: 0xffee44, priority: 111, kind: 'amount',
    description: 'Your ability cooldowns recharge faster than normal.',
    read: (f) => (f.cooldownMult < 0.999 ? Math.round((1 - f.cooldownMult) * 100) : 0),
    suffix: '%',
  },
  {
    id: 'swift', name: 'Swift', emoji: '👟', color: 0x99ddaa, priority: 112, kind: 'amount',
    description: 'Your movement speed is increased.',
    read: (f) => (f.walkSpeedMult > 1.001 ? Math.round((f.walkSpeedMult - 1) * 100) : 0),
    suffix: '%',
  },
  {
    id: 'regen', name: 'Regeneration', emoji: '💚', color: 0x33dd66, priority: 113, kind: 'amount',
    description: 'Steadily restoring health every second.',
    read: (f) => Math.round(f.regenPerSecond),
    suffix: '/s',
  },
  {
    id: 'dodge', name: 'Evasion', emoji: '🍀', color: 0x88ffdd, priority: 114, kind: 'amount',
    description: 'Chance to completely dodge an incoming hit. Each dodge spends 20%.',
    read: (f) => Math.round(Math.min(1, f.dodgeChance) * 100),
    suffix: '%',
  },
  {
    id: 'wind-dodge', name: 'Wind Dodge', emoji: '🍃', color: 0xccddff, priority: 114, kind: 'amount',
    description: 'Chance to ride an incoming hit out on the wind. Never decays with time — each dodge spends 10%, and nothing else takes it off you.',
    // Not clamped to 1: wind dodge is allowed past 100%, and hiding the overflow would make
    // the whole point of stacking it invisible.
    read: (f) => Math.round(f.windDodge * 100),
    suffix: '%',
  },
  {
    id: 'crit', name: 'Critical Chance', emoji: '🎲', color: 0xffaa00, priority: 115, kind: 'amount',
    description: 'Chance for your attacks to land a critical hit.',
    read: (f) => Math.round(Math.min(1, f.critChance) * 100),
    suffix: '%',
  },
  {
    id: 'grown', name: 'Enlarged', emoji: '🎈', color: 0xffbb66, priority: 116, kind: 'amount',
    description: 'You are larger than normal — easier to hit, but so is everything you throw.',
    read: (f) => (f.sizeMult > 1.001 ? Math.round((f.sizeMult - 1) * 100) : 0),
    suffix: '%',
  },
  {
    id: 'shrunk', name: 'Shrunken', emoji: '🐁', color: 0xccbbaa, priority: 117, kind: 'amount',
    description: 'You are smaller than normal — a harder target to land hits on.',
    read: (f) => (f.sizeMult < 0.999 ? Math.round((1 - f.sizeMult) * 100) : 0),
    suffix: '%',
  },

  // ── Always-on mastery passives (lowest priority — they never expire) ─
  {
    id: 'levitating', name: 'Levitating', emoji: '🪶', color: 0xccddff, priority: 150, kind: 'flag',
    description: 'Immune to ground hazards that have sat in the same spot for 3s.',
    read: (f) => (f.levitating ? 1 : 0),
  },
  {
    id: 'unbreakable', name: 'Unbreakable', emoji: '🗿', color: 0x99aa88, priority: 151, kind: 'amount',
    description: 'No single hit can deal more than this much damage to you.',
    read: (f) => Math.round(f.hardDamageCap),
  },
  {
    id: 'natural-clot', name: 'Natural Clot', emoji: '🧷', color: 0xaa7788, priority: 152, kind: 'amount',
    description: 'This much damage is subtracted from every hit you take.',
    read: (f) => Math.round(f.flatDamageReduction),
  },
  {
    id: 'unstoppable', name: 'Unstoppable', emoji: '🚀', color: 0xff8800, priority: 153, kind: 'flag',
    description: 'Nothing can stun, freeze, root or slow you.',
    read: (f) => (f.unstoppable ? 1 : 0),
  },
  {
    id: 'plague-carrier', name: 'Carrier', emoji: '🦠', color: 0x88aa33, priority: 154, kind: 'flag',
    description: 'You survived a plague but never shook it off: 1 damage per second, 5% slower, 5% less damage, for the rest of the match.',
    read: (f) => (f.sicknessCarrier ? 1 : 0),
  },
];

/** Whether a raw reading counts as "currently on you". */
function isActive(desc: StatusDescriptor, raw: number, nowWall: number, nowGame: number): boolean {
  if (desc.kind === 'timer') return remainingMs(raw, nowWall, nowGame) > 0;
  return raw > 0;
}

/**
 * Read every descriptor against `f`, drop the inactive ones, append `extra` (kit-registered
 * element-specific effects) and sort by priority. The result is what the tray renders, in order.
 */
export function collectStatuses(
  f: Fighter,
  nowWall: number,
  nowGame: number,
  extra: ActiveStatus[] = [],
): ActiveStatus[] {
  const out: ActiveStatus[] = [];
  for (const desc of STATUS_DESCRIPTORS) {
    const raw = desc.read(f);
    if (!isActive(desc, raw, nowWall, nowGame)) continue;
    if (desc.kind === 'timer') {
      out.push({ desc, until: raw, remainingMs: remainingMs(raw, nowWall, nowGame), count: 0 });
    } else {
      const until = desc.readUntil?.(f) ?? 0;
      out.push({
        desc,
        until,
        remainingMs: until > 0 ? Math.max(0, remainingMs(until, nowWall, nowGame)) : 0,
        count: raw,
      });
    }
  }
  out.push(...extra);
  out.sort((a, b) => a.desc.priority - b.desc.priority);
  return out;
}

// ── Effect-duration stretching (Creation Gold Potion) ──────────────

/**
 * Record the fighter's current expiries so a later `stretchNewEffects` only stretches
 * statuses applied *after* this point. Call once when the stretch window opens.
 */
export function seedEffectSnapshot(f: Fighter, snapshot: Map<string, number>): void {
  snapshot.clear();
  for (const desc of STATUS_DESCRIPTORS) {
    if (desc.kind !== 'timer' || !desc.write) continue;
    snapshot.set(desc.id, desc.read(f));
  }
}

/**
 * Multiply the remaining duration of every status newly applied to `f` since the last call.
 *
 * Statuses are written all over the codebase as bare expiry timestamps, so there is no
 * central "effect applied" hook to intercept. This diffs each writable timer against the
 * previous frame's snapshot instead: an expiry that jumped forward is an application (or a
 * refresh), and whatever it has left is scaled from now.
 *
 * Stack-timer effects (frost, void frost) are not covered — they hold one expiry per stack
 * behind an array rather than a single writable field. Neither are element-specific effects
 * that live in a kit rather than on `Fighter`.
 *
 * `only` narrows which statuses are eligible. Everything is still snapshotted either way — an
 * ineligible status has to be recorded as seen, or it would look newly applied on every frame
 * forever. Paper's Journal passes `isDebuff` here: it shortens what an opponent puts on you, and
 * quietly cutting your own regen in half would be the opposite of a reward.
 *
 * Returns the descriptors that were stretched this call, for feedback/logging.
 */
export function stretchNewEffects(
  f: Fighter,
  nowWall: number,
  nowGame: number,
  mult: number,
  snapshot: Map<string, number>,
  only?: (desc: StatusDescriptor) => boolean,
): StatusDescriptor[] {
  const stretched: StatusDescriptor[] = [];
  for (const desc of STATUS_DESCRIPTORS) {
    if (desc.kind !== 'timer' || !desc.write) continue;
    const until = desc.read(f);
    if ((!only || only(desc)) && until > (snapshot.get(desc.id) ?? 0)) {
      const left = remainingMs(until, nowWall, nowGame);
      if (left > 0) {
        const extended = until + left * (mult - 1);
        desc.write(f, extended);
        snapshot.set(desc.id, extended);
        stretched.push(desc);
        continue;
      }
    }
    snapshot.set(desc.id, until);
  }
  return stretched;
}

/**
 * Multiply the remaining duration of every status *currently* on `f`, whenever it was applied.
 *
 * The one-shot cousin of {@link stretchNewEffects}: no snapshot, no diffing, because Quantum's
 * Effect Split is a single press that acts on whatever is riding on the body at that instant
 * rather than a standing rule about what lands next. Buffs and debuffs alike — splitting an
 * effect in two along its own length is not supposed to be able to tell the difference.
 *
 * Same coverage limits as `stretchNewEffects`: writable single-field timers only, so stack
 * timers (frost) and effects that live in a kit rather than on `Fighter` are untouched.
 *
 * Returns the longest remaining duration after the stretch, so the caller can size the matching
 * potency window, along with the descriptors it moved.
 */
export function stretchAllEffects(
  f: Fighter,
  nowWall: number,
  nowGame: number,
  mult: number,
): { stretched: StatusDescriptor[]; longestMs: number } {
  const stretched: StatusDescriptor[] = [];
  let longestMs = 0;
  for (const desc of STATUS_DESCRIPTORS) {
    if (desc.kind !== 'timer' || !desc.write) continue;
    const until = desc.read(f);
    const left = remainingMs(until, nowWall, nowGame);
    if (left <= 0) continue;
    const scaled = left * mult;
    desc.write(f, until + (scaled - left));
    stretched.push(desc);
    if (scaled > longestMs) longestMs = scaled;
  }
  return { stretched, longestMs };
}

/**
 * True for a status that is bad to have. The descriptor table's priority bands are the source of
 * truth for this — debuffs 0–99, buffs 100–149, always-on passives 150+ — so anything that wants
 * to treat the two differently should ask here rather than re-deciding per effect.
 */
export function isDebuff(desc: StatusDescriptor): boolean {
  return desc.priority < 100;
}
