import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { CAL, dist, makeClock } from '../palette';

/**
 * Knapper's Floor — Knapper Isk Hollowell (Ruin).
 *
 * Isk struck the blades the King's branders carried: a blow on an obsidian core in the right
 * place and a flake jumps off the far side, longer than a sword and sharper. The fight is round
 * his core, a great black nodule on the floor. Anyone may strike it — every blow cracks a line
 * straight through it from the striker's side and, a breath later, a flake shears off the
 * *opposite* face and flies the length of that line, cutting whoever it crosses.
 *
 * So the core is a gun with no owner: whoever puts it between themselves and their enemy can
 * fire it. Isk circles to the far side of it from you; so should you. The crack line is drawn
 * before the flake flies — step off it. Halfway down the core splits in two, and the flakes
 * from the halves skip once off the crater wall, so the lines bend.
 */

const CORE_R = 40;
const HALF_CORE_R = 30;
const FLAKE_SPEED = 640;
const FLAKE_DMG = 22;
const FLAKE_WARN = 480;
const STRIKE_GAP = 650;

interface Core { x: number; y: number; r: number; t: StrikeTarget; scars: number[] }
interface Flake { path: Pt[]; len: number; bornAt: number; fireAt: number; s: number; hit: Set<Fighter>; ang: number }
interface Chip { x: number; y: number; a: number; s: number }

