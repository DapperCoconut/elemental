import Phaser from 'phaser';
import {
  GunKind, MYTH, MythColorFn, crosshair, crowdFigure, gun, jitter, muzzleFlash, pinpricks, star,
} from './MythVisuals';
import { FONT_DISPLAY } from '../../ui/Theme';
import { DOOM_GUN_NAMES, doomGun } from './skins/DoomFx';

/**
 * Final Destiny's first-person frame.
 *
 * The arena keeps simulating in two dimensions underneath; this is only a *picture* of it, taken
 * from the Myth player's feet, looking along a yaw the kit owns. It is a 1990s raycaster done
 * the cheap way: the arena's four walls are planar, so each is a single perspective quad; the
 * floor is the real 80px grid projected line by line; the sky is a star field that scrolls with
 * the yaw; and everything that moves is a billboard — a vertical sprite that always faces the
 * camera, scaled by one over its distance. Nothing here touches the sim. The kit hands the view
 * the camera and a list of entities every frame and the view draws them, nearest last.
 *
 * Depths: the whole frame sits in 19.0–19.9, over every world layer (fighters are 5, kit art
 * tops out around 15) and under the HUD at 20+, so the ability bar, the health bars and the
 * status tray stay exactly where they are.
 */

export const VIEW_FOV = Math.PI / 2;
/** px from the camera to the picture plane for a 90° field across the full width. */
const FOCAL = 480;
const NEAR = 6;
/** The camera's eye above the floor, and the wall's top above the floor, both in world px. */
const EYE = 40;
const WALL = 96;
const HORIZON_K = 0.47;
const MAX_IMAGES = 28;
const MAX_DRAWS = 24;
const CROWD_STEP = 46;

export interface ViewSprite {
  kind: 'sprite';
  x: number; y: number;
  texture: string;
  /** World px tall and wide — a fighter is 48. */
  height: number;
  width: number;
  hpRatio?: number;
  tint?: number;
  alpha?: number;
  /** A tag under the sprite (the opponent's name). */
  label?: string;
}

export interface ViewDraw {
  kind: 'draw';
  x: number; y: number;
  /** World px tall, so the painter's `scale` is comparable to a sprite's. */
  height: number;
  /** Paint at screen `(sx, sy)` (the feet), `scale` = screen px per world px. */
  draw(g: Phaser.GameObjects.Graphics, sx: number, sy: number, scale: number): void;
}

export type ViewEntity = ViewSprite | ViewDraw;

export interface ViewCamera {
  x: number; y: number;
  yaw: number;
  /** Look up (+) or down (−): px the horizon sits below its rest line. The kit clamps it to the view's limits. */
  pitch: number;
  /** 0–1 walking bob phase, in radians. */
  bob: number;
  /** The frame's bounds — the walls. */
  bounds: Phaser.Geom.Rectangle;
}

export interface ViewHud {
  gun: GunKind;
  recoil: number;
  /** Seconds left in the form. */
  secondsLeft: number;
  /** The crowd's state: 0 seated, 1 jumping; and whether they are jeering. */
  crowdBounce: number;
  crowdArms: number;
  /** A flash across the whole frame — being hit. 0–1. */
  hurt: number;
  /** A gun just landed (1 → 0): the hit marker on the crosshair. */
  hitMark: number;
  /** A rifle headshot just landed (1 → 0): the gold marker, the banner and the ring. */
  headMark: number;
  /** The mouse is captured. When it is not, a prompt says how to capture it. */
  locked: boolean;
  /** Q+ Slayer states worth showing next to the gun's name. */
  rapid: boolean;
  chain: boolean;
  /** Echo Shards held, and the hand size — the over-head pips are under the frame. */
  shards: number;
  shardMax: number;
  /** Slayer's gun-butt slam (1 → 0): the shotgun swings stock-first across the frame. */
  butt: number;
  /** Slayer's second grenade blast (1 → 0): the frame flushes red. */
  blast: number;
  /** The kit's latest word to the player (world text is under the frame), with its fade. */
  toast: { text: string; color: number; a: number } | null;
}

