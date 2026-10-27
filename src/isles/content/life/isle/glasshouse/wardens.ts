import type Phaser from 'phaser';
import type { EncounterDef, EncounterGimmick, GimmickCtx, GimmickDef, Pt, Rect } from '../../../../IslesTypes';
import type { Fighter } from '../../../../../entities/Fighter';
import { dim, lit } from '../../../../art/IsleArt';
import { BRASS, GLASS, LEAF, ROSE, ROSE_PALE, SAP, SOIL, YEW, YEW_LIT, bramble, growLamp, rose, seedlingPot, shears, verdigraSigil } from './art';

/**
 * The Glasshouse's three wardens — the Empress's under-gardeners, one at the head of each wing.
 *
 * Each fight is the wing it closes. The Head Pruner judges what shape the garden is to be and
 * cuts everything that does not fit it; the Bellwarden rings the hedges of the pruned from one
 * place to another; the Nursemaid grows things under her lamps, and you are a thing. Every rule
 * cuts both ways: a player who reads it turns it on the warden.
 */

type Who = 'player' | 'npc';
const WHO: Who[] = ['player', 'npc'];
const alive = (f: Fighter): boolean => f.active && f.hp > 0;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const stepOf = (dt: number): number => clampN(dt, 0, 0.05);

// ── Warden 1: Cut to Shape ───────────────────────────────────────────

/**
 * The Head Pruner chalks a topiary template on the lawn — a rose, a peacock, a crown, a teapot —
 * and a wire frame grows up round it. When the frame is finished the giant shears run the floor
 * and clip everything that is *outside the shape*: 16 damage and shorn (slowed) for 2s. Whoever
 * is standing on the shape's heart (the rosette) when the shears run is Best in Show: +25%
 * damage for 4s. She wants the heart too.
 */
