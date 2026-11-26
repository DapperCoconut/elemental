import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { SUB, SubColorFn, SubterfugeFx } from './SubterfugeVisuals';
import {
  RIDE_SIZE, RideKind, drawRide, drawRideHp, drawRideTop, drawShell, drawSpaceHint,
} from './SubterfugeRideVisuals';

// Subterfuge Mastery — Hijack: the stolen vehicles.
//
// One ride per side. A ride is plain data, simulated here and painted per frame; the driver is
// the fighter itself, whose body this module steers by velocity while it is behind the wheel.
// The kit owns the money, the key and the recruits — this file only knows how a car behaves.

type Owner = 'player' | 'npc';
type Body = Phaser.Physics.Arcade.Body;

export interface RideSpec {
  /** Money it costs, which is also its charge tier (1–4). */
  tier: number;
  hp: number;
  /** Top speed, px/s. */
  top: number;
  /** Engine pull, px/s². */
  accel: number;
  /** Steering lock at speed, rad/s. */
  turn: number;
  /** How hard the tyres kill sideways slide, 1/s — low is drifty. */
  grip: number;
  /** Recruits it carries. */
  seats: number;
  /** Chance a hit on the rider simply misses. */
  dodge: number;
  /** Contact radius for ramming and for stopping bullets. */
  radius: number;
}

export const RIDE_SPECS: Record<RideKind, RideSpec> = {
  car:    { tier: 1, hp: 75,  top: 330, accel: 430, turn: 2.7, grip: 5.5, seats: 1, dodge: 0,    radius: 30 },
  bike:   { tier: 2, hp: 50,  top: 540, accel: 760, turn: 3.5, grip: 7.5, seats: 0, dodge: 0.35, radius: 20 },
  sports: { tier: 3, hp: 150, top: 470, accel: 640, turn: 3.4, grip: 9,   seats: 2, dodge: 0,    radius: 32 },
  tank:   { tier: 4, hp: 250, top: 105, accel: 130, turn: 0.95, grip: 22, seats: 2, dodge: 0,    radius: 40 },
};

/** Charge tier → vehicle. */
export const RIDE_BY_TIER: RideKind[] = ['car', 'bike', 'sports', 'tank'];

/** Where a passenger sits, in the ride's own frame (x forward, y right). */
const SEATS: Record<RideKind, Array<{ x: number; y: number }>> = {
  car: [{ x: -16, y: 0 }],
  bike: [],
  sports: [{ x: -14, y: -9 }, { x: -14, y: 9 }],
  tank: [{ x: -26, y: -15 }, { x: -26, y: 15 }],
};

/** How far past the bodywork the door can be reached from. */
const ENTER_REACH = 44;
const REVERSE_FRAC = 0.45;
const ROLL_DRAG = 0.55;            // 1/s, always on
const BRAKE_DRAG = 2.4;            // 1/s, coasting with no throttle
const WALL_BOUNCE = 0.3;

const RAM_MIN_SPEED = 130;
const RAM_BASE_DMG = 6;
const RAM_SPEED_DMG = 16;          // more at the reference speed below
const RAM_REF_SPEED = 500;
const RAM_TANK_DMG = 22;
const RAM_CD_MS = 750;
const RAM_KNOCK = 520;
const RAM_KNOCK_MS = 200;

const BOOM_RADIUS = 115;
const BOOM_DMG = 25;

const SHELL_SPEED = 760;
const SHELL_RADIUS = 96;
const SHELL_DMG = 35;
const SHELL_RELOAD_MS = 2500;

export interface Ride {
  owner: Owner;
  kind: RideKind;
  x: number;
  y: number;
  heading: number;
  vx: number;
  vy: number;
  hp: number;
  ridden: boolean;
  steer: number;
  turret: number;
  firedAt: number;
  nextShellAt: number;
  ramReadyAt: Map<Fighter, number>;
  lastX: number;
  lastY: number;
  smokeAccum: number;
}

interface Shell {
  owner: Owner;
  x: number;
  y: number;
  destX: number;
  destY: number;
  angle: number;
}

