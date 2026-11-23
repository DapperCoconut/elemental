import type { SignatureMove } from '../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../boss/framework/BossToolkit';
import { OBS, crackPath, seam } from '../../../art/PinnacleArt';
import { mulberry } from '../../../art/IsleArt';
import { EMBER, EMBER_HOT } from './fallenArt';
import {
  FS, PLAYER_R, type Pt, at, clampN, dist, fieldX, fieldY, place, rayEnd, release, segDist, shake, smooth, strike,
} from './fallenState';

/**
 * Act IV — the Fallen King's own moves: not laws, just him. A judge with no court left still has
 * a gavel and still asks questions.
 *
 *  THE GAVEL (`p4-gavel`)               — he leaps onto where you stand (the ring shows where he
 *                                         lands) and brings the gavel down, scattering cinders; then
 *                                         again. After the second he is bent over it — open.
 *  CROSS-EXAMINATION (`p4-cross`)        — three questions, three dashes straight through where you
 *                                         are, each one's line drawn on the floor before he goes;
 *                                         the last one carries him past you — open.
 */

// ── THE GAVEL ────────────────────────────────────────────────────────

/** One leap: from where he stood to where you stood, the gavel coming down at the end. */
interface Leap { fx: number; fy: number; tx: number; ty: number; from: number; landAt: number; landed: boolean }

export const theGavel = (tk: BossToolkit): SignatureMove => {
  const R = 96;
  let on = false, endAt = 0, count = 0;
  let leap: Leap | null = null;
  let marks: { x: number; y: number; at: number; seed: number }[] = [];

  const jump = (time: number): void => {
    const o = at(tk), p = tk.player;
    leap = { fx: o.x, fy: o.y, tx: fieldX(p.x), ty: fieldY(p.y), from: time, landAt: time + tk.warn(900), landed: false };
    FS.drive = true; FS.pose = 'gavel';
    count++;
    tk.sfx('wings');
  };

  return {
    durationMs: 4600,
    windupMs: 450,
    gesture: 'raise',
    locksBody: true,
    tell: 'THE GAVEL',
    cast(time) {
      on = true; count = 0; marks = [];
      jump(time);
      endAt = time + 4400;
    },
    update(time) {
      if (!on) return;
      const p = tk.player;
      if (leap && !leap.landed) {
        const k = clampN((time - leap.from) / (leap.landAt - leap.from), 0, 1);
        const e = smooth(k);
        FS.air = Math.sin(k * Math.PI);
        place(tk, leap.fx + (leap.tx - leap.fx) * e, leap.fy + (leap.ty - leap.fy) * e);
        if (k >= 1) {
          leap.landed = true; FS.air = 0;
          tk.sfx('hammer-forge'); tk.sfx('stone-slam'); shake(tk, 300, 0.009);
          if (dist(p.x, p.y, leap.tx, leap.ty) < R + PLAYER_R - 8) strike(tk, 14);
          marks.push({ x: leap.tx, y: leap.ty, at: time, seed: Math.floor(time) });
          // Cinders off the strike, in a ring.
          const base = Math.random() * Math.PI * 2;
          for (let i = 0; i < 8; i++) tk.spawnBullet({ x: leap.tx, y: leap.ty, angle: base + (i / 8) * Math.PI * 2, speed: 200, damage: 6, r: 6, color: EMBER, lifeMs: 3000 });
          if (count < 2) tk.schedule(380, () => { if (on) jump(tk.now); });
          else { FS.pose = 'struck'; FS.openUntil = time + 1500; tk.schedule(1500, () => { if (on) release(); }); }
        }
      }
      marks = marks.filter((m) => time - m.at < 1400);
      if (time > endAt) { on = false; leap = null; release(); }
    },
    drawGround(g, time) {
      if (!on) return;
      for (const m of marks) {
        // The struck glass: a star of cracks, the ember fading out of it.
        const f = 1 - clampN((time - m.at) / 1400, 0, 1);
        const rng = mulberry(m.seed);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + rng() * 0.5;
          seam(g, crackPath({ x: m.x, y: m.y }, { x: m.x + Math.cos(a) * R * (0.7 + rng() * 0.4), y: m.y + Math.sin(a) * R * 0.8 }, rng, 8, 4), 1, f, f, EMBER);
        }
        const since = time - m.at;
        if (since < 350) { g.lineStyle(6 * (1 - since / 350) + 1, EMBER_HOT, 0.8 * (1 - since / 350)); g.strokeCircle(m.x, m.y, R * (1 + since / 700)); }
      }
      if (leap && !leap.landed) {
        const k = clampN((time - leap.from) / (leap.landAt - leap.from), 0, 1);
        const blink = k > 0.78 && Math.floor(time / 80) % 2 === 0;
        g.fillStyle(EMBER, 0.06 + 0.12 * k); g.fillCircle(leap.tx, leap.ty, R);
        g.fillStyle(EMBER, 0.12); g.fillCircle(leap.tx, leap.ty, R * k);
        g.lineStyle(blink ? 3 : 2, blink ? 0xffffff : EMBER_HOT, 0.6 + 0.3 * k); g.strokeCircle(leap.tx, leap.ty, R);
        // The gavel's mark, a bar across the ring.
        g.fillStyle(OBS.glass, 0.4 + 0.4 * k); g.fillRect(leap.tx - 16, leap.ty - 5, 32, 10);
        g.lineStyle(1, OBS.edge, 0.6); g.strokeRect(leap.tx - 16, leap.ty - 5, 32, 10);
      }
    },
    takenMult() { return on && FS.air > 0.3 ? 0.3 : 1; },
    onPhaseEnd() { on = false; leap = null; marks = []; release(); },
  };
};

