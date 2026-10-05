import Phaser from 'phaser';
import type { BossPalette, BossToolkit } from './BossToolkit';
import type { BossGesture, BossHold, BossLook } from './BossRig';

/**
 * World-boss definitions.
 *
 * Every campaign world ends on a Sovereign — a choreographed boss in the
 * Disgraced King's mould. The King himself is ~4000 bespoke lines; forty-five
 * of him is not a plan. Instead the machinery he proved out (telegraphed move
 * cycle, independent harass track, phase machine, npc-slot body) lives once in
 * `WorldBossKit`, and each boss is a `WorldBossDef`: numbers, lines, a palette,
 * a `BossLook` the shared rig wears, and two or three fully bespoke *signature*
 * moves.
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
  /**
   * Wind-up before `cast` fires, overriding the framework's default beat. The
   * Sovereign plants, the rig charges and the move's name goes up over its head
   * for this long — nothing a Sovereign throws arrives unannounced.
   */
  windupMs?: number;
  /** What the rig does on release. Defaults to a two-handed thrust. */
  gesture?: BossGesture;
  /** A pose held for the duration instead of a one-shot gesture. */
  hold?: BossHold;
  /** The move drives the body itself — the movement AI stands down while it runs. */
  locksBody?: boolean;
  /** Shown over the Sovereign's head during the wind-up. */
  tell?: string;
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

/**
 * Everything a def's optional `drawDecor` gets to work with. The rig has
 * already painted the body, hands, face and crest at this point; decor is the
 * flourish that only this Sovereign has.
 */
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
  /** The body radius the rig drew with. */
  radius: number;
  /** This phase's palette — already tinted by the phase style. */
  palette: BossPalette;
  /** This phase's resolved look. */
  look: BossLook;
  /** Live hand positions, index 0–1 (0–3 on a four-armed Sovereign). */
  hands: { x: number; y: number }[];
}

// ── Phase styling ────────────────────────────────────────────────────

/**
 * How the body carries itself for a phase. A Sovereign that hovers in phase one
 * and stalks you in phase two is a different fight in the same arena, which is
 * most of what makes a phase feel like a phase.
 */
export type BossMovement =
  /** Rooted. It does not need to come to you. */
  | 'anchor'
  /** Slow float, holding its preferred range. */
  | 'hover'
  /** Walks a wide arc, closing whenever you give it room. */
  | 'stalk'
  /** Fast circling at a fixed radius — always moving, never closing. */
  | 'orbit'
  /** Closes to arm's reach, then kicks away again. */
  | 'rush'
  /** Vanishes and reappears elsewhere on a clock. */
  | 'blink';

/**
 * A standing arena rule for one phase, over and above the move cycle. Each is
 * implemented once in WorldBossKit, so any Sovereign can be handed one.
 */
export type BossGimmick =
  | 'none'
  /** The room goes dark; you see a radius around yourself and nothing else. */
  | 'gloom'
  /** A burning rim closes inward, taking the arena a metre at a time. */
  | 'shrink'
  /** A steady trickle of thralls, never more than a few at once. */
  | 'stalkers'
  /** The floor heaves on a clock — a shockwave from a corner, every few seconds. */
  | 'tremor'
  /** Three wards orbit the body and blunt its damage. Run through one to pop it. */
  | 'wards';

/** A palette shift applied over the def's own colours for one phase. */
export type BossTint = 'none' | 'hot' | 'cold' | 'pale' | 'void' | 'sick' | 'gold' | 'blood';

export interface BossPhaseStyle {
  movement?: BossMovement;
  gimmick?: BossGimmick;
  /** Layered over the def's look for this phase — a crest that grows teeth. */
  look?: Partial<BossLook>;
  tint?: BossTint;
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
  /**
   * Legacy drift speed in px/s, honoured only when the phase has no `movement`
   * style. Movement profiles supersede it — a Sovereign's footwork is now part
   * of its phase, not a single number.
   */
  moveSpeed?: number;
  /** Preferred stand-off distance, same legacy caveat as `moveSpeed`. */
  holdDist?: number;
  /** Hitbox radius override for this phase. Defaults to the phase look's `torsoR`. */
  bodyR?: number;
  /** Overrides `def.phaseStyles[idx]` for this one phase. */
  style?: BossPhaseStyle;
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

  /**
   * Hitbox radius override. Normally left alone: the hitbox is derived from the
   * look's `torsoR` so that what you can hit is exactly what you can see.
   */
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

  /**
   * The Sovereign's silhouette, as data. The shared rig — round body, floating
   * hands, tracking eyes, exactly the player's own build — paints it, so a def
   * no longer owns a hundred lines of drawing that drift out of sync with the
   * fight it belongs to.
   */
  look: BossLook;
  /**
   * Index-aligned with `phases` (the hard-mode extra phase takes the slot after
   * the last). Missing entries fall back to an escalation derived from the
   * phase index.
   */
  phaseStyles?: BossPhaseStyle[];

  /** Optional flourish painted over the rig — the one thing only this Sovereign has. */
  drawDecor?(g: Phaser.GameObjects.Graphics, s: BossBodyState): void;
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
