import Phaser from 'phaser';
import { FearMaze } from './FearMaze';
import { FearMazeView } from './FearMazeView';

/**
 * One trip down the hole: They Will Fall's hunt through the maze.
 *
 * Positions are in maze units (one tile = 1). The local human is always one of the two parties —
 * the hunter if they are the slasher, the prey if they fell — and sees it in first person. The
 * other party is a bot (driven here), or an online opponent whose position arrives by relay.
 *
 * Only the `authoritative` side decides a catch: offline that is this machine; online it is the
 * slasher's, working from the prey's relayed position.
 */

export type MazeRole = 'hunter' | 'victim';
export type MazeOutcome = 'running' | 'caught' | 'escaped';

export interface MazeRunHost {
  readonly scene: Phaser.Scene;
  readonly wKey: Phaser.Input.Keyboard.Key;
  readonly aKey: Phaser.Input.Keyboard.Key;
  readonly sKey: Phaser.Input.Keyboard.Key;
  readonly dKey: Phaser.Input.Keyboard.Key;
  /** 0 (flawless) … ~0.5 (easy). */
  readonly npcSlack: number;
  /** Online: relay our own position to the other machine. */
  send(id: string): void;
}

export interface MazeRunOpts {
  seed: number;
  localRole: MazeRole;
  /** The other party is a human on another machine (their position arrives through `onRemotePos`). */
  remote: boolean;
  authoritative: boolean;
  /** Texture the hunter sees the prey as. */
  victimTexture?: string;
  durationMs: number;
}

interface Walker { x: number; y: number; yaw: number }

/** Maze units per second. The hunter is a hulk; the prey can always outwalk him, never outlast him by standing still. */
const HUNTER_SPEED = 1.25;
const HUNTER_BOT_CHARGE_SPEED = 1.75;
const VICTIM_SPEED = 1.9;
const VICTIM_BOT_WANDER_SPEED = 1.2;
const VICTIM_BOT_FLEE_SPEED = 1.05;
const BODY_R = 0.24;
/** One footfall per π of `bob`. */
const BOB_HUNTER = 5;
const BOB_VICTIM = 9;
const CATCH_DIST = 0.6;
const BOT_SIGHT = 7;
const BLOOD_EVERY = 0.55;
const BLOOD_MAX = 150;
const LOOK_SENS = 0.0026;
const EDGE_K = 0.55;
const EDGE_TURN = 2.4;
const SEND_MS = 80;

export class FearMazeRun {
  readonly maze: FearMaze;
  readonly hunter: Walker;
  readonly victim: Walker;
  readonly blood: { x: number; y: number }[] = [];
  private readonly view: FearMazeView;
  private readonly opts: MazeRunOpts;
  private readonly host: MazeRunHost;
  private left: number;
  private t = 0;
  private bob = 0;
  private lastBloodX: number;
  private lastBloodY: number;
  private lastSend = 0;
  private lookDX = 0;
  private lookListener: ((e: MouseEvent) => void) | null = null;
  private clickListener: (() => void) | null = null;
  /** Bot brain: where it is walking to, and whether it has seen the other party. */
  private botGoal: { x: number; y: number } | null = null;
  private botSpotted = false;
  private botLoseAt = 0;
  private heartAt = 0;
  private done = false;

  constructor(host: MazeRunHost, opts: MazeRunOpts) {
    this.host = host;
    this.opts = opts;
    this.maze = new FearMaze(opts.seed);
    this.hunter = { ...this.maze.hunterSpawn, yaw: 0 };
    this.victim = { ...this.maze.victimSpawn, yaw: 0 };
    this.faceOpen(this.hunter);
    this.faceOpen(this.victim);
    this.lastBloodX = this.hunter.x;
    this.lastBloodY = this.hunter.y;
    this.left = opts.durationMs;
    this.view = new FearMazeView(host.scene);
    this.view.open(opts.localRole);
    this.startLook();
  }

  get timeLeftMs(): number { return this.left; }

  /** 0..1: how close the hunter is to the prey. */
  dread(): number {
    // Walking distance, not straight-line: a hunter one wall away with a long way round is not close.
    const d = this.maze.pathDistance(this.hunter.x, this.hunter.y, this.victim.x, this.victim.y);
    return d < 0 ? 0 : Phaser.Math.Clamp(1 - (d - 1) / 11, 0, 1);
  }

  private local(): Walker { return this.opts.localRole === 'hunter' ? this.hunter : this.victim; }
  private other(): Walker { return this.opts.localRole === 'hunter' ? this.victim : this.hunter; }

  /** Point a walker down a corridor rather than at a wall. */
  private faceOpen(w: Walker): void {
    const ex = this.maze.exits(w.x, w.y);
    if (ex.length) w.yaw = Math.atan2(ex[0].y - w.y, ex[0].x - w.x);
  }

