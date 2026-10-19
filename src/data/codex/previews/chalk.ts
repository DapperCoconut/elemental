import Phaser from 'phaser';
import { PreviewScript, PreviewCtx } from '../../../ui/AbilityPreview';
import { BaseAvatar } from '../../../elements/kits/ElementVisuals';
import {
  PNT, PAINT_TONE, PaintAvatar, PaintFx, PaintKind, PaintSeg, paintChip, paintLayer, yinYang,
} from '../../../elements/kits/PaintVisuals';

/**
 * Paint's showcases (element id `chalk`).
 *
 * Every dab on the floor is laid with `paintLayer` exactly as the kit lays it — flat coats that
 * merge seamlessly, a linked dab a stroke from the one before, an unlinked one a blob.
 * Each loop drives a `pen`: a cursor path and a dab every `step` px, which is the kit's
 * `feedSession` in miniature.
 *
 * Containment: `ctx.at`/`ctx.onFrame` run outside the harness's capture window, so anything
 * built inside one goes through `ctx.adopt`. `PaintFx` carries a sticky sink.
 */

// ── The kit's constants, mirrored ─────────────────────────────────────

const SHAPE_DAB_R = 5;
const SPLOTCH_SPEED = 420;
const ORANGE_DRAW_MS = 2000;
const ORANGE_FUSE_MS = 800;
const ORANGE_STAGGER_MS = 50;
const ORANGE_RADIUS = 38;
const WALL_DRAW_MS = 1500;
const MP_BRUSH = 78;

interface Pt { x: number; y: number }
interface FDab { x: number; y: number; px: number; py: number; linked: boolean; seed: number; kind: PaintKind; w: number }

function stage(ctx: PreviewCtx): { fx: PaintFx; av: BaseAvatar; pav: PaintAvatar | null } {
  const fx = ctx.capture(() => new PaintFx(ctx.scene, ctx.tint).setSink(ctx.sink));
  const av = ctx.useAvatar(() => new PaintAvatar(ctx.scene, ctx.tint));
  av.setFacing(ctx.aim);
  return { fx, av, pav: av instanceof PaintAvatar ? av : null };
}

/** A stand-in enemy we can hide (Still Life replaces it with the picture). */
function dummyAt(ctx: PreviewCtx, m: Pt, shown: () => boolean = () => true): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(5));
  ctx.onFrame(() => {
    g.clear();
    if (!shown()) return;
    g.fillStyle(0x2b2f3d, 1);
    g.fillCircle(m.x, m.y, 17);
    g.fillStyle(0x3c4254, 1);
    g.fillCircle(m.x, m.y, 13);
    g.fillStyle(0x8e97ad, 0.9);
    g.fillCircle(m.x - 5, m.y - 4, 3.2);
    g.fillCircle(m.x + 5, m.y - 4, 3.2);
    g.fillStyle(0x11131b, 1);
    g.fillCircle(m.x - 5.6, m.y - 4, 1.6);
    g.fillCircle(m.x + 4.4, m.y - 4, 1.6);
  });
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function tick(ctx: PreviewCtx, x: number, y: number, text: string, color: number): void {
  const t = ctx.adopt(ctx.scene.add.text(x, y, text, {
    fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif',
    color: hex(color), stroke: '#0b0e10', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(20));
  const y0 = y;
  let age = 0;
  ctx.onFrame((dt) => {
    age += dt;
    t.setY(y0 - (age / 780) * 20);
    t.setAlpha(Phaser.Math.Clamp(1 - age / 780, 0, 1));
  });
}

/** The floor, laid exactly as the kit lays it. */
function floor(ctx: PreviewCtx, dabs: FDab[], depth = 2): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(depth));
  ctx.onFrame(() => {
    g.clear();
    paintLayer(g, ctx.tint, dabs.map((d) => ({ x: d.x, y: d.y, px: d.px, py: d.py, linked: d.linked, w: d.w, kind: d.kind })));
  });
}