const cutToShape = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const WARN = ctx.hard ? 2200 : 2700;
  const CLIP = 620;
  const REST = ctx.hard ? 2000 : 2600;
  const HEART_R = 34;
  const SHORN_MS = 2000;
  const SHOW_MS = 4000;

  type Part = { k: 'c'; x: number; y: number; r: number } | { k: 'r'; x: number; y: number; w: number; h: number };
  interface Shape { name: string; parts: Part[]; heart: Pt }
  const c = (x: number, y: number, r: number): Part => ({ k: 'c', x, y, r });
  const rc = (x: number, y: number, w: number, h: number): Part => ({ k: 'r', x, y, w, h });
  const SHAPES: Shape[] = [
    { name: 'THE ROSE', parts: [c(0, -40, 98), rc(-18, 50, 36, 120), c(-56, 112, 34), c(56, 92, 34)], heart: { x: 0, y: -40 } },
    {
      name: 'THE PEACOCK',
      parts: [c(0, 70, 58), ...[-150, -120, -90, -60, -30].map((d) => c(Math.cos((d * Math.PI) / 180) * 118, 50 + Math.sin((d * Math.PI) / 180) * 118, 50))],
      heart: { x: 0, y: -68 },
    },
    { name: 'THE CROWN', parts: [rc(-160, 20, 320, 82), c(-112, 4, 46), c(0, -18, 50), c(112, 4, 46)], heart: { x: 0, y: -18 } },
    { name: 'THE TEAPOT', parts: [c(0, 20, 96), rc(78, -10, 96, 32), c(-112, 14, 40), c(0, -84, 30)], heart: { x: 150, y: 6 } },
  ];

  let state: 'idle' | 'warn' | 'clip' | 'rest' = 'idle';
  let at = 0;
  let shape = SHAPES[0];
  let last = -1;
  let ox = ctx.W / 2, oy = (top + ctx.H) / 2;
  const shornUntil: Record<Who, number> = { player: 0, npc: 0 };
  const showUntil: Record<Who, number> = { player: 0, npc: 0 };
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);

  const inside = (x: number, y: number): boolean => shape.parts.some((p) => (p.k === 'c'
    ? dist(x, y, ox + p.x, oy + p.y) <= p.r
    : x >= ox + p.x && x <= ox + p.x + p.w && y >= oy + p.y && y <= oy + p.y + p.h));
  const heart = (): Pt => ({ x: ox + shape.heart.x, y: oy + shape.heart.y });

  const nextShape = (time: number) => {
    let i = Math.floor(ctx.rng() * SHAPES.length);
    if (i === last) i = (i + 1) % SHAPES.length;
    last = i;
    shape = SHAPES[i];
    // Somewhere the whole thing fits on the lawn.
    ox = 330 + ctx.rng() * (ctx.W - 660);
    oy = top + 200 + ctx.rng() * Math.max(1, ctx.H - top - 380);
    state = 'warn';
    at = time + ctx.tk.warn(WARN);
    ctx.banner(`CUT TO SHAPE: ${shape.name}`, '#c8f0a8');
    ctx.sfx('trap-set');
  };

  const clip = (time: number) => {
    state = 'clip';
    at = time + CLIP;
    ctx.sfx('slash');
    const h = heart();
    for (const w of WHO) {
      const f = fighter(w);
      if (!alive(f)) continue;
      if (!inside(f.x, f.y)) {
        ctx.hit(f, 16, f.x, f.y);
        shornUntil[w] = time + SHORN_MS;
        ctx.float(f.x, f.y - 48, 'SHORN', '#e8f0e0');
        ctx.flash(f.x, f.y, 0xe8f0e0);
      } else if (dist(f.x, f.y, h.x, h.y) <= HEART_R + 6) {
        showUntil[w] = time + SHOW_MS;
        ctx.float(f.x, f.y - 52, 'BEST IN SHOW', '#ffd27a');
        ctx.sfx('jackpot');
      }
    }
  };

  /** Draw a part filled (inside) or as wire frame. */
  const fillPart = (g: Phaser.GameObjects.Graphics, p: Part) => {
    if (p.k === 'c') g.fillCircle(ox + p.x, oy + p.y, p.r);
    else g.fillRect(ox + p.x, oy + p.y, p.w, p.h);
  };
  const framePart = (g: Phaser.GameObjects.Graphics, p: Part, k: number) => {
    if (p.k === 'c') {
      g.beginPath(); g.arc(ox + p.x, oy + p.y, p.r, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
    } else {
      const per = (p.w + p.h) * 2;
      let left = per * k;
      const x0 = ox + p.x, y0 = oy + p.y;
      const segs: [number, number, number, number][] = [[x0, y0, x0 + p.w, y0], [x0 + p.w, y0, x0 + p.w, y0 + p.h], [x0 + p.w, y0 + p.h, x0, y0 + p.h], [x0, y0 + p.h, x0, y0]];
      for (const [ax, ay, bx, by] of segs) {
        const len = Math.hypot(bx - ax, by - ay);
        const f = clampN(left / len, 0, 1);
        if (f <= 0) break;
        g.lineBetween(ax, ay, ax + (bx - ax) * f, ay + (by - ay) * f);
        left -= len;
      }
    }
  };

  return {
    update(time) {
      if (state === 'idle') { if (at === 0) at = time + 2400; if (time >= at) nextShape(time); return; }
      if (state === 'warn' && time >= at) { clip(time); return; }
      if (state === 'clip' && time >= at) { state = 'rest'; at = time + REST; return; }
      if (state === 'rest' && time >= at) nextShape(time);
    },
    playerSpeedMult() { return ctx.scene.time.now < shornUntil.player ? 0.78 : 1; },
    npcSpeedMult() { return ctx.scene.time.now < shornUntil.npc ? 0.78 : 1; },
    // Best in Show is "your hits land harder": the other side takes more.
    playerTakenMult() { return ctx.scene.time.now < showUntil.npc ? 1.25 : 1; },
    npcTakenMult() { return ctx.scene.time.now < showUntil.player ? 1.25 : 1; },
    npcSeek() {
      if (state !== 'warn') return null;
      const n = ctx.npc;
      const h = heart();
      // She knows the template; she goes for the heart, unless it is too far to make it.
      const left = (at - ctx.scene.time.now) / 1000;
      if (dist(n.x, n.y, h.x, h.y) < left * 170 || ctx.hard) return h;
      if (inside(n.x, n.y)) return null;
      let best: Pt = h, bd = Infinity;
      for (const p of shape.parts) {
        const px = ox + p.x + (p.k === 'r' ? p.w / 2 : 0), py = oy + p.y + (p.k === 'r' ? p.h / 2 : 0);
        const d = dist(n.x, n.y, px, py);
        if (d < bd) { bd = d; best = { x: px, y: py }; }
      }
      return best;
    },
    drawGround(g, time) {
      if (state === 'idle') return;
      const k = state === 'warn' ? clampN(1 - (at - time) / ctx.tk.warn(WARN), 0, 1) : 1;
      // Outside the shape the lawn goes dark — that is what the shears will take.
      const doom = state === 'warn' ? k : state === 'clip' ? 1 : 0.4;
      g.fillStyle(0x0a1408, 0.12 + doom * 0.32); g.fillRect(0, top, ctx.W, ctx.H - top);
      // Inside: fresh-mown lawn, bright.
      g.fillStyle(0x5aa83a, 0.18 + k * 0.16);
      for (const p of shape.parts) fillPart(g, p);
      // The rosette at the heart.
      const h = heart();
      g.fillStyle(0x2a1a0a, 0.6); g.fillCircle(h.x, h.y, HEART_R);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + time / 900;
        g.fillStyle(i % 2 ? 0xd8b45a : 0x3a6ac8, 0.85);
        g.fillTriangle(h.x, h.y, h.x + Math.cos(a - 0.3) * HEART_R, h.y + Math.sin(a - 0.3) * HEART_R, h.x + Math.cos(a + 0.3) * HEART_R, h.y + Math.sin(a + 0.3) * HEART_R);
      }
      g.fillStyle(0xffd27a, 1); g.fillCircle(h.x, h.y, 9);
      // The template, chalked white on the grass.
      g.lineStyle(2, 0xffffff, 0.35);
      for (const p of shape.parts) framePart(g, p, 1);
      // The wire frame growing up round it, box-edging thickening along the wire.
      g.lineStyle(6, dim(YEW, 0.2), 0.9);
      for (const p of shape.parts) framePart(g, p, k);
      g.lineStyle(3, YEW_LIT, 0.95);
      for (const p of shape.parts) framePart(g, p, k);
      if (state === 'warn' && k > 0.8 && Math.floor(time / 110) % 2 === 0) {
        g.lineStyle(2, 0xff9a8a, 0.8);
        for (const p of shape.parts) framePart(g, p, 1);
      }
    },
    drawAir(g, time) {
      if (state === 'clip') {
        // The shears run the floor in four rows, snapping — the white lines are the cuts.
        const k = 1 - (at - time) / CLIP;
        for (let row = 0; row < 4; row++) {
          const y = top + 70 + row * ((ctx.H - top - 100) / 3);
          const dir = row % 2 ? -1 : 1;
          const x = dir > 0 ? -80 + k * (ctx.W + 160) : ctx.W + 80 - k * (ctx.W + 160);
          const open = Math.abs(Math.sin(time / 40)) * 0.25;
          shears(g, x, y, dir > 0 ? 0 : Math.PI, open, 150, 0.95);
          for (let i = 0; i < 8; i++) {
            const cx = x - dir * (20 + i * 22);
            if (inside(cx, y)) continue;
            g.fillStyle(i % 2 ? LEAF : YEW_LIT, 0.8); g.fillEllipse(cx, y - 10 - (i % 3) * 8 + Math.sin(time / 50 + i) * 4, 6, 3);
          }
        }
      }
      for (const w of WHO) {
        const f = fighter(w);
        const now = ctx.scene.time.now;
        if (now < showUntil[w]) {
          // A rosette pinned to the winner.
          g.fillStyle(0x3a6ac8, 1); g.fillCircle(f.x + 18, f.y - 30, 7);
          g.fillStyle(0xffd27a, 1); g.fillCircle(f.x + 18, f.y - 30, 4);
          g.fillStyle(0x3a6ac8, 1); g.fillTriangle(f.x + 14, f.y - 25, f.x + 18, f.y - 25, f.x + 14, f.y - 14); g.fillTriangle(f.x + 19, f.y - 25, f.x + 23, f.y - 25, f.x + 23, f.y - 14);
        }
        if (now < shornUntil[w]) {
          for (let i = 0; i < 4; i++) {
            const ph = ((time / 600) + i / 4) % 1;
            g.fillStyle(YEW_LIT, 1 - ph); g.fillEllipse(f.x - 12 + i * 8, f.y - 20 + ph * 30, 5, 3);
          }
        }
      }
    },
    drawHud(g, time) {
      if (state !== 'warn') return;
      const cx = ctx.W / 2, cy = top + 22;
      const k = clampN((at - time) / ctx.tk.warn(WARN), 0, 1);
      g.fillStyle(0x0a140a, 0.88); g.fillRoundedRect(cx - 120, cy - 12, 240, 24, 8);
      g.lineStyle(2, BRASS, 1); g.strokeRoundedRect(cx - 120, cy - 12, 240, 24, 8);
      g.fillStyle(k < 0.25 ? 0xff9a8a : 0x9ad86a, 1); g.fillRoundedRect(cx - 112, cy - 5, 224 * k, 10, 4);
      shears(g, cx + 128, cy, Math.PI, 0.25 * k + 0.02, 26, 1);
    },
  };
};

