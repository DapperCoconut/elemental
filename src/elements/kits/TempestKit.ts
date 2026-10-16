import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { ProjectileRegistry, RegisteredProjectile } from '../../combat/ProjectileRegistry';
import { Sfx } from '../../audio';
import {
  TMP, TempestAvatar, TempestColorFn, TempestFx, current as paintCurrent, fallGauge, frontLane,
  gustLayered, lightning, liftShadow, swirl,
} from './TempestVisuals';

type Owner = 'player' | 'npc';
const BOTH: Owner[] = ['player', 'npc'];

// ── The height sim ───────────────────────────────────────────────────────────
/**
 * Altitude is a second axis the arena does not have, so it lives here: `z` in px above the
 * floor and `vz` in px/s, integrated every frame under one gravity. Height only ever moves the
 * *drawing* — the rig is painted `z * LIFT` above the body, with a shadow left on the floor — so
 * the physics body, the hitbox and the health bar all stay where the fighter really is. Being
 * off the floor at all is what the Flight passive reads: melee and floor hazards cannot reach
 * you, shots and blasts still can.
 */
const GRAVITY = 520;
/** A body falling freely tops out here… */
const TERMINAL = 900;
/** …and a deliberate dive goes well past it. Landing damage is read off the speed at impact. */
const DIVE_VZ = -1500;
const LIFT = 0.55;
/** px of altitude per px of launch; 640 is a peak of ~390 px and ~2.4 s in the air. */
const LAUNCH_VZ = 640;
const AIR_SPEED_MULT = 0.5;

// ── Wall Slam (passive) ──────────────────────────────────────────────────────
const WALL_DAMAGE = 12;
const WALL_CD_MS = 1000;

// ── Gale Burst (Click) ───────────────────────────────────────────────────────
const GALE_DAMAGE = 10;
const GALE_R = 72;
const GALE_SPEED = 780;
const GALE_SHOVE = 620;
const GALE_SHOVE_MS = 380;
const GALE_MAX_CHARGES = 2;
/** px walked per charge. */
const GALE_RECHARGE_DIST = 240;
/** Elevation bought by a self-hit in the air, and the bigger one off a wall or the floor. */
const GALE_BOOST = 380;
const GALE_BOOST_BIG = 620;
const GALE_NEAR_WALL = 48;
const GALE_NEAR_FLOOR = 80;

// ── Kick Blast (E) ───────────────────────────────────────────────────────────
const KICK_DAMAGE = 15;
const KICK_DIST = 440;
const KICK_MS = 320;
const KICK_HIT_R = 50;
const KICK_SHOVE = 760;
const KICK_SHOVE_MS = 420;
const KICK_DODGE = 0.5;
const KICK_DODGE_TAIL_MS = 1000;
const KICK_BOOST = 520;

// ── Summon Front (R) ─────────────────────────────────────────────────────────
const FRONT_LEN = 360;
const FRONT_HALF_W = 58;
const FRONT_PUSH = 300;
const FRONT_MAX = 2;
const FRONT_FADE_MS = 350;
/** The in-air R: how long the flight to the front takes, and what the slam is worth. */
const SLAM_MS = 420;
const SLAM_DAMAGE = 20;
const SLAM_HEIGHT_DAMAGE = 0.12;
const SLAM_HEIGHT_CAP = 60;
const SLAM_SHOVE = 520;
const SLAM_SHOVE_MS = 360;
/** The bounce back up: the peak is this much of where you started, plus a floor. */
const SLAM_BOUNCE_MULT = 1.3;
const SLAM_BOUNCE_MIN = 120;

// ── Updraft (F) ──────────────────────────────────────────────────────────────
const CURRENT_COUNT = 3;
const CURRENT_R = 44;
const CURRENT_REACH = 80;
const CURRENT_LIFE_MS = 9000;
const CURRENT_RESPAWN_MS = 900;
const CURRENT_PAD = 90;

// ── Landing ──────────────────────────────────────────────────────────────────
const LAND_DAMAGE_MIN = 6;
const LAND_DAMAGE_SPAN = 34;
const LAND_R_MIN = 70;
const LAND_R_SPAN = 70;
const LAND_SHOVE = 420;
const LAND_SHOVE_MS = 320;
/** The speed that counts as a full-tilt landing: a dive. A free fall from a launch is ~0.43. */
const LAND_SPEED_FULL = 1500;

// ── Final Forecast (Q) ───────────────────────────────────────────────────────
const FORECAST_DASH_DIST = 420;
const FORECAST_DASH_MS = 300;
const FORECAST_GRAB_R = 48;
const FORECAST_HOLD_MS = 3000;
const FORECAST_VZ = 700;
const FORECAST_DAMAGE = 20;
const FORECAST_HEIGHT_DAMAGE = 0.15;
const FORECAST_HEIGHT_CAP = 70;
/** The in-air Q: the ping-pong currents after a dive. */
const PONG_R = 150;
const PONG_SPEED = 540;
const PONG_BOUNCES = 3;
const PONG_MAX_MS = 7000;

export interface TempestArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  get enemies(): Fighter[];
  get projectileRegistry(): ProjectileRegistry;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  /** The physics world bounds — the walls the passive counts. */
  get bounds(): Phaser.Geom.Rectangle;
  /** Skins: maps a Tempest visual colour through that side's equipped skin. */
  tempestColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
}

interface GaleShot {
  owner: Owner;
  x: number; y: number; vx: number; vy: number;
  tx: number; ty: number;
  seed: number;
  reg: RegisteredProjectile | null;
}

/** A knockback this kit owns. The passive only counts walls hit under one of these. */
interface Shove {
  owner: Owner;
  victim: Fighter;
  vx: number; vy: number;
  until: number; ms: number;
}

interface Front {
  owner: Owner;
  x: number; y: number; ang: number;
  bornAt: number;
  /** 0 while live; the moment it was told to fade otherwise. */
  fadeAt: number;
  seed: number;
}

interface Current {
  x: number; y: number;
  bornAt: number; diesAt: number;
  seed: number;
}

interface Pong {
  owner: Owner;
  victim: Fighter;
  vx: number; vy: number;
  bounces: number;
  until: number;
}

interface Grab {
  victim: Fighter;
  releaseAt: number;
  /** The height read at release — the whole damage of the crash. */
  releaseZ: number;
  crashing: boolean;
}

interface Slam {
  front: Front;
  fromX: number; fromY: number; fromZ: number;
  start: number; until: number;
}

interface Side {
  aimX: number; aimY: number;
  z: number; vz: number;
  airborne: boolean;
  /** Gale Burst's two charges and the distance walked toward the next. */
  charges: number; walked: number; lastX: number; lastY: number;
  /** Kick Blast's roll and its dodge window. */
  rollUntil: number; rollVx: number; rollVy: number; rollHit: Set<Fighter>; trailAccum: number;
  dodgeUntil: number; dodgeGiven: boolean;
  /** Final Forecast's dash. */
  dashUntil: number; dashVx: number; dashVy: number;
  grab: Grab | null;
  slam: Slam | null;
  /** The in-air Q: falling at dive speed, with the currents waiting at the bottom. */
  diving: boolean;
  wallSlamAt: Map<Fighter, number>;
  /** Bot only: when it next goes looking for a current. */
  nextFlightAt: number;
  eyeWasOpen: boolean;
}

