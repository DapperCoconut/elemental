import type Phaser from 'phaser';
import type { SignatureMove } from '../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../boss/framework/BossToolkit';
import { brandSigil, dim, lit, mulberry } from '../../../art/IsleArt';
import { LAWS } from './fallenArt';
import {
  FIELD, FS, PLAYER_R, type Pt, at, cite, clampN, dist, fieldX, fieldY, release, segDist, shake, strike, wrap,
} from './fallenState';

/**
 * Act IV — the first five laws the Fallen King cites, each looking like its isle for as long as it
 * lasts. All telegraphed on the floor; all walkable out of at 200 px/s.
 *
 *  THE BRAND (`p4-brand`)        — four brands pressed where you stand, one after another, each
 *                                  leaving a scar that burns; then the iron set down at his feet
 *                                  throws a cross of fire.
 *  THE UNDERTOW (`p4-undertow`)  — the sea comes in across the floor from one side, then the other,
 *                                  with one channel through each wave (buoyed and lit before it
 *                                  comes) and the backwash dragging you toward the crest.
 *  THE PRUNING (`p4-pruning`)    — thorn hedges run across the floor in rows, then in columns, then
 *                                  a pair of shears closes on where you stand.
 *  THE BREATH-TAX (`p4-breath`)  — he breathes in (and you are drawn toward him) down a cone, then
 *                                  breathes out a gale along it; then again, wider.
 *  THE STONE TITHE (`p4-tithe`)  — stones fall on you one after another; then the tithe is
 *                                  collected: every stone rolls back to him, down a marked path.
 */

type G = Phaser.GameObjects.Graphics;
const TAU = Math.PI * 2;

// ── THE BRAND ────────────────────────────────────────────────────────

/** A brand pressed into the floor: a sigil that fills, burns, and leaves a scar. */
interface Stamp { x: number; y: number; from: number; fireAt: number; fired: boolean; r: number }