// ── Warden 2: The Bell Hedges ────────────────────────────────────────

/**
 * Hedges of the pruned stand across the lawn — real walls; nobody walks through a person. The
 * bell rings every 7s and the hedges move to the next layout, which is always showing as a line
 * of sprouts on the gravel. A hedge that grows where someone is standing *grafts* them: 12
 * damage, rooted in the yew for 1.2s, taking +30% while bound. The bell-rope at the foot of the
 * lawn rings it early (stand on it for 0.6s, once the bell has swung back): ring it while she is
 * standing in the sprouts.
 */
const bellHedges = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const W = ctx.W, H = ctx.H;
  const PERIOD = ctx.hard ? 6000 : 7200;
  const READY_MS = 2600;
  const ROPE_MS = 600;
  const GRAFT_MS = 1200;
  const T = 36;
  const ROPE: Pt = { x: W / 2, y: H - 46 };
  const BELL: Pt = { x: W / 2, y: top + 30 };

  const LAYOUTS: Rect[][] = [
    [
      { x: 110, y: top + 120, w: 250, h: T }, { x: 600, y: top + 120, w: 250, h: T }, { x: 355, y: top + 262, w: 250, h: T },
      { x: 110, y: top + 404, w: 230, h: T }, { x: 620, y: top + 404, w: 230, h: T },
    ],
    [
      { x: 230, y: top + 60, w: T, h: 210 }, { x: 694, y: top + 60, w: T, h: 210 }, { x: 462, y: top + 170, w: T, h: 220 },
      { x: 230, y: top + 330, w: T, h: 180 }, { x: 694, y: top + 330, w: T, h: 180 },
    ],
    [
      { x: 140, y: top + 220, w: 260, h: T }, { x: 560, y: top + 220, w: 260, h: T }, { x: 462, y: top + 50, w: T, h: 140 },
      { x: 462, y: top + 300, w: T, h: 170 }, { x: 140, y: top + 400, w: T, h: 110 }, { x: 784, y: top + 400, w: T, h: 110 },
    ],
  ];

  let cur = -1;
  let next = 0;
  let nextAt = 0;
  let lastRing = 0;
  let rope = 0;
  let roper: Who | null = null;
  let swing = 0;
  const graftedUntil: Record<Who, number> = { player: 0, npc: 0 };
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const PAD = 20;
  const inRect = (r: Rect, x: number, y: number, pad: number) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
  const hedges = (): Rect[] => (cur < 0 ? [] : LAYOUTS[cur]);

  const ring = (time: number, by: Who | 'clock') => {
    cur = next;
    next = (cur + 1 + Math.floor(ctx.rng() * (LAYOUTS.length - 1))) % LAYOUTS.length;
    lastRing = time;
    nextAt = time + PERIOD;
    rope = 0; roper = null;
    swing = 1;
    ctx.sfx('holy-chord');
    ctx.banner(by === 'clock' ? 'THE BELL' : by === 'player' ? 'YOU RING THE BELL' : 'LISLE RINGS THE BELL', '#ffe08a');
    for (const w of WHO) {
      const f = fighter(w);
      if (!alive(f)) continue;
      if (hedges().some((r) => inRect(r, f.x, f.y, PAD - 6))) {
        graftedUntil[w] = time + GRAFT_MS;
        ctx.hit(f, 12, f.x, f.y);
        ctx.root(f, GRAFT_MS);
        ctx.float(f.x, f.y - 50, 'GRAFTED', '#9ad86a');
        ctx.sfx('thorn');
      }
    }
  };

  /** Push a fighter out of any hedge they are not grafted into, along the shallowest axis. */
  const shove = (w: Who, time: number) => {
    const f = fighter(w);
    if (!alive(f) || time < graftedUntil[w]) return;
    for (const r of hedges()) {
      if (!inRect(r, f.x, f.y, PAD)) continue;
      const dl = f.x - (r.x - PAD), dr = r.x + r.w + PAD - f.x, du = f.y - (r.y - PAD), dd = r.y + r.h + PAD - f.y;
      const m = Math.min(dl, dr, du, dd);
      if (m === dl) ctx.nudge(f, -dl, 0);
      else if (m === dr) ctx.nudge(f, dr, 0);
      else if (m === du) ctx.nudge(f, 0, -du);
      else ctx.nudge(f, 0, dd);
    }
  };

  return {
    update(time, dt) {
      const step = stepOf(dt);
      if (nextAt === 0) { nextAt = time + 3200; lastRing = time - READY_MS; }
      swing = Math.max(0, swing - step * 0.8);
      if (time >= nextAt) ring(time, 'clock');
      // The bell-rope: stand on it once the bell is ready.
      if (time - lastRing >= READY_MS) {
        let on: Who | null = null;
        for (const w of WHO) { const f = fighter(w); if (alive(f) && dist(f.x, f.y, ROPE.x, ROPE.y) < 34) { on = w; break; } }
        if (on && (roper === null || roper === on)) {
          roper = on;
          rope += step * 1000;
          if (rope >= ROPE_MS) ring(time, on);
        } else if (!on) { rope = Math.max(0, rope - step * 1400); if (rope === 0) roper = null; }
      }
      for (const w of WHO) shove(w, time);
    },
    playerTakenMult() { return ctx.scene.time.now < graftedUntil.player ? 1.3 : 1; },
    npcTakenMult() { return ctx.scene.time.now < graftedUntil.npc ? 1.3 : 1; },
    npcSeek() {
      const now = ctx.scene.time.now;
      const n = ctx.npc, p = ctx.player;
      const soon = nextAt - now < 1800;
      // Get out of the sprouts before the bell.
      for (const r of LAYOUTS[next]) {
        if (!inRect(r, n.x, n.y, PAD + 12)) continue;
        if (!soon && now - lastRing < READY_MS) break;
        const horiz = r.w > r.h;
        return horiz
          ? { x: n.x, y: n.y < r.y + r.h / 2 ? r.y - PAD - 30 : r.y + r.h + PAD + 30 }
          : { x: n.x < r.x + r.w / 2 ? r.x - PAD - 30 : r.x + r.w + PAD + 30, y: n.y };
      }
      // The player is standing in the sprouts and the bell is ready: go and pull the rope.
      if (now - lastRing >= READY_MS && roper !== 'player' && LAYOUTS[next].some((r) => inRect(r, p.x, p.y, PAD - 6))) return ROPE;
      return null;
    },
    drawGround(g, time) {
      // The bell-rope's footplate.
      const ready = time - lastRing >= READY_MS;
      g.fillStyle(0x2a1e0a, 1); g.fillCircle(ROPE.x, ROPE.y, 30);
      g.lineStyle(4, ready ? BRASS : 0x5a4a2a, 1); g.strokeCircle(ROPE.x, ROPE.y, 30);
      verdigraSigil(g, ROPE.x, ROPE.y, 12, ready ? BRASS : 0x5a4a2a, 0.9);
      if (rope > 0) {
        g.lineStyle(4, roper === 'player' ? 0x9ad86a : 0xff9a6a, 1);
        g.beginPath(); g.arc(ROPE.x, ROPE.y, 38, -Math.PI / 2, -Math.PI / 2 + (rope / ROPE_MS) * Math.PI * 2, false); g.strokePath();
      } else if (ready) {
        g.lineStyle(2, BRASS, 0.3 + Math.sin(time / 200) * 0.2); g.strokeCircle(ROPE.x, ROPE.y, 38);
      }
      // The next layout, as a line of sprouts pushing up through the gravel.
      const k = clampN(1 - (nextAt - time) / PERIOD, 0, 1);
      for (const r of LAYOUTS[next]) {
        g.fillStyle(SOIL, 0.35 + k * 0.35); g.fillRect(r.x, r.y, r.w, r.h);
        const horiz = r.w > r.h;
        const len = horiz ? r.w : r.h;
        for (let d = 8; d < len; d += 16) {
          const x = horiz ? r.x + d : r.x + r.w / 2, y = horiz ? r.y + r.h / 2 : r.y + d;
          const hgt = 3 + k * 12 + Math.sin(d + time / 300) * 1.5;
          g.lineStyle(2, LEAF, 0.6 + k * 0.4); g.lineBetween(x, y + 4, x, y + 4 - hgt);
          g.fillStyle(YEW_LIT, 0.8); g.fillEllipse(x - 3, y + 4 - hgt, 6, 3); g.fillEllipse(x + 3, y + 3 - hgt, 6, 3);
        }
        if (nextAt - time < 900 && Math.floor(time / 120) % 2 === 0) { g.lineStyle(2, 0xffe08a, 0.8); g.strokeRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8); }
      }
    },
    drawAir(g, time) {
      // The standing hedges, each with the pruned grafted along it.
      const since = time - lastRing;
      for (const r of hedges()) {
        const grow = clampN(since / 380, 0, 1);
        const depth = 26 * grow;
        g.fillStyle(0x000000, 0.3); g.fillRect(r.x + 4, r.y + r.h - 2, r.w, 8);
        g.fillStyle(dim(YEW, 0.35), 1); g.fillRect(r.x, r.y - depth, r.w, r.h + depth);
        g.fillStyle(YEW, 1); g.fillRect(r.x, r.y - depth, r.w, depth + 4);
        g.fillStyle(YEW_LIT, 1); g.fillRect(r.x, r.y - depth, r.w, 3);
        const horiz = r.w > r.h;
        const len = horiz ? r.w : r.h;
        const n = Math.max(1, Math.floor(len / 90));
        for (let i = 0; i < n; i++) {
          const f = (i + 0.5) / n;
          const fx = horiz ? r.x + r.w * f : r.x + r.w / 2;
          const fy = (horiz ? r.y : r.y + r.h * f) - depth * 0.5;
          const skin = [0xd8b898, 0xb08a68, 0xc8a080][(i + Math.round(r.x)) % 3];
          const br = 1 + Math.sin(time / 700 + i + r.x) * 0.06;
          g.fillStyle(skin, grow); g.fillEllipse(fx, fy, 11 * br, 13 * br);
          g.fillStyle(YEW_LIT, grow);
          for (let a = 0; a < 6; a++) g.fillEllipse(fx + Math.cos(a) * 7, fy + Math.sin(a) * 8, 5, 3.5);
          g.lineStyle(1, dim(skin, 0.5), grow); g.lineBetween(fx - 3.5, fy, fx - 1, fy); g.lineBetween(fx + 1, fy, fx + 3.5, fy);
        }
      }
      // Grafted fighters: yew climbing them.
      for (const w of WHO) {
        if (time >= graftedUntil[w]) continue;
        const f = fighter(w);
        const k = (graftedUntil[w] - time) / GRAFT_MS;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + time / 400;
          g.fillStyle(i % 2 ? YEW : YEW_LIT, 0.9 * k);
          g.fillEllipse(f.x + Math.cos(a) * 18, f.y - 6 + Math.sin(a) * 22, 12, 7);
        }
      }
      // The bell, swinging.
      const a = Math.sin(time / 110) * 0.5 * swing;
      const bx = BELL.x + Math.sin(a) * 14, by = BELL.y + Math.cos(a) * 4;
      g.lineStyle(3, 0x3a3a32, 1); g.lineBetween(BELL.x - 40, BELL.y - 24, BELL.x + 40, BELL.y - 24); g.lineBetween(BELL.x, BELL.y - 24, bx, by - 10);
      g.fillStyle(0x6a4a1a, 1); g.fillRoundedRect(bx - 18, by - 12, 36, 30, { tl: 16, tr: 16, bl: 2, br: 2 });
      g.fillStyle(lit(0x8a6a2a, 0.3), 1); g.fillRect(bx - 12, by - 6, 5, 18);
      g.fillStyle(0x3a2a0a, 1); g.fillRect(bx - 20, by + 16, 40, 4);
      if (swing > 0.2) {
        g.lineStyle(2, 0xffe08a, swing * 0.6);
        for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(bx, by + 4, 26 + k * 16 * (1 - swing), Math.PI * 0.1, Math.PI * 0.9, false); g.strokePath(); }
      }
    },
    drawHud(g, time) {
      const cx = ctx.W / 2 + 120, cy = top + 22;
      const k = clampN((nextAt - time) / PERIOD, 0, 1);
      g.fillStyle(0x0a140a, 0.88); g.fillRoundedRect(cx - 70, cy - 12, 140, 24, 8);
      g.lineStyle(2, BRASS, 1); g.strokeRoundedRect(cx - 70, cy - 12, 140, 24, 8);
      g.fillStyle(k < 0.2 ? 0xffe08a : 0x9ad86a, 1); g.fillRoundedRect(cx - 62, cy - 5, 124 * k, 10, 4);
    },
  };
};

