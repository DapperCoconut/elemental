import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import {
  MAGNET, MagnetColorFn, MagnetFx, Pt, drawScrap, fieldArc, fieldArcLayered, fillPts, horseshoe, strokePts,
} from './MagnetVisuals';

/**
 * Mecha Massacre — the magnet's scrap mech.
 *
 * A port of Earth's Titan Form (still in EarthKit behind `LEGACY_GOLEM_Q`): the pilot vanishes
 * into a machine far bigger than the arena, so only its cockpit (hanging over one edge) and its
 * two arms (running down the sides) ever fit on screen. Same five keys, same numbers, re-themed
 * as hydraulics, rails and a visor cannon in blue-black scrap plate.
 *
 * Unlike the titan, either side can pilot one. Everything is laid out in the *mech's frame* —
 * the player's mech hangs off the top edge with its avalanche running left→right; the npc's is
 * the same machine turned 180° (cockpit off the bottom edge, avalanche running right→left), so two
 * mechs never overlap. `toWorld`/`toFrame` are one involution: `(W − x, H − y)` when flipped.
 *
 * The mech only owns its body and its world effects. The pilot (hiding, invulnerability, HP
 * restore, the eject on Self-Destruct) is MagnetKit's job.
 */

export type MechAttack = 'smash' | 'rail' | 'avalanche' | 'cannon' | 'destruct';

/** Q+ Salvage Salvo: the four parts picked during the wind-up. */
export type MechHead = 'camo' | 'furnace' | 'junkyard';
export type MechCore = 'calm' | 'urgent' | 'base';
export type MechArmKind = 'slammer' | 'launcher' | 'saw';
export interface MechBuild { head: MechHead | null; core: MechCore; left: MechArmKind; right: MechArmKind }

/** Salvage Salvo cores: `cd` scales every mech cooldown, `dur` the mech's lifespan. */
export const CORE_MODS: Record<MechCore, { cd: number; dur: number }> = {
  calm: { cd: 1.4, dur: 1.5 },
  urgent: { cd: 0.6, dur: 0.6 },
  base: { cd: 1, dur: 1 },
};

export const MECH_DURATION_MS = 15000;
/** Cooldown per mech key. Destruct has none — it ends the form. */
export const MECH_COOLDOWNS: Record<Exclude<MechAttack, 'destruct'>, number> = {
  smash: 1400,
  rail: 5000,
  avalanche: 13000,
  cannon: 10000,
};

const HEAD_CY = -30;       // cockpit centre sits above the edge; the chin lands at ~170
const VISOR_Y = 112;       // cannon origin, in frame
const RAIL_MS = 8000;
const CANNON_MS = 4000;
const DEBRIS_FALL_MS = 2000;
const PAD = 32;            // arena border inset — keeps effects off the HUD strip

const DEBRIS_RADIUS = 46;

// Salvage Salvo parts.
/** Slammer: the spiked mace hits this much harder, in a slightly wider ring. */
const SLAMMER_BONUS = 10;
const SLAMMER_RADIUS_MULT = 1.1;
/** Launcher: one Click is a barrage of rockets at the cursor. */
const LAUNCHER_ROCKETS = 5;
const LAUNCHER_GAP_MS = 70;
const LAUNCHER_FLIGHT_MS = 320;
const LAUNCHER_SCATTER = 36;
const LAUNCHER_DAMAGE = 9;
const LAUNCHER_RADIUS = 46;
/** Saw: the blade grinds wherever the cursor is for a while. */
const SAW_MS = 1300;
const SAW_TICK_MS = 140;
const SAW_DAMAGE = 4;
const SAW_RADIUS = 62;
const SAW_FOLLOW_SPEED = 900;
/** Camo head: rockets fall out of the sky every so often. */
const CAMO_GAP_MS = 3200;
const CAMO_ROCKETS = 4;
const CAMO_FALL_MS = 900;
const CAMO_DAMAGE = 12;
const CAMO_RADIUS = 56;
const CAMO_JITTER = 80;
/** Furnace head: attacks leave burning puddles. */
const FLAME_MS = 4000;
const FLAME_TICK_MS = 500;
const FLAME_DAMAGE = 4;
const FLAME_MAX = 60;
/** Furnace boosts every number by this much on top of the slammer/launcher/saw base. */
const FURNACE_PART_MULT = 1.35;

/** Every number a mech key deals. A Salvage Salvo Furnace head swaps the whole table for {@link MEGA_STATS}. */
export interface MechStats {
  cooldowns: Record<Exclude<MechAttack, 'destruct'>, number>;
  smashDamage: number; smashRadius: number; smashDebris: number;
  debrisDamage: number;
  railDamage: number; railHalfW: number;
  avalancheDamage: number; avalancheSlamDamage: number; avalancheStunMs: number; rainDamage: number;
  cannonTickDamage: number; cannonHalfW: number; slagTickDamage: number;
  blasts: number; blastDamage: number; blastRadius: number;
}

const BASE_STATS: MechStats = {
  cooldowns: MECH_COOLDOWNS,
  smashDamage: 20, smashRadius: 96, smashDebris: 3,
  debrisDamage: 10,
  railDamage: 15, railHalfW: 52,
  avalancheDamage: 25, avalancheSlamDamage: 30, avalancheStunMs: 700, rainDamage: 12,
  cannonTickDamage: 5, cannonHalfW: 34, slagTickDamage: 5,
  blasts: 20, blastDamage: 20, blastRadius: 76,
};

/** Q+ Salvage Salvo, Furnace head: the red mech. Every key hits harder, wider and longer. */
export const MEGA_STATS: MechStats = {
  cooldowns: { smash: 1000, rail: 4000, avalanche: 11000, cannon: 8500 },
  smashDamage: 30, smashRadius: 120, smashDebris: 5,
  debrisDamage: 14,
  railDamage: 22, railHalfW: 76,
  avalancheDamage: 35, avalancheSlamDamage: 45, avalancheStunMs: 1200, rainDamage: 16,
  cannonTickDamage: 7, cannonHalfW: 46, slagTickDamage: 7,
  blasts: 30, blastDamage: 25, blastRadius: 90,
};

/** The narrow surface the mech needs from MagnetKit. */
export interface MechApi {
  readonly scene: Phaser.Scene;
  readonly width: number;
  readonly height: number;
  readonly tint: MagnetColorFn;
  readonly fx: MagnetFx;
  /** Everyone this mech may hurt right now. */
  targets(): Fighter[];
  hit(t: Fighter, dmg: number): void;
  stun(t: Fighter, ms: number): void;
  /** Hold `t` at this velocity for `ms` (the kit owns shoves). */
  push(t: Fighter, vx: number, vy: number, ms: number): void;
  /** Drag `t` along to world `x` (the avalanche front). The kit decides whose body it may move. */
  carry(t: Fighter, x: number): void;
  announce(x: number, y: number, text: string, color: number): void;
  shake(ms: number, intensity: number): void;
}

interface MechArm {
  side: -1 | 1;
  /** `fist` = the plain mech's gauntlet; the rest are Salvage Salvo arms. */
  kind: MechArmKind | 'fist';
  shoulderX: number; shoulderY: number;
  elbowX: number; elbowY: number;
  restX: number; restY: number;
  fistX: number; fistY: number;
  fromX: number; fromY: number;
  toX: number; toY: number;
  /** Strike point, in frame. */
  targetX: number; targetY: number;
  phase: 'rest' | 'raise' | 'strike' | 'grind' | 'recover';
  /** Saw: the next shred tick while grinding. */
  tickAt: number;
  phaseStart: number;
  phaseEnd: number;
}

/** A lump of scrap in the air — world coords. */
interface Debris {
  sx: number; sy: number;
  lx: number; ly: number;
  startAt: number; landAt: number;
  peak: number; spin: number; size: number; seed: number;
  dmg: number; radius: number;
}

interface Rail { x: number; until: number; nextHit: Map<Fighter, number> }

/** The avalanche front, in frame x. */
interface Avalanche { x: number; speed: number; hit: Set<Fighter>; slammed: boolean }

interface Cannon { until: number; x: number; y: number; nextTickAt: number; nextSlagAt: number }

interface Slag { x: number; y: number; r: number; until: number; seed: number }

/** A rocket — off a Launcher arm, or out of the sky under a Camo head. World coords. */
interface Rocket {
  sx: number; sy: number; lx: number; ly: number;
  startAt: number; landAt: number;
  dmg: number; radius: number;
  fromSky: boolean;
}

/** Furnace head: a puddle of burning slag. */
interface Flame { x: number; y: number; r: number; until: number; seed: number }

/** Fixed jitter so the plating has a scrapped-together silhouette that does not boil. */
const JIT = [1.03, 0.94, 1.06, 0.92, 1.08, 0.95, 1.02, 0.93, 1.07, 0.96, 1.01, 0.92, 1.05, 0.97, 1.04, 0.91];

export class MagnetMech {
  /** True while the body is up. World effects keep running after it falls. */
  active = true;
  /** When the body falls. Hits to the core pull it closer — see {@link drain}. */
  until: number;
  private readonly flip: boolean;
  private arms: MechArm[] = [];
  private readyAt: Record<Exclude<MechAttack, 'destruct'>, number> = { smash: 0, rail: 0, avalanche: 0, cannon: 0 };
  private debris: Debris[] = [];
  private rail: Rail | null = null;
  private avalanche: Avalanche | null = null;
  private cannon: Cannon | null = null;
  private slag: Slag[] = [];
  private slagAccum = 0;
  private blastsLeft = 0;
  private blastNextAt = 0;
  private rockets: Rocket[] = [];
  private flames: Flame[] = [];
  private flameAccum = 0;
  private nextBarrageAt = 0;
  /** Salvage Salvo: the arm the next Click goes to. */
  private nextSide: -1 | 1 = 1;
  private aimX = 0;
  private aimY = 0;

  // Layers. The body draws over everything on purpose; floor effects stay ≤20 so the ability
  // cards (21–23) are never painted over.
  private bodyG: Phaser.GameObjects.Graphics;
  private beamG: Phaser.GameObjects.Graphics;
  private floorG: Phaser.GameObjects.Graphics;
  private worldG: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text | null;