/** Canvas-style points as one layer at (`x`, `y`), scale `k`, brush `w`. */
function ptsLayer(g: Phaser.GameObjects.Graphics, ctx: PreviewCtx, pts: { cx: number; cy: number; kind: PaintKind }[],
  x: number, y: number, k: number, w: number): void {
  const segs: PaintSeg[] = pts.map((p, i) => ({
    x: x + p.cx * k, y: y + p.cy * k,
    px: x + (pts[i - 1] ?? p).cx * k, py: y + (pts[i - 1] ?? p).cy * k,
    linked: i > 0, w, kind: p.kind,
  }));
  paintLayer(g, ctx.tint, segs);
}

/** A painting window: walks `path` and lays a dab every `step` px. */
function pen(ctx: PreviewCtx, dabs: FDab[], o: {
  startMs: number; endMs: number; step: number; w: number;
  kind: (t: number) => PaintKind;
  path: (t: number) => Pt;
  onDab?: (d: FDab, i: number) => void;
}): void {
  let started = false;
  let lx = 0;
  let ly = 0;
  let n = 0;
  const cur = ctx.adopt(ctx.scene.add.graphics().setDepth(12));
  ctx.onFrame((_dt, elapsed) => {
    cur.clear();
    if (elapsed < o.startMs || elapsed > o.endMs) return;
    const t = (elapsed - o.startMs) / (o.endMs - o.startMs);
    const p = o.path(t);
    const kind = o.kind(t);
    cur.lineStyle(1.4, ctx.tint(PAINT_TONE[kind]), 0.9);
    cur.strokeCircle(p.x, p.y, 6);
    if (started && Phaser.Math.Distance.Between(lx, ly, p.x, p.y) < o.step) return;
    const d: FDab = { x: p.x, y: p.y, px: lx, py: ly, linked: started, seed: n * 37.7, kind, w: o.w };
    dabs.push(d);
    o.onDab?.(d, n);
    n++;
    lx = p.x;
    ly = p.y;
    started = true;
  });
}

/** A flying Splotch, drawn as the kit draws one: the shape's blobs, turned to its heading. */
function flySplotch(ctx: PreviewCtx, fx: PaintFx, shape: { f: number; l: number; kind: PaintKind }[], from: Pt, to: Pt,
  atMs: number, onTouch?: () => void): void {
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const dist = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
  const ms = (dist / SPLOTCH_SPEED) * 1000;
  let touched = false;
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    const t = (elapsed - atMs) / ms;
    if (t < 0 || t > 1.4) return;
    const x = from.x + Math.cos(ang) * dist * t;
    const y = from.y + Math.sin(ang) * dist * t;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    let prev: Pt | null = null;
    const segs: PaintSeg[] = [];
    for (const d of shape) {
      const wx = x + d.f * c - d.l * s;
      const wy = y + d.f * s + d.l * c;
      const linked = !!prev && Phaser.Math.Distance.Between(prev.x, prev.y, wx, wy) <= SHAPE_DAB_R * 2.6;
      segs.push({ x: wx, y: wy, px: prev ? prev.x : wx, py: prev ? prev.y : wy, linked, w: SHAPE_DAB_R * 2, kind: d.kind });
      prev = { x: wx, y: wy };
    }
    paintLayer(g, ctx.tint, segs);
    if (!touched && t >= 0.85) { touched = true; onTouch?.(); fx.flecks(to.x, to.y, 4, 14, shape[0].kind, 300); }
  });
}

function blobShape(): { f: number; l: number; kind: PaintKind }[] {
  const out: { f: number; l: number; kind: PaintKind }[] = [{ f: 0, l: 0, kind: 'black' }];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    out.push({ f: Math.cos(a) * 6, l: Math.sin(a) * 6, kind: 'black' });
  }
  return out;
}

function barShape(colored: boolean): { f: number; l: number; kind: PaintKind }[] {
  const out: { f: number; l: number; kind: PaintKind }[] = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    const kind: PaintKind = !colored ? 'black' : u < 0.6 ? 'red' : u < 0.8 ? 'blue' : 'green';
    out.push({ f: 0, l: -33 + u * 66, kind });
  }
  return out;
}