/** How much bigger than their drawn size the guns sit in the frame. */
const GUN_SCALE = 1.8;

interface SkyStar { a: number; e: number; r: number; blue: boolean }

export class MythView {
  /** How far the horizon may travel for looking up / down, in px. */
  static readonly PITCH_UP = 220;
  static readonly PITCH_DOWN = 200;
  private scene: Phaser.Scene;
  private tint: MythColorFn;
  private W: number;
  private H: number;
  private scenery: Phaser.GameObjects.Graphics | null = null;
  private images: Phaser.GameObjects.Image[] = [];
  private draws: Phaser.GameObjects.Graphics[] = [];
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private hud: Phaser.GameObjects.Graphics | null = null;
  private timerText: Phaser.GameObjects.Text | null = null;
  private gunText: Phaser.GameObjects.Text | null = null;
  private headText: Phaser.GameObjects.Text | null = null;
  private lockText: Phaser.GameObjects.Text | null = null;
  private toastText: Phaser.GameObjects.Text | null = null;
  private labels: Phaser.GameObjects.Text[] = [];
  private stars: SkyStar[] = [];
  private t = 0;
  private open = false;
  /** The player's equipped Myth skin: Doom swaps the guns and the labels (visual only). */
  private skin: string | null = null;

  constructor(scene: Phaser.Scene, tint: MythColorFn, width: number, height: number) {
    this.scene = scene;
    this.tint = tint;
    this.W = width;
    this.H = height;
    for (let i = 0; i < 160; i++) {
      this.stars.push({ a: jitter(3, i) * Math.PI * 2, e: Math.pow(jitter(5, i), 0.7), r: 0.7 + jitter(7, i) * 1.6, blue: jitter(9, i) > 0.8 });
    }
  }

  isOpen(): boolean { return this.open; }

  setSkin(id: string | null): void { this.skin = id; }