  private readonly stats: MechStats;
  /** How long this mech lives at full core (the core's own lifespan). */
  readonly duration: number;

  /**
   * `build` = Q+ Salvage Salvo's picked parts; null is the plain mech. A Furnace head is the red
   * mech ({@link MEGA_STATS}); the red itself is the kit's tint.
   */
  constructor(private api: MechApi, flip: boolean, now: number, readonly build: MechBuild | null = null) {
    this.flip = flip;
    const base = build?.head === 'furnace' ? MEGA_STATS : BASE_STATS;
    const core = CORE_MODS[build?.core ?? 'base'];
    const junk = build?.head === 'junkyard';
    this.stats = {
      ...base,
      cooldowns: {
        smash: Math.round(base.cooldowns.smash * core.cd), rail: Math.round(base.cooldowns.rail * core.cd),
        avalanche: Math.round(base.cooldowns.avalanche * core.cd), cannon: Math.round(base.cooldowns.cannon * core.cd),
      },
      // Junkyard Scrapper: the self-destruct is far worse.
      blasts: base.blasts + (junk ? 12 : 0),
      blastDamage: Math.round(base.blastDamage * (junk ? 1.4 : 1)),
      blastRadius: Math.round(base.blastRadius * (junk ? 1.25 : 1)),
    };
    this.duration = MECH_DURATION_MS * core.dur;
    this.until = now + this.duration;
    this.nextBarrageAt = now + 1500;
    const { scene, width: W, height: H } = api;
    this.floorG = scene.add.graphics().setDepth(3);
    this.worldG = scene.add.graphics().setDepth(17);
    this.beamG = scene.add.graphics().setDepth(28);
    this.bodyG = scene.add.graphics().setDepth(30);
    // Drawing the body in frame coordinates and turning the layer is cheaper and far less error
    // prone than flipping every vertex by hand.
    if (flip) {
      this.bodyG.setPosition(W, H).setScale(-1, -1);
      this.beamG.setPosition(W, H).setScale(-1, -1);
    }
    const lp = this.toWorld(W / 2, 189);
    this.label = scene.add.text(lp.x, lp.y, '', {
      fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
      color: this.furnace ? '#ff9a88' : '#8fe8ff', stroke: '#07090e', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(32);

    const mkArm = (side: -1 | 1): MechArm => {
      const sx = side < 0 ? -70 : W + 70;
      const ex = side < 0 ? 46 : W - 46;
      const rx = side < 0 ? 70 : W - 70;
      const ry = H * 0.78;
      return {
        side, kind: build ? (side < 0 ? build.left : build.right) : 'fist', shoulderX: sx, shoulderY: -70, elbowX: ex, elbowY: H * 0.36,
        restX: rx, restY: ry, fistX: rx, fistY: ry,
        fromX: rx, fromY: ry, toX: rx, toY: ry, targetX: rx, targetY: ry,
        phase: 'rest', tickAt: 0, phaseStart: 0, phaseEnd: 0,
      };
    };
    this.arms = [mkArm(-1), mkArm(1)];

    // Boot-up: the arena shakes, scrap rains off the frame as it stands.
    api.shake(1100, 0.026);
    for (let i = 0; i < 5; i++) {
      const p = this.toWorld(60 + (i / 4) * (W - 120), 130);
      api.fx.shrapnel(p.x, p.y, 7, { speed: 200, size: 12, life: 900, fall: 260, depth: 29, color: MAGNET.gunHi });
    }
    const c = this.toWorld(W / 2, 170);
    api.fx.pulse(c.x, c.y, W * 0.45, MAGNET.neon, 900, 29, 14);
    api.announce(c.x, this.toWorld(W / 2, 240).y, build ? '🤖 SALVAGE SALVO!' : '🤖 MECHA MASSACRE!', MAGNET.visor);
  }

  /** Q+ Salvage Salvo's Furnace head: the red mech. */
  get furnace(): boolean { return this.build?.head === 'furnace'; }

  /** The core can be hurt (everything but Salvage Salvo's Base core). */
  get coreHurtable(): boolean { return this.build?.core !== 'base'; }

  /** A hit on the core: the mech loses `ms` of its remaining life. */
  drain(ms: number): void {
    if (this.active) this.until -= ms;
  }

  // ── Frame helpers ──────────────────────────────────────────────────────

  private toWorld(x: number, y: number): Pt {
    return this.flip ? { x: this.api.width - x, y: this.api.height - y } : { x, y };
  }
  private toFrame(x: number, y: number): Pt { return this.toWorld(x, y); }

  private clampWorld(x: number, y: number): Pt {
    return {
      x: Phaser.Math.Clamp(x, PAD + 20, this.api.width - PAD - 20),
      y: Phaser.Math.Clamp(y, PAD + 30, this.api.height - PAD - 20),
    };
  }

  // ── Keys ───────────────────────────────────────────────────────────────

  ready(a: Exclude<MechAttack, 'destruct'>, time: number): boolean { return this.active && time >= this.readyAt[a]; }

  /** 0 = just used, 1 = ready. For the ability tray. */
  readyRatio(a: Exclude<MechAttack, 'destruct'>, time: number): number {
    const left = this.readyAt[a] - time;
    return left <= 0 ? 1 : Phaser.Math.Clamp(1 - left / this.stats.cooldowns[a], 0, 1);
  }

  /** Fire one key. `x, y` is the aim in world coordinates. False if it could not go. */
  use(a: MechAttack, time: number, x: number, y: number): boolean {
    if (!this.active) return false;
    if (a === 'destruct') { this.end(time, true); return true; }
    if (time < this.readyAt[a]) return false;
    if (a === 'smash' && !this.smash(time, x, y)) return false;
    if (a === 'rail') this.railCast(time, x);
    if (a === 'avalanche') this.avalancheCast();
    if (a === 'cannon') this.cannonCast(time, x, y);
    this.readyAt[a] = time + this.stats.cooldowns[a];
    return true;
  }

  /** Click — Hydraulic Smash: bring a fist down on the point. */
  private smash(time: number, x: number, y: number): boolean {
    const w = this.clampWorld(x, y);
    const f = this.toFrame(w.x, w.y);
    // Salvage Salvo: Clicks alternate arms (the other one steps in while one is busy).
    const preferred = this.build ? this.nextSide : f.x < this.api.width / 2 ? -1 : 1;
    const arm = this.arms.find(a => a.side === preferred && a.phase === 'rest')
      ?? this.arms.find(a => a.phase === 'rest');
    if (!arm) return false;
    if (this.build) this.nextSide = arm.side < 0 ? 1 : -1;
    arm.targetX = f.x; arm.targetY = f.y;
    arm.phase = 'raise';
    arm.phaseStart = time; arm.phaseEnd = time + 200;
    arm.fromX = arm.fistX; arm.fromY = arm.fistY;
    if (arm.kind === 'launcher') {
      // The pod swings round to point at the spot rather than climbing over it.
      arm.toX = Phaser.Math.Linear(arm.restX, f.x, 0.3);
      arm.toY = Phaser.Math.Linear(arm.restY, f.y, 0.3) - 60;
      arm.phaseEnd = time + 160;
    } else {
      arm.toX = f.x; arm.toY = f.y - (arm.kind === 'saw' ? 140 : 250);
    }
    this.api.shake(160, 0.008);
    return true;
  }

  /** A Salvage Salvo part number, boosted under a Furnace head. */
  private part(n: number): number { return this.furnace ? Math.round(n * FURNACE_PART_MULT) : n; }

  /** Furnace head: a burning puddle where an attack landed. */
  private burn(x: number, y: number, r: number): void {
    if (!this.furnace) return;
    this.flames.push({ x, y, r, until: this.api.scene.time.now + FLAME_MS, seed: Math.random() * 10 });
    while (this.flames.length > FLAME_MAX) this.flames.shift();
  }

  private fireRocket(sx: number, sy: number, lx: number, ly: number, at: number, ms: number, dmg: number, radius: number, fromSky: boolean): void {
    this.rockets.push({ sx, sy, lx, ly, startAt: at, landAt: at + ms, dmg, radius, fromSky });
  }

  /** E — Mag Rail: an electrified rail driven down the arena at the cursor's column. */
  private railCast(time: number, x: number): void {
    this.rail = {
      x: Phaser.Math.Clamp(x, 40, this.api.width - 40),
      until: time + RAIL_MS,
      nextHit: new Map(),
    };
    this.api.shake(700, 0.03);
    this.api.fx.sparks(this.rail.x, this.api.height / 2, 14, -Math.PI / 2, 20, MAGNET.visor);
    this.api.announce(this.rail.x, this.api.height / 2 - 60, '⚡ MAG RAIL', MAGNET.visor);
  }

  /** R — Scrap Avalanche: a wall of junk sweeps the arena and pins whoever it catches. */
  private avalancheCast(): void {
    this.avalanche = { x: -110, speed: 720, hit: new Set(), slammed: false };
    this.api.shake(1500, 0.016);
    const c = this.toWorld(this.api.width / 2, 250);
    this.api.announce(c.x, c.y, '🗑 SCRAP AVALANCHE!', MAGNET.neon);
  }

  /** F — Visor Cannon: a beam out of the cockpit, dragged across the floor for 4s. */
  private cannonCast(time: number, x: number, y: number): void {
    this.cannon = { until: time + CANNON_MS, x, y, nextTickAt: time, nextSlagAt: time };
    this.aimCannon(x, y);
    this.api.shake(400, 0.02);
    const c = this.toWorld(this.api.width / 2, 250);
    this.api.announce(c.x, c.y, '🔆 VISOR CANNON', MAGNET.visor);
  }

  private aimCannon(x: number, y: number): void {
    if (!this.cannon) return;
    const H = this.api.height;
    this.cannon.x = Phaser.Math.Clamp(x, 10, this.api.width - 10);
    // Never above the visor in the mech's own frame.
    const minY = VISOR_Y + 20;
    this.cannon.y = this.flip
      ? Phaser.Math.Clamp(y, PAD, H - minY)
      : Phaser.Math.Clamp(y, minY, H - PAD);
  }

  /**
   * Shut the body down. `destruct` is the Q self-destruct: it queues twenty blasts across the
   * arena, which keep going after the body is gone. Safe to call twice.
   */
  end(time: number, destruct: boolean): void {
    if (!this.active) return;
    this.active = false;
    this.cannon = null;
    this.bodyG.clear();
    this.beamG.clear();
    this.label?.destroy();
    this.label = null;
    const { width: W } = this.api;
    // The frame coming apart in mid-air.
    for (const cx of [W / 2 - 160, W / 2, W / 2 + 160, 50, W - 50]) {
      const p = this.toWorld(cx, Phaser.Math.Between(60, 180));
      this.api.fx.shrapnel(p.x, p.y, 9, { speed: 150, size: 13, life: 1100, fall: 440, depth: 27, color: MAGNET.gunHi });
    }
    if (destruct) {
      this.blastsLeft = this.stats.blasts;
      this.blastNextAt = time + 700;
      this.api.shake(900, 0.045);
      const c = this.toWorld(W / 2, 240);
      this.api.announce(c.x, c.y, '💥 SELF-DESTRUCT!', MAGNET.amber);
    } else {
      this.api.shake(700, 0.02);
    }
  }

  /** Nothing of this mech is left on screen — the kit may drop it. */
  get done(): boolean {
    return !this.active && this.debris.length === 0 && !this.rail && !this.avalanche
      && this.slag.length === 0 && this.blastsLeft === 0 && this.rockets.length === 0 && this.flames.length === 0;
  }

  destroy(): void {
    this.active = false;
    for (const g of [this.bodyG, this.beamG, this.floorG, this.worldG]) g.destroy();
    this.label?.destroy();
    this.label = null;
  }

  // ── Per-frame ──────────────────────────────────────────────────────────

  /** `aimX, aimY` steers a live cannon; pass the pilot's cursor (or the bot's target). */
  update(time: number, delta: number, aimX: number, aimY: number): void {
    if (this.active && time >= this.until) this.end(time, false);
    this.aimX = aimX; this.aimY = aimY;
    if (this.active) {
      this.updateArms(time, delta);
      if (this.build?.head === 'camo' && time >= this.nextBarrageAt) this.camoBarrage(time);
      if (this.cannon) this.aimCannon(aimX, aimY);
    }
    this.updateWorld(time, delta);
    this.paint(time);
    if (this.label) this.label.setText(`🤖 ${this.build ? 'SALVO MECH' : 'MECH'}  ${Math.max(0, (this.until - time) / 1000).toFixed(1)}s`);
  }

  private updateArms(time: number, delta: number): void {
    for (const a of this.arms) {
      if (a.phase === 'grind') { this.grind(a, time, delta); continue; }
      if (a.phase === 'rest') {
        a.fistX = a.restX + Math.sin(time / 780 + a.side) * 5;
        a.fistY = a.restY + Math.sin(time / 560 + a.side) * 7;
        continue;
      }
      const t = Phaser.Math.Clamp((time - a.phaseStart) / Math.max(1, a.phaseEnd - a.phaseStart), 0, 1);
      const e = a.phase === 'strike' ? t * t : 1 - (1 - t) * (1 - t);
      a.fistX = Phaser.Math.Linear(a.fromX, a.toX, e);
      a.fistY = Phaser.Math.Linear(a.fromY, a.toY, e);
      if (t < 1) continue;
      if (a.phase === 'raise') {
        a.phase = 'strike';
        a.phaseStart = time; a.phaseEnd = time + 110;
        a.fromX = a.fistX; a.fromY = a.fistY;
        if (a.kind === 'launcher') {
          // The pod kicks back as it fires instead of coming down on the spot.
          a.toX = Phaser.Math.Linear(a.fistX, a.restX, 0.25); a.toY = a.fistY - 30;
        } else {
          a.toX = a.targetX; a.toY = a.targetY;
        }
      } else if (a.phase === 'strike') {
        if (a.kind === 'saw') {
          a.phase = 'grind';
          a.phaseStart = time; a.phaseEnd = time + SAW_MS;
          a.tickAt = time;
          continue;
        }
        if (a.kind === 'launcher') this.launch(a, time);
        else this.smashImpact(a);
        a.phase = 'recover';
        a.phaseStart = time; a.phaseEnd = time + 480;
        a.fromX = a.fistX; a.fromY = a.fistY;
        a.toX = a.restX; a.toY = a.restY;
      } else {
        a.phase = 'rest';
      }
    }
  }

  /** The smash ring for this arm: a Slammer's mace reaches a little wider. */
  private smashRadius(arm: MechArm): number {
    return arm.kind === 'slammer' ? Math.round(this.stats.smashRadius * SLAMMER_RADIUS_MULT) : this.stats.smashRadius;
  }

  private smashImpact(arm: MechArm): void {
    const w = this.toWorld(arm.targetX, arm.targetY);
    const radius = this.smashRadius(arm);
    const dmg = this.stats.smashDamage + (arm.kind === 'slammer' ? SLAMMER_BONUS : 0);
    this.api.shake(430, 0.032);
    for (const t of this.api.targets()) {
      if (Phaser.Math.Distance.Between(w.x, w.y, t.x, t.y) > radius) continue;
      this.api.hit(t, dmg);
    }
    this.api.fx.boom(w.x, w.y, 110, { color: MAGNET.neon, depth: 6 });
    this.api.fx.slam(w.x, w.y, radius, MAGNET.sky, 6);
    this.burn(w.x, w.y, 54);
    // Three lumps of floor and plate kicked up — they come back down 2s later.
    for (let i = 0; i < this.stats.smashDebris; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 90 + Math.random() * 150;
      const l = this.clampWorld(w.x + Math.cos(ang) * dist, w.y + Math.sin(ang) * dist);
      this.spawnDebris(w.x, w.y, l.x, l.y, DEBRIS_FALL_MS, this.stats.debrisDamage, DEBRIS_RADIUS, 12 + Math.random() * 6);
    }
  }

  /** Launcher: a barrage of rockets out of the pod at the strike point. */
  private launch(arm: MechArm, time: number): void {
    const from = this.toWorld(arm.fistX, arm.fistY);
    const to = this.toWorld(arm.targetX, arm.targetY);
    for (let i = 0; i < LAUNCHER_ROCKETS; i++) {
      const l = this.clampWorld(to.x + (Math.random() - 0.5) * 2 * LAUNCHER_SCATTER, to.y + (Math.random() - 0.5) * 2 * LAUNCHER_SCATTER);
      this.fireRocket(from.x, from.y, l.x, l.y, time + i * LAUNCHER_GAP_MS, LAUNCHER_FLIGHT_MS, this.part(LAUNCHER_DAMAGE), LAUNCHER_RADIUS, false);
    }
    this.api.shake(220, 0.012);
    this.api.fx.sparks(from.x, from.y, 8, Math.atan2(to.y - from.y, to.x - from.x), 29, MAGNET.amber);
  }

  /** Saw: the blade follows the cursor and shreds whatever is under it. */
  private grind(a: MechArm, time: number, delta: number): void {
    const aim = this.clampWorld(this.aimX, this.aimY);
    const f = this.toFrame(aim.x, aim.y);
    const step = SAW_FOLLOW_SPEED * (delta / 1000);
    const d = Phaser.Math.Distance.Between(a.fistX, a.fistY, f.x, f.y);
    if (d > 0.5) {
      const k = Math.min(1, step / d);
      a.fistX += (f.x - a.fistX) * k;
      a.fistY += (f.y - a.fistY) * k;
    }
    if (time >= a.tickAt) {
      a.tickAt = time + SAW_TICK_MS;
      const w = this.toWorld(a.fistX, a.fistY);
      for (const t of this.api.targets()) {
        if (Phaser.Math.Distance.Between(w.x, w.y, t.x, t.y) > SAW_RADIUS) continue;
        this.api.hit(t, this.part(SAW_DAMAGE));
        this.api.fx.sparks(t.x, t.y, 4, Math.random() * Math.PI * 2, 10, MAGNET.amber);
      }
      this.api.fx.sparks(w.x, w.y, 3, Math.random() * Math.PI * 2, 29, MAGNET.goldHi);
      if (Math.random() < 0.55) this.burn(w.x, w.y, 40);
      this.api.shake(60, 0.004);
    }
    if (time < a.phaseEnd) return;
    a.phase = 'recover';
    a.phaseStart = time; a.phaseEnd = time + 480;
    a.fromX = a.fistX; a.fromY = a.fistY;
    a.toX = a.restX; a.toY = a.restY;
  }

  /** Camo head: a salvo out of the sky over whoever this mech may hurt. */
  private camoBarrage(time: number): void {
    this.nextBarrageAt = time + CAMO_GAP_MS;
    const targets = this.api.targets();
    const { width: W, height: H } = this.api;
    for (let i = 0; i < CAMO_ROCKETS; i++) {
      const t = targets.length > 0 ? targets[i % targets.length] : null;
      const cx = t ? t.x : Phaser.Math.Between(PAD + 60, W - PAD - 60);
      const cy = t ? t.y : Phaser.Math.Between(PAD + 60, H - PAD - 60);
      const l = this.clampWorld(cx + (Math.random() - 0.5) * 2 * CAMO_JITTER, cy + (Math.random() - 0.5) * 2 * CAMO_JITTER);
      const skyY = this.flip ? H + 80 : -80;
      this.fireRocket(l.x + Phaser.Math.Between(-40, 40), skyY, l.x, l.y, time + i * 160, CAMO_FALL_MS, this.part(CAMO_DAMAGE), CAMO_RADIUS, true);
    }
  }

  private spawnDebris(sx: number, sy: number, lx: number, ly: number, ms: number, dmg: number, radius: number, size: number): void {
    const now = this.api.scene.time.now;
    // Junk kicked up off the floor arcs; junk already falling out of the sky comes straight
    // down — an arc would park it off-screen for most of the flight.
    const fromSky = this.flip ? sy > this.api.height : sy < 0;
    this.debris.push({
      sx, sy, lx, ly, startAt: now, landAt: now + ms,
      peak: fromSky ? 0 : 160 + Math.random() * 90,
      spin: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 4),
      size, seed: Math.floor(Math.random() * 100), dmg, radius,
    });
  }

  private updateWorld(time: number, delta: number): void {
    const { width: W, height: H } = this.api;
    const dt = delta / 1000;

    // Debris.
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const r = this.debris[i];
      if (time < r.landAt) continue;
      this.debris.splice(i, 1);
      this.api.fx.shrapnel(r.lx, r.ly, r.dmg > 0 ? 8 : 4, { speed: 160, size: 9, life: 380, depth: 6, color: MAGNET.gunHi });
      if (r.dmg <= 0) continue;
      this.api.fx.filingsMark(r.lx, r.ly, r.radius * 0.7, 2, MAGNET.gun);
      this.api.shake(170, 0.012);
      for (const t of this.api.targets()) {
        if (Phaser.Math.Distance.Between(r.lx, r.ly, t.x, t.y) > r.radius) continue;
        this.api.hit(t, r.dmg);
      }
    }

    // Rail.
    if (this.rail) {
      const rl = this.rail;
      if (time >= rl.until) {
        this.rail = null;
      } else {
        for (const t of this.api.targets()) {
          if (Math.abs(t.x - rl.x) > this.stats.railHalfW) continue;
          if (time < (rl.nextHit.get(t) ?? 0)) continue;
          rl.nextHit.set(t, time + 1000);
          this.api.hit(t, this.stats.railDamage);
          this.api.fx.sparks(t.x, t.y, 8, -Math.PI / 2, 10, MAGNET.visor);
          this.api.shake(160, 0.01);
        }
      }
    }

    // Avalanche (frame x; the npc's runs the other way).
    if (this.avalanche) {
      const av = this.avalanche;
      av.x += av.speed * dt;
      const front = av.x + 78;
      const dir = this.flip ? -1 : 1;
      for (const t of this.api.targets()) {
        const fx = this.toFrame(t.x, t.y).x;
        if (fx > front) continue;
        if (!av.hit.has(t)) {
          av.hit.add(t);
          this.api.hit(t, this.stats.avalancheDamage);
        }
        // Carried along on the front.
        const pushFx = Math.min(W - PAD - 12, front);
        this.api.carry(t, this.toWorld(pushFx, 0).x);
        this.api.push(t, av.speed * dir, 0, 60);
      }
      if (!av.slammed && front >= W - 30) {
        av.slammed = true;
        this.api.shake(520, 0.04);
        for (const t of this.api.targets()) {
          if (this.toFrame(t.x, t.y).x < W - 170) continue;
          this.api.hit(t, this.stats.avalancheSlamDamage);
          this.api.stun(t, this.stats.avalancheStunMs);
          const wall = this.toWorld(W - 20, 0).x;
          this.api.fx.shrapnel(wall, t.y, 14, { speed: 260, size: 12, life: 600, depth: 18, color: MAGNET.gunHi, angle: dir > 0 ? Math.PI : 0, spread: 1.1 });
          this.api.announce(t.x, t.y - 40, '💥 CRUSHED INTO THE WALL', MAGNET.sky);
        }
      }
      if (av.x > W + 160) {
        this.avalanche = null;
        // …and then the scrap that went up comes down.
        for (let i = 0; i < 50; i++) {
          const lx = Phaser.Math.Between(PAD + 20, W - PAD - 20);
          const ly = Phaser.Math.Between(PAD + 40, H - PAD - 20);
          const skyY = this.flip ? H + 90 + Math.random() * 120 : -90 - Math.random() * 120;
          this.spawnDebris(lx + Phaser.Math.Between(-60, 60), skyY, lx, ly,
            DEBRIS_FALL_MS + Phaser.Math.Between(0, 400), this.stats.rainDamage, 46, 10 + Math.random() * 8);
        }
        const c = this.toWorld(W / 2, 250);
        this.api.announce(c.x, c.y, '🔩 IT RAINS SCRAP', MAGNET.steel);
      }
    }

    // Cannon.
    if (this.cannon) {
      const b = this.cannon;
      if (time >= b.until) {
        this.cannon = null;
      } else {
        const o = this.toWorld(W / 2, VISOR_Y);
        if (time >= b.nextTickAt) {
          b.nextTickAt = time + 200;
          for (const t of this.api.targets()) {
            if (segDist(o.x, o.y, b.x, b.y, t.x, t.y) > this.stats.cannonHalfW) continue;
            this.api.hit(t, this.stats.cannonTickDamage);
          }
        }
        if (time >= b.nextSlagAt) {
          b.nextSlagAt = time + 110;
          this.slag.push({ x: b.x, y: b.y, r: 30, until: time + 7000, seed: Math.random() * 10 });
          while (this.slag.length > 90) this.slag.shift();
          this.api.shake(90, 0.004);
        }
      }
    }

    // Rockets: Launcher barrages and Camo salvos.
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      if (time < r.landAt) continue;
      this.rockets.splice(i, 1);
      this.api.fx.boom(r.lx, r.ly, r.radius + 14, { color: MAGNET.amber, depth: 7, shrapnel: 5 });
      this.api.shake(120, 0.008);
      for (const t of this.api.targets()) {
        if (Phaser.Math.Distance.Between(r.lx, r.ly, t.x, t.y) > r.radius) continue;
        this.api.hit(t, r.dmg);
      }
      this.burn(r.lx, r.ly, 34);
    }