/** A little easel with a picture being painted on it, `prog` 0→1. */
function easel(g: Phaser.GameObjects.Graphics, ctx: PreviewCtx, x: number, y: number, size: number,
  pts: { cx: number; cy: number; kind: PaintKind }[], prog: number): void {
  g.lineStyle(2, ctx.tint(PNT.wood), 1);
  g.lineBetween(x - 14, y + size / 2 + 12, x - 6, y - size / 2);
  g.lineBetween(x + 14, y + size / 2 + 12, x + 6, y - size / 2);
  g.fillStyle(ctx.tint(PNT.woodDark), 1);
  g.fillRect(x - size / 2 - 2, y - size / 2 - 2, size + 4, size + 4);
  g.fillStyle(ctx.tint(PNT.canvas), 1);
  g.fillRect(x - size / 2, y - size / 2, size, size);
  ptsLayer(g, ctx, pts.slice(0, Math.floor(pts.length * prog)), x, y, 1, 2.4);
}

function ringPts(r: number, colored: boolean): { cx: number; cy: number; kind: PaintKind }[] {
  const out: { cx: number; cy: number; kind: PaintKind }[] = [];
  const n = 36;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = u * Math.PI * 2;
    out.push({ cx: Math.cos(a) * r, cy: Math.sin(a) * r, kind: !colored ? 'black' : u < 0.45 ? 'red' : u < 0.75 ? 'blue' : 'green' });
  }
  return out;
}

// ── Click — Splotch ───────────────────────────────────────────────────

function splotchLoop(ctx: PreviewCtx, colored: boolean): void {
  const { fx, av } = stage(ctx);
  const foe = { x: ctx.w * 0.66, y: ctx.cy };
  dummyAt(ctx, foe);
  const shapes = [blobShape(), barShape(colored), colored ? barShape(true) : blobShape()];
  shapes.forEach((shape, i) => {
    const at = 300 + i * 900;
    ctx.at(at, () => av.play('punch'));
    flySplotch(ctx, fx, shape, { x: ctx.cx + 18, y: ctx.cy }, { x: foe.x + 120, y: foe.y }, at, () => {
      if (shape.length > 10) {
        tick(ctx, foe.x, foe.y - 30, colored ? '2  🐌 🧪' : '1', colored ? PNT.red : PNT.black);
        tick(ctx, foe.x, foe.y - 48, 'WIDE · SOFT', PNT.canvas);
      } else {
        tick(ctx, foe.x, foe.y - 30, '4', PNT.rose);
        tick(ctx, foe.x, foe.y - 48, 'TIGHT · HARD', PNT.canvas);
      }
    });
  });
}

export const splotch: PreviewScript = {
  duration: 3400,
  scale: 0.9,
  caption: 'Whatever you painted on the canvas flies, pierces, and shreds whatever it is touching',
  run: (ctx) => splotchLoop(ctx, false),
};

export const splotchUpgraded: PreviewScript = {
  duration: 3400,
  scale: 0.9,
  caption: 'Primary Colours — red hits harder, blue slows, green poisons, by how much of each you used',
  run: (ctx) => splotchLoop(ctx, true),
};

// ── E — Volatile Orange ───────────────────────────────────────────────

