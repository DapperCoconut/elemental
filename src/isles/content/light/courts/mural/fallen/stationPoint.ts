import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  CADMIUM, CADMIUM_DARK, GOLD, GOLD_DARK, GOLD_LIT, SIDE_NPC, SIDE_PLAYER, STONE_DARK, ULTRAMARINE, ULTRA_DARK,
  ULTRA_LIT, VERMILION, VERMILION_DARK, VERMILION_LIT,
} from '../palette';
import { clamp, dist, inPoly, stepDt } from '../util';
import { alive, bar, framePlate, halfDown } from './common';

/**
 * The Station Point — Zebulon Skew, Perspectivist (psychic).
 *
 * The Despot's perspectivist paints *anamorphoses*: pictures smeared so long across the paving
 * that from anywhere in the yard they are a stain of colour — a red streak, a yellow fan, a blue
 * rod. Each one reads true from exactly one place: a brass stud set in the flags beyond its head,
 * with a sighting vane on a post. Stand on the stud and hold your eye there, and the smear draws
 * itself up into what it always was — the Sword of Noon, the Despot's gauntlet, his sceptre — and
 * it is real for a moment, falling on whoever is standing in the paint.
 *
 * Either fighter can read. Reading takes a held moment on the stud (the vane's ring fills in the
 * reader's colour, the smear brightens), so a fighter in the paint always has time to step out
 * sideways — the pictures are long but narrow. Two on the stud stall each other. So the trick is
 * the one the perspectivist uses on you: be on the stud when *he* is in the picture. Below half he
 * paints two at a time.
 */

const ID = fallenId('mural', 'station-point');

/** Half the smear's length (along its axis) and half its width, in px. */
const L = 196;
const WD = 54;
/** The stud stands this far beyond the picture's centre, past its head end. */
const STATION = 296;
const STUD_R = 32;
const READ_S = 1.25;
const PAINT_MS = 1500;
const LIFE_MS = 12500;
const SPRUNG_MS = 900;
const GAP_MS = 1300;

type Kind = 'sword' | 'hand' | 'sceptre';

/**
 * The three pictures, in their true proportions on a unit square: `u` runs from the tail (-1) to
 * the head (+1, toward the stud), `v` across. The floor stretches `u` by L and `v` by WD.
 */
const SHAPES: Record<Kind, Pt[][]> = {
  sword: [
    [{ x: -1, y: 0 }, { x: -0.8, y: -0.2 }, { x: 0.42, y: -0.26 }, { x: 0.42, y: 0.26 }, { x: -0.8, y: 0.2 }],
    [{ x: 0.42, y: -0.82 }, { x: 0.56, y: -0.88 }, { x: 0.56, y: 0.88 }, { x: 0.42, y: 0.82 }],
    [{ x: 0.56, y: -0.13 }, { x: 0.86, y: -0.13 }, { x: 0.86, y: 0.13 }, { x: 0.56, y: 0.13 }],
    [{ x: 0.86, y: -0.3 }, { x: 0.95, y: -0.22 }, { x: 1, y: 0 }, { x: 0.95, y: 0.22 }, { x: 0.86, y: 0.3 }],
  ],
  hand: [
    [{ x: 0.14, y: -0.64 }, { x: 0.78, y: -0.56 }, { x: 0.86, y: 0 }, { x: 0.78, y: 0.56 }, { x: 0.14, y: 0.64 }],
    ...[-0.47, -0.16, 0.16, 0.47].map((v0) => {
      const tip = -0.82 + Math.abs(v0) * 0.42;
      return [{ x: 0.18, y: v0 - 0.13 }, { x: tip + 0.06, y: v0 - 0.12 }, { x: tip, y: v0 }, { x: tip + 0.06, y: v0 + 0.12 }, { x: 0.18, y: v0 + 0.13 }];
    }),
    [{ x: 0.56, y: 0.5 }, { x: 0.3, y: 0.96 }, { x: 0.16, y: 0.9 }, { x: 0.36, y: 0.46 }],
    [{ x: 0.86, y: -0.5 }, { x: 1, y: -0.52 }, { x: 1, y: 0.52 }, { x: 0.86, y: 0.5 }],
  ],
  sceptre: [
    [{ x: -0.92, y: -0.1 }, { x: 0.46, y: -0.1 }, { x: 0.46, y: 0.1 }, { x: -0.92, y: 0.1 }],
    [{ x: 0.42, y: 0 }, { x: 0.7, y: -0.72 }, { x: 1, y: 0 }, { x: 0.7, y: 0.72 }],
    [{ x: -1, y: -0.24 }, { x: -0.9, y: -0.24 }, { x: -0.9, y: 0.24 }, { x: -1, y: 0.24 }],
    [{ x: -0.3, y: -0.2 }, { x: -0.22, y: -0.2 }, { x: -0.22, y: 0.2 }, { x: -0.3, y: 0.2 }],
  ],
};

