import Phaser from 'phaser';
import type { BossToolkit } from './BossToolkit';

/**
 * World-boss definitions.
 *
 * Every campaign world ends on a Sovereign — a choreographed boss in the
 * Disgraced King's mould. The King himself is ~4000 bespoke lines; forty-five
 * of him is not a plan. Instead the machinery he proved out (telegraphed move
 * cycle, independent harass track, phase machine, npc-slot body) lives once in
 * `WorldBossKit`, and each boss is a `WorldBossDef`: numbers, lines, a palette,
 * a hand-drawn body, and two or three fully bespoke *signature* moves.
 *
 * Signatures are the part of a boss that is genuinely its own. They are kept on
 * the def (not in a global registry) so The Amalgam — the finale that fights
 * with every Sovereign's stolen moves — can reach all of them through
 * `getAllWorldBossDefs()` and replay them verbatim.
 */

// ── Library moves ────────────────────────────────────────────────────

/** The shared attack vocabulary. Implementations live in AttackLibrary.ts. */
export type LibMoveId =
  | 'volley'      // an aimed fan of shots
  | 'radial'      // a full ring of shots off the body
  | 'spiral'      // rotating multi-arm bullet stream
  | 'stream'      // tracking machine-gun burst
  | 'barrage'     // falling AoE strikes across the player's ground
  | 'minefield'   // a ring of armed charges around the player
  | 'quake'       // expanding shockwave rings with a drifting safe wedge
  | 'lanes'       // staggered telegraphed lanes through the player
  | 'sweep'       // a beam pinned to the boss, swept across the hall
  | 'slamchain'   // leading AoE slams that chase the player's movement
  | 'sanctuary'   // the whole arena detonates except one safe circle
  | 'homing'      // steerable orbs that can be out-manoeuvred
  | 'summon'      // thralls
  | 'hazard'      // lingering ground pools thrown around the player
  | 'charge';     // the boss body itself dashes down a telegraphed lane

/** Light attacks for the harassment track — one of these is always coming. */
export type HarassId =
  | 'h-snipe'     // two quick falling strikes on the player's feet
  | 'h-flak'      // a loose fan of shots, spaced to walk through
  | 'h-orbs'      // a pair of homing orbs
  | 'h-rune'      // a delayed blast where the player is standing
  | 'h-lane'      // one lane through the player's row or column
  | 'h-mines';    // two charges dropped near the player

/** A cycle entry: a library move, or one of this boss's signature moves. */
export type MoveRef = LibMoveId | `sig:${string}`;

/**
 * Per-move numeric overrides. Every library move reads its own subset; a def
 * overrides only what makes this boss feel different (a wider lane, a slower
 * ring), never the dodgeability rules baked into the implementations.
 */
export interface LibTuning {
  damage?: number;
  count?: number;
  warnMs?: number;
  radius?: number;
  speed?: number;
  durationMs?: number;
  halfW?: number;
  rings?: number;
  gapHalf?: number;
  arms?: number;
  intervalMs?: number;
  spreadRad?: number;
}

// ── Signatures ───────────────────────────────────────────────────────

/**
 * A bespoke move. Instantiated once per fight with the toolkit it will act
 * through; `update`/`draw*` are called every frame for the whole fight, so a
 * signature gates itself on its own state rather than being mounted/unmounted.
 */
export interface SignatureMove {
  /** How long the boss is considered busy after `cast`. */
  durationMs: number;
  cast(time: number): void;
  update?(time: number, dt: number): void;
  /** Under the fighters — telegraphs and floor. */
  drawGround?(g: Phaser.GameObjects.Graphics, time: number): void;
  /** Over the fighters — projectiles and flourishes. */
  drawAir?(g: Phaser.GameObjects.Graphics, time: number): void;
  /** Phase transition or fight end — drop any live state. */
  onPhaseEnd?(): void;
}

export type SignatureFactory = (tk: BossToolkit) => SignatureMove;

// ── Body drawing ─────────────────────────────────────────────────────