function orangeLoop(ctx: PreviewCtx, bucket: boolean): void {
  const { fx, av, pav } = stage(ctx);
  const foe = { x: ctx.w * 0.64, y: ctx.cy };
  dummyAt(ctx, foe);
  const dabs: FDab[] = [];
  floor(ctx, dabs, 3);
  const run: FDab[] = [];
  ctx.at(200, () => { av.play('sweep'); pav?.setPaint('orange'); pav?.setDrawing(true); });
  pen(ctx, dabs, {
    startMs: 200, endMs: 200 + ORANGE_DRAW_MS, step: 16, w: 18, kind: () => 'orange',
    path: bucket
      ? (t) => ({ x: foe.x + Math.cos(t * Math.PI * 2.15) * 60, y: foe.y + Math.sin(t * Math.PI * 2.15) * 48 })
      : (t) => ({ x: foe.x - 110 + t * 220, y: foe.y + Math.sin(t * Math.PI * 3) * 30 }),
    onDab: (d) => run.push(d),
  });
  const closeAt = 200 + ORANGE_DRAW_MS;
  ctx.at(closeAt, () => pav?.setDrawing(false));
  ctx.at(closeAt + ORANGE_FUSE_MS, () => {
    run.forEach((d, i) => {
      ctx.at(closeAt + ORANGE_FUSE_MS + i * ORANGE_STAGGER_MS, () => {
        fx.boom(d.x, d.y, ORANGE_RADIUS);
        const k = dabs.indexOf(d);
        if (k >= 0) dabs.splice(k, 1);
        if (Phaser.Math.Distance.Between(d.x, d.y, foe.x, foe.y) <= ORANGE_RADIUS && i % 4 === 0) tick(ctx, foe.x, foe.y - 30, '10', PNT.orange);
      });
    });
  });
  if (!bucket) return;
  ctx.at(closeAt, () => {
    fx.bucket(ctx.cx, ctx.cy - 10, foe.x, foe.y, 450, () => {
      fx.splat(foe.x, foe.y, 46, 'orange', 420);
      tick(ctx, foe.x, foe.y - 56, '🪣 BUCKET', PNT.orange);
      const fill: FDab[] = [];
      for (let gx = -48; gx <= 48; gx += 24) {
        for (let gy = -36; gy <= 36; gy += 24) {
          if ((gx * gx) / (60 * 60) + (gy * gy) / (48 * 48) > 0.85) continue;
          const d: FDab = { x: foe.x + gx, y: foe.y + gy, px: 0, py: 0, linked: false, seed: gx * 3 + gy, kind: 'orange', w: 20 };
          fill.push(d);
          dabs.push(d);
        }
      }
      fill.forEach((d) => {
        const wave = (Math.hypot(d.x - foe.x, d.y - foe.y) / 60) * 500;
        ctx.at(closeAt + 450 + 400 + wave, () => {
          fx.boom(d.x, d.y, 30);
          const k = dabs.indexOf(d);
          if (k >= 0) dabs.splice(k, 1);
        });
      });
    });
  });
}

export const orange: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Two seconds of orange, then it goes off from where you started to where you finished',
  run: (ctx) => orangeLoop(ctx, false),
};

export const orangeUpgraded: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Paint Bucket — close the loop and the inside is painted orange and goes off from the middle out',
  run: (ctx) => orangeLoop(ctx, true),
};

// ── R — Congealed Paint ───────────────────────────────────────────────

function congealLoop(ctx: PreviewCtx, colored: boolean): void {
  const { fx, av, pav } = stage(ctx);
  const foe = { x: ctx.w * 0.74, y: ctx.cy };
  dummyAt(ctx, foe);
  const wallX = ctx.cx + (foe.x - ctx.cx) * 0.4;
  const dabs: FDab[] = [];
  floor(ctx, dabs, 2);
  ctx.at(200, () => { av.play('slam'); pav?.setPaint('congeal'); pav?.setDrawing(true); });
  const kind = (t: number): PaintKind => (!colored ? 'congeal' : t < 0.33 ? 'red' : t < 0.66 ? 'blue' : 'green');
  pen(ctx, dabs, {
    startMs: 200, endMs: 200 + WALL_DRAW_MS, step: 8, w: 6, kind,
    path: (t) => ({ x: wallX + Math.sin(t * 7) * 4, y: ctx.cy - 70 + t * 140 }),
    onDab: (d) => pav?.setPaint(d.kind),
  });
  ctx.at(200 + WALL_DRAW_MS, () => pav?.setDrawing(false));
  const shots = [{ y: ctx.cy - 45, k: 'red' as PaintKind }, { y: ctx.cy, k: 'blue' as PaintKind }, { y: ctx.cy + 45, k: 'green' as PaintKind }];
  shots.forEach((s, i) => {
    const at = 2000 + i * 500;
    ctx.at(at, () => {
      ctx.fly({
        texture: 'proj-fire', from: { x: foe.x, y: s.y }, to: { x: wallX + 8, y: s.y }, speed: 380,
        onHit: () => {
          const hitKind: PaintKind = colored ? s.k : 'congeal';
          fx.snap(wallX + 6, s.y, hitKind);
          if (!colored) { tick(ctx, wallX, s.y - 20, 'BLOCKED', PNT.congeal); return; }
          if (hitKind === 'red') tick(ctx, foe.x, foe.y - 30, '8 ↩', PNT.red);
          else if (hitKind === 'blue') tick(ctx, ctx.cx, ctx.cy - 40, '💨 +35%', PNT.blue);
          else tick(ctx, ctx.cx, ctx.cy - 40, '+6', PNT.green);
        },
      });
    });
  });
}