/** Paint for each picture: body, deep edge, highlight. */
const PAINT: Record<Kind, [number, number, number]> = {
  sword: [VERMILION, VERMILION_DARK, VERMILION_LIT],
  hand: [CADMIUM, CADMIUM_DARK, GOLD_LIT],
  sceptre: [ULTRAMARINE, ULTRA_DARK, ULTRA_LIT],
};

interface Picture {
  kind: Kind;
  cx: number; cy: number;
  /** Axis angle: +u points toward the stud. */
  a: number;
  st: Pt;
  born: number;
  reader: Fighter | null;
  prog: number;
  sprungAt: number;
  /** Who was caught when it sprang (for the art). */
  caught: Fighter[];
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const pics: Picture[] = [];
  const kinds: Kind[] = ['sword', 'hand', 'sceptre'];
  let nextPaint = 0;
  let started = false;
  let kindIx = Math.floor(rng() * 3);

  const toWorld = (p: Picture, u: number, v: number): Pt => {
    const c = Math.cos(p.a), s = Math.sin(p.a);
    return { x: p.cx + c * u * L - s * v * WD, y: p.cy + s * u * L + c * v * WD };
  };
  const toLocal = (p: Picture, x: number, y: number): Pt => {
    const dx = x - p.cx, dy = y - p.cy, c = Math.cos(p.a), s = Math.sin(p.a);
    return { x: (dx * c + dy * s) / L, y: (-dx * s + dy * c) / WD };
  };
  /** Is any part of a fighter's body (radius ~14) on the paint? */
  const inPicture = (p: Picture, f: Fighter): boolean => {
    for (const [ox, oy] of [[0, 0], [14, 0], [-14, 0], [0, 14], [0, -14]]) {
      const q = toLocal(p, f.x + ox, f.y + oy);
      for (const poly of SHAPES[p.kind]) if (inPoly(q.x, q.y, poly)) return true;
    }
    return false;
  };
  const ready = (p: Picture, now: number) => p.sprungAt < 0 && now >= p.born + PAINT_MS;

  function paint(now: number): void {
    for (let tries = 0; tries < 40; tries++) {
      const a = (rng() - 0.5) * 1.0 + (rng() < 0.5 ? 0 : Math.PI);
      const cx = 120 + rng() * (W - 240), cy = top + 90 + rng() * (H - top - 170);
      const p: Picture = { kind: kinds[kindIx % 3], cx, cy, a, st: { x: 0, y: 0 }, born: now, reader: null, prog: 0, sprungAt: -1, caught: [] };
      p.st = toWorld(p, STATION / L, 0);
      const ends = [toWorld(p, -1, 0), toWorld(p, 1, -1), toWorld(p, 1, 1), p.st];
      if (ends.some((e) => e.x < 46 || e.x > W - 46 || e.y < top + 34 || e.y > H - 34)) continue;
      if (pics.some((o) => dist(o.cx, o.cy, cx, cy) < 230 || dist(o.st.x, o.st.y, p.st.x, p.st.y) < 160)) continue;
      // Never lay a stud straight under a fighter's feet.
      if ([player, npc].some((f) => dist(f.x, f.y, p.st.x, p.st.y) < 90)) continue;
      kindIx++;
      pics.push(p);
      ctx.sfx('whoosh');
      return;
    }
  }

