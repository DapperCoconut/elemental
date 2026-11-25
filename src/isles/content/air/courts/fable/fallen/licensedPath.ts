import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  CLOTH_RED, COBBLE, COBBLE_DARK, FOE_C, GILT_LIT, INK, MEADOW, MEADOW_DARK, MEADOW_LIT, MINE_C, PAGE,
  TIMBER, TIMBER_DARK, clamp, dist, frameClock, inkCircle, inked, segDist,
} from '../util';
import { alive, pagePlate } from './common';

/**
 * Keep to the Path — Brannock Hale, the Huntsman, who in the King's telling kept the licensed
 * road through the Fable wood and set his snares for anyone who walked it out of turn.
 *
 * A path winds across the yard through the wood. Off it, the wood notices you: every moment you
 * spend among the trees earns a paw-print over your head, and at the third, a wolf's eyes open at
 * the wood's edge, a line is drawn from them through where you stand — and the wolf runs it,
 * mauling anyone in the way. On the path the wolves leave you be, but the Huntsman knows exactly
 * where you will walk: snares spring on the path around you, each clicking first.
 *
 * The exploit is the wolf's line. It is drawn through you but runs the whole yard, and it mauls
 * whoever it meets — so take the third print with the Huntsman between you and the eyes, or chase
 * him into the trees until the wood takes an interest in him. At half health the path itself turns:
 * every few seconds it is redrawn (the new way is shown faint first) and the old one is wood.
 */

const ID = fallenId('fable', 'licensed-path');
const PATH_HW = 46;
const MARK_MS = 650;
const DECAY_MS = 1500;
const WOLF_WARN = 1150;
const WOLF_SPEED = 950;
const SNARE_EVERY = 3600;
const REDRAW_MS = 9000;
const SHOW_NEW_MS = 2200;