export const congeal: PreviewScript = {
  duration: 4200,
  scale: 0.9,
  caption: 'A fine brush for 1.5s — the line sets into a wall that stops shots and bodies for 6s',
  run: (ctx) => congealLoop(ctx, false),
};

export const congealUpgraded: PreviewScript = {
  duration: 4200,
  scale: 0.9,
  caption: 'Coloured Walls — red answers the shooter, blue speeds you, green heals you',
  run: (ctx) => congealLoop(ctx, true),
};

// ── F — Still Life ────────────────────────────────────────────────────

function stillLoop(ctx: PreviewCtx, colored: boolean): void {
  const { fx, av, pav } = stage(ctx);
  const foe = { x: ctx.w * 0.66, y: ctx.cy };
  const DONE = 2200;
  let transformed = false;
  dummyAt(ctx, foe, () => !transformed);
  const pts = ringPts(18, colored);
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
  const pic = ctx.adopt(ctx.scene.add.graphics().setDepth(6));
  ctx.at(200, () => { av.play('raise'); pav?.setDrawing(true); });
  ctx.onFrame((_dt, elapsed) => {
    g.clear();
    pic.clear();
    if (elapsed > 200 && elapsed < DONE) easel(g, ctx, ctx.cx, ctx.cy - 62, 44, pts, (elapsed - 200) / (DONE - 400));
    if (!transformed) return;
    const R = 48;
    pic.fillStyle(ctx.tint(PNT.canvas), 0.16);
    pic.fillCircle(foe.x, foe.y, R);
    pic.lineStyle(1, ctx.tint(PNT.canvasDeep), 0.4);
    pic.strokeCircle(foe.x, foe.y, R);
    const k = R / 20;
    ptsLayer(pic, ctx, pts, foe.x, foe.y, k, SHAPE_DAB_R * 2);
    pic.fillStyle(ctx.tint(PNT.white), 1);
    pic.fillCircle(foe.x - 5, foe.y - 3, 3);
    pic.fillCircle(foe.x + 5, foe.y - 3, 3);
    pic.fillStyle(ctx.tint(PNT.black), 1);
    pic.fillCircle(foe.x - 4.4, foe.y - 2.6, 1.5);
    pic.fillCircle(foe.x + 5.6, foe.y - 2.6, 1.5);
  });
  ctx.at(DONE, () => {
    transformed = true;
    pav?.setDrawing(false);
    fx.ring(foe.x, foe.y, 8, 70, 'black', 480);
    tick(ctx, foe.x, foe.y - 70, '🖼️ STILL LIFE', PNT.rose);
  });
  ctx.at(DONE + 700, () => tick(ctx, foe.x, foe.y - 60, 'HITBOX 22 → 48px', PNT.canvas));
  if (colored) {
    ctx.at(DONE + 1300, () => tick(ctx, foe.x, foe.y - 60, '🐌 SLOWED · 🚫 HEAL', PNT.blue));
    ctx.at(DONE + 1700, () => {
      ctx.fly({ texture: 'proj-fire', from: { x: ctx.cx + 20, y: foe.y - 30 }, to: { x: foe.x - 30, y: foe.y - 30 }, speed: 500, onHit: () => tick(ctx, foe.x - 30, foe.y - 50, '×1.5 RED', PNT.red) });
    });
  }
  ctx.at(DONE + 3200, () => { transformed = false; fx.flecks(foe.x, foe.y, 12, 50, 'black', 520); });
}

export const stillLife: PreviewScript = {
  duration: 5800,
  scale: 0.9,
  caption: 'Paint a picture, and the enemy becomes it — its hitbox is whatever you drew',
  run: (ctx) => stillLoop(ctx, false),
};

export const stillLifeUpgraded: PreviewScript = {
  duration: 5800,
  scale: 0.9,
  caption: 'Painted Portrait — red parts take ×1.5, blue slows them, green stops healing and weakens',
  run: (ctx) => stillLoop(ctx, true),
};