  // ── Mouse look ─────────────────────────────────────────────────────────────

  private canvas(): HTMLCanvasElement { return this.host.scene.game.canvas; }

  private requestLock(): void {
    const c = this.canvas() as HTMLCanvasElement & { requestPointerLock(): unknown };
    if (!c || document.pointerLockElement === c) return;
    try {
      const r = c.requestPointerLock();
      if (r instanceof Promise) r.catch(() => {});
    } catch { /* no pointer lock: edge turning covers it */ }
  }

  private startLook(): void {
    this.lookListener = (e: MouseEvent) => { this.lookDX += e.movementX || 0; };
    document.addEventListener('mousemove', this.lookListener);
    // A refused lock (no recent gesture) is asked for again on the next click.
    this.clickListener = () => this.requestLock();
    this.canvas().addEventListener('mousedown', this.clickListener);
    this.requestLock();
  }

  private stopLook(): void {
    if (this.lookListener) document.removeEventListener('mousemove', this.lookListener);
    if (this.clickListener) this.canvas().removeEventListener('mousedown', this.clickListener);
    this.lookListener = null;
    this.clickListener = null;
    if (document.pointerLockElement === this.canvas()) {
      try { document.exitPointerLock(); } catch { /* already gone */ }
    }
  }

  // ── Movement ───────────────────────────────────────────────────────────────

  private step(w: Walker, dx: number, dy: number): boolean {
    const p = this.maze.move(w.x, w.y, dx, dy, BODY_R);
    const moved = Math.hypot(p.x - w.x, p.y - w.y) > 1e-5;
    w.x = p.x;
    w.y = p.y;
    return moved;
  }

  private updateLocal(dt: number): void {
    const w = this.local();
    const { scene, wKey, aKey, sKey, dKey } = this.host;
    w.yaw += this.lookDX * LOOK_SENS;
    this.lookDX = 0;
    if (document.pointerLockElement !== this.canvas()) {
      // Cursor free: parking it toward an edge of the screen keeps turning that way.
      const W = scene.scale.width;
      const k = Phaser.Math.Clamp((scene.input.activePointer.x - W / 2) / (W / 2), -1, 1);
      if (Math.abs(k) > EDGE_K) w.yaw += Math.sign(k) * ((Math.abs(k) - EDGE_K) / (1 - EDGE_K)) * EDGE_TURN * dt;
    }
    let fwd = (wKey.isDown ? 1 : 0) - (sKey.isDown ? 1 : 0);
    let strafe = (dKey.isDown ? 1 : 0) - (aKey.isDown ? 1 : 0);
    if (fwd !== 0 && strafe !== 0) { fwd *= 0.7071; strafe *= 0.7071; }
    const speed = this.opts.localRole === 'hunter' ? HUNTER_SPEED : VICTIM_SPEED;
    const ca = Math.cos(w.yaw);
    const sa = Math.sin(w.yaw);
    const moved = (fwd !== 0 || strafe !== 0)
      && this.step(w, (ca * fwd - sa * strafe) * speed * dt, (sa * fwd + ca * strafe) * speed * dt);
    this.bob += dt * (moved ? (this.opts.localRole === 'hunter' ? BOB_HUNTER : BOB_VICTIM) : 0);
  }