  function spring(p: Picture, now: number): void {
    p.sprungAt = now;
    p.caught = [];
    for (const f of [player, npc]) {
      if (f === p.reader || !alive(f) || ctx.isAirborne(f) || !inPicture(p, f)) continue;
      p.caught.push(f);
      ctx.hit(f, f === npc ? 30 : 24, f.x, f.y);
      ctx.stun(f, f === npc ? 900 : 800);
      const q = toLocal(p, f.x, f.y);
      const side = q.y >= 0 ? 1 : -1;
      ctx.nudge(f, -Math.sin(p.a) * side * 28, Math.cos(p.a) * side * 28);
    }
    ctx.sfx(p.kind === 'sword' ? 'slash' : p.kind === 'hand' ? 'gravity-slam' : 'judgement');
    if (p.caught.length) ctx.sfx('hit-heavy');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextPaint = time + 900; }
      const want = halfDown(npc) ? 2 : 1;
      const live = pics.filter((p) => p.sprungAt < 0).length;
      if (live < want && time >= nextPaint) { paint(time); nextPaint = time + GAP_MS; }

      for (let i = pics.length - 1; i >= 0; i--) {
        const p = pics[i];
        if (p.sprungAt >= 0) {
          if (time - p.sprungAt > SPRUNG_MS) { pics.splice(i, 1); nextPaint = Math.max(nextPaint, time + GAP_MS * 0.6); }
          continue;
        }
        if (!ready(p, time)) continue;
        if (time - p.born > LIFE_MS && p.prog <= 0) { p.sprungAt = time; p.caught = []; continue; }
        const on = [player, npc].filter((f) => alive(f) && dist(f.x, f.y, p.st.x, p.st.y) < STUD_R);
        if (on.length === 1) {
          if (p.reader !== on[0]) { p.reader = on[0]; p.prog = 0; ctx.sfx('crystal-chime'); }
          p.prog += dt / READ_S;
          if (p.prog >= 1) spring(p, time);
        } else if (on.length === 0) {
          p.prog = Math.max(0, p.prog - dt * 1.4);
          if (p.prog <= 0) p.reader = null;
        }
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const now = ctx.scene.time.now;
      const live = pics.filter((p) => ready(p, now));
      // Already reading with the stranger in the paint: hold the eye there.
      for (const p of live) if (p.reader === npc && p.prog > 0 && inPicture(p, player)) return p.st;
      // The stranger has walked into a picture: go and read it.
      for (const p of live) {
        if (p.reader === player && p.prog > 0) continue;
        if (inPicture(p, player) && dist(npc.x, npc.y, p.st.x, p.st.y) < 460) return p.st;
      }
      // Standing in paint himself: step out sideways, the short way.
      for (const p of pics) {
        if (p.sprungAt >= 0 || !inPicture(p, npc)) continue;
        const q = toLocal(p, npc.x, npc.y);
        const out = toWorld(p, clamp(q.x, -1, 1), (q.y >= 0 ? 1 : -1) * 2.4);
        return { x: clamp(out.x, 50, W - 50), y: clamp(out.y, top + 40, H - 40) };
      }
      // Otherwise loiter by the stud nearest the stranger, so a careless step is read.
      let best: Picture | null = null, bd = 300;
      for (const p of live) { const d = dist(player.x, player.y, p.cx, p.cy); if (d < bd) { bd = d; best = p; } }
      return best ? best.st : null;
    },

