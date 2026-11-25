import Phaser from 'phaser';
import type { FearMaze } from './FearMaze';

/**
 * Fear's ultimate, seen from inside.
 *
 * A column raycaster over a `FearMaze`: one DDA ray and one `fillRect` strip per column, plus up
 * to three hashed detail rects (a damp tide line, a mould streak, a falling drip) that are keyed
 * on the wall tile and the hit's u-coordinate so they stay put as the camera moves. The floor and
 * ceiling are distance-shaded bands; puddles and the hunter's blood trail are flattened ellipses
 * painted *before* the walls, so the painter's order does their occlusion. The other party is a
 * billboard; the wall columns nearer than it are repainted on a layer above it, which is the
 * per-column depth test.
 *
 * Fog is black, so "fogged" simply means "multiplied toward zero". The victim's whole world is a
 * weak flashlight: a hard vignette, a short fog range, and a flicker that worsens with `dread`.
 *
 * Depths: 19.0–19.9, like MythView — over every world layer, under the HUD tray at 21.
 */

export interface MazeViewFrame {
  maze: FearMaze;
  x: number; y: number; yaw: number;
  role: 'victim' | 'hunter';
  /** The other party (always passed while alive; the view does wall occlusion + fog itself). */
  other: { x: number; y: number; yaw: number; textureKey?: string } | null;
  /** Blood trail the hunter's dragged body bag leaves, oldest first (maze units). */
  blood: { x: number; y: number }[];
  /** 0..1: how near the hunter is to the victim. */
  dread: number;
  timeLeftMs: number;
  /** Seconds, monotonically increasing; and a walk phase (radians) that advances only while the viewer moves. */
  t: number;
  bob: number;
}

const FOV = (66 * Math.PI) / 180;
const COLS = 240;
/** Low ceiling: the corridor is a tile wide and less than a tile tall. */
const WALL_H = 0.9;
const EYE_VICTIM = 0.4;
const EYE_HUNTER = 0.7;
const RANGE_VICTIM = 4.5;
const RANGE_HUNTER = 7;
/** How far off the hunter can still make out the victim's flashlight glow (line of sight permitting). */
const BLOOM_RANGE = 11;
const HUNTER_HEIGHT = 0.87;
const VICTIM_HEIGHT = 0.42;
const MAX_BLOOD = 400;
const VIGNETTE_KEY = 'fear-maze-vignette';
const GRAIN_KEY = 'fear-maze-grain';
const FONT_SERIF = 'Georgia, "Times New Roman", serif';