// ── CROSS-EXAMINATION ────────────────────────────────────────────────

/** One question: a line from where he stands through where you stand, and then him along it. */
interface Question { a: Pt; b: Pt; from: number; goAt: number; doneAt: number; gone: boolean; done: boolean }

export const crossExamination = (tk: BossToolkit): SignatureMove => {
  const HALF = 24, DASH_MS = 170;
  let on = false, endAt = 0, asked = 0;
  let q: Question | null = null;
  let past: Question[] = [];

  const ask = (time: number): void => {
    const o = at(tk), p = tk.player;
    const ang = Math.atan2(p.y - o.y, p.x - o.x);
    const want = Math.min(dist(o.x, o.y, p.x, p.y) + 150, 440);
    const edge = rayEnd(o, ang, want);
    const b = { x: fieldX(edge.x), y: fieldY(edge.y) };
    const goAt = time + tk.warn(asked === 0 ? 750 : 620);
    q = { a: o, b, from: time, goAt, doneAt: goAt + DASH_MS, gone: false, done: false };
    asked++;
    FS.drive = true; FS.pose = 'cite'; FS.citeAt = time; FS.face = ang;
    tk.sfx('clock-tick');
  };

  return {
    durationMs: 3900,
    windupMs: 400,
    gesture: 'point',
    locksBody: true,
    tell: 'CROSS-EXAMINATION',
    cast(time) {
      on = true; asked = 0; past = [];
      ask(time);
      endAt = time + 3800;
    },
    update(time) {
      if (!on) return;
      const p = tk.player;
      if (q && !q.done) {
        if (time >= q.goAt) {
          if (!q.gone) {
            q.gone = true;
            FS.pose = 'dash';
            tk.sfx('dash'); tk.sfx('slash');
            if (segDist(p.x, p.y, q.a.x, q.a.y, q.b.x, q.b.y) < HALF + PLAYER_R) strike(tk, 11);
          }
          const k = clampN((time - q.goAt) / DASH_MS, 0, 1);
          place(tk, q.a.x + (q.b.x - q.a.x) * k, q.a.y + (q.b.y - q.a.y) * k);
          FS.trail.push({ x: FS.x, y: FS.y, at: time, face: FS.face });
          if (k >= 1) {
            q.done = true; past.push(q);
            if (asked < 3) tk.schedule(140, () => { if (on) ask(tk.now); });
            else { FS.pose = 'struck'; FS.openUntil = time + 900; tk.schedule(900, () => { if (on) release(); }); }
          }
        }
      }
      past = past.filter((x) => time - x.doneAt < 600);
      if (time > endAt) { on = false; q = null; release(); }
    },
    drawGround(g, time) {
      if (!on) return;
      const lane = (x: Question, alpha: number, fill: number): void => {
        const ang = Math.atan2(x.b.y - x.a.y, x.b.x - x.a.x), px = -Math.sin(ang) * HALF, py = Math.cos(ang) * HALF;
        const quad = [{ x: x.a.x + px, y: x.a.y + py }, { x: x.b.x + px, y: x.b.y + py }, { x: x.b.x - px, y: x.b.y - py }, { x: x.a.x - px, y: x.a.y - py }];
        g.fillStyle(EMBER, 0.08 * alpha); g.fillPoints(quad, true);
        g.lineStyle(2, EMBER_HOT, 0.6 * alpha); g.strokePoints(quad, true);
        const fx = x.a.x + (x.b.x - x.a.x) * fill, fy = x.a.y + (x.b.y - x.a.y) * fill;
        seam(g, [x.a, { x: fx, y: fy }], 1, alpha, fill, EMBER);
        // A question mark's hook at the far end: where he will stop.
        g.lineStyle(3, EMBER_HOT, 0.8 * alpha); g.beginPath(); g.arc(x.b.x, x.b.y - 8, 8, Math.PI, Math.PI * 2.4, false); g.strokePath();
        g.fillStyle(EMBER_HOT, 0.8 * alpha); g.fillCircle(x.b.x + 1, x.b.y + 8, 2.5);
      };
      if (q && !q.gone) {
        const k = clampN((time - q.from) / Math.max(1, q.goAt - q.from), 0, 1);
        lane(q, 0.5 + 0.5 * k, k);
      }
      for (const x of past) {
        // The scorch the dash leaves in the glass.
        const f = 1 - clampN((time - x.doneAt) / 600, 0, 1);
        seam(g, [x.a, x.b], 1.6, f, f, EMBER);
      }
    },
    onPhaseEnd() { on = false; q = null; past = []; release(); },
  };
};