interface Track { marks: number; acc: number; calm: number }
interface Wolf { from: Pt; ang: number; at: number; runAt: number; prey: Fighter; hit: Set<Fighter>; done: boolean; roared: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk, player, npc } = ctx;
  const step = frameClock();

  const makePath = (): Pt[] => {
    const pts: Pt[] = [];
    const n = 6;
    const mid = (top + H) / 2;
    for (let i = 0; i < n; i++) {
      const x = 20 + (i / (n - 1)) * (W - 40);
      pts.push({ x, y: clamp(mid + (ctx.rng() - 0.5) * (H - top - 200), top + 90, H - 90) });
    }
    return pts;
  };

  let path = makePath();
  let nextPath: Pt[] | null = null;
  let redraws = false;
  let nextRedraw = 0;
  let started = false;
  let nextSnare = 0;
  const tracks = new Map<Fighter, Track>([[player, { marks: 0, acc: 0, calm: 0 }], [npc, { marks: 0, acc: 0, calm: 0 }]]);
  let wolves: Wolf[] = [];
  const trees: { x: number; y: number; s: number }[] = [];

  const offPath = (pts: Pt[], x: number, y: number): number => {
    let d = Infinity;
    for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y));
    return d;
  };
  const nearestOnPath = (x: number, y: number): Pt => {
    let best: Pt = path[0], bd = Infinity;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
      const p = { x: a.x + dx * t, y: a.y + dy * t };
      const d = dist(x, y, p.x, p.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  };

  function plantTrees(): void {
    trees.length = 0;
    for (let i = 0; i < 40 && trees.length < 11; i++) {
      const x = 50 + ctx.rng() * (W - 100), y = top + 60 + ctx.rng() * (H - top - 90);
      if (offPath(path, x, y) < PATH_HW + 50 || (nextPath && offPath(nextPath, x, y) < PATH_HW + 50)) continue;
      if (trees.some((t) => dist(t.x, t.y, x, y) < 90)) continue;
      trees.push({ x, y, s: 26 + ctx.rng() * 12 });
    }
  }

  function loose(prey: Fighter, time: number): void {
    // The eyes open at the far edge of the wood from the prey, so the run is long and readable.
    const edges: Pt[] = [{ x: 24, y: prey.y }, { x: W - 24, y: prey.y }, { x: prey.x, y: H - 24 }, { x: prey.x, y: top + 30 }];
    edges.sort((a, b) => dist(b.x, b.y, prey.x, prey.y) - dist(a.x, a.y, prey.x, prey.y));
    const pick = edges[ctx.rng() < 0.6 ? 0 : 1];
    const jitter = (ctx.rng() - 0.5) * 120;
    const from = pick.x === prey.x ? { x: clamp(pick.x + jitter, 40, W - 40), y: pick.y } : { x: pick.x, y: clamp(pick.y + jitter, top + 40, H - 40) };
    wolves.push({ from, ang: Math.atan2(prey.y - from.y, prey.x - from.x), at: time, runAt: time + tk.warn(WOLF_WARN), prey, hit: new Set(), done: false, roared: false });
    ctx.sfx('screech');
  }

  return {
    update(time) {
      const dt = step(time) * 1000;
      if (!started) { started = true; nextSnare = time + 2600; nextRedraw = time + REDRAW_MS; plantTrees(); }
      if (!redraws && npc.hp < npc.maxHp * 0.5) {
        redraws = true; nextRedraw = time + SHOW_NEW_MS + 400;
        ctx.banner('THE PATH TURNS', '#c8f0a0');
        ctx.sfx('thorn');
      }
      if (redraws) {
        if (!nextPath && time >= nextRedraw - SHOW_NEW_MS) { nextPath = makePath(); plantTrees(); }
        if (nextPath && time >= nextRedraw) { path = nextPath; nextPath = null; nextRedraw = time + REDRAW_MS; plantTrees(); ctx.sfx('stone-rise'); }
      }
      // The wood's attention.
      for (const [f, tr] of tracks) {
        if (!alive(f)) continue;
        const off = offPath(path, f.x, f.y) > PATH_HW && !ctx.isAirborne(f);
        if (off) {
          tr.calm = 0; tr.acc += dt;
          if (tr.acc >= MARK_MS && tr.marks < 3 && !wolves.some((w) => w.prey === f && !w.done)) {
            tr.acc = 0; tr.marks++;
            ctx.sfx('status-debuff');
            if (tr.marks >= 3) { tr.marks = 0; loose(f, time); }
          }
        } else {
          tr.acc = 0; tr.calm += dt;
          if (tr.calm >= DECAY_MS && tr.marks > 0) { tr.calm = 0; tr.marks--; }
        }
      }
      // Wolves run their lines.
      for (const w of wolves) {
        if (w.done || time < w.runAt) continue;
        const run = (time - w.runAt) / 1000 * WOLF_SPEED;
        const wx = w.from.x + Math.cos(w.ang) * run, wy = w.from.y + Math.sin(w.ang) * run;
        if (wx < -60 || wx > W + 60 || wy < top - 60 || wy > H + 60) { w.done = true; continue; }
        if (!w.roared) { w.roared = true; ctx.sfx('roar'); }
        for (const f of [player, npc]) {
          if (!alive(f) || w.hit.has(f) || ctx.isAirborne(f) || dist(f.x, f.y, wx, wy) > 46) continue;
          w.hit.add(f);
          ctx.hit(f, f === player ? 20 : 30, f.x, f.y);
          ctx.nudge(f, Math.cos(w.ang) * 70, Math.sin(w.ang) * 70);
          ctx.flash(f.x, f.y, 0x9a96a6);
        }
      }
      wolves = wolves.filter((w) => !w.done || time - w.runAt < 2000);
      // The Huntsman's snares, on the path where the stranger walks.
      if (time >= nextSnare && alive(player)) {
        nextSnare = time + SNARE_EVERY;
        if (offPath(path, player.x, player.y) <= PATH_HW + 30) {
          const p = nearestOnPath(player.x + Math.cos(ctx.facing(player)) * 40, player.y + Math.sin(ctx.facing(player)) * 40);
          tk.spawnZone({ x: p.x, y: p.y, radius: 48, warnMs: 950, damage: 12, slowMult: 0.5, slowMs: 900 });
          ctx.sfx('trap-set');
        }
      }
    },

    npcSeek(): Pt | null {
      // Out of a wolf's line if it is drawn through him.
      for (const w of wolves) {
        if (w.done) continue;
        const ex = w.from.x + Math.cos(w.ang) * 2000, ey = w.from.y + Math.sin(w.ang) * 2000;
        if (segDist(npc.x, npc.y, w.from.x, w.from.y, ex, ey) < 70) {
          const nx = -Math.sin(w.ang), ny = Math.cos(w.ang);
          const s = (npc.x - w.from.x) * nx + (npc.y - w.from.y) * ny >= 0 ? 1 : -1;
          return { x: clamp(npc.x + nx * s * 120, 60, W - 60), y: clamp(npc.y + ny * s * 120, top + 50, H - 50) };
        }
      }
      // Back to the road before the wood takes him.
      const tr = tracks.get(npc);
      if (tr && tr.marks >= 2) return nearestOnPath(npc.x, npc.y);
      if (nextPath && offPath(nextPath, npc.x, npc.y) > PATH_HW) {
        let best = nextPath[0], bd = Infinity;
        for (const p of nextPath) { const d = dist(npc.x, npc.y, p.x, p.y); if (d < bd) { bd = d; best = p; } }
        return best;
      }
      return null;
    },

    drawGround(g, time) {
      // The wood's floor, then the path worn through it.
      g.fillStyle(MEADOW_DARK, 0.55); g.fillRect(0, top, W, H - top);
      g.fillStyle(dim(MEADOW_DARK, 0.25), 0.35);
      for (let i = 0; i < 26; i++) g.fillCircle((i * 197) % W, top + ((i * 131) % (H - top)), 30 + (i % 4) * 10);
      if (nextPath) drawPath(g, nextPath, 0.25 + 0.15 * Math.sin(time / 120), time);
      drawPath(g, path, 1, time);
      // Wolf lines, drawn from the eyes through the prey and on across the yard.
      for (const w of wolves) {
        if (w.done && time - w.runAt > 400) continue;
        const k = clamp((time - w.at) / Math.max(1, w.runAt - w.at), 0, 1);
        const ex = w.from.x + Math.cos(w.ang) * 1400, ey = w.from.y + Math.sin(w.ang) * 1400;
        g.lineStyle(60, 0x3e3a46, 0.08 + 0.16 * k); g.lineBetween(w.from.x, w.from.y, ex, ey);
        g.lineStyle(2, CLOTH_RED, 0.3 + 0.5 * k); g.lineBetween(w.from.x, w.from.y, ex, ey);
        // Paw prints stepping along the line as it fills.
        for (let i = 1; i < 12; i++) {
          if (i / 12 > k) break;
          const d = i * 70, px = w.from.x + Math.cos(w.ang) * d, py = w.from.y + Math.sin(w.ang) * d;
          paw(g, px + Math.sin(w.ang) * (i % 2 ? 8 : -8), py - Math.cos(w.ang) * (i % 2 ? 8 : -8), 0.55, w.ang);
        }
      }
    },

    drawAir(g, time) {
      for (const t of trees) drawPine(g, t.x, t.y, t.s);
      for (const w of wolves) {
        if (time < w.runAt) {
          // Eyes in a bush at the wood's edge.
          const k = clamp((time - w.at) / Math.max(1, w.runAt - w.at), 0, 1);
          inkCircle(g, w.from.x, w.from.y, 22, MEADOW_DARK, 1, 1.6);
          g.fillStyle(dim(MEADOW_DARK, 0.3), 1); g.fillCircle(w.from.x - 8, w.from.y + 4, 12);
          const nx = -Math.sin(w.ang) * 6, ny = Math.cos(w.ang) * 6;
          g.fillStyle(GILT_LIT, 0.4 + 0.6 * k);
          g.fillEllipse(w.from.x + nx, w.from.y + ny, 6, 4 * k + 1); g.fillEllipse(w.from.x - nx, w.from.y - ny, 6, 4 * k + 1);
        } else if (!w.done) {
          const run = (time - w.runAt) / 1000 * WOLF_SPEED;
          drawWolf(g, w.from.x + Math.cos(w.ang) * run, w.from.y + Math.sin(w.ang) * run, w.ang, time);
        }
      }
      // Paw-prints over each fighter's head: the wood's attention.
      for (const [f, tr] of tracks) {
        if (!alive(f) || tr.marks <= 0) continue;
        for (let i = 0; i < tr.marks; i++) paw(g, f.x - 12 + i * 12, f.y - 62, 0.9, -Math.PI / 2);
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 4;
      pagePlate(g, x, y, 150, 28);
      for (const [f, col, ox] of [[player, MINE_C, -58], [npc, FOE_C, 18]] as const) {
        const tr = tracks.get(f);
        g.fillStyle(col, 1); g.fillCircle(x + ox, y + 14, 4);
        for (let i = 0; i < 3; i++) {
          const on = !!tr && tr.marks > i;
          g.fillStyle(on ? INK : dim(PAGE, 0.15), on ? 1 : 0.9);
          g.fillCircle(x + ox + 12 + i * 11, y + 15, 3.4);
          for (let t = -1; t <= 1; t++) g.fillCircle(x + ox + 12 + i * 11 + t * 3, y + 10, 1.3);
        }
      }
      if (redraws) {
        const k = clamp(1 - (nextRedraw - time) / REDRAW_MS, 0, 1);
        g.fillStyle(COBBLE_DARK, 0.9); g.fillRect(x - 66, y + 24, 132 * k, 2);
      }
    },
  };
}

/** The road through the wood: packed earth, a cobbled crown, little flowers at its verge. */
function drawPath(g: G, pts: Pt[], a: number, time: number): void {
  g.lineStyle(PATH_HW * 2 + 8, MEADOW_LIT, 0.5 * a);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
  g.lineStyle(PATH_HW * 2, 0xc8a878, a);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
  g.lineStyle(PATH_HW * 0.7, lit(0xc8a878, 0.15), a);
  g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); g.strokePath();
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i], B = pts[i + 1];
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    const ux = (B.x - A.x) / len, uy = (B.y - A.y) / len;
    for (let d = 20; d < len; d += 38) {
      const s = ((i * 7 + d) % 3) - 1;
      g.fillStyle(COBBLE, 0.9 * a); g.fillEllipse(A.x + ux * d - uy * s * 14, A.y + uy * d + ux * s * 14, 10, 6);
      g.fillStyle(COBBLE_DARK, 0.6 * a); g.fillEllipse(A.x + ux * d - uy * s * 14 + 1, A.y + uy * d + ux * s * 14 + 2, 8, 2);
      const side = (d / 38) % 2 < 1 ? 1 : -1;
      const fx = A.x + ux * d - uy * side * (PATH_HW + 6), fy = A.y + uy * d + ux * side * (PATH_HW + 6);
      g.fillStyle([CLOTH_RED, PAGE, GILT_LIT][Math.floor(d / 38) % 3], a); g.fillCircle(fx, fy + Math.sin(time / 600 + d) * 0.6, 2.4);
    }
  }
}

