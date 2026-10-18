import Phaser from 'phaser';
import { FONT_DISPLAY, hex, mix } from '../../ui';
import { Building, Pt, Rect, TownLayout, distToPolyline, mulberry32 } from './TownLayout';
import { TownTheme } from './TownTheme';
import { FLAT_PROPS, drawProp } from './TownProps';

/**
 * Draws a town from its layout.
 *
 * Static art is laid down once at create time:
 *   - the ground (terrain, roads, plaza, river/chasm, bridges, flat props, lamp pools) is
 *     baked into a single RenderTexture — one quad a frame no matter how busy the town is;
 *   - everything with height (buildings, tall props, lamps, signs) is its own Graphics at
 *     depth = its foot's y, so the walker sorts behind roofs and in front of doorsteps.
 *     Those are visibility-culled against the camera every frame by the scene.
 *
 * The only per-frame drawing is the small "fx" overlays — glowing doors, torches, the
 * sewer mist, portal swirls — and only for the ones on screen.
 */

type G = Phaser.GameObjects.Graphics;

const dk = (c: number, t: number) => mix(c, 0x000000, t);
const lt = (c: number, t: number) => mix(c, 0xffffff, t);

export type DoorState = 'locked' | 'open' | 'cleared';

export interface TownRenderState {
  fights: DoorState[];
  castle: DoorState;
  castleName: string;
  bossColor: number;
  gauntletDone: boolean;
  exits: { worldId: string; label: string; locked: boolean }[];
  portals: { at: Pt; label: string; color: number }[];
  amalgam?: { at: Pt; open: boolean; felled: boolean };
  worldColor: number;
}

export interface CullItem {
  obj: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible;
  x0: number; y0: number; x1: number; y1: number;
}

interface Fx {
  x0: number; y0: number; x1: number; y1: number;
  g: G;
  draw: (g: G, t: number) => void;
}

/** Depth bands. World objects sort by y in [0, H]. */
export const Z_GROUND = -10000;
export const Z_FLAT = -9000;
export const Z_OVERLAY = 8000;

export class TownRenderer {
  readonly cull: CullItem[] = [];
  private fx: Fx[] = [];
  private rng: () => number;

  constructor(
    private scene: Phaser.Scene,
    private L: TownLayout,
    private th: TownTheme,
    private st: TownRenderState,
    seed: number,
  ) {
    this.rng = mulberry32(seed);
    this.bakeGround();
    for (const b of L.buildings) this.drawBuilding(b);
    for (const p of L.props) {
      if (FLAT_PROPS.has(p.kind)) continue;
      const g = this.gfx(p.y);
      drawProp(g, p.kind, p.x, p.y, p.s, th, mulberry32(p.seed));
      this.addCull(g, p.x - 60, p.y - 120, p.x + 60, p.y + 20);
    }
    for (const l of L.lamps) this.drawLamp(l);
    this.drawPlaza();
    this.drawGauntlet();
    this.drawGrate();
    this.drawExits();
    for (const p of st.portals) this.drawPortal(p.at, p.label, p.color);
    if (st.amalgam) this.drawAmalgam(st.amalgam.at, st.amalgam.open, st.amalgam.felled);
  }

  // ── Infrastructure ─────────────────────────────────────────────────

  private gfx(depth: number): G {
    return this.scene.add.graphics().setDepth(depth);
  }

  private addCull(obj: CullItem['obj'], x0: number, y0: number, x1: number, y1: number): void {
    this.cull.push({ obj, x0, y0, x1, y1 });
  }

  private addFx(x0: number, y0: number, x1: number, y1: number, depth: number, draw: (g: G, t: number) => void): void {
    const g = this.gfx(depth);
    this.fx.push({ x0, y0, x1, y1, g, draw });
    this.addCull(g, x0, y0, x1, y1);
  }