// ── Q — Masterpiece ───────────────────────────────────────────────────

function mpLoop(ctx: PreviewCtx, chips: boolean): void {
  const { fx, av, pav } = stage(ctx);
  const foe = { x: ctx.w * 0.66, y: ctx.cy };
  dummyAt(ctx, foe);
  const dabs: FDab[] = [];
  floor(ctx, dabs, 2);
  // The picture, in canvas px about the painter: blue under you, a red ring on the foe, green round you.
  const S = 1.8;
  const pic: { cx: number; cy: number; kind: PaintKind; linked: boolean }[] = [];
  const ring = (x: number, y: number, r: number, kind: PaintKind) => {
    const n = Math.max(4, Math.round((Math.PI * 2 * r) / 20));
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      pic.push({ cx: x + Math.cos(a) * r, cy: y + Math.sin(a) * r, kind, linked: i > 0 });
    }
  };
  ring(0, 0, 10, 'blue');
  const rx = (foe.x - ctx.cx) / S;
  ring(rx, 0, 16, 'red');
  ring(0, 0, 32, 'green');
  const easelG = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
  const UNVEIL = 2200;
  ctx.at(200, () => {
    av.play('raise');
    pav?.setDrawing(true);
    tick(ctx, ctx.cx, ctx.cy - 50, '🎨 MASTERPIECE', PNT.rose);
  });
  ctx.onFrame((_dt, elapsed) => {
    easelG.clear();
    if (elapsed < 200 || elapsed >= UNVEIL) return;
    const prog = (elapsed - 200) / (UNVEIL - 400);
    const k = 44 / 220;
    easel(easelG, ctx, ctx.cx, ctx.cy - 66, 44, pic.map((p) => ({ cx: p.cx * k * 1.8, cy: p.cy * k * 1.8, kind: p.kind })), prog);
    const shown = Math.floor(pic.length * Math.min(1, prog));
    pav?.setPaint(pic[Math.max(0, shown - 1)].kind);
  });
  ctx.at(UNVEIL, () => {
    pav?.setDrawing(false);
    let prev: FDab | null = null;
    pic.forEach((p, i) => {
      const d: FDab = {
        x: ctx.cx + p.cx * S, y: ctx.cy + p.cy * S, px: prev ? prev.x : 0, py: prev ? prev.y : 0,
        linked: !!prev && p.linked && prev.kind === p.kind, seed: i * 7.7, kind: p.kind, w: MP_BRUSH,
      };
      dabs.push(d);
      prev = d;
      if (i % 4 === 0) fx.splat(d.x, d.y, MP_BRUSH * 0.6, d.kind, 420);
    });
    fx.ring(ctx.cx, ctx.cy, 20, 160, 'red', 520);
    tick(ctx, ctx.cx, ctx.cy - 60, '🖼️ UNVEILED', PNT.rose);
  });
  ctx.at(UNVEIL + 500, () => tick(ctx, foe.x, foe.y - 30, '18/s', PNT.red));
  ctx.at(UNVEIL + 1300, () => tick(ctx, foe.x, foe.y - 30, '18/s', PNT.red));
  ctx.at(UNVEIL + 800, () => tick(ctx, ctx.cx, ctx.cy - 40, '💨 +40% · CD +60%', PNT.blue));
  ctx.at(UNVEIL + 1700, () => tick(ctx, ctx.cx, ctx.cy - 40, '+10/s · −30%', PNT.green));
  if (!chips) return;
  const bugs: { x: number; y: number; kind: 'red' | 'blue' | 'green'; born: number }[] = [];
  const g = ctx.adopt(ctx.scene.add.graphics().setDepth(4));
  [2700, 3200, 3700, 4200].forEach((at, i) => ctx.at(at, () => {
    const src = dabs[Math.floor(dabs.length * (0.2 + i * 0.2)) % Math.max(1, dabs.length)];
    if (!src) return;
    const k = src.kind === 'blue' ? 'blue' : src.kind === 'green' ? 'green' : 'red';
    bugs.push({ x: src.x, y: src.y, kind: k, born: at });
    fx.flecks(src.x, src.y, 4, 12, src.kind, 300);
  }));
  ctx.onFrame((dt, elapsed) => {
    g.clear();
    for (const b of bugs) {
      const goal = b.kind === 'green' ? { x: ctx.cx, y: ctx.cy } : foe;
      const a = Math.atan2(goal.y - b.y, goal.x - b.x);
      const d = Phaser.Math.Distance.Between(b.x, b.y, goal.x, goal.y);
      const sp = b.kind === 'red' ? 200 : b.kind === 'blue' ? 55 : 170;
      const stop = b.kind === 'blue' ? 120 : 18;
      if (d > stop) { b.x += Math.cos(a) * sp * dt / 1000; b.y += Math.sin(a) * sp * dt / 1000; }
      paintChip(g, ctx.tint, b.x, b.y, a, 7, b.kind, elapsed / 60, 1, b.born);
    }
  });
  ctx.at(4200, () => tick(ctx, ctx.cx, ctx.cy - 60, '🐞 PAINT CHIPS', PNT.red));
}