export const theBrand = (tk: BossToolkit): SignatureMove => {
  const L = LAWS[0];
  const R = 60;
  let on = false, t0 = 0, placed = 0, endAt = 0, lastBurn = -1e9;
  let stamps: Stamp[] = [];
  let scars: { x: number; y: number; at: number; until: number }[] = [];
  let iron: { x: number; y: number; a: number; from: number; fireAt: number; fired: boolean } | null = null;
  const GAP = 430;

  const flames = (g: G, x: number, y: number, r: number, k: number, time: number): void => {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      const h = (14 + 10 * Math.abs(Math.sin(time / 70 + i * 1.7))) * k;
      const bx = x + Math.cos(a) * r * 0.75, by = y + Math.sin(a) * r * 0.6;
      g.fillStyle(i % 2 ? L.color : L.light, 0.75 * k);
      g.fillTriangle(bx - 5, by, bx + 5, by, bx + Math.cos(a) * 4, by - h);
    }
    g.fillStyle(L.light, 0.35 * k); g.fillCircle(x, y, r * 0.8);
  };

  return {
    durationMs: 4 * GAP + 3600,
    windupMs: 500,
    gesture: 'raise',
    tell: 'THE BRAND',
    cast(time) {
      on = true; t0 = time; placed = 0; stamps = []; scars = []; iron = null;
      cite(tk, 0);
      endAt = time + 4 * GAP + tk.warn(800) + 300 + tk.warn(850) + 900;
      tk.sfx('flame-burst');
    },
    update(time) {
      if (!on) return;
      const p = tk.player;
      while (placed < 4 && time >= t0 + placed * GAP) {
        stamps.push({ x: fieldX(p.x), y: fieldY(p.y), from: time, fireAt: time + tk.warn(800), fired: false, r: R });
        placed++;
        tk.sfx('trap-set');
      }
      for (const s of stamps) {
        if (s.fired || time < s.fireAt) continue;
        s.fired = true;
        tk.sfx('fireball');
        if (dist(p.x, p.y, s.x, s.y) < s.r + PLAYER_R - 6) strike(tk, 12);
        scars.push({ x: s.x, y: s.y, at: time, until: time + 2600 });
      }
      // The scars burn whoever stands in them.
      if (time - lastBurn > 500 && scars.some((c) => time < c.until && dist(p.x, p.y, c.x, c.y) < 38 + PLAYER_R * 0.5)) {
        lastBurn = time; strike(tk, 4);
      }
      if (!iron && placed >= 4 && stamps.every((s) => s.fired)) {
        const o = at(tk);
        iron = { x: o.x, y: o.y, a: Math.atan2(p.y - o.y, p.x - o.x) + Math.PI / 4, from: time, fireAt: time + tk.warn(850), fired: false };
        FS.pose = 'cite'; FS.citeAt = time;
        tk.sfx('sizzle');
      }
      if (iron && !iron.fired && time >= iron.fireAt) {
        iron.fired = true;
        tk.sfx('inferno'); shake(tk, 260, 0.006);
        for (let k = 0; k < 4; k++) {
          const a = iron.a + k * Math.PI / 2;
          if (segDist(p.x, p.y, iron.x, iron.y, iron.x + Math.cos(a) * 900, iron.y + Math.sin(a) * 900) < 22 + PLAYER_R) { strike(tk, 12); break; }
        }
      }
      scars = scars.filter((c) => time < c.until);
      if (time > endAt) { on = false; release(); }
    },
    drawGround(g, time) {
      if (!on && !scars.length) return;
      for (const c of scars) {
        const f = clampN((c.until - time) / 2600, 0, 1);
        g.fillStyle(0x140806, 0.6 * f); g.fillEllipse(c.x, c.y, 84, 64);
        brandSigil(g, c.x, c.y, 22, L.color, (0.4 + 0.3 * Math.sin(time / 120)) * f);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU + c.at;
          const fx = c.x + Math.cos(a) * 26, fy = c.y + Math.sin(a) * 18;
          const h = 6 + 5 * Math.abs(Math.sin(time / 90 + i));
          g.fillStyle(L.color, 0.7 * f); g.fillTriangle(fx - 3, fy, fx + 3, fy, fx, fy - h);
        }
      }
      for (const s of stamps) {
        if (!s.fired) {
          const k = clampN((time - s.from) / (s.fireAt - s.from), 0, 1);
          const blink = k > 0.78 && Math.floor(time / 80) % 2 === 0;
          g.fillStyle(L.deep, 0.35); g.fillCircle(s.x, s.y, s.r);
          g.fillStyle(L.color, 0.1 + 0.2 * k); g.fillCircle(s.x, s.y, s.r * k);
          g.lineStyle(blink ? 3 : 2, blink ? 0xffffff : L.color, 0.6 + 0.3 * k); g.strokeCircle(s.x, s.y, s.r);
          brandSigil(g, s.x, s.y, 10 + 18 * k, lit(L.color, k * 0.5), 0.4 + 0.5 * k);
        } else if (time - s.fireAt < 450) flames(g, s.x, s.y, s.r, 1 - (time - s.fireAt) / 450, time);
      }
      if (iron) {
        const k = iron.fired ? 1 : clampN((time - iron.from) / (iron.fireAt - iron.from), 0, 1);
        const f = iron.fired ? 1 - clampN((time - iron.fireAt) / 500, 0, 1) : 1;
        if (f <= 0) return;
        for (let q = 0; q < 4; q++) {
          const a = iron.a + q * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
          if (!iron.fired) {
            g.lineStyle(44, L.color, 0.08 + 0.1 * k); g.lineBetween(iron.x, iron.y, iron.x + ca * 900, iron.y + sa * 900);
            g.lineStyle(2, L.light, 0.5 + 0.4 * k); g.lineBetween(iron.x, iron.y, iron.x + ca * 900 * k, iron.y + sa * 900 * k);
          } else {
            for (let d = 30; d < 900; d += 26) {
              const bx = iron.x + ca * d, by = iron.y + sa * d;
              const h = (16 + 10 * Math.abs(Math.sin(time / 60 + d))) * f;
              g.fillStyle(d % 52 ? L.color : L.light, 0.8 * f); g.fillTriangle(bx - sa * 10, by + ca * 10, bx + sa * 10, by - ca * 10, bx, by - h);
            }
          }
        }
        // The iron itself, set down at his feet.
        g.fillStyle(0x2a1a14, f); g.fillRect(iron.x - 3, iron.y - 22, 6, 22);
        brandSigil(g, iron.x, iron.y, 13, iron.fired ? L.light : L.color, f);
      }
    },
    onPhaseEnd() { on = false; stamps = []; scars = []; iron = null; release(); },
  };
};

