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
    id: 'life-burn', name: 'Sprout Fire', emoji: '🔥', color: 0xff6a1a, priority: 4, kind: 'timer',
    description: 'Set alight by a Flaming Sprout. Burns for 2 damage every half second.',
    read: (f) => f.lifeBurnUntil,
    write: (f, t) => { f.lifeBurnUntil = t; },
  },
  {
    id: 'life-poison', name: 'Nightcap Poison', emoji: '🍄', color: 0x8844cc, priority: 4, kind: 'stack',
    description: 'Nightcap toxin. Every stack adds more damage per second, with no limit — it only clears once nobody tops it up for 4 seconds.',
    read: (f) => f.lifePoisonStacks,
    readUntil: (f) => f.lifePoisonUntil,
  },
  {
    id: 'life-chill', name: 'Frostbitten', emoji: '❄️', color: 0x9fe6ff, priority: 40, kind: 'timer',
    description: 'Rimed by Frost Lily ice. Moving 30% slower.',
    read: (f) => f.lifeSlowUntil,
    write: (f, t) => { f.lifeSlowUntil = t; },
  },
  {
    id: 'life-frail', name: 'Brittle', emoji: '🧊', color: 0xbfefff, priority: 41, kind: 'timer',
    description: 'Frozen brittle by a Frost Lily shard. Taking 20% more damage.',
    read: (f) => f.lifeFrailUntil,
    write: (f, t) => { f.lifeFrailUntil = t; },
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
  {
    id: 'stunned', name: 'Stunned', emoji: '💫', color: 0xffcc55, priority: 9, kind: 'timer',
    description: 'Stunned. Cannot move or use abilities until it wears off.',
    read: (f) => f.stunnedUntil,
    write: (f, t) => { f.stunnedUntil = t; },
  },
  {
    id: 'out-of-tune', name: 'Out of Tune', emoji: '🎵', color: 0xb8304a, priority: 17.5, kind: 'timer',
    description: 'Your timing is gone. Every ability has a 25% chance to misfire — the cooldown is spent and nothing happens. A Sound player can detonate it.',
    read: (f) => f.outOfTuneUntil,
    write: (f, t) => { f.outOfTuneUntil = t; },
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
    id: 'stalked', name: 'Stalked', emoji: '🫥', color: 0x6622aa, priority: 33.5, kind: 'timer',
    description: 'Something has its hands on your back. You turn slowly, and everything you cast goes the way you are facing, not where you aim.',
    read: (f) => f.stalkedUntil,
    write: (f, t) => { f.stalkedUntil = t; },
  },
  {
    id: 'despressed', name: 'Despress', emoji: '😞', color: 0x8877bb, priority: 33.6, kind: 'stack',
    description: 'Each stack: 10% slower, and 10 points of your damage resistance stripped away (it never makes you take more than normal).',
    read: (f) => f.activeDespressStacks(),
    readUntil: (f) => f.despressUntil,
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
    id: 'turned-around', name: 'Turned Around', emoji: '🌀', color: 0xff4dd2, priority: 36, kind: 'timer',
    description: 'A Bomb Dance blast spun you round — your whole view is turned the wrong way until it rights itself.',
    read: (f) => (f.viewTurnQuarter > 0 ? f.viewTurnedUntil : 0),
    write: (f, t) => { f.viewTurnedUntil = t; },
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
    id: 'fate-cursed', name: 'Cursed Talisman', emoji: '🧧', color: 0x7733cc, priority: 39.5, kind: 'flag',
    description: 'A cursed talisman orbits you. Every hit you take has a chance to crit for double — break the talisman to lift it.',
    read: (f) => (f.fateCurseCrit > 0 ? 1 : 0),
  },
  {
    id: 'vulnerable', name: 'Vulnerable', emoji: '🔻', color: 0xcc2288, priority: 41, kind: 'stack',
    description: 'Dark corrosion. Each stack raises the damage you take by 25%.',
    read: (f) => f.darkVulnStacks,
  },
  {
    id: 'myth-vuln', name: 'Exposed to Myth', emoji: '🎯', color: 0xffd166, priority: 41.5, kind: 'stack',
    description: 'Pistol rounds found you. Each stack is 5% more damage taken, up to four; the shotgun counts it double.',
    read: (f) => (Date.now() < f.mythVulnUntil ? f.mythVulnStacks : 0),
    readUntil: (f) => f.mythVulnUntil,
  },
  {
    id: 'jeered', name: 'Jeered', emoji: '👎', color: 0xff4a5e, priority: 41.6, kind: 'timer',
    description: 'The crowd turned on you. 10% more damage taken while the booing lasts.',
    read: (f) => f.mythJeeredUntil,
    write: (f, t) => { f.mythJeeredUntil = t; },
  },
  {
    id: 'toxin', name: 'Toxin', emoji: '🐍', color: 0x66dd22, priority: 41.9, kind: 'stack',
    description: 'Venom. It never fades. Every stack makes each new negative effect on you last 2% longer — at the cap of 100, three times as long.',
    read: (f) => Math.floor(f.toxinStacks),
  },
  {
    id: 'purged', name: 'Purged', emoji: '☠️', color: 0xe8f4ff, priority: 42, kind: 'timer',
    description: 'Purging poison — every positive effect is stripped off you and kept off, and speed boosts stay suppressed while this lasts.',
    read: (f) => f.purgedUntil,
    write: (f, t) => { f.purgedUntil = t; },
  },
  {
    id: 'venom-rot', name: 'Disintegrating', emoji: '🧪', color: 0xff5533, priority: 42.1, kind: 'timer',
    description: 'Disintegrating poison. 5 damage a second, and every tick makes you take 3% more damage (up to 15%) for 8 seconds.',
    read: (f) => f.venomRotUntil,
    write: (f, t) => { f.venomRotUntil = t; },
  },
  {
    id: 'venom-vuln', name: 'Disintegrated', emoji: '🩻', color: 0xff7744, priority: 42.2, kind: 'timer',
    description: 'Eaten through. Taking 3% more damage per tick of Disintegrating that landed, up to 15%. Every new tick restarts the clock.',
    read: (f) => (f.venomVulnStacks > 0 ? f.venomVulnUntil : 0),
    write: (f, t) => { f.venomVulnUntil = t; },
  },
  {
    id: 'venom-paralyzed', name: 'Paralyzed', emoji: '🦵', color: 0xffdd33, priority: 42.3, kind: 'timer',
    description: 'Paralyzing poison. Your dodge and every dash or leap in your abilities do nothing — the rest of the ability still happens. On the venom\'s acid you are slowed and the floor is slippery.',
    read: (f) => f.venomParalyzedUntil,
    write: (f, t) => { f.venomParalyzedUntil = t; },
  },
  {
    id: 'venom-melting', name: 'Melting', emoji: '🫠', color: 0xcc55ff, priority: 42.4, kind: 'timer',
    description: 'Melting poison. You take double damage while you stand on the venom\'s acid, and you drip puddles of it wherever you go.',
    read: (f) => f.venomMeltingUntil,
    write: (f, t) => { f.venomMeltingUntil = t; },
  },
  {
    id: 'venom-locked', name: 'Locked Down', emoji: '⛓️', color: 0xf2e89a, priority: 42.5, kind: 'timer',
    description: 'Paralyzing and Purging together. Every ability of yours that moves you cannot be used at all until one of the two poisons runs out.',
    read: (f) => f.venomLockUntil,
  },
  {
    id: 'heal-block', name: 'Heal Block', emoji: '💔', color: 0x992233, priority: 43, kind: 'timer',
    description: 'All healing on you is ignored until this expires.',
    read: (f) => f.healStopUntil,
    write: (f, t) => { f.healStopUntil = t; },
  },
  {
    id: 'rad-mutated', name: 'Mutated', emoji: '🧬', color: 0x9dff4a, priority: 43.5, kind: 'timer',
    description: 'Mutated by a uranium rod. Your hitbox is 25% bigger, so everything aimed at you is easier to land.',
    read: (f) => f.radMutatedUntil,
    write: (f, t) => { f.radMutatedUntil = t; },
  },
  {
    id: 'over-radiated', name: 'Over-Radiated', emoji: '☢️', color: 0xff3524, priority: 43.6, kind: 'timer',
    description: 'Caught in a nuke while already irradiated. You move at half speed and take 30% more damage.',
    read: (f) => f.overRadiatedUntil,
    write: (f, t) => { f.overRadiatedUntil = t; },
  },
  {
    id: 'sound-dance', name: 'Dancing', emoji: '💃', color: 0xff3b4a, priority: 17.6, kind: 'timer',
    description: 'Caught by an Infectious Crescendo. You can still move, but you cannot attack until the dance is over.',
    read: (f) => f.soundDanceUntil,
    write: (f, t) => { f.soundDanceUntil = t; },
  },
  {
    id: 'sound-dissonant', name: 'Dissonance', emoji: '🎹', color: 0x8f8a1c, priority: 17.7, kind: 'timer',
    description: 'Out of tune twice over — a Fermata and a Forte Piano both. You move 40% slower and bleed health until a Sound player detonates it, and then both stacks go off at once.',
    read: (f) => f.soundDissonantUntil,
    write: (f, t) => { f.soundDissonantUntil = t; },
  },
  {
    id: 'devotion-slow', name: 'Holy Fire', emoji: '🔥', color: 0xffd54a, priority: 43.7, kind: 'timer',
    description: 'Burned by a pillar of yellow fire from the sky. You move 40% slower.',
    read: (f) => f.devotionSlowUntil,
    write: (f, t) => { f.devotionSlowUntil = t; },
  },
  {
    id: 'premove-slow', name: 'Pre-moved', emoji: '♟️', color: 0xb98cff, priority: 43.8, kind: 'timer',
    description: 'A psychic saw that step coming and punished it. You move 30% slower.',
    read: (f) => f.premoveSlowUntil,
    write: (f, t) => { f.premoveSlowUntil = t; },
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
    id: 'gold-heart', name: 'Heart of Gold', emoji: '💛', color: 0xf0c33c, priority: 46.2, kind: 'timer',
    description: 'Your heart has turned to gold and cannot take the exercise. Every step you take fills it with stress; a full heart is a heart attack — 28 damage and a 1.4 second stun. Standing still lets it settle a little. Every 20 damage you take while it lasts pays the alchemist a gold coin.',
    read: (f) => f.goldHeartUntil,
    write: (f, t) => { f.goldHeartUntil = t; },
  },
  {
    id: 'midas', name: 'Midas Curse', emoji: '👑', color: 0xffd34d, priority: 46.4, kind: 'timer',
    description: 'You are turning to gold, and so is the floor you walk on — it stays gold, and the alchemist runs faster and earns on it. Every shot you fire drops as a gold coin, and anything you summon or build turns into a golden statue the moment it appears.',
    read: (f) => f.midasUntil,
    write: (f, t) => { f.midasUntil = t; },
  },
  {
    id: 'gold-hex', name: 'Gold Hex', emoji: '⏳', color: 0xd8a531, priority: 46.3, kind: 'timer',
    description: 'The alchemist\'s golden heart hexed you. Every ability you have charges at half speed until this runs out — 5 seconds after the heart itself.',
    read: (f) => f.goldHexUntil,
    write: (f, t) => { f.goldHexUntil = t; },
  },
  {
    id: 'gold-statue', name: 'Solid Gold', emoji: '🗿', color: 0xffe066, priority: 46.5, kind: 'timer',
    description: 'The Midas Curse finished its work: you are a solid gold statue. You cannot move or cast until the gold melts. Everything the alchemist hits you with in the meantime does double damage.',
    read: (f) => f.goldStatueUntil,
    write: (f, t) => { f.goldStatueUntil = t; },
  },
  {
    id: 'devotion-faith', name: 'Faith', emoji: '🙏', color: 0xf5e08a, priority: 46.7, kind: 'amount',
    description: 'The priest\'s faith is in you, and nothing takes it out. At 200 you are converted on the spot — no shield or armour saves you. At 25% it fills on its own, 2 a second; at 50% your blows land 20% softer on the priest; at 75% you are drawn toward their holy water and every attack fills it 25% faster.',
    read: (f) => Math.round(f.devotionFaith),
  },
  {
    id: 'dream-drowsy', name: 'Drowsy', emoji: '🥱', color: 0x8b9dff, priority: 46.9, kind: 'amount',
    description: 'The dreamer is putting you to sleep. At 100 you fall asleep where you stand. It wears off slowly — 3 a second, once nothing has added to it for 4 seconds.',
    read: (f) => (f.dreamAsleep ? 0 : Math.round(f.dreamDrowsy)),
    suffix: '%',
  },
  {
    id: 'dream-asleep', name: 'Asleep', emoji: '😴', color: 0x5b3fd4, priority: 46.91, kind: 'amount',
    description: 'Fast asleep: you cannot move or cast. Sleep burns 5 drowsiness a second and you wake when it runs out — or the moment anything damages you. While the dreamer is inside your dream you are awake in there, and nothing that happens in it wakes you out here.',
    read: (f) => (f.dreamAsleep ? Math.max(1, Math.round(f.dreamDrowsy)) : 0),
    suffix: '%',
  },
  {
    id: 'dream-nightmare', name: 'Nightmare', emoji: '👁️', color: 0xff3b6b, priority: 46.92, kind: 'timer',
    description: 'A nightmare has you. You cannot see past arm\'s reach, you are panicking, it is eating 20 health a second, and you take 25% more damage from everything else until it lets go.',
    read: (f) => f.dreamNightmareUntil,
    write: (f, t) => { f.dreamNightmareUntil = t; },
  },
  {
    id: 'dream-clawed', name: 'Clawed', emoji: '🩸', color: 0xd2266b, priority: 46.93, kind: 'timer',
    description: 'Raked by something in a dream. You move 45% slower until it wears off.',
    read: (f) => f.dreamClawedUntil,
    write: (f, t) => { f.dreamClawedUntil = t; },
  },
  {
    id: 'dream-paralysis', name: 'Sleep Paralysis', emoji: '🫥', color: 0x8a1f4a, priority: 46.94, kind: 'timer',
    description: 'A nightmare left you unable to stir: your drowsiness cannot go down at all — not by wearing off, not by sleeping it off — and you move 20% slower until it lets go.',
    read: (f) => f.dreamParalysisUntil,
    write: (f, t) => { f.dreamParalysisUntil = t; },
  },
  {
    id: 'wood-slow', name: 'Gummed Up', emoji: '🍯', color: 0xd98a1c, priority: 46.75, kind: 'timer',
    description: 'You cut into an ent\'s Sap HP and it stuck to you. You move 30% slower until it wears off.',
    read: (f) => f.woodSlowUntil,
    write: (f, t) => { f.woodSlowUntil = t; },
  },
  {
    id: 'wood-tainted', name: 'Tainted', emoji: '🍂', color: 0xa86a12, priority: 46.8, kind: 'flag',
    description: 'Cut by an ent\'s Final Harvest and not killed by it. For the rest of the match, every 25 damage that ent deals you gives it 5 Sap HP.',
    read: (f) => f.woodTainted,
  },
  {
    id: 'pain-lock', name: 'PainLock', emoji: '🔴', color: 0xe0232f, priority: 46.82, kind: 'timer',
    description: 'A Pressure Point found a nerve. Every ability you use stuns you briefly and costs you health until it wears off.',
    read: (f) => f.painLockUntil,
    write: (f, t) => { f.painLockUntil = t; },
  },
  {
    id: 'pressure-slow', name: 'Pressurized', emoji: '♨️', color: 0xd9d4cc, priority: 46.84, kind: 'timer',
    description: 'Battered by a Pressure punch or caught in its steam. You move slower until it wears off.',
    read: (f) => f.pressureSlowUntil,
    write: (f, t) => { f.pressureSlowUntil = t; },
  },
  {
    id: 'astra-slow', name: 'Smitten', emoji: '🌩️', color: 0xb05cff, priority: 46.85, kind: 'timer',
    description: 'Struck by a Celestial Smite. You move at a third of your speed until it wears off.',
    read: (f) => f.astraSlowUntil,
    write: (f, t) => { f.astraSlowUntil = t; },
  },
  {
    id: 'memory-sealed', name: 'Reborn', emoji: '⚪', color: 0xf4f2ff, priority: 46.855, kind: 'timer',
    description: 'Struck by Rebirth. Your passive does nothing until this wears off.',
    read: (f) => f.passivesSealedUntil,
    write: (f, t) => { f.passivesSealedUntil = t; },
  },
  {
    id: 'memory-shards', name: 'Forgotten', emoji: '🗿', color: 0x5d527a, priority: 46.856, kind: 'stack',
    description: 'Obsidian shards latched into you. 1: the Memory and its health bar are lost in static. 2: so is your own health. 3: so are your cooldowns.',
    read: (f) => f.memoryShardCount(),
  },
  {
    id: 'guilt', name: 'Guilt', emoji: '⚖️', color: 0x8b1e3f, priority: 46.857, kind: 'stack',
    description: 'Every hit you take while fighting a Memory leaves a stack. Each stack: +1% damage taken, for the rest of the match.',
    read: (f) => f.guiltStacks,
  },
  {
    id: 'string-hexed', name: 'Hexed', emoji: '🟣', color: 0x9b3dff, priority: 46.8575, kind: 'timer',
    description: 'Brushing a Hexing Strand. You move at 60% speed while you touch it and a moment after.',
    read: (f) => f.stringHexUntil,
    write: (f, t) => { f.stringHexUntil = t; },
  },
  {
    id: 'string-snared', name: 'Snared', emoji: '🕸️', color: 0xd4a6ff, priority: 46.858, kind: 'timer',
    description: 'Caught in a Hexing Strand as it snapped. You move at 30% speed until it wears off.',
    read: (f) => f.stringSnareUntil,
    write: (f, t) => { f.stringSnareUntil = t; },
  },
  {
    id: 'string-infested', name: 'Infested', emoji: '🕷️', color: 0x8c7f6a, priority: 46.8582, kind: 'timer',
    description: 'Spinal Snap\'s web broke over you. You move at 70% speed, and every couple of seconds a spider crawls out of you to bite.',
    read: (f) => f.stringInfestedUntil,
    write: (f, t) => { f.stringInfestedUntil = t; },
  },
  {
    id: 'string-puppet', name: 'Puppet', emoji: '🎎', color: 0xf0d6ac, priority: 46.8585, kind: 'timer',
    description: 'On a Marionette\'s control bar. While the spider holds the arrow keys, you walk where it steers.',
    read: (f) => f.stringPuppetUntil,
  },
  {
    id: 'string-entombed', name: 'Entombed', emoji: '🪢', color: 0xf2ece0, priority: 46.859, kind: 'timer',
    description: 'Wrapped in a Linen Tomb. You cannot move or hurt the spider until your attacks cut through the silk, and trying to move tears at you.',
    read: (f) => f.stringTombedUntil,
  },
  {
    id: 'ink-slip', name: 'Slippery', emoji: '🍌', color: 0xf2f2f2, priority: 46.86, kind: 'timer',
    description: 'Slipped on a banana peel. Your feet keep sliding: you turn and stop slowly until it wears off.',
    read: (f) => f.inkSlipUntil,
    write: (f, t) => { f.inkSlipUntil = t; },
  },
  {
    id: 'ink-flat', name: 'Flattened', emoji: '🥞', color: 0x9a9a9a, priority: 8.6, kind: 'timer',
    description: 'Squashed flat by an anvil. You move at half speed and your ability keys are shuffled.',
    read: (f) => f.inkFlatUntil,
    write: (f, t) => { f.inkFlatUntil = t; },
  },
  {
    id: 'grounded', name: 'Grounded', emoji: '🔩', color: 0x8a7f74, priority: 8.5, kind: 'timer',
    description: 'Slammed into the floor. You cannot move, but you can still attack. Any hit knocks you loose.',
    read: (f) => f.pressureGroundedUntil,
    write: (f, t) => { f.pressureGroundedUntil = t; },
  },
  {
    id: 'fragile', name: 'Fragile', emoji: '📛', color: 0xdd3355, priority: 46, kind: 'amount',
    description: 'Taking extra damage from every source.',
    read: (f) => {
      const mult = f.incomingDamageMultiplier * f.gauntletDamageTakenMult * f.cardDamageTakenMult
        * f.empoweredIncomingMult * f.fortuneIncomingMult * f.mutationIncomingMult;
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
    id: 'in-menu', name: 'In Menu', emoji: '📋', color: 0xddcc88, priority: 99, kind: 'flag',
    description: 'Browsing an in-match menu — incoming damage is cut to 5% while it is open.',
    read: (f) => (f.inMenuUi ? 1 : 0),
  },
  {
    id: 'venom-self-toxin', name: 'Self-Toxin', emoji: '💉', color: 0x99ee44, priority: 100.5, kind: 'stack',
    description: 'Your own venom. Every stack makes each new positive effect on you last 2% longer — at the cap of 100, three times as long.',
    read: (f) => Math.floor(f.venomSelfToxin),
  },
  {
    id: 'venom-boon-rot', name: 'Corroded Hide', emoji: '🧪', color: 0xff5533, priority: 100.6, kind: 'timer',
    description: 'Disintegrating, turned on yourself. 30% less damage taken while you stand on your own acid.',
    read: (f) => f.venomBoonUntil[0],
    write: (f, t) => { f.venomBoonUntil[0] = t; },
  },
  {
    id: 'venom-boon-para', name: 'Quickened', emoji: '⚡', color: 0xffdd33, priority: 100.7, kind: 'timer',
    description: 'Paralyzing, turned on yourself. 30% faster while you stand on your own acid.',
    read: (f) => f.venomBoonUntil[1],
    write: (f, t) => { f.venomBoonUntil[1] = t; },
  },
  {
    id: 'venom-boon-purge', name: 'Purified', emoji: '☠️', color: 0xe8f4ff, priority: 100.8, kind: 'timer',
    description: 'Purging, turned on yourself. 25% more damage dealt while you stand on your own acid.',
    read: (f) => f.venomBoonUntil[2],
    write: (f, t) => { f.venomBoonUntil[2] = t; },
  },
  {
    id: 'venom-boon-melt', name: 'Rendered', emoji: '🫠', color: 0xcc55ff, priority: 100.9, kind: 'timer',
    description: 'Melting, turned on yourself. Heals 4 a second while you stand on your own acid.',
    read: (f) => f.venomBoonUntil[3],
    write: (f, t) => { f.venomBoonUntil[3] = t; },
  },
  {
    id: 'shield-charge', name: 'Shield', emoji: '🛡️', color: 0x66aaff, priority: 101, kind: 'stack',
    description: 'Each charge fully blocks one incoming hit, no matter how big.',
    read: (f) => f.shieldCharges,
  },
  {
    id: 'fate-sure-dodge', name: 'Lucky Dodge', emoji: '🎲', color: 0xffcc44, priority: 101.5, kind: 'stack',
    description: 'Each die that hit with the Dice of Doom barrage guarantees one incoming hit misses you.',
    read: (f) => f.fateSureDodges,
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
    id: 'sap-hp', name: 'Sap HP', emoji: '🪵', color: 0xd98a1c, priority: 104.5, kind: 'amount',
    description: 'Amber bonus health. Spent before your real health — and whoever chews through it is gummed up and slowed.',
    read: (f) => Math.round(f.sapHp),
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

/**
 * Whether anything harmful is on the fighter right now — any debuff-band descriptor the tray would
 * show. Allocation-free, so a passive can ask it every few frames.
 */
export function hasDebuff(f: Fighter, nowWall: number, nowGame: number): boolean {
  for (const desc of STATUS_DESCRIPTORS) {
    if (!isDebuff(desc)) continue;
    if (isActive(desc, desc.read(f), nowWall, nowGame)) return true;
  }
  return false;
}

/**
 * Strip every discrete debuff off a fighter, and report how many came off.
 *
 * Driven off the descriptor table rather than off a hand-written field list, so an effect added
 * to the tray is cleansable the same day: every `timer` debuff with a `write` is expired, and the
 * stack/flag debuffs that have no writer are zeroed by hand below.
 *
 * Deliberately does **not** touch the shared multiplier fields the `amount` debuffs read
 * (`incomingDamageMultiplier`, `outgoingDamageMult`, `walkSpeedMult`, `cooldownMult`,
 * `attackIntervalMult`). Those are co-owned: several of them are min-clamped and rewritten from
 * scratch every frame by whichever kit owns the slow, and several carry buffs and kit bookkeeping
 * on the same number — so clearing them here would either do nothing at all or quietly delete
 * somebody else's effect. A slow whose source is still on the field genuinely survives a cleanse.
 */
export function clearDebuffs(f: Fighter): number {
  let n = 0;
  for (const desc of STATUS_DESCRIPTORS) {
    if (!isDebuff(desc) || desc.kind !== 'timer' || !desc.write) continue;
    if (desc.read(f) <= 0) continue;
    desc.write(f, 0);
    n++;
  }
  // The flags and counters behind the debuffs that are not timers.
  if (f.bleeding) { f.bleeding = false; n++; }
  if (f.magicChainBound) { f.magicChainBound = false; f.magicChainBoundEnd = 0; n++; }
  if (f.vulnerableNextHit) { f.vulnerableNextHit = false; n++; }
  if (f.aimOffsetBonusDeg > 0) { f.aimOffsetBonusDeg = 0; n++; }
  if (f.frostStacks > 0) { f.frostStacks = 0; f.frostStackTimers.length = 0; n++; }
  if (f.voidFrostStacks > 0) { f.voidFrostStacks = 0; f.voidFrostStackTimers.length = 0; n++; }
  if (f.permafrostStacks > 0) { f.permafrostStacks = 0; n++; }
  if (f.permavoidStacks > 0) { f.permavoidStacks = 0; n++; }
  if (f.darkVulnStacks > 0) { f.darkVulnStacks = 0; n++; }
  if (f.hopelessness > 0) { f.hopelessness = 0; n++; }
  return n;
}

/**
 * Venom's Purging poison: strip every buff a fighter is carrying, and report how many came off.
 *
 * The mirror of {@link clearDebuffs}: every `timer` buff with a writer is expired, and the
 * protective pools — shield charges, shield HP, clotted, weak and sap HP, evasion — are emptied.
 * The co-owned multiplier fields (`walkSpeedMult`, `outgoingDamageMult`, `cooldownMult`, crit) are
 * left alone (as is regeneration, which items grant as a standing stat) for the reason `clearDebuffs` leaves them: kits rewrite them every frame, so the
 * Purged timer suppresses speed boosts for its duration instead.
 */
export function stripBuffs(f: Fighter): number {
  let n = 0;
  for (const desc of STATUS_DESCRIPTORS) {
    if (isDebuff(desc) || desc.priority >= 150 || desc.kind !== 'timer' || !desc.write) continue;
    if (desc.read(f) <= 0) continue;
    desc.write(f, 0);
    n++;
  }
  if (f.shieldCharges > 0) { f.shieldCharges = 0; n++; }
  if (f.shieldHp > 0) { f.shieldHp = 0; n++; }
  if (f.clottedHp > 0) { f.clottedHp = 0; n++; }
  if (f.weakHp > 0) { f.weakHp = 0; n++; }
  if (f.sapHp > 0) { f.sapHp = 0; n++; }
  if (f.dodgeChance > 0) { f.dodgeChance = 0; n++; }
  if (f.windDodge > 0) { f.windDodge = 0; n++; }
  return n;
}

/**
 * How much there is to wash off a fighter, measured over exactly what {@link clearDebuffs} would
 * remove: how many debuffs, how many seconds the timed ones had left (each capped at
 * `secCapEach`), and how many stacks the stacking ones carried. Devotion's Purge Sins pays faith
 * off this, so it has to be read *before* the cleanse.
 */
export function measureDebuffs(
  f: Fighter, nowWall: number, nowGame: number, secCapEach = 10,
): { count: number; seconds: number; stacks: number } {
  let count = 0;
  let seconds = 0;
  let stacks = 0;
  for (const desc of STATUS_DESCRIPTORS) {
    if (!isDebuff(desc) || desc.kind !== 'timer' || !desc.write) continue;
    const left = remainingMs(desc.read(f), nowWall, nowGame);
    if (left <= 0) continue;
    count++;
    seconds += Math.min(secCapEach, left / 1000);
  }
  const stacked = [f.frostStacks, f.voidFrostStacks, f.permafrostStacks, f.permavoidStacks, f.darkVulnStacks];
  for (const n of stacked) if (n > 0) { count++; stacks += n; }
  if (f.bleeding) count++;
  if (f.magicChainBound) count++;
  if (f.vulnerableNextHit) count++;
  if (f.aimOffsetBonusDeg > 0) count++;
  if (f.hopelessness > 0) count++;
  return { count, seconds, stacks };
}

