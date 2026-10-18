import { saveKey } from './Cheats';
import * as PlayerData from './PlayerData';
import {
  ElementDef, ELEMENTS, COMBINED_ELEMENTS, ABSTRACT_ELEMENTS, ABSTRACT_COMBINED_ELEMENTS,
  DIVINE_ELEMENTS, UNSTABLE_ELEMENTS, VAULT_ELEMENTS, allSelectableElements,
} from './ElementRoster';
import { DIFFICULTY_PRESETS, DifficultyConfig } from '../entities/NpcOpponent';
import type { NpcLoadout } from './NpcLoadout';

/**
 * Ranked mode — the ladder, the save, and the series that rides through the arena.
 *
 * ## The ladder
 *
 * Six tiers. Bronze through Diamond each have three divisions, III → II → I, and
 * Excelsius is a single open-ended summit. The ladder is stored as one integer
 * `step` (0 = Bronze III … 14 = Diamond I, 15 = Excelsius) plus the RP banked in
 * that step, so promotion and demotion are just `step ± 1`.
 *
 * Every division of a tier costs the same RP; the cost grows tier by tier, and the
 * RP a series win pays shrinks a little as the losses grow — so the climb gets
 * genuinely steeper, not just longer.
 *
 * ## The series
 *
 * A ranked match is best two of three, fought with the same pair of elements.
 * `RankedSeries` is carried in scene data from the select screen through every
 * ArenaScene launch and back out to `RankedIntermissionScene`, which keeps score.
 * It is also mirrored into the save the moment the first game starts: quitting a
 * series halfway (the pause menu, a reload) is settled as a forfeit loss the next
 * time the title or ranked screen opens, so dodging a loss is not a strategy.
 */

// ── Tiers ─────────────────────────────────────────────────────────────

export type RankTierId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'excelsius';

export interface RankTierDef {
  id: RankTierId;
  name: string;
  /** Signature colour — labels, bars, accents. */
  color: number;
  /** RP to clear one division. Excelsius has no ceiling. */
  rpPerDivision: number;
  /** RP for a series win (before streak and sweep bonuses). */
  winRp: number;
  /** RP lost for a series loss. */
  lossRp: number;
  /** Shards for a series win. */
  shards: number;
  /** Short flavour line for the ladder. */
  motto: string;
}

export const RANK_TIERS: RankTierDef[] = [
  { id: 'bronze',    name: 'Bronze',    color: 0xd98a4a, rpPerDivision: 100, winRp: 40, lossRp: 16, shards: 15,  motto: 'Every legend starts dented.' },
  { id: 'silver',    name: 'Silver',    color: 0xc6d0e0, rpPerDivision: 130, winRp: 38, lossRp: 19, shards: 25,  motto: 'Wings, finally.' },
  { id: 'gold',      name: 'Gold',      color: 0xffc44d, rpPerDivision: 170, winRp: 36, lossRp: 22, shards: 40,  motto: 'Crowned, not yet feared.' },
  { id: 'platinum',  name: 'Platinum',  color: 0x6ff0dc, rpPerDivision: 220, winRp: 34, lossRp: 25, shards: 55,  motto: 'The bots start reading you.' },
  { id: 'diamond',   name: 'Diamond',   color: 0x7cc4ff, rpPerDivision: 300, winRp: 32, lossRp: 28, shards: 75,  motto: 'Flawless or forgotten.' },
  { id: 'excelsius', name: 'Excelsius', color: 0xe08aff, rpPerDivision: Infinity, winRp: 30, lossRp: 30, shards: 100, motto: 'Above the elements.' },
];

/** Bronze III … Diamond I is 15 steps; Excelsius is the 16th. */
export const EXCELSIUS_STEP = 15;
export const MAX_STEP = EXCELSIUS_STEP;

/** Streak bonus: +3 RP per consecutive series win past the first, capped. */
const STREAK_RP_PER = 3;
const STREAK_RP_CAP = 12;
/** A 2–0 sweep pays a little extra. */
const SWEEP_RP = 6;
/** A 1–2 loss stings a little less. */
const CLOSE_LOSS_REFUND = 4;
/** A lost series still pays something for each game taken. */
const SHARDS_PER_GAME_WON_IN_LOSS = 6;
/** How many elements each side bans. */
export const RANKED_BAN_COUNT = 5;

export function tierIndexOf(step: number): number {
  return Math.min(5, Math.floor(clampStep(step) / 3));
}

export function tierOf(step: number): RankTierDef {
  return RANK_TIERS[tierIndexOf(step)];
}