// ── THE UNDERTOW ─────────────────────────────────────────────────────

/** One wave: from a side, with its one channel at `gy`. */
interface Wave { fromLeft: boolean; gy: number; warnFrom: number; launchAt: number; x: number; hit: boolean; done: boolean; pulled: boolean }

export const theUndertow = (tk: BossToolkit): SignatureMove => {
  const L = LAWS[1];
  const GAP = 64, SPEED = 420;
  const X0 = FIELD.x0 - 40, X1 = FIELD.x1 + 40;
  let on = false, waves: Wave[] = [];

  const crestX = (w: Wave, time: number): number => {
    const d = Math.max(0, (time - w.launchAt) / 1000) * SPEED;
    return w.fromLeft ? X0 + d : X1 - d;
  };

  return {
    durationMs: 6400,
    windupMs: 500,
    gesture: 'sweep',
    tell: 'THE UNDERTOW',
    cast(time) {
      on = true;
      cite(tk, 1);
      const p = tk.player;
      const off = (Math.random() < 0.5 ? -1 : 1) * (130 + Math.random() * 60);
      const gy1 = clampN(p.y + off, FIELD.y0 + 40, FIELD.y1 - 40);
      const gy2 = clampN(gy1 + (gy1 > 360 ? -1 : 1) * (170 + Math.random() * 60), FIELD.y0 + 40, FIELD.y1 - 40);
      const left = Math.random() < 0.5;
      const l1 = time + tk.warn(1300);
      const travel = ((X1 - X0) / SPEED) * 1000;
      waves = [
        { fromLeft: left, gy: gy1, warnFrom: time, launchAt: l1, x: 0, hit: false, done: false, pulled: false },
        { fromLeft: !left, gy: gy2, warnFrom: l1, launchAt: l1 + travel + 250, x: 0, hit: false, done: false, pulled: false },
      ];
      tk.sfx('rain');
    },
    update(time) {
      if (!on) return;
      const p = tk.player;
      for (const w of waves) {
        if (w.done || time < w.launchAt) continue;
        if (!w.pulled) {
          w.pulled = true;
          tk.sfx('geyser');
          // The backwash: dragged toward the side the sea came from (you can still walk out of it).
          tk.pull(w.fromLeft ? 0 : tk.W, p.y, 90, ((X1 - X0) / SPEED) * 1000);
        }
        w.x = crestX(w, time);
        if (!w.hit && Math.abs(p.x - w.x) < 30 && Math.abs(p.y - w.gy) > GAP - 8) {
          w.hit = true; strike(tk, 13); tk.slowPlayer(0.6, 900); tk.sfx('splash');
        }
        if (w.fromLeft ? w.x > X1 : w.x < X0) w.done = true;
      }
      if (waves.every((w) => w.done)) { on = false; waves = []; release(); }
    },
    drawGround(g, time) {
      if (!on) return;
      for (const w of waves) {
        if (time < w.warnFrom || w.done) continue;
        const edge = w.fromLeft ? X0 + 40 : X1 - 40;
        const dir = w.fromLeft ? 1 : -1;
        const k = clampN((time - w.warnFrom) / Math.max(1, w.launchAt - w.warnFrom), 0, 1);
        // The channel: a lit lane of calm water across the floor, roped with foam.
        g.fillStyle(L.light, 0.06 + 0.05 * k); g.fillRect(FIELD.x0 - 40, w.gy - GAP, FIELD.x1 - FIELD.x0 + 80, GAP * 2);
        for (let x = FIELD.x0 - 30; x < FIELD.x1 + 40; x += 18) {
          const b = Math.sin(time / 300 + x * 0.05) * 2;
          g.fillStyle(0xffffff, 0.35 + 0.3 * k); g.fillCircle(x, w.gy - GAP + b, 1.6); g.fillCircle(x + 9, w.gy + GAP - b, 1.6);
        }
        // Buoys at the channel's mouth.
        for (const by of [w.gy - GAP, w.gy + GAP]) {
          const bob = Math.sin(time / 260 + by) * 2;
          g.fillStyle(0x000000, 0.3); g.fillEllipse(edge + dir * 8, by + 6, 16, 6);
          g.fillStyle(0xd83a2a, 1); g.fillCircle(edge + dir * 8, by + bob, 7);
          g.fillStyle(0xf4ecd8, 1); g.fillRect(edge + dir * 8 - 7, by + bob - 2, 14, 4);
          g.lineStyle(1.5, 0x2a2a2a, 1); g.lineBetween(edge + dir * 8, by + bob - 7, edge + dir * 8, by + bob - 14);
        }
        if (time < w.launchAt) {
          // The sea gathering along its edge, rising.
          const h = 10 + 26 * k;
          g.fillStyle(L.deep, 0.75); g.fillRect(w.fromLeft ? FIELD.x0 - 40 : FIELD.x1 + 40 - h, FIELD.y0 - 30, h, FIELD.y1 - FIELD.y0 + 60);
          g.lineStyle(3, L.light, 0.5 + 0.4 * k);
          const lx = w.fromLeft ? FIELD.x0 - 40 + h : FIELD.x1 + 40 - h;
          g.lineBetween(lx, FIELD.y0 - 30, lx, w.gy - GAP); g.lineBetween(lx, w.gy + GAP, lx, FIELD.y1 + 30);
          continue;
        }
        // The wave: a sheet of water behind a foaming crest, parted at the channel.
        const cx = w.x;
        for (let i = 0; i < 5; i++) {
          const x0 = cx - dir * (i + 1) * 36;
          g.fillStyle(L.color, 0.22 - i * 0.04);
          for (const [ya, yb] of [[FIELD.y0 - 30, w.gy - GAP], [w.gy + GAP, FIELD.y1 + 30]]) g.fillRect(Math.min(x0, x0 + dir * 36), ya, 36, yb - ya);
        }
        for (const [ya, yb] of [[FIELD.y0 - 30, w.gy - GAP], [w.gy + GAP, FIELD.y1 + 30]]) {
          g.fillStyle(L.deep, 0.6); g.fillRect(cx - (dir > 0 ? 18 : 0), ya, 18, yb - ya);
          g.lineStyle(5, 0xffffff, 0.75); g.lineBetween(cx, ya, cx, yb);
          for (let y = ya + 8; y < yb; y += 22) {
            g.lineStyle(2, 0xffffff, 0.7); g.beginPath(); g.arc(cx + dir * 4, y, 8, dir > 0 ? -Math.PI / 2 : Math.PI / 2, dir > 0 ? Math.PI / 2 : Math.PI * 1.5, false); g.strokePath();
            g.fillStyle(L.light, 0.8); g.fillCircle(cx + dir * (10 + Math.sin(time / 90 + y) * 4), y + 6, 2);
          }
        }
        // The curled ends of the parted water.
        for (const ey of [w.gy - GAP, w.gy + GAP]) { g.fillStyle(0xffffff, 0.8); g.fillCircle(cx, ey, 6); g.fillStyle(L.light, 0.5); g.fillCircle(cx + dir * 6, ey, 4); }
      }
    },
    onPhaseEnd() { on = false; waves = []; release(); },
  };
};