  private label(x: number, y: number, text: string, depth: number, opts: {
    size?: number; color?: string; stroke?: string; font?: string; spacing?: number; wrap?: number;
  } = {}): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      fontSize: `${opts.size ?? 11}px`, fontFamily: opts.font ?? FONT_DISPLAY,
      color: opts.color ?? '#f2f2ff', stroke: opts.stroke ?? '#000000', strokeThickness: opts.stroke === '' ? 0 : 3,
      letterSpacing: opts.spacing ?? 1, align: 'center',
      wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    }).setOrigin(0.5).setDepth(depth);
    const w = t.width / 2 + 20, h = t.height / 2 + 20;
    this.addCull(t, x - w, y - h, x + w, y + h);
    return t;
  }

  /** Per-frame: animate the visible overlays. Culling is the scene's job. */
  update(time: number, view: Rect): void {
    const t = time / 1000;
    for (const f of this.fx) {
      if (f.x1 < view.x || f.x0 > view.x + view.w || f.y1 < view.y || f.y0 > view.y + view.h) continue;
      f.g.clear();
      f.draw(f.g, t);
    }
  }

  // ── Ground ─────────────────────────────────────────────────────────

  private bakeGround(): void {
    const { W, H } = this.L;
    const th = this.th;
    const r = this.rng;
    const g = this.scene.make.graphics({}, false);

    // Terrain.
    g.fillStyle(th.ground, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 160; i++) {
      g.fillStyle(th.groundAlt, 0.35 + r() * 0.5);
      g.fillEllipse(r() * W, r() * H, 80 + r() * 220, 40 + r() * 110);
    }
    for (let i = 0; i < 70; i++) {
      g.fillStyle(dk(th.ground, 0.25), 0.25 + r() * 0.3);
      g.fillEllipse(r() * W, r() * H, 60 + r() * 160, 30 + r() * 70);
    }
    for (let i = 0; i < 2200; i++) {
      g.fillStyle(th.groundSpeck, 0.08 + r() * 0.2);
      g.fillRect(r() * W, r() * H, 1 + r() * 2.5, 1 + r() * 1.5);
    }
    // Tufts / grit strokes give the ground a grain.
    const tuft = lt(th.groundAlt, 0.15);
    for (let i = 0; i < 900; i++) {
      const x = r() * W, y = r() * H;
      g.lineStyle(1, tuft, 0.35);
      g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x - 1, y - 5); g.moveTo(x, y); g.lineTo(x + 1, y - 6); g.moveTo(x + 3, y); g.lineTo(x + 4, y - 4); g.strokePath();
    }

    // Lamp pools first, so roads draw over most of them.
    for (const l of this.L.lamps) {
      for (let k = 3; k >= 1; k--) { g.fillStyle(th.glow, 0.035); g.fillCircle(l.x, l.y, 30 + k * 22); }
    }

    // Band under roads, bridges over both.
    if (this.L.band) this.drawBand(g);

    // Roads: edge casing, then fill, then paving.
    for (const rd of this.L.roads) this.road(g, rd.pts, rd.w + 12, th.streetEdge, 1);
    for (const rd of this.L.roads) this.road(g, rd.pts, rd.w, th.street, 1);
    for (const rd of this.L.roads) this.paving(g, rd.pts, rd.w);

    if (this.L.band) this.drawBridges(g);

    // Plaza paving.
    const P = this.L.plaza;
    g.fillStyle(th.streetEdge, 1); g.fillCircle(P.x, P.y, P.r + 10);
    g.fillStyle(lt(th.street, 0.06), 1); g.fillCircle(P.x, P.y, P.r);
    for (let k = 1; k <= 5; k++) {
      g.lineStyle(1.5, dk(th.street, 0.3), 0.6); g.strokeCircle(P.x, P.y, (P.r * k) / 5.4);
    }
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      g.lineStyle(1, dk(th.street, 0.3), 0.5);
      g.beginPath(); g.moveTo(P.x + Math.cos(a) * P.r * 0.2, P.y + Math.sin(a) * P.r * 0.2); g.lineTo(P.x + Math.cos(a) * P.r, P.y + Math.sin(a) * P.r); g.strokePath();
    }
    // Inlaid star in the world's colour.
    const wc = this.st.worldColor;
    g.fillStyle(wc, 0.35);
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? P.r * 0.62 : P.r * 0.24;
      const x = P.x + Math.cos(a) * rr, y = P.y + Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath(); g.fillPath();
    g.lineStyle(2, lt(wc, 0.3), 0.5); g.strokeCircle(P.x, P.y, P.r * 0.66);
    g.lineStyle(3, lt(th.street, 0.25), 0.5); g.strokeCircle(P.x, P.y, P.r - 4);

    // Flat props live in the ground.
    for (const p of this.L.props) {
      if (FLAT_PROPS.has(p.kind)) drawProp(g, p.kind, p.x, p.y, p.s, th, mulberry32(p.seed));
    }

    // Wild border: a dark, uneven treeline / rockline round the map, broken at each gate.
    const gateNear = (x: number, y: number): boolean =>
      this.L.exits.some((e) => Math.hypot(e.edge.x - x, e.edge.y - y) < 150);
    const borderC = dk(th.ground, 0.55);
    const edgeBlob = (x: number, y: number): void => {
      if (gateNear(x, y)) return;
      g.fillStyle(borderC, 0.85); g.fillEllipse(x, y, 70 + r() * 70, 50 + r() * 50);
      g.fillStyle(dk(th.groundAlt, 0.35), 0.6); g.fillEllipse(x + (r() - 0.5) * 30, y + (r() - 0.5) * 20, 40 + r() * 40, 30 + r() * 30);
    };
    for (let x = 0; x <= W; x += 46) { edgeBlob(x, r() * 26); edgeBlob(x, H - r() * 26); }
    for (let y = 0; y <= H; y += 46) { edgeBlob(r() * 26, y); edgeBlob(W - r() * 26, y); }
    // Edge falloff.
    for (let i = 0; i < 10; i++) {
      g.lineStyle(14, 0x000000, 0.06);
      g.strokeRect(i * 7, i * 7, W - i * 14, H - i * 14);
    }

    const rt = this.scene.add.renderTexture(0, 0, W, H).setOrigin(0, 0).setDepth(Z_GROUND);
    // The supersampling patch (render/SuperSample.ts) post-scales every camera that has a
    // camera manager by 2× — and a DynamicTexture's private camera gets one from the system
    // scene, so the ground would bake at double size. Detach it: this camera only ever
    // renders into the texture, at 1:1.
    (rt.camera as unknown as { cameraManager?: unknown }).cameraManager = undefined;
    rt.draw(g);
    g.destroy();
  }

  private road(g: G, pts: Pt[], w: number, color: number, alpha: number): void {
    g.fillStyle(color, alpha);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 0.5) continue;
      const nx = (-(b.y - a.y) / len) * (w / 2), ny = ((b.x - a.x) / len) * (w / 2);
      g.beginPath();
      g.moveTo(a.x + nx, a.y + ny); g.lineTo(b.x + nx, b.y + ny); g.lineTo(b.x - nx, b.y - ny); g.lineTo(a.x - nx, a.y - ny);
      g.closePath(); g.fillPath();
    }
    for (const p of pts) g.fillCircle(p.x, p.y, w / 2);
  }

  private walk(pts: Pt[], step: number, fn: (p: Pt, ux: number, uy: number, d: number) => void): void {
    let d = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 0.5) continue;
      const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      for (let s = 0; s < len; s += step) { fn({ x: a.x + ux * s, y: a.y + uy * s }, ux, uy, d); d += step; }
    }
  }

  private paving(g: G, pts: Pt[], w: number): void {
    const th = this.th, r = this.rng;
    const c = th.street, dark = dk(c, 0.28), light = lt(c, 0.12);
    const half = w / 2 - 5;
    const P = this.L.plaza;
    const inPlaza = (p: Pt) => Math.hypot(p.x - P.x, p.y - P.y) < P.r;
    switch (th.paving) {
      case 'cobble':
        this.walk(pts, 13, (p, ux, uy, d) => {
          if (inPlaza(p)) return;
          const off = (Math.round(d / 13) % 2) * 6;
          for (let k = -half + off; k <= half; k += 12) {
            const x = p.x - uy * k, y = p.y + ux * k;
            g.fillStyle(dark, 0.55); g.fillEllipse(x + 1, y + 1, 11, 9);
            g.fillStyle(r() < 0.5 ? light : c, 1); g.fillEllipse(x, y, 10, 8);
          }
        });
        break;
      case 'plank':
        this.walk(pts, 11, (p, ux, uy, d) => {
          if (inPlaza(p)) return;
          g.lineStyle(1.5, dark, 0.7);
          g.beginPath(); g.moveTo(p.x - uy * half, p.y + ux * half); g.lineTo(p.x + uy * half, p.y - ux * half); g.strokePath();
          if (Math.round(d / 11) % 3 === 0) {
            g.fillStyle(lt(c, 0.2), 0.25);
            g.beginPath(); g.moveTo(p.x - uy * half, p.y + ux * half); g.lineTo(p.x + uy * half, p.y - ux * half);
            g.lineTo(p.x + uy * half + ux * 10, p.y - ux * half + uy * 10); g.lineTo(p.x - uy * half + ux * 10, p.y + ux * half + uy * 10); g.closePath(); g.fillPath();
          }
          g.fillStyle(0x2a2420, 0.6); g.fillCircle(p.x - uy * (half - 4) + ux * 5, p.y + ux * (half - 4) + uy * 5, 1); g.fillCircle(p.x + uy * (half - 4) + ux * 5, p.y - ux * (half - 4) + uy * 5, 1);
        });
        break;
      case 'sand':
        this.walk(pts, 18, (p, ux, uy) => {
          if (inPlaza(p)) return;
          g.lineStyle(1, dark, 0.35);
          const k = (r() - 0.5) * w * 0.7;
          g.beginPath(); g.moveTo(p.x - uy * k - ux * 8, p.y + ux * k - uy * 8); g.lineTo(p.x - uy * (k + 6), p.y + ux * (k + 6)); g.lineTo(p.x - uy * k + ux * 8, p.y + ux * k + uy * 8); g.strokePath();
          if (r() < 0.3) { g.fillStyle(dk(c, 0.4), 0.6); g.fillCircle(p.x - uy * (r() - 0.5) * w * 0.8, p.y + ux * (r() - 0.5) * w * 0.8, 1.5); }
        });
        break;
      case 'ice':
        this.walk(pts, 26, (p, ux, uy) => {
          if (inPlaza(p)) return;
          g.lineStyle(2, 0xffffff, 0.35);
          const k = (r() - 0.5) * w * 0.6;
          g.beginPath(); g.moveTo(p.x - uy * k, p.y + ux * k); g.lineTo(p.x - uy * k + ux * 18, p.y + ux * k + uy * 18); g.strokePath();
          if (r() < 0.35) {
            g.lineStyle(1, dk(c, 0.35), 0.6);
            const cx = p.x - uy * (r() - 0.5) * w * 0.7, cy = p.y + ux * (r() - 0.5) * w * 0.7;
            g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 9, cy - 5); g.lineTo(cx + 14, cy + 2); g.moveTo(cx + 9, cy - 5); g.lineTo(cx + 11, cy - 12); g.strokePath();
          }
        });
        break;
      case 'slab':
        this.walk(pts, 34, (p, ux, uy, d) => {
          if (inPlaza(p)) return;
          g.lineStyle(1.5, dark, 0.65);
          g.beginPath(); g.moveTo(p.x - uy * half, p.y + ux * half); g.lineTo(p.x + uy * half, p.y - ux * half); g.strokePath();
          const k = (Math.round(d / 34) % 2 ? 0.15 : -0.2) * w;
          g.beginPath(); g.moveTo(p.x - uy * k, p.y + ux * k); g.lineTo(p.x - uy * k + ux * 34, p.y + ux * k + uy * 34); g.strokePath();
          if (r() < 0.25) { g.fillStyle(light, 0.4); g.fillRect(p.x - uy * k * 2 + ux * 8, p.y + ux * k * 2 + uy * 8, 10, 6); }
          if (r() < 0.15) { g.lineStyle(1, dk(c, 0.45), 0.6); g.beginPath(); g.moveTo(p.x + ux * 10, p.y + uy * 10); g.lineTo(p.x + ux * 18 - uy * 8, p.y + uy * 18 + ux * 8); g.strokePath(); }
        });
        break;
      case 'dirt':
        for (const off of [-0.25, 0.25]) {
          const rut = pts.map((p, i) => {
            const n = pts[Math.min(i + 1, pts.length - 1)], q = pts[Math.max(i - 1, 0)];
            const len = Math.hypot(n.x - q.x, n.y - q.y) || 1;
            return { x: p.x - ((n.y - q.y) / len) * w * off, y: p.y + ((n.x - q.x) / len) * w * off };
          });
          g.lineStyle(5, dark, 0.35); g.strokePoints(rut, false);
        }
        this.walk(pts, 9, (p, ux, uy) => {
          if (inPlaza(p) || r() > 0.6) return;
          const k = (r() - 0.5) * w * 0.9;
          g.fillStyle(r() < 0.5 ? dark : light, 0.6); g.fillCircle(p.x - uy * k, p.y + ux * k, 1 + r() * 2);
        });
        break;
      case 'tile':
        this.walk(pts, 16, (p, ux, uy, d) => {
          if (inPlaza(p)) return;
          let j = 0;
          for (let k = -half + 4; k <= half - 4; k += 16) {
            const x = p.x - uy * k, y = p.y + ux * k;
            const alt = (Math.round(d / 16) + j++) % 2 === 0;
            g.fillStyle(alt ? light : dk(c, 0.12), 1);
            g.beginPath(); g.moveTo(x + ux * 7, y + uy * 7); g.lineTo(x - uy * 7, y + ux * 7); g.lineTo(x - ux * 7, y - uy * 7); g.lineTo(x + uy * 7, y - ux * 7); g.closePath(); g.fillPath();
          }
        });
        break;
      case 'metal':
        this.walk(pts, 40, (p, ux, uy) => {
          if (inPlaza(p)) return;
          g.lineStyle(2, dark, 0.8);
          g.beginPath(); g.moveTo(p.x - uy * half, p.y + ux * half); g.lineTo(p.x + uy * half, p.y - ux * half); g.strokePath();
          for (const k of [-half + 6, half - 6]) {
            g.fillStyle(lt(c, 0.35), 0.8); g.fillCircle(p.x - uy * k + ux * 6, p.y + ux * k + uy * 6, 1.6); g.fillCircle(p.x - uy * k + ux * 34, p.y + ux * k + uy * 34, 1.6);
          }
          g.lineStyle(1, light, 0.35);
          for (let m = 10; m < 32; m += 7) {
            for (let k = -half + 12; k < half - 10; k += 10) {
              const x = p.x - uy * k + ux * m, y = p.y + ux * k + uy * m;
              g.beginPath(); g.moveTo(x - 2, y - 2); g.lineTo(x + 2, y + 2); g.strokePath();
            }
          }
        });
        break;
      case 'bone':
        this.walk(pts, 20, (p, ux, uy) => {
          if (inPlaza(p)) return;
          const k = (r() - 0.5) * w * 0.7;
          const x = p.x - uy * k, y = p.y + ux * k;
          g.lineStyle(2, 0xe8e0c8, 0.6); g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x + 5, y); g.strokePath();
          g.fillStyle(0xe8e0c8, 0.6); g.fillCircle(x - 5, y, 2); g.fillCircle(x + 5, y, 2);
        });
        break;
      case 'glass':
        this.walk(pts, 22, (p, ux, uy) => {
          if (inPlaza(p)) return;
          for (let k = -half + 8; k < half - 6; k += 22) {
            const x = p.x - uy * k, y = p.y + ux * k;
            g.fillStyle(r() < 0.5 ? light : dk(c, 0.1), 0.85);
            g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 10, y + 5); g.lineTo(x - 9, y + 6); g.closePath(); g.fillPath();
            if (r() < 0.3) { g.fillStyle(th.glow, 0.4); g.fillCircle(x + 1, y - 2, 1.5); }
          }
        });
        break;
    }
    // Kerb highlight.
    this.walk(pts, 6, (p, ux, uy) => {
      if (inPlaza(p)) return;
      g.fillStyle(lt(th.streetEdge, 0.2), 0.35);
      g.fillRect(p.x - uy * (w / 2 + 3) - 1, p.y + ux * (w / 2 + 3) - 1, 2, 2);
      g.fillRect(p.x + uy * (w / 2 + 3) - 1, p.y - ux * (w / 2 + 3) - 1, 2, 2);
    });
  }

  private drawBand(g: G): void {
    const band = this.L.band!;
    const f = this.th.feature;
    const r = this.rng;
    this.road(g, band.pts, band.thick + 22, dk(f.edge, 0.1), 1);
    this.road(g, band.pts, band.thick + 10, f.edge, 1);
    if (f.kind === 'river') {
      this.road(g, band.pts, band.thick, f.color, 1);
      this.road(g, band.pts, band.thick * 0.55, lt(f.color, 0.08), 0.6);
      const frozen = (f.flow ?? 1) === 0;
      this.walk(band.pts, 22, (p, ux, uy) => {
        const k = (r() - 0.5) * band.thick * 0.8;
        const x = p.x - uy * k, y = p.y + ux * k;
        if (frozen) {
          g.lineStyle(1, 0xffffff, 0.45);
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y - 4); g.lineTo(x + 13, y + 3); g.strokePath();
        } else {
          g.lineStyle(1.5, lt(f.color, 0.35), 0.5);
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + ux * 14, y + uy * 14); g.strokePath();
          if (r() < 0.25) { g.fillStyle(0xffffff, 0.4); g.fillCircle(x + ux * 6, y + uy * 6, 1.2); }
        }
      });
      // Banks: reeds or stones.
      this.walk(band.pts, 30, (p, ux, uy) => {
        for (const sd of [-1, 1]) {
          if (r() < 0.5) continue;
          const k = sd * (band.thick / 2 + 6);
          g.fillStyle(lt(f.edge, 0.15), 0.8); g.fillEllipse(p.x - uy * k, p.y + ux * k, 7, 4);
        }
      });
    } else {
      // Chasm: stepped darkness down to a void floor.
      this.road(g, band.pts, band.thick, mix(f.color, f.edge, 0.35), 1);
      this.road(g, band.pts, band.thick * 0.72, mix(f.color, f.edge, 0.15), 1);
      this.road(g, band.pts, band.thick * 0.45, f.color, 1);
      this.walk(band.pts, 14, (p, ux, uy) => {
        if (r() < 0.4) {
          const k = (r() - 0.5) * band.thick * 0.4;
          g.fillStyle(lt(this.th.particleColor, 0.2), 0.3 + r() * 0.4); g.fillCircle(p.x - uy * k, p.y + ux * k, 0.8 + r());
        }
        // Cliff lip.
        for (const sd of [-1, 1]) {
          const k = sd * (band.thick / 2 - 2);
          g.fillStyle(lt(f.edge, 0.2), 0.7); g.fillRect(p.x - uy * k - 3, p.y + ux * k - 1, 6, 2);
        }
      });
    }
  }

  private drawBridges(g: G): void {
    const band = this.L.band!;
    const chasm = this.th.feature.kind === 'chasm';
    for (const b of band.bridges) {
      const len = Math.hypot(b.b.x - b.a.x, b.b.y - b.a.y);
      const ux = (b.b.x - b.a.x) / len, uy = (b.b.y - b.a.y) / len;
      const hw = b.w / 2;
      const wood = chasm ? 0x6a5034 : 0x7a5a38;
      // Deck shadow and deck.
      g.fillStyle(0x000000, 0.35);
      g.beginPath();
      g.moveTo(b.a.x - uy * hw + 4, b.a.y + ux * hw + 6); g.lineTo(b.b.x - uy * hw + 4, b.b.y + ux * hw + 6);
      g.lineTo(b.b.x + uy * hw + 4, b.b.y - ux * hw + 6); g.lineTo(b.a.x + uy * hw + 4, b.a.y - ux * hw + 6);
      g.closePath(); g.fillPath();
      g.fillStyle(dk(wood, 0.2), 1);
      g.beginPath();
      g.moveTo(b.a.x - uy * hw, b.a.y + ux * hw); g.lineTo(b.b.x - uy * hw, b.b.y + ux * hw);
      g.lineTo(b.b.x + uy * hw, b.b.y - ux * hw); g.lineTo(b.a.x + uy * hw, b.a.y - ux * hw);
      g.closePath(); g.fillPath();
      for (let s = 2; s < len; s += 9) {
        const x = b.a.x + ux * s, y = b.a.y + uy * s;
        g.fillStyle(((s / 9) | 0) % 2 ? wood : lt(wood, 0.1), 1);
        g.beginPath();
        g.moveTo(x - uy * hw, y + ux * hw); g.lineTo(x - uy * hw + ux * 7, y + ux * hw + uy * 7);
        g.lineTo(x + uy * hw + ux * 7, y - ux * hw + uy * 7); g.lineTo(x + uy * hw, y - ux * hw);
        g.closePath(); g.fillPath();
      }
      // Rails and posts.
      for (const sd of [-1, 1]) {
        const ox = -uy * hw * sd, oy = ux * hw * sd;
        g.lineStyle(chasm ? 1.5 : 3, chasm ? 0xc8b080 : dk(wood, 0.4), 1);
        g.beginPath(); g.moveTo(b.a.x + ox, b.a.y + oy); g.lineTo(b.b.x + ox, b.b.y + oy); g.strokePath();
        for (let s = 0; s <= len; s += len / 4) {
          g.fillStyle(dk(wood, 0.45), 1); g.fillRect(b.a.x + ux * s + ox - 3, b.a.y + uy * s + oy - 3, 6, 6);
        }
      }
    }
  }

  // ── Buildings ──────────────────────────────────────────────────────

  private drawBuilding(b: Building): void {
    const r = b.rect;
    const depth = r.y + r.h;
    const g = this.gfx(depth);
    const rng = mulberry32(b.seed * 7919 + 13);
    if (b.kind === 'house') this.drawHouse(g, b, rng);
    else if (b.kind === 'fight') this.drawFight(g, b, rng);
    else if (b.kind === 'castle') this.drawCastle(g, b, rng);
    else this.drawShop(g, b, rng);
    const top = b.kind === 'castle' ? 300 : 140;
    this.addCull(g, r.x - 60, r.y - top, r.x + r.w + 60, r.y + r.h + 60);
  }

  private footShadow(g: G, r: Rect): void {
    g.fillStyle(0x000000, 0.28);
    g.fillRect(r.x + 10, r.y + r.h - 4, r.w + 6, 12);
    g.fillRect(r.x + r.w, r.y + 6, 12, r.h + 2);
  }

  /** Brick / board grain over a wall face. */
  private wallGrain(g: G, x: number, y: number, w: number, h: number, c: number, rng: () => number, bricks = true): void {
    g.lineStyle(1, dk(c, 0.3), 0.35);
    for (let yy = y + 7, row = 0; yy < y + h - 2; yy += 7, row++) {
      g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.strokePath();
      if (!bricks) continue;
      for (let xx = x + (row % 2 ? 7 : 14); xx < x + w; xx += 16) {
        g.beginPath(); g.moveTo(xx, yy - 7); g.lineTo(xx, yy); g.strokePath();
      }
    }
    for (let i = 0; i < Math.round(w / 30); i++) {
      g.fillStyle(rng() < 0.5 ? lt(c, 0.1) : dk(c, 0.12), 0.5);
      g.fillRect(x + rng() * (w - 10), y + rng() * (h - 6), 8, 4);
    }
  }

  private window(g: G, x: number, y: number, w: number, h: number, lit: boolean): void {
    const th = this.th;
    if (lit) { g.fillStyle(th.glow, 0.18); g.fillRect(x - 4, y - 4, w + 8, h + 8); }
    g.fillStyle(dk(th.trim, 0.3), 1); g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle(lit ? th.glow : dk(th.wallShade, 0.55), 1); g.fillRect(x, y, w, h);
    if (lit) { g.fillStyle(0xffffff, 0.35); g.fillRect(x + 1, y + 1, w / 2 - 1, h / 2 - 1); }
    g.lineStyle(1.5, dk(th.trim, 0.4), 1);
    g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.strokePath();
    g.fillStyle(th.trim, 1); g.fillRect(x - 3, y + h + 1, w + 6, 2.5);
  }

  /** Roof over [x..x+w] from yTop down to the eave line yEave, in the theme's style. */
  private roof(g: G, x: number, w: number, yTop: number, yEave: number, style: string, c: number, cs: number, rng: () => number): void {
    const th = this.th;
    const cx = x + w / 2;
    const h = yEave - yTop;
    const shingles = (x0: number, x1: number, y0: number, y1: number, col: number): void => {
      g.lineStyle(1, dk(col, 0.3), 0.55);
      for (let yy = y0 + 6; yy < y1; yy += 7) { g.beginPath(); g.moveTo(x0, yy); g.lineTo(x1, yy); g.strokePath(); }
    };
    switch (style) {
      case 'flat': {
        g.fillStyle(cs, 1); g.fillRect(x - 4, yTop, w + 8, h + 4);
        g.fillStyle(c, 1); g.fillRect(x + 4, yTop + 6, w - 8, h - 8);
        g.fillStyle(lt(cs, 0.15), 1); g.fillRect(x - 4, yEave - 2, w + 8, 6);
        // Rooftop clutter: vents, a tank.
        g.fillStyle(dk(c, 0.25), 1); g.fillRect(x + 12, yTop + 12, 16, 10);
        g.fillStyle(lt(c, 0.15), 1); g.fillRect(x + 12, yTop + 10, 16, 3);
        if (w > 150) {
          g.fillStyle(dk(cs, 0.2), 1); g.fillEllipse(x + w - 30, yTop + 16, 22, 10); g.fillRect(x + w - 41, yTop + 4, 22, 12);
          g.fillStyle(lt(cs, 0.25), 1); g.fillEllipse(x + w - 30, yTop + 4, 22, 8);
        }
        g.fillStyle(th.glow, 0.7); g.fillCircle(x + w - 10, yTop + 6, 1.5);
        break;
      }
      case 'dome': {
        g.fillStyle(cs, 1); g.fillRect(x - 4, yTop + h * 0.45, w + 8, h * 0.55 + 4);
        g.fillStyle(lt(cs, 0.1), 1); g.fillRect(x - 4, yEave - 2, w + 8, 5);
        const R = Math.min(w * 0.36, h * 1.1);
        g.fillStyle(dk(c, 0.2), 1); g.slice(cx, yEave - 2, R, Math.PI, 0, false); g.fillPath();
        g.fillStyle(c, 1); g.slice(cx - 3, yEave - 2, R * 0.9, Math.PI, 0, false); g.fillPath();
        g.fillStyle(lt(c, 0.3), 0.8); g.slice(cx - R * 0.3, yEave - R * 0.45, R * 0.3, Math.PI, 0, false); g.fillPath();
        g.lineStyle(1, dk(c, 0.3), 0.6);
        for (let i = 1; i < 4; i++) { g.beginPath(); g.arc(cx, yEave - 2, R * (i / 4), Math.PI, 0, false); g.strokePath(); }
        g.fillStyle(th.trim, 1); g.fillRect(cx - 1.5, yEave - R - 12, 3, 12); g.fillCircle(cx, yEave - R - 13, 3);
        break;
      }
      case 'spire': {
        g.fillStyle(dk(c, 0.25), 1); g.fillRect(x - 4, yTop + h * 0.3, w + 8, h * 0.7 + 4);
        shingles(x - 4, x + w + 4, yTop + h * 0.3, yEave, dk(c, 0.25));
        const sw = Math.min(30, w * 0.18);
        const spire = (sx: number, top: number, sw2: number): void => {
          g.fillStyle(lt(this.th.wall, 0.05), 1); g.fillRect(sx - sw2 * 0.7, yEave - 22, sw2 * 1.4, 22);
          g.fillStyle(th.glow, 0.85); g.fillRect(sx - 2.5, yEave - 16, 5, 8);
          g.fillStyle(c, 1);
          g.beginPath(); g.moveTo(sx - sw2, yEave - 20); g.lineTo(sx, top); g.lineTo(sx + sw2, yEave - 20); g.closePath(); g.fillPath();
          g.fillStyle(lt(c, 0.25), 1);
          g.beginPath(); g.moveTo(sx - sw2, yEave - 20); g.lineTo(sx, top); g.lineTo(sx - sw2 * 0.2, yEave - 20); g.closePath(); g.fillPath();
          g.fillStyle(th.trim, 1); g.fillCircle(sx, top - 2, 2.5);
        };
        spire(cx, yTop - 30 - rng() * 20, sw);
        if (w > 160) { spire(x + 18, yTop + 4, sw * 0.6); spire(x + w - 18, yTop + 4, sw * 0.6); }
        break;
      }
      case 'tent': {
        const n = Math.max(3, Math.round(w / 40));
        for (let i = 0; i < n; i++) {
          const x0 = x - 6 + ((w + 12) * i) / n, x1 = x - 6 + ((w + 12) * (i + 1)) / n;
          g.fillStyle(i % 2 ? c : lt(c, 0.6), 1);
          g.beginPath(); g.moveTo(x0, yEave + 4); g.lineTo(cx, yTop - 10); g.lineTo(x1, yEave + 4); g.closePath(); g.fillPath();
        }
        g.fillStyle(cs, 1);
        for (let i = 0; i <= n * 2; i++) {
          const xx = x - 6 + ((w + 12) * i) / (n * 2);
          g.fillTriangle(xx - 6, yEave + 3, xx + 6, yEave + 3, xx, yEave + 10);
        }
        g.lineStyle(2, 0x3a2a1a, 1); g.beginPath(); g.moveTo(cx, yTop - 10); g.lineTo(cx, yTop - 26); g.strokePath();
        g.fillStyle(th.trim, 1); g.fillTriangle(cx, yTop - 26, cx + 14, yTop - 22, cx, yTop - 18);
        break;
      }
      case 'mushroom': {
        const capW = w + 34, capH = h * 2 + 30;
        g.fillStyle(dk(c, 0.35), 1); g.fillEllipse(cx, yEave + 2, capW, 20);
        g.fillStyle(c, 1); g.slice(cx, yEave + 2, capW / 2, Math.PI, 0, false); g.fillPath();
        // Squash the dome visually by overpainting with a lit band.
        g.fillStyle(lt(c, 0.12), 1); g.slice(cx - 10, yEave - 4, capW / 2 - 18, Math.PI + 0.35, -0.6, false); g.fillPath();
        g.fillStyle(lt(c, 0.5), 0.9);
        for (let i = 0; i < 7; i++) g.fillCircle(x + rng() * w, yEave - 10 - rng() * Math.min(capW / 2 - 20, capH * 0.3), 3 + rng() * 5);
        g.fillStyle(th.glow, 0.15); g.fillEllipse(cx, yEave + 4, capW, 14);
        break;
      }
      case 'pagoda': {
        const eave = (yy: number, ww: number, hh: number, col: number): void => {
          g.fillStyle(dk(col, 0.25), 1);
          g.beginPath(); g.moveTo(cx - ww / 2 - 12, yy - 6); g.lineTo(cx - ww / 2, yy); g.lineTo(cx + ww / 2, yy); g.lineTo(cx + ww / 2 + 12, yy - 6);
          g.lineTo(cx + ww / 2 - 4, yy - hh); g.lineTo(cx - ww / 2 + 4, yy - hh); g.closePath(); g.fillPath();
          g.fillStyle(col, 1);
          g.beginPath(); g.moveTo(cx - ww / 2 - 12, yy - 6); g.lineTo(cx - ww / 2 + 4, yy - hh); g.lineTo(cx + ww / 2 - 4, yy - hh); g.lineTo(cx + ww / 2 + 12, yy - 6); g.lineTo(cx, yy - hh * 0.4); g.closePath(); g.fillPath();
          g.lineStyle(2, th.trim, 0.9); g.beginPath(); g.moveTo(cx - ww / 2 - 12, yy - 6); g.lineTo(cx - ww / 2, yy); g.lineTo(cx + ww / 2, yy); g.lineTo(cx + ww / 2 + 12, yy - 6); g.strokePath();
        };
        eave(yEave + 2, w + 8, h * 0.55, c);
        g.fillStyle(this.th.wall, 1); g.fillRect(cx - w * 0.3, yTop + h * 0.15, w * 0.6, h * 0.35);
        g.fillStyle(th.glow, 0.8); g.fillRect(cx - 8, yTop + h * 0.22, 16, 8);
        eave(yTop + h * 0.18, w * 0.7, h * 0.4, c);
        g.fillStyle(th.trim, 1); g.fillRect(cx - 1.5, yTop - h * 0.4, 3, h * 0.25); g.fillCircle(cx, yTop - h * 0.42, 3);
        break;
      }
      case 'stepped': {
        const tiers = 3;
        for (let i = 0; i < tiers; i++) {
          const inset = i * w * 0.14;
          const y0 = yTop + (h * i) / tiers - i * 6, y1 = yEave - (h * i) / tiers * 0.2;
          g.fillStyle(i % 2 ? c : cs, 1); g.fillRect(x - 4 + inset, y0, w + 8 - inset * 2, y1 - y0 + 4);
          g.fillStyle(th.trim, 0.8); g.fillRect(x - 4 + inset, y0, w + 8 - inset * 2, 2);
        }
        g.fillStyle(dk(cs, 0.3), 1); g.fillRect(cx + w * 0.2, yTop - 26, 8, 30);
        g.fillStyle(th.glow, 0.8); g.fillCircle(cx + w * 0.2 + 4, yTop - 28, 2);
        break;
      }
      case 'crooked':
      case 'gable':
      default: {
        const crook = style === 'crooked';
        const lean = crook ? (rng() - 0.5) * 18 : 0;
        const ridgeY = yTop + h * 0.36;
        // Back slope.
        g.fillStyle(cs, 1);
        g.beginPath(); g.moveTo(x - 8, ridgeY + lean); g.lineTo(x + 4, yTop); g.lineTo(x + w - 4, yTop); g.lineTo(x + w + 8, ridgeY - lean); g.closePath(); g.fillPath();
        // Front slope.
        g.fillStyle(c, 1);
        g.beginPath(); g.moveTo(x - 8, ridgeY + lean); g.lineTo(x + w + 8, ridgeY - lean); g.lineTo(x + w + 10, yEave + 4); g.lineTo(x - 10, yEave + 4); g.closePath(); g.fillPath();
        g.lineStyle(1, dk(c, 0.28), 0.6);
        for (let yy = ridgeY + 7; yy < yEave + 2; yy += 7) {
          const t = (yy - ridgeY) / (yEave - ridgeY);
          g.beginPath(); g.moveTo(x - 8, yy + lean * (1 - t)); g.lineTo(x + w + 8, yy - lean * (1 - t)); g.strokePath();
          for (let xx = x + ((yy / 7) % 2 ? 4 : 12); xx < x + w; xx += 16) {
            g.beginPath(); g.moveTo(xx, yy - 7 + lean * 0); g.lineTo(xx, yy); g.strokePath();
          }
        }
        g.lineStyle(3, lt(c, 0.25), 1); g.beginPath(); g.moveTo(x - 8, ridgeY + lean); g.lineTo(x + w + 8, ridgeY - lean); g.strokePath();
        g.lineStyle(2, dk(c, 0.45), 1); g.beginPath(); g.moveTo(x - 10, yEave + 4); g.lineTo(x + w + 10, yEave + 4); g.strokePath();
        if (crook) {
          g.fillStyle(dk(c, 0.2), 1); g.fillRect(x + w * 0.3, ridgeY + 10, 14, 10);
          g.fillStyle(lt(c, 0.15), 1); g.fillRect(x + w * 0.62, ridgeY + 18, 12, 9);
        }
        // Chimney.
        const chx = x + w * (0.2 + rng() * 0.55);
        g.fillStyle(dk(this.th.wall, 0.2), 1); g.fillRect(chx, yTop - 16, 12, 26);
        g.fillStyle(dk(this.th.wall, 0.45), 1); g.fillRect(chx - 2, yTop - 18, 16, 4);
        break;
      }
    }
  }

  private drawHouse(g: G, b: Building, rng: () => number): void {
    const th = this.th;
    const r = b.rect;
    const wallH = Math.min(r.h * 0.58, 44 + rng() * 18);
    const fy0 = r.y + r.h - wallH;
    const rise = 24 + rng() * 22;
    // Small per-house hue drift so a street is not one stamp repeated.
    const wall = mix(th.wall, rng() < 0.5 ? 0xffffff : 0x000000, rng() * 0.12);
    const roofC = mix(th.roof, rng() < 0.5 ? th.roofShade : lt(th.roof, 0.2), rng() * 0.4);
    this.footShadow(g, r);
    g.fillStyle(wall, 1); g.fillRect(r.x, fy0, r.w, wallH);
    this.wallGrain(g, r.x, fy0, r.w, wallH, wall, rng, th.paving !== 'plank');
    g.fillStyle(dk(wall, 0.3), 1); g.fillRect(r.x, r.y + r.h - 5, r.w, 5);
    g.fillStyle(dk(wall, 0.15), 1); g.fillRect(r.x + r.w - 8, fy0, 8, wallH);
    // Door.
    const dw = 20, dh = Math.min(32, wallH - 8);
    const dx = r.x + r.w / 2 - dw / 2 + (rng() - 0.5) * (r.w * 0.3);
    g.fillStyle(dk(th.trim, 0.4), 1); g.fillRect(dx - 3, r.y + r.h - dh - 3, dw + 6, dh + 3);
    g.fillStyle(mix(0x6a4428, th.roof, 0.25), 1); g.fillRoundedRect(dx, r.y + r.h - dh, dw, dh, { tl: 8, tr: 8, bl: 0, br: 0 });
    g.lineStyle(1, 0x2a1a10, 0.6); g.beginPath(); g.moveTo(dx + dw / 2, r.y + r.h - dh + 3); g.lineTo(dx + dw / 2, r.y + r.h); g.strokePath();
    g.fillStyle(0xffd070, 1); g.fillCircle(dx + dw - 5, r.y + r.h - dh / 2, 1.5);
    g.fillStyle(dk(th.street, 0.1), 1); g.fillRect(dx - 5, r.y + r.h, dw + 10, 4);
    // Windows either side of the door.
    const wy = fy0 + Math.max(8, wallH * 0.25);
    const ww = 16, wh = Math.min(18, wallH * 0.38);
    for (let wx = r.x + 14; wx < r.x + r.w - 14 - ww; wx += 34) {
      if (wx + ww > dx - 6 && wx < dx + dw + 6) continue;
      this.window(g, wx, wy, ww, wh, rng() < 0.7);
    }
    // Flower box / sign / lamp on some houses.
    if (rng() < 0.35) { g.fillStyle(0x6a4428, 1); g.fillRect(r.x + 12, wy + wh + 3, 22, 5); g.fillStyle(0xff7a9a, 1); g.fillCircle(r.x + 16, wy + wh + 2, 2.5); g.fillCircle(r.x + 23, wy + wh + 1, 2.5); g.fillCircle(r.x + 30, wy + wh + 2, 2.5); }
    this.roof(g, r.x, r.w, r.y - rise, fy0, th.roofStyle, roofC, th.roofShade, rng);
  }

  // ── The red doors ──────────────────────────────────────────────────

  private drawFight(g: G, b: Building, rng: () => number): void {
    const th = this.th;
    const r = b.rect;
    const idx = (b.fightIndex ?? 1) - 1;
    const state = this.st.fights[idx] ?? 'locked';
    const wallH = 94;
    const fy0 = r.y + r.h - wallH, fy1 = r.y + r.h;
    const wall = mix(mix(th.wallShade, 0x140408, 0.6), 0x3a0a0a, 0.15);
    const stone = lt(wall, 0.08);
    const roofC = mix(dk(th.roofShade, 0.45), 0x2a0606, 0.3);
    const cx = r.x + r.w / 2;
    const rise = 56;

    // Scorched ground around it.
    g.fillStyle(0x000000, 0.35); g.fillEllipse(cx, fy1 + 6, r.w + 60, 40);
    g.fillStyle(0x3a0606, 0.25); g.fillEllipse(cx, fy1 + 30, 110, 40);
    this.footShadow(g, r);

    // Back mass and jagged roof.
    g.fillStyle(dk(roofC, 0.2), 1);
    g.beginPath(); g.moveTo(r.x - 6, fy0 + 2); g.lineTo(r.x - 2, r.y - rise + 30); g.lineTo(cx, r.y - rise - 6); g.lineTo(r.x + r.w + 2, r.y - rise + 30); g.lineTo(r.x + r.w + 6, fy0 + 2); g.closePath(); g.fillPath();
    g.fillStyle(roofC, 1);
    g.beginPath(); g.moveTo(r.x - 10, fy0 + 6); g.lineTo(r.x + 6, r.y - rise + 44); g.lineTo(cx, r.y - rise + 14); g.lineTo(r.x + r.w - 6, r.y - rise + 44); g.lineTo(r.x + r.w + 10, fy0 + 6); g.closePath(); g.fillPath();
    g.lineStyle(1, dk(roofC, 0.4), 0.7);
    for (let yy = r.y - rise + 30; yy < fy0; yy += 8) { g.beginPath(); g.moveTo(r.x - 4, yy); g.lineTo(r.x + r.w + 4, yy); g.strokePath(); }
    // Spiked crest along the ridge.
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const sx = r.x + 6 + (cx - r.x - 6) * Math.min(1, t * 2) + (t > 0.5 ? (r.x + r.w - 6 - cx) * (t * 2 - 1) : 0);
      const sy = t <= 0.5 ? (r.y - rise + 44) + ((r.y - rise + 14) - (r.y - rise + 44)) * (t * 2) : (r.y - rise + 14) + ((r.y - rise + 44) - (r.y - rise + 14)) * (t * 2 - 1);
      g.fillStyle(0x1a1214, 1); g.fillTriangle(sx - 4, sy + 2, sx + 4, sy + 2, sx, sy - 12);
    }
    // Corner turrets with black spires.
    for (const tx of [r.x + 4, r.x + r.w - 4]) {
      g.fillStyle(dk(wall, 0.15), 1); g.fillRect(tx - 13, fy0 - 26, 26, wallH + 26);
      g.fillStyle(lt(wall, 0.05), 1); g.fillRect(tx - 13, fy0 - 26, 7, wallH + 26);
      g.fillStyle(0x140a0c, 1); g.fillTriangle(tx - 17, fy0 - 24, tx + 17, fy0 - 24, tx, fy0 - 82);
      g.fillStyle(0x2a1416, 1); g.fillTriangle(tx - 17, fy0 - 24, tx - 2, fy0 - 24, tx, fy0 - 82);
      g.fillStyle(0xff2a2a, state === 'locked' ? 0.35 : 0.95); g.fillRect(tx - 2.5, fy0 - 6, 5, 14);
      g.fillStyle(0x1a1214, 1); g.fillCircle(tx, fy0 - 84, 3);
    }
    // Facade: heavy blocks.
    g.fillStyle(wall, 1); g.fillRect(r.x + 17, fy0, r.w - 34, wallH);
    g.lineStyle(1, dk(wall, 0.45), 0.7);
    for (let yy = fy0 + 10, row = 0; yy < fy1; yy += 10, row++) {
      g.beginPath(); g.moveTo(r.x + 17, yy); g.lineTo(r.x + r.w - 17, yy); g.strokePath();
      for (let xx = r.x + 17 + (row % 2 ? 10 : 22); xx < r.x + r.w - 17; xx += 24) { g.beginPath(); g.moveTo(xx, yy - 10); g.lineTo(xx, yy); g.strokePath(); }
    }
    for (let i = 0; i < 8; i++) { g.fillStyle(rng() < 0.5 ? stone : dk(wall, 0.2), 0.6); g.fillRect(r.x + 20 + rng() * (r.w - 50), fy0 + rng() * (wallH - 10), 14, 6); }
    // Cracks.
    g.lineStyle(1.2, 0x0a0204, 0.8);
    g.beginPath(); g.moveTo(r.x + 30, fy0 + 6); g.lineTo(r.x + 38, fy0 + 22); g.lineTo(r.x + 33, fy0 + 34); g.lineTo(r.x + 42, fy0 + 48); g.strokePath();
    g.beginPath(); g.moveTo(r.x + r.w - 34, fy1 - 4); g.lineTo(r.x + r.w - 40, fy1 - 20); g.lineTo(r.x + r.w - 36, fy1 - 30); g.strokePath();
    // Slit windows.
    for (const sx of [r.x + 40, r.x + 58, r.x + r.w - 58, r.x + r.w - 40]) {
      g.fillStyle(0x0a0204, 1); g.fillRect(sx - 3, fy0 + 14, 6, 26);
      g.fillStyle(0xff2020, state === 'locked' ? 0.25 : 0.85); g.fillRect(sx - 1.5, fy0 + 16, 3, 22);
    }
    // Rose window over the door.
    const rw = { x: cx, y: fy0 + 18 };
    g.fillStyle(0x140406, 1); g.fillCircle(rw.x, rw.y, 13);
    g.fillStyle(state === 'cleared' ? 0xffc44d : 0xc01818, state === 'locked' ? 0.4 : 0.9); g.fillCircle(rw.x, rw.y, 10);
    g.lineStyle(1.5, 0x140406, 1);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.beginPath(); g.moveTo(rw.x, rw.y); g.lineTo(rw.x + Math.cos(a) * 10, rw.y + Math.sin(a) * 10); g.strokePath(); }
    // Skull keystone.
    const sk = { x: cx, y: fy0 + 40 };
    g.fillStyle(0xd8d0c0, 1); g.fillCircle(sk.x, sk.y, 7); g.fillRect(sk.x - 4, sk.y + 3, 8, 5);
    g.fillStyle(0x140406, 1); g.fillCircle(sk.x - 2.6, sk.y - 0.5, 2); g.fillCircle(sk.x + 2.6, sk.y - 0.5, 2);
    g.fillTriangle(sk.x - 1, sk.y + 3, sk.x + 1, sk.y + 3, sk.x, sk.y + 1);
    for (let i = -1; i <= 1; i++) g.fillRect(sk.x + i * 2.4 - 0.5, sk.y + 5, 1, 3);
    // Tattered banners either side.
    for (const bx of [r.x + 26, r.x + r.w - 40]) {
      const bc = state === 'cleared' ? 0xb08a2a : 0x7a0a0e;
      g.fillStyle(0x1a1214, 1); g.fillRect(bx - 2, fy0 + 2, 18, 3);
      g.fillStyle(bc, 1);
      g.beginPath(); g.moveTo(bx, fy0 + 4); g.lineTo(bx + 14, fy0 + 4); g.lineTo(bx + 14, fy0 + 48); g.lineTo(bx + 10, fy0 + 42); g.lineTo(bx + 7, fy0 + 52); g.lineTo(bx + 4, fy0 + 43); g.lineTo(bx, fy0 + 50); g.closePath(); g.fillPath();
      g.fillStyle(state === 'cleared' ? 0xffe8a0 : 0x1a0204, 1); g.fillTriangle(bx + 3, fy0 + 14, bx + 11, fy0 + 14, bx + 7, fy0 + 26);
    }
    // The door: arched, iron-studded, unmistakably red.
    const dw = 46, dh = 58;
    const dx = cx - dw / 2, dy = fy1 - dh;
    g.fillStyle(lt(stone, 0.12), 1); g.fillRoundedRect(dx - 7, dy - 7, dw + 14, dh + 7, { tl: 26, tr: 26, bl: 0, br: 0 });
    g.fillStyle(0x0a0204, 1); g.fillRoundedRect(dx - 2, dy - 2, dw + 4, dh + 2, { tl: 24, tr: 24, bl: 0, br: 0 });
    const doorC = state === 'locked' ? 0x5a0a0c : state === 'cleared' ? 0x8a2a1a : 0xd01818;
    g.fillStyle(doorC, 1); g.fillRoundedRect(dx, dy, dw, dh, { tl: 22, tr: 22, bl: 0, br: 0 });
    g.fillStyle(lt(doorC, 0.18), 1); g.fillRoundedRect(dx + 3, dy + 3, dw / 2 - 4, dh - 3, { tl: 19, tr: 0, bl: 0, br: 0 });
    g.lineStyle(1.5, dk(doorC, 0.5), 1);
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(dx + (dw * i) / 4, dy + 6); g.lineTo(dx + (dw * i) / 4, fy1); g.strokePath(); }
    g.fillStyle(0x2a2226, 1); g.fillRect(dx, dy + 18, dw, 4); g.fillRect(dx, dy + 40, dw, 4);
    g.fillStyle(0x6a6064, 1);
    for (let i = 0; i < 5; i++) { g.fillCircle(dx + 5 + i * 9, dy + 20, 1.6); g.fillCircle(dx + 5 + i * 9, dy + 42, 1.6); }
    g.lineStyle(2, 0x1a1214, 1); g.strokeCircle(cx + 9, dy + 32, 4);
    if (state === 'cleared') {
      // Ajar: a sliver of dark interior and a gold seal.
      g.fillStyle(0x0a0204, 1); g.fillRect(cx - 2, dy + 4, 5, dh - 4);
    }
    // Steps.
    g.fillStyle(lt(stone, 0.05), 1); g.fillRect(dx - 12, fy1, dw + 24, 5);
    g.fillStyle(dk(stone, 0.1), 1); g.fillRect(dx - 18, fy1 + 5, dw + 36, 5);

    if (state === 'locked') {
      // Chained shut.
      g.lineStyle(3, 0x8a8a90, 1);
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        g.strokeEllipse(dx + 2 + (dw - 4) * t, dy + 14 + (dh - 22) * t, 7, 5);
        g.strokeEllipse(dx + dw - 2 - (dw - 4) * t, dy + 14 + (dh - 22) * t, 7, 5);
      }
      g.fillStyle(0x6a5a3a, 1); g.fillRoundedRect(cx - 7, dy + 30, 14, 12, 2);
      g.lineStyle(2.5, 0x6a5a3a, 1); g.beginPath(); g.arc(cx, dy + 30, 5, Math.PI, 0, false); g.strokePath();
      g.fillStyle(0x1a1214, 1); g.fillCircle(cx, dy + 35, 1.8);
    }

    // Roman numeral plaque on the roof.
    const plaqueY = r.y - rise + 52;
    g.fillStyle(0x140a0c, 1); g.fillRect(cx - 18, plaqueY - 10, 36, 20);
    g.lineStyle(2, state === 'cleared' ? 0xffc44d : 0x8a1a1a, 1); g.strokeRect(cx - 18, plaqueY - 10, 36, 20);
    const numeral = ['I', 'II', 'III', 'IV', 'V'][idx] ?? `${idx + 1}`;
    this.label(cx, plaqueY, numeral, fy1 + 0.5, {
      size: 13, color: state === 'cleared' ? '#ffc44d' : state === 'locked' ? '#7a4a4a' : '#ff5a5a', stroke: '#000000',
    });

    // Living overlay: pulsing door glow, torches, light spill — or the gold of a won door.
    const torchY = dy + 10;
    this.addFx(r.x - 40, r.y - rise - 40, r.x + r.w + 40, fy1 + 80, fy1 + 0.3, (fg, t) => {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.6 + idx);
      if (state === 'open') {
        for (let k = 3; k >= 1; k--) { fg.fillStyle(0xff2020, 0.05 + 0.04 * pulse); fg.fillEllipse(cx, fy1 - dh / 2, dw + k * 22, dh + k * 18); }
        fg.fillStyle(0xff3030, 0.1 + 0.08 * pulse); fg.fillEllipse(cx, fy1 + 26, 120 + pulse * 20, 34);
      } else if (state === 'cleared') {
        fg.fillStyle(0xffc44d, 0.06 + 0.03 * pulse); fg.fillEllipse(cx, fy1 - dh / 2, dw + 40, dh + 30);
        // Gold laurel seal over the keystone.
        fg.lineStyle(2, 0xffc44d, 0.9);
        fg.beginPath(); fg.arc(sk.x, sk.y, 11, Math.PI * 0.6, Math.PI * 1.4, false); fg.strokePath();
        fg.beginPath(); fg.arc(sk.x, sk.y, 11, -Math.PI * 0.4, Math.PI * 0.4, false); fg.strokePath();
        fg.fillStyle(0xffc44d, 1);
        fg.beginPath(); fg.moveTo(cx - 7, dy + 24); fg.lineTo(cx - 2, dy + 30); fg.lineTo(cx + 8, dy + 18); fg.lineTo(cx + 9, dy + 21); fg.lineTo(cx - 2, dy + 34); fg.lineTo(cx - 9, dy + 26); fg.closePath(); fg.fillPath();
      }
      if (state !== 'locked') {
        for (const tx of [dx - 14, dx + dw + 14]) {
          fg.fillStyle(0x2a2226, 1); fg.fillRect(tx - 2, torchY, 4, 12); fg.fillRect(tx - 4, torchY - 2, 8, 3);
          const fl = Math.sin(t * 13 + tx) * 2;
          const fc = state === 'cleared' ? 0xffc44d : 0xff4a1a;
          fg.fillStyle(fc, 0.95); fg.fillTriangle(tx - 4, torchY - 2, tx + 4, torchY - 2, tx + fl, torchY - 14 - Math.abs(fl));
          fg.fillStyle(0xffe070, 0.95); fg.fillTriangle(tx - 2, torchY - 2, tx + 2, torchY - 2, tx + fl * 0.5, torchY - 8);
          fg.fillStyle(fc, 0.12); fg.fillCircle(tx, torchY - 6, 18 + pulse * 3);
        }
      }
    });
  }

  // ── The castle ─────────────────────────────────────────────────────

  private drawCastle(g: G, b: Building, rng: () => number): void {
    const th = this.th;
    const r = b.rect;
    const state = this.st.castle;
    const style = th.castle;
    const wallC = th.castleWall, roofC = th.castleRoof;
    const boss = this.st.bossColor;
    const cx = r.x + r.w / 2;
    const fy1 = r.y + r.h;
    const wallH = 120;
    const fy0 = fy1 - wallH;
    const lit = th.glow;

    g.fillStyle(0x000000, 0.35); g.fillEllipse(cx + 16, fy1 + 4, r.w + 120, 60);

    const crenel = (x0: number, x1: number, y: number, col: number): void => {
      g.fillStyle(col, 1);
      for (let x = x0; x < x1 - 6; x += 14) g.fillRect(x, y - 10, 9, 10);
    };
    const winRow = (x0: number, x1: number, y: number, n: number): void => {
      for (let i = 0; i < n; i++) {
        const x = x0 + ((x1 - x0) * (i + 0.5)) / n;
        g.fillStyle(0x0a0606, 1); g.fillRoundedRect(x - 5, y - 8, 10, 16, { tl: 5, tr: 5, bl: 0, br: 0 });
        g.fillStyle(lit, 0.85); g.fillRoundedRect(x - 3, y - 6, 6, 13, { tl: 3, tr: 3, bl: 0, br: 0 });
      }
    };
    const cone = (x: number, w: number, base: number, top: number, col: number): void => {
      g.fillStyle(col, 1); g.fillTriangle(x - w, base, x + w, base, x, top);
      g.fillStyle(lt(col, 0.22), 1); g.fillTriangle(x - w, base, x - w * 0.15, base, x, top);
      g.fillStyle(this.st.bossColor, 1); g.fillRect(x - 1, top - 14, 2, 14);
      g.fillTriangle(x + 1, top - 14, x + 14, top - 10, x + 1, top - 6);
    };
    const onion = (x: number, w: number, base: number, col: number): void => {
      g.fillStyle(col, 1); g.fillEllipse(x, base - w * 0.7, w * 2, w * 1.6);
      g.fillTriangle(x - w * 0.6, base - w * 1.2, x + w * 0.6, base - w * 1.2, x, base - w * 2.4);
      g.fillStyle(lt(col, 0.3), 0.8); g.fillEllipse(x - w * 0.35, base - w * 0.9, w * 0.5, w * 0.8);
      g.fillStyle(th.trim, 1); g.fillCircle(x, base - w * 2.5, 3);
    };

    // ── Keep at the back ──
    const kw = r.w * 0.5, kx = cx - kw / 2;
    if (style === 'ziggurat') {
      for (let i = 0; i < 5; i++) {
        const w = r.w * (0.95 - i * 0.16), y = fy0 - i * 34;
        g.fillStyle(i % 2 ? wallC : dk(wallC, 0.15), 1); g.fillRect(cx - w / 2, y - 34, w, 40);
        g.fillStyle(lt(wallC, 0.2), 1); g.fillRect(cx - w / 2, y - 34, w, 4);
        g.fillStyle(th.trim, 0.7); g.fillRect(cx - w / 2, y - 6, w, 2);
      }
      g.fillStyle(roofC, 1); g.fillRect(cx - 26, fy0 - 210, 52, 44);
      g.fillStyle(boss, 0.9); g.fillRect(cx - 10, fy0 - 200, 20, 26);
      g.fillStyle(0x0a0606, 1); g.fillRect(cx - 14, fy0 - 166, 28, 8);
      for (let i = 0; i < 6; i++) { g.fillStyle(dk(wallC, 0.35), 1); g.fillRect(cx - 12, fy0 - 160 + i * 28, 24, 4); }
    } else if (style === 'tower') {
      const tw = 92;
      g.fillStyle(dk(wallC, 0.12), 1); g.fillRect(cx - tw / 2, fy0 - 250, tw, 270);
      g.fillStyle(lt(wallC, 0.08), 1); g.fillRect(cx - tw / 2, fy0 - 250, 22, 270);
      for (let i = 0; i < 6; i++) { g.fillStyle(th.trim, 0.8); g.fillRect(cx - tw / 2 - 4, fy0 - 40 - i * 40, tw + 8, 4); }
      winRow(cx - tw / 2, cx + tw / 2, fy0 - 70, 2); winRow(cx - tw / 2, cx + tw / 2, fy0 - 150, 2); winRow(cx - tw / 2, cx + tw / 2, fy0 - 210, 1);
      g.fillStyle(roofC, 1); g.fillRect(cx - tw / 2 - 10, fy0 - 262, tw + 20, 14);
      crenel(cx - tw / 2 - 10, cx + tw / 2 + 10, fy0 - 262, roofC);
      g.fillStyle(boss, 0.25); g.fillCircle(cx, fy0 - 290, 30);
      g.fillStyle(lt(boss, 0.4), 1); g.fillCircle(cx, fy0 - 290, 11);
      g.lineStyle(2, th.trim, 1); g.beginPath(); g.moveTo(cx - 16, fy0 - 268); g.lineTo(cx, fy0 - 290); g.lineTo(cx + 16, fy0 - 268); g.strokePath();
    } else {
      const kTop = fy0 - (style === 'fortress' ? 90 : 120);
      g.fillStyle(dk(wallC, 0.12), 1); g.fillRect(kx, kTop, kw, fy0 - kTop + 10);
      g.fillStyle(lt(wallC, 0.06), 1); g.fillRect(kx, kTop, 24, fy0 - kTop + 10);
      this.wallGrain(g, kx, kTop, kw, fy0 - kTop, dk(wallC, 0.12), rng);
      winRow(kx + 20, kx + kw - 20, kTop + 40, 4);
      if (style === 'keep') {
        g.fillStyle(roofC, 1); g.fillTriangle(kx - 10, kTop + 2, kx + kw + 10, kTop + 2, cx, kTop - 70);
        g.fillStyle(lt(roofC, 0.2), 1); g.fillTriangle(kx - 10, kTop + 2, cx - 10, kTop + 2, cx, kTop - 70);
      } else if (style === 'spire') {
        crenel(kx, kx + kw, kTop, dk(wallC, 0.12));
        cone(cx, 34, kTop - 4, kTop - 150, roofC);
      } else if (style === 'dome') {
        g.fillStyle(dk(roofC, 0.2), 1); g.slice(cx, kTop + 4, kw * 0.48, Math.PI, 0, false); g.fillPath();
        g.fillStyle(roofC, 1); g.slice(cx - 6, kTop + 4, kw * 0.42, Math.PI, 0, false); g.fillPath();
        g.fillStyle(lt(roofC, 0.35), 0.8); g.slice(cx - kw * 0.2, kTop - kw * 0.15, kw * 0.12, Math.PI, 0, false); g.fillPath();
        g.fillStyle(th.trim, 1); g.fillRect(cx - 2, kTop - kw * 0.48 - 22, 4, 24);
        g.fillStyle(boss, 1); g.fillCircle(cx, kTop - kw * 0.48 - 26, 6);
      } else {
        // fortress
        crenel(kx - 6, kx + kw + 6, kTop, dk(wallC, 0.2));
        g.fillStyle(dk(wallC, 0.3), 1); g.fillRect(kx + kw - 40, kTop - 50, 18, 50);
        for (let i = 0; i < 4; i++) { g.fillStyle(0x4a4448, 0.35 - i * 0.07); g.fillCircle(kx + kw - 31 + i * 6, kTop - 58 - i * 14, 8 + i * 4); }
      }
    }

    // ── Curtain wall ──
    g.fillStyle(wallC, 1); g.fillRect(r.x + 30, fy0, r.w - 60, wallH);
    this.wallGrain(g, r.x + 30, fy0, r.w - 60, wallH, wallC, rng);
    g.fillStyle(dk(wallC, 0.3), 1); g.fillRect(r.x + 30, fy1 - 8, r.w - 60, 8);
    if (style !== 'ziggurat') crenel(r.x + 30, r.x + r.w - 30, fy0, lt(wallC, 0.05));
    winRow(r.x + 70, cx - 70, fy0 + 40, 2);
    winRow(cx + 70, r.x + r.w - 70, fy0 + 40, 2);

    // ── Corner towers ──
    if (style !== 'ziggurat') {
      for (const tx of [r.x + 34, r.x + r.w - 34]) {
        const tw = style === 'fortress' ? 82 : style === 'tower' ? 56 : 66;
        const ttop = fy0 - (style === 'fortress' ? 30 : 60);
        g.fillStyle(dk(wallC, 0.08), 1); g.fillRect(tx - tw / 2, ttop, tw, fy1 - ttop + 6);
        g.fillStyle(lt(wallC, 0.1), 1); g.fillRect(tx - tw / 2, ttop, tw * 0.28, fy1 - ttop + 6);
        g.fillStyle(dk(wallC, 0.25), 1); g.fillRect(tx + tw / 2 - 8, ttop, 8, fy1 - ttop + 6);
        for (let i = 1; i < 4; i++) { g.lineStyle(1, dk(wallC, 0.35), 0.6); g.beginPath(); g.moveTo(tx - tw / 2, ttop + i * 40); g.lineTo(tx + tw / 2, ttop + i * 40); g.strokePath(); }
        winRow(tx - tw / 2, tx + tw / 2, ttop + 36, 1);
        winRow(tx - tw / 2, tx + tw / 2, ttop + 96, 1);
        if (style === 'spire' || style === 'tower') cone(tx, tw / 2 + 6, ttop + 2, ttop - (style === 'spire' ? 110 : 70), roofC);
        else if (style === 'dome') { g.fillStyle(dk(wallC, 0.1), 1); g.fillRect(tx - tw / 2 - 4, ttop - 6, tw + 8, 8); onion(tx, tw / 2 - 4, ttop - 4, roofC); }
        else if (style === 'keep') {
          crenel(tx - tw / 2 - 4, tx + tw / 2 + 4, ttop, dk(wallC, 0.08));
          g.fillStyle(roofC, 1); g.fillTriangle(tx - tw / 2, ttop - 10, tx + tw / 2, ttop - 10, tx, ttop - 46);
        } else {
          g.fillStyle(dk(wallC, 0.15), 1); g.fillRect(tx - tw / 2 - 6, ttop - 6, tw + 12, 10);
          crenel(tx - tw / 2 - 6, tx + tw / 2 + 6, ttop - 6, dk(wallC, 0.15));
          for (let i = 0; i < 4; i++) { g.fillStyle(0xc0c0c8, 1); g.fillTriangle(tx - tw / 2 + 8 + i * 20, ttop - 16, tx - tw / 2 + 14 + i * 20, ttop - 16, tx - tw / 2 + 11 + i * 20, ttop - 30); }
        }
      }
    } else {
      // Temple columns either side of the gate.
      for (const off of [-80, -50, 50, 80]) {
        g.fillStyle(lt(wallC, 0.15), 1); g.fillRect(cx + off - 7, fy0 + 10, 14, wallH - 10);
        g.fillStyle(dk(wallC, 0.15), 1); g.fillRect(cx + off + 3, fy0 + 10, 4, wallH - 10);
        g.fillStyle(th.trim, 0.8); g.fillRect(cx + off - 10, fy0 + 6, 20, 5);
      }
    }

    // ── Gatehouse ──
    const gw = 124, gtop = fy0 - 36;
    g.fillStyle(lt(wallC, 0.04), 1); g.fillRect(cx - gw / 2, gtop, gw, fy1 - gtop);
    g.fillStyle(dk(wallC, 0.2), 1); g.fillRect(cx + gw / 2 - 10, gtop, 10, fy1 - gtop);
    if (style !== 'ziggurat') crenel(cx - gw / 2 - 4, cx + gw / 2 + 4, gtop, lt(wallC, 0.04));
    // Banners in the Sovereign's colours.
    for (const bx of [cx - gw / 2 + 8, cx + gw / 2 - 26]) {
      const bc = state === 'cleared' ? 0xd8a531 : boss;
      g.fillStyle(0x1a1214, 1); g.fillRect(bx - 2, gtop + 8, 22, 3);
      g.fillStyle(bc, 1);
      g.beginPath(); g.moveTo(bx, gtop + 10); g.lineTo(bx + 18, gtop + 10); g.lineTo(bx + 18, gtop + 84); g.lineTo(bx + 9, gtop + 74); g.lineTo(bx, gtop + 84); g.closePath(); g.fillPath();
      g.fillStyle(dk(bc, 0.3), 1); g.fillRect(bx + 13, gtop + 10, 5, 70);
      g.fillStyle(state === 'cleared' ? 0xfff0b0 : lt(bc, 0.55), 1);
      // A crown sigil.
      g.beginPath(); g.moveTo(bx + 3, gtop + 40); g.lineTo(bx + 3, gtop + 30); g.lineTo(bx + 6, gtop + 35); g.lineTo(bx + 9, gtop + 28); g.lineTo(bx + 12, gtop + 35); g.lineTo(bx + 15, gtop + 30); g.lineTo(bx + 15, gtop + 40); g.closePath(); g.fillPath();
    }
    // Gate arch.
    const aw = 70, ah = 86;
    const ax = cx - aw / 2, ay = fy1 - ah;
    g.fillStyle(lt(wallC, 0.2), 1); g.fillRoundedRect(ax - 9, ay - 9, aw + 18, ah + 9, { tl: 40, tr: 40, bl: 0, br: 0 });
    g.fillStyle(0x060304, 1); g.fillRoundedRect(ax, ay, aw, ah, { tl: 35, tr: 35, bl: 0, br: 0 });
    // Voussoirs.
    g.lineStyle(1.5, dk(wallC, 0.3), 0.8);
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * 35, ay + 35 + Math.sin(a) * 35); g.lineTo(cx + Math.cos(a) * 44, ay + 35 + Math.sin(a) * 44); g.strokePath();
    }
    if (state === 'locked') {
      // Portcullis down.
      g.lineStyle(3, 0x3a3438, 1);
      for (let x = ax + 6; x < ax + aw; x += 10) { g.beginPath(); g.moveTo(x, ay + 6); g.lineTo(x, fy1); g.strokePath(); }
      for (let y = ay + 18; y < fy1; y += 14) { g.beginPath(); g.moveTo(ax + 2, y); g.lineTo(ax + aw - 2, y); g.strokePath(); }
      g.fillStyle(0x6a6468, 1);
      for (let x = ax + 6; x < ax + aw; x += 10) g.fillTriangle(x - 2.5, fy1 - 6, x + 2.5, fy1 - 6, x, fy1);
    }
    // Drawbridge-apron stones.
    g.fillStyle(lt(th.street, 0.05), 1); g.fillRect(ax - 16, fy1, aw + 32, 8);
    g.fillStyle(dk(th.street, 0.1), 1); g.fillRect(ax - 24, fy1 + 8, aw + 48, 8);

    // Boss name plaque above the gate.
    g.fillStyle(0x0a0606, 0.92); g.fillRect(cx - 86, gtop + 96 - 48, 172, 20);
    g.lineStyle(2, state === 'cleared' ? 0xffc44d : boss, 1); g.strokeRect(cx - 86, gtop + 96 - 48, 172, 20);
    this.label(cx, gtop + 58, this.st.castleName.toUpperCase(), fy1 + 0.5, {
      size: 10, color: state === 'cleared' ? '#ffc44d' : hex(lt(boss, 0.45)), spacing: 1.5,
    });

    // Overlay: the gate breathes in the Sovereign's colour once it is open.
    this.addFx(r.x - 60, r.y - 320, r.x + r.w + 60, fy1 + 100, fy1 + 0.3, (fg, t) => {
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.8);
      if (state === 'open') {
        fg.fillStyle(boss, 0.35 + pulse * 0.25); fg.fillRoundedRect(ax + 4, ay + 6, aw - 8, ah - 6, { tl: 30, tr: 30, bl: 0, br: 0 });
        fg.fillStyle(lt(boss, 0.5), 0.25 + pulse * 0.2); fg.fillEllipse(cx, fy1 - 20, aw - 20, 34);
        for (let k = 3; k >= 1; k--) { fg.fillStyle(boss, 0.04 + pulse * 0.03); fg.fillEllipse(cx, fy1 - ah / 2, aw + k * 30, ah + k * 22); }
        fg.fillStyle(boss, 0.12); fg.fillEllipse(cx, fy1 + 34, 160 + pulse * 30, 40);
      } else if (state === 'cleared') {
        fg.fillStyle(0xffc44d, 0.12 + pulse * 0.06); fg.fillRoundedRect(ax + 4, ay + 6, aw - 8, ah - 6, { tl: 30, tr: 30, bl: 0, br: 0 });
        // A gold standard flying over the gatehouse.
        const fx = cx, fy = gtop - 14;
        fg.fillStyle(0x3a3030, 1); fg.fillRect(fx - 1.5, fy - 50, 3, 50);
        const wave = Math.sin(t * 3) * 3;
        fg.fillStyle(0xffc44d, 1);
        fg.beginPath(); fg.moveTo(fx + 1, fy - 50); fg.lineTo(fx + 30, fy - 46 + wave); fg.lineTo(fx + 30, fy - 30 + wave); fg.lineTo(fx + 1, fy - 34); fg.closePath(); fg.fillPath();
        fg.fillStyle(0xfff0b0, 1); fg.fillCircle(fx + 15, fy - 40 + wave * 0.5, 3);
      } else {
        fg.fillStyle(boss, 0.06 + pulse * 0.04); fg.fillRoundedRect(ax + 4, ay + 6, aw - 8, ah - 6, { tl: 30, tr: 30, bl: 0, br: 0 });
      }
    });
  }

  // ── The shop ───────────────────────────────────────────────────────

  private drawShop(g: G, b: Building, rng: () => number): void {
    const th = this.th;
    const r = b.rect;
    const wallH = 78;
    const fy0 = r.y + r.h - wallH, fy1 = r.y + r.h;
    const cx = r.x + r.w / 2;
    const wall = lt(th.wall, 0.04);
    this.footShadow(g, r);
    g.fillStyle(wall, 1); g.fillRect(r.x, fy0, r.w, wallH);
    this.wallGrain(g, r.x, fy0, r.w, wallH, wall, rng, false);
    g.fillStyle(dk(wall, 0.3), 1); g.fillRect(r.x, fy1 - 6, r.w, 6);
    // Display windows full of goods.
    for (const wx of [r.x + 14, r.x + r.w - 14 - 62]) {
      g.fillStyle(dk(th.trim, 0.35), 1); g.fillRect(wx - 3, fy0 + 26, 68, 42);
      g.fillStyle(mix(th.glow, 0x2a1a10, 0.55), 1); g.fillRect(wx, fy0 + 29, 62, 36);
      g.fillStyle(0x5a3a20, 1); g.fillRect(wx, fy0 + 46, 62, 3); g.fillRect(wx, fy0 + 62, 62, 3);
      const goods = [0xff5a5a, 0x5ad0ff, 0x8aff6a, 0xffd040, 0xd08aff, 0xffffff];
      for (let i = 0; i < 6; i++) {
        const gx = wx + 6 + i * 10, c = goods[(i + Math.floor(rng() * 6)) % goods.length];
        g.fillStyle(c, 1); g.fillRoundedRect(gx - 3, fy0 + 36, 7, 10, 2); g.fillRect(gx - 1, fy0 + 33, 3, 3);
        g.fillStyle(goods[(i * 3) % goods.length], 1); g.fillCircle(gx + 1, fy0 + 58, 3.5);
      }
      g.fillStyle(0xffffff, 0.25); g.fillTriangle(wx, fy0 + 29, wx + 24, fy0 + 29, wx, fy0 + 52);
    }
    // Open doorway, warm light inside.
    g.fillStyle(dk(th.trim, 0.3), 1); g.fillRect(cx - 18, fy1 - 46, 36, 46);
    g.fillStyle(lt(th.glow, 0.1), 1); g.fillRect(cx - 14, fy1 - 42, 28, 42);
    g.fillStyle(mix(th.glow, 0x5a3a20, 0.4), 1); g.fillRect(cx - 14, fy1 - 14, 28, 14);
    // Striped awning.
    const aw0 = fy0 + 4, aw1 = fy0 + 26;
    const n = 10;
    for (let i = 0; i < n; i++) {
      const x0 = r.x - 8 + ((r.w + 16) * i) / n, x1 = r.x - 8 + ((r.w + 16) * (i + 1)) / n;
      g.fillStyle(i % 2 ? th.roof : 0xf4ecd8, 1);
      g.beginPath(); g.moveTo(x0 + 3, aw0); g.lineTo(x1 + 3, aw0); g.lineTo(x1, aw1); g.lineTo(x0, aw1); g.closePath(); g.fillPath();
      g.fillStyle(i % 2 ? th.roof : 0xf4ecd8, 1); g.slice((x0 + x1) / 2, aw1, (x1 - x0) / 2, 0, Math.PI, false); g.fillPath();
    }
    g.fillStyle(0x000000, 0.2); g.fillRect(r.x - 6, aw1 + 6, r.w + 12, 4);
    // Roof + sign.
    this.roof(g, r.x, r.w, r.y - 34, fy0, th.roofStyle === 'mushroom' || th.roofStyle === 'tent' ? 'gable' : th.roofStyle, th.roof, th.roofShade, rng);
    const sy = r.y - 4;
    g.fillStyle(0x3a2414, 1); g.fillRect(cx - 92, sy - 13, 184, 26);
    g.fillStyle(0xd8b060, 1); g.fillRect(cx - 89, sy - 10, 178, 20);
    g.lineStyle(2, 0x3a2414, 1); g.strokeRect(cx - 86, sy - 7, 172, 14);
    this.label(cx, sy, this.th.shopName, fy1 + 0.5, { size: 10, color: '#3a2414', stroke: '', spacing: 1.5 });
    // Wares out front.
    PROPSIDE(g, r.x + r.w + 18, fy1 + 4, th, rng);
    // Hanging lantern.
    g.lineStyle(1, 0x2a2420, 1); g.beginPath(); g.moveTo(cx + 30, aw1); g.lineTo(cx + 30, aw1 + 10); g.strokePath();
    g.fillStyle(th.glow, 0.9); g.fillRoundedRect(cx + 26, aw1 + 10, 8, 10, 2);
    g.fillStyle(th.glow, 0.15); g.fillCircle(cx + 30, aw1 + 15, 16);

    // A counter in front of the keeper, sorted just in front of them.
    const k = this.L.spots.shopKeeper;
    const cg = this.gfx(k.y + 12);
    cg.fillStyle(0x000000, 0.3); cg.fillEllipse(k.x + 2, k.y + 22, 76, 12);
    cg.fillStyle(0x6a4428, 1); cg.fillRect(k.x - 36, k.y + 2, 72, 18);
    cg.fillStyle(0x8a5a34, 1); cg.fillRect(k.x - 38, k.y - 2, 76, 6);
    cg.lineStyle(1, 0x3a2414, 0.8); for (let i = 1; i < 4; i++) { cg.beginPath(); cg.moveTo(k.x - 36 + i * 18, k.y + 4); cg.lineTo(k.x - 36 + i * 18, k.y + 20); cg.strokePath(); }
    for (let i = 0; i < 4; i++) { cg.fillStyle([0xff5a5a, 0x5ad0ff, 0xffd040, 0x8aff6a][i], 1); cg.fillRoundedRect(k.x - 28 + i * 16, k.y - 9, 7, 8, 2); }
    this.addCull(cg, k.x - 60, k.y - 30, k.x + 60, k.y + 40);
  }

  // ── Lamps ──────────────────────────────────────────────────────────

  private drawLamp(p: Pt): void {
    const th = this.th;
    const g = this.gfx(p.y);
    g.fillStyle(0x000000, 0.3); g.fillEllipse(p.x + 2, p.y + 1, 14, 5);
    g.fillStyle(0x2a2428, 1); g.fillRect(p.x - 4, p.y - 4, 8, 4);
    g.fillRect(p.x - 1.5, p.y - 46, 3, 44);
    g.fillRect(p.x - 1.5, p.y - 46, 10, 2);
    g.fillStyle(0x2a2428, 1); g.fillRect(p.x + 4, p.y - 46, 8, 3);
    g.fillStyle(th.glow, 0.95); g.fillRoundedRect(p.x + 4, p.y - 43, 8, 10, 2);
    g.fillStyle(0xffffff, 0.7); g.fillCircle(p.x + 8, p.y - 38, 1.6);
    g.fillStyle(th.glow, 0.13); g.fillCircle(p.x + 8, p.y - 38, 18);
    this.addCull(g, p.x - 30, p.y - 70, p.x + 30, p.y + 10);
  }

  // ── Plaza furniture ────────────────────────────────────────────────

  private drawPlaza(): void {
    const th = this.th;
    const S = this.L.spots;

    // Monument on a plinth.
    {
      const m = S.monument;
      const g = this.gfx(m.y + 20);
      const st = mix(0x9a9488, th.wall, 0.35);
      g.fillStyle(0x000000, 0.3); g.fillEllipse(m.x + 6, m.y + 22, 120, 34);
      g.fillStyle(dk(st, 0.35), 1); g.fillRect(m.x - 46, m.y + 4, 92, 18);
      g.fillStyle(dk(st, 0.15), 1); g.fillRect(m.x - 40, m.y - 6, 80, 12);
      g.fillStyle(lt(st, 0.1), 1); g.fillRect(m.x - 46, m.y + 2, 92, 4); g.fillRect(m.x - 40, m.y - 8, 80, 3);
      g.lineStyle(1, this.st.worldColor, 0.7); g.strokeRect(m.x - 32, m.y + 8, 64, 10);
      drawProp(g, th.monument, m.x, m.y - 6, 1.7, th, mulberry32(77));
      this.addCull(g, m.x - 100, m.y - 180, m.x + 100, m.y + 40);
    }

    // Market stall.
    {
      const s = S.stall;
      const g = this.gfx(s.y + 10);
      g.fillStyle(0x000000, 0.3); g.fillEllipse(s.x + 4, s.y + 14, 96, 22);
      g.fillStyle(0x5a3a20, 1); g.fillRect(s.x - 40, s.y - 50, 4, 62); g.fillRect(s.x + 36, s.y - 50, 4, 62);
      g.fillStyle(0x7a4a28, 1); g.fillRect(s.x - 44, s.y - 4, 88, 16);
      g.fillStyle(0x9a6a38, 1); g.fillRect(s.x - 46, s.y - 8, 92, 6);
      const prod = [0xff5a3a, 0xffd040, 0x8ad04a, 0xd08aff, th.glow];
      for (let i = 0; i < 9; i++) { g.fillStyle(prod[i % prod.length], 1); g.fillCircle(s.x - 36 + i * 9, s.y - 11, 4); }
      for (let i = 0; i < 6; i++) {
        const x0 = s.x - 50 + i * 17;
        g.fillStyle(i % 2 ? th.roof : 0xf4ecd8, 1);
        g.beginPath(); g.moveTo(x0, s.y - 62); g.lineTo(x0 + 17, s.y - 62); g.lineTo(x0 + 17, s.y - 46); g.lineTo(x0, s.y - 46); g.closePath(); g.fillPath();
        g.slice(x0 + 8.5, s.y - 46, 8.5, 0, Math.PI, false); g.fillPath();
      }
      g.fillStyle(dk(th.roof, 0.3), 1); g.fillRect(s.x - 52, s.y - 66, 104, 5);
      this.addCull(g, s.x - 70, s.y - 90, s.x + 70, s.y + 30);
    }

    // Map kiosk.
    {
      const k = S.kiosk;
      const g = this.gfx(k.y);
      g.fillStyle(0x000000, 0.3); g.fillEllipse(k.x + 3, k.y + 2, 46, 10);
      g.fillStyle(0x4a3424, 1); g.fillRect(k.x - 20, k.y - 44, 4, 44); g.fillRect(k.x + 16, k.y - 44, 4, 44);
      g.fillStyle(0x6a4a30, 1); g.fillRect(k.x - 26, k.y - 66, 52, 30);
      g.fillStyle(0xe8dcb8, 1); g.fillRect(k.x - 22, k.y - 62, 44, 22);
      // A tiny map: a plaza, roads, the castle.
      g.lineStyle(1.5, 0x8a6a3a, 1);
      g.beginPath(); g.moveTo(k.x - 18, k.y - 50); g.lineTo(k.x, k.y - 52); g.lineTo(k.x + 18, k.y - 46); g.moveTo(k.x, k.y - 52); g.lineTo(k.x + 4, k.y - 60); g.moveTo(k.x, k.y - 52); g.lineTo(k.x - 6, k.y - 42); g.strokePath();
      g.fillStyle(0xc03030, 1); g.fillCircle(k.x + 4, k.y - 59, 2); g.fillCircle(k.x - 12, k.y - 49, 1.5); g.fillCircle(k.x + 12, k.y - 48, 1.5);
      g.fillStyle(this.st.worldColor, 1); g.fillCircle(k.x, k.y - 52, 2.5);
      g.fillStyle(0x3a2414, 1); g.fillTriangle(k.x - 30, k.y - 66, k.x + 30, k.y - 66, k.x, k.y - 78);
      this.addCull(g, k.x - 40, k.y - 100, k.x + 40, k.y + 10);
      this.label(k.x, k.y - 86, 'MAP', k.y + 0.5, { size: 9, color: '#ffe8a0', spacing: 2 });
    }

    // Fingerpost to every neighbouring town.
    {
      const f = S.fingerpost;
      const g = this.gfx(f.y);
      g.fillStyle(0x000000, 0.3); g.fillEllipse(f.x + 2, f.y + 1, 18, 6);
      const n = this.L.exits.length;
      g.fillStyle(0x4a3424, 1); g.fillRect(f.x - 2.5, f.y - 30 - n * 18, 5, 30 + n * 18);
      this.addCull(g, f.x - 120, f.y - 40 - n * 18 - 20, f.x + 120, f.y + 10);
      this.L.exits.forEach((e, i) => {
        const y = f.y - 34 - i * 18;
        const right = e.dir.x > 0 || (e.dir.x === 0 && i % 2 === 0);
        const arrow = e.dir.x > 0 ? '→' : e.dir.x < 0 ? '←' : e.dir.y < 0 ? '↑' : '↓';
        const info = this.st.exits.find((x) => x.worldId === e.worldId);
        const name = info?.label ?? e.worldId.toUpperCase();
        const probe = this.scene.add.text(0, 0, `${name} ${arrow}`, { fontSize: '7.5px', fontFamily: FONT_DISPLAY, letterSpacing: 0.5 });
        const w = probe.width + 12;
        probe.destroy();
        const x0 = right ? f.x + 2 : f.x - 2 - w;
        g.fillStyle(info?.locked ? 0x5a4a40 : 0x9a7040, 1);
        g.beginPath();
        if (right) { g.moveTo(x0, y - 7); g.lineTo(x0 + w, y - 7); g.lineTo(x0 + w + 8, y); g.lineTo(x0 + w, y + 7); g.lineTo(x0, y + 7); }
        else { g.moveTo(x0 + w, y - 7); g.lineTo(x0, y - 7); g.lineTo(x0 - 8, y); g.lineTo(x0, y + 7); g.lineTo(x0 + w, y + 7); }
        g.closePath(); g.fillPath();
        g.lineStyle(1, 0x3a2414, 0.9); g.strokePath();
        this.label(x0 + w / 2, y, right ? `${name} ${arrow}` : `${arrow} ${name}`, f.y + 0.5, {
          size: 7.5, color: info?.locked ? '#a89888' : '#2a1808', stroke: '', spacing: 0.5,
        });
      });
    }
  }

  // ── Gauntlet cellar ────────────────────────────────────────────────

  private drawGauntlet(): void {
    const p = this.L.spots.gauntlet;
    const g = this.gfx(Z_FLAT + 10);
    const stone = mix(0x8a847a, this.th.wall, 0.3);
    const wood = 0x6a4428;
    // Stone frame (seen in perspective: wider at the bottom).
    g.fillStyle(0x000000, 0.35); g.fillEllipse(p.x + 4, p.y + 18, 82, 18);
    g.fillStyle(dk(stone, 0.2), 1);
    g.beginPath(); g.moveTo(p.x - 30, p.y - 22); g.lineTo(p.x + 30, p.y - 22); g.lineTo(p.x + 38, p.y + 20); g.lineTo(p.x - 38, p.y + 20); g.closePath(); g.fillPath();
    g.fillStyle(stone, 1); g.fillRect(p.x - 30, p.y - 26, 60, 6);
    // Two slanted leaves.
    for (const sd of [-1, 1]) {
      const x0 = p.x + (sd < 0 ? -26 : 1), x1 = p.x + (sd < 0 ? -1 : 26);
      const bx0 = p.x + (sd < 0 ? -33 : 1), bx1 = p.x + (sd < 0 ? -1 : 33);
      g.fillStyle(sd < 0 ? wood : dk(wood, 0.12), 1);
      g.beginPath(); g.moveTo(x0, p.y - 18); g.lineTo(x1, p.y - 18); g.lineTo(bx1, p.y + 16); g.lineTo(bx0, p.y + 16); g.closePath(); g.fillPath();
      g.lineStyle(1, dk(wood, 0.45), 0.9);
      for (let i = 1; i < 4; i++) {
        const t = i / 4;
        g.beginPath(); g.moveTo(x0 + (x1 - x0) * t, p.y - 18); g.lineTo(bx0 + (bx1 - bx0) * t, p.y + 16); g.strokePath();
      }
      g.fillStyle(0x2a2a30, 1); g.fillRect(Math.min(x0, bx0), p.y - 9, Math.abs(bx1 - bx0), 3); g.fillRect(Math.min(x0, bx0) - 1, p.y + 6, Math.abs(bx1 - bx0) + 2, 3);
      g.lineStyle(2, 0x8a8a90, 1); g.strokeCircle(p.x + sd * 6, p.y + 1, 3);
    }
    g.lineStyle(2, 0x1a1210, 1); g.beginPath(); g.moveTo(p.x, p.y - 18); g.lineTo(p.x, p.y + 16); g.strokePath();
    this.addCull(g, p.x - 60, p.y - 60, p.x + 60, p.y + 40);
    // A frost lantern on a hook marks it.
    const done = this.st.gauntletDone;
    this.addFx(p.x - 70, p.y - 80, p.x + 70, p.y + 50, p.y - 20, (fg, t) => {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2);
      const c = done ? 0xffc44d : 0x4fc3ff;
      fg.fillStyle(0x2a2428, 1); fg.fillRect(p.x + 34, p.y - 50, 3, 34); fg.fillRect(p.x + 34, p.y - 50, 10, 2);
      fg.fillStyle(c, 0.9); fg.fillRoundedRect(p.x + 40, p.y - 47, 7, 9, 2);
      fg.fillStyle(c, 0.12 + pulse * 0.08); fg.fillCircle(p.x + 43, p.y - 42, 16 + pulse * 3);
      // Light leaking through the seam.
      fg.fillStyle(c, 0.25 + pulse * 0.2); fg.fillRect(p.x - 1, p.y - 16, 2, 30);
    });
  }

  // ── Sewer grate ────────────────────────────────────────────────────

  private drawGrate(): void {
    const p = this.L.spots.grate;
    const g = this.gfx(Z_FLAT + 10);
    g.fillStyle(0x000000, 0.4); g.fillEllipse(p.x, p.y + 2, 74, 34);
    g.fillStyle(0x3a3a40, 1); g.fillEllipse(p.x, p.y, 66, 30);
    g.fillStyle(0x0a0a0e, 1); g.fillEllipse(p.x, p.y, 56, 24);
    g.lineStyle(3, 0x4a4a52, 1);
    for (let i = -3; i <= 3; i++) {
      const hw = Math.sqrt(Math.max(0, 1 - (i / 3.6) ** 2)) * 27;
      g.beginPath(); g.moveTo(p.x + i * 7.5, p.y - hw * 0.44); g.lineTo(p.x + i * 7.5, p.y + hw * 0.44); g.strokePath();
    }
    g.lineStyle(2, 0x4a4a52, 1); g.beginPath(); g.moveTo(p.x - 26, p.y); g.lineTo(p.x + 26, p.y); g.strokePath();
    g.lineStyle(1, 0x6a6a74, 0.8); g.strokeEllipse(p.x, p.y, 66, 30);
    // Grime streaks.
    g.fillStyle(0x2a3a1a, 0.4); g.fillEllipse(p.x + 30, p.y + 12, 22, 7);
    this.addCull(g, p.x - 50, p.y - 30, p.x + 50, p.y + 30);
    // Corrupt mist welling up from below.
    this.addFx(p.x - 70, p.y - 110, p.x + 70, p.y + 40, p.y + 1, (fg, t) => {
      for (let i = 0; i < 7; i++) {
        const ph = (t * 0.45 + i / 7) % 1;
        const x = p.x + Math.sin(i * 2.3 + t * 1.3) * 16 * (1 - ph);
        const y = p.y - ph * 70;
        fg.fillStyle(i % 2 ? 0xd946ef : 0x7cff3d, (1 - ph) * 0.22);
        fg.fillCircle(x, y, 7 + ph * 16);
      }
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.1);
      fg.fillStyle(0xd946ef, 0.2 + pulse * 0.2);
      for (let i = -2; i <= 2; i++) fg.fillCircle(p.x + i * 7.5 + 3.5, p.y + Math.sin(t * 2 + i) * 3, 1.6);
    });
  }

  // ── Exits ──────────────────────────────────────────────────────────

  private drawExits(): void {
    for (const e of this.L.exits) {
      const info = this.st.exits.find((x) => x.worldId === e.worldId);
      const name = info?.label ?? e.worldId.toUpperCase();
      const arrow = e.dir.x > 0 ? '→' : e.dir.x < 0 ? '←' : e.dir.y < 0 ? '↑' : '↓';
      // Signpost.
      const s = e.sign;
      const g = this.gfx(s.y);
      g.fillStyle(0x000000, 0.3); g.fillEllipse(s.x + 3, s.y + 1, 24, 7);
      g.fillStyle(0x4a3424, 1); g.fillRect(s.x - 3, s.y - 52, 6, 52);
      const text = e.dir.x < 0 ? `${arrow} ${name}` : `${name} ${arrow}`;
      const t = this.label(s.x, s.y - 58, text, s.y + 0.5, { size: 11, color: '#2a1808', stroke: '', spacing: 1 });
      const bw = t.width + 28;
      g.fillStyle(0x3a2414, 1); g.fillRect(s.x - bw / 2 - 3, s.y - 72, bw + 6, 28);
      g.fillStyle(info?.locked ? 0x8a7a6a : 0xd8b070, 1); g.fillRect(s.x - bw / 2, s.y - 69, bw, 22);
      g.lineStyle(1, 0x8a6a3a, 0.6); g.beginPath(); g.moveTo(s.x - bw / 2 + 2, s.y - 63); g.lineTo(s.x + bw / 2 - 2, s.y - 63); g.strokePath();
      g.fillStyle(0x2a1a0e, 1); g.fillCircle(s.x - bw / 2 + 5, s.y - 58, 1.5); g.fillCircle(s.x + bw / 2 - 5, s.y - 58, 1.5);
      this.addCull(g, s.x - bw, s.y - 90, s.x + bw, s.y + 10);

      if (info?.locked) this.drawBarricade(e.barricade, e.dir);
    }
  }

  private drawBarricade(b: Rect, dir: Pt): void {
    const g = this.gfx(b.y + b.h);
    const horiz = dir.y !== 0; // road runs vertically, barricade spans x
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    g.fillStyle(0x000000, 0.3); g.fillEllipse(cx + 4, b.y + b.h + 2, (horiz ? b.w : b.h) + 20, 16);
    const span = horiz ? b.w : b.h;
    const ax = horiz ? 1 : 0, ay = horiz ? 0 : 1;
    // Sawhorse X-frames.
    for (const t of [-0.42, 0, 0.42]) {
      const x = cx + ax * span * t, y = cy + ay * span * t;
      g.lineStyle(4, 0x5a3a20, 1);
      g.beginPath(); g.moveTo(x - 10, y + 10); g.lineTo(x + 10, y - 26); g.moveTo(x + 10, y + 10); g.lineTo(x - 10, y - 26); g.strokePath();
    }
    // Striped bars.
    for (const yy of [-18, -6]) {
      const x0 = cx - ax * span / 2 - 6, y0 = cy - ay * span / 2 + yy;
      const len = span + 12;
      const n = Math.round(len / 14);
      for (let i = 0; i < n; i++) {
        g.fillStyle(i % 2 ? 0xf4f0e8 : 0xc01818, 1);
        if (horiz) g.fillRect(x0 + (len * i) / n, y0, len / n, 7);
        else g.fillRect(cx - 4, cy - span / 2 - 6 + (len * i) / n + yy * 0, 8, len / n);
      }
    }
    // A sealed notice.
    g.fillStyle(0xe8dcb8, 1); g.fillRect(cx - 18, cy - 44, 36, 20);
    g.lineStyle(1.5, 0x8a1a1a, 1); g.strokeRect(cx - 18, cy - 44, 36, 20);
    g.fillStyle(0xc01818, 1); g.fillCircle(cx + 12, cy - 28, 4);
    g.lineStyle(1, 0x2a1a10, 0.8);
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(cx - 14, cy - 39 + i * 5); g.lineTo(cx + 6, cy - 39 + i * 5); g.strokePath(); }
    // Rubble.
    g.fillStyle(0x6a6460, 1); g.fillCircle(cx - span * 0.3 * ax + 8, cy + 10, 6); g.fillCircle(cx + span * 0.35 * ax - 6 * ay, cy + 8 + span * 0.3 * ay, 5);
    this.addCull(g, b.x - 60, b.y - 80, b.x + b.w + 60, b.y + b.h + 30);
    this.label(cx, cy - 56, 'SEALED', b.y + b.h + 0.5, { size: 9, color: '#ff8a8a', spacing: 2 });
  }

  // ── Realm portals and the Amalgam's pit ────────────────────────────

  private drawPortal(p: Pt, text: string, color: number): void {
    const g = this.gfx(p.y);
    const st = mix(0x8a8478, this.th.wall, 0.3);
    g.fillStyle(0x000000, 0.35); g.fillEllipse(p.x + 4, p.y + 4, 110, 26);
    for (const sx of [-1, 1]) {
      g.fillStyle(dk(st, 0.15), 1); g.fillRect(p.x + sx * 38 - 9, p.y - 70, 18, 72);
      g.fillStyle(lt(st, 0.1), 1); g.fillRect(p.x + sx * 38 - 9, p.y - 70, 5, 72);
      for (let i = 0; i < 4; i++) { g.fillStyle(color, 0.8); g.fillRect(p.x + sx * 38 - 2, p.y - 60 + i * 16, 4, 6); }
    }
    g.lineStyle(14, st, 1); g.beginPath(); g.arc(p.x, p.y - 70, 38, Math.PI, 0, false); g.strokePath();
    g.lineStyle(2, dk(st, 0.4), 1); g.beginPath(); g.arc(p.x, p.y - 70, 45, Math.PI, 0, false); g.strokePath();
    g.fillStyle(color, 1); g.fillCircle(p.x, p.y - 112, 5);
    this.addCull(g, p.x - 80, p.y - 150, p.x + 80, p.y + 20);
    this.label(p.x, p.y - 132, text, p.y + 0.5, { size: 9, color: hex(lt(color, 0.5)), spacing: 1.5 });
    this.addFx(p.x - 70, p.y - 140, p.x + 70, p.y + 20, p.y - 0.5, (fg, t) => {
      const cy = p.y - 50;
      for (let k = 0; k < 4; k++) {
        fg.fillStyle(k % 2 ? color : lt(color, 0.3), 0.18 + k * 0.08);
        fg.fillEllipse(p.x, cy, 60 - k * 12, 92 - k * 18);
      }
      fg.lineStyle(2, lt(color, 0.5), 0.8);
      for (let i = 0; i < 3; i++) {
        const a0 = t * 2.2 + (i / 3) * Math.PI * 2;
        fg.beginPath();
        for (let s = 0; s <= 12; s++) {
          const a = a0 + s * 0.35, rr = 26 - s * 1.8;
          const x = p.x + Math.cos(a) * rr * 0.62, y = cy + Math.sin(a) * rr;
          if (s === 0) fg.moveTo(x, y); else fg.lineTo(x, y);
        }
        fg.strokePath();
      }
      fg.fillStyle(0xffffff, 0.8); fg.fillCircle(p.x, cy, 3 + Math.sin(t * 4) * 1);
      fg.fillStyle(color, 0.1); fg.fillEllipse(p.x, p.y + 4, 100, 22);
    });
  }

  private drawAmalgam(p: Pt, open: boolean, felled: boolean): void {
    const g = this.gfx(Z_FLAT + 12);
    g.fillStyle(0x000000, 0.5); g.fillEllipse(p.x, p.y, 150, 66);
    g.fillStyle(0x2a0a0a, 1); g.fillEllipse(p.x, p.y, 130, 56);
    g.fillStyle(0x0a0202, 1); g.fillEllipse(p.x, p.y + 4, 104, 42);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillStyle(0x4a3430, 1); g.fillCircle(p.x + Math.cos(a) * 64, p.y + Math.sin(a) * 27, 6 + (i % 3) * 2);
    }
    // Broken chains anchored at the rim.
    g.lineStyle(2, 0x6a6064, 1);
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) g.strokeEllipse(p.x + sx * (60 - i * 8), p.y - 30 + i * 6, 7, 4);
    this.addCull(g, p.x - 90, p.y - 60, p.x + 90, p.y + 50);
    this.label(p.x, p.y - 64, felled ? 'THE AMALGAM  ★' : 'THE AMALGAM', p.y + 0.5, { size: 10, color: felled ? '#ffc44d' : '#ff6b85', spacing: 2 });
    this.addFx(p.x - 90, p.y - 120, p.x + 90, p.y + 50, Z_FLAT + 13, (fg, t) => {
      const pulse = 0.5 + 0.5 * Math.sin(t * (open ? 2.4 : 1.1));
      fg.fillStyle(0xc4392c, (open ? 0.25 : 0.1) + pulse * 0.15); fg.fillEllipse(p.x, p.y + 4, 90, 34);
      fg.fillStyle(0xff4d6d, (open ? 0.2 : 0.06) * pulse); fg.fillEllipse(p.x, p.y + 4, 50, 18);
      if (open) {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + t * 0.4;
          fg.lineStyle(4, 0x3a0a10, 0.9); fg.beginPath();
          const bx = p.x + Math.cos(a) * 30, by = p.y + Math.sin(a) * 12;
          fg.moveTo(bx, by);
          for (let s = 1; s <= 5; s++) fg.lineTo(bx + Math.cos(a) * s * 6 + Math.sin(t * 2 + s + i) * 5, by - s * 10);
          fg.strokePath();
        }
      }
    });
  }

  /** Distance check used by the scene to keep NPCs on paved ground. */
  onRoad(p: Pt): boolean {
    return this.L.roads.some((rd) => distToPolyline(p, rd.pts) < rd.w / 2);
  }
}

/** Crates and a sack outside the shop. */
function PROPSIDE(g: G, x: number, y: number, th: TownTheme, rng: () => number): void {
  drawProp(g, 'crate', x, y, 0.9, th, rng);
  drawProp(g, 'barrel', x + 6, y - 22, 0.8, th, rng);
  g.fillStyle(0xc8a870, 1); g.fillEllipse(x - 20, y - 6, 16, 18);
  g.fillStyle(0x8a6a3a, 1); g.fillRect(x - 22, y - 16, 5, 3);
}