function makeSide(): Side {
  return {
    aimX: 0, aimY: 0, z: 0, vz: 0, airborne: false,
    charges: GALE_MAX_CHARGES, walked: 0, lastX: NaN, lastY: NaN,
    rollUntil: 0, rollVx: 0, rollVy: 0, rollHit: new Set(), trailAccum: 0,
    dodgeUntil: 0, dodgeGiven: false,
    dashUntil: 0, dashVx: 0, dashVy: 0,
    grab: null, slam: null, diving: false,
    wallSlamAt: new Map(),
    nextFlightAt: 2500,
    eyeWasOpen: false,
  };
}

/**
 * Tempest — a test element, reachable only from a cheat-mode save for now.
 *
 * A storm with a second axis. On the floor it is a knockback brawler: a two-charge wind burst
 * that recharges by *moving*, a roll that resets it, conveyor fronts, and a wall that does the
 * last 12 damage of every shove. Off the floor — launched by a current or by grappling someone
 * into the sky — the same five keys become a flight kit: the burst buys elevation when it hits
 * you, the roll becomes a hop, the front becomes something to slam onto and bounce off, and Q
 * becomes a dive that leaves whoever it lands on ping-ponging between the walls under the Eye
 * of the Storm. Height is the resource: every landing, slam and crash pays out by how high it
 * came from.
 *
 * Both sides are mirrored — the bot flies too. Every `cast` in `tempest.ts` is a one-line
 * delegate into the `do*` methods here, and every opportunity the bot acts on is published
 * through the side-effect-free readers at the bottom.
 */
export class TempestKit {
  private api: TempestArenaApi;
  private sides: Record<Owner, Side> = { player: makeSide(), npc: makeSide() };
  private shots: GaleShot[] = [];
  private shoves: Shove[] = [];
  private fronts: Front[] = [];
  private currents: Current[] = [];
  private respawnAt: number[] = [];
  private pongs: Pong[] = [];
  private pointerWasDown = false;
  private vizT = 0;

  private pcol: TempestColorFn;
  private ncol: TempestColorFn;
  private pfx: TempestFx;
  private nfx: TempestFx;
  private playerAvatar: TempestAvatar | null = null;
  private npcAvatar: TempestAvatar | null = null;
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;