/** 3, 2 or 1 for a divisioned tier; 0 for Excelsius. */
export function divisionOf(step: number): number {
  const s = clampStep(step);
  return s >= EXCELSIUS_STEP ? 0 : 3 - (s % 3);
}

export function divisionNumeral(division: number): string {
  return division === 3 ? 'III' : division === 2 ? 'II' : division === 1 ? 'I' : '';
}

/** "Gold II", or plain "Excelsius". */
export function rankName(step: number): string {
  const t = tierOf(step);
  const d = divisionOf(step);
  return d ? `${t.name} ${divisionNumeral(d)}` : t.name;
}

/** RP needed to clear this step. Infinity at the summit. */
export function rpToClear(step: number): number {
  return tierOf(step).rpPerDivision;
}

function clampStep(step: number): number {
  return Math.max(0, Math.min(MAX_STEP, Math.floor(step)));
}

// ── Save ──────────────────────────────────────────────────────────────

const STORAGE_BASE = 'elemental_ranked_v1';
const storageKey = () => saveKey(STORAGE_BASE);

/** One ranked series in flight: the picks, the bans, and the score so far. */
export interface RankedSeries {
  playerElement: string;
  enemyElement: string;
  playerBans: string[];
  botBans: string[];
  /** Games the player has won / lost in this series. */
  wins: number;
  losses: number;
  /** The rung the series was started on — the bot's difficulty is fixed to it. */
  step: number;
  /** Rolled once so all three games fight the same perk. */
  npcPerk: string | null;
  /** Rolled once so all three games fight the same upgrades. */
  npcLoadout?: NpcLoadout;
}

export interface RankedHistoryEntry {
  won: boolean;
  score: string;
  delta: number;
  step: number;
  player: string;
  enemy: string;
}

interface RankedSave {
  step: number;
  rp: number;
  seriesWins: number;
  seriesLosses: number;
  gamesWon: number;
  gamesLost: number;
  /** Consecutive series wins (0 after a loss). */
  streak: number;
  bestStreak: number;
  peakStep: number;
  /** Highest RP held while in Excelsius — the open-ended flex number. */
  peakExcelsiusRp: number;
  /** Set on promotion: the next loss cannot drop you a division. */
  shield: boolean;
  active: RankedSeries | null;
  history: RankedHistoryEntry[];
}

function fresh(): RankedSave {
  return {
    step: 0, rp: 0, seriesWins: 0, seriesLosses: 0, gamesWon: 0, gamesLost: 0,
    streak: 0, bestStreak: 0, peakStep: 0, peakExcelsiusRp: 0, shield: false,
    active: null, history: [],
  };
}

function load(): RankedSave {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as Partial<RankedSave>;
    const out = { ...fresh(), ...parsed };
    out.step = clampStep(out.step);
    out.rp = Math.max(0, Math.floor(out.rp || 0));
    if (!Array.isArray(out.history)) out.history = [];
    return out;
  } catch {
    return fresh();
  }
}

function save(data: RankedSave): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(data));
  } catch {
    // storage unavailable — silently ignore
  }
}

export interface RankedProfile {
  step: number;
  rp: number;
  rpToClear: number;
  tier: RankTierDef;
  tierIndex: number;
  division: number;
  name: string;
  seriesWins: number;
  seriesLosses: number;
  gamesWon: number;
  gamesLost: number;
  streak: number;
  bestStreak: number;
  peakStep: number;
  peakName: string;
  peakExcelsiusRp: number;
  shield: boolean;
  history: RankedHistoryEntry[];
}

export function getProfile(): RankedProfile {
  const d = load();
  return {
    step: d.step, rp: d.rp, rpToClear: rpToClear(d.step),
    tier: tierOf(d.step), tierIndex: tierIndexOf(d.step), division: divisionOf(d.step),
    name: rankName(d.step),
    seriesWins: d.seriesWins, seriesLosses: d.seriesLosses,
    gamesWon: d.gamesWon, gamesLost: d.gamesLost,
    streak: d.streak, bestStreak: d.bestStreak,
    peakStep: d.peakStep, peakName: rankName(d.peakStep), peakExcelsiusRp: d.peakExcelsiusRp,
    shield: d.shield, history: [...d.history],
  };
}

/** Has this save ever played a ranked series? */
export function hasPlayed(): boolean {
  const d = load();
  return d.seriesWins + d.seriesLosses > 0;
}

// ── Series lifecycle ─────────────────────────────────────────────────

/** Mirror a series into the save — called as each game launches. */
export function setActiveSeries(series: RankedSeries): void {
  const d = load();
  d.active = { ...series, playerBans: [...series.playerBans], botBans: [...series.botBans] };
  save(d);
}