/** Everything a def's `drawBody` gets to pose with. */
export interface BossBodyState {
  x: number;
  y: number;
  t: number;
  /** 0–1 within the current phase's pool. */
  hpRatio: number;
  enraged: boolean;
  /** True for a beat after taking a hit. */
  hurt: boolean;
  phaseIdx: number;
  hard: boolean;
  /** Angle toward the player. */
  facing: number;
  /** 0–1, rises while a move is being cast. */
  castGlow: number;
}

// ── The def ──────────────────────────────────────────────────────────

export interface WorldBossPhase {
  /** Shown on the boss bar and bannered as the phase begins. */
  name: string;
  /** One line from the Sovereign as this phase starts. */
  line?: string;
  hp: number;
  cycle: MoveRef[];
  harass: HarassId[];
  /** Beat between scripted moves. */
  restMs: number;
  /** Defaults to restMs × 0.55 — under half health the beat tightens. */
  restEnragedMs?: number;
  harassMs: number;
  /** Body drift speed in px/s. 0 (default) roots the boss in a hover. */
  moveSpeed?: number;
  /** Distance the body tries to keep from the player while drifting. */
  holdDist?: number;
  /** Hitbox radius override for this phase. */
  bodyR?: number;
}

export interface WorldBossHard {
  /** Default 1.35 — applied to every phase pool. */
  hpMult?: number;
  /** Default 1.25 — applied once, at the toolkit's hitPlayer chokepoint. */
  damageMult?: number;
  /** Default 0.7 — applied to rest beats and harass clocks. */
  restMult?: number;
  /** Default true — the interlude heal orbs are simply not offered. */
  noHeals?: boolean;
  /** A phase behind the last one, hard mode only — the Devourer pattern. */
  extraPhase?: WorldBossPhase;
  /** Second banner line under the name on a hard-mode intro. */
  introLine?: string;
  /** Extra tuning layered over the def's own in hard mode. */
  tuning?: Partial<Record<LibMoveId, LibTuning>>;
}

export interface WorldBossDef {
  worldId: string;
  /** 'The Archfiend' */
  name: string;
  /** 'Sovereign of the First Flame' */
  title: string;

  color: number;
  colorLit: number;
  colorDark: number;
  accent: number;

  /** Hitbox radius. Defaults to 26 — a touch over a normal fighter's 22. */
  bodyR?: number;
  /** One knob over every point of damage this fight deals. Default 1. */
  damageMult?: number;

  /** First entry is bannered large; the rest follow smaller. */
  intro: string[];
  /** Rotating mid-fight lines, spoken on a slow clock. */
  banter: string[];
  defeatLine: string;
  /**
   * Spoken when a fresh element tags in on a pledge fight and the Sovereign is picking up
   * where it left off, rather than being met for the first time.
   */
  resumeLine?: string;

  phases: WorldBossPhase[];
  hard?: WorldBossHard;

  tuning?: Partial<Record<LibMoveId, LibTuning>>;
  signatures: Record<string, SignatureFactory>;

  drawBody(g: Phaser.GameObjects.Graphics, s: BossBodyState): void;
  /** Optional bespoke floor, painted once under the whole fight. */
  drawArena?(g: Phaser.GameObjects.Graphics, W: number, H: number): void;
}

/**
 * A Sovereign's body mid-fight, handed from the element that fell to the one that tags in.
 * Phase index *and* HP, because a boss's health lives in per-phase pools — HP alone would
 * hand it its first phase back.
 */
export interface BossResumeState {
  phaseIdx: number;
  hp: number;
}

/** Resolved hard-mode knobs with every default applied. */
export function hardKnobs(def: WorldBossDef): Required<Omit<WorldBossHard, 'extraPhase' | 'introLine' | 'tuning'>> {
  return {
    hpMult: def.hard?.hpMult ?? 1.35,
    damageMult: def.hard?.damageMult ?? 1.25,
    restMult: def.hard?.restMult ?? 0.7,
    noHeals: def.hard?.noHeals ?? true,
  };
}
