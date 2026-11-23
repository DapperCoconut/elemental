import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { pendulumBob } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, IRON_DARK, IRON_LIT } from '../palette';
import { alive, clamp, dist, otherOf, stepDt, wrapAngle } from '../util';

/**
 * Pendulum — Swinger Bob.
 *
 * Three great pendulums hang from gantries beyond the edges of the floor — two from the north
 * beam, one from the south — each on its own beat, and the arc each one sweeps is grooved into
 * the floor in brass so you can read where it reaches. Their reach breathes: over twenty seconds
 * the swing widens and narrows again, and the groove lights up as far as it goes now.
 *
 * Meet a bob while it is moving fast and it *launches* you along its swing — hurt, dazed, and
 * flying. A launched fighter is a missile: fly into the other fighter and you hit them too and
 * throw them on in the same direction; slam into a wall at speed and it hurts again. Bob is
 * a gravity-man and knows all this, so he keeps the bobs between himself and you. The clever
 * play is to stand him in a groove, or to take a bob on purpose with him in line.
 */

const BOB_R = 24;
const LAUNCH_MIN_V = 150;
const FLY_MS = 560;
const LAUNCH_DMG = 8;
const RAM_DMG = 12;
const WALL_DMG = 4;
const AGAIN_MS = 1100;

interface Pend {
  px: number; py: number; len: number;
  /** +1 hangs down into the room from the north beam, −1 up from the south. */
  dir: number;
  period: number; phase: number; ampBase: number;
  a: number; bx: number; by: number; vx: number; vy: number;
}