export const knappingGimmick: GimmickDef = {
  id: fallenId('caldera', 'knapping'),
  rules: 'Strike the obsidian core and a flake flies out its far side along the crack. Put it between you and Isk. Below half: two cores, flakes skip.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, rng } = ctx;
    const tick = makeClock();
    const cy = Math.round((top + H) / 2);
    const box = { x0: 30, x1: W - 30, y0: top + 8, y1: H - 18 };
    let split = false;
    let nowT = 0;
    const lastStrike = { player: -9999, npc: -9999 };
    const flakes: Flake[] = [];
    const chips: Chip[] = [];
    const cores: Core[] = [];

    /** The ray from (x, y) along (dx, dy) to the arena wall, and that wall's normal. */
    const toWall = (x: number, y: number, dx: number, dy: number): { p: Pt; nx: number; ny: number } => {
      let t = Infinity, nx = 0, ny = 0;
      if (dx > 0.0001 && (box.x1 - x) / dx < t) { t = (box.x1 - x) / dx; nx = -1; ny = 0; }
      if (dx < -0.0001 && (box.x0 - x) / dx < t) { t = (box.x0 - x) / dx; nx = 1; ny = 0; }
      if (dy > 0.0001 && (box.y1 - y) / dy < t) { t = (box.y1 - y) / dy; nx = 0; ny = -1; }
      if (dy < -0.0001 && (box.y0 - y) / dy < t) { t = (box.y0 - y) / dy; nx = 0; ny = 1; }
      if (!Number.isFinite(t)) t = 0;
      return { p: { x: x + dx * t, y: y + dy * t }, nx, ny };
    };

    const knap = (c: Core, by: 'player' | 'npc'): void => {
      if (nowT - lastStrike[by] < STRIKE_GAP) return;
      lastStrike[by] = nowT;
      const f = by === 'player' ? ctx.player : ctx.npc;
      let ang = Math.atan2(c.y - f.y, c.x - f.x);
      if (dist(f.x, f.y, c.x, c.y) < 2) ang = rng() * Math.PI * 2;
      const dx = Math.cos(ang), dy = Math.sin(ang);
      const start = { x: c.x + dx * (c.r + 4), y: c.y + dy * (c.r + 4) };
      const path: Pt[] = [start];
      const w1 = toWall(start.x, start.y, dx, dy);
      path.push(w1.p);
      if (split) {
        // Skip once off the wall: reflect the direction about the wall's normal.
        const d = dx * w1.nx + dy * w1.ny;
        const rx = dx - 2 * d * w1.nx, ry = dy - 2 * d * w1.ny;
        const w2 = toWall(w1.p.x + rx * 2, w1.p.y + ry * 2, rx, ry);
        path.push({ x: w1.p.x + (w2.p.x - w1.p.x) * 0.6, y: w1.p.y + (w2.p.y - w1.p.y) * 0.6 });
      }
      const len = path.slice(1).reduce((a, p, i) => a + dist(path[i].x, path[i].y, p.x, p.y), 0);
      flakes.push({ path, len, bornAt: nowT, fireAt: nowT + FLAKE_WARN, s: 0, hit: new Set(), ang });
      c.scars.push(ang + Math.PI);
      if (c.scars.length > 9) c.scars.shift();
      ctx.sfx('stone-slam');
      ctx.flash(start.x, start.y, CAL.glassGleam);
    };

    const addCore = (x: number, y: number, r: number): void => {
      const core: Core = { x, y, r, scars: [], t: ctx.target({ x, y, r, onStruck: (by) => knap(core, by) }) };
      cores.push(core);
    };
    addCore(W / 2, cy, CORE_R);

    const pointOn = (fl: Flake, s: number): Pt => {
      let left = s;
      for (let i = 0; i < fl.path.length - 1; i++) {
        const a = fl.path[i], b = fl.path[i + 1], d = dist(a.x, a.y, b.x, b.y);
        if (left <= d) { const t = d > 0 ? left / d : 0; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
        left -= d;
      }
      return fl.path[fl.path.length - 1];
    };

    const pushOut = (f: Fighter): void => {
      if (!f.active) return;
      for (const c of cores) {
        const d = dist(c.x, c.y, f.x, f.y), min = c.r + 18;
        if (d < min) {
          const ux = d > 0.01 ? (f.x - c.x) / d : 1, uy = d > 0.01 ? (f.y - c.y) / d : 0;
          ctx.nudge(f, ux * (min - d), uy * (min - d));
        }
      }
    };

    return {
      update(time: number) {
        const dt = tick(time);
        nowT = time;
        if (!split && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
          split = true;
          for (const c of cores) c.t.remove();
          cores.length = 0;
          addCore(W / 2 - 180, cy, HALF_CORE_R);
          addCore(W / 2 + 180, cy, HALF_CORE_R);
          ctx.banner('THE CORE SPLITS — FLAKES SKIP OFF THE WALL', '#ffd27a');
          ctx.sfx('crystal-shatter');
          ctx.flash(W / 2, cy, CAL.glassGleam);
        }
        for (let i = flakes.length - 1; i >= 0; i--) {
          const fl = flakes[i];
          if (time < fl.fireAt) continue;
          if (fl.s === 0) ctx.sfx('slash');
          const prev = fl.s;
          fl.s = Math.min(fl.len, fl.s + FLAKE_SPEED * dt);
          // Sweep the edge over everything it crossed this frame.
          for (let s = prev; s <= fl.s; s += 10) {
            const q = pointOn(fl, s);
            for (const f of [ctx.player, ctx.npc]) {
              if (fl.hit.has(f) || !f.active || f.hp <= 0) continue;
              if (dist(q.x, q.y, f.x, f.y) < 30) { fl.hit.add(f); ctx.hit(f, FLAKE_DMG, f.x, f.y); ctx.sfx('hit-medium'); }
            }
          }
          if (fl.s >= fl.len) {
            const end = fl.path[fl.path.length - 1];
            chips.push({ x: end.x, y: end.y, a: rng() * Math.PI, s: 0.7 + rng() * 0.6 });
            if (chips.length > 24) chips.shift();
            flakes.splice(i, 1);
          }
        }
        pushOut(ctx.player);
        pushOut(ctx.npc);
      },

      npcSeek(): Pt | null {
        const n = ctx.npc, pl = ctx.player;
        // Off any crack line that is about to fire.
        for (const fl of flakes) {
          if (nowT > fl.fireAt + 200) continue;
          for (let i = 0; i < fl.path.length - 1; i++) {
            const a = fl.path[i], b = fl.path[i + 1];
            const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2 || 1;
            const t = Phaser.Math.Clamp(((n.x - a.x) * (b.x - a.x) + (n.y - a.y) * (b.y - a.y)) / len2, 0, 1);
            const px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t;
            const d = dist(px, py, n.x, n.y);
            if (d < 46) {
              const ux = d > 1 ? (n.x - px) / d : -(b.y - a.y) / Math.sqrt(len2), uy = d > 1 ? (n.y - py) / d : (b.x - a.x) / Math.sqrt(len2);
              return { x: Phaser.Math.Clamp(n.x + ux * 90, 50, W - 50), y: Phaser.Math.Clamp(n.y + uy * 90, top + 40, H - 40) };
            }
          }
        }
        // The far side of the nearest core from the player, close enough to strike it.
        let best: Core | null = null, bd = Infinity;
        for (const c of cores) { const d = dist(c.x, c.y, n.x, n.y); if (d < bd) { bd = d; best = c; } }
        if (!best) return null;
        const d = dist(pl.x, pl.y, best.x, best.y) || 1;
        return {
          x: Phaser.Math.Clamp(best.x + ((best.x - pl.x) / d) * (best.r + 46), 50, W - 50),
          y: Phaser.Math.Clamp(best.y + ((best.y - pl.y) / d) * (best.r + 46), top + 40, H - 40),
        };
      },

      drawGround(g, time) {
        // Spent flakes lying where they struck the wall.
        for (const c of chips) {
          const ca = Math.cos(c.a), sa = Math.sin(c.a);
          g.fillStyle(CAL.obsidianMid, 0.9);
          g.fillTriangle(c.x - ca * 14 * c.s, c.y - sa * 14 * c.s, c.x + ca * 14 * c.s, c.y + sa * 14 * c.s, c.x - sa * 5 * c.s, c.y + ca * 5 * c.s);
          g.lineStyle(1, CAL.glassGleam, 0.5); g.lineBetween(c.x - ca * 12 * c.s, c.y - sa * 12 * c.s, c.x + ca * 12 * c.s, c.y + sa * 12 * c.s);
        }
        // Crack lines: a hairline running out from the core, widening and brightening to the shear.
        for (const fl of flakes) {
          if (time >= fl.fireAt) continue;
          const k = Phaser.Math.Clamp((time - fl.bornAt) / (fl.fireAt - fl.bornAt), 0, 1);
          const reach = fl.len * Math.min(1, k * 2.2);
          let left = reach;
          for (let i = 0; i < fl.path.length - 1 && left > 0; i++) {
            const a = fl.path[i], b = fl.path[i + 1], d = dist(a.x, a.y, b.x, b.y), t = Math.min(1, left / d);
            const ex = a.x + (b.x - a.x) * t, ey = a.y + (b.y - a.y) * t;
            g.lineStyle(26, CAL.seam, 0.08 + 0.14 * k); g.lineBetween(a.x, a.y, ex, ey);
            g.lineStyle(1 + 2 * k, mixC(CAL.glassGleam, CAL.lavaHot, k), 0.5 + 0.5 * k); g.lineBetween(a.x, a.y, ex, ey);
            left -= d;
          }
        }
        // The core(s): a lumpy black nodule with conchoidal scars where flakes came off.
        for (const c of cores) {
          g.fillStyle(0x000000, 0.35); g.fillEllipse(c.x + 4, c.y + c.r * 0.6, c.r * 2.4, c.r * 0.9);
          const pts: Phaser.Geom.Point[] = [];
          for (let k = 0; k < 11; k++) {
            const a = (k / 11) * Math.PI * 2;
            const rr = c.r * (0.88 + 0.12 * Math.sin(k * 2.7 + c.x));
            pts.push(new Phaser.Geom.Point(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr * 0.86 - 6));
          }
          g.fillStyle(CAL.obsidian, 1); g.fillPoints(pts, true, true);
          g.fillStyle(CAL.obsidianMid, 1); g.fillEllipse(c.x - c.r * 0.2, c.y - c.r * 0.35, c.r * 1.1, c.r * 0.7);
          // Scars: shallow shell-shaped hollows, rippled, on the face each flake left.
          for (const sa of c.scars) {
            const sx = c.x + Math.cos(sa) * c.r * 0.62, sy = c.y + Math.sin(sa) * c.r * 0.55 - 6;
            g.fillStyle(CAL.obsidianLit, 0.8); g.fillEllipse(sx, sy, c.r * 0.5, c.r * 0.34);
            g.lineStyle(1, CAL.glassGleam, 0.45);
            for (let r = 4; r < c.r * 0.22; r += 4) { g.beginPath(); g.arc(sx, sy, r, sa + Math.PI - 1, sa + Math.PI + 1, false); g.strokePath(); }
          }
          g.lineStyle(2, CAL.glassGleam, 0.55 + Math.sin(time / 500 + c.x) * 0.2);
          g.beginPath(); g.arc(c.x - c.r * 0.25, c.y - c.r * 0.45, c.r * 0.45, Math.PI * 1.1, Math.PI * 1.6, false); g.strokePath();
        }
      },

      drawAir(g) {
        // Flying flakes: a long blade of black glass, its edge lit, a hot streak behind.
        for (const fl of flakes) {
          if (fl.s <= 0) continue;
          const head = pointOn(fl, fl.s), tail = pointOn(fl, Math.max(0, fl.s - 46));
          const dx = head.x - tail.x, dy = head.y - tail.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
          g.lineStyle(10, CAL.lavaLit, 0.18); g.lineBetween(pointOn(fl, Math.max(0, fl.s - 120)).x, pointOn(fl, Math.max(0, fl.s - 120)).y, head.x, head.y);
          g.fillStyle(CAL.obsidian, 1);
          g.fillTriangle(head.x, head.y, tail.x + nx * 7, tail.y + ny * 7, tail.x - nx * 5, tail.y - ny * 5);
          g.lineStyle(1.5, 0xeee6ff, 0.9); g.lineBetween(head.x, head.y, tail.x + nx * 7, tail.y + ny * 7);
        }
      },

      drawHud(g) {
        // Isk's core, top-centre: whole, or the two halves after the split.
        const x = W / 2, y = top + 22;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 30, y - 16, 60, 32, 6);
        if (!split) {
          g.fillStyle(CAL.obsidianLit, 1); g.fillEllipse(x, y, 30, 24);
          g.lineStyle(1, CAL.glassGleam, 0.8); g.strokeEllipse(x, y, 30, 24);
        } else {
          for (const s of [-1, 1]) {
            g.fillStyle(CAL.obsidianLit, 1); g.fillEllipse(x + s * 11, y, 18, 20);
            g.lineStyle(1, 0xffa040, 0.9); g.strokeEllipse(x + s * 11, y, 18, 20);
          }
        }
      },

      destroy() { for (const c of cores) c.t.remove(); cores.length = 0; flakes.length = 0; chips.length = 0; },
    };
  },
};