export interface RideHost {
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly width: number;
  readonly height: number;
  fighter(owner: Owner): Fighter;
  foes(owner: Owner): Fighter[];
  col(owner: Owner): SubColorFn;
  fx(owner: Owner): SubterfugeFx;
  /** Player steering: x = right minus left, y = back minus forward (so W is -1). */
  moveAxis(): { x: number; y: number };
  pointer(): { x: number; y: number };
  dealAoe(owner: Owner, x: number, y: number, radius: number, damage: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  knock(f: Fighter, vx: number, vy: number, ms: number): void;
  /** False for an online replica, whose owner's machine decides what its ride has taken. */
  authoritative(owner: Owner): boolean;
  /** The ride is gone or was swapped: whoever was sitting in it is on foot again. */
  onRideGone(owner: Owner): void;
  /** The local player's ride was destroyed (online: tell the peer). */
  onPlayerRideDestroyed(): void;
  /** Re-arm whatever damage absorber the kit had on this fighter before it got in. */
  restoreAbsorber(owner: Owner): void;
}

export class SubterfugeRides {
  private rides: Record<Owner, Ride | null> = { player: null, npc: null };
  private shells: Shell[] = [];
  private absorbers: Record<Owner, ((amount: number) => boolean) | null> = { player: null, npc: null };

  constructor(private host: RideHost) {}

  reset(): void {
    for (const owner of ['player', 'npc'] as const) {
      if (this.rides[owner]?.ridden) this.dismount(owner, true);
      this.rides[owner] = null;
    }
    this.shells = [];
  }

  get(owner: Owner): Ride | null { return this.rides[owner]; }
  isRiding(owner: Owner): boolean { return !!this.rides[owner]?.ridden; }
  hasAny(): boolean { return !!this.rides.player || !!this.rides.npc || this.shells.length > 0; }

  /** Standing close enough to a parked ride of your own to climb in. */
  canEnter(owner: Owner): boolean {
    const r = this.rides[owner];
    if (!r || r.ridden) return false;
    const f = this.host.fighter(owner);
    return Phaser.Math.Distance.Between(f.x, f.y, r.x, r.y) <= RIDE_SPECS[r.kind].radius + ENTER_REACH;
  }

  /** Is (x, y) beside this side's ride, near enough for a new hire to be waved straight in? */
  near(owner: Owner, x: number, y: number, range: number): boolean {
    const r = this.rides[owner];
    return !!r && Phaser.Math.Distance.Between(x, y, r.x, r.y) <= range;
  }

  seatCount(owner: Owner): number {
    const r = this.rides[owner];
    return r ? RIDE_SPECS[r.kind].seats : 0;
  }

  /** World position of a seat, or null when the ride (or the seat) is gone. */
  seatPos(owner: Owner, seat: number): { x: number; y: number } | null {
    const r = this.rides[owner];
    const s = r ? SEATS[r.kind][seat] : undefined;
    if (!r || !s) return null;
    const c = Math.cos(r.heading), sn = Math.sin(r.heading);
    return { x: r.x + s.x * c - s.y * sn, y: r.y + s.x * sn + s.y * c };
  }

  /** Drop a fresh ride beside its owner, replacing any they already had. */
  spawn(owner: Owner, kind: RideKind, x: number, y: number, heading: number): void {
    const old = this.rides[owner];
    if (old) {
      if (old.ridden) this.dismount(owner, true);
      this.host.fx(owner).smoke(old.x, old.y, 6, { speed: 60, size: 8, life: 600, depth: 8 });
      this.host.onRideGone(owner);
    }
    const pad = RIDE_SPECS[kind].radius;
    const px = Phaser.Math.Clamp(x, pad, this.host.width - pad);
    const py = Phaser.Math.Clamp(y, pad, this.host.height - pad);
    this.rides[owner] = {
      owner, kind, x: px, y: py, heading, vx: 0, vy: 0,
      hp: RIDE_SPECS[kind].hp, ridden: false, steer: 0,
      turret: heading, firedAt: -99999, nextShellAt: 0,
      ramReadyAt: new Map(), lastX: px, lastY: py, smokeAccum: 0,
    };
    // It was not there, and then it was: tyre smoke and a few notes for whoever was paid off.
    const fx = this.host.fx(owner);
    fx.smoke(px, py, 8, { speed: 90, size: 9, life: 620, depth: 8 });
    fx.cash(px, py, 3 + RIDE_SPECS[kind].tier * 2, { speed: 150, size: 13, life: 700, depth: 11, seal: SUB.gold });
  }