    // Furnace: burning puddles.
    if (this.flames.length > 0) {
      this.flames = this.flames.filter(fl => time < fl.until);
      this.flameAccum += delta;
      if (this.flameAccum >= FLAME_TICK_MS) {
        this.flameAccum = 0;
        for (const t of this.api.targets()) {
          if (!this.flames.some(fl => Phaser.Math.Distance.Between(t.x, t.y, fl.x, fl.y) <= fl.r)) continue;
          this.api.hit(t, FLAME_DAMAGE);
        }
      }
    }

    // Slag left by the cannon and the blasts.
    if (this.slag.length > 0) {
      this.slag = this.slag.filter(s => time < s.until);
      this.slagAccum += delta;
      if (this.slagAccum >= 500) {
        this.slagAccum = 0;
        for (const t of this.api.targets()) {
          if (!this.slag.some(s => Phaser.Math.Distance.Between(t.x, t.y, s.x, s.y) <= s.r)) continue;
          this.api.hit(t, this.stats.slagTickDamage);
        }
      }
    }

    // Self-destruct carpet — outlives the body.
    if (this.blastsLeft > 0 && time >= this.blastNextAt) {
      this.blastsLeft--;
      this.blastNextAt = time + 140;
      const x = Phaser.Math.Between(PAD + 30, W - PAD - 30);
      const y = Phaser.Math.Between(PAD + 40, H - PAD - 30);
      this.api.shake(220, 0.022);
      this.api.fx.boom(x, y, 92, { color: MAGNET.amber, depth: 7 });
      for (const t of this.api.targets()) {
        if (Phaser.Math.Distance.Between(x, y, t.x, t.y) > this.stats.blastRadius) continue;
        this.api.hit(t, this.stats.blastDamage);
      }
      this.slag.push({ x, y, r: 46, until: time + 9000, seed: Math.random() * 10 });
      this.burn(x, y, 46);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────

  private paint(time: number): void {
    const tint = this.api.tint;
    const t = time / 1000;
    const { width: W, height: H } = this.api;

    // Floor: slag, the rail, smash telegraphs, debris shadows.
    const fg = this.floorG;
    fg.clear();
    for (const s of this.slag) {
      const life = Phaser.Math.Clamp((s.until - time) / 1500, 0, 1);
      fg.fillStyle(tint(MAGNET.oil), 0.6 * life);
      fg.fillCircle(s.x, s.y, s.r);
      fg.fillStyle(tint(MAGNET.cobalt), (0.35 + 0.15 * Math.sin(t * 6 + s.seed)) * life);
      fg.fillCircle(s.x, s.y, s.r * 0.72);
      fg.lineStyle(2, tint(MAGNET.visor), 0.6 * life);
      for (let i = 0; i < 4; i++) {
        const a = s.seed + (i / 4) * Math.PI * 2;
        fg.lineBetween(s.x, s.y, s.x + Math.cos(a) * s.r * 0.85, s.y + Math.sin(a) * s.r * 0.85);
      }
    }
    if (this.rail) this.paintRail(fg, this.rail, t);
    for (const a of this.arms) {
      if (a.phase === 'grind') {
        // The saw's bite on the floor, scored with fresh cuts.
        const w = this.toWorld(a.fistX, a.fistY);
        fg.fillStyle(tint(MAGNET.shadow), 0.4);
        fg.fillEllipse(w.x, w.y + 6, SAW_RADIUS * 1.6, SAW_RADIUS * 0.7);
        fg.lineStyle(2, tint(MAGNET.amber), 0.55 + 0.25 * Math.sin(t * 30));
        fg.strokeCircle(w.x, w.y, SAW_RADIUS);
        continue;
      }
      if (a.phase !== 'raise' && a.phase !== 'strike') continue;
      const w = this.toWorld(a.targetX, a.targetY);
      const p = a.phase === 'strike' ? 1 : Phaser.Math.Clamp((time - a.phaseStart) / 200, 0, 1);
      fg.fillStyle(tint(MAGNET.shadow), 0.25 + 0.3 * p);
      fg.fillEllipse(w.x, w.y, 60 + p * 80, (60 + p * 80) * 0.45);
      fg.lineStyle(3, tint(a.kind === 'launcher' ? MAGNET.amber : MAGNET.neon), 0.4 + 0.5 * p);
      fg.strokeCircle(w.x, w.y, a.kind === 'launcher' ? LAUNCHER_SCATTER + LAUNCHER_RADIUS
        : a.kind === 'saw' ? SAW_RADIUS : this.smashRadius(a));
    }
    // Furnace puddles: a crust of slag with flame tongues licking off it.
    for (const fl of this.flames) {
      const life = Phaser.Math.Clamp((fl.until - time) / 900, 0, 1);
      fg.fillStyle(tint(0x3a0c04), 0.65 * life);
      fg.fillCircle(fl.x, fl.y, fl.r);
      fg.fillStyle(tint(0xff4a12), (0.45 + 0.15 * Math.sin(t * 9 + fl.seed)) * life);
      fg.fillCircle(fl.x, fl.y, fl.r * 0.74);
      fg.fillStyle(tint(0xffc24a), (0.45 + 0.25 * Math.sin(t * 13 + fl.seed * 2)) * life);
      fg.fillCircle(fl.x + Math.sin(t * 3 + fl.seed) * fl.r * 0.15, fl.y, fl.r * 0.36);
      for (let i = 0; i < 5; i++) {
        const a = fl.seed + (i / 5) * Math.PI * 2 + t * 0.6;
        const bx = fl.x + Math.cos(a) * fl.r * 0.6, by = fl.y + Math.sin(a) * fl.r * 0.45;
        const h = (10 + 8 * Math.sin(t * 11 + i * 1.7 + fl.seed)) * life;
        fg.fillStyle(tint(0xff7a1a), 0.7 * life);
        fillPts(fg, [{ x: bx - 5, y: by }, { x: bx + 5, y: by }, { x: bx + Math.sin(t * 7 + i) * 3, y: by - h }]);
      }
    }
    // Rockets on their way: a target ring on the floor where each comes down.
    for (const r of this.rockets) {
      if (time < r.startAt) continue;
      const k = Phaser.Math.Clamp((time - r.startAt) / Math.max(1, r.landAt - r.startAt), 0, 1);
      fg.fillStyle(tint(MAGNET.shadow), 0.15 + 0.35 * k);
      fg.fillEllipse(r.lx, r.ly, 14 + 18 * k, (14 + 18 * k) * 0.45);
      if (!r.fromSky) continue;
      fg.lineStyle(2, tint(MAGNET.amber), 0.35 + 0.55 * k);
      fg.strokeCircle(r.lx, r.ly, r.radius);
      fg.lineBetween(r.lx - r.radius * 0.5, r.ly, r.lx + r.radius * 0.5, r.ly);
      fg.lineBetween(r.lx, r.ly - r.radius * 0.5, r.lx, r.ly + r.radius * 0.5);
    }
    for (const r of this.debris) {
      const k = Phaser.Math.Clamp((time - r.startAt) / Math.max(1, r.landAt - r.startAt), 0, 1);
      const sw = Math.max(8, r.size * 2 * (0.3 + 0.7 * k));
      fg.fillStyle(tint(MAGNET.shadow), 0.14 + 0.36 * k);
      fg.fillEllipse(r.lx, r.ly, sw, sw * 0.42);
      if (r.dmg > 0 && k > 0.5) {
        fg.lineStyle(1.5, tint(MAGNET.neon), (k - 0.5) * 1.2);
        fg.strokeCircle(r.lx, r.ly, r.radius);
      }
    }

    // In the air: debris and the avalanche.
    const wg = this.worldG;
    wg.clear();
    for (const r of this.debris) {
      const k = Phaser.Math.Clamp((time - r.startAt) / Math.max(1, r.landAt - r.startAt), 0, 1);
      const x = Phaser.Math.Linear(r.sx, r.lx, k);
      const y = Phaser.Math.Linear(r.sy, r.ly, k) - Math.sin(k * Math.PI) * r.peak;
      drawScrap(wg, tint, x, y, k * r.spin, r.size, r.seed, 'fly', t);
    }
    if (this.avalanche) this.paintAvalanche(wg, this.avalanche, t);
    for (const r of this.rockets) {
      if (time < r.startAt) continue;
      const k = Phaser.Math.Clamp((time - r.startAt) / Math.max(1, r.landAt - r.startAt), 0, 1);
      const arc = r.fromSky ? 0 : Math.sin(k * Math.PI) * 70;
      const x = Phaser.Math.Linear(r.sx, r.lx, k);
      const y = Phaser.Math.Linear(r.sy, r.ly, k) - arc;
      // Heading: the derivative of the path, so the nose leads the arc.
      const k2 = Math.min(1, k + 0.03);
      const x2 = Phaser.Math.Linear(r.sx, r.lx, k2);
      const y2 = Phaser.Math.Linear(r.sy, r.ly, k2) - (r.fromSky ? 0 : Math.sin(k2 * Math.PI) * 70);
      drawRocket(wg, tint, x, y, Math.atan2(y2 - y, x2 - x), r.fromSky ? 1.3 : 1, t);
    }

    // Beam and body.
    const bg = this.beamG;
    bg.clear();
    if (this.cannon && this.active) {
      const f = this.toFrame(this.cannon.x, this.cannon.y);
      this.paintCannon(bg, f.x, f.y, time);
    }
    const g = this.bodyG;
    g.clear();
    if (!this.active) return;
    this.paintArms(g, time);
    this.paintHead(g, time);
    this.paintPowerPlate(g, time);
    void W; void H;
  }

  /**
   * The mech's run-time readout, bolted under the chin: a riveted scrap-plate placard with a
   * row of fifteen power cells, one per second left, that drain toward the end and blink red
   * on the last few. The label text sits on its top half.
   */
  private paintPowerPlate(g: Phaser.GameObjects.Graphics, time: number): void {
    const tint = this.api.tint;
    const cx = this.api.width / 2;
    const left = Math.max(0, this.until - time);
    const frac = Math.min(1, left / this.duration);
    const PW = 168, PH = 34, L = cx - PW / 2, T = 178;
    g.fillStyle(tint(MAGNET.oil), 1);
    fillPts(g, [{ x: L - 4, y: T }, { x: L + PW + 4, y: T }, { x: L + PW - 4, y: T + PH + 3 }, { x: L + 4, y: T + PH + 3 }]);
    g.fillStyle(tint(MAGNET.gunMid), 1);
    fillPts(g, [{ x: L, y: T + 2 }, { x: L + PW, y: T + 2 }, { x: L + PW - 6, y: T + PH }, { x: L + 6, y: T + PH }]);
    g.lineStyle(2, tint(MAGNET.cobalt), 1);
    strokePts(g, [{ x: L, y: T + 2 }, { x: L + PW, y: T + 2 }, { x: L + PW - 6, y: T + PH }, { x: L + 6, y: T + PH }], true);
    g.fillStyle(tint(MAGNET.plateHi), 0.9);
    for (const [rx, ry] of [[L + 6, T + 7], [L + PW - 6, T + 7], [L + 11, T + PH - 5], [L + PW - 11, T + PH - 5]]) g.fillCircle(rx, ry, 2.2);
    // The cell row.
    const n = 15, cw = 7.4, gap = 1.8;
    const rowW = n * cw + (n - 1) * gap;
    const rx0 = cx - rowW / 2, ry0 = T + 19;
    g.fillStyle(tint(MAGNET.oil), 1);
    g.fillRect(rx0 - 3, ry0 - 2, rowW + 6, 12);
    // Battery nub on the end.
    g.fillRect(rx0 + rowW + 3, ry0 + 1, 3, 6);
    const lit = frac * n;
    const low = left < 4000;
    const blink = Math.sin(time / 90) > 0;
    for (let i = 0; i < n; i++) {
      const x = rx0 + i * (cw + gap);
      const on = Phaser.Math.Clamp(lit - i, 0, 1);
      g.fillStyle(tint(MAGNET.gun), 1);
      g.fillRect(x, ry0, cw, 8);
      if (on <= 0) continue;
      const c = low ? MAGNET.red : i >= Math.floor(lit) ? MAGNET.visor : MAGNET.neon;
      g.fillStyle(tint(c), (low && !blink ? 0.45 : 1) * (0.35 + on * 0.65));
      g.fillRect(x, ry0, cw, 8);
      g.fillStyle(tint(MAGNET.white), 0.35 * on);
      g.fillRect(x, ry0, cw, 2);
    }
  }

  /** The cockpit: a riveted, patched helmet of blue-black plate with a cyan visor slit. */
  private paintHead(g: Phaser.GameObjects.Graphics, time: number): void {
    const tint = this.api.tint;
    const W = this.api.width;
    const t = time / 1000;
    const cx = W / 2 + Math.sin(time / 1100) * 6;
    const cy = HEAD_CY + Math.sin(time / 800) * 3;
    const RX = 250, RY = 200;

    // Hull: an octagon-ish helmet, jittered so the plating looks bolted on by hand.
    const hull: Pt[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const k = JIT[i];
      // Squared-off: push the corners out, pull the flats in.
      const sq = 0.86 + 0.14 * Math.abs(Math.cos(a * 2));
      hull.push({ x: cx + Math.cos(a) * RX * k * sq, y: cy + Math.sin(a) * RY * k * sq });
    }
    g.fillStyle(tint(MAGNET.oil), 1);
    fillPts(g, hull.map(p => ({ x: cx + (p.x - cx) * 1.03, y: cy + (p.y - cy) * 1.03 })));
    g.fillStyle(tint(MAGNET.gun), 1);
    fillPts(g, hull);

    // Mismatched plates welded over the hull.
    const plates: Array<[number, number, number, number, number]> = [
      [-170, 40, 110, 90, MAGNET.gunMid], [60, 30, 120, 80, MAGNET.gunHi],
      [-60, 120, 120, 56, MAGNET.gunMid], [130, 110, 80, 60, MAGNET.gunMid],
      [-215, 100, 60, 70, MAGNET.gunHi],
    ];
    for (const [ox, oy, w, h, c] of plates) {
      const x = cx + ox, y = cy + oy;
      g.fillStyle(tint(c), 1);
      fillPts(g, [{ x, y }, { x: x + w, y: y + 6 }, { x: x + w - 6, y: y + h }, { x: x + 4, y: y + h - 4 }]);
      g.lineStyle(2, tint(MAGNET.oil), 0.9);
      strokePts(g, [{ x, y }, { x: x + w, y: y + 6 }, { x: x + w - 6, y: y + h }, { x: x + 4, y: y + h - 4 }], true);
      // Rivets on each plate's corners.
      g.fillStyle(tint(MAGNET.plateHi), 0.9);
      for (const [rx, ry] of [[x + 6, y + 6], [x + w - 8, y + 10], [x + w - 12, y + h - 8], [x + 8, y + h - 10]]) {
        g.fillCircle(rx, ry, 3);
      }
    }
    // A rust bloom or two, because it is scrap.
    g.fillStyle(tint(MAGNET.rust), 0.55);
    g.fillEllipse(cx - 120, cy + 150, 46, 18);
    g.fillEllipse(cx + 170, cy + 60, 28, 14);

    // Cobalt trim round the jaw.
    g.lineStyle(6, tint(MAGNET.cobalt), 1);
    g.beginPath();
    g.arc(cx, cy + 20, 220, 0.25, Math.PI - 0.25, false);
    g.strokePath();

    // Visor: a long slit with the cannon lens at its centre.
    const vy = VISOR_Y + (cy - HEAD_CY);
    const pulse = 0.7 + 0.3 * Math.sin(time / 200);
    g.fillStyle(tint(MAGNET.oil), 1);
    fillPts(g, [{ x: cx - 190, y: vy - 22 }, { x: cx + 190, y: vy - 22 }, { x: cx + 160, y: vy + 20 }, { x: cx - 160, y: vy + 20 }]);
    g.fillStyle(tint(MAGNET.cobalt), 0.8);
    fillPts(g, [{ x: cx - 178, y: vy - 14 }, { x: cx + 178, y: vy - 14 }, { x: cx + 152, y: vy + 12 }, { x: cx - 152, y: vy + 12 }]);
    g.fillStyle(tint(MAGNET.visor), pulse);
    fillPts(g, [{ x: cx - 170, y: vy - 6 }, { x: cx + 170, y: vy - 6 }, { x: cx + 150, y: vy + 4 }, { x: cx - 150, y: vy + 4 }]);
    // A scanning eye riding the slit.
    const scan = cx + Math.sin(t * 1.7) * 130;
    g.fillStyle(tint(MAGNET.white), 0.95);
    g.fillEllipse(scan, vy - 1, 34, 9);
    // Cannon lens.
    g.fillStyle(tint(MAGNET.oil), 1); g.fillCircle(cx, vy + 34, 26);
    g.fillStyle(tint(MAGNET.cobalt), 1); g.fillCircle(cx, vy + 34, 20);
    g.fillStyle(tint(this.cannon ? MAGNET.white : MAGNET.neon), this.cannon ? 1 : 0.6 + 0.3 * Math.sin(t * 5)); g.fillCircle(cx, vy + 34, 11);

    // Vents and hazard stripes on the cheeks.
    for (const s of [-1, 1]) {
      const vx = cx + s * 150;
      for (let i = 0; i < 4; i++) {
        g.fillStyle(tint(MAGNET.oil), 1);
        g.fillRect(vx - 26, vy + 44 + i * 11, 52, 6);
      }
      for (let i = 0; i < 5; i++) {
        g.fillStyle(tint(i % 2 === 0 ? MAGNET.amber : MAGNET.oil), 0.9);
        fillPts(g, [
          { x: vx - 30 + i * 12, y: vy - 44 }, { x: vx - 22 + i * 12, y: vy - 44 },
          { x: vx - 28 + i * 12, y: vy - 32 }, { x: vx - 36 + i * 12, y: vy - 32 },
        ]);
      }
      // Exhaust: a lazy wisp of blue off each vent.
      const p = (t * 0.8 + (s > 0 ? 0.5 : 0)) % 1;
      g.fillStyle(tint(MAGNET.neon), 0.25 * (1 - p));
      g.fillCircle(vx + s * (30 + p * 30), vy + 60 + p * 40, 8 + p * 10);
    }

    // Q+ Salvage Salvo heads.
    if (this.build?.head === 'camo') this.paintCamo(g, cx, cy, vy, t);
    if (this.build?.head === 'junkyard') this.paintJunkyard(g, cx, cy, vy, t);
    // Furnace: swept war-horns off the brow, a gold chevron under the crest, and a firebox grate.
    if (this.furnace) {
      const glow = 0.65 + 0.35 * Math.sin(t * 7);
      g.fillStyle(tint(MAGNET.oil), 1);
      g.fillRoundedRect(cx - 64, vy + 64, 128, 40, 8);
      g.fillStyle(tint(0xff5a14), glow);
      g.fillRoundedRect(cx - 58, vy + 69, 116, 30, 6);
      g.fillStyle(tint(0xffd060), 0.5 * glow);
      g.fillEllipse(cx, vy + 88, 90, 14);
      g.fillStyle(tint(MAGNET.gunMid), 1);
      for (let i = 0; i < 6; i++) g.fillRect(cx - 55 + i * 21, vy + 66, 6, 36);
      // Embers spat out of the grate.
      for (let i = 0; i < 4; i++) {
        const p = (t * 0.9 + i / 4) % 1;
        g.fillStyle(tint(0xffaa33), 0.8 * (1 - p));
        g.fillCircle(cx - 40 + i * 26 + Math.sin(t * 3 + i) * 6, vy + 104 + p * 40, 3 - p * 2);
      }
      for (const s of [-1, 1]) {
        const base = { x: cx + s * 168, y: cy + 14 };
        const horn: Pt[] = [
          { x: base.x - s * 26, y: base.y }, { x: base.x + s * 18, y: base.y + 6 },
          { x: base.x + s * 74, y: base.y - 96 }, { x: base.x + s * 30, y: base.y - 40 },
        ];
        g.fillStyle(tint(MAGNET.oil), 1);
        fillPts(g, horn.map(p => ({ x: p.x, y: p.y + 4 })));
        g.fillStyle(tint(MAGNET.red), 1);
        fillPts(g, horn);
        g.lineStyle(2, tint(MAGNET.blush), 0.85);
        strokePts(g, [horn[0], horn[3], horn[2]]);
      }
      g.lineStyle(5, tint(MAGNET.gold), 0.95);
      strokePts(g, [{ x: cx - 70, y: cy + 92 }, { x: cx, y: cy + 118 }, { x: cx + 70, y: cy + 92 }]);
    }

    // The crest: the element's horseshoe bolted to the brow.
    horseshoe(g, tint, cx, cy + 46, 0, 54, 1, t);

    // Antenna with a blinking tip.
    g.lineStyle(4, tint(MAGNET.gunHi), 1);
    g.lineBetween(cx + 120, cy + 20, cx + 150, cy - 70);
    g.fillStyle(tint(MAGNET.red), Math.sin(t * 6) > 0 ? 1 : 0.25);
    g.fillCircle(cx + 150, cy - 70, 6);
  }

  /** Camo head: olive blotches over the plate and a rocket rack on each cheek. */
  private paintCamo(g: Phaser.GameObjects.Graphics, cx: number, cy: number, vy: number, t: number): void {
    const blots: Array<[number, number, number, number, number]> = [
      [-150, 20, 70, 34, 0x4b5a2a], [90, 10, 80, 30, 0x6b6a3a], [-40, 140, 64, 26, 0x3a4624],
      [160, 120, 50, 30, 0x4b5a2a], [-200, 120, 46, 40, 0x6b6a3a], [20, 60, 40, 22, 0x3a4624],
    ];
    for (const [ox, oy, w, h, c] of blots) {
      g.fillStyle(this.api.tint(c), 0.85);
      g.fillEllipse(cx + ox, cy + oy, w, h);
      g.fillEllipse(cx + ox + w * 0.3, cy + oy + h * 0.25, w * 0.6, h * 0.7);
    }
    for (const s of [-1, 1]) {
      const rx = cx + s * 214, ry = vy - 30;
      g.fillStyle(this.api.tint(MAGNET.oil), 1);
      g.fillRect(rx - 30, ry - 6, 60, 50);
      g.fillStyle(this.api.tint(0x4b5a2a), 1);
      g.fillRect(rx - 27, ry - 3, 54, 44);
      // Three tubes; a lit warhead in each that is not empty.
      const since = (this.api.scene.time.now - (this.nextBarrageAt - CAMO_GAP_MS)) / CAMO_GAP_MS;
      for (let i = 0; i < 3; i++) {
        const tx = rx - 17 + i * 17;
        g.fillStyle(this.api.tint(MAGNET.oil), 1); g.fillCircle(tx, ry + 30, 7);
        if (since > 0.25) { g.fillStyle(this.api.tint(MAGNET.red), 1); g.fillCircle(tx, ry + 30, 4.5); }
      }
      g.fillStyle(this.api.tint(MAGNET.amber), Math.sin(t * 5 + s) > 0 ? 0.9 : 0.3);
      g.fillCircle(rx + s * 22, ry + 4, 3);
    }
  }

  /** Junkyard Scrapper head: rust, a crooked salvage plate and a bundle of TNT strapped on. */
  private paintJunkyard(g: Phaser.GameObjects.Graphics, cx: number, cy: number, vy: number, t: number): void {
    const tint = this.api.tint;
    g.fillStyle(tint(MAGNET.rust), 0.75);
    g.fillEllipse(cx - 60, cy + 40, 90, 30);
    g.fillEllipse(cx + 110, cy + 150, 60, 22);
    g.fillEllipse(cx - 190, cy + 70, 40, 46);
    // A crooked plate bolted on at an angle, with hazard stripes.
    const plate: Pt[] = [{ x: cx + 60, y: cy + 4 }, { x: cx + 200, y: cy + 30 }, { x: cx + 190, y: cy + 74 }, { x: cx + 52, y: cy + 50 }];
    g.fillStyle(tint(MAGNET.gunHi), 1);
    fillPts(g, plate);
    for (let i = 0; i < 6; i++) {
      g.fillStyle(i % 2 === 0 ? tint(MAGNET.amber) : tint(MAGNET.oil), 0.9);
      fillPts(g, [
        { x: cx + 66 + i * 22, y: cy + 10 + i * 4 }, { x: cx + 80 + i * 22, y: cy + 13 + i * 4 },
        { x: cx + 72 + i * 22, y: cy + 50 + i * 4 }, { x: cx + 58 + i * 22, y: cy + 47 + i * 4 },
      ]);
    }
    // TNT bundle on the left cheek, fuse sputtering.
    const bx = cx - 222, by = vy - 34;
    for (let i = 0; i < 3; i++) {
      g.fillStyle(tint(0x8a1a12), 1);
      g.fillRoundedRect(bx - 22 + i * 15, by, 13, 46, 4);
      g.fillStyle(tint(0xd23a24), 1);
      g.fillRoundedRect(bx - 20 + i * 15, by + 2, 9, 42, 3);
    }
    g.fillStyle(tint(0xd9c27a), 1);
    g.fillRect(bx - 24, by + 18, 48, 8);
    g.lineStyle(2, tint(0x2a1a10), 1);
    g.lineBetween(bx, by, bx + 6, by - 14);
    const sp = Math.sin(t * 30) > 0;
    g.fillStyle(sp ? tint(0xffee88) : tint(0xff7a1a), 1);
    g.fillCircle(bx + 6, by - 15, sp ? 4 : 3);
  }

  /** One hydraulic limb segment: a plated sleeve with a piston running along it. */
  private limb(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, w1: number, w2: number, t: number): void {
    const tint = this.api.tint;
    const a = Math.atan2(y2 - y1, x2 - x1);
    const nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2);
    const quad: Pt[] = [
      { x: x1 + nx * w1, y: y1 + ny * w1 }, { x: x2 + nx * w2, y: y2 + ny * w2 },
      { x: x2 - nx * w2, y: y2 - ny * w2 }, { x: x1 - nx * w1, y: y1 - ny * w1 },
    ];
    g.fillStyle(tint(MAGNET.oil), 1);
    fillPts(g, quad.map(p => ({ x: p.x, y: p.y + 4 })));
    g.fillStyle(tint(MAGNET.gun), 1);
    fillPts(g, quad);
    g.lineStyle(4, tint(MAGNET.oil), 1);
    strokePts(g, quad, true);
    // Plate seams with rivets.
    for (let i = 1; i <= 3; i++) {
      const k = i / 4;
      const px = Phaser.Math.Linear(x1, x2, k), py = Phaser.Math.Linear(y1, y2, k);
      const pw = Phaser.Math.Linear(w1, w2, k) * 0.92;
      g.lineStyle(3, tint(MAGNET.gunHi), 0.9);
      g.lineBetween(px + nx * pw, py + ny * pw, px - nx * pw, py - ny * pw);
      g.fillStyle(tint(MAGNET.plateHi), 0.9);
      g.fillCircle(px + nx * pw * 0.7, py + ny * pw * 0.7, 3);
      g.fillCircle(px - nx * pw * 0.7, py - ny * pw * 0.7, 3);
    }
    // Piston: chrome rod in a cobalt sleeve, with a glowing seam down the middle.
    const off = 0.45;
    const sx = x1 + nx * w1 * off, sy = y1 + ny * w1 * off;
    const ex = x2 + nx * w2 * off, ey = y2 + ny * w2 * off;
    g.lineStyle(12, tint(MAGNET.cobalt), 1);
    g.lineBetween(sx, sy, Phaser.Math.Linear(sx, ex, 0.55), Phaser.Math.Linear(sy, ey, 0.55));
    g.lineStyle(6, tint(MAGNET.chrome), 1);
    g.lineBetween(Phaser.Math.Linear(sx, ex, 0.5), Phaser.Math.Linear(sy, ey, 0.5), ex, ey);
    g.lineStyle(3, tint(MAGNET.neon), 0.5 + 0.3 * Math.sin(t * 4));
    g.lineBetween(x1, y1, x2, y2);
  }