    drawGround(g, time) {
      for (const p of pics) {
        const [body, deep, hi] = PAINT[p.kind];
        const paintK = clamp((time - p.born) / PAINT_MS, 0, 1);
        const gone = p.sprungAt >= 0 ? clamp((time - p.sprungAt) / SPRUNG_MS, 0, 1) : 0;
        const a = paintK * (1 - gone);
        if (a <= 0) continue;
        // Chalk sightlines fanning from the stud to the picture's corners.
        g.lineStyle(1, STONE_DARK, 0.35 * a);
        for (const [u, v] of [[-1, -0.3], [-1, 0.3], [0.5, -1], [0.5, 1], [1, 0]]) {
          const w = toWorld(p, u, v);
          for (let k = 0; k < 1; k += 0.08) {
            const x0 = p.st.x + (w.x - p.st.x) * k, y0 = p.st.y + (w.y - p.st.y) * k;
            const x1 = p.st.x + (w.x - p.st.x) * (k + 0.04), y1 = p.st.y + (w.y - p.st.y) * (k + 0.04);
            g.lineBetween(x0, y0, x1, y1);
          }
        }
        // The smear: deep edge, body, then long anamorphic highlights along the axis.
        const flare = p.prog * (0.5 + 0.5 * Math.sin(time / (60 - p.prog * 30)));
        for (const poly of SHAPES[p.kind]) {
          const pts = poly.map((q) => toWorld(p, q.x, q.y));
          g.fillStyle(deep, 0.7 * a); g.fillPoints(pts.map((q) => ({ x: q.x + 2, y: q.y + 3 })), true);
          g.fillStyle(body, 0.82 * a); g.fillPoints(pts, true);
          g.lineStyle(2, deep, 0.8 * a); g.strokePoints(pts, true, true);
        }
        for (let s = 0; s < 7; s++) {
          const v = -0.18 + s * 0.06, u0 = -0.85 + (s % 3) * 0.09, u1 = 0.35 - (s % 2) * 0.12;
          const p0 = toWorld(p, u0, v), p1 = toWorld(p, u1, v);
          g.lineStyle(1.5, hi, 0.45 * a); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
        }
        // Brush stipple where the paint is still being laid.
        if (paintK < 1) {
          const u = -1 + paintK * 2, w = toWorld(p, u, Math.sin(time / 50) * 0.5);
          g.fillStyle(hi, 0.9); g.fillCircle(w.x, w.y, 5);
        }
        if (flare > 0) {
          for (const poly of SHAPES[p.kind]) {
            g.fillStyle(0xffffff, 0.35 * flare * a); g.fillPoints(poly.map((q) => toWorld(p, q.x, q.y)), true);
          }
        }
        // The stud: a brass boss let into the flags, ringed with the reading.
        const st = p.st;
        g.fillStyle(0x000000, 0.18 * a); g.fillEllipse(st.x, st.y + 3, 36, 12);
        g.lineStyle(2, GOLD_DARK, 0.6 * a); g.strokeCircle(st.x, st.y, STUD_R);
        g.fillStyle(GOLD_DARK, a); g.fillCircle(st.x, st.y, 11);
        g.fillStyle(GOLD, a); g.fillCircle(st.x, st.y, 9);
        g.fillStyle(GOLD_LIT, a); g.fillCircle(st.x - 3, st.y - 3, 3);
        g.lineStyle(1, GOLD_DARK, a); g.lineBetween(st.x - 6, st.y, st.x + 6, st.y); g.lineBetween(st.x, st.y - 6, st.x, st.y + 6);
        if (p.prog > 0 && p.reader) {
          const col = p.reader === player ? SIDE_PLAYER : SIDE_NPC;
          g.lineStyle(5, col, 0.9); g.beginPath();
          g.arc(st.x, st.y, STUD_R, -Math.PI / 2, -Math.PI / 2 + p.prog * Math.PI * 2, false); g.strokePath();
        }
      }
    },