  /** Space: in if parked and close, out if driving. Returns whether anything happened. */
  toggle(owner: Owner): boolean {
    const r = this.rides[owner];
    if (!r) return false;
    if (r.ridden) { this.dismount(owner, false); return true; }
    if (!this.canEnter(owner)) return false;
    this.mount(owner);
    return true;
  }

  mount(owner: Owner): void {
    const r = this.rides[owner];
    if (!r || r.ridden) return;
    const f = this.host.fighter(owner);
    r.ridden = true;
    f.setPosition(r.x, r.y);
    (f.body as Body | null)?.reset(r.x, r.y);
    if (this.host.authoritative(owner)) {
      const absorb = (amount: number): boolean => this._riderHit(owner, amount);
      this.absorbers[owner] = absorb;
      f.damageAbsorber = absorb;
    }
  }

  dismount(owner: Owner, silent: boolean): void {
    const r = this.rides[owner];
    if (!r || !r.ridden) return;
    r.ridden = false;
    r.vx = 0; r.vy = 0;
    const f = this.host.fighter(owner);
    if (this.absorbers[owner] && f.damageAbsorber === this.absorbers[owner]) f.damageAbsorber = null;
    this.absorbers[owner] = null;
    this.host.restoreAbsorber(owner);
    if (silent || !f.active) return;
    // Step out of the driver's door, on whichever side has room.
    const side = r.heading + Math.PI / 2;
    const reach = RIDE_SIZE[r.kind].wid / 2 + 24;
    let ox = r.x + Math.cos(side) * reach, oy = r.y + Math.sin(side) * reach;
    if (ox < 24 || ox > this.host.width - 24 || oy < 24 || oy > this.host.height - 24) {
      ox = r.x - Math.cos(side) * reach; oy = r.y - Math.sin(side) * reach;
    }
    ox = Phaser.Math.Clamp(ox, 24, this.host.width - 24);
    oy = Phaser.Math.Clamp(oy, 24, this.host.height - 24);
    f.setPosition(ox, oy);
    (f.body as Body | null)?.reset(ox, oy);
  }

  /** The tank's gun. Returns whether a shell left the barrel. */
  fireCannon(owner: Owner, tx: number, ty: number, time: number): boolean {
    const r = this.rides[owner];
    if (!r || r.kind !== 'tank' || !r.ridden || time < r.nextShellAt) return false;
    r.nextShellAt = time + SHELL_RELOAD_MS;
    r.firedAt = time;
    const angle = Math.atan2(ty - r.y, tx - r.x);
    r.turret = angle;
    const mx = r.x + Math.cos(angle) * 58, my = r.y + Math.sin(angle) * 58;
    this.shells.push({ owner, x: mx, y: my, destX: tx, destY: ty, angle });
    const fx = this.host.fx(owner);
    fx.flash(mx, my, 22, 12, SUB.flame);
    fx.smoke(mx, my, 6, { angle, spread: 0.5, speed: 150, size: 8, life: 560, depth: 12 });
    this.host.scene.cameras.main.shake(160, 0.006);
    // The hull rocks back on its tracks.
    r.vx -= Math.cos(angle) * 60; r.vy -= Math.sin(angle) * 60;
    return true;
  }

  /** 0 = just fired, 1 = loaded. Only meaningful while driving the tank. */
  cannonRatio(owner: Owner, time: number): number {
    const r = this.rides[owner];
    if (!r || r.kind !== 'tank') return 1;
    return Phaser.Math.Clamp(1 - (r.nextShellAt - time) / SHELL_RELOAD_MS, 0, 1);
  }

  /** Online: the owner's machine says the ride is gone. */
  destroyRemote(owner: Owner): void {
    if (this.rides[owner]) this._destroy(owner);
  }