  private paintArms(g: Phaser.GameObjects.Graphics, time: number): void {
    const tint = this.api.tint;
    const t = time / 1000;
    for (const a of this.arms) {
      const midX = (a.shoulderX + a.fistX) / 2 + a.side * 46;
      const midY = (a.shoulderY + a.fistY) / 2;
      const ex = Phaser.Math.Linear(a.elbowX, midX, 0.55);
      const ey = Phaser.Math.Linear(a.elbowY, midY, 0.55);
      this.limb(g, a.shoulderX, a.shoulderY, ex, ey, 60, 48, t);
      this.limb(g, ex, ey, a.fistX, a.fistY, 48, 38, t);

      // Elbow: a fat bearing hub.
      g.fillStyle(tint(MAGNET.oil), 1); g.fillCircle(ex, ey, 54);
      g.fillStyle(tint(MAGNET.gunMid), 1); g.fillCircle(ex, ey, 48);
      g.fillStyle(tint(MAGNET.cobalt), 1); g.fillCircle(ex, ey, 26);
      g.fillStyle(tint(MAGNET.chrome), 1); g.fillCircle(ex, ey, 10);
      for (let i = 0; i < 6; i++) {
        const ang = t * 0.6 + (i / 6) * Math.PI * 2;
        g.fillStyle(tint(MAGNET.plateHi), 1);
        g.fillCircle(ex + Math.cos(ang) * 37, ey + Math.sin(ang) * 37, 4);
      }

      if (a.kind === 'slammer') { this.paintMace(g, a, t); continue; }
      if (a.kind === 'launcher') { this.paintLauncher(g, a, t); continue; }
      if (a.kind === 'saw') { this.paintSaw(g, a, time); continue; }

      // Fist: a squared, plated gauntlet with pole-coloured knuckles (red one hand, blue the other).
      const r = 56;
      const fp: Pt[] = [];
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const sq = 0.88 + 0.12 * Math.abs(Math.cos(ang * 2));
        fp.push({ x: a.fistX + Math.cos(ang) * r * JIT[i] * sq, y: a.fistY + Math.sin(ang) * r * JIT[(i + 3) % JIT.length] * sq });
      }
      g.fillStyle(tint(MAGNET.oil), 1);
      fillPts(g, fp.map(p => ({ x: a.fistX + (p.x - a.fistX) * 1.06, y: a.fistY + (p.y - a.fistY) * 1.06 })));
      g.fillStyle(tint(MAGNET.gunMid), 1);
      fillPts(g, fp);
      g.fillStyle(tint(MAGNET.gunHi), 1);
      fillPts(g, [
        { x: a.fistX - 40, y: a.fistY - 6 }, { x: a.fistX + 40, y: a.fistY - 6 },
        { x: a.fistX + 34, y: a.fistY + 30 }, { x: a.fistX - 34, y: a.fistY + 30 },
      ]);
      const pole = a.side < 0 ? MAGNET.red : MAGNET.blue;
      for (let k = 0; k < 4; k++) {
        const kx = a.fistX - 33 + k * 22, ky = a.fistY - 24;
        g.fillStyle(tint(MAGNET.oil), 1); g.fillCircle(kx, ky, 13);
        g.fillStyle(tint(pole), 1); g.fillCircle(kx, ky, 10);
        g.fillStyle(tint(MAGNET.white), 0.55); g.fillCircle(kx - 3, ky - 3, 3);
      }
      // Charged while winding up or striking.
      if (a.phase !== 'rest') {
        for (let i = 0; i < 4; i++) {
          const ang = t * 7 + (i / 4) * Math.PI * 2;
          g.fillStyle(tint(MAGNET.neon), 0.7);
          fieldArc(g, a.fistX + Math.cos(ang) * (r + 4), a.fistY + Math.sin(ang) * (r + 4),
            a.fistX + Math.cos(ang + 1) * (r + 4), a.fistY + Math.sin(ang + 1) * (r + 4), 12, 4, 10);
        }
      }
    }
  }

  /** Slammer: a spiked iron mace on the end of the arm, pole-coloured studs between the spikes. */
  private paintMace(g: Phaser.GameObjects.Graphics, a: MechArm, t: number): void {
    const tint = this.api.tint;
    const r = 50;
    const spin = a.phase === 'rest' ? t * 0.3 : t * 2;
    for (let i = 0; i < 10; i++) {
      const ang = spin + (i / 10) * Math.PI * 2;
      const c = Math.cos(ang), n = Math.sin(ang);
      const bx = a.fistX + c * (r - 4), by = a.fistY + n * (r - 4);
      g.fillStyle(tint(MAGNET.oil), 1);
      fillPts(g, [
        { x: bx - n * 13, y: by + c * 13 }, { x: a.fistX + c * (r + 30), y: a.fistY + n * (r + 30) }, { x: bx + n * 13, y: by - c * 13 },
      ]);
      g.fillStyle(tint(MAGNET.chrome), 1);
      fillPts(g, [
        { x: bx - n * 9, y: by + c * 9 }, { x: a.fistX + c * (r + 25), y: a.fistY + n * (r + 25) }, { x: bx + n * 9, y: by - c * 9 },
      ]);
    }
    g.fillStyle(tint(MAGNET.oil), 1); g.fillCircle(a.fistX, a.fistY, r + 3);
    g.fillStyle(tint(MAGNET.gunMid), 1); g.fillCircle(a.fistX, a.fistY, r);
    g.fillStyle(tint(MAGNET.gunHi), 1); g.fillCircle(a.fistX - 12, a.fistY - 12, r * 0.5);
    const pole = a.side < 0 ? MAGNET.red : MAGNET.blue;
    for (let i = 0; i < 5; i++) {
      const ang = spin + ((i + 0.5) / 5) * Math.PI * 2;
      g.fillStyle(tint(pole), 1);
      g.fillCircle(a.fistX + Math.cos(ang) * r * 0.62, a.fistY + Math.sin(ang) * r * 0.62, 7);
    }
    g.fillStyle(tint(MAGNET.white), 0.4); g.fillCircle(a.fistX - 16, a.fistY - 18, 8);
  }

  /** Launcher: a boxy rocket pod, a warhead in every tube that has not just fired. */
  private paintLauncher(g: Phaser.GameObjects.Graphics, a: MechArm, t: number): void {
    const tint = this.api.tint;
    const W2 = 58, H2 = 50;
    g.fillStyle(tint(MAGNET.oil), 1);
    g.fillRoundedRect(a.fistX - W2 - 4, a.fistY - H2 - 4, W2 * 2 + 8, H2 * 2 + 8, 12);
    g.fillStyle(tint(MAGNET.gunMid), 1);
    g.fillRoundedRect(a.fistX - W2, a.fistY - H2, W2 * 2, H2 * 2, 10);
    g.fillStyle(tint(MAGNET.gunHi), 1);
    g.fillRect(a.fistX - W2 + 6, a.fistY - H2 + 6, W2 * 2 - 12, 12);
    const loaded = a.phase === 'rest' || a.phase === 'raise';
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const tx = a.fistX - 34 + col * 34, ty = a.fistY - 4 + row * 32;
        g.fillStyle(tint(MAGNET.oil), 1); g.fillCircle(tx, ty, 13);
        g.fillStyle(tint(MAGNET.cobalt), 1); g.fillCircle(tx, ty, 10);
        if (loaded) {
          g.fillStyle(tint(MAGNET.red), 1); g.fillCircle(tx, ty, 7);
          g.fillStyle(tint(MAGNET.white), 0.5); g.fillCircle(tx - 2, ty - 2, 2.5);
        } else {
          g.fillStyle(tint(0xff7a1a), 0.5 + 0.4 * Math.sin(t * 30 + col)); g.fillCircle(tx, ty, 6);
        }
      }
    }
    const pole = a.side < 0 ? MAGNET.red : MAGNET.blue;
    g.fillStyle(tint(pole), 1);
    g.fillRect(a.fistX - W2 + 10, a.fistY - H2 + 9, 16, 6);
  }

  /** Saw: a toothed blade on a hub, screaming round while it grinds. */
  private paintSaw(g: Phaser.GameObjects.Graphics, a: MechArm, time: number): void {
    const tint = this.api.tint;
    const r = 58;
    const spin = time / (a.phase === 'grind' ? 22 : 260);
    const teeth = 16;
    const blade: Pt[] = [];
    for (let i = 0; i < teeth; i++) {
      const a0 = spin + (i / teeth) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / teeth * 0.7;
      blade.push({ x: a.fistX + Math.cos(a0) * r * 0.86, y: a.fistY + Math.sin(a0) * r * 0.86 });
      blade.push({ x: a.fistX + Math.cos(a1) * (r + 10), y: a.fistY + Math.sin(a1) * (r + 10) });
    }
    g.fillStyle(tint(MAGNET.oil), 1);
    fillPts(g, blade.map(p => ({ x: a.fistX + (p.x - a.fistX) * 1.05, y: a.fistY + (p.y - a.fistY) * 1.05 })));
    g.fillStyle(tint(MAGNET.chrome), 1);
    fillPts(g, blade);
    g.fillStyle(tint(MAGNET.steel), 1); g.fillCircle(a.fistX, a.fistY, r * 0.72);
    // Speed streaks on the blade face.
    g.lineStyle(3, tint(MAGNET.plateHi), 0.8);
    for (let i = 0; i < 3; i++) {
      const s0 = spin * 1.3 + (i / 3) * Math.PI * 2;
      g.beginPath();
      g.arc(a.fistX, a.fistY, r * 0.55, s0, s0 + 1.1, false);
      g.strokePath();
    }
    g.fillStyle(tint(MAGNET.oil), 1); g.fillCircle(a.fistX, a.fistY, 20);
    g.fillStyle(tint(a.side < 0 ? MAGNET.red : MAGNET.blue), 1); g.fillCircle(a.fistX, a.fistY, 13);
    g.fillStyle(tint(MAGNET.chrome), 1); g.fillCircle(a.fistX, a.fistY, 5);
    if (a.phase === 'grind') {
      for (let i = 0; i < 6; i++) {
        const ang = time / 30 + i * 1.3;
        g.fillStyle(tint(MAGNET.goldHi), 0.85);
        g.fillCircle(a.fistX + Math.cos(ang) * (r + 14 + (i * 7) % 20), a.fistY + Math.sin(ang) * (r + 14 + (i * 7) % 20), 3);
      }
    }
  }

  private paintRail(g: Phaser.GameObjects.Graphics, rl: Rail, t: number): void {
    const tint = this.api.tint;
    const top = PAD, bot = this.api.height - PAD;
    const life = Phaser.Math.Clamp((rl.until - this.api.scene.time.now) / 800, 0, 1);
    // Track art is drawn at the base 26 half-width and scaled to the live hit width.
    const k = this.stats.railHalfW / 26;
    // Sleepers, then the twin rails, then the arcs crawling between them.
    g.fillStyle(tint(MAGNET.gun), 0.9 * life);
    for (let y = top + 8; y < bot; y += 26) g.fillRect(rl.x - 28 * k, y, 56 * k, 9);
    for (const s of [-1, 1]) {
      g.fillStyle(tint(MAGNET.oil), life); g.fillRect(rl.x + s * 12 * k - 4 * k, top, 8 * k, bot - top);
      g.fillStyle(tint(MAGNET.plateHi), life); g.fillRect(rl.x + s * 12 * k - 2 * k, top, 3 * k, bot - top);
    }
    g.fillStyle(tint(MAGNET.cobalt), 0.18 * life);
    g.fillRect(rl.x - this.stats.railHalfW, top, this.stats.railHalfW * 2, bot - top);
    for (let i = 0; i < 9; i++) {
      const y = top + (((i * 97) + t * 420) % (bot - top));
      g.fillStyle(tint(i % 2 === 0 ? MAGNET.visor : MAGNET.neon), 0.85 * life);
      fieldArc(g, rl.x - 12 * k, y, rl.x + 12 * k, y + 14, (i % 2 === 0 ? 1 : -1) * 10 * k, 3, 10);
    }
  }

  /** The avalanche: a rolling bank of junk with a churning front of plates and bolts. */
  private paintAvalanche(g: Phaser.GameObjects.Graphics, av: Avalanche, t: number): void {
    const tint = this.api.tint;
    const top = PAD, bot = this.api.height - PAD;
    const wx = (fx: number): number => this.toWorld(fx, 0).x;
    const dir = this.flip ? -1 : 1;
    // Body: a dark bank of scrap behind the front.
    const x0 = wx(av.x - 200), x1 = wx(av.x + 60);
    g.fillStyle(tint(MAGNET.oil), 0.75);
    g.fillRect(Math.min(x0, x1), top, Math.abs(x1 - x0), bot - top);
    const x2 = wx(av.x - 90);
    g.fillStyle(tint(MAGNET.gun), 0.8);
    g.fillRect(Math.min(x2, x1), top, Math.abs(x1 - x2), bot - top);
    // Front: tumbling plates.
    for (let y = top, i = 0; y <= bot; y += 20, i++) {
      const bulge = Math.sin(y / 40 + t * 6) * 11 + Math.sin(y / 17 - t * 9) * 5;
      drawScrap(g, tint, wx(av.x + 62 + bulge), y, t * 5 * dir + i, 12 + (i % 3) * 3, i, 'fly', t);
      drawScrap(g, tint, wx(av.x + 40 + bulge * 0.7), y + 9, -t * 4 * dir + i * 2, 9, i + 7, 'fly', t);
    }
    // Sparks thrown ahead of the front.
    for (let i = 0; i < 14; i++) {
      const y = top + ((i * 97 + Math.floor(t * 220)) % (bot - top));
      const lead = (i * 53 + Math.floor(t * 300)) % 60;
      g.fillStyle(tint(MAGNET.visor), 0.6 * (1 - lead / 60));
      g.fillCircle(wx(av.x + 80 + lead), y, 3 - lead / 30);
    }
    // Field lines raking back through it — the whole bank is being dragged, not rolled.
    for (let i = 0; i < 6; i++) {
      const y = top + (i / 6) * (bot - top) + Math.sin(t * 3 + i) * 14;
      g.fillStyle(tint(MAGNET.neon), 0.3);
      fieldArc(g, wx(av.x - 190), y, wx(av.x + 40), y + 10, 14, 4, 12);
    }
  }

  private paintCannon(g: Phaser.GameObjects.Graphics, fx: number, fy: number, time: number): void {
    const tint = this.api.tint;
    const ox = this.api.width / 2;
    const oy = VISOR_Y + 34;
    const j = Math.sin(time / 40) * 3;
    g.lineStyle(46 + j, tint(MAGNET.cobalt), 0.35);
    g.lineBetween(ox, oy, fx, fy);
    g.lineStyle(26 + j, tint(MAGNET.neon), 0.75);
    g.lineBetween(ox, oy, fx, fy);
    g.lineStyle(10, tint(MAGNET.white), 0.95);
    g.lineBetween(ox, oy, fx, fy);
    fieldArcLayered(g, tint, ox, oy, fx, fy, 30 * Math.sin(time / 120), 4, MAGNET.visor, 0.6);
    g.fillStyle(tint(MAGNET.neon), 0.5 + 0.2 * Math.sin(time / 100));
    g.fillCircle(fx, fy, 30 + Math.sin(time / 90) * 4);
    g.fillStyle(tint(MAGNET.white), 0.85);
    g.fillCircle(fx, fy, 13);
    g.lineStyle(3, tint(MAGNET.visor), 0.8);
    for (let i = 0; i < 5; i++) {
      const a = time / 120 + (i / 5) * Math.PI * 2;
      const len = 20 + ((i * 37 + Math.floor(time / 60)) % 22);
      g.lineBetween(fx, fy, fx + Math.cos(a) * len, fy + Math.sin(a) * len);
    }
  }
}