function hash(a: number, b: number, c: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

type G = Phaser.GameObjects.Graphics;

export class FearMazeView {
  private scene: Phaser.Scene;
  private W = 960;
  private H = 640;
  private opened = false;
  private role: 'victim' | 'hunter' = 'victim';

  private scenery: G | null = null;
  private figure: G | null = null;
  private sprite: Phaser.GameObjects.Image | null = null;
  private occluder: G | null = null;
  private vignette: Phaser.GameObjects.Image | null = null;
  private pulse: Phaser.GameObjects.Image | null = null;
  private overlay: G | null = null;
  private hands: G | null = null;
  private grain: Phaser.GameObjects.TileSprite | null = null;
  private timerText: Phaser.GameObjects.Text | null = null;
  private timerShown = '';

  // Per-column results of the last cast.
  private zbuf = new Float32Array(COLS);
  private colY = new Float32Array(COLS);
  private colH = new Float32Array(COLS);
  private colC = new Uint32Array(COLS);
  private detY = new Float32Array(COLS * 3);
  private detH = new Float32Array(COLS * 3);
  private detC = new Uint32Array(COLS * 3);

  // Light colour of the current role (the flashlight is warm; the hunter's murk is red).
  private tr = 1;
  private tg = 1;
  private tb = 1;
  private hunterView = false;
  private lastT = -1;
  private beat = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean { return this.opened; }

  /** Builds/shows the layers. Idempotent; calling again with the other role just switches. */
  open(role: 'victim' | 'hunter'): void {
    this.role = role;
    if (this.opened) return;
    this.opened = true;
    const s = this.scene;
    this.W = s.scale.width;
    this.H = s.scale.height;
    const { W, H } = this;
    this.lastT = -1;
    this.beat = 0;
    this.timerShown = '';
    this.ensureTextures();
    this.scenery = s.add.graphics().setDepth(19.0).setScrollFactor(0);
    this.figure = s.add.graphics().setDepth(19.3).setScrollFactor(0);
    this.occluder = s.add.graphics().setDepth(19.4).setScrollFactor(0);
    if (s.textures.exists(VIGNETTE_KEY)) {
      this.vignette = s.add.image(W / 2, H / 2, VIGNETTE_KEY).setDepth(19.5).setScrollFactor(0).setTint(0x000000);
      this.pulse = s.add.image(W / 2, H / 2, VIGNETTE_KEY).setDepth(19.55).setScrollFactor(0)
        .setTint(0x9a0606).setDisplaySize(W * 1.12, H * 1.12).setVisible(false);
    }
    this.overlay = s.add.graphics().setDepth(19.6).setScrollFactor(0);
    this.hands = s.add.graphics().setDepth(19.7).setScrollFactor(0);
    if (s.textures.exists(GRAIN_KEY)) {
      this.grain = s.add.tileSprite(W / 2, H / 2, W, H, GRAIN_KEY).setDepth(19.8).setScrollFactor(0).setAlpha(0.09);
      this.grain.setTileScale(2, 2);
    }
    this.timerText = s.add.text(W / 2, 51, '', {
      fontSize: '16px', fontFamily: FONT_SERIF, fontStyle: 'italic', color: '#cfc8b4',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(19.9).setScrollFactor(0);
  }

  /** Hides and frees every object. */
  close(): void {
    if (!this.opened) return;
    this.opened = false;
    this.scenery?.destroy(); this.scenery = null;
    this.figure?.destroy(); this.figure = null;
    this.sprite?.destroy(); this.sprite = null;
    this.occluder?.destroy(); this.occluder = null;
    this.vignette?.destroy(); this.vignette = null;
    this.pulse?.destroy(); this.pulse = null;
    this.overlay?.destroy(); this.overlay = null;
    this.hands?.destroy(); this.hands = null;
    this.grain?.destroy(); this.grain = null;
    this.timerText?.destroy(); this.timerText = null;
  }

  destroy(): void { this.close(); }

  /** The vignette and the grain are drawn once into canvas textures (no image assets). */
  private ensureTextures(): void {
    const tx = this.scene.textures;
    try {
      if (!tx.exists(VIGNETTE_KEY)) {
        const ct = tx.createCanvas(VIGNETTE_KEY, 256, 256);
        if (ct) {
          const ctx = ct.getContext();
          const gr = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
          gr.addColorStop(0, 'rgba(255,255,255,0)');
          gr.addColorStop(0.24, 'rgba(255,255,255,0)');
          gr.addColorStop(0.42, 'rgba(255,255,255,0.32)');
          gr.addColorStop(0.6, 'rgba(255,255,255,0.72)');
          gr.addColorStop(0.8, 'rgba(255,255,255,0.95)');
          gr.addColorStop(1, 'rgba(255,255,255,1)');
          ctx.fillStyle = gr;
          ctx.fillRect(0, 0, 256, 256);
          ct.refresh();
          ct.setFilter(Phaser.Textures.FilterMode.LINEAR);
        }
      }
      if (!tx.exists(GRAIN_KEY)) {
        const ct = tx.createCanvas(GRAIN_KEY, 128, 128);
        if (ct) {
          const ctx = ct.getContext();
          const img = ctx.createImageData(128, 128);
          for (let i = 0; i < img.data.length; i += 4) {
            const v = Math.random() < 0.5 ? 0 : 255;
            img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
            img.data[i + 3] = Math.floor(Math.random() * 200);
          }
          ctx.putImageData(img, 0, 0);
          ct.refresh();
        }
      }
    } catch {
      // No canvas (headless harness): the frame still renders, just without the vignette and grain.
    }
  }

  // ── Light ──────────────────────────────────────────────────────────────────

  /** 0..1 light reaching something `d` tiles away. Black fog, so this is the fog too. */
  private fog(d: number): number {
    if (this.hunterView) {
      const p = 1 - d / RANGE_HUNTER;
      return p <= 0 ? 0 : Math.pow(p, 1.2) * 0.56;
    }
    const p = 1 - d / RANGE_VICTIM;
    return p <= 0 ? 0 : Math.pow(p, 1.3) / (1 + 0.15 * d * d);
  }

  private lit(r: number, g: number, b: number, l: number): number {
    const R = Math.min(255, r * l * this.tr) | 0;
    const Gc = Math.min(255, g * l * this.tg) | 0;
    const B = Math.min(255, b * l * this.tb) | 0;
    return (R << 16) | (Gc << 8) | B;
  }

  /** The flashlight's output, 0..1: a shimmer always, dropouts that worsen with dread, blackouts near 1. */
  private flicker(t: number, dread: number): number {
    const d = Phaser.Math.Clamp(dread, 0, 1);
    let L = 1 - 0.05 * hash(Math.floor(t * 30), 1, 7);
    L *= 1 - d * 0.28 * (0.5 + 0.5 * Math.sin(t * 23 + Math.sin(t * 7.3) * 2));
    const slot = Math.floor(t / 0.11);
    const h = hash(slot, 3, 11);
    if (h < 0.016 + d * d * 0.34) {
      L *= 0.12 + 0.4 * hash(slot, 5, 13);
      if (d > 0.7 && hash(slot, 9, 17) < (d - 0.7) * 2.2) L = 0;
    }
    if (d > 0.4 && hash(Math.floor(t * 60), 2, 19) < (d - 0.4) * 0.5) L *= 0.55;
    return L;
  }

  // ── Frame ──────────────────────────────────────────────────────────────────

  render(frame: MazeViewFrame): void {
    const g = this.scenery;
    if (!this.opened || !g || !this.figure || !this.occluder || !this.overlay || !this.hands) return;
    const { W, H } = this;
    const hunter = frame.role === 'hunter';
    this.role = frame.role;
    this.hunterView = hunter;
    this.tr = 1; this.tg = hunter ? 0.7 : 0.95; this.tb = hunter ? 0.68 : 0.8;
    const dt = this.lastT < 0 ? 0 : Phaser.Math.Clamp(frame.t - this.lastT, 0, 0.1);
    this.lastT = frame.t;
    const dread = Phaser.Math.Clamp(frame.dread, 0, 1);
    const t = frame.t;
    const eye = hunter ? EYE_HUNTER : EYE_VICTIM;
    const range = hunter ? RANGE_HUNTER : RANGE_VICTIM;
    const step = Math.abs(Math.sin(frame.bob));
    // The hunter's tread is heavy and slow: a deep drop on every footfall.
    const HY = H * 0.5 + (hunter ? step * 13 - 5 : step * 5 - 2);
    const F = (W / 2) / Math.tan(FOV / 2);
    const ca = Math.cos(frame.yaw);
    const sa = Math.sin(frame.yaw);
    const L = hunter ? 1 : this.flicker(t, dread);

    g.clear();
    g.fillStyle(0x000000, 1);
    g.fillRect(0, 0, W, H);
    this.paintFloorAndCeiling(g, HY, F, eye);
    this.paintPuddles(g, frame, HY, F, eye, ca, sa, range);
    this.paintBlood(g, frame, HY, F, eye, ca, sa, range);
    if (!hunter) {
      // The flashlight's pool on the wet floor.
      g.fillStyle(this.lit(210, 205, 180, 1), 0.045);
      g.fillEllipse(W / 2, HY + (H - HY) * 0.66, 460, 130);
      g.fillStyle(this.lit(230, 225, 200, 1), 0.04);
      g.fillEllipse(W / 2, HY + (H - HY) * 0.6, 240, 60);
    }
    this.castWalls(frame, HY, F, eye, ca, sa, range);
    let last = -1;
    for (let c = 0; c < COLS; c++) last = this.drawColumn(g, c, last);

    this.paintOther(frame, HY, F, eye, ca, sa, L);
    this.paintLens(frame, hunter, dread, L, dt);
    this.paintHands(frame, hunter, L);

    if (this.grain) this.grain.setTilePosition(Math.floor(Math.random() * 128), Math.floor(Math.random() * 128));
    if (this.timerText) {
      const secs = Math.max(0, Math.ceil(frame.timeLeftMs / 1000));
      const label = `${hunter ? 'hunt' : 'survive'}  ${secs}s`;
      if (label !== this.timerShown) {
        this.timerShown = label;
        this.timerText.setText(label);
        this.timerText.setColor(hunter ? '#c99a94' : '#cfc8b4');
      }
    }
  }

  private paintFloorAndCeiling(g: G, HY: number, F: number, eye: number): void {
    const { W, H } = this;
    const BAND = 8;
    for (let y = Math.ceil(HY); y < H; y += BAND) {
      const l = this.fog((eye * F) / (y + BAND / 2 - HY));
      if (l < 0.012) continue;
      g.fillStyle(this.lit(74, 68, 56, l), 1);
      g.fillRect(0, y, W, BAND);
    }
    for (let y = Math.floor(HY) - BAND; y > -BAND; y -= BAND) {
      const l = this.fog(((WALL_H - eye) * F) / (HY - (y + BAND / 2))) * 0.7;
      if (l < 0.012) continue;
      g.fillStyle(this.lit(62, 64, 56, l), 1);
      g.fillRect(0, y, W, BAND);
    }
  }

  /** A disc lying on the floor at (wx,wy), radius r — returns false when not drawable. */
  private floorDisc(
    g: G, wx: number, wy: number, r: number, frame: MazeViewFrame,
    HY: number, F: number, eye: number, ca: number, sa: number,
    color: number, alpha: number, lift = 0,
  ): boolean {
    const dx = wx - frame.x;
    const dy = wy - frame.y;
    const z = dx * ca + dy * sa;
    if (z < 0.22) return false;
    const s = -dx * sa + dy * ca;
    const half = (r * F) / z;
    const sx = this.W / 2 + (s / z) * F;
    if (sx + half < 0 || sx - half > this.W) return false;
    const yNear = HY + (eye * F) / Math.max(0.2, z - r);
    const yFar = HY + (eye * F) / (z + r);
    g.fillStyle(color, alpha);
    g.fillEllipse(sx, (yNear + yFar) / 2 - lift * (yNear - yFar), half * 2, Math.max(1.5, yNear - yFar));
    return true;
  }

  private paintPuddles(g: G, frame: MazeViewFrame, HY: number, F: number, eye: number, ca: number, sa: number, range: number): void {
    const R = Math.ceil(range);
    const cx = Math.floor(frame.x);
    const cy = Math.floor(frame.y);
    for (let ty = cy - R; ty <= cy + R; ty++) {
      for (let tx = cx - R; tx <= cx + R; tx++) {
        const h = hash(tx, ty, 31);
        if (h > 0.3 || frame.maze.isWall(tx, ty)) continue;
        const wx = tx + 0.3 + 0.4 * hash(tx, ty, 37);
        const wy = ty + 0.3 + 0.4 * hash(tx, ty, 41);
        const l = this.fog(Math.hypot(wx - frame.x, wy - frame.y));
        if (l < 0.02) continue;
        const r = 0.13 + 0.15 * hash(tx, ty, 43);
        if (!this.floorDisc(g, wx, wy, r, frame, HY, F, eye, ca, sa, this.lit(26, 34, 38, l), 0.9)) continue;
        const shimmer = 0.24 + 0.1 * Math.sin(frame.t * 2.1 + h * 40);
        this.floorDisc(g, wx, wy, r * 0.55, frame, HY, F, eye, ca, sa, this.lit(190, 205, 205, l), shimmer, 0.18);
      }
    }
  }

  private paintBlood(g: G, frame: MazeViewFrame, HY: number, F: number, eye: number, ca: number, sa: number, range: number): void {
    const b = frame.blood;
    for (let i = Math.max(0, b.length - MAX_BLOOD); i < b.length; i++) {
      const p = b[i];
      const d = Math.hypot(p.x - frame.x, p.y - frame.y);
      if (d > range) continue;
      const l = this.fog(d);
      if (l < 0.015) continue;
      const h = hash(i, 51, 3);
      // Blood reads redder than anything else down here, even at the edge of the light.
      const col = this.lit(150, 8, 10, Math.min(1, l * 1.5));
      this.floorDisc(g, p.x, p.y, 0.1 + 0.08 * h, frame, HY, F, eye, ca, sa, col, 0.92);
      const a = h * Math.PI * 2;
      this.floorDisc(g, p.x + Math.cos(a) * 0.13, p.y + Math.sin(a) * 0.13, 0.04 + 0.04 * h, frame, HY, F, eye, ca, sa, col, 0.85);
    }
  }

  /** One DDA ray per column; fills the depth buffer and the strip + detail tables. */
  private castWalls(frame: MazeViewFrame, HY: number, F: number, eye: number, ca: number, sa: number, range: number): void {
    const { H } = this;
    const maze = frame.maze;
    const tanHalf = Math.tan(FOV / 2);
    const plX = -sa * tanHalf;
    const plY = ca * tanHalf;
    const px = frame.x;
    const py = frame.y;
    const hunter = this.hunterView;
    const limit = range + 0.6;
    const { zbuf, colY, colH, colC, detY, detH, detC } = this;
    for (let c = 0; c < COLS; c++) {
      const camX = (2 * (c + 0.5)) / COLS - 1;
      const rdx = ca + plX * camX;
      const rdy = sa + plY * camX;
      let mapX = Math.floor(px);
      let mapY = Math.floor(py);
      const deltaX = rdx === 0 ? 1e30 : Math.abs(1 / rdx);
      const deltaY = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
      const stepX = rdx < 0 ? -1 : 1;
      const stepY = rdy < 0 ? -1 : 1;
      let sideX = rdx < 0 ? (px - mapX) * deltaX : (mapX + 1 - px) * deltaX;
      let sideY = rdy < 0 ? (py - mapY) * deltaY : (mapY + 1 - py) * deltaY;
      let side = 0;
      let perp = 0;
      let hit = false;
      for (let i = 0; i < 40; i++) {
        if (sideX < sideY) { perp = sideX; sideX += deltaX; mapX += stepX; side = 0; }
        else { perp = sideY; sideY += deltaY; mapY += stepY; side = 1; }
        if (perp > limit) break;
        if (maze.isWall(mapX, mapY)) { hit = true; break; }
      }
      const d0 = c * 3;
      detH[d0] = 0; detH[d0 + 1] = 0; detH[d0 + 2] = 0;
      if (!hit) { zbuf[c] = 1e9; colH[c] = 0; continue; }
      if (perp < 0.02) perp = 0.02;
      zbuf[c] = perp;
      const stripH = (WALL_H * F) / perp;
      const top = HY - ((WALL_H - eye) * F) / perp;
      const bot = top + stripH;
      let u = side === 0 ? py + perp * rdy : px + perp * rdx;
      u -= Math.floor(u);
      const tileSeed = mapX * 131 + mapY * 7919 + side * 17;
      const hA = hash(tileSeed, Math.floor(u * 10), 1);
      const hB = hash(tileSeed, Math.floor(u * 40), 2);
      let l = this.fog(perp) * (side === 1 ? 0.72 : 1) * (0.8 + 0.2 * hash(mapX, mapY, 3));
      if (!hunter) l *= 0.3 + 0.7 * Math.exp(-camX * camX * 3);
      if (u < 0.025 || u > 0.975) l *= 0.55;      // the joint between two blocks
      if (hB < 0.13) l *= 0.68;                    // a thin run of water down the stone
      const y0 = top < 0 ? 0 : top;
      const y1 = bot > H ? H : bot;
      colY[c] = y0;
      colH[c] = y1 - y0;
      colC[c] = this.lit(120, 122, 108, l);
      if (l < 0.02) continue;
      const put = (k: number, y: number, h: number, col: number): void => {
        const a = y < 0 ? 0 : y;
        const e = y + h > H ? H : y + h;
        if (e - a <= 0) return;
        detY[d0 + k] = a; detH[d0 + k] = e - a; detC[d0 + k] = col;
      };
      // Damp rising from the floor: a dark, ragged tide line.
      const tide = (0.1 + 0.07 * hA + 0.025 * hB) * stripH;
      put(0, bot - tide, tide, this.lit(42, 54, 50, l * 0.9));
      // Mould: a streak hanging from the ceiling line, or a pale fuzzy bloom mid-wall.
      if (hA < 0.42) {
        put(1, top, (0.12 + (hA / 0.42) * 0.68 + (hB - 0.5) * 0.09) * stripH, this.lit(44, 74, 38, l));
      } else if (hA < 0.56) {
        put(1, top + (0.22 + hB * 0.34) * stripH, 0.1 * stripH, this.lit(124, 138, 94, l * 0.8));
      }
      // A drip, falling the height of the wall.
      if (hash(tileSeed, Math.floor(u * 40), 5) < 0.07) {
        const fall = (frame.t * 0.3 + hB * 7) % 1;
        put(2, top + fall * fall * (stripH - tide), Math.max(2, stripH * 0.016), this.lit(190, 208, 204, Math.min(1, l * 1.3)));
      }
    }
  }

  /** Paints column `c`; `last` is the fill colour already set (−1 = none). Returns the new one. */
  private drawColumn(g: G, c: number, last: number): number {
    const h = this.colH[c];
    if (h <= 0) return last;
    const cw = this.W / COLS;
    const x = c * cw;
    if (this.colC[c] !== last) { last = this.colC[c]; g.fillStyle(last, 1); }
    g.fillRect(x, this.colY[c], cw, h);
    for (let k = 0; k < 3; k++) {
      const i = c * 3 + k;
      if (this.detH[i] <= 0) continue;
      last = this.detC[i];
      g.fillStyle(last, 1);
      g.fillRect(x, this.detY[i], cw, this.detH[i]);
    }
    return last;
  }

  // ── The other party ────────────────────────────────────────────────────────

  private paintOther(frame: MazeViewFrame, HY: number, F: number, eye: number, ca: number, sa: number, L: number): void {
    const fg = this.figure!;
    const oc = this.occluder!;
    fg.clear();
    oc.clear();
    let spriteOn = false;
    const o = frame.other;
    if (o) {
      const dx = o.x - frame.x;
      const dy = o.y - frame.y;
      const z = dx * ca + dy * sa;
      if (z > 0.1) {
        const { W } = this;
        const s = -dx * sa + dy * ca;
        const zc = Math.max(z, 0.3);
        const scale = F / zc;
        const sx = W / 2 + (s / z) * F;
        const feet = HY + eye * scale;
        const cw = W / COLS;
        const hunter = this.hunterView;
        const halfW = (hunter ? 0.5 : 0.82) * scale;
        const c0 = Math.max(0, Math.floor((sx - halfW) / cw));
        const c1 = Math.min(COLS - 1, Math.ceil((sx + halfW) / cw));
        let seen = false;
        for (let c = c0; c <= c1; c++) if (this.zbuf[c] > z) { seen = true; break; }
        if (seen) {
          let drawn = false;
          if (hunter) {
            // The victim: a pale bloom of flashlight first — it carries further than the murk does.
            const dist = Math.hypot(dx, dy);
            const vL = this.flicker(frame.t + 3.7, frame.dread);
            const bloom = Math.max(0, 1 - dist / BLOOM_RANGE) * (0.25 + 0.75 * vL);
            if (bloom > 0.01) {
              drawn = true;
              const cy = feet - 0.3 * scale;
              for (let i = 0; i < 5; i++) {
                const k = 1 - i / 5;
                fg.fillStyle(0xe8e2c2, 0.075 * bloom * (1 + i * 0.5));
                fg.fillEllipse(sx, cy, 0.9 * scale * k, 0.6 * scale * k);
              }
            }
            const l = Math.max(this.fog(z), bloom * 0.3);
            if (l > 0.012) {
              drawn = true;
              if (o.textureKey && this.scene.textures.exists(o.textureKey)) {
                const im = this.sprite ?? (this.sprite = this.scene.add.image(0, 0, o.textureKey).setDepth(19.32).setScrollFactor(0));
                if (im.texture.key !== o.textureKey) im.setTexture(o.textureKey);
                const aspect = im.height > 0 ? im.width / im.height : 1;
                const hpx = VICTIM_HEIGHT * scale;
                im.setOrigin(0.5, 1).setPosition(sx, feet).setDisplaySize(hpx * aspect, hpx);
                const v = Math.min(255, l * 300);
                im.setTint(((v | 0) << 16) | ((v * 0.78) << 8) | ((v * 0.74) | 0));
                im.setVisible(true);
                spriteOn = true;
              } else {
                this.paintCowerer(fg, sx, feet, scale, l);
              }
            }
          } else {
            const camX = (sx - W / 2) / (W / 2);
            const l = this.fog(z) * (0.3 + 0.7 * Math.exp(-camX * camX * 3));
            if (l > 0.008) {
              drawn = true;
              const facing = Math.cos(o.yaw) * -dx + Math.sin(o.yaw) * -dy > -0.15 * Math.hypot(dx, dy);
              this.paintSlasher(fg, sx, feet, scale, l, facing, frame.t);
            }
          }
          // The depth test: wall columns nearer than the billboard go back on top of it.
          if (drawn) {
            let last = -1;
            for (let c = c0; c <= c1; c++) if (this.zbuf[c] <= z) last = this.drawColumn(oc, c, last);
          }
        }
      }
    }
    if (this.sprite && !spriteOn) this.sprite.setVisible(false);
    void L;
  }

  /**
   * The hunter, as the victim sees him. `sx, fy` are his feet on screen, `S` px per maze unit.
   * A hulking man in a torn coat: bare ribs through the chest, a blank pale mask, a giant machete
   * over one shoulder, and a body bag dragged from the other hand.
   */
  private paintSlasher(g: G, sx: number, fy: number, S: number, l: number, facing: boolean, t: number): void {
    const sway = Math.sin(t * 2.1) * 0.014;
    const heave = Math.sin(t * 1.3) * 0.004;
    const X = (u: number, v: number): number => sx + (u + sway * v * 1.4) * S;
    const Y = (v: number): number => fy - v * S;
    const poly = (col: number, pts: number[], alpha = 1): void => {
      const out: { x: number; y: number }[] = [];
      for (let i = 0; i < pts.length; i += 2) out.push({ x: X(pts[i], pts[i + 1]), y: Y(pts[i + 1]) });
      g.fillStyle(col, alpha);
      g.fillPoints(out, true);
    };
    const oval = (col: number, u: number, v: number, w: number, h: number, alpha = 1): void => {
      g.fillStyle(col, alpha);
      g.fillEllipse(X(u, v), Y(v), w * S, h * S);
    };
    const limb = (col: number, u0: number, v0: number, u1: number, v1: number, w: number): void => {
      const px = Math.max(1, w * S);
      g.lineStyle(px, col, 1);
      g.lineBetween(X(u0, v0), Y(v0), X(u1, v1), Y(v1));
      g.fillStyle(col, 1);
      g.fillCircle(X(u0, v0), Y(v0), px / 2);
      g.fillCircle(X(u1, v1), Y(v1), px / 2);
    };
    const line = (col: number, u0: number, v0: number, u1: number, v1: number, w: number, alpha = 1): void => {
      g.lineStyle(Math.max(1, w * S), col, alpha);
      g.lineBetween(X(u0, v0), Y(v0), X(u1, v1), Y(v1));
    };
    // His right hand holds the machete: screen-left when he faces us, screen-right from behind.
    const k = facing ? -1 : 1;
    const coat = this.lit(44, 39, 34, l);
    const coatDark = this.lit(26, 23, 20, l);
    const trousers = this.lit(32, 29, 26, l);
    const boot = this.lit(14, 13, 12, l);
    const skin = this.lit(138, 128, 112, l);
    const skinDark = this.lit(92, 84, 74, l);
    const flesh = this.lit(84, 12, 14, l);
    const cavity = this.lit(26, 3, 5, l);
    const bone = this.lit(224, 216, 190, Math.min(1, l * 1.25));
    const steel = this.lit(96, 102, 104, l);
    const edge = this.lit(196, 202, 198, Math.min(1, l * 1.2));
    const gore = this.lit(120, 10, 12, l);
    const bagCol = this.lit(30, 30, 35, l);
    const bagHi = this.lit(62, 62, 70, l);
    // The mask stays just visible when everything else has gone to fog.
    const mask = this.lit(226, 220, 200, Math.min(1, l * 1.7 + 0.05));
    const maskShade = this.lit(150, 146, 132, Math.min(1, l * 1.7 + 0.03));

    const bag = (): void => {
      const bu = -k * (facing ? 0.46 : 0.4);
      const bw = facing ? 0.5 : 0.62;
      const bh = facing ? 0.16 : 0.2;
      const bv = bh * 0.5;
      oval(this.lit(70, 6, 8, l), bu + k * 0.06, 0.012, bw * 1.05, 0.03, 0.8);   // what it leaks
      oval(bagCol, bu, bv, bw, bh);
      oval(bagHi, bu - k * 0.05, bv + bh * 0.2, bw * 0.55, bh * 0.22, 0.55);
      oval(bagCol, bu - k * bw * 0.34, bv + 0.01, bw * 0.3, bh * 1.12);            // the head end
      line(bagHi, bu - bw * 0.36, bv + bh * 0.08, bu + bw * 0.36, bv + bh * 0.02, 0.006, 0.8); // zip
      line(coatDark, bu - bw * 0.12, bv - bh * 0.4, bu - bw * 0.1, bv + bh * 0.45, 0.014);     // straps
      line(coatDark, bu + bw * 0.16, bv - bh * 0.42, bu + bw * 0.18, bv + bh * 0.42, 0.014);
      // The rope from his fist to the bag's neck.
      line(this.lit(96, 84, 60, l), -k * 0.32, 0.32, bu + k * bw * 0.4, bv + bh * 0.3, 0.012);
    };
    const machete = (): void => {
      const ax = k * 0.2;
      const av = 0.615;
      const bx = k * 0.46;
      const bvv = 0.875;
      const len = Math.hypot(bx - ax, bvv - av);
      const ux = (bx - ax) / len;
      const uv = (bvv - av) / len;
      const nx = -uv;
      const nv = ux;
      const w = 0.042;
      limb(this.lit(48, 32, 20, l), ax - ux * 0.07, av - uv * 0.07, ax + ux * 0.03, av + uv * 0.03, 0.03); // grip
      poly(steel, [
        ax + nx * w * 0.7, av + nv * w * 0.7,
        bx - ux * 0.07 + nx * w, bvv - uv * 0.07 + nv * w,
        bx + nx * w * 0.1, bvv + nv * w * 0.1,
        bx - ux * 0.02 - nx * w, bvv - uv * 0.02 - nv * w,
        ax - nx * w * 0.7, av - nv * w * 0.7,
      ]);
      line(edge, ax - nx * w * 0.66, av - nv * w * 0.66, bx - ux * 0.02 - nx * w * 0.96, bvv - uv * 0.02 - nv * w * 0.96, 0.008);
      poly(gore, [
        bx - ux * 0.2 - nx * w, bvv - uv * 0.2 - nv * w,
        bx - ux * 0.02 - nx * w, bvv - uv * 0.02 - nv * w,
        bx + nx * w * 0.1, bvv + nv * w * 0.1,
        bx - ux * 0.11 + nx * w * 0.2, bvv - uv * 0.11 + nv * w * 0.2,
      ], 0.85);
    };

    // Shadow under him.
    oval(0x000000, 0, 0.01, 0.6, 0.05, 0.55);
    if (facing) { bag(); machete(); }

    // Legs and boots.
    const stride = Math.sin(t * 2.1) * 0.012;
    poly(trousers, [-0.16, 0.42, -0.015, 0.42, -0.03 + stride, 0.04, -0.15 + stride, 0.04]);
    poly(trousers, [0.015, 0.42, 0.16, 0.42, 0.15 - stride, 0.04, 0.03 - stride, 0.04]);
    poly(boot, [-0.17 + stride, 0.055, -0.02 + stride, 0.055, -0.015 + stride, 0, -0.18 + stride, 0]);
    poly(boot, [0.02 - stride, 0.055, 0.17 - stride, 0.055, 0.18 - stride, 0, 0.015 - stride, 0]);

    // The torso: a slab, wider at the shoulder than the corridor is comfortable with.
    const sh = 0.685 + heave;
    poly(coat, [-0.28, sh, 0.28, sh, 0.235, 0.52, 0.18, 0.38, -0.18, 0.38, -0.235, 0.52]);
    poly(coat, [-0.07, sh + 0.045, 0.07, sh + 0.045, 0.28, sh, -0.28, sh]);   // the trapezius hump
    oval(coat, -0.25, sh - 0.015, 0.15, 0.13);
    oval(coat, 0.25, sh - 0.015, 0.15, 0.13);
    poly(coatDark, [-0.18, 0.41, 0.18, 0.41, 0.19, 0.36, 0.1, 0.33, 0.03, 0.36, -0.08, 0.32, -0.19, 0.36]); // torn hem

    if (facing) {
      // The torn chest: skin at the edges, raw meat inside, then the bare ribs.
      const hole = [-0.125, 0.645, -0.04, 0.665, 0.05, 0.64, 0.135, 0.655, 0.155, 0.555, 0.115, 0.45, 0.03, 0.42, -0.06, 0.435, -0.135, 0.475, -0.155, 0.56];
      const rim: number[] = [];
      for (let i = 0; i < hole.length; i += 2) rim.push(hole[i] * 1.14, 0.545 + (hole[i + 1] - 0.545) * 1.13 + heave);
      const inner: number[] = [];
      for (let i = 0; i < hole.length; i += 2) inner.push(hole[i], hole[i + 1] + heave);
      poly(skin, rim);
      poly(flesh, inner);
      oval(cavity, 0, 0.535 + heave, 0.19, 0.17);
      for (let i = 0; i < 5; i++) {
        const v = 0.628 - i * 0.04 + heave;
        const reach = 0.128 - i * 0.007;
        for (const m of [-1, 1]) {
          line(bone, m * 0.012, v, m * reach * 0.6, v - 0.004, 0.017);
          line(bone, m * reach * 0.6, v - 0.004, m * reach, v - 0.026, 0.015);
        }
      }
      poly(bone, [-0.014, 0.648 + heave, 0.014, 0.648 + heave, 0.01, 0.455 + heave, -0.01, 0.455 + heave]); // sternum
      // Strips of coat hanging across the wound.
      poly(coatDark, [-0.125, 0.645, -0.09, 0.655, -0.1, 0.57, -0.13, 0.52]);
      poly(coatDark, [0.135, 0.655, 0.1, 0.648, 0.12, 0.55]);
      line(gore, 0.06, 0.43, 0.065, 0.37, 0.008, 0.8);
      line(gore, -0.04, 0.435, -0.042, 0.39, 0.006, 0.8);
    } else {
      line(coatDark, 0, sh + 0.03, 0.005, 0.39, 0.008);
      oval(coatDark, -0.08, 0.52, 0.12, 0.16, 0.5);
    }

    // The arm that drags the bag, hanging straight.
    limb(coat, -k * 0.285, sh - 0.03, -k * 0.325, 0.5, 0.1);
    limb(coat, -k * 0.325, 0.5, -k * 0.32, 0.37, 0.085);
    oval(skin, -k * 0.32, 0.325, 0.085, 0.09);
    line(skinDark, -k * 0.345, 0.33, -k * 0.295, 0.325, 0.006);
    // The machete arm: elbow out, fist up at the collarbone.
    limb(coat, k * 0.275, sh - 0.03, k * 0.365, 0.52, 0.105);
    limb(coat, k * 0.365, 0.52, k * 0.22, 0.6, 0.09);
    oval(skin, k * 0.2, 0.612, 0.09, 0.085);
    line(skinDark, k * 0.175, 0.63, k * 0.225, 0.6, 0.006);

    // Neck and head.
    poly(skinDark, [-0.055, sh + 0.02, 0.055, sh + 0.02, 0.048, sh + 0.075, -0.048, sh + 0.075]);
    const hv = 0.785 + heave;
    oval(this.lit(20, 18, 16, l), 0, hv + 0.005, 0.155, 0.175);
    if (facing) {
      oval(mask, 0, hv - 0.004, 0.118, 0.15);
      oval(maskShade, 0, hv - 0.05, 0.085, 0.045, 0.45);         // the hollow under the cheeks
      oval(0x000000, -0.028, hv + 0.012, 0.03, 0.02);
      oval(0x000000, 0.028, hv + 0.012, 0.03, 0.02);
      line(maskShade, 0.012, hv + 0.065, 0.03, hv + 0.03, 0.004, 0.7); // one hairline crack
    } else {
      line(mask, -0.07, hv, 0.07, hv, 0.01, 0.8);                // the mask's strap
    }

    if (!facing) { machete(); bag(); }
  }

  /** The victim without a texture: a small figure folded up against the dark. */
  private paintCowerer(g: G, sx: number, fy: number, S: number, l: number): void {
    const body = this.lit(86, 82, 96, l);
    const dark = this.lit(48, 46, 56, l);
    g.fillStyle(0x000000, 0.5);
    g.fillEllipse(sx, fy - 0.01 * S, 0.3 * S, 0.04 * S);
    g.fillStyle(body, 1);
    g.fillEllipse(sx, fy - 0.13 * S, 0.25 * S, 0.27 * S);
    g.fillStyle(dark, 1);
    g.fillEllipse(sx, fy - 0.05 * S, 0.27 * S, 0.1 * S);        // knees drawn up
    g.fillStyle(body, 1);
    g.fillCircle(sx + 0.01 * S, fy - 0.29 * S, 0.062 * S);
    const w = Math.max(1, 0.045 * S);
    g.lineStyle(w, dark, 1);                                     // arms over the head
    g.lineBetween(sx - 0.11 * S, fy - 0.2 * S, sx - 0.05 * S, fy - 0.35 * S);
    g.lineBetween(sx - 0.05 * S, fy - 0.35 * S, sx + 0.04 * S, fy - 0.36 * S);
    g.lineBetween(sx + 0.12 * S, fy - 0.2 * S, sx + 0.08 * S, fy - 0.34 * S);
  }

  // ── Lens: vignette, dropouts, the heartbeat ────────────────────────────────

  private paintLens(frame: MazeViewFrame, hunter: boolean, dread: number, L: number, dt: number): void {
    const { W, H } = this;
    const ov = this.overlay!;
    ov.clear();
    if (this.vignette) {
      if (hunter) {
        this.vignette.setPosition(W / 2, H / 2).setDisplaySize(W * 1.75, H * 1.75).setAlpha(0.92);
      } else {
        // The beam wanders a little with the hand that holds it.
        const wx = Math.cos(frame.bob) * 14 + Math.sin(frame.t * 0.9) * 5;
        const wy = Math.abs(Math.sin(frame.bob)) * 8 + Math.sin(frame.t * 1.3) * 3;
        const tight = 1.22 + (1 - L) * 0.1;
        this.vignette.setPosition(W / 2 + wx, H / 2 + 14 + wy).setDisplaySize(W * tight, H * tight * 1.12).setAlpha(1);
      }
    }
    if (!hunter && L < 0.995) {
      ov.fillStyle(0x000000, Math.min(1, (1 - L) * 0.97));
      ov.fillRect(0, 0, W, H);
    }
    if (this.pulse) {
      if (hunter && dread > 0.02) {
        // Heartbeat: lub-dub, quickening as the prey gets close.
        this.beat += dt * (0.85 + dread * 1.5);
        const ph = this.beat % 1;
        const p = Math.max(Math.exp(-ph * 9), 0.65 * Math.exp(-((ph + 0.74) % 1) * 11));
        this.pulse.setVisible(true).setAlpha(Math.min(0.85, dread * (0.14 + 0.62 * p)));
        const sc = 1.16 - p * 0.05 * dread;
        this.pulse.setDisplaySize(W * sc, H * sc);
      } else {
        this.pulse.setVisible(false);
      }
    }
  }

  // ── First-person hands ─────────────────────────────────────────────────────

  private paintHands(frame: MazeViewFrame, hunter: boolean, L: number): void {
    const g = this.hands!;
    g.clear();
    if (hunter) this.paintHunterHands(g, frame);
    else this.paintFlashlightHand(g, frame, L);
  }

  private paintFlashlightHand(g: G, frame: MazeViewFrame, L: number): void {
    const { W, H } = this;
    const hl = 0.22 + 0.5 * L;
    const bx = W * 0.6 + Math.cos(frame.bob) * 9 + Math.sin(frame.t * 0.9) * 2;
    const by = H - 6 + Math.abs(Math.sin(frame.bob)) * 9 + Math.sin(frame.t * 1.3) * 2;
    const P = (pts: number[]): { x: number; y: number }[] => {
      const out: { x: number; y: number }[] = [];
      for (let i = 0; i < pts.length; i += 2) out.push({ x: bx + pts[i], y: by + pts[i + 1] });
      return out;
    };
    const sleeve = this.lit(40, 44, 56, hl);
    const sleeveDark = this.lit(24, 26, 34, hl);
    const skin = this.lit(176, 138, 112, hl);
    const skinDark = this.lit(112, 84, 68, hl);
    const metal = this.lit(64, 66, 72, hl);
    const metalHi = this.lit(120, 124, 130, hl);
    const metalDark = this.lit(30, 31, 35, hl);
    // Forearm, coming up from the bottom right.
    g.fillStyle(sleeve, 1);
    g.fillPoints(P([44, 40, 150, 40, 84, -62, 22, -44]), true);
    g.fillStyle(sleeveDark, 1);
    g.fillPoints(P([112, 40, 150, 40, 84, -62, 70, -56]), true);
    g.fillPoints(P([20, -40, 86, -60, 80, -72, 16, -52]), true);   // cuff
    // The flashlight: barrel toward the middle of the screen, the head flaring at the far end.
    g.fillStyle(metal, 1);
    g.fillPoints(P([28, -42, 66, -60, 12, -150, -20, -136]), true);
    g.fillStyle(metalHi, 1);
    g.fillPoints(P([58, -62, 66, -60, 12, -150, 6, -150]), true);
    g.fillStyle(metalDark, 1);
    g.fillPoints(P([-28, -132, 20, -154, 4, -186, -42, -164]), true);
    g.lineStyle(2, metalHi, 0.7);
    g.lineBetween(bx - 28, by - 132, bx + 20, by - 154);
    // Spill from the lens, seen from behind it.
    if (L > 0.03) {
      g.fillStyle(0xfff2c4, 0.1 * L);
      g.fillEllipse(bx - 22, by - 182, 120, 62);
      g.fillStyle(0xfff6d8, 0.2 * L);
      g.fillEllipse(bx - 20, by - 178, 62, 26);
    }
    // Fingers wrapped over the barrel, thumb along it.
    g.fillStyle(skin, 1);
    g.fillEllipse(bx + 42, by - 66, 62, 54);
    for (let i = 0; i < 4; i++) {
      const fx = bx + 16 + i * 9;
      const fy = by - 62 - i * 15;
      g.fillStyle(skin, 1);
      g.fillEllipse(fx, fy, 30, 15);
      g.lineStyle(1.5, skinDark, 0.8);
      g.lineBetween(fx - 12, fy + 7, fx + 12, fy + 5);
    }
    g.fillStyle(skin, 1);
    g.fillEllipse(bx + 58, by - 98, 18, 44);
    g.fillStyle(skinDark, 1);
    g.fillEllipse(bx + 58, by - 116, 10, 9);
  }

  private paintHunterHands(g: G, frame: MazeViewFrame): void {
    const { W, H } = this;
    // Heavy and slow: everything drops with each footfall and rolls with the shoulders.
    const ox = Math.cos(frame.bob) * 10;
    const oy = Math.abs(Math.sin(frame.bob)) * 16 + Math.sin(frame.t * 0.9) * 3;
    const dim = 0.5;
    const skin = this.lit(140, 130, 116, dim);
    const skinDark = this.lit(78, 70, 62, dim);
    const coat = this.lit(44, 39, 34, dim);
    const coatDark = this.lit(24, 21, 19, dim);
    const steel = this.lit(92, 98, 100, dim);
    const steelDark = this.lit(50, 54, 56, dim);
    const edge = this.lit(190, 196, 192, dim);
    const gore = this.lit(140, 10, 12, dim);
    const wood = this.lit(58, 38, 22, dim);
    const P = (dx: number, dy: number, pts: number[]): { x: number; y: number }[] => {
      const out: { x: number; y: number }[] = [];
      for (let i = 0; i < pts.length; i += 2) out.push({ x: pts[i] + dx, y: pts[i + 1] + dy });
      return out;
    };

    // ── Right: the machete lying back over the shoulder ──
    const rx = ox;
    const ry = oy;
    const p0x = W - 188;
    const p0y = H - 176;
    const p1x = W + 70;
    const p1y = 70;
    const len = Math.hypot(p1x - p0x, p1y - p0y);
    const ux = (p1x - p0x) / len;
    const uy = (p1y - p0y) / len;
    const nx = -uy;
    const ny = ux;
    // The shoulder it rests on, a dark mass in the corner.
    g.fillStyle(coatDark, 1);
    g.fillEllipse(W - 20 + rx, H - 30 + ry, 330, 250);
    g.fillStyle(coat, 1);
    g.fillEllipse(W - 6 + rx, H - 10 + ry, 280, 190);
    // Blade.
    g.fillStyle(steelDark, 1);
    g.fillPoints(P(rx, ry, [
      p0x + nx * 30, p0y + ny * 30, p1x + nx * 52, p1y + ny * 52,
      p1x - nx * 52, p1y - ny * 52, p0x - nx * 30, p0y - ny * 30,
    ]), true);
    g.fillStyle(steel, 1);
    g.fillPoints(P(rx, ry, [
      p0x + nx * 6, p0y + ny * 6, p1x + nx * 14, p1y + ny * 14,
      p1x - nx * 52, p1y - ny * 52, p0x - nx * 30, p0y - ny * 30,
    ]), true);
    g.lineStyle(3, edge, 0.9);
    g.lineBetween(p0x - nx * 29 + rx, p0y - ny * 29 + ry, p1x - nx * 51 + rx, p1y - ny * 51 + ry);
    // Old blood and pitting along the steel — hashed, so it never crawls.
    for (let i = 0; i < 9; i++) {
      const along = 0.12 + hash(i, 61, 1) * 0.8;
      const across = (hash(i, 67, 2) - 0.75) * 44;
      const cx = p0x + ux * len * along + nx * across + rx;
      const cy = p0y + uy * len * along + ny * across + ry;
      g.fillStyle(i % 3 === 0 ? steelDark : gore, i % 3 === 0 ? 0.7 : 0.6);
      g.fillEllipse(cx, cy, 14 + hash(i, 71, 3) * 34, 6 + hash(i, 73, 4) * 12);
    }
    // Grip and the fist around it.
    g.lineStyle(30, wood, 1);
    g.lineBetween(p0x + ux * 8 + rx, p0y + uy * 8 + ry, p0x - ux * 92 + rx, p0y - uy * 92 + ry);
    g.fillStyle(coat, 1);
    g.fillPoints(P(rx, ry, [W - 300, H + 30, W - 150, H + 30, W - 186, H - 96, W - 286, H - 104]), true);
    g.fillStyle(coatDark, 1);
    g.fillPoints(P(rx, ry, [W - 290, H - 96, W - 182, H - 88, W - 184, H - 106, W - 288, H - 116]), true);
    g.fillStyle(skin, 1);
    g.fillEllipse(W - 234 + rx, H - 138 + ry, 112, 92);
    for (let i = 0; i < 4; i++) {
      const kx = W - 268 + i * 24 + rx;
      const ky = H - 166 + i * 9 + ry;
      g.fillStyle(skin, 1);
      g.fillEllipse(kx, ky, 30, 26);
      g.lineStyle(2, skinDark, 0.8);
      g.lineBetween(kx - 10, ky + 11, kx + 10, ky + 13);
    }
    g.fillStyle(skinDark, 0.6);
    g.fillEllipse(W - 226 + rx, H - 112 + ry, 80, 26);

    // ── Left: the fist that drags the bag, rope running back out of frame ──
    const lx = -ox * 0.7;
    const ly = oy * 0.8 + Math.sin(frame.bob + 1.2) * 5;
    g.fillStyle(coat, 1);
    g.fillPoints(P(lx, ly, [70, H + 30, 230, H + 30, 214, H - 44, 112, H - 56]), true);
    g.fillStyle(coatDark, 1);
    g.fillPoints(P(lx, ly, [108, H - 48, 216, H - 36, 218, H - 54, 110, H - 66]), true);
    g.lineStyle(13, this.lit(104, 90, 62, dim), 1);
    g.lineBetween(168 + lx, H - 84 + ly, -30, H - 8 + ly * 0.4);
    g.fillStyle(skin, 1);
    g.fillEllipse(166 + lx, H - 84 + ly, 104, 84);
    for (let i = 0; i < 4; i++) {
      const kx = 130 + i * 24 + lx;
      const ky = H - 112 - i * 3 + ly;
      g.fillStyle(skin, 1);
      g.fillEllipse(kx, ky, 28, 24);
      g.lineStyle(2, skinDark, 0.8);
      g.lineBetween(kx - 9, ky + 10, kx + 9, ky + 11);
    }
  }
}