  // ── Simulation ─────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    for (const owner of ['player', 'npc'] as const) {
      const r = this.rides[owner];
      if (!r) continue;
      const f = this.host.fighter(owner);
      if (r.ridden && (!f.active || f.hp <= 0)) this.dismount(owner, true);

      if (r.ridden) {
        // Other effects borrow the absorber slot too; while driving, the bodywork keeps it.
        const absorb = this.absorbers[owner];
        if (absorb && f.damageAbsorber !== absorb) f.damageAbsorber = absorb;
        if (owner === 'player') this._drive(r, f, dt);
        else this._follow(r, f, dt);
        this._ram(r, time);
      } else {
        r.vx = 0; r.vy = 0;
      }
      this._stopBullets(r);

      // A beaten-up ride smokes from the hood.
      if (r.hp < RIDE_SPECS[r.kind].hp * 0.5) {
        r.smokeAccum += delta;
        if (r.smokeAccum >= 180) {
          r.smokeAccum = 0;
          this.host.fx(owner).smoke(r.x + Math.cos(r.heading) * 16, r.y + Math.sin(r.heading) * 16, 1, {
            speed: 20, size: 5, life: 800, depth: 9, drift: -40, color: SUB.ashDark,
          });
        }
      }
      if (r.hp <= 0 && this.host.authoritative(owner)) this._destroy(owner);
    }
    this._updateShells(dt);
  }

  /** Throttle, steering, grip: the body is driven by velocity so walls still stop it. */
  private _drive(r: Ride, f: Fighter, dt: number): void {
    const spec = RIDE_SPECS[r.kind];
    const body = f.body as Body;
    const axis = this.host.moveAxis();
    const throttle = -axis.y;
    r.steer = Phaser.Math.Linear(r.steer, axis.x, Math.min(1, dt * 10));

    // A wall takes most of the speed out of whichever way it was hit.
    if (body.blocked.left || body.blocked.right) r.vx *= -WALL_BOUNCE;
    if (body.blocked.up || body.blocked.down) r.vy *= -WALL_BOUNCE;

    // Steering only bites while the wheels are turning, and reverses with them.
    let c = Math.cos(r.heading), s = Math.sin(r.heading);
    const rolling = r.vx * c + r.vy * s;
    const bite = Phaser.Math.Clamp(Math.abs(rolling) / 110, 0, 1);
    // A tank pivots on its tracks even standing still.
    const pivot = r.kind === 'tank' ? Math.max(bite, 0.75) : bite;
    r.heading = Phaser.Math.Angle.Wrap(
      r.heading + r.steer * spec.turn * pivot * (rolling < -8 ? -1 : 1) * dt);

    // Split what it is doing into "along the car" and "sideways"; the engine works on the
    // first, the tyres on the second. Low grip leaves the slide in — that is the drift.
    c = Math.cos(r.heading); s = Math.sin(r.heading);
    let fwd = r.vx * c + r.vy * s;
    let side = -r.vx * s + r.vy * c;
    if (throttle > 0) fwd += spec.accel * dt;
    else if (throttle < 0) fwd -= spec.accel * (fwd > 0 ? 1.6 : 0.7) * dt;
    fwd -= fwd * (ROLL_DRAG + (throttle === 0 ? BRAKE_DRAG : 0)) * dt;
    fwd = Phaser.Math.Clamp(fwd, -spec.top * REVERSE_FRAC, spec.top);
    side *= Math.exp(-spec.grip * dt);
    r.vx = fwd * c - side * s;
    r.vy = fwd * s + side * c;

    body.setVelocity(r.vx, r.vy);
    r.x = f.x; r.y = f.y;
    const p = this.host.pointer();
    r.turret = Phaser.Math.Angle.RotateTo(r.turret, Math.atan2(p.y - r.y, p.x - r.x), 2.4 * dt);

    // Tyre marks while it is sliding.
    if (Math.abs(side) > 90 && r.kind !== 'tank') {
      this.host.fx(r.owner).smoke(r.x - c * 18, r.y - s * 18, 1, { speed: 14, size: 4, life: 380, depth: 4 });
    }
  }

  /** An opponent's ride: it goes where its driver goes and turns to face the way they went. */
  private _follow(r: Ride, f: Fighter, dt: number): void {
    const dx = f.x - r.lastX, dy = f.y - r.lastY;
    r.lastX = f.x; r.lastY = f.y;
    r.x = f.x; r.y = f.y;
    r.vx = dx / Math.max(dt, 0.001); r.vy = dy / Math.max(dt, 0.001);
    if (Math.hypot(dx, dy) > 0.4) {
      r.heading = Phaser.Math.Angle.RotateTo(r.heading, Math.atan2(dy, dx), 6 * dt);
    }
    const foe = this.host.foes(r.owner)[0];
    if (foe) r.turret = Phaser.Math.Angle.RotateTo(r.turret, Math.atan2(foe.y - r.y, foe.x - r.x), 2.4 * dt);
  }

  /** Driving into someone. Hurts with speed; the tank just hurts. */
  private _ram(r: Ride, time: number): void {
    const speed = Math.hypot(r.vx, r.vy);
    if (speed < RAM_MIN_SPEED && r.kind !== 'tank') return;
    if (r.kind === 'tank' && speed < 40) return;
    const spec = RIDE_SPECS[r.kind];
    for (const foe of this.host.foes(r.owner)) {
      if (!foe.active || foe.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(r.x, r.y, foe.x, foe.y) > spec.radius + 16) continue;
      if (time < (r.ramReadyAt.get(foe) ?? 0)) continue;
      r.ramReadyAt.set(foe, time + RAM_CD_MS);
      const dmg = r.kind === 'tank'
        ? RAM_TANK_DMG
        : Math.round(RAM_BASE_DMG + RAM_SPEED_DMG * Math.min(1.2, speed / RAM_REF_SPEED));
      foe.takeDamage(dmg);
      const ang = Math.atan2(foe.y - r.y, foe.x - r.x);
      this.host.knock(foe, Math.cos(ang) * RAM_KNOCK, Math.sin(ang) * RAM_KNOCK, RAM_KNOCK_MS);
      this.host.spawnHitFlash(foe.x, foe.y, this.host.col(r.owner)(SUB.steelHi));
      this.host.fx(r.owner).deal(foe.x, foe.y, 44, { notes: 0, rings: 2, duration: 320, mark: false, color: SUB.steelHi });
      this.host.scene.cameras.main.shake(120, 0.005);
      // The hit costs the car some of its speed too.
      r.vx *= 0.7; r.vy *= 0.7;
    }
  }

  /** You can shoot out through your own car; nobody shoots in. */
  private _stopBullets(r: Ride): void {
    const spec = RIDE_SPECS[r.kind];
    // A ridden ride takes its hits through the rider's body, so only a parked one is a wall.
    if (r.ridden) return;
    for (const go of [...this.host.projectiles.getChildren()]) {
      const p = go as Phaser.Physics.Arcade.Sprite & { isFromPlayer?: boolean; damage?: number };
      if (!p.active) continue;
      if ((r.owner === 'player') === (p.isFromPlayer === true)) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, r.x, r.y) > spec.radius) continue;
      const dmg = Math.max(1, p.damage ?? 4);
      p.destroy();
      this.host.spawnHitFlash(r.x, r.y, this.host.col(r.owner)(SUB.steel));
      if (this.host.authoritative(r.owner)) r.hp -= dmg;
    }
  }

  /** A hit on the driver lands on the bodywork instead — unless the bike just was not there. */
  private _riderHit(owner: Owner, amount: number): boolean {
    const r = this.rides[owner];
    if (!r || !r.ridden) return false;
    if (amount <= 0) return true;
    const spec = RIDE_SPECS[r.kind];
    if (spec.dodge > 0 && Math.random() < spec.dodge) {
      this.host.fx(owner).smoke(r.x, r.y, 2, { speed: 60, size: 5, life: 320, depth: 8 });
      return true;
    }
    r.hp -= amount;
    this.host.spawnHitFlash(r.x, r.y, this.host.col(owner)(SUB.steel));
    return true;
  }

  private _destroy(owner: Owner): void {
    const r = this.rides[owner];
    if (!r) return;
    if (r.ridden) this.dismount(owner, false);
    this.rides[owner] = null;
    this.host.onRideGone(owner);
    // The explosion is the owner's parting gift — it never touches them.
    this.host.dealAoe(owner, r.x, r.y, BOOM_RADIUS, BOOM_DMG);
    const fx = this.host.fx(owner);
    fx.flash(r.x, r.y, 46, 12, SUB.flame);
    fx.deal(r.x, r.y, BOOM_RADIUS, { notes: 8, rings: 3, duration: 620, color: SUB.ember });
    fx.smoke(r.x, r.y, 12, { speed: 150, size: 11, life: 1000, depth: 11, color: SUB.ashDark });
    fx.scorch(r.x, r.y, 46);
    this.host.scene.cameras.main.shake(320, 0.009);
    if (owner === 'player') this.host.onPlayerRideDestroyed();
  }

  private _updateShells(dt: number): void {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      const dist = Phaser.Math.Distance.Between(s.x, s.y, s.destX, s.destY);
      const step = SHELL_SPEED * dt;
      let burst = dist <= step;
      if (!burst) {
        s.x += Math.cos(s.angle) * step;
        s.y += Math.sin(s.angle) * step;
        // It goes off on the first body it meets, not only where it was aimed.
        burst = this.host.foes(s.owner).some((f) => f.active && f.hp > 0
          && Phaser.Math.Distance.Between(s.x, s.y, f.x, f.y) <= 22);
      } else {
        s.x = s.destX; s.y = s.destY;
      }
      if (!burst) continue;
      this.shells.splice(i, 1);
      this.host.dealAoe(s.owner, s.x, s.y, SHELL_RADIUS, SHELL_DMG);
      const fx = this.host.fx(s.owner);
      fx.flash(s.x, s.y, 40, 12, SUB.flame);
      fx.deal(s.x, s.y, SHELL_RADIUS, { notes: 0, rings: 3, duration: 560, color: SUB.ember });
      fx.smoke(s.x, s.y, 10, { speed: 140, size: 10, life: 900, depth: 11, color: SUB.ashDark });
      fx.scorch(s.x, s.y, 40);
      this.host.scene.cameras.main.shake(240, 0.008);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private _look(r: Ride, time: number): Parameters<typeof drawRide>[8] {
    const spec = RIDE_SPECS[r.kind];
    return {
      hpRatio: Phaser.Math.Clamp(r.hp / spec.hp, 0, 1),
      speed: Phaser.Math.Clamp(Math.hypot(r.vx, r.vy) / spec.top, 0, 1),
      steer: r.steer,
      occupied: r.ridden,
      turret: r.turret,
      recoil: Phaser.Math.Clamp(1 - (time - r.firedAt) / 320, 0, 1),
      enemy: r.owner === 'npc',
    };
  }

  /** Bodywork, under the fighters. */
  paintUnder(g: Phaser.GameObjects.Graphics, time: number): void {
    const t = time / 1000;
    for (const owner of ['player', 'npc'] as const) {
      const r = this.rides[owner];
      if (!r) continue;
      drawRide(g, this.host.col(owner), r.kind, r.x, r.y, r.heading, t, 1, this._look(r, time));
    }
  }

  /** Roof, turret, shells and the health bar, over the driver. */
  paintOver(g: Phaser.GameObjects.Graphics, time: number): void {
    const t = time / 1000;
    for (const owner of ['player', 'npc'] as const) {
      const r = this.rides[owner];
      if (!r) continue;
      const tint = this.host.col(owner);
      drawRideTop(g, tint, r.kind, r.x, r.y, r.heading, t, 1, this._look(r, time));
      drawRideHp(g, tint, r.x, r.y + RIDE_SIZE[r.kind].wid / 2 + 14, 44,
        Phaser.Math.Clamp(r.hp / RIDE_SPECS[r.kind].hp, 0, 1), 1);
      // The door is open: a keycap over a parked ride you are close enough to take.
      if (owner === 'player' && this.canEnter('player')) {
        drawSpaceHint(g, tint, r.x, r.y - RIDE_SIZE[r.kind].wid / 2 - 22, t, 1);
      }
    }
    for (const s of this.shells) drawShell(g, this.host.col(s.owner), s.x, s.y, s.angle, t, 1);
  }
}