/** A finned rocket with a flame tail, nose along `ang`. */
function drawRocket(g: Phaser.GameObjects.Graphics, tint: MagnetColorFn, x: number, y: number, ang: number, s: number, t: number): void {
  const c = Math.cos(ang), n = Math.sin(ang);
  const p = (fx: number, fy: number): Pt => ({ x: x + c * fx * s - n * fy * s, y: y + n * fx * s + c * fy * s });
  const flick = 0.75 + 0.25 * Math.sin(t * 40 + x);
  g.fillStyle(tint(0xff7a1a), 0.8);
  fillPts(g, [p(-9, -3.5), p(-9 - 14 * flick, 0), p(-9, 3.5)]);
  g.fillStyle(tint(0xffe08a), 0.9);
  fillPts(g, [p(-9, -2), p(-9 - 7 * flick, 0), p(-9, 2)]);
  g.fillStyle(tint(MAGNET.gunHi), 1);
  fillPts(g, [p(-10, -6), p(-5, -3.5), p(-5, 3.5), p(-10, 6)]);
  g.fillStyle(tint(MAGNET.steel), 1);
  fillPts(g, [p(-9, -3.5), p(6, -3.5), p(6, 3.5), p(-9, 3.5)]);
  g.fillStyle(tint(MAGNET.red), 1);
  fillPts(g, [p(6, -3.5), p(12, 0), p(6, 3.5)]);
  g.lineStyle(1, tint(MAGNET.oil), 0.9);
  strokePts(g, [p(-9, -3.5), p(6, -3.5), p(12, 0), p(6, 3.5), p(-9, 3.5)], true);
}

function segDist(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const u = len2 > 0 ? Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
  return Phaser.Math.Distance.Between(ax + dx * u, ay + dy * u, px, py);
}