// ── THE PRUNING ──────────────────────────────────────────────────────

/** One hedge: a vine that runs from `o` along `a`, then bristles with thorns. */
interface Hedge { o: Pt; a: number; len: number; from: number; readyAt: number; fired: boolean; shears?: boolean }

export const thePruning = (tk: BossToolkit): SignatureMove => {
  const L = LAWS[2];
  const HALF = 24;
  let on = false, t0 = 0, endAt = 0, lastHit = -1e9, stage = 0;
  let hedges: Hedge[] = [];

  const grow = (o: Pt, a: number, len: number, time: number, ms: number, shears = false): void => {
    hedges.push({ o, a, len, from: time, readyAt: time + tk.warn(ms), fired: false, shears });
  };

  return {
    durationMs: 5600,
    windupMs: 500,
    gesture: 'point',
    tell: 'THE PRUNING',
    cast(time) {
      on = true; t0 = time; stage = 0; hedges = [];
      cite(tk, 2);
      endAt = time + 5400;
      const fromLeft = Math.random() < 0.5;
      const base = FIELD.y0 + 10 + Math.random() * 100;
      for (let y = base; y <= FIELD.y1; y += 118) {
        grow({ x: fromLeft ? FIELD.x0 - 40 : FIELD.x1 + 40, y }, fromLeft ? 0 : Math.PI, FIELD.x1 - FIELD.x0 + 80, time, 1000);
      }
      tk.sfx('thorn');
    },
    update(time) {
      if (!on) return;
      const p = tk.player;
      if (stage === 0 && time > t0 + 1800) {
        stage = 1;
        const fromTop = Math.random() < 0.5;
        const base = FIELD.x0 + 20 + Math.random() * 120;
        for (let x = base; x <= FIELD.x1; x += 156) {
          grow({ x, y: fromTop ? FIELD.y0 - 40 : FIELD.y1 + 40 }, fromTop ? Math.PI / 2 : -Math.PI / 2, FIELD.y1 - FIELD.y0 + 80, time, 1000);
        }
        tk.sfx('thorn');
      }
      if (stage === 1 && time > t0 + 3500) {
        stage = 2;
        // The shears: two blades crossing on where you stand.
        const c = { x: fieldX(p.x), y: fieldY(p.y) };
        for (const a of [Math.PI / 4, -Math.PI / 4]) grow({ x: c.x - Math.cos(a) * 420, y: c.y - Math.sin(a) * 420 }, a, 840, time, 850, true);
        tk.sfx('slash');
      }
      for (const h of hedges) {
        if (h.fired || time < h.readyAt) continue;
        h.fired = true;
        tk.sfx(h.shears ? 'trap-snap' : 'spore');
        if (time - lastHit > 250 && segDist(p.x, p.y, h.o.x, h.o.y, h.o.x + Math.cos(h.a) * h.len, h.o.y + Math.sin(h.a) * h.len) < HALF + PLAYER_R - 2) {
          lastHit = time; strike(tk, h.shears ? 13 : 10);
        }
      }
      hedges = hedges.filter((h) => !h.fired || time < h.readyAt + 700);
      if (time > endAt) { on = false; hedges = []; release(); }
    },
    drawGround(g, time) {
      if (!on) return;
      for (const h of hedges) {
        const ca = Math.cos(h.a), sa = Math.sin(h.a), px = -sa, py = ca;
        const k = clampN((time - h.from) / Math.max(1, h.readyAt - h.from), 0, 1);
        const f = h.fired ? 1 - clampN((time - h.readyAt) / 700, 0, 1) : 1;
        const front = h.fired ? h.len : h.len * k;
        if (h.shears) {
          // Two long blades of dark steel sliding in toward the crossing, the pivot at its middle.
          const mx = h.o.x + ca * h.len / 2, my = h.o.y + sa * h.len / 2;
          const open = h.fired ? 0 : (1 - k) * 0.25;
          g.lineStyle(HALF * 2, L.color, (h.fired ? 0.25 : 0.06 + 0.08 * k) * f); g.lineBetween(h.o.x, h.o.y, h.o.x + ca * h.len, h.o.y + sa * h.len);
          for (const s of [-1, 1]) {
            const ba = h.a + s * open;
            const tx = mx + Math.cos(ba) * 300 * s, ty = my + Math.sin(ba) * 300 * s;
            g.fillStyle(0x6a7470, 0.9 * f);
            g.fillTriangle(mx + px * 7, my + py * 7, mx - px * 7, my - py * 7, tx, ty);
            g.lineStyle(1.5, 0xe0e8e4, 0.8 * f); g.lineBetween(mx, my, tx, ty);
          }
          g.fillStyle(0x2a2a2a, f); g.fillCircle(mx, my, 6); g.fillStyle(0xb0b8b4, f); g.fillCircle(mx, my, 2.5);
          continue;
        }
        // The lane the hedge will fill.
        if (!h.fired) {
          g.fillStyle(L.deep, 0.18 + 0.12 * k);
          g.fillPoints([{ x: h.o.x + px * HALF, y: h.o.y + py * HALF }, { x: h.o.x + ca * h.len + px * HALF, y: h.o.y + sa * h.len + py * HALF }, { x: h.o.x + ca * h.len - px * HALF, y: h.o.y + sa * h.len - py * HALF }, { x: h.o.x - px * HALF, y: h.o.y - py * HALF }], true);
        }
        // The runner itself, wavering, with leaves.
        const pts: Pt[] = [];
        for (let d = 0; d <= front; d += 14) { const w = Math.sin(d * 0.06 + h.from) * 6; pts.push({ x: h.o.x + ca * d + px * w, y: h.o.y + sa * d + py * w }); }
        if (pts.length > 1) { g.lineStyle(4, 0x2a4a1a, f); g.strokePoints(pts); g.lineStyle(1.5, L.color, 0.8 * f); g.strokePoints(pts); }
        for (let i = 1; i < pts.length; i += 2) {
          const s = i % 4 === 1 ? 1 : -1;
          const q = pts[i];
          g.fillStyle(L.color, 0.85 * f); g.fillEllipse(q.x + px * s * 6, q.y + py * s * 6, 8, 5);
        }
        if (!h.fired && pts.length) { const q = pts[pts.length - 1]; g.fillStyle(L.light, 0.9); g.fillCircle(q.x, q.y, 3.5); }
        if (h.fired) {
          // Thorns, both sides, and here and there a rose.
          for (let i = 0; i < pts.length; i++) {
            const q = pts[i];
            for (const s of [-1, 1]) {
              const tl = (HALF + 2) * (0.7 + 0.3 * Math.sin(i * 2.1)) * f;
              g.fillStyle(0x1a2a10, f); g.fillTriangle(q.x - ca * 4, q.y - sa * 4, q.x + ca * 4, q.y + sa * 4, q.x + px * s * tl, q.y + py * s * tl);
              g.fillStyle(0xd84a4a, 0.8 * f); g.fillCircle(q.x + px * s * tl, q.y + py * s * tl, 1.2);
            }
            if (i % 6 === 3) { g.fillStyle(0xc8304a, f); g.fillCircle(q.x, q.y, 5); g.fillStyle(0xf07a8a, f); g.fillCircle(q.x - 1, q.y - 1, 2.4); }
          }
        }
      }
    },
    onPhaseEnd() { on = false; hedges = []; release(); },
  };
};