interface Flight { vx: number; vy: number; at: number; until: number; rammed: boolean; walled: boolean; trail: Pt[] }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const speedUp = ctx.hard ? 0.86 : 1;
  const pends: Pend[] = [
    { px: W * 0.24, py: top - 40, len: 330, dir: 1, period: 2.7 * speedUp, phase: 0, ampBase: 0.72, a: 0, bx: 0, by: 0, vx: 0, vy: 0 },
    { px: W * 0.5, py: H + 60, len: 330, dir: -1, period: 3.3 * speedUp, phase: 1.7, ampBase: 0.7, a: 0, bx: 0, by: 0, vx: 0, vy: 0 },
    { px: W * 0.77, py: top - 40, len: 400, dir: 1, period: 3.0 * speedUp, phase: 3.1, ampBase: 0.66, a: 0, bx: 0, by: 0, vx: 0, vy: 0 },
  ];
  const flights = new Map<Fighter, Flight>();
  const lastHit = new Map<Fighter, number>();
  const sparks: { x: number; y: number; at: number; c: number }[] = [];
  let t0 = -1;
  let lastTickSide = 0;

  /** The swing's current reach (radians), breathing over twenty seconds. */
  const amp = (p: Pend, s: number) => p.ampBase * (0.78 + 0.32 * Math.sin(s * 0.31 + p.phase));
  const place = (p: Pend, s: number) => {
    const w = (Math.PI * 2) / p.period;
    const A = amp(p, s);
    const a = A * Math.sin(w * s + p.phase);
    const av = A * w * Math.cos(w * s + p.phase);
    p.a = a;
    p.bx = p.px + Math.sin(a) * p.len;
    p.by = p.py + Math.cos(a) * p.len * p.dir;
    p.vx = Math.cos(a) * av * p.len;
    p.vy = -Math.sin(a) * av * p.len * p.dir;
  };
  /** True if a point lies on a pendulum's swept band right now (the groove's lit part, widened). */
  const onBand = (p: Pend, x: number, y: number, s: number, pad = 34) => {
    const d = dist(p.px, p.py, x, y);
    if (Math.abs(d - p.len) > BOB_R + pad) return false;
    const a = Math.atan2(x - p.px, (y - p.py) * p.dir);
    return Math.abs(wrapAngle(a)) < amp(p, s) + 0.08;
  };

  function launch(f: Fighter, vx: number, vy: number, time: number, dmg: number, from: Pt): void {
    const fl: Flight = { vx, vy, at: time, until: time + FLY_MS, rammed: false, walled: false, trail: [] };
    flights.set(f, fl);
    lastHit.set(f, time);
    ctx.hit(f, dmg, f.x, f.y);
    ctx.stun(f, 340);
    ctx.flash(from.x, from.y, BRASS_LIT);
    sparks.push({ x: from.x, y: from.y, at: time, c: BRASS_LIT });
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (t0 < 0) { t0 = time; ctx.banner('MIND THE PENDULUMS', '#f0d58a'); }
      const s = (time - t0) / 1000;
      for (const p of pends) place(p, s);
      // A tick each time the long south bob passes the bottom of its swing.
      const side = Math.sign(pends[1].a);
      if (side !== lastTickSide && side !== 0) { lastTickSide = side; ctx.sfx('clock-tick'); }

      // Bobs meet fighters.
      for (const f of [player, npc]) {
        if (!alive(f) || flights.has(f)) continue;
        if (time - (lastHit.get(f) ?? -9999) < AGAIN_MS) continue;
        for (const p of pends) {
          if (dist(p.bx, p.by, f.x, f.y) > BOB_R + 22) continue;
          const v = Math.hypot(p.vx, p.vy);
          if (v < LAUNCH_MIN_V) {
            // Nearly still at the top of its swing: it only shoulders you aside.
            const a = Math.atan2(f.y - p.by, f.x - p.bx);
            ctx.nudge(f, Math.cos(a) * 14, Math.sin(a) * 14);
            continue;
          }
          const k = (ctx.hard ? 640 : 580) / v;
          launch(f, p.vx * k, p.vy * k, time, LAUNCH_DMG, { x: p.bx, y: p.by });
          ctx.float(f.x, f.y - 46, 'LAUNCHED', '#f0d58a');
          ctx.sfx('gravity-slam');
          break;
        }
      }

      // Flights: carried along, decaying; ram the other fighter; slam the wall.
      for (const [f, fl] of flights) {
        if (!alive(f) || time >= fl.until) { flights.delete(f); continue; }
        const k = 1 - (time - fl.at) / FLY_MS;
        const bx = f.x, by = f.y;
        const mx = fl.vx * k * dt, my = fl.vy * k * dt;
        ctx.nudge(f, mx, my);
        fl.trail.push({ x: f.x, y: f.y });
        if (fl.trail.length > 10) fl.trail.shift();
        const speed = Math.hypot(fl.vx, fl.vy) * k;
        if (!fl.walled && speed > 260 && (Math.abs(f.x - bx - mx) > 2 || Math.abs(f.y - by - my) > 2)) {
          fl.walled = true;
          ctx.hit(f, WALL_DMG, f.x, f.y);
          ctx.float(f.x, f.y - 40, 'THUD', '#c8c0b0');
          ctx.sfx('stone-slam');
          fl.until = Math.min(fl.until, time + 80);
        }
        const o = otherOf(f, player, npc);
        if (!fl.rammed && alive(o) && dist(f.x, f.y, o.x, o.y) < 46) {
          fl.rammed = true;
          ctx.sfx('hit-heavy');
          ctx.float(o.x, o.y - 50, 'CLANG!', '#ffe2a8');
          if (!flights.has(o)) launch(o, fl.vx * 0.62, fl.vy * 0.62, time, RAM_DMG, { x: (f.x + o.x) / 2, y: (f.y + o.y) / 2 });
          else ctx.hit(o, RAM_DMG, o.x, o.y);
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) if (time - sparks[i].at > 500) sparks.splice(i, 1);
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const s = (ctx.scene.time.now - t0) / 1000;
      let best: Pt | null = null, bs = -Infinity;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const x = clamp(player.x + Math.cos(a) * 190, 60, W - 60), y = clamp(player.y + Math.sin(a) * 170, top + 50, H - 50);
        let score = -dist(x, y, npc.x, npc.y) * 0.3;
        for (const p of pends) {
          if (onBand(p, x, y, s, 50)) score -= 400;
          // Out of line of any bob that could fling the player at it.
          if (onBand(p, player.x, player.y, s)) {
            const v = Math.hypot(p.vx, p.vy) || 1;
            const ax = p.vx / v, ay = p.vy / v;
            const along = (x - player.x) * ax + (y - player.y) * ay;
            const off = Math.abs((x - player.x) * ay - (y - player.y) * ax);
            if (Math.abs(along) > 20 && off < 60) score -= 250;
            else score += 80;
          }
        }
        if (score > bs) { bs = score; best = { x, y }; }
      }
      return best;
    },

    drawGround(g) {
      const s = (ctx.scene.time.now - Math.max(0, t0)) / 1000;
      for (const p of pends) {
        const A = amp(p, s), full = p.ampBase * 1.1;
        // The full groove, dark; the reach it has now, lit brass.
        for (const [a0, a1, w, c, al] of [[-full, full, 14, IRON_DARK, 0.5], [-A, A, 4, BRASS, 0.55]] as [number, number, number, number, number][]) {
          g.lineStyle(w, c, al);
          g.beginPath();
          for (let k = 0; k <= 30; k++) {
            const a = a0 + (a1 - a0) * (k / 30);
            const x = p.px + Math.sin(a) * p.len, y = p.py + Math.cos(a) * p.len * p.dir;
            if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
          }
          g.strokePath();
        }
        // The ends of the reach, ticked.
        for (const e of [-A, A]) {
          const x = p.px + Math.sin(e) * p.len, y = p.py + Math.cos(e) * p.len * p.dir;
          g.fillStyle(BRASS_LIT, 0.8); g.fillCircle(x, y, 4);
        }
        // The bob's shadow on the floor, stretched along its swing.
        const v = Math.hypot(p.vx, p.vy);
        g.fillStyle(0x000000, 0.22);
        g.fillEllipse(p.bx + 6, p.by + 10, BOB_R * 2 + v * 0.03, BOB_R * 0.9);
        // A danger glow on the groove ahead of the bob while it is fast.
        if (v > LAUNCH_MIN_V) {
          const ux = p.vx / v, uy = p.vy / v;
          g.fillStyle(0xff6a3a, 0.12); g.fillCircle(p.bx + ux * 30, p.by + uy * 30, BOB_R + 8);
        }
      }
    },

    drawAir(g, time) {
      for (const p of pends) {
        // The rod from the gantry beyond the edge.
        g.lineStyle(6, IRON_DARK, 0.9); g.lineBetween(p.px, clamp(p.py, top - 4, H + 4), p.bx, p.by);
        g.lineStyle(2, IRON_LIT, 0.6); g.lineBetween(p.px - 1, clamp(p.py, top - 4, H + 4), p.bx - 1, p.by);
        // A motion ghost behind a fast bob.
        const v = Math.hypot(p.vx, p.vy);
        if (v > LAUNCH_MIN_V) {
          for (let k = 1; k <= 3; k++) {
            g.fillStyle(BRASS, 0.14 / k);
            g.fillCircle(p.bx - (p.vx / v) * k * 16, p.by - (p.vy / v) * k * 16, BOB_R);
          }
        }
        pendulumBob(g, p.bx, p.by, BOB_R, clamp(v / 500, 0, 1));
      }
      // The gantry beams' stubs at the edges, with their hanging gears.
      for (const p of pends) {
        const y = p.dir > 0 ? top + 4 : H - 6;
        g.fillStyle(IRON_DARK, 1); g.fillRect(p.px - 30, y - 5, 60, 10);
        g.fillStyle(BRASS_DARK, 1); g.fillCircle(p.px, y, 8);
        g.fillStyle(BRASS, 1); g.fillCircle(p.px, y, 5);
      }
      // Streaks behind anyone in flight.
      for (const [, fl] of flights) {
        for (let i = 1; i < fl.trail.length; i++) {
          const a = fl.trail[i - 1], b = fl.trail[i];
          g.lineStyle(10 * (i / fl.trail.length), lit(BRASS, 0.3), 0.35 * (i / fl.trail.length)); g.lineBetween(a.x, a.y, b.x, b.y);
        }
      }
      for (const sp of sparks) {
        const k = (time - sp.at) / 500;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.fillStyle(sp.c, 1 - k); g.fillCircle(sp.x + Math.cos(a) * k * 36, sp.y + Math.sin(a) * k * 36, 2.5 * (1 - k));
        }
        g.lineStyle(3 * (1 - k), dim(BRASS_LIT, 0.1), 1 - k); g.strokeCircle(sp.x, sp.y, 10 + k * 30);
      }
    },
  };
}

export const PENDULUM: GimmickDef = {
  id: 'clockwork-pendulum',
  rules: 'Three pendulums swing across the floor along brass grooves. A fast bob launches you; fly into your foe to hit them too, or slam the wall.',
  make,
};