// ── Warden 3: The Growing Lamps ──────────────────────────────────────

/**
 * Three growing lamps ride slow tracks over the floor. In a lamp's light you heal 2.5 a second
 * and hit 15% harder — forced growth — but a growth meter fills, and when it is full vines
 * burst out of you: 12 damage, rooted 1s. Every few seconds the Nursemaid sows seeds; a seed
 * that gets 1.4s of lamplight sprouts into a thornbush that scratches whoever is near it for
 * 8s. Walk on a seed to trample it. Steer the light on her seeds; trample your own.
 */
const growingLamps = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const W = ctx.W, H = ctx.H;
  const LIGHT_R = 92;
  const FILL_PER_S = ctx.hard ? 44 : 38;
  const DRAIN_PER_S = 60;
  const SOW_MS = ctx.hard ? 5200 : 6400;
  const SPROUT_MS = 1400;
  const BUSH_MS = 8000;
  const BUSH_R = 46;

  interface Lamp { cx: number; cy: number; rx: number; ry: number; speed: number; ph: number; x: number; y: number }
  const lamps: Lamp[] = [
    { cx: 260, cy: top + 170, rx: 150, ry: 70, speed: 0.42, ph: 0, x: 0, y: 0 },
    { cx: W - 260, cy: top + 170, rx: 150, ry: 70, speed: -0.42, ph: 1.5, x: 0, y: 0 },
    { cx: W / 2, cy: H - 150, rx: 260, ry: 60, speed: 0.33, ph: 3, x: 0, y: 0 },
  ];
  interface Seed { x: number; y: number; light: number; bush: number; dropAt: number; dead: boolean; lastScratch: Record<Who, number> }
  let seeds: Seed[] = [];
  const growth: Record<Who, number> = { player: 0, npc: 0 };
  const lit_: Record<Who, boolean> = { player: false, npc: false };
  const healAcc: Record<Who, number> = { player: 0, npc: 0 };
  const burstAt: Record<Who, number> = { player: 0, npc: 0 };
  let nextSow = 0;
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const inLight = (x: number, y: number): boolean => lamps.some((l) => dist(x, y, l.x, l.y) < LIGHT_R);

  const sow = (time: number) => {
    const n = ctx.hard ? 6 : 5;
    const p = ctx.player;
    for (let i = 0; i < n; i++) {
      // Most go round the player; one or two wherever the light is.
      let x: number, y: number;
      if (i < n - 2) {
        const a = ctx.rng() * Math.PI * 2, r = 70 + ctx.rng() * 120;
        x = p.x + Math.cos(a) * r; y = p.y + Math.sin(a) * r;
      } else {
        const l = lamps[Math.floor(ctx.rng() * lamps.length)];
        x = l.x + (ctx.rng() - 0.5) * 100; y = l.y + (ctx.rng() - 0.5) * 80;
      }
      seeds.push({ x: clampN(x, 50, W - 50), y: clampN(y, top + 40, H - 40), light: 0, bush: 0, dropAt: time + i * 90, dead: false, lastScratch: { player: 0, npc: 0 } });
    }
    ctx.float(ctx.npc.x, ctx.npc.y - 60, 'SOWN', '#c8e878');
    ctx.sfx('spore');
  };

  return {
    update(time, dt) {
      const step = stepOf(dt);
      const s = time / 1000;
      for (const l of lamps) { l.x = l.cx + Math.cos(s * l.speed + l.ph) * l.rx; l.y = l.cy + Math.sin(s * l.speed + l.ph) * l.ry; }
      if (nextSow === 0) nextSow = time + 2600;
      if (time >= nextSow) { nextSow = time + SOW_MS; sow(time); }
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f)) continue;
        lit_[w] = inLight(f.x, f.y);
        if (lit_[w]) {
          growth[w] += FILL_PER_S * step;
          healAcc[w] += 2.5 * step;
          if (healAcc[w] >= 1) { const n = Math.floor(healAcc[w]); healAcc[w] -= n; ctx.heal(f, n); }
          if (growth[w] >= 100) {
            growth[w] = 0;
            burstAt[w] = time;
            ctx.hit(f, 12, f.x, f.y);
            ctx.root(f, 1000);
            ctx.float(f.x, f.y - 50, 'OVERGROWN', '#9ad86a');
            ctx.sfx('thorn');
          }
        } else {
          growth[w] = Math.max(0, growth[w] - DRAIN_PER_S * step);
        }
      }
      for (const sd of seeds) {
        if (sd.dead || time < sd.dropAt) continue;
        if (sd.bush === 0) {
          // Trampled underfoot before it can sprout.
          for (const w of WHO) {
            const f = fighter(w);
            if (alive(f) && dist(f.x, f.y, sd.x, sd.y) < 24) { sd.dead = true; ctx.float(sd.x, sd.y - 20, 'TRAMPLED', '#c8a868'); break; }
          }
          if (sd.dead) continue;
          if (inLight(sd.x, sd.y)) sd.light += step * 1000;
          if (sd.light >= SPROUT_MS) { sd.bush = time; ctx.sfx('stone-rise'); ctx.flash(sd.x, sd.y, 0x5aa83a); }
          continue;
        }
        if (time - sd.bush > BUSH_MS) { sd.dead = true; continue; }
        for (const w of WHO) {
          const f = fighter(w);
          if (!alive(f) || dist(f.x, f.y, sd.x, sd.y) > BUSH_R + 14) continue;
          if (time - sd.lastScratch[w] < 500) continue;
          sd.lastScratch[w] = time;
          ctx.hit(f, 6, f.x, f.y);
        }
      }
      seeds = seeds.filter((sd) => !sd.dead);
    },
    playerTakenMult() { return lit_.npc ? 1.15 : 1; },
    npcTakenMult() { return lit_.player ? 1.15 : 1; },
    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      // Hurt and not near bursting: into the nearest light to grow it back.
      if (n.hp / n.maxHp < 0.6 && growth.npc < 45) {
        let best: Lamp | null = null, bd = Infinity;
        for (const l of lamps) { const d = dist(n.x, n.y, l.x, l.y); if (d < bd) { bd = d; best = l; } }
        if (best) return { x: best.x, y: best.y };
      }
      // About to burst: out of the light.
      if (lit_.npc && growth.npc > 70) {
        const l = lamps.reduce((a, b) => (dist(n.x, n.y, a.x, a.y) < dist(n.x, n.y, b.x, b.y) ? a : b));
        const a = Math.atan2(n.y - l.y, n.x - l.x);
        return { x: clampN(l.x + Math.cos(a) * (LIGHT_R + 50), 50, W - 50), y: clampN(l.y + Math.sin(a) * (LIGHT_R + 50), top + 40, H - 40) };
      }
      // Trample an unsprouted seed near herself that is getting light — but leave the ones by the player.
      for (const sd of seeds) {
        if (sd.bush > 0 || sd.light < 300) continue;
        if (dist(sd.x, sd.y, n.x, n.y) < 160 && dist(sd.x, sd.y, p.x, p.y) > 140) return { x: sd.x, y: sd.y };
      }
      return null;
    },
    drawGround(g, time) {
      for (const l of lamps) {
        g.fillStyle(SAP, 0.07); g.fillCircle(l.x, l.y, LIGHT_R + 10);
        g.fillStyle(SAP, 0.1); g.fillCircle(l.x, l.y, LIGHT_R);
        g.lineStyle(2, SAP, 0.35 + Math.sin(time / 260 + l.ph) * 0.1); g.strokeCircle(l.x, l.y, LIGHT_R);
        // The lamp's track, faint, so you can see where the light is going.
        g.lineStyle(1, SAP, 0.12); g.strokeEllipse(l.cx, l.cy, l.rx * 2, l.ry * 2);
      }
      for (const sd of seeds) {
        if (time < sd.dropAt) continue;
        if (sd.bush === 0) {
          const k = sd.light / SPROUT_MS;
          g.fillStyle(SOIL, 0.9); g.fillEllipse(sd.x, sd.y + 3, 20, 8);
          g.fillStyle(0xc8a868, 1); g.fillEllipse(sd.x, sd.y, 7, 5);
          if (k > 0) {
            g.lineStyle(2, LEAF, 1); g.lineBetween(sd.x, sd.y, sd.x, sd.y - 4 - k * 12);
            g.fillStyle(YEW_LIT, 1); g.fillEllipse(sd.x - 3, sd.y - 4 - k * 12, 6, 3); g.fillEllipse(sd.x + 3, sd.y - 5 - k * 12, 6, 3);
            g.lineStyle(2, SAP, 0.6); g.beginPath(); g.arc(sd.x, sd.y, 14, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
          }
        } else {
          const age = (time - sd.bush) / BUSH_MS;
          const grow = Math.min(1, (time - sd.bush) / 300);
          g.fillStyle(0x1a2a10, 0.5); g.fillCircle(sd.x, sd.y, BUSH_R * grow);
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 + sd.x;
            bramble(g, sd.x, sd.y, sd.x + Math.cos(a) * BUSH_R * grow, sd.y + Math.sin(a) * BUSH_R * 0.8 * grow, time / 1000 + i, 0x3a6a22, 1 - age * 0.5);
          }
          if (age < 0.9) rose(g, sd.x, sd.y - 6, 4 * grow, ROSE, 0.6);
        }
      }
    },
    drawAir(g, time) {
      const s = time / 1000;
      for (const l of lamps) {
        // The lamp itself, hanging on its chain from the roof rail, a cone of light under it.
        growLamp(g, l.x, l.y - 70, true, s, 70);
      }
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f)) continue;
        const k = growth[w] / 100;
        if (k > 0.05) {
          // Shoots climbing them as the meter fills.
          for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + (i - 2) * 0.5;
            const len = 10 + k * 26;
            g.lineStyle(2, LEAF, 0.4 + k * 0.6);
            g.lineBetween(f.x + (i - 2) * 6, f.y + 10, f.x + (i - 2) * 6 + Math.cos(a) * len * 0.3, f.y + 10 + Math.sin(a) * len);
            g.fillStyle(YEW_LIT, 0.5 + k * 0.5); g.fillEllipse(f.x + (i - 2) * 6 + Math.cos(a) * len * 0.3, f.y + 10 + Math.sin(a) * len, 5, 3);
          }
          g.fillStyle(0x0a140a, 0.8); g.fillRoundedRect(f.x - 22, f.y + 30, 44, 6, 3);
          g.fillStyle(k > 0.7 ? 0xff9a6a : LEAF, 1); g.fillRoundedRect(f.x - 22, f.y + 30, 44 * k, 6, 3);
        }
        const b = time - burstAt[w];
        if (burstAt[w] > 0 && b < 500) {
          for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2;
            bramble(g, f.x, f.y, f.x + Math.cos(a) * (20 + b * 0.08), f.y + Math.sin(a) * (20 + b * 0.08), time / 1000, 0x4a8a2a, 1 - b / 500);
          }
        }
      }
      // A pot or two of her seed-stock on the bench, wherever she last stood to sow.
      seedlingPot(g, 40, H - 30, 1.1); seedlingPot(g, 70, H - 26, 0.9, 0x7ab84a); seedlingPot(g, W - 50, H - 30, 1, ROSE_PALE);
      g.fillStyle(GLASS, 0.04); g.fillRect(0, top, W, 8);
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const GLASSHOUSE_GIMMICKS: GimmickDef[] = [
  {
    id: 'glasshouse-cut-to-shape',
    rules: 'A topiary template is chalked on the lawn. When its frame is done the shears clip everything outside it. Its heart: +25% damage.',
    make: cutToShape,
  },
  {
    id: 'glasshouse-bell-hedges',
    rules: 'Hedges are walls. The bell moves them to the sprouting layout; anyone in the sprouts is grafted (rooted, +30% taken). The rope rings it early.',
    make: bellHedges,
  },
  {
    id: 'glasshouse-growing-lamps',
    rules: 'Lamplight heals you and hits harder, but fills a growth meter that bursts into vines. Lit seeds sprout thornbushes — trample them.',
    make: growingLamps,
  },
];