// ── THE BREATH-TAX ───────────────────────────────────────────────────

/** One breath: in down a cone (drawing you toward him), then out along it as a gale. */
interface Breath { a: number; half: number; from: number; outAt: number; out: boolean; x: number; y: number }

export const theBreathTax = (tk: BossToolkit): SignatureMove => {
  const L = LAWS[3];
  const RANGE = 470;
  let on = false, endAt = 0;
  let breaths: Breath[] = [];

  const take = (time: number, half: number, ms: number): void => {
    const o = at(tk), p = tk.player;
    const inMs = tk.warn(ms);
    breaths.push({ a: Math.atan2(p.y - o.y, p.x - o.x), half, from: time, outAt: time + inMs, out: false, x: o.x, y: o.y });
    tk.pull(o.x, o.y, 115, inMs);
    FS.pose = 'inhale';
    tk.sfx('gust');
  };

  return {
    durationMs: 5000,
    windupMs: 450,
    gesture: 'raise',
    locksBody: true,
    tell: 'THE BREATH-TAX',
    cast(time) {
      on = true; breaths = [];
      cite(tk, 3);
      FS.drive = true;
      take(time, 0.42, 1500);
      endAt = time + 4800;
    },
    update(time) {
      if (!on) return;
      const p = tk.player;
      for (const b of breaths) {
        if (b.out || time < b.outAt) continue;
        b.out = true;
        FS.pose = 'cite'; FS.citeAt = time;
        tk.sfx('tornado'); shake(tk, 240, 0.005);
        const d = dist(p.x, p.y, b.x, b.y);
        const rel = Math.abs(wrap(Math.atan2(p.y - b.y, p.x - b.x) - b.a));
        if (d < RANGE && rel < b.half + Math.atan2(PLAYER_R * 0.6, Math.max(d, 1))) { strike(tk, 13); tk.slowPlayer(0.6, 1200); }
        if (breaths.length === 1) tk.schedule(450, () => { if (on) take(tk.now, 0.66, 1050); });
      }
      if (time > endAt) { on = false; breaths = []; release(); }
    },
    drawGround(g, time) {
      if (!on) return;
      for (const b of breaths) {
        const out = b.out ? clampN((time - b.outAt) / 550, 0, 1) : 0;
        if (b.out && out >= 1) continue;
        const k = b.out ? 1 : clampN((time - b.from) / (b.outAt - b.from), 0, 1);
        const a0 = b.a - b.half, a1 = b.a + b.half;
        g.fillStyle(L.deep, (b.out ? 0.2 : 0.1 + 0.1 * k) * (1 - out)); g.slice(b.x, b.y, RANGE, a0, a1, false); g.fillPath();
        g.lineStyle(2, L.light, (0.4 + 0.4 * k) * (1 - out));
        g.beginPath(); g.arc(b.x, b.y, RANGE, a0, a1, false); g.strokePath();
        g.lineBetween(b.x, b.y, b.x + Math.cos(a0) * RANGE, b.y + Math.sin(a0) * RANGE);
        g.lineBetween(b.x, b.y, b.x + Math.cos(a1) * RANGE, b.y + Math.sin(a1) * RANGE);
        // Cloud along the rim of the cone.
        for (let i = 0; i <= 8; i++) {
          const a = a0 + (a1 - a0) * (i / 8);
          const r = RANGE * (b.out ? 1 + out * 0.15 : 1);
          g.fillStyle(0xffffff, 0.35 * (1 - out)); g.fillCircle(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, 9 + (i % 3) * 3);
        }
        const rng = mulberry(Math.floor(b.from));
        for (let i = 0; i < 16; i++) {
          const a = b.a + (rng() * 2 - 1) * b.half * 0.9;
          const ph = rng();
          // In: streaks running toward his mouth. Out: ribbons tearing away from it.
          const u = b.out ? (ph + out * 1.6) % 1 : 1 - ((ph + (time - b.from) / 700) % 1);
          const r0 = RANGE * u, r1 = r0 + (b.out ? 60 : 34);
          g.lineStyle(b.out ? 3 : 1.5, 0xffffff, (b.out ? 0.7 : 0.4 * k) * (1 - out));
          g.lineBetween(b.x + Math.cos(a) * r0, b.y + Math.sin(a) * r0, b.x + Math.cos(a) * r1, b.y + Math.sin(a) * r1);
        }
      }
    },
    onPhaseEnd() { on = false; breaths = []; release(); },
  };
};