export function getActiveSeries(): RankedSeries | null {
  return load().active;
}

export interface RankedOutcome {
  won: boolean;
  forfeit: boolean;
  beforeStep: number;
  beforeRp: number;
  afterStep: number;
  afterRp: number;
  /** Signed RP change, net of carry-over (what the player "feels"). */
  delta: number;
  promoted: boolean;
  demoted: boolean;
  /** The promotion shield absorbed a demotion. */
  shielded: boolean;
  /** Promotion crossed into a new tier (badge change). */
  newTier: boolean;
  newPeak: boolean;
  shards: number;
  streak: number;
  bonusLines: string[];
}

/**
 * Settle a finished series. Applies RP, promotion/demotion, the shield, streaks,
 * peak and shards, clears the active series, and returns what happened so the
 * results screen can animate it.
 */
export function applySeriesResult(series: RankedSeries, forfeit = false): RankedOutcome {
  const d = load();
  const won = !forfeit && series.wins >= 2;
  const beforeStep = d.step;
  const beforeRp = d.rp;
  const tier = tierOf(d.step);
  const bonusLines: string[] = [];
  let promoted = false;
  let demoted = false;
  let shielded = false;
  let newTier = false;
  let delta = 0;
  let shards = 0;

  if (won) {
    d.streak += 1;
    d.bestStreak = Math.max(d.bestStreak, d.streak);
    let gain = tier.winRp;
    const streakBonus = Math.min(STREAK_RP_CAP, Math.max(0, d.streak - 1) * STREAK_RP_PER);
    if (streakBonus > 0) { gain += streakBonus; bonusLines.push(`WIN STREAK ×${d.streak}  +${streakBonus}`); }
    if (series.losses === 0) { gain += SWEEP_RP; bonusLines.push(`CLEAN SWEEP  +${SWEEP_RP}`); }
    delta = gain;
    d.rp += gain;
    // Promotion can chain if a big gain clears more than one division (it shouldn't, but
    // a carry-over loop is cheaper than an argument about it).
    while (d.step < EXCELSIUS_STEP && d.rp >= rpToClear(d.step)) {
      const prevTier = tierIndexOf(d.step);
      d.rp -= rpToClear(d.step);
      d.step += 1;
      promoted = true;
      if (tierIndexOf(d.step) !== prevTier) newTier = true;
    }
    if (promoted) d.shield = true;
    shards = tier.shards;
    d.seriesWins += 1;
  } else {
    d.streak = 0;
    let loss = tier.lossRp;
    if (!forfeit && series.wins === 1) { loss -= CLOSE_LOSS_REFUND; bonusLines.push(`CLOSE SERIES  −${CLOSE_LOSS_REFUND} LOSS`); }
    if (forfeit) bonusLines.push('SERIES ABANDONED — FORFEIT');
    delta = -loss;
    const next = d.rp - loss;
    if (next >= 0) {
      d.rp = next;
    } else if (d.step === 0) {
      d.rp = 0;
    } else if (d.shield) {
      d.rp = 0;
      shielded = true;
      bonusLines.push('PROMOTION SHIELD HELD');
    } else {
      d.step -= 1;
      d.rp = Math.max(0, rpToClear(d.step) + next);
      demoted = true;
    }
    // The shield lasts exactly one loss, whether or not it was needed.
    d.shield = false;
    shards = (forfeit ? 0 : series.wins) * SHARDS_PER_GAME_WON_IN_LOSS;
    d.seriesLosses += 1;
  }

  // A forfeit counts the game that was walked out of as lost.
  d.gamesWon += series.wins;
  d.gamesLost += series.losses + (forfeit ? 1 : 0);

  let newPeak = false;
  if (d.step > d.peakStep) { d.peakStep = d.step; newPeak = true; }
  if (d.step === EXCELSIUS_STEP && d.rp > d.peakExcelsiusRp) {
    d.peakExcelsiusRp = d.rp;
    if (!promoted) newPeak = true;
  }

  d.history.unshift({
    won, score: forfeit ? 'FF' : `${series.wins}–${series.losses}`, delta, step: d.step,
    player: series.playerElement, enemy: series.enemyElement,
  });
  d.history = d.history.slice(0, 12);
  d.active = null;
  save(d);

  if (shards > 0) PlayerData.addShards(shards);

  return {
    won, forfeit, beforeStep, beforeRp, afterStep: d.step, afterRp: d.rp, delta,
    promoted, demoted, shielded, newTier, newPeak, shards, streak: d.streak, bonusLines,
  };
}