export const masterpiece: PreviewScript = {
  duration: 5000,
  scale: 0.9,
  caption: 'Paint it on a map of the arena, then it lands on the floor — red burns, blue hastes, green heals',
  run: (ctx) => mpLoop(ctx, false),
};

export const masterpieceUpgraded: PreviewScript = {
  duration: 5000,
  scale: 0.9,
  caption: 'Paint Chips — little paint bugs crawl off the Masterpiece in its colours',
  run: (ctx) => mpLoop(ctx, true),
};

// ── Passives ──────────────────────────────────────────────────────────

export const theCanvas: PreviewScript = {
  duration: 4400,
  scale: 0.9,
  caption: 'Right-click for a blank canvas — what you paint is what you throw',
  run: (ctx) => {
    const { fx, av } = stage(ctx);
    const foe = { x: ctx.w * 0.72, y: ctx.cy };
    dummyAt(ctx, foe);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    const pts: { cx: number; cy: number; kind: PaintKind }[] = [];
    for (let i = 0; i <= 16; i++) pts.push({ cx: 0, cy: -30 + i * 3.75, kind: 'black' });
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      if (elapsed < 200 || elapsed > 2000) return;
      const x = ctx.w * 0.38;
      const y = ctx.cy;
      g.fillStyle(ctx.tint(PNT.woodDark), 1);
      g.fillRect(x - 46, y - 46, 92, 92);
      g.fillStyle(ctx.tint(PNT.canvas), 1);
      g.fillRect(x - 42, y - 42, 84, 84);
      const shown = Math.floor(pts.length * Phaser.Math.Clamp((elapsed - 300) / 1200, 0, 1));
      ptsLayer(g, ctx, pts.slice(0, shown), x, y, 1, 10);
    });
    ctx.at(2100, () => av.play('punch'));
    flySplotch(ctx, fx, barShape(false), { x: ctx.cx + 18, y: ctx.cy }, { x: foe.x + 100, y: foe.y }, 2100,
      () => tick(ctx, foe.x, foe.y - 30, 'WIDE', PNT.canvas));
  },
};

export const paintingTheFloor: PreviewScript = {
  duration: 4600,
  scale: 0.9,
  caption: 'E, R and Q paint the floor under your cursor while their window is open',
  run: (ctx) => {
    const { fx, av, pav } = stage(ctx);
    const dabs: FDab[] = [];
    floor(ctx, dabs, 2);
    ctx.at(200, () => { av.play('sweep'); pav?.setPaint('orange'); pav?.setDrawing(true); });
    pen(ctx, dabs, {
      startMs: 200, endMs: 1700, step: 16, w: 18, kind: () => 'orange',
      path: (t) => ({ x: ctx.cx + 60 + t * 200, y: ctx.cy - 40 + Math.sin(t * 8) * 14 }),
    });
    ctx.at(1800, () => { av.play('slam'); pav?.setPaint('congeal'); });
    pen(ctx, dabs, {
      startMs: 1800, endMs: 3000, step: 8, w: 6, kind: () => 'congeal',
      path: (t) => ({ x: ctx.cx + 60 + t * 200, y: ctx.cy + 40 }),
    });
    ctx.at(3000, () => pav?.setDrawing(false));
    ctx.at(3300, () => {
      dabs.filter((d) => d.kind === 'orange').forEach((d, i) => ctx.at(3300 + i * 50, () => {
        fx.boom(d.x, d.y, ORANGE_RADIUS);
        const k = dabs.indexOf(d);
        if (k >= 0) dabs.splice(k, 1);
      }));
    });
  },
};