export const GLASSHOUSE_WARDENS: EncounterDef[] = [
  {
    id: 'glasshouse-warden-1', court: 'glasshouse', name: 'Cut to Shape',
    foeName: 'Head Pruner Ottilie Snedd', foeElement: 'justice', difficulty: 5, hpMult: 1.15,
    gimmick: 'glasshouse-cut-to-shape', at: { x: 900, y: 1790 }, coins: 115,
    look: { body: 0xc8b098, accent: 0x2a4a2a, hat: 'straw', traits: ['apron', 'tool', 'glasses'], size: 1.15, eye: 0xd8f0a8 },
    challenge: [
      'Thirty-one years I have kept this gallery to shape. Not a leaf out of line. Not a shoot.',
      'You are out of line. You are, if I may say, a shoot.',
      'Here is the shape. Stand inside it. Anything outside the shape, I take off.',
    ],
    beaten: [
      'You stood in the heart every time. Do you know, nobody has ever stood in the heart. They were too frightened to.',
      'Go on through. The hedges in the maze will move for you now. I have stopped telling them where to stand.',
    ],
  },
  {
    id: 'glasshouse-warden-2', court: 'glasshouse', name: 'The Bell Hedges',
    foeName: 'Bellwarden Hesper Lisle', foeElement: 'subterfuge', difficulty: 5, hpMult: 1.2,
    gimmick: 'glasshouse-bell-hedges', at: { x: 900, y: 1130 }, coins: 115,
    look: { body: 0xa8a090, accent: 0x3a2a4a, hat: 'hood', traits: ['mask', 'cane'], size: 1.0, eye: 0xffe08a },
    challenge: [
      'One ring and they move. They do not like it. They do it anyway. That is what a bell is for.',
      'Every hedge on this lawn was a family once. I have rung them into rows, and arches, and a very fine maze.',
      'Let us see where you stand when it rings.',
    ],
    beaten: [
      '...you rang it on me. With my own rope. I suppose the bell does not care whose hand is on it.',
      'I shall ring it once more, gently, and let them all stand wherever they like. Go on. The Nursery is north.',
    ],
  },
  {
    id: 'glasshouse-warden-3', court: 'glasshouse', name: 'The Growing Lamps',
    foeName: 'Nursemaid Primula Dewe', foeElement: 'radiation', difficulty: 5, hpMult: 1.25,
    gimmick: 'glasshouse-growing-lamps', at: { x: 900, y: 405 }, coins: 115,
    look: { body: 0xe0c8a8, accent: 0x6a8a3a, hat: 'wreath', traits: ['apron', 'lantern'], size: 1.1, eye: 0xfff0a0 },
    challenge: [
      'Hush, hush, my lovelies, it is only a visitor. Under the lamps, all of you. Grow, grow, grow.',
      'Every rootstock in this house came out of my nursery. The Empress grafts the people on. I only grow the stock.',
      'Come and stand in the warm, dear. You look peaky. A little light will bring you on.',
    ],
    beaten: [
      'Oh. Oh, you trod on them all. My poor seedlings. ...No. No, that is right. That is what they were for.',
      'She is under the dome. She will be pruning the throne roses. Mind her shears, and mind what grows out of her after.',
    ],
  },
];