/**
 * A series left in the save means the player walked out of it. Settle it as a
 * forfeit. Returns the outcome when one was settled, otherwise null. Called from
 * screens that are never visited mid-series (title, ranked lobby).
 */
export function resolveAbandonedSeries(): RankedOutcome | null {
  const active = getActiveSeries();
  if (!active) return null;
  return applySeriesResult(active, true);
}

// ── Element pools ─────────────────────────────────────────────────────

/**
 * Everything a ranked bot may field: every element with an obtainment and a bot behind it.
 * Quantum is out (it is two kits bonded by the player in the Entanglement Lab, not a thing a
 * bot can own) and so are the test elements (no obtainment, still being tuned).
 */
export function rankedBotRoster(): ElementDef[] {
  return [
    ...ELEMENTS, ...COMBINED_ELEMENTS, ...ABSTRACT_ELEMENTS, ...ABSTRACT_COMBINED_ELEMENTS,
    ...DIVINE_ELEMENTS, ...UNSTABLE_ELEMENTS, ...VAULT_ELEMENTS,
  ];
}

/** What the player may pick from in ranked (before bans). */
export function rankedPlayerRoster(): ElementDef[] {
  return allSelectableElements();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * The bot's bans: random picks from the player's own pool. A small roster gets fewer bans
 * so at least one element always survives.
 */
export function rollBotBans(): string[] {
  const pool = rankedPlayerRoster().map((e) => e.id);
  const count = Math.max(0, Math.min(RANKED_BAN_COUNT, pool.length - 1));
  return shuffle(pool).slice(0, count);
}

/** The bot's element: random from its roster, minus whatever the player banned. */
export function rollBotElement(playerBans: string[]): string {
  const pool = rankedBotRoster().filter((e) => !playerBans.includes(e.id));
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick?.id ?? 'fire';
}

// ── Difficulty ────────────────────────────────────────────────────────

/**
 * The bot a rung fights with. Bronze III is Easy; the ladder climbs smoothly through the
 * presets (every numeric field interpolated) to just short of Nightmare at Diamond I.
 * Excelsius is Nightmare and then some: tougher, faster, wider dodge.
 *
 * `level` is the integer rung the rest of the game keys on — the reaction tick, lead aim,
 * the NPC loadout (3 upgrades at Hard, 4 at Expert, everything + mastery at Nightmare) and
 * the Expert+ perk roll all read it.
 */
export function rankedDifficulty(step: number): DifficultyConfig {
  const s = clampStep(step);
  const label = rankName(s);
  if (s >= EXCELSIUS_STEP) {
    const n = DIFFICULTY_PRESETS[4];
    return {
      level: 5, label,
      hp: Math.round(n.hp * 1.12), speed: n.speed + 12,
      aimOffsetDeg: 0, dodgeRange: n.dodgeRange + 30, castSkipChance: 0,
    };
  }
  // 1.0 at Bronze III → 4.8 at Diamond I.
  const f = 1 + (s / 14) * 3.8;
  const lo = Math.floor(f);
  const hi = Math.min(5, lo + 1);
  const t = f - lo;
  const a = DIFFICULTY_PRESETS[lo - 1];
  const b = DIFFICULTY_PRESETS[hi - 1];
  const lerp = (x: number, y: number) => x + (y - x) * t;
  return {
    level: Math.max(1, Math.min(5, Math.round(f))),
    label,
    hp: Math.round(lerp(a.hp, b.hp)),
    speed: Math.round(lerp(a.speed, b.speed)),
    aimOffsetDeg: lerp(a.aimOffsetDeg, b.aimOffsetDeg),
    dodgeRange: Math.round(lerp(a.dodgeRange, b.dodgeRange)),
    castSkipChance: lerp(a.castSkipChance, b.castSkipChance),
  };
}

/** One-line description of the bot at a rung, for the lobby. */
export function describeBot(step: number): string {
  const d = rankedDifficulty(step);
  const kit = d.level >= 5 ? 'full kit + mastery' : d.level === 4 ? '4 upgrades' : d.level === 3 ? '3 upgrades' : 'base kit';
  const aim = d.aimOffsetDeg <= 2 ? 'pinpoint aim' : d.aimOffsetDeg <= 10 ? 'sharp aim' : d.aimOffsetDeg <= 25 ? 'steady aim' : 'loose aim';
  const dodge = d.dodgeRange > 0 ? 'dodges' : 'no dodging';
  return `${d.hp} HP  ·  ${aim}  ·  ${dodge}  ·  ${kit}`;
}
