import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { Clock, P, PCOL, drawPuff, drawSpark } from '../util';
import { dim, lit } from '../../../../../art/IsleArt';

/**
 * CANNON RIDGE — Gunnery-Sergeant Hask.
 *
 * The floor is ruled into five firing rows, each with a cannon at one end (they alternate walls).
 * A cannon watches its row: anyone who loiters in it long enough gets the gun laid on them — the
 * crew lights the touch-hole, the whole row glows and chevrons crawl toward the far wall, and a
 * second and a half later the ball goes down the row and smashes whoever is *still* in it.
 *
 * The gun commits to the row, not the person. Hask hunts you — so stand in a row long enough to
 * draw the gun, let her close in after you, and step out a row as the fuse runs down. She is not
 * stupid: sometimes she sees it coming and sidesteps. Read her, not the gun.
 */

interface Row {
  idx: number;
  cy: number;
  /** -1: gun on the left wall firing right. +1: on the right firing left. */
  side: -1 | 1;
  /** Seconds each side has loitered here. */
  dwellP: number;
  dwellN: number;
  state: 'idle' | 'laying' | 'cool';
  /** When the fuse finishes (laying) / the gun is ready again (cool). */
  until: number;
  layStarted: number;
  /** Whether Hask noticed this particular gun being laid. */
  noticed: boolean;
  recoilAt: number;
}

interface Ball { row: Row; x: number; dir: number; hitP: boolean; hitN: boolean; born: number }
interface Furrow { row: Row; at: number; seed: number }

const FUSE_MS = 1500;
const BALL_SPEED = 880;
const COOL_MS = 2300;