  /** Build the layers. Idempotent. */
  show(): void {
    if (this.open) return;
    this.open = true;
    const s = this.scene;
    this.scenery = s.add.graphics().setDepth(19.0);
    this.overlay = s.add.graphics().setDepth(19.75);
    this.hud = s.add.graphics().setDepth(19.8);
    this.timerText = s.add.text(this.W / 2, 51, '', {
      fontSize: '13px', fontFamily: FONT_DISPLAY, color: '#fff6d5', stroke: '#05030c', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(19.9);
    this.gunText = s.add.text(this.W - 24, 96, '', {
      fontSize: '12px', fontFamily: FONT_DISPLAY, color: '#b39dff', stroke: '#05030c', strokeThickness: 3,
    }).setOrigin(1, 0.5).setDepth(19.9);
    this.headText = s.add.text(this.W / 2, this.H / 2 - 70, 'HEADSHOT', {
      fontSize: '26px', fontFamily: FONT_DISPLAY, color: '#ffd166', stroke: '#05030c', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(19.92).setVisible(false);
    this.lockText = s.add.text(this.W / 2, this.H / 2 + 46, 'CLICK TO CAPTURE THE MOUSE', {
      fontSize: '11px', fontFamily: FONT_DISPLAY, color: '#fff6d5', stroke: '#05030c', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(19.9).setVisible(false);
    this.toastText = s.add.text(this.W / 2, this.H / 2 + 74, '', {
      fontSize: '15px', fontFamily: FONT_DISPLAY, color: '#fff6d5', stroke: '#05030c', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(19.91).setVisible(false);
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.scenery?.destroy(); this.scenery = null;
    this.overlay?.destroy(); this.overlay = null;
    this.hud?.destroy(); this.hud = null;
    this.timerText?.destroy(); this.timerText = null;
    this.gunText?.destroy(); this.gunText = null;
    this.headText?.destroy(); this.headText = null;
    this.lockText?.destroy(); this.lockText = null;
    this.toastText?.destroy(); this.toastText = null;
    for (const im of this.images) im.destroy();
    this.images = [];
    for (const g of this.draws) g.destroy();
    this.draws = [];
    for (const l of this.labels) l.destroy();
    this.labels = [];
  }

  destroy(): void { this.hide(); }

  // ── Projection ─────────────────────────────────────────────────────────────

  /** World → camera space: `z` forward along the yaw, `s` to the right of it. */
  private toCam(cam: ViewCamera, px: number, py: number): { z: number; s: number } {
    const dx = px - cam.x;
    const dy = py - cam.y;
    const ca = Math.cos(cam.yaw);
    const sa = Math.sin(cam.yaw);
    return { z: dx * ca + dy * sa, s: -dx * sa + dy * ca };
  }

  private horizon(cam: ViewCamera): number {
    return this.H * HORIZON_K + cam.pitch + Math.sin(cam.bob) * 3;
  }

  /** Clip a camera-space segment to the near plane. Null when wholly behind. */
  private clipNear(a: { z: number; s: number }, b: { z: number; s: number }): [{ z: number; s: number }, { z: number; s: number }] | null {
    if (a.z < NEAR && b.z < NEAR) return null;
    if (a.z >= NEAR && b.z >= NEAR) return [a, b];
    const k = (NEAR - a.z) / (b.z - a.z);
    const m = { z: NEAR, s: a.s + (b.s - a.s) * k };
    return a.z < NEAR ? [m, b] : [a, m];
  }

  // ── Frame ──────────────────────────────────────────────────────────────────

  render(delta: number, cam: ViewCamera, entities: ViewEntity[], hud: ViewHud): void {
    if (!this.open || !this.scenery || !this.overlay || !this.hud) return;
    this.t += delta / 1000;
    const g = this.scenery;
    g.clear();
    const HY = this.horizon(cam);
    this.paintSky(g, cam, HY);
    this.paintFloor(g, cam, HY);
    this.paintWalls(g, cam, HY, hud);
    this.paintEntities(cam, HY, entities);
    this.paintHud(cam, hud);
  }

  private paintSky(g: Phaser.GameObjects.Graphics, cam: ViewCamera, HY: number): void {
    const W = this.W;
    g.fillStyle(this.tint(MYTH.void), 1);
    g.fillRect(0, 0, W, HY);
    // A faint band of nebula low on the horizon, scrolling with the yaw.
    const bandX = ((-cam.yaw / (Math.PI * 2)) * W * 2.4) % W;
    for (let i = -1; i <= 1; i++) {
      g.fillStyle(this.tint(MYTH.violet), 0.22);
      g.fillEllipse(bandX + i * W + W * 0.3, HY - 30, W * 0.9, 70);
      g.fillStyle(this.tint(MYTH.iris), 0.08);
      g.fillEllipse(bandX + i * W + W * 0.3, HY - 46, W * 0.6, 40);
    }
    const half = VIEW_FOV / 2 + 0.25;
    for (const st of this.stars) {
      let d = st.a - cam.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) > half) continue;
      const sx = W / 2 + Math.tan(d) * FOCAL;
      if (sx < -4 || sx > W + 4) continue;
      const sy = HY - st.e * HY * 0.96 - 2;
      const tw = 0.6 + 0.4 * Math.sin(this.t * (1.2 + st.r) + st.a * 9);
      if (st.r > 1.9) star(g, sx, sy, st.r * 1.6, this.tint(st.blue ? MYTH.starBlue : MYTH.star), tw, { points: 4 });
      else { g.fillStyle(this.tint(st.blue ? MYTH.starBlue : MYTH.star), tw); g.fillCircle(sx, sy, st.r * 0.8); }
    }
  }

  private paintFloor(g: Phaser.GameObjects.Graphics, cam: ViewCamera, HY: number): void {
    const W = this.W;
    const H = this.H;
    // Distance bands: the floor darkens toward the horizon.
    const bands = 14;
    for (let i = 0; i < bands; i++) {
      const y0 = HY + (H - HY) * (i / bands);
      const y1 = HY + (H - HY) * ((i + 1) / bands);
      const k = i / bands;
      g.fillStyle(this.tint(k < 0.15 ? MYTH.deep : MYTH.dusk), 1);
      g.fillRect(0, y0, W, y1 - y0 + 1);
      g.fillStyle(this.tint(MYTH.void), 0.75 * (1 - k));
      g.fillRect(0, y0, W, y1 - y0 + 1);
    }
    // The real 80px grid, projected.
    const b = cam.bounds;
    const line = (x0: number, y0: number, x1: number, y1: number): void => {
      const seg = this.clipNear(this.toCam(cam, x0, y0), this.toCam(cam, x1, y1));
      if (!seg) return;
      const [a, c] = seg;
      const ax = W / 2 + (a.s / a.z) * FOCAL;
      const ay = HY + (EYE / a.z) * FOCAL;
      const cx = W / 2 + (c.s / c.z) * FOCAL;
      const cy = HY + (EYE / c.z) * FOCAL;
      g.lineStyle(1, this.tint(MYTH.iris), 0.28);
      g.lineBetween(ax, ay, cx, cy);
    };
    for (let x = Math.ceil(b.x / 80) * 80; x <= b.right; x += 80) line(x, b.y, x, b.bottom);
    for (let y = Math.ceil(b.y / 80) * 80; y <= b.bottom; y += 80) line(b.x, y, b.right, y);
  }

  private paintWalls(g: Phaser.GameObjects.Graphics, cam: ViewCamera, HY: number, hud: ViewHud): void {
    const W = this.W;
    const b = cam.bounds;
    const corners = [
      { x: b.x, y: b.y }, { x: b.right, y: b.y }, { x: b.right, y: b.bottom }, { x: b.x, y: b.bottom },
    ];
    interface Quad { pts: Phaser.Geom.Point[]; z: number; edge: number; seg: [{ z: number; s: number }, { z: number; s: number }] }
    const quads: Quad[] = [];
    for (let e = 0; e < 4; e++) {
      const p0 = corners[e];
      const p1 = corners[(e + 1) % 4];
      const seg = this.clipNear(this.toCam(cam, p0.x, p0.y), this.toCam(cam, p1.x, p1.y));
      if (!seg) continue;
      const [a, c] = seg;
      const ax = W / 2 + (a.s / a.z) * FOCAL;
      const cx = W / 2 + (c.s / c.z) * FOCAL;
      const aTop = HY - ((WALL - EYE) / a.z) * FOCAL;
      const aBot = HY + (EYE / a.z) * FOCAL;
      const cTop = HY - ((WALL - EYE) / c.z) * FOCAL;
      const cBot = HY + (EYE / c.z) * FOCAL;
      quads.push({
        pts: [new Phaser.Geom.Point(ax, aTop), new Phaser.Geom.Point(cx, cTop), new Phaser.Geom.Point(cx, cBot), new Phaser.Geom.Point(ax, aBot)],
        z: (a.z + c.z) / 2, edge: e, seg,
      });
    }
    quads.sort((p, q) => q.z - p.z);
    for (const q of quads) {
      const shade = Phaser.Math.Clamp(1 - q.z / 1400, 0.25, 1);
      g.fillStyle(this.tint(MYTH.dusk), 1);
      g.fillPoints(q.pts, true);
      g.fillStyle(this.tint(MYTH.void), 1 - shade * 0.9);
      g.fillPoints(q.pts, true);
      g.lineStyle(1.5, this.tint(MYTH.iris), 0.55 * shade);
      g.strokePoints(q.pts, true, true);
      // Panel seams every 80px of wall, and the crowd on the parapet above.
      const p0 = corners[q.edge];
      const p1 = corners[(q.edge + 1) % 4];
      const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      const ux = (p1.x - p0.x) / len;
      const uy = (p1.y - p0.y) / len;
      for (let d = 80; d < len; d += 80) {
        const c = this.toCam(cam, p0.x + ux * d, p0.y + uy * d);
        if (c.z < NEAR) continue;
        const sx = W / 2 + (c.s / c.z) * FOCAL;
        if (sx < -10 || sx > W + 10) continue;
        const top = HY - ((WALL - EYE) / c.z) * FOCAL;
        const bot = HY + (EYE / c.z) * FOCAL;
        g.lineStyle(1, this.tint(MYTH.iris), 0.3 * Phaser.Math.Clamp(1 - c.z / 1400, 0.2, 1));
        g.lineBetween(sx, top, sx, bot);
        pinpricks(g, this.tint, sx, (top + bot) / 2, Math.min(18, (bot - top) * 0.2), q.edge * 31 + d, 2, this.t, 0.6);
      }
      for (let d = CROWD_STEP / 2; d < len; d += CROWD_STEP) {
        const c = this.toCam(cam, p0.x + ux * d, p0.y + uy * d);
        if (c.z < NEAR * 3) continue;
        const sx = W / 2 + (c.s / c.z) * FOCAL;
        if (sx < -20 || sx > W + 20) continue;
        const top = HY - ((WALL - EYE) / c.z) * FOCAL;
        const s = Phaser.Math.Clamp((FOCAL / c.z) * 9, 2.5, 26);
        const i = q.edge * 97 + Math.round(d);
        const bounce = hud.crowdBounce * (0.5 + 0.5 * Math.abs(Math.sin(this.t * 9 + jitter(11, i) * 6)));
        const lit = hud.crowdArms;
        crowdFigure(g, sx, top - s * 0.2, s, this.tint(jitter(13, i) > 0.5 ? MYTH.crowdLit : MYTH.crowdDark), lit, bounce, hud.crowdArms, Phaser.Math.Clamp(1 - c.z / 1600, 0.3, 1));
      }
    }
  }

  private paintEntities(cam: ViewCamera, HY: number, entities: ViewEntity[]): void {
    const W = this.W;
    interface Placed { e: ViewEntity; z: number; sx: number; sy: number; scale: number }
    const placed: Placed[] = [];
    for (const e of entities) {
      const c = this.toCam(cam, e.x, e.y);
      if (c.z < NEAR) continue;
      const sx = W / 2 + (c.s / c.z) * FOCAL;
      if (sx < -240 || sx > W + 240) continue;
      placed.push({ e, z: c.z, sx, sy: HY + (EYE / c.z) * FOCAL, scale: FOCAL / c.z });
    }
    placed.sort((a, b) => b.z - a.z);
    let imgI = 0;
    let drawI = 0;
    let labelI = 0;
    for (let i = 0; i < placed.length; i++) {
      const p = placed[i];
      const depth = 19.1 + (i / Math.max(1, placed.length)) * 0.6;
      if (p.e.kind === 'sprite') {
        if (imgI >= MAX_IMAGES) continue;
        const im = this.image(imgI++);
        im.setTexture(p.e.texture);
        im.setPosition(p.sx, p.sy);
        im.setOrigin(0.5, 1);
        im.setDisplaySize(p.e.width * p.scale, p.e.height * p.scale);
        im.setAlpha(p.e.alpha ?? 1);
        if (p.e.tint !== undefined) im.setTint(p.e.tint); else im.clearTint();
        im.setDepth(depth).setVisible(true);
        // Shadow, health bar and label on a draw layer just under the sprite.
        if (drawI < MAX_DRAWS) {
          const g = this.draw(drawI++);
          g.setDepth(depth - 0.0005);
          const w = p.e.width * p.scale;
          g.fillStyle(this.tint(MYTH.void), 0.55);
          g.fillEllipse(p.sx, p.sy + 2, w * 0.9, Math.max(3, w * 0.22));
          if (p.e.hpRatio !== undefined) {
            const bw = Math.max(26, w * 1.1);
            const by = p.sy - p.e.height * p.scale - 10 * Math.min(1, p.scale);
            g.fillStyle(0x000000, 0.7); g.fillRect(p.sx - bw / 2, by - 3, bw, 5);
            g.fillStyle(p.e.hpRatio > 0.4 ? 0x58e06a : 0xff4a5e, 1); g.fillRect(p.sx - bw / 2, by - 3, bw * Phaser.Math.Clamp(p.e.hpRatio, 0, 1), 5);
          }
        }
        if (p.e.label && labelI < 8) {
          const lb = this.label(labelI++);
          lb.setText(p.e.label).setPosition(p.sx, p.sy + 6).setFontSize(Math.round(Phaser.Math.Clamp(8 * p.scale, 8, 16))).setDepth(depth + 0.0002).setVisible(true);
        }
      } else {
        if (drawI >= MAX_DRAWS) continue;
        const g = this.draw(drawI++);
        g.setDepth(depth);
        p.e.draw(g, p.sx, p.sy, p.scale);
      }
    }
    for (let i = imgI; i < this.images.length; i++) this.images[i].setVisible(false);
    for (let i = drawI; i < this.draws.length; i++) this.draws[i].clear();
    for (let i = labelI; i < this.labels.length; i++) this.labels[i].setVisible(false);
  }

  private paintHud(cam: ViewCamera, hud: ViewHud): void {
    const W = this.W;
    const H = this.H;
    const o = this.overlay!;
    const g = this.hud!;
    o.clear();
    g.clear();
    // Vignette: four soft bands. Being hit flushes it red.
    const vig = 0.42 + Math.max(hud.hurt, hud.blast) * 0.3;
    const vc = hud.hurt > 0.05 || hud.blast > 0.05 ? this.tint(MYTH.red) : this.tint(MYTH.void);
    for (let i = 0; i < 5; i++) {
      const k = i / 5;
      o.fillStyle(vc, vig * (1 - k) * 0.35);
      o.fillRect(0, 0, W, 12 + i * 10);
      o.fillRect(0, H - 12 - i * 10, W, 12 + i * 10);
      o.fillRect(0, 0, 14 + i * 12, H);
      o.fillRect(W - 14 - i * 12, 0, 14 + i * 12, H);
    }
    // The gun, big in the lower right, swaying with the walk and kicking with the shot. A soft
    // halo behind it keeps the dark metal off the dark floor.
    const swayX = Math.sin(cam.bob) * 7;
    const swayY = Math.abs(Math.cos(cam.bob)) * 6;
    // The butt slam: a quick arc — the gun lunges toward the crosshair and swings stock-first,
    // then falls back. `swing` rises and falls across the animation.
    const swing = hud.butt > 0 ? Math.sin(Math.PI * (1 - hud.butt)) : 0;
    const gx = W * 0.71 + swayX - swing * W * 0.17;
    // Above the ability tray (which sits over the frame at the bottom), not behind it.
    const gy = H - 74 + swayY - swing * H * 0.16;
    g.fillStyle(this.tint(MYTH.iris), 0.1);
    g.fillEllipse(gx - 70, gy - 70, 360, 220);
    g.fillStyle(this.tint(MYTH.haze), 0.06);
    g.fillEllipse(gx - 60, gy - 60, 240, 140);
    const doom = this.skin === 'doom';
    const m = (doom ? doomGun : gun)(g, this.tint, hud.gun, gx, gy, hud.butt > 0 ? 0 : hud.recoil, this.t, GUN_SCALE, swing * 1.5);
    if (hud.butt > 0 && hud.butt < 0.7) {
      // The connect: speed lines raking in toward the crosshair and a white crack under it.
      const k = 1 - hud.butt / 0.7;
      const a = Math.min(1, hud.butt * 2.2);
      g.lineStyle(3, this.tint(MYTH.white), a * 0.7);
      for (let i = 0; i < 9; i++) {
        const ang = Math.PI * 0.15 + (i / 8) * Math.PI * 0.75;
        const r0 = 60 + k * 30;
        const r1 = 150 + k * 90;
        g.lineBetween(W / 2 + Math.cos(ang) * r0, H / 2 + Math.sin(ang) * r0, W / 2 + Math.cos(ang) * r1, H / 2 + Math.sin(ang) * r1);
      }
      star(g, W / 2, H / 2 + 26, 30 + k * 30, this.tint(MYTH.white), a * 0.8, { points: 8, inner: 0.25, rot: 0.2 });
    }
    if (hud.blast > 0) {
      // The second blast: a red flush over the whole frame, hot at first.
      g.fillStyle(this.tint(MYTH.red), hud.blast * hud.blast * 0.28);
      g.fillRect(0, 0, W, H);
    }
    if (hud.butt <= 0 && hud.recoil > 0.55) muzzleFlash(g, this.tint, m.x, m.y, (16 + hud.recoil * 10) * 1.4, 1 - (hud.recoil - 0.55) / 0.45);
    // The crosshair never moves: the centre of the screen is where every shot goes.
    const cx = W / 2;
    const cy = H / 2;
    crosshair(g, cx, cy, hud.recoil * 6, this.tint(hud.headMark > 0.05 ? MYTH.gold : MYTH.star));
    if (hud.hitMark > 0.02) {
      // The hit marker: four short slashes on the diagonals.
      const a = hud.hitMark;
      const c = this.tint(hud.headMark > 0.05 ? MYTH.gold : MYTH.white);
      g.lineStyle(2.5, c, a);
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.lineBetween(cx + dx * 7, cy + dy * 7, cx + dx * 15, cy + dy * 15);
    }
    if (hud.headMark > 0.02) {
      // The headshot: a big gold X, a crown of stars and an expanding ring, and the banner.
      const a = Math.min(1, hud.headMark * 1.6);
      const k = 1 - hud.headMark;
      g.lineStyle(4, this.tint(MYTH.gold), a);
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.lineBetween(cx + dx * 10, cy + dy * 10, cx + dx * 24, cy + dy * 24);
      g.lineStyle(2, this.tint(MYTH.gold), a * 0.8);
      g.strokeCircle(cx, cy, 20 + k * 70);
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i - 2) * 0.32;
        star(g, cx + Math.cos(ang) * 40, cy + Math.sin(ang) * 40 - k * 10, 6, this.tint(MYTH.gold), a, { points: 5, rot: -Math.PI / 2 });
      }
      this.headText?.setVisible(true).setAlpha(a).setScale(1 + 0.25 * (1 - Math.min(1, k * 4)));
    } else {
      this.headText?.setVisible(false);
    }
    this.lockText?.setVisible(!hud.locked);
    if (this.toastText) {
      if (hud.toast && hud.toast.a > 0.01) {
        this.toastText.setText(hud.toast.text).setColor(`#${hud.toast.color.toString(16).padStart(6, '0')}`)
          .setAlpha(hud.toast.a).setVisible(true);
      } else {
        this.toastText.setVisible(false);
      }
    }
    // The form's clock: a band of night sky in a gold-filigreed void plate, burning down from
    // the right, a star at each end and a comet riding the burning edge.
    const bw = 220;
    const k = Phaser.Math.Clamp(hud.secondsLeft / 15, 0, 1);
    const L = W / 2 - bw / 2;
    g.fillStyle(this.tint(MYTH.void), 0.8);
    g.fillRoundedRect(L - 14, 40, bw + 28, 34, 10);
    g.lineStyle(1.2, this.tint(MYTH.gold), 0.65);
    g.strokeRoundedRect(L - 14, 40, bw + 28, 34, 10);
    g.lineStyle(1, this.tint(MYTH.violet), 0.8);
    g.strokeRoundedRect(L - 11, 43, bw + 22, 28, 8);
    // Filigree ticks hanging off the bottom edge.
    for (let i = 0; i <= 8; i++) {
      const tx = L + (bw * i) / 8;
      g.lineStyle(1, this.tint(MYTH.gold), i % 4 === 0 ? 0.7 : 0.35);
      g.lineBetween(tx, 71, tx, i % 4 === 0 ? 76 : 74);
    }
    g.fillStyle(this.tint(MYTH.deep), 1);
    g.fillRoundedRect(L - 1, 60, bw + 2, 9, 4);
    if (k > 0) {
      g.fillStyle(this.tint(MYTH.violet), 1);
      g.fillRoundedRect(L, 61, bw * k, 7, 3);
      g.fillStyle(this.tint(MYTH.iris), 1);
      g.fillRoundedRect(L, 61, bw * k, 4.5, 2);
      g.fillStyle(this.tint(MYTH.star), 0.85);
      g.fillRoundedRect(L, 61.5, bw * k, 1.4, 0.7);
      // Stars twinkling inside the band.
      for (let i = 0; i < 14; i++) {
        const sx = L + 4 + jitter(21, i) * (bw - 8);
        if (sx > L + bw * k - 2) continue;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.t * (1.5 + jitter(22, i)) + i));
        g.fillStyle(this.tint(i % 3 ? MYTH.star : MYTH.starBlue), tw);
        g.fillCircle(sx, 63 + jitter(23, i) * 3, 0.8);
      }
      const hx = L + bw * k;
      g.fillStyle(this.tint(MYTH.gold), 0.35);
      g.fillCircle(hx, 64.5, 7);
      star(g, hx, 64.5, 5, this.tint(MYTH.star), 1, { points: 4, rot: this.t * 3 });
    }
    star(g, L - 7, 64.5, 4, this.tint(MYTH.gold), 0.9, { points: 4 });
    star(g, L + bw + 7, 64.5, 4, this.tint(MYTH.gold), 0.9, { points: 4 });
    this.timerText?.setText(`${doom ? 'RIP AND TEAR' : 'FINAL DESTINY'}  ${hud.secondsLeft.toFixed(1)}s`);
    const name = doom ? DOOM_GUN_NAMES[hud.gun] : { pistol: 'PISTOL', shotgun: 'SHOTGUN', launcher: 'GRENADE BARRAGE', rifle: 'HUNTER RIFLE', rocket: 'SHADOW ROCKET' }[hud.gun];
    this.gunText?.setText(`${name}${hud.rapid ? '  · RAPID' : ''}${hud.chain ? '  · CHAIN' : ''}`)
      .setColor(`#${this.tint(MYTH.haze).toString(16).padStart(6, '0')}`);
    // A void plate under the gun's name, edged in violet with a gold star on the leading end.
    if (this.gunText) {
      const tw = this.gunText.width;
      const ty = 96;
      g.fillStyle(this.tint(MYTH.void), 0.7);
      g.fillRoundedRect(W - 24 - tw - 22, ty - 12, tw + 32, 24, 8);
      g.lineStyle(1, this.tint(MYTH.iris), 0.7);
      g.strokeRoundedRect(W - 24 - tw - 22, ty - 12, tw + 32, 24, 8);
      star(g, W - 24 - tw - 11, ty, 4.5, this.tint(MYTH.gold), 0.95, { points: 4, rot: this.t });
    }
    // The Echo Shards under it, right-aligned: a lit star for each held, a faint socket for each empty.
    for (let i = 0; i < hud.shardMax; i++) {
      const sx = W - 34 - i * 22;
      if (i < hud.shards) {
        g.fillStyle(this.tint(MYTH.shard), 0.18);
        g.fillCircle(sx, 124, 10);
        star(g, sx, 124, 7, this.tint(MYTH.shard), 1, { points: 4, rot: this.t * 0.6 + i });
      } else {
        star(g, sx, 124, 6, this.tint(MYTH.iris), 0.3, { points: 4 });
      }
    }
  }

  // ── Pools ──────────────────────────────────────────────────────────────────

  private image(i: number): Phaser.GameObjects.Image {
    while (this.images.length <= i) this.images.push(this.scene.add.image(0, 0, '__DEFAULT').setDepth(19.2).setVisible(false));
    return this.images[i];
  }

  private draw(i: number): Phaser.GameObjects.Graphics {
    while (this.draws.length <= i) this.draws.push(this.scene.add.graphics().setDepth(19.2));
    const g = this.draws[i];
    g.clear();
    return g;
  }

  private label(i: number): Phaser.GameObjects.Text {
    while (this.labels.length <= i) {
      this.labels.push(this.scene.add.text(0, 0, '', {
        fontSize: '10px', fontFamily: 'Arial Black', color: '#fff6d5', stroke: '#05030c', strokeThickness: 2,
      }).setOrigin(0.5, 0).setDepth(19.5).setVisible(false));
    }
    return this.labels[i];
  }
}