// ── THE STONE TITHE ──────────────────────────────────────────────────

/** A stone: falls on its mark, lies there, then rolls home to him. */
interface Stone { x: number; y: number; from: number; landAt: number; landed: boolean; s: number; roll?: { fx: number; fy: number; tx: number; ty: number; from: number; goAt: number; hit: boolean; done: boolean } }

export const theStoneTithe = (tk: BossToolkit): SignatureMove => {
  const L = LAWS[4];
  const R = 52, ROLL = 480;
  let on = false, t0 = 0, dropped = 0, collected = false, endAt = 0;
  let stones: Stone[] = [];

  const boulder = (g: G, x: number, y: number, s: number, spin: number, a: number): void => {
    g.fillStyle(dim(L.color, 0.45), a); g.fillCircle(x, y + 2, s);
    g.fillStyle(L.color, a); g.fillCircle(x, y, s);
    g.fillStyle(lit(L.color, 0.25), a); g.fillCircle(x - s * 0.3, y - s * 0.35, s * 0.45);
    g.lineStyle(1.5, L.deep, 0.8 * a);
    for (let i = 0; i < 3; i++) {
      const q = spin + i * 2.1;
      g.lineBetween(x + Math.cos(q) * s * 0.2, y + Math.sin(q) * s * 0.2, x + Math.cos(q + 0.4) * s * 0.85, y + Math.sin(q + 0.4) * s * 0.85);
    }
  };

  return {
    durationMs: 6200,
    windupMs: 500,
    gesture: 'slam',
    tell: 'THE STONE TITHE',
    cast(time) {
      on = true; t0 = time; dropped = 0; collected = false; stones = [];
      cite(tk, 4);
      endAt = time + 6000;
      tk.sfx('stone-rise');
    },
    update(time) {
      if (!on) return;
      const p = tk.player;
      while (dropped < 6 && time >= t0 + dropped * 360) {
        stones.push({ x: fieldX(p.x), y: fieldY(p.y), from: time, landAt: time + tk.warn(950), landed: false, s: 15 + Math.random() * 5 });
        dropped++;
      }
      for (const s of stones) {
        if (!s.landed && time >= s.landAt) {
          s.landed = true;
          tk.sfx('rock-throw'); shake(tk, 120, 0.004);
          if (dist(p.x, p.y, s.x, s.y) < R + PLAYER_R * 0.5) strike(tk, 12);
        }
        const r = s.roll;
        if (r && !r.done && time >= r.goAt) {
          const d = ((time - r.goAt) / 1000) * ROLL;
          const L2 = dist(r.fx, r.fy, r.tx, r.ty);
          const k = Math.min(1, d / Math.max(1, L2));
          s.x = r.fx + (r.tx - r.fx) * k; s.y = r.fy + (r.ty - r.fy) * k;
          if (!r.hit && dist(p.x, p.y, s.x, s.y) < s.s + PLAYER_R) { r.hit = true; strike(tk, 9); }
          if (k >= 1) { r.done = true; tk.sfx('stone-slam'); }
        }
      }
      // The tithe collected: every stone rolls home, each down its own marked path.
      if (!collected && dropped >= 6 && stones.every((s) => s.landed) && time > stones[stones.length - 1].landAt + 450) {
        collected = true;
        FS.drive = true; FS.pose = 'cite'; FS.citeAt = time;
        const o = at(tk);
        stones.forEach((s, i) => {
          s.roll = { fx: s.x, fy: s.y, tx: o.x, ty: o.y, from: time, goAt: time + tk.warn(800) + i * 140, hit: false, done: false };
        });
        tk.sfx('quake');
      }
      if (collected && stones.every((s) => s.roll?.done)) stones = [];
      if (time > endAt) { on = false; stones = []; release(); }
    },
    drawGround(g, time) {
      if (!on) return;
      for (const s of stones) {
        if (!s.landed) {
          const k = clampN((time - s.from) / (s.landAt - s.from), 0, 1);
          g.fillStyle(0x000000, 0.15 + 0.3 * k); g.fillEllipse(s.x, s.y, R * 2 * (0.4 + 0.6 * k), R * 1.4 * (0.4 + 0.6 * k));
          g.lineStyle(k > 0.8 && Math.floor(time / 80) % 2 === 0 ? 3 : 2, L.light, 0.4 + 0.4 * k); g.strokeCircle(s.x, s.y, R);
          continue;
        }
        const since = time - s.landAt;
        if (since < 400) { g.lineStyle(4 * (1 - since / 400) + 1, L.light, 0.6 * (1 - since / 400)); g.strokeCircle(s.x, s.y, R * (1 + since / 600)); }
        const r = s.roll;
        if (r && !r.done && time < r.goAt) {
          // The path home, chalked in the dust.
          const k = clampN((time - r.from) / Math.max(1, r.goAt - r.from), 0, 1);
          const L2 = dist(r.fx, r.fy, r.tx, r.ty), n = Math.floor(L2 / 18);
          for (let i = 1; i < n; i++) {
            if (i / n > k) break;
            g.fillStyle(L.light, 0.55); g.fillCircle(r.fx + (r.tx - r.fx) * (i / n), r.fy + (r.ty - r.fy) * (i / n), 2.2);
          }
          g.lineStyle(s.s * 2 + PLAYER_R, L.color, 0.06 + 0.06 * k); g.lineBetween(r.fx, r.fy, r.tx, r.ty);
        }
        if (r?.done) continue;
        if (!r || time < r.goAt) {
          // Rubble round the stone where it fell.
          for (let i = 0; i < 5; i++) { const a = i * 1.3 + s.from; g.fillStyle(dim(L.color, 0.2), 0.9); g.fillCircle(s.x + Math.cos(a) * (s.s + 6), s.y + Math.sin(a) * (s.s + 4) * 0.7, 3); }
        }
        boulder(g, s.x, s.y, s.s, r && time >= r.goAt ? (time - r.goAt) / 60 : s.from, 1);
      }
    },
    drawAir(g, time) {
      if (!on) return;
      for (const s of stones) {
        if (s.landed) continue;
        const k = clampN((time - s.from) / (s.landAt - s.from), 0, 1);
        const h = Math.pow(1 - k, 2) * 360;
        if (h > 340) continue;
        boulder(g, s.x, s.y - h, s.s * (1 + (1 - k) * 0.3), s.from, 0.4 + 0.6 * k);
      }
    },
    onPhaseEnd() { on = false; stones = []; release(); },
  };
};