  /** Walk a bot toward its goal tile; true once it is standing on it. */
  private botWalk(w: Walker, speed: number, dt: number): boolean {
    const g = this.botGoal;
    if (!g) return true;
    const dx = g.x - w.x;
    const dy = g.y - w.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.08) return true;
    const want = Math.atan2(dy, dx);
    w.yaw = Phaser.Math.Angle.RotateTo(w.yaw, want, 5 * dt);
    const stepLen = Math.min(d, speed * dt);
    this.step(w, (dx / d) * stepLen, (dy / d) * stepLen);
    return false;
  }

  /** A corridor to amble down: any exit, preferring not to turn straight back. */
  private wanderGoal(w: Walker): { x: number; y: number } | null {
    const ex = this.maze.exits(w.x, w.y);
    if (!ex.length) return null;
    const ahead = ex.filter((e) => Math.cos(Math.atan2(e.y - w.y, e.x - w.x) - w.yaw) > -0.5);
    const pool = ahead.length ? ahead : ex;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /** The hunting bot: wander until it sees the prey, then run them down by the shortest path. */
  private updateBotHunter(dt: number): void {
    const h = this.hunter;
    const v = this.victim;
    const d = Math.hypot(h.x - v.x, h.y - v.y);
    const sees = d < BOT_SIGHT && this.maze.los(h.x, h.y, v.x, v.y);
    if (sees) { this.botSpotted = true; this.botLoseAt = this.t + 2.5 + (1 - this.host.npcSlack) * 3; }
    else if (this.botSpotted && this.t > this.botLoseAt) { this.botSpotted = false; this.botGoal = null; }
    if (this.botSpotted) {
      this.botGoal = d < 1 ? { x: v.x, y: v.y } : (this.maze.nextStep(h.x, h.y, v.x, v.y) ?? { x: v.x, y: v.y });
      this.botWalk(h, HUNTER_BOT_CHARGE_SPEED * (1 - this.host.npcSlack * 0.35), dt);
      return;
    }
    if (!this.botGoal || this.botWalk(h, HUNTER_SPEED, dt)) this.botGoal = this.wanderGoal(h);
  }

  /** The hunted bot: wander until the hunter is in sight, then take whichever corridor leads furthest away. */
  private updateBotVictim(dt: number): void {
    const h = this.hunter;
    const v = this.victim;
    const d = Math.hypot(h.x - v.x, h.y - v.y);
    const sees = d < BOT_SIGHT && this.maze.los(h.x, h.y, v.x, v.y);
    if (sees) { this.botSpotted = true; this.botLoseAt = this.t + 3; }
    else if (this.botSpotted && this.t > this.botLoseAt) { this.botSpotted = false; this.botGoal = null; }
    const arrived = !this.botGoal || this.botWalk(v, this.botSpotted ? VICTIM_BOT_FLEE_SPEED : VICTIM_BOT_WANDER_SPEED, dt);
    if (!arrived) return;
    if (!this.botSpotted) { this.botGoal = this.wanderGoal(v); return; }
    let best: { x: number; y: number } | null = null;
    let bestD = -1;
    for (const e of this.maze.exits(v.x, v.y)) {
      const ed = Math.hypot(e.x - h.x, e.y - h.y);
      if (ed > bestD) { bestD = ed; best = e; }
    }
    this.botGoal = best;
  }

  /** Online: the other party's position, as their machine walked it. */
  onRemotePos(x: number, y: number, yaw: number): void {
    const o = this.other();
    o.x = x;
    o.y = y;
    o.yaw = yaw;
  }

  // ── Frame ──────────────────────────────────────────────────────────────────

  update(delta: number): MazeOutcome {
    if (this.done) return 'running';
    const dt = Math.min(0.05, delta / 1000);
    this.t += dt;
    this.left -= delta;
    this.updateLocal(dt);
    if (!this.opts.remote) {
      if (this.opts.localRole === 'hunter') this.updateBotVictim(dt);
      else this.updateBotHunter(dt);
    } else if (this.host.scene.time.now - this.lastSend >= SEND_MS) {
      this.lastSend = this.host.scene.time.now;
      const w = this.local();
      this.host.send(`fear-mp:${Math.round(w.x * 1000)}:${Math.round(w.y * 1000)}:${Math.round(w.yaw * 1000)}`);
    }

    // The body bag: a smear every half tile the hunter walks.
    const h = this.hunter;
    if (Math.hypot(h.x - this.lastBloodX, h.y - this.lastBloodY) >= BLOOD_EVERY) {
      this.lastBloodX = h.x;
      this.lastBloodY = h.y;
      this.blood.push({ x: h.x - Math.cos(h.yaw) * 0.35, y: h.y - Math.sin(h.yaw) * 0.35 });
      if (this.blood.length > BLOOD_MAX) this.blood.shift();
    }

    const dread = this.dread();
    if (this.t >= this.heartAt) {
      this.heartAt = this.t + 1.15 - dread * 0.75;
      this.onHeartbeat?.(dread);
    }

    const o = this.other();
    this.view.render({
      maze: this.maze,
      x: this.local().x, y: this.local().y, yaw: this.local().yaw,
      role: this.opts.localRole,
      other: { x: o.x, y: o.y, yaw: o.yaw, textureKey: this.opts.localRole === 'hunter' ? this.opts.victimTexture : undefined },
      blood: this.blood,
      dread,
      timeLeftMs: Math.max(0, this.left),
      t: this.t,
      bob: this.bob,
    });

    if (!this.opts.authoritative) return 'running';
    const d = Math.hypot(h.x - this.victim.x, h.y - this.victim.y);
    if (d < CATCH_DIST && this.maze.los(h.x, h.y, this.victim.x, this.victim.y)) return 'caught';
    if (this.left <= 0) return 'escaped';
    return 'running';
  }

  /** Called on each heartbeat with the current dread, so the kit can play it. */
  onHeartbeat: ((dread: number) => void) | null = null;

  destroy(): void {
    if (this.done) return;
    this.done = true;
    this.stopLook();
    this.view.close();
    this.view.destroy();
  }
}