  constructor(api: TempestArenaApi) {
    this.api = api;
    this.pcol = (base) => api.tempestColor('player', base);
    this.ncol = (base) => api.tempestColor('npc', base);
    this.pfx = new TempestFx(api.scene, this.pcol);
    this.nfx = new TempestFx(api.scene, this.ncol);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): TempestFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): TempestColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private avatar(owner: Owner): TempestAvatar | null { return owner === 'player' ? this.playerAvatar : this.npcAvatar; }
  private is(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'tempest' : this.api.npcElementId === 'tempest';
  }
  private alive(f: Fighter | null | undefined): f is Fighter { return !!f && f.active && f.hp > 0; }
  private hex(color: number): string { return `#${color.toString(16).padStart(6, '0')}`; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }

  /** Everyone this owner's wind is aimed at. */
  private foes(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  /** Which side a body belongs to, if it is one of the two fighters. */
  private ownerOf(f: Fighter): Owner | null {
    if (f === this.api.player) return 'player';
    if (f === this.api.npc) return 'npc';
    return null;
  }

  private refund(f: Fighter | null, abilityId: string): void {
    if (f?.active) f.resetCooldown(abilityId);
  }

  /** A cast that cannot happen: hand the cooldown back and say why, once, out loud. */
  private deny(owner: Owner, abilityId: string, text: string): void {
    const f = this.fighter(owner);
    this.refund(f, abilityId);
    if (owner !== 'player' || !this.alive(f)) return;
    this.api.showFloatingText(f.x, f.y - 46, text, this.hex(TMP.gust));
    Sfx.playAt('ui-denied', f.x, { volume: 0.55 });
  }

  private text(owner: Owner, x: number, y: number, t: string, color = TMP.gust): void {
    if (owner !== 'player') return;
    this.api.showFloatingText(x, y, t, this.hex(color));
  }

  /** Wall-adjacent: within `pad` of any bound. Returns the wall normal, or null. */
  private nearWall(x: number, y: number, pad: number): { nx: number; ny: number } | null {
    const b = this.api.bounds;
    if (x - b.x <= pad) return { nx: 1, ny: 0 };
    if (b.right - x <= pad) return { nx: -1, ny: 0 };
    if (y - b.y <= pad) return { nx: 0, ny: 1 };
    if (b.bottom - y <= pad) return { nx: 0, ny: -1 };
    return null;
  }

  /** The rig's drawn position: lifted by altitude, clamped so the character never leaves the screen. */
  private rigAt(owner: Owner): { x: number; y: number; lift: number } {
    const f = this.fighter(owner);
    const s = this.side(owner);
    const b = this.api.bounds;
    const lift = Math.max(0, Math.min(s.z * LIFT, f.y - (b.y + 44)));
    return { x: f.x, y: f.y - lift, lift };
  }

  /** True while something in this kit is driving the body: no conveyor, no shove on top. */
  private bodyDriven(f: Fighter): boolean {
    const o = this.ownerOf(f);
    if (o) {
      const s = this.side(o);
      if (s.rollUntil > this.now || s.dashUntil > this.now || s.slam) return true;
    }
    return this.pongs.some((p) => p.victim === f) || BOTH.some((o2) => this.sides[o2].grab?.victim === f);
  }

  /** A knockback this kit owns. Replaces any shove already on the body. */
  private shove(owner: Owner, victim: Fighter, vx: number, vy: number, ms: number): void {
    if (victim.knockbackImmune || victim.unstoppable) return;
    if (this.pongs.some((p) => p.victim === victim)) return;
    const i = this.shoves.findIndex((s) => s.victim === victim);
    if (i >= 0) this.shoves.splice(i, 1);
    this.shoves.push({ owner, victim, vx, vy, until: this.now + ms, ms });
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  reset(): void {
    this.sides = { player: makeSide(), npc: makeSide() };
    for (const s of this.shots) if (s.reg) this.api.projectileRegistry.remove(s.reg);
    this.shots = [];
    this.shoves = [];
    this.fronts = [];
    this.currents = [];
    this.respawnAt = [];
    this.pongs = [];
    this.pointerWasDown = false;
    this.vizT = 0;
    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    if (this.api.elementId !== 'tempest') return;
    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    const down = pointer.isDown;
    const clicked = down && !this.pointerWasDown;
    this.pointerWasDown = down;
    if (!this.alive(p)) return;
    const ctx = this.api.buildPlayerContext(mouseX, mouseY);

    // One burst per press: two charges held down would otherwise go in one frame.
    if (clicked) p.castAbility('tempest-gale', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) p.castAbility('tempest-kick', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) p.castAbility('tempest-front', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) p.castAbility('tempest-updraft', ctx);
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) p.castAbility('tempest-forecast', ctx);
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /** Click — a burst thrown at the cursor. In the air, one that lands on you buys elevation. */
  doGale(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'tempest-gale'); return; }
    const s = this.side(owner);
    s.aimX = tx; s.aimY = ty;
    if (s.charges <= 0) { this.deny(owner, 'tempest-gale', '💨 NO GALE — MOVE'); return; }
    s.charges -= 1;

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const dist = Math.hypot(tx - f.x, ty - f.y);
    const shot: GaleShot = {
      owner,
      x: f.x + Math.cos(ang) * Math.min(18, dist), y: f.y + Math.sin(ang) * Math.min(18, dist),
      vx: Math.cos(ang) * GALE_SPEED, vy: Math.sin(ang) * GALE_SPEED,
      tx, ty, seed: Math.random() * 999, reg: null,
    };
    const reg: RegisteredProjectile = {
      owner,
      getX: () => shot.x,
      getY: () => shot.y,
      damage: GALE_DAMAGE,
      steal: () => {
        const i = this.shots.indexOf(shot);
        if (i >= 0) this.shots.splice(i, 1);
      },
    };
    shot.reg = reg;
    this.api.projectileRegistry.add(reg);
    this.shots.push(shot);
    this.avatar(owner)?.play('punch', ang);
    // Aimed at yourself: there is no flight to wait for.
    if (dist <= 18) this.detonate(shot);
  }

  /** E — a roll that kicks whatever it meets. In the air, a hop. Either way the click is back to two. */
  doKick(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'tempest-kick'); return; }
    const s = this.side(owner);
    s.aimX = tx; s.aimY = ty;
    if (s.slam) { this.deny(owner, 'tempest-kick', 'SLAMMING'); return; }
    if (s.charges < GALE_MAX_CHARGES) this.text(owner, f.x, f.y - 56, `💨 GALE ×${GALE_MAX_CHARGES}`);
    s.charges = GALE_MAX_CHARGES;
    s.walked = 0;

    if (s.airborne) {
      s.vz = Math.max(s.vz, 0) + KICK_BOOST;
      this.fx(owner).burst(f.x, f.y + 10, 46, { boost: true });
      this.avatar(owner)?.play('raise', undefined, 420);
      this.text(owner, f.x, f.y - 76, '⬆ KICK', TMP.white);
      return;
    }
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const speed = KICK_DIST / (KICK_MS / 1000);
    s.rollUntil = this.now + KICK_MS;
    s.rollVx = Math.cos(ang) * speed;
    s.rollVy = Math.sin(ang) * speed;
    s.rollHit = new Set();
    s.trailAccum = 0;
    s.dodgeUntil = s.rollUntil + KICK_DODGE_TAIL_MS;
    if (!s.dodgeGiven) { f.dodgeChance += KICK_DODGE; s.dodgeGiven = true; }
    this.fx(owner).burst(f.x, f.y, 34);
    this.avatar(owner)?.play('dash', ang);
  }

  /** R — lay a conveyor front along the aim. In the air, drop onto the nearest one you own. */
  doFront(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'tempest-front'); return; }
    const s = this.side(owner);
    s.aimX = tx; s.aimY = ty;

    if (s.airborne) {
      if (s.slam || s.grab) { this.deny(owner, 'tempest-front', s.grab ? 'HOLDING' : 'SLAMMING'); return; }
      const fr = this.nearestFront(owner, f.x, f.y);
      if (!fr) { this.deny(owner, 'tempest-front', '🌬 NO FRONT'); return; }
      s.slam = { front: fr, fromX: f.x, fromY: f.y, fromZ: s.z, start: this.now, until: this.now + SLAM_MS };
      s.vz = 0;
      this.avatar(owner)?.play('slam', Math.atan2(fr.y - f.y, fr.x - f.x), SLAM_MS + 80);
      this.text(owner, f.x, f.y - 70, '⤵ FRONT SLAM', TMP.white);
      return;
    }

    const ang = Math.atan2(ty - f.y, tx - f.x);
    const mine = this.fronts.filter((fr) => fr.owner === owner && fr.fadeAt === 0);
    // A third front retires the oldest — they only ever fade when you try to place one too many.
    while (mine.length >= FRONT_MAX) {
      const old = mine.shift()!;
      old.fadeAt = this.now + FRONT_FADE_MS;
    }
    const x = f.x + Math.cos(ang) * 22;
    const y = f.y + Math.sin(ang) * 22;
    this.fronts.push({ owner, x, y, ang, bornAt: this.now, fadeAt: 0, seed: Math.random() * 999 });
    this.fx(owner).frontPlace(x, y, ang, FRONT_LEN, FRONT_HALF_W);
    this.avatar(owner)?.play('sweep', ang);
  }

  /** F — ride a current up. Only on the floor, and only beside one. */
  doUpdraft(owner: Owner): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'tempest-updraft'); return; }
    const s = this.side(owner);
    if (s.airborne) { this.deny(owner, 'tempest-updraft', 'ALREADY AIRBORNE'); return; }
    const c = this.nearestCurrent(f.x, f.y, CURRENT_REACH);
    if (!c) { this.deny(owner, 'tempest-updraft', '🌀 NO CURRENT'); return; }
    this.currents.splice(this.currents.indexOf(c), 1);
    this.respawnAt.push(this.now + CURRENT_RESPAWN_MS);
    this.launch(owner, LAUNCH_VZ);
    s.nextFlightAt = this.now + 6500;
    this.fx(owner).launch(c.x, c.y);
    this.avatar(owner)?.play('raise');
    this.text(owner, f.x, f.y - 70, '⬆ UPDRAFT', TMP.white);
  }

  /** Q — a dash that grapples whoever it meets into the sky. In the air, a dive. */
  doForecast(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'tempest-forecast'); return; }
    const s = this.side(owner);
    s.aimX = tx; s.aimY = ty;

    if (s.airborne) {
      if (s.slam) { this.deny(owner, 'tempest-forecast', 'SLAMMING'); return; }
      if (s.grab && !s.grab.crashing) {
        // Holding someone: the dive is the crash, early.
        s.grab.crashing = true;
        s.grab.releaseZ = s.z;
      }
      s.diving = true;
      s.vz = Math.min(s.vz, DIVE_VZ);
      this.avatar(owner)?.play('slam', Math.PI / 2, 400);
      this.text(owner, f.x, f.y - 70, '☄ DIVE', TMP.white);
      Sfx.playAt('whoosh', f.x, { rate: 0.8, volume: 0.9 });
      return;
    }
    if (s.grab) { this.deny(owner, 'tempest-forecast', 'HOLDING'); return; }
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const speed = FORECAST_DASH_DIST / (FORECAST_DASH_MS / 1000);
    s.dashUntil = this.now + FORECAST_DASH_MS;
    s.dashVx = Math.cos(ang) * speed;
    s.dashVy = Math.sin(ang) * speed;
    this.fx(owner).burst(f.x, f.y, 30);
    this.avatar(owner)?.play('dash', ang);
  }

  // ── Flight ─────────────────────────────────────────────────────────────────

  private launch(owner: Owner, vz: number): void {
    const s = this.side(owner);
    s.airborne = true;
    s.z = Math.max(s.z, 1);
    s.vz = Math.max(s.vz, 0) + vz;
    Sfx.playAt('jump', this.fighter(owner).x, { rate: 0.85, volume: 0.9 });
  }

  private updateHeights(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f)) {
        // A dead body is on the floor. Quietly: no shockwave for a corpse.
        if (s.airborne) { s.airborne = false; s.z = 0; s.vz = 0; s.diving = false; s.slam = null; }
        if (s.grab) this.releaseGrab(owner);
        continue;
      }
      if (!s.airborne) continue;
      if (s.slam) { this.updateSlamFlight(owner, s, f); continue; }

      const grab = s.grab;
      if (grab && !grab.crashing) {
        // Holding someone: gravity is mostly suspended so the pair hangs for the three seconds,
        // and the boosts the click and the kick buy still lift you higher — which is the damage.
        s.vz -= GRAVITY * 0.18 * dt;
        s.vz *= Math.pow(0.5, dt / 0.9);
        if (s.z < 160 && s.vz < 40) s.vz = 40;
        if (this.now >= grab.releaseAt) {
          grab.crashing = true;
          grab.releaseZ = s.z;
          s.vz = DIVE_VZ;
          this.avatar(owner)?.play('slam', Math.PI / 2, 400);
          this.text(owner, f.x, f.y - 70, '☄ CRASH', TMP.white);
          Sfx.playAt('whoosh', f.x, { rate: 0.75, volume: 1 });
        }
      } else {
        s.vz -= GRAVITY * dt;
        if (!s.diving && !grab?.crashing) s.vz = Math.max(s.vz, -TERMINAL);
      }
      s.z += s.vz * dt;
      if (s.z <= 0) this.land(owner, -s.vz);
    }
  }

  /** The in-air R: carried to the front's centre and driven into it. */
  private updateSlamFlight(owner: Owner, s: Side, f: Fighter): void {
    const sl = s.slam!;
    const fr = sl.front;
    const k = Phaser.Math.Clamp((this.now - sl.start) / (sl.until - sl.start), 0, 1);
    const e = k * k;
    const cx = fr.x + Math.cos(fr.ang) * FRONT_LEN / 2;
    const cy = fr.y + Math.sin(fr.ang) * FRONT_LEN / 2;
    const body = this.body(f);
    body.reset(sl.fromX + (cx - sl.fromX) * e, sl.fromY + (cy - sl.fromY) * e);
    body.setVelocity(0, 0);
    s.z = Math.max(1, sl.fromZ * (1 - e));
    s.vz = 0;
    s.trailAccum += 16;
    if (s.trailAccum >= 48) {
      s.trailAccum = 0;
      const rig = this.rigAt(owner);
      this.fx(owner).streak(rig.x, rig.y, Math.atan2(cy - sl.fromY, cx - sl.fromX), 40);
    }
    if (k < 1) return;

    // Arrived. The shockwave is the front's own rectangle.
    const hk = Phaser.Math.Clamp(sl.fromZ / 500, 0, 1);
    const dmg = SLAM_DAMAGE + Math.min(SLAM_HEIGHT_CAP, Math.round(sl.fromZ * SLAM_HEIGHT_DAMAGE));
    for (const t of this.foes(owner)) {
      if (!this.inFront(fr, t.x, t.y)) continue;
      t.takeDamage(dmg, { aoe: true });
      this.api.spawnHitFlash(t.x, t.y, TMP.white);
      this.shove(owner, t, Math.cos(fr.ang) * SLAM_SHOVE, Math.sin(fr.ang) * SLAM_SHOVE, SLAM_SHOVE_MS);
    }
    this.fx(owner).frontSlam(fr.x, fr.y, fr.ang, FRONT_LEN, FRONT_HALF_W, hk);
    this.api.scene.cameras.main.shake(120 + hk * 120, 0.003 + hk * 0.004);
    Sfx.playAt('stone-slam', cx, { rate: 1.1, volume: 0.9 });
    this.text(owner, cx, cy - 40, `🌬 SLAM ${dmg}`, TMP.white);
    const i = this.fronts.indexOf(fr);
    if (i >= 0) this.fronts.splice(i, 1);
    // And back up, higher than you started.
    const peak = sl.fromZ * SLAM_BOUNCE_MULT + SLAM_BOUNCE_MIN;
    s.vz = Math.sqrt(2 * GRAVITY * peak);
    s.z = 1;
    s.slam = null;
    s.charges = GALE_MAX_CHARGES;
  }

  private inFront(fr: Front, x: number, y: number): boolean {
    const dx = x - fr.x;
    const dy = y - fr.y;
    const u = dx * Math.cos(fr.ang) + dy * Math.sin(fr.ang);
    const v = -dx * Math.sin(fr.ang) + dy * Math.cos(fr.ang);
    return u >= -20 && u <= FRONT_LEN + 20 && Math.abs(v) <= FRONT_HALF_W + 20;
  }

  /** Back on the floor. The shockwave scales with the speed of the arrival. */
  private land(owner: Owner, speed: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.z = 0;
    s.vz = 0;
    s.airborne = false;
    const dived = s.diving;
    s.diving = false;
    const k = Phaser.Math.Clamp(speed / LAND_SPEED_FULL, 0, 1);
    const r = LAND_R_MIN + LAND_R_SPAN * k;
    const dmg = Math.round(LAND_DAMAGE_MIN + LAND_DAMAGE_SPAN * k);
    this.fx(owner).landing(f.x, f.y, r, k);
    this.api.scene.cameras.main.shake(80 + k * 200, 0.002 + k * 0.006);
    Sfx.playAt('land', f.x, { rate: 1.1 - k * 0.4, volume: 0.6 + k * 0.5 });
    this.avatar(owner)?.play('clap', undefined, 300);

    const grab = s.grab;
    for (const t of this.foes(owner)) {
      const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
      if (d > r && t !== grab?.victim) continue;
      let total = dmg;
      if (grab && t === grab.victim) {
        total += FORECAST_DAMAGE + Math.min(FORECAST_HEIGHT_CAP, Math.round(grab.releaseZ * FORECAST_HEIGHT_DAMAGE));
      }
      t.takeDamage(total, { aoe: true });
      this.api.spawnHitFlash(t.x, t.y, TMP.white);
      const a = d > 1 ? Math.atan2(t.y - f.y, t.x - f.x) : Math.random() * Math.PI * 2;
      this.shove(owner, t, Math.cos(a) * LAND_SHOVE, Math.sin(a) * LAND_SHOVE, LAND_SHOVE_MS);
      if (dived && d <= PONG_R) this.startPong(owner, t, a);
    }
    if (grab) {
      this.text(owner, f.x, f.y - 90, `☄ FORECAST ${FORECAST_DAMAGE + Math.min(FORECAST_HEIGHT_CAP, Math.round(grab.releaseZ * FORECAST_HEIGHT_DAMAGE))}`, TMP.white);
      this.releaseGrab(owner);
    }
    this.text(owner, f.x, f.y - 60, `💥 LANDING ${dmg}`);
  }

  // ── Gale Burst ─────────────────────────────────────────────────────────────

  private updateShots(delta: number): void {
    const dt = delta / 1000;
    const b = this.api.bounds;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      const left = Math.hypot(s.tx - s.x, s.ty - s.y);
      const step = GALE_SPEED * dt;
      if (left <= step + 2) {
        s.x = s.tx; s.y = s.ty;
        this.detonate(s);
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      // A wall stops it where it stands; so does a body in the way.
      if (s.x < b.x || s.x > b.right || s.y < b.y || s.y > b.bottom) {
        s.x = Phaser.Math.Clamp(s.x, b.x, b.right);
        s.y = Phaser.Math.Clamp(s.y, b.y, b.bottom);
        this.detonate(s);
        continue;
      }
      const hit = this.foes(s.owner).find((t) => Phaser.Math.Distance.Between(s.x, s.y, t.x, t.y) <= 26);
      if (hit) this.detonate(s);
    }
  }

  private detonate(shot: GaleShot): void {
    const i = this.shots.indexOf(shot);
    if (i >= 0) this.shots.splice(i, 1);
    if (shot.reg) this.api.projectileRegistry.remove(shot.reg);
    const owner = shot.owner;
    const s = this.side(owner);
    const f = this.fighter(owner);

    let boost = false;
    let big = false;
    if (this.alive(f) && s.airborne && !s.slam
        && Phaser.Math.Distance.Between(shot.x, shot.y, f.x, f.y) <= GALE_R + 8) {
      boost = true;
      big = !!this.nearWall(shot.x, shot.y, GALE_NEAR_WALL) || (s.vz < 0 && s.z < GALE_NEAR_FLOOR);
      s.vz = Math.max(s.vz, 0) + (big ? GALE_BOOST_BIG : GALE_BOOST);
      this.text(owner, f.x, f.y - 76, big ? '⬆⬆ BIG BOOST' : '⬆ BOOST', TMP.white);
    }
    this.fx(owner).burst(shot.x, shot.y, GALE_R, { boost, big });
    Sfx.playAt('gust', shot.x, { rate: big ? 0.9 : 1.2, volume: 0.8 });
    for (const t of this.foes(owner)) {
      const d = Phaser.Math.Distance.Between(shot.x, shot.y, t.x, t.y);
      if (d > GALE_R) continue;
      t.takeDamage(GALE_DAMAGE, { aoe: true });
      this.api.spawnHitFlash(t.x, t.y, TMP.white);
      const a = d > 1 ? Math.atan2(t.y - shot.y, t.x - shot.x) : Math.atan2(shot.vy, shot.vx);
      this.shove(owner, t, Math.cos(a) * GALE_SHOVE, Math.sin(a) * GALE_SHOVE, GALE_SHOVE_MS);
    }
  }

  private updateCharges(): void {
    for (const owner of BOTH) {
      if (!this.is(owner)) continue;
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const d = Number.isNaN(s.lastX) ? 0 : Math.hypot(f.x - s.lastX, f.y - s.lastY);
      s.lastX = f.x;
      s.lastY = f.y;
      if (s.charges >= GALE_MAX_CHARGES) { s.walked = 0; continue; }
      // A teleport is not a walk.
      if (d > 60) continue;
      s.walked += d;
      if (s.walked >= GALE_RECHARGE_DIST) {
        s.walked -= GALE_RECHARGE_DIST;
        s.charges += 1;
        this.text(owner, f.x, f.y - 50, '💨 +1 GALE');
        if (s.charges >= GALE_MAX_CHARGES) s.walked = 0;
      }
    }
  }

  // ── Kick Blast ─────────────────────────────────────────────────────────────

  private updateRolls(delta: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f)) { s.rollUntil = 0; continue; }
      if (s.rollUntil > this.now) {
        this.body(f).setVelocity(s.rollVx, s.rollVy);
        s.trailAccum += delta;
        if (s.trailAccum >= 40) {
          s.trailAccum = 0;
          this.fx(owner).rollTrail(f.x, f.y, Math.atan2(s.rollVy, s.rollVx));
        }
        const ang = Math.atan2(s.rollVy, s.rollVx);
        for (const t of this.foes(owner)) {
          if (s.rollHit.has(t)) continue;
          if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > KICK_HIT_R) continue;
          s.rollHit.add(t);
          t.takeDamage(KICK_DAMAGE);
          this.api.spawnHitFlash(t.x, t.y, TMP.white);
          this.shove(owner, t, Math.cos(ang) * KICK_SHOVE, Math.sin(ang) * KICK_SHOVE, KICK_SHOVE_MS);
          this.fx(owner).kickHit(t.x, t.y, ang);
          Sfx.playAt('hit-heavy', t.x, { rate: 1.1, volume: 0.8 });
          this.text(owner, t.x, t.y - 40, '🦵 KICK');
        }
      }
      // The dodge: topped back to 50% while the window runs (a dodge that fires spends 0.2 of
      // it), and taken back off the body when the window closes.
      if (s.dodgeGiven) {
        if (this.now < s.dodgeUntil) {
          if (f.dodgeChance < KICK_DODGE) f.dodgeChance = KICK_DODGE;
        } else {
          f.dodgeChance = Math.max(0, f.dodgeChance - KICK_DODGE);
          s.dodgeGiven = false;
        }
      }
    }
  }

  // ── Final Forecast ─────────────────────────────────────────────────────────

  private updateDashes(delta: number): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f)) { s.dashUntil = 0; continue; }
      if (s.dashUntil <= this.now) continue;
      this.body(f).setVelocity(s.dashVx, s.dashVy);
      s.trailAccum += delta;
      if (s.trailAccum >= 40) {
        s.trailAccum = 0;
        this.fx(owner).streak(f.x, f.y, Math.atan2(s.dashVy, s.dashVx), 44);
      }
      const victim = this.foes(owner).find((t) => Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) <= FORECAST_GRAB_R);
      if (!victim) continue;
      s.dashUntil = 0;
      this.body(f).setVelocity(0, 0);
      if (victim.knockbackImmune || victim.unstoppable) {
        this.text(owner, victim.x, victim.y - 40, 'UNMOVABLE', TMP.gust);
        continue;
      }
      // Caught. Up we both go.
      this.endPong(victim);
      s.grab = { victim, releaseAt: this.now + FORECAST_HOLD_MS, releaseZ: 0, crashing: false };
      this.launch(owner, FORECAST_VZ);
      this.fx(owner).grabSnap(victim.x, victim.y);
      Sfx.playAt('grapple', f.x, { rate: 0.9, volume: 1 });
      this.avatar(owner)?.setHold('reach', Math.atan2(victim.y - f.y, victim.x - f.x));
      this.text(owner, f.x, f.y - 70, '🌪 GRAPPLED', TMP.white);
      this.api.spawnHitFlash(victim.x, victim.y, TMP.white);
    }
  }

  /** The held body rides along at arm's length and cannot move. */
  private updateGrabs(): void {
    for (const owner of BOTH) {
      const s = this.side(owner);
      const g = s.grab;
      if (!g) continue;
      const f = this.fighter(owner);
      if (!this.alive(f) || !this.alive(g.victim)) { this.releaseGrab(owner); continue; }
      const ang = Math.atan2(s.aimY - f.y, s.aimX - f.x);
      const vb = this.body(g.victim);
      const fb = this.body(f);
      vb.reset(f.x + Math.cos(ang) * 30, f.y + Math.sin(ang) * 30);
      vb.setVelocity(fb.velocity.x, fb.velocity.y);
      this.avatar(owner)?.setHold('reach', ang);
    }
  }

  private releaseGrab(owner: Owner): void {
    const s = this.side(owner);
    if (!s.grab) return;
    s.grab = null;
    this.avatar(owner)?.setHold(null);
  }

  // ── Shoves and the wall ────────────────────────────────────────────────────

  private updateShoves(): void {
    for (let i = this.shoves.length - 1; i >= 0; i--) {
      const sh = this.shoves[i];
      const v = sh.victim;
      if (!this.alive(v) || this.now >= sh.until || v.knockbackImmune || v.unstoppable) {
        this.shoves.splice(i, 1);
        continue;
      }
      const k = (sh.until - this.now) / sh.ms;
      const ease = 0.35 + 0.65 * k;
      this.body(v).setVelocity(sh.vx * ease, sh.vy * ease);
      const wall = this.wallContact(v, sh.vx, sh.vy);
      if (wall) {
        this.shoves.splice(i, 1);
        this.wallSlam(sh.owner, v, wall.nx, wall.ny, false);
      }
    }
  }

  /** The wall this body is pressed into along its velocity, or null. */
  private wallContact(f: Fighter, vx: number, vy: number): { nx: number; ny: number } | null {
    const b = this.api.bounds;
    const body = this.body(f);
    const eps = 2.5;
    if (vx < -60 && (body.blocked.left || body.left <= b.x + eps)) return { nx: 1, ny: 0 };
    if (vx > 60 && (body.blocked.right || body.right >= b.right - eps)) return { nx: -1, ny: 0 };
    if (vy < -60 && (body.blocked.up || body.top <= b.y + eps)) return { nx: 0, ny: 1 };
    if (vy > 60 && (body.blocked.down || body.bottom >= b.bottom - eps)) return { nx: 0, ny: -1 };
    return null;
  }

  /** The passive: a body you shoved into a wall takes 12. Once a second per body. */
  private wallSlam(owner: Owner, victim: Fighter, nx: number, ny: number, electric: boolean): void {
    const s = this.side(owner);
    const last = s.wallSlamAt.get(victim) ?? -Infinity;
    const x = victim.x - nx * 20;
    const y = victim.y - ny * 20;
    this.fx(owner).wallSlam(x, y, nx, ny, { electric });
    if (this.now - last < WALL_CD_MS) return;
    s.wallSlamAt.set(victim, this.now);
    victim.takeDamage(WALL_DAMAGE);
    this.api.spawnHitFlash(victim.x, victim.y, TMP.white);
    Sfx.playAt('stone-slam', victim.x, { rate: 1.4, volume: 0.7 });
    this.text(owner, victim.x, victim.y - 44, `🧱 WALL SLAM ${WALL_DAMAGE}`, TMP.white);
  }

  // ── The Eye of the Storm ───────────────────────────────────────────────────

  private startPong(owner: Owner, victim: Fighter, ang: number): void {
    if (victim.knockbackImmune || victim.unstoppable) return;
    this.endPong(victim);
    const i = this.shoves.findIndex((s) => s.victim === victim);
    if (i >= 0) this.shoves.splice(i, 1);
    const first = !this.pongs.some((p) => p.owner === owner);
    this.pongs.push({
      owner, victim,
      vx: Math.cos(ang) * PONG_SPEED, vy: Math.sin(ang) * PONG_SPEED,
      bounces: 0, until: this.now + PONG_MAX_MS,
    });
    const f = this.fighter(owner);
    if (first && this.alive(f)) {
      const rig = this.rigAt(owner);
      this.fx(owner).eyeOpen(rig.x, rig.y);
      Sfx.playAt('thunder', f.x, { rate: 1.2, volume: 0.9 });
      this.text(owner, f.x, f.y - 92, '👁 EYE OF THE STORM', TMP.bolt);
    }
    this.text(owner, victim.x, victim.y - 56, '🏓 CURRENTS');
  }

  private endPong(victim: Fighter): void {
    const i = this.pongs.findIndex((p) => p.victim === victim);
    if (i >= 0) this.pongs.splice(i, 1);
  }

  private updatePongs(): void {
    const b = this.api.bounds;
    for (let i = this.pongs.length - 1; i >= 0; i--) {
      const p = this.pongs[i];
      const v = p.victim;
      if (!this.alive(v) || this.now >= p.until || v.knockbackImmune || v.unstoppable) {
        this.pongs.splice(i, 1);
        continue;
      }
      const body = this.body(v);
      let nx = 0;
      let ny = 0;
      if (p.vx < 0 && body.left <= b.x + 1.5) { p.vx = -p.vx; nx = 1; }
      else if (p.vx > 0 && body.right >= b.right - 1.5) { p.vx = -p.vx; nx = -1; }
      if (p.vy < 0 && body.top <= b.y + 1.5) { p.vy = -p.vy; ny = 1; }
      else if (p.vy > 0 && body.bottom >= b.bottom - 1.5) { p.vy = -p.vy; ny = -1; }
      if (nx !== 0 || ny !== 0) {
        p.bounces += 1;
        body.reset(v.x + nx * 3, v.y + ny * 3);
        this.wallSlam(p.owner, v, nx, ny, true);
        if (p.bounces >= PONG_BOUNCES) {
          this.pongs.splice(i, 1);
          this.shove(p.owner, v, p.vx * 0.4, p.vy * 0.4, 200);
          this.text(p.owner, v.x, v.y - 60, 'CURRENTS END', TMP.gust);
          continue;
        }
      }
      body.setVelocity(p.vx, p.vy);
    }
  }

  // ── Fronts ─────────────────────────────────────────────────────────────────

  private nearestFront(owner: Owner, x: number, y: number): Front | null {
    let best: Front | null = null;
    let bd = Infinity;
    for (const fr of this.fronts) {
      if (fr.owner !== owner || fr.fadeAt !== 0) continue;
      const cx = fr.x + Math.cos(fr.ang) * FRONT_LEN / 2;
      const cy = fr.y + Math.sin(fr.ang) * FRONT_LEN / 2;
      const d = Phaser.Math.Distance.Between(x, y, cx, cy);
      if (d < bd) { bd = d; best = fr; }
    }
    return best;
  }

  private updateFronts(): void {
    for (let i = this.fronts.length - 1; i >= 0; i--) {
      const fr = this.fronts[i];
      if (fr.fadeAt !== 0 && this.now >= fr.fadeAt) this.fronts.splice(i, 1);
    }
    // Every body on the floor, inside a live lane, is carried. Yours too.
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!this.alive(f) || this.side(owner).airborne || this.bodyDriven(f)) continue;
      const body = this.body(f);
      for (const fr of this.fronts) {
        if (fr.fadeAt !== 0 || !this.inFront(fr, f.x, f.y)) continue;
        body.setVelocity(body.velocity.x + Math.cos(fr.ang) * FRONT_PUSH, body.velocity.y + Math.sin(fr.ang) * FRONT_PUSH);
      }
    }
  }

  // ── Currents ───────────────────────────────────────────────────────────────

  private nearestCurrent(x: number, y: number, within: number): Current | null {
    let best: Current | null = null;
    let bd = within;
    for (const c of this.currents) {
      const d = Phaser.Math.Distance.Between(x, y, c.x, c.y);
      if (d <= bd) { bd = d; best = c; }
    }
    return best;
  }

  private updateCurrents(): void {
    const anyTempest = this.is('player') || this.is('npc');
    if (!anyTempest) { this.currents = []; this.respawnAt = []; return; }
    for (let i = this.currents.length - 1; i >= 0; i--) {
      if (this.now >= this.currents[i].diesAt) {
        this.currents.splice(i, 1);
        this.respawnAt.push(this.now + CURRENT_RESPAWN_MS);
      }
    }
    while (this.currents.length + this.respawnAt.length < CURRENT_COUNT) this.respawnAt.push(this.now + 300);
    for (let i = this.respawnAt.length - 1; i >= 0; i--) {
      if (this.now < this.respawnAt[i]) continue;
      this.respawnAt.splice(i, 1);
      this.spawnCurrent();
    }
  }

  private spawnCurrent(): void {
    const b = this.api.bounds;
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 12; tries++) {
      x = Phaser.Math.FloatBetween(b.x + CURRENT_PAD, b.right - CURRENT_PAD);
      y = Phaser.Math.FloatBetween(b.y + CURRENT_PAD, b.bottom - CURRENT_PAD);
      const clear = this.currents.every((c) => Phaser.Math.Distance.Between(x, y, c.x, c.y) > 150);
      if (clear) break;
    }
    this.currents.push({ x, y, bornAt: this.now, diesAt: this.now + CURRENT_LIFE_MS, seed: Math.random() * 999 });
  }

  // ── Per frame ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    void time;
    const playerIs = this.is('player');
    const npcIs = this.is('npc');
    if (!playerIs && !npcIs && !this.hasLiveState()) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    this.updateCharges();
    this.updateCurrents();
    this.updateShots(delta);
    this.updateRolls(delta);
    this.updateDashes(delta);
    this.updateHeights(delta);
    this.updateGrabs();
    this.updateShoves();
    this.updatePongs();
    this.updateFronts();
    this.updateFlags();
    this.updateAvatars(delta, playerIs, npcIs);

    this.paintGround();
    this.paintAir();
    this.pushStatuses(playerIs);
  }

  private hasLiveState(): boolean {
    return this.shots.length > 0 || this.shoves.length > 0 || this.pongs.length > 0
      || BOTH.some((o) => this.sides[o].airborne || this.sides[o].grab !== null || this.sides[o].dodgeGiven);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5. Fronts and currents are floor; shots and gauges ride over the bodies.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
  }

  /** The Flight passive is two flags on the body, written here every frame. */
  private updateFlags(): void {
    for (const owner of BOTH) {
      const f = this.fighter(owner);
      if (!f || !f.active) continue;
      const s = this.side(owner);
      if (s.airborne) {
        f.airborne = true;
        f.levitating = true;
      } else if (f.airborne) {
        f.airborne = false;
        f.levitating = false;
      }
    }
  }

  private updateAvatars(delta: number, playerIs: boolean, npcIs: boolean): void {
    for (const owner of BOTH) {
      const is = owner === 'player' ? playerIs : npcIs;
      const f = this.fighter(owner);
      let av = this.avatar(owner);
      if (!is || !f || !f.active) {
        if (av) { av.destroy(); if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null; }
        continue;
      }
      if (!av) {
        av = new TempestAvatar(this.api.scene, this.col(owner));
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }
      const s = this.sides[owner];
      const aim = owner === 'player'
        ? { x: s.aimX, y: s.aimY }
        : (this.foes(owner)[0] ?? { x: s.aimX, y: s.aimY });
      av.setFacing(Math.atan2(aim.y - f.y, aim.x - f.x));
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      av.setAir(s.airborne);
      av.setFall(s.airborne && s.vz < 0 ? Math.min(1, -s.vz / LAND_SPEED_FULL) : 0);
      const eye = this.pongs.some((p) => p.owner === owner);
      av.setEye(eye);
      s.eyeWasOpen = eye;
      // Arms out for balance in the air; the grapple's reach is set by `updateGrabs` each frame.
      if (!s.grab) av.setHold(s.airborne && !s.slam ? 'ride' : null);
      av.setIntensity(eye ? 1.3 : 1);
      const rig = this.rigAt(owner);
      av.update(delta, rig.x, rig.y, f.alpha);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;

    for (const c of this.currents) {
      const life = Phaser.Math.Clamp((c.diesAt - this.now) / 1200, 0, 1);
      const born = Phaser.Math.Clamp((this.now - c.bornAt) / 400, 0, 1);
      paintCurrent(g, this.pcol, c.x, c.y, CURRENT_R * born, 0.5 + life * 0.5, { t, seed: c.seed, life });
    }
    for (const fr of this.fronts) {
      const fade = fr.fadeAt === 0 ? 1 : Phaser.Math.Clamp((fr.fadeAt - this.now) / FRONT_FADE_MS, 0, 1);
      const born = Phaser.Math.Clamp((this.now - fr.bornAt) / 360, 0, 1);
      frontLane(g, this.col(fr.owner), fr.x, fr.y, fr.ang, FRONT_LEN * born, FRONT_HALF_W, fade, { t, seed: fr.seed });
    }
    // Shadows under every lifted body: the flier's own, and anyone it is holding up with it.
    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f) || !s.airborne) continue;
      const rig = this.rigAt(owner);
      liftShadow(g, this.col(owner), f.x, f.y, rig.lift, f.alpha);
      if (s.grab && this.alive(s.grab.victim)) {
        const v = s.grab.victim;
        liftShadow(g, this.col(owner), v.x, v.y, rig.lift, v.alpha);
      }
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();
    const t = this.vizT;

    for (const s of this.shots) {
      const ang = Math.atan2(s.vy, s.vx);
      gustLayered(g, this.col(s.owner), s.x - Math.cos(ang) * 30, s.y - Math.sin(ang) * 30, ang, 46, 7, 0.95,
        { phase: t * 10, seed: s.seed, curl: 0.6 });
      g.fillStyle(this.col(s.owner)(TMP.white), 0.9);
      g.fillCircle(s.x, s.y, 5);
      g.fillStyle(this.col(s.owner)(TMP.sky), 0.35);
      g.fillCircle(s.x, s.y, 9);
      // The point it will go off at: a faint ring at the cursor, so the player can see the fuse.
      g.lineStyle(1.2, this.col(s.owner)(TMP.gust), 0.3);
      g.strokeCircle(s.tx, s.ty, GALE_R * 0.5);
    }

    for (const owner of BOTH) {
      const s = this.side(owner);
      const f = this.fighter(owner);
      if (!this.alive(f) || !s.airborne) continue;
      const rig = this.rigAt(owner);
      // The acceleration bar, to the right of the character.
      const speedK = s.vz < 0 ? Math.min(1, -s.vz / LAND_SPEED_FULL) : 0;
      const heightK = Math.min(1, s.z / 520);
      fallGauge(g, this.col(owner), rig.x + 42, rig.y, speedK, heightK, 0.95);
      // Rising air under a body that is going up.
      if (s.vz > 60) {
        swirl(g, this.col(owner)(TMP.white), rig.x, rig.y + 26, 22, 0.5, { arms: 3, turns: 0.8, phase: -t * 8, squash: 0.5 });
      }
      // The grapple: a cord of wind from the hand to the held body, lit while the hold lasts.
      const gr = s.grab;
      if (gr && this.alive(gr.victim)) {
        const v = gr.victim;
        const hold = Phaser.Math.Clamp((gr.releaseAt - this.now) / FORECAST_HOLD_MS, 0, 1);
        g.lineStyle(3, this.col(owner)(TMP.gust), 0.5);
        g.lineBetween(rig.x, rig.y, v.x, v.y - rig.lift * 0.4);
        swirl(g, this.col(owner)(TMP.white), v.x, v.y - rig.lift * 0.4, 30, 0.7, { arms: 3, turns: 1, phase: -t * 7, squash: 0.65 });
        if (!gr.crashing) {
          // The three-second fuse as an arc around the pair.
          g.lineStyle(2.5, this.col(owner)(TMP.white), 0.8);
          g.beginPath();
          g.arc(rig.x, rig.y - 34, 16, -Math.PI / 2, -Math.PI / 2 + hold * Math.PI * 2);
          g.strokePath();
        }
      }
    }

    // Ping-pong victims trail wind and carry a crackle; their bounce count rides over them.
    for (const p of this.pongs) {
      const v = p.victim;
      if (!this.alive(v)) continue;
      const ang = Math.atan2(p.vy, p.vx);
      gustLayered(g, this.col(p.owner), v.x - Math.cos(ang) * 28, v.y - Math.sin(ang) * 28, ang + Math.PI, 40, 6, 0.8,
        { phase: t * 9, seed: p.bounces, hot: 1 });
      const n = Math.floor(t * 14);
      for (let i = 0; i < 2; i++) {
        const a = ((n + i * 7) % 12) / 12 * Math.PI * 2;
        lightning(g, this.col(p.owner)(TMP.bolt), v.x, v.y, v.x + Math.cos(a) * 30, v.y + Math.sin(a) * 30, 5, 1.4, 0.8, n + i);
      }
      for (let i = 0; i < PONG_BOUNCES; i++) {
        g.fillStyle(this.col(p.owner)(i < p.bounces ? TMP.bolt : TMP.slate), 0.9);
        g.fillCircle(v.x - 10 + i * 10, v.y - 38, 3.2);
      }
    }
  }

  private pushStatuses(playerIs: boolean): void {
    const set = this.api.setStatusIndicator.bind(this.api);
    const s = this.sides.player;
    const p = this.api.player;
    set('tempest-air', playerIs && s.airborne ? {
      name: 'Airborne', emoji: '🪁', color: TMP.sky,
      description: 'Off the floor. Melee swings and floor hazards cannot reach you; shots and blasts still can. You drift at half speed, and the landing hits harder the faster you come down.',
      count: Math.round(s.z), suffix: 'px',
    } : null);
    set('tempest-gale', playerIs && s.charges < GALE_MAX_CHARGES ? {
      name: 'Gale Burst', emoji: '💨', color: TMP.gust,
      description: `Charges held. Walk ${GALE_RECHARGE_DIST}px for the next one; Kick Blast refills both.`,
      count: s.charges,
    } : null);
    set('tempest-kick', playerIs && s.dodgeGiven && this.now < s.dodgeUntil ? {
      name: 'Kick Blast', emoji: '🦵', color: TMP.white,
      description: '50% chance to dodge every hit for the roll and the second after it.',
      until: s.dodgeUntil,
    } : null);
    set('tempest-grab', playerIs && s.grab ? {
      name: 'Final Forecast', emoji: '🌪️', color: TMP.sky,
      description: 'Holding someone in the sky. In three seconds you both come down, and the fall is the damage: 20 plus 0.15 per px of height, up to 70.',
      until: s.grab.releaseAt,
    } : null);
    const myPongs = this.pongs.filter((q) => q.owner === 'player');
    set('tempest-eye', playerIs && myPongs.length > 0 ? {
      name: 'Eye of the Storm', emoji: '👁️', color: TMP.bolt,
      description: 'Your dive left them bouncing between the walls. Every wall they hit is a Wall Slam for 12; the currents end on the third.',
      count: PONG_BOUNCES - Math.min(...myPongs.map((q) => q.bounces)),
    } : null);
    // The player on the receiving end.
    const held = BOTH.some((o) => this.sides[o].grab?.victim === p);
    set('tempest-held', held ? {
      name: 'Grappled', emoji: '🌪️', color: TMP.sky,
      description: 'A Tempest has you in the sky. You cannot move until you both come down.',
      priority: 30,
    } : null);
    const ponged = this.pongs.find((q) => q.victim === p);
    set('tempest-pong', ponged ? {
      name: 'Storm Currents', emoji: '🏓', color: TMP.bolt,
      description: 'Bounced between the walls. Each wall is 12 damage; it ends on the third.',
      count: PONG_BOUNCES - ponged.bounces,
      priority: 30,
    } : null);
  }

  // ── Readers for ArenaScene ─────────────────────────────────────────────────

  /** Half speed in the air — the drift the user picked over free flight. */
  getPlayerSpeedMult(): number { return this.sides.player.airborne ? AIR_SPEED_MULT : 1; }
  getNpcSpeedMult(): number { return this.sides.npc.airborne ? AIR_SPEED_MULT : 1; }

  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    const s = this.sides.player;
    if (abilityId === 'tempest-gale') {
      // Charges, not a cooldown: the card drains as they are spent and fills as you walk.
      if (s.charges >= GALE_MAX_CHARGES) return 0;
      return Phaser.Math.Clamp(1 - (s.charges + s.walked / GALE_RECHARGE_DIST) / GALE_MAX_CHARGES, 0, 1);
    }
    if (abilityId === 'tempest-forecast' && s.grab && !s.grab.crashing) {
      return Phaser.Math.Clamp((s.grab.releaseAt - time) / FORECAST_HOLD_MS, 0, 1);
    }
    if (abilityId === 'tempest-updraft' && s.airborne) return 1;
    if (abilityId === 'tempest-front' && s.airborne && !this.nearestFront('player', p.x, p.y)) return 1;
    return p.getCooldownRatio(abilityId);
  }

  // ── Readers for the bot (side-effect-free) ─────────────────────────────────

  isAirborne(owner: Owner): boolean { return this.sides[owner].airborne; }
  galeCharges(owner: Owner): number { return this.sides[owner].charges; }
  frontCount(owner: Owner): number { return this.fronts.filter((f) => f.owner === owner && f.fadeAt === 0).length; }
  isGrabbing(owner: Owner): boolean { return this.sides[owner].grab !== null; }
  eyeLive(owner: Owner): boolean { return this.pongs.some((p) => p.owner === owner); }

  /** Airborne, free, with a front of its own to drop onto. */
  canFrontSlam(owner: Owner): boolean {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    return s.airborne && !s.slam && !s.grab && this.alive(f) && this.nearestFront(owner, f.x, f.y) !== null;
  }

  /** Falling and close to the floor: a burst on itself right now is the big boost. */
  landingSoon(owner: Owner): boolean {
    const s = this.sides[owner];
    return s.airborne && !s.slam && !s.grab?.crashing && !s.diving && s.vz < 0 && s.z < GALE_NEAR_FLOOR;
  }

  /** The current the bot should walk to, when it is time to fly. Null means stay in the fight. */
  currentSeek(owner: Owner): { x: number; y: number } | null {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f) || s.airborne || s.grab || s.rollUntil > this.now || this.now < s.nextFlightAt) return null;
    if (this.pongs.some((p) => p.victim === f)) return null;
    const c = this.nearestCurrent(f.x, f.y, 480);
    return c ? { x: c.x, y: c.y } : null;
  }

  /** A foe standing close enough to a wall that a burst on them is also a Wall Slam. */
  wallShot(owner: Owner): { x: number; y: number } | null {
    const s = this.sides[owner];
    const f = this.fighter(owner);
    if (!this.alive(f) || s.charges <= 0) return null;
    for (const t of this.foes(owner)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y) > 420) continue;
      const w = this.nearWall(t.x, t.y, 90);
      if (!w) continue;
      // Aim a little on the near side of them, so the burst throws them *into* the wall.
      return { x: t.x + w.nx * 18, y: t.y + w.ny * 18 };
    }
    return null;
  }
}