/** A storybook pine: ink-lined tiers on a short trunk. */
function drawPine(g: G, x: number, y: number, s: number): void {
  g.fillStyle(0x000000, 0.22); g.fillEllipse(x + 6, y + 2, s * 1.6, s * 0.4);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 3, y - s * 0.4, 6, s * 0.4);
  for (let k = 0; k < 3; k++) {
    const w = s * (1.1 - k * 0.28), by = y - s * 0.3 - k * s * 0.5;
    inked(g, [{ x: x - w / 2, y: by }, { x: x + w / 2, y: by }, { x, y: by - s * 0.8 }], k === 2 ? MEADOW : MEADOW_DARK, 1, 1.6);
  }
}

/** A wolf paw-print, toes forward along `a`. */
function paw(g: G, x: number, y: number, s: number, a: number): void {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  g.fillStyle(INK, 0.75); g.fillEllipse(x, y, 9 * s, 8 * s);
  for (let t = -1.5; t <= 1.5; t += 1) g.fillCircle(x + ux * 7 * s + nx * t * 3.6 * s, y + uy * 7 * s + ny * t * 3.6 * s, 2 * s);
}

/** The wood's wolf at full stretch, running along `a`. */
function drawWolf(g: G, x: number, y: number, a: number, time: number): void {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const P = (f: number, s: number): Pt => ({ x: x + ux * f + nx * s, y: y + uy * f + ny * s });
  const fur = 0x6e6a78, furDark = 0x3e3a46;
  const st = Math.sin(time / 40) * 10;
  g.lineStyle(5, furDark, 1);
  for (const [f, s, ph] of [[16, 10, 1], [16, -10, -1], [-16, 10, -1], [-16, -10, 1]] as const) {
    const a0 = P(f, s), a1 = P(f + st * ph + 8, s * 1.8);
    g.lineBetween(a0.x, a0.y, a1.x, a1.y);
  }
  inked(g, [P(-34, 0), P(-60, 10 + st * 0.3), P(-32, 6)], furDark, 1, 1.2);
  inked(g, [P(-28, -12), P(20, -14), P(30, 0), P(20, 14), P(-28, 12), P(-34, 0)], fur, 1, 1.8);
  inked(g, [P(22, -12), P(46, -6), P(60, 0), P(46, 6), P(22, 12)], fur, 1, 1.6);
  inked(g, [P(28, -10), P(32, -22), P(38, -8)], fur, 1, 1.2);
  inked(g, [P(28, 10), P(32, 22), P(38, 8)], fur, 1, 1.2);
  const e1 = P(42, -5), e2 = P(42, 5), nose = P(60, 0);
  g.fillStyle(GILT_LIT, 1); g.fillCircle(e1.x, e1.y, 2.4); g.fillCircle(e2.x, e2.y, 2.4);
  g.fillStyle(INK, 1); g.fillCircle(nose.x, nose.y, 3);
  g.lineStyle(1.4, TIMBER, 0.4); const b0 = P(-10, -8), b1 = P(10, -8); g.lineBetween(b0.x, b0.y, b1.x, b1.y);
}

export const FALLEN_LICENSED_PATH: GimmickDef = {
  id: ID,
  rules: 'Off the path the wood marks you; at three marks a wolf runs a line through you, mauling all in it. On the path, his snares. Lure him into the trees.',
  make,
};