    drawAir(g, time) {
      for (const p of pics) {
        const [body, deep, hi] = PAINT[p.kind];
        const paintK = clamp((time - p.born) / PAINT_MS, 0, 1);
        const st = p.st;
        // The sighting vane on its post, turned along the axis.
        const ax = Math.cos(p.a + Math.PI), ay = Math.sin(p.a + Math.PI);
        g.lineStyle(3, dim(GOLD_DARK, 0.2), paintK); g.lineBetween(st.x, st.y, st.x, st.y - 34);
        g.fillStyle(GOLD, paintK); g.fillRect(st.x - 6, st.y - 48, 12, 14);
        g.lineStyle(1.5, GOLD_DARK, paintK); g.strokeRect(st.x - 6, st.y - 48, 12, 14);
        g.fillStyle(0x1e1c22, paintK); g.fillCircle(st.x + ax * 2, st.y - 41 + ay * 1, 2);
        // What the reader sees: the picture standing true in a little frame over the vane.
        const seen = p.sprungAt >= 0 ? 1 - clamp((time - p.sprungAt) / SPRUNG_MS, 0, 1) : p.prog;
        if (seen > 0.02) {
          const fx = st.x, fy = st.y - 92, S = 24;
          g.fillStyle(GOLD_DARK, seen); g.fillRect(fx - S - 5, fy - S - 5, S * 2 + 10, S * 2 + 10);
          g.fillStyle(0xf2ead8, seen); g.fillRect(fx - S - 2, fy - S - 2, S * 2 + 4, S * 2 + 4);
          for (const poly of SHAPES[p.kind]) {
            const pts = poly.map((q) => ({ x: fx + q.y * S * 0.9, y: fy - q.x * S * 0.9 }));
            g.fillStyle(body, seen); g.fillPoints(pts, true);
            g.lineStyle(1, deep, seen); g.strokePoints(pts, true, true);
          }
        }
        // Sprung: the thing itself, real for a moment, coming down on the paint.
        if (p.sprungAt >= 0) {
          const k = clamp((time - p.sprungAt) / SPRUNG_MS, 0, 1);
          if (p.kind === 'sword') {
            const t0 = toWorld(p, -1 + k * 0.4, 0), t1 = toWorld(p, 1, 0);
            g.lineStyle(18 * (1 - k), lit(hi, 0.6), 0.85 * (1 - k)); g.lineBetween(t0.x, t0.y - 30 * (1 - k), t1.x, t1.y - 30 * (1 - k));
            g.lineStyle(6 * (1 - k), 0xffffff, 1 - k); g.lineBetween(t0.x, t0.y - 30 * (1 - k), t1.x, t1.y - 30 * (1 - k));
          } else {
            const squeeze = p.kind === 'hand' ? 1 - 0.55 * Math.min(1, k * 2) : 1;
            for (const poly of SHAPES[p.kind]) {
              const pts = poly.map((q) => toWorld(p, q.x, q.y * squeeze)).map((q) => ({ x: q.x, y: q.y - 26 * (1 - k) }));
              g.fillStyle(lit(body, 0.35), 0.75 * (1 - k)); g.fillPoints(pts, true);
              g.lineStyle(2, 0xffffff, 0.8 * (1 - k)); g.strokePoints(pts, true, true);
            }
            if (p.kind === 'sceptre') {
              const hd = toWorld(p, 0.72, 0);
              g.lineStyle(4, lit(hi, 0.5), 1 - k); g.strokeCircle(hd.x, hd.y, 20 + k * 70);
            }
          }
          for (const f of p.caught) { g.lineStyle(3, 0xffffff, 1 - k); g.strokeCircle(f.x, f.y - 10, 16 + k * 20); }
        }
      }
    },

    drawHud(g) {
      const now = ctx.scene.time.now;
      const x = W / 2, y = top + 4;
      const live = pics.filter((p) => p.sprungAt < 0);
      const w = 76 + Math.max(1, live.length) * 64;
      framePlate(g, x, y, w, 34);
      // The perspectivist's eye-glass, then a thumbnail and reading bar per picture.
      const ex = x - w / 2 + 26, ey = y + 17;
      g.fillStyle(GOLD_DARK, 1); g.fillCircle(ex, ey, 9);
      g.fillStyle(0xf2ead8, 1); g.fillCircle(ex, ey, 6.5);
      g.fillStyle(0x1e1c22, 1); g.fillCircle(ex + Math.sin(now / 600) * 2, ey, 2.6);
      g.lineStyle(2, GOLD_DARK, 1); g.lineBetween(ex + 7, ey + 6, ex + 16, ey + 13);
      live.forEach((p, i) => {
        const tx = x - w / 2 + 62 + i * 64, ty = y + 17;
        const [body, deep] = PAINT[p.kind];
        for (const poly of SHAPES[p.kind]) {
          const pts = poly.map((q) => ({ x: tx + q.y * 9, y: ty - q.x * 10 }));
          g.fillStyle(ready(p, now) ? body : dim(body, 0.5), 1); g.fillPoints(pts, true);
          g.lineStyle(1, deep, 1); g.strokePoints(pts, true, true);
        }
        const col = p.reader === npc ? SIDE_NPC : SIDE_PLAYER;
        bar(g, tx + 14, ty - 3, 32, 6, ready(p, now) ? p.prog : (now - p.born) / PAINT_MS, ready(p, now) ? col : STONE_DARK);
      });
    },

    destroy() { pics.length = 0; },
  };
}

export const FALLEN_STATION_POINT: GimmickDef = {
  id: ID,
  rules: 'Smeared pictures cross the floor; each reads true only from its brass stud. Hold the stud and it springs real on whoever stands in the paint.',
  make,
};