export const CANNON_RIDGE: GimmickDef = {
  id: 'powder-cannons',
  rules: 'Linger in a row and its wall cannon is laid on that row. It fires down the row, not at you — step out and leave Hask in it.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const rowH = (H - top) / 5;
    const rows: Row[] = [];
    for (let i = 0; i < 5; i++) {
      rows.push({
        idx: i, cy: top + rowH * (i + 0.5), side: i % 2 === 0 ? -1 : 1,
        dwellP: 0, dwellN: 0, state: 'idle', until: 0, layStarted: 0, noticed: false, recoilAt: -9999,
      });
    }
    const balls: Ball[] = [];
    const furrows: Furrow[] = [];
    const dwellNeed = ctx.hard ? 0.75 : 0.95;
    const damage = ctx.hard ? 28 : 24;
    const noticeChance = ctx.hard ? 0.7 : 0.5;

    const rowOf = (y: number): Row => rows[Math.max(0, Math.min(4, Math.floor((y - top) / rowH)))];
    const inRow = (f: Fighter, r: Row): boolean => Math.abs(f.y - r.cy) < rowH / 2 - 4;
    const gunX = (r: Row): number => (r.side < 0 ? 26 : W - 26);

    const fire = (r: Row, now: number): void => {
      r.state = 'cool';
      r.until = now + COOL_MS;
      r.recoilAt = now;
      balls.push({ row: r, x: gunX(r) - r.side * 30, dir: -r.side, hitP: false, hitN: false, born: now });
      furrows.push({ row: r, at: now, seed: rng() * 100 });
      if (furrows.length > 8) furrows.shift();
      ctx.sfx('explosion-large');
      ctx.flash(gunX(r) - r.side * 40, r.cy, P.spark);
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        if (dt === 0) return;
        const p = ctx.player, n = ctx.npc;
        for (const r of rows) {
          r.dwellP = inRow(p, r) ? r.dwellP + dt : Math.max(0, r.dwellP - dt * 2);
          r.dwellN = inRow(n, r) ? r.dwellN + dt : Math.max(0, r.dwellN - dt * 2);
          if (r.state === 'cool' && time >= r.until) r.state = 'idle';
          if (r.state === 'idle' && Math.max(r.dwellP, r.dwellN) >= dwellNeed) {
            r.state = 'laying';
            r.layStarted = time;
            r.until = time + FUSE_MS;
            r.noticed = rng() < noticeChance;
            ctx.sfx('reload');
            ctx.float(gunX(r) - r.side * 60, r.cy - 22, 'GUN LAID', PCOL.red);
          }
          if (r.state === 'laying' && time >= r.until) fire(r, time);
        }
        for (const b of balls) {
          b.x += b.dir * BALL_SPEED * dt;
          for (const [f, key] of [[p, 'hitP'], [n, 'hitN']] as const) {
            if (b[key] || !f.active || f.hp <= 0) continue;
            if (inRow(f, b.row) && Math.abs(f.x - b.x) < 30) {
              b[key] = true;
              ctx.hit(f, damage, f.x, f.y);
              ctx.nudge(f, b.dir * 60, 0);
              ctx.sfx('hit-heavy');
              if (f === n) ctx.float(n.x, n.y - 44, 'DIRECT HIT', PCOL.spark);
            }
          }
        }
        for (let i = balls.length - 1; i >= 0; i--) if (balls[i].x < -40 || balls[i].x > W + 40) balls.splice(i, 1);
      },

      npcSeek(): Pt | null {
        const n = ctx.npc;
        const mine = rowOf(n.y);
        if (mine.state !== 'laying' || !mine.noticed) return null;
        // Duck into the nearest row whose gun is not about to speak.
        let best: Row | null = null;
        for (const r of rows) {
          if (r === mine || r.state === 'laying') continue;
          if (!best || Math.abs(r.cy - n.y) < Math.abs(best.cy - n.y)) best = r;
        }
        return best ? { x: n.x, y: best.cy } : null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // Row dividers: rope lines pegged to the floor, numbered at the gun end.
        for (const r of rows) {
          const y0 = r.cy - rowH / 2;
          if (r.idx > 0) {
            g.lineStyle(2, P.sandbag, 0.35); g.lineBetween(40, y0, W - 40, y0);
            for (let x = 60; x < W - 40; x += 80) { g.fillStyle(P.oakDark, 0.6); g.fillRect(x - 2, y0 - 3, 4, 6); }
          }
          if (r.state === 'laying') {
            const k = (time - r.layStarted) / FUSE_MS;
            const pulse = 0.5 + Math.sin(time / (90 - k * 50)) * 0.5;
            g.fillStyle(P.flame, 0.06 + k * 0.14 + pulse * 0.05);
            g.fillRect(0, r.cy - rowH / 2 + 2, W, rowH - 4);
            // Chevrons crawling from the gun toward the far wall.
            const dir = -r.side;
            for (let i = 0; i < 9; i++) {
              const ph = ((time / 6 + i * 110) % 990) / 990;
              const x = r.side < 0 ? 60 + ph * (W - 120) : W - 60 - ph * (W - 120);
              g.lineStyle(3, P.flame, 0.25 + k * 0.5);
              g.lineBetween(x - dir * 10, r.cy - 12, x, r.cy);
              g.lineBetween(x - dir * 10, r.cy + 12, x, r.cy);
            }
          }
        }
        // Furrows ploughed by past shots.
        for (const f of furrows) {
          const a = 1 - (time - f.at) / 7000;
          if (a <= 0) continue;
          g.lineStyle(9, 0x1a120c, 0.35 * a); g.lineBetween(30, f.row.cy + 6, W - 30, f.row.cy + 6);
          g.lineStyle(3, 0x0a0604, 0.45 * a); g.lineBetween(30, f.row.cy + 6, W - 30, f.row.cy + 6);
          for (let i = 0; i < 12; i++) {
            const x = 60 + ((f.seed * 37 + i * 79) % (W - 120));
            g.fillStyle(P.earthDark, 0.5 * a); g.fillCircle(x, f.row.cy + 6 + ((i % 3) - 1) * 7, 2 + (i % 2));
          }
        }
        // The guns, on the wall embrasures.
        for (const r of rows) {
          const gx = gunX(r);
          const recoil = Math.max(0, 1 - (time - r.recoilAt) / 400);
          const bx = gx + r.side * recoil * 14;
          const muzzleDir = -r.side;
          // Embrasure (a notch of sandbags in the wall).
          for (let i = -2; i <= 2; i++) {
            if (Math.abs(i) < 1) continue;
            g.fillStyle(dim(P.sandbag, 0.35), 1); g.fillEllipse(gx + r.side * 6, r.cy + i * 14, 26, 14);
            g.fillStyle(P.sandbag, 1); g.fillEllipse(gx + r.side * 6, r.cy + i * 14 - 2, 24, 11);
          }
          // Carriage: two cheeks and a wheel.
          g.fillStyle(P.oakDark, 1); g.fillRect(bx - 14, r.cy - 12, 28, 24);
          g.fillStyle(P.oak, 1); g.fillRect(bx - 12, r.cy - 10, 24, 20);
          g.fillStyle(P.iron, 1); g.fillCircle(bx, r.cy + 12, 7);
          g.fillStyle(P.ironLit, 1); g.fillCircle(bx, r.cy + 12, 2.5);
          // Barrel: a tapered iron tube with reinforcing rings and a lit muzzle edge.
          const len = 44;
          const mx = bx + muzzleDir * len;
          g.lineStyle(17, dim(P.iron, 0.4), 1); g.lineBetween(bx - muzzleDir * 10, r.cy, mx, r.cy);
          g.lineStyle(13, P.iron, 1); g.lineBetween(bx - muzzleDir * 10, r.cy, mx, r.cy);
          g.lineStyle(3, P.ironLit, 0.8); g.lineBetween(bx - muzzleDir * 8, r.cy - 4, mx, r.cy - 4);
          for (const t of [0.15, 0.55, 0.95]) {
            g.fillStyle(dim(P.iron, 0.5), 1); g.fillRect(bx + muzzleDir * len * t - 2, r.cy - 8, 4, 16);
          }
          g.fillStyle(0x000000, 1); g.fillCircle(mx, r.cy, 4.5);
          // Cascabel knob at the breech.
          g.fillStyle(P.iron, 1); g.fillCircle(bx - muzzleDir * 13, r.cy, 5);
          // Row number in chalk.
          g.fillStyle(P.saltpetre, 0.5);
          for (let k = 0; k <= r.idx; k++) g.fillRect(gx + r.side * 2 - 6 + k * 4 * -r.side, r.cy - 30, 2, 8);
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        for (const r of rows) {
          const gx = gunX(r);
          if (r.state === 'laying') {
            const k = (time - r.layStarted) / FUSE_MS;
            // The linstock spark sitting on the touch-hole, growing hotter.
            drawSpark(g, gx + r.side * 4, r.cy - 10, time, 0.8 + k * 0.6);
            g.lineStyle(2, P.flame, 0.7);
            g.beginPath(); g.arc(gx, r.cy - 10, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k), false); g.strokePath();
          }
          const since = time - r.recoilAt;
          if (since < 900) {
            // Muzzle blast and a rolling bank of gunsmoke off the barrel.
            const mx = gx - r.side * 74;
            const a = 1 - since / 900;
            if (since < 120) {
              g.fillStyle(P.sparkHot, 0.9); g.fillCircle(mx, r.cy, 22);
              g.fillStyle(P.flame, 0.7); g.fillTriangle(mx, r.cy - 18, mx, r.cy + 18, mx - r.side * 60, r.cy);
            }
            drawPuff(g, mx - r.side * since * 0.06, r.cy - since * 0.02, 20 + since * 0.04, P.smoke, 0.45 * a, r.idx + 3);
          }
        }
        for (const b of balls) {
          // Ball with a smoke-and-air streak behind it.
          g.lineStyle(10, P.smoke, 0.25); g.lineBetween(b.x, b.row.cy, b.x - b.dir * 90, b.row.cy);
          g.lineStyle(4, lit(P.smoke, 0.2), 0.4); g.lineBetween(b.x, b.row.cy, b.x - b.dir * 50, b.row.cy);
          g.fillStyle(0x000000, 0.3); g.fillEllipse(b.x, b.row.cy + 14, 20, 7);
          g.fillStyle(P.powder, 1); g.fillCircle(b.x, b.row.cy, 9);
          g.fillStyle(P.ironLit, 0.8); g.fillCircle(b.x - 3, b.row.cy - 3, 3);
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics) {
        // Priming pips beside each gun: how close the row is to drawing fire.
        for (const r of rows) {
          if (r.state !== 'idle') continue;
          const v = Math.min(1, Math.max(r.dwellP, r.dwellN) / dwellNeed);
          if (v <= 0.02) continue;
          const x = r.side < 0 ? 62 : W - 70;
          g.fillStyle(0x000000, 0.45); g.fillRect(x, r.cy + 24, 10, 26);
          g.fillStyle(v > 0.7 ? P.flame : P.spark, 0.9); g.fillRect(x + 2, r.cy + 48 - 22 * v, 6, 22 * v);
        }
      },
    };
  },
};