// ── Mastery ───────────────────────────────────────────────────────────

export const masteryUnfinished: PreviewScript = {
  duration: 3000,
  scale: 0.9,
  caption: 'Unfinished Study — this passive is coming in a later update',
  run: (ctx) => {
    stage(ctx);
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(7));
    ctx.onFrame((_dt, elapsed) => {
      g.clear();
      easel(g, ctx, ctx.w * 0.6, ctx.cy, 70, ringPts(22, false), (elapsed % 3000) / 2400);
    });
    ctx.at(600, () => tick(ctx, ctx.w * 0.6, ctx.cy - 56, 'COMING SOON', PNT.canvas));
  },
};

export const masteryYinYang: PreviewScript = {
  duration: 5200,
  scale: 0.9,
  caption: 'Yin-Yang — white on your bars recharges them faster, black on theirs slower',
  run: (ctx) => {
    const { av } = stage(ctx);
    const bars = [
      { x: ctx.w * 0.4, y: ctx.cy - 50, w: 150, h: 30, kind: 'white' as PaintKind, label: 'YOUR F' },
      { x: ctx.w * 0.4, y: ctx.cy + 20, w: 150, h: 30, kind: 'black' as PaintKind, label: 'THEIR Q' },
    ];
    const dabs: { b: number; u: number; v: number }[] = [];
    const g = ctx.adopt(ctx.scene.add.graphics().setDepth(8));
    ctx.at(200, () => av.play('flex'));
    let fillA = 0;
    let fillB = 0;
    ctx.onFrame((dt, elapsed) => {
      g.clear();
      const painting = elapsed > 300 && elapsed < 3000;
      if (painting && Math.floor(elapsed / 45) !== Math.floor((elapsed - dt) / 45)) {
        const b = elapsed < 1650 ? 0 : 1;
        const k = elapsed / 140;
        dabs.push({ b, u: 0.5 + 0.45 * Math.sin(k * 1.3), v: 0.5 + 0.38 * Math.sin(k * 2.9) });
      }
      const covA = Math.min(1, dabs.filter((d) => d.b === 0).length / 26);
      const covB = Math.min(1, dabs.filter((d) => d.b === 1).length / 26);
      fillA = (fillA + (dt / 4000) * (1 + covA)) % 1;
      fillB = (fillB + (dt / 4000) * (1 - 0.5 * covB)) % 1;
      bars.forEach((r, i) => {
        g.fillStyle(0x24202c, 0.92);
        g.fillRoundedRect(r.x, r.y, r.w, r.h, 5);
        g.fillStyle(i === 0 ? 0x4466aa : 0x5a6a8a, 0.75);
        g.fillRoundedRect(r.x + 2, r.y + 2, (r.w - 4) * (i === 0 ? fillA : fillB), r.h - 4, 4);
        g.lineStyle(1.5, 0xd8cbb0, 0.8);
        g.strokeRoundedRect(r.x, r.y, r.w, r.h, 5);
      });
      for (let b = 0; b < bars.length; b++) {
        const r = bars[b];
        paintLayer(g, ctx.tint, dabs.filter((d) => d.b === b).map((d) => {
          const x = r.x + d.u * r.w;
          const y = r.y + d.v * r.h;
          return { x, y, px: x, py: y, linked: false, w: 14, kind: r.kind };
        }), 0.9);
      }
      yinYang(g, ctx.tint, ctx.w * 0.4 - 22, ctx.cy - 15, 12, 1, elapsed / 400);
    });
    ctx.at(1200, () => tick(ctx, bars[0].x + 75, bars[0].y - 12, 'FASTER', PNT.white));
    ctx.at(2600, () => tick(ctx, bars[1].x + 75, bars[1].y + 44, 'SLOWER', PNT.black));
  },
};
