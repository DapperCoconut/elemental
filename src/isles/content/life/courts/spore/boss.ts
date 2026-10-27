import Phaser from 'phaser';
import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mulberry } from '../../../../art/IsleArt';
import type { Pt } from '../../../../IslesTypes';
import {
  CAP_RED, CAP_VIOLET, CAP_VIOLET_LIT, GILL, GLOW, GLOW_DEEP, GLOW_WASH, MOSS, MOSS_DARK, PEAT, PEAT_DARK, PEAT_LIT,
  ROT, ROT_LIT, SPORE, SPORE_DARK, SPOT, STEM, STEM_SHADE, WHITE,
} from './palette';
import { along, dist, distToSeg, glowcaps, hypha, hyphaPoints, polyline, puffball, sporeCloud, toadstool } from './sporeArt';

/**
 * Prince Mycel — the Ear Beneath the Floor, governor of the Spore Court.
 *
 * The Empress's second son, and the quietest. His threads run under every house in the bog, and
 * whatever is said on a doorstep travels them home to him; that is how he knows which household
 * will come up short at the weighing before the household does. He calls it tidiness. What falls
 * in the Spore Court is rotted back into the ground, and the ground is his.
 *
 * Phase one (*The Network*) he stands rooted while his hyphae race out across the floor and fruit
 * along their length, while he *listens* — move too much and the threads converge where you are —
 * and while rhizome caps sprout at the end of his threads and burst into spore. Phase two
 * (*Fruiting Body*) he rises into a towering mushroom and stalks the room: his cap gusts spore in a
 * cone, its gills rain down in radial strips, and sporelings waddle after you to pop at your feet.
 * Hard mode's third phase (*Mycorrhiza*) he sinks into the floor and becomes it: the mat erupts in
 * checks, knots of root snap shut round you, and he surfaces wherever he likes.
 */

/** The player's hit radius, as the toolkit reckons it. */
const PLAYER_R = 20;
const FIELD_TOP = 96;

// ── Signature: Hyphal Run ───────────────────────────────────────────
// Threads race out of him across the floor, wandering and forking, drawn
// faint as they grow. When a thread is laid, it fruits from root to tip: a
// spear of glowcaps bursts up every step along it, one after another.

const hyphalRun = (tk: BossToolkit): SignatureMove => {
  interface Run { pts: Pt[]; born: number; growMs: number; fruitAt: number; fired: number; step: number }
  let runs: Run[] = [];
  const blooms: { x: number; y: number; at: number }[] = [];
  const STEP = 58;
  const R = 34;
  const GROW_SPEED = 720;
  return {
    durationMs: 3000,
    windupMs: 800,
    hold: 'reach',
    tell: 'HYPHAL RUN',
    cast(time) {
      tk.sfx('stone-rise');
      const count = tk.hard ? 4 : 3;
      const base = tk.angleToPlayer();
      for (let i = 0; i < count; i++) {
        let a = base + (i - (count - 1) / 2) * 0.55;
        let x = tk.bossX, y = tk.bossY;
        const pts: Pt[] = [{ x, y }];
        const segs = 9;
        for (let s = 0; s < segs; s++) {
          a += (Math.random() - 0.5) * 0.6;
          x = tk.clampX(x + Math.cos(a) * STEP, 40); y = tk.clampY(y + Math.sin(a) * STEP, 40);
          pts.push({ x, y });
          // A fork halfway out: a short branch peeling off toward the player.
          if (s === 4) {
            const ba = a + (Math.random() < 0.5 ? 0.9 : -0.9);
            const bp: Pt[] = [{ x, y }];
            let bx = x, by = y;
            for (let k = 0; k < 4; k++) { bx = tk.clampX(bx + Math.cos(ba) * STEP, 40); by = tk.clampY(by + Math.sin(ba) * STEP, 40); bp.push({ x: bx, y: by }); }
            const growMs = ((STEP * 4) / GROW_SPEED) * 1000;
            const start = time + ((STEP * 5) / GROW_SPEED) * 1000;
            runs.push({ pts: bp, born: start, growMs, fruitAt: start + growMs + tk.warn(650), fired: 0, step: 1 });
          }
        }
        const growMs = ((STEP * segs) / GROW_SPEED) * 1000;
        runs.push({ pts, born: time, growMs, fruitAt: time + growMs + tk.warn(650), fired: 0, step: 1 });
      }
    },
    update(time) {
      const p = tk.player;
      for (const r of runs) {
        // Fruiting from root to tip, one spear every 70ms.
        while (r.fired < r.pts.length - 1 && time >= r.fruitAt + r.fired * 70) {
          r.fired++;
          const q = r.pts[r.fired];
          blooms.push({ x: q.x, y: q.y, at: time });
          if (Phaser.Math.Distance.Between(p.x, p.y, q.x, q.y) < R + PLAYER_R * 0.5) tk.hitPlayer(12, p.x, p.y);
          if (r.fired % 2 === 0) tk.sfx('thorn');
        }
      }
      runs = runs.filter((r) => r.fired < r.pts.length - 1 || time < r.fruitAt + r.pts.length * 70 + 300);
      while (blooms.length && time - blooms[0].at > 650) blooms.shift();
    },
    drawGround(g, time) {
      for (const r of runs) {
        if (time < r.born) continue;
        const k = Phaser.Math.Clamp((time - r.born) / r.growMs, 0, 1);
        const n = Math.max(1, Math.floor(k * (r.pts.length - 1)));
        const sub = r.pts.slice(0, n + 1);
        const warm = Phaser.Math.Clamp((time - (r.fruitAt - 650)) / 650, 0, 1);
        g.lineStyle(R * 1.4, GLOW, 0.05 + 0.1 * warm); polyline(g, sub);
        g.lineStyle(2.5, GLOW_DEEP, 0.9); polyline(g, sub);
        g.lineStyle(1.2, GLOW_WASH, 0.4 + 0.5 * warm); polyline(g, sub);
        // Where each spear will come up: knots along the line.
        for (let i = Math.max(1, r.fired + 1); i <= n; i++) {
          g.lineStyle(1.5, GLOW, 0.3 + 0.5 * warm); g.strokeCircle(r.pts[i].x, r.pts[i].y, R * (0.5 + 0.5 * warm));
        }
      }
    },
    drawAir(g, time) {
      for (const b of blooms) {
        const q = (time - b.at) / 650;
        const up = q < 0.25 ? q / 0.25 : 1 - (q - 0.25) / 0.75;
        // A spear of glowcaps thrown up out of the thread.
        glowcaps(g, b.x, b.y + 10, 6 + up * 7, up, Math.floor(b.x + b.y));
        g.fillStyle(GLOW_WASH, 0.5 * (1 - q)); g.fillEllipse(b.x, b.y + 8, R * 2 * (0.6 + q), R * 0.6 * (0.6 + q));
      }
    },
    onPhaseEnd() { runs = []; blooms.length = 0; },
  };
};

// ── Signature: The Ear Beneath ──────────────────────────────────────
// He listens. For a few seconds every step you take makes noise — three
// pips over your head fill as you walk. Fill them and he has heard you:
// threads converge from the edges of the room on the spot where you were,
// and it erupts. Stand still and he hears nothing.

const listen = (tk: BossToolkit): SignatureMove => {
  interface Ear { born: number; endAt: number; noise: number; lx: number; ly: number; heard: Pt | null; heardAt: number; burstAt: number; done: boolean }
  let ear: Ear | null = null;
  const PIP = 72;
  const R = 72;
  const LISTEN_MS = 2400;
  return {
    durationMs: 3600,
    windupMs: 700,
    hold: 'brace',
    tell: 'THE EAR BENEATH',
    cast(time) {
      tk.sfx('hush');
      const p = tk.player;
      ear = { born: time, endAt: time + LISTEN_MS, noise: 0, lx: p.x, ly: p.y, heard: null, heardAt: 0, burstAt: 0, done: false };
    },
    update(time) {
      if (!ear) return;
      const e = ear;
      const p = tk.player;
      if (!e.heard && time < e.endAt) {
        e.noise += Phaser.Math.Distance.Between(p.x, p.y, e.lx, e.ly);
        e.lx = p.x; e.ly = p.y;
        if (e.noise >= PIP * 3) {
          e.heard = { x: p.x, y: p.y };
          e.heardAt = time;
          e.burstAt = time + tk.warn(700);
          tk.sfx('heartbeat');
          tk.host.showFloatingText(p.x, p.y - 50, 'HEARD YOU', '#6effd2');
        }
      }
      if (!e.heard && time >= e.endAt && !e.done) {
        e.done = true;
        tk.host.showFloatingText(p.x, p.y - 50, '...silence', '#cfeaff');
      }
      if (e.heard && !e.done && time >= e.burstAt) {
        e.done = true;
        tk.sfx('quake');
        if (Phaser.Math.Distance.Between(p.x, p.y, e.heard.x, e.heard.y) < R + PLAYER_R * 0.4) tk.hitPlayer(18, p.x, p.y);
      }
      if (e.done && time > Math.max(e.endAt, e.burstAt) + 600) ear = null;
    },
    drawGround(g, time) {
      if (!ear) return;
      const e = ear;
      // The ear: rings of listening rippling out from him while the window is open.
      if (time < e.endAt && !e.heard) {
        for (let i = 0; i < 4; i++) {
          const ph = ((time - e.born) / 900 + i / 4) % 1;
          g.lineStyle(2, GLOW, 0.35 * (1 - ph)); g.strokeCircle(tk.bossX, tk.bossY, 60 + ph * 520);
        }
      }
      if (e.heard) {
        const k = Phaser.Math.Clamp((time - e.heardAt) / Math.max(1, e.burstAt - e.heardAt), 0, 1);
        const h = e.heard;
        // Threads closing in from the edges of the room.
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.3;
          const from = { x: h.x + Math.cos(a) * 520, y: h.y + Math.sin(a) * 420 };
          const tip = { x: from.x + (h.x - from.x) * Math.min(1, k * 1.1), y: from.y + (h.y - from.y) * Math.min(1, k * 1.1) };
          hypha(g, from, tip, 2, GLOW, 0.8, i * 11, 0.2);
        }
        if (!e.done) {
          g.lineStyle(3, GLOW_WASH, 0.4 + 0.5 * k); g.strokeCircle(h.x, h.y, R);
          g.fillStyle(GLOW, 0.08 + 0.18 * k); g.fillCircle(h.x, h.y, R * k);
        } else {
          const q = Phaser.Math.Clamp((time - e.burstAt) / 600, 0, 1);
          g.fillStyle(GLOW_WASH, 0.6 * (1 - q)); g.fillCircle(h.x, h.y, R * (0.8 + q * 0.4));
        }
      }
    },
    drawAir(g, time) {
      if (!ear) return;
      const e = ear;
      const p = tk.player;
      if (time < e.endAt && !e.heard) {
        // Three noise pips over your head, filling as you walk.
        for (let i = 0; i < 3; i++) {
          const fill = Phaser.Math.Clamp(e.noise / PIP - i, 0, 1);
          const x = p.x - 16 + i * 16, y = p.y - 52;
          g.fillStyle(0x000000, 0.6); g.fillCircle(x, y, 6);
          g.fillStyle(GLOW, 0.3 + 0.7 * fill); g.fillCircle(x, y, 5 * fill + 0.5);
        }
        // A thin bar for the time the ear stays open.
        const k = (time - e.born) / LISTEN_MS;
        g.fillStyle(GLOW_DEEP, 0.8); g.fillRect(p.x - 22, p.y - 42, 44 * (1 - k), 3);
      }
      if (e.heard && e.done) {
        const q = Phaser.Math.Clamp((time - e.burstAt) / 600, 0, 1);
        const up = q < 0.3 ? q / 0.3 : 1 - (q - 0.3) / 0.7;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          glowcaps(g, e.heard.x + Math.cos(a) * R * 0.55, e.heard.y + Math.sin(a) * R * 0.4 + 10, 5 + up * 8, up, i);
        }
      }
    },
    onPhaseEnd() { ear = null; },
  };
};

// ── Signature: Rhizome ──────────────────────────────────────────────
// Caps push up at points round the room, each tied back to him by a
// thread. A pulse runs out along every thread, and as it reaches a cap the
// cap bursts into a ring of slow spores — read the order off the threads.

const rhizome = (tk: BossToolkit): SignatureMove => {
  interface Node { x: number; y: number; pts: Pt[]; born: number; reachAt: number; burst: boolean }
  let nodes: Node[] = [];
  return {
    durationMs: 3000,
    windupMs: 750,
    gesture: 'raise',
    tell: 'RHIZOME',
    cast(time) {
      tk.sfx('spore');
      const count = tk.hard ? 6 : 5;
      const p = tk.player;
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < count; i++) {
        const a = a0 + (i / count) * Math.PI * 2;
        const x = tk.clampX(p.x + Math.cos(a) * 230, 60), y = tk.clampY(p.y + Math.sin(a) * 170, 60);
        const pts = hyphaPoints({ x: tk.bossX, y: tk.bossY }, { x, y }, i * 5 + 2, 12);
        let len = 0;
        for (let k = 1; k < pts.length; k++) len += dist(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y);
        nodes.push({ x, y, pts, born: time, reachAt: time + tk.warn(900) + (len / 380) * 1000 + i * 120, burst: false });
      }
    },
    update(time) {
      for (const n of nodes) {
        if (n.burst || time < n.reachAt) continue;
        n.burst = true;
        tk.sfx('slime-splat');
        const spokes = tk.hard ? 9 : 8;
        const off = Math.random() * Math.PI;
        for (let s = 0; s < spokes; s++) {
          tk.spawnBullet({ x: n.x, y: n.y, angle: off + (s / spokes) * Math.PI * 2, speed: 150, damage: 9, r: 7, lifeMs: 3200, color: SPORE });
        }
      }
      nodes = nodes.filter((n) => !n.burst || time < n.reachAt + 500);
    },
    drawGround(g, time) {
      for (const n of nodes) {
        const fade = n.burst ? 1 - Phaser.Math.Clamp((time - n.reachAt) / 500, 0, 1) : 1;
        g.lineStyle(2, GLOW_DEEP, 0.8 * fade); polyline(g, n.pts);
        // The pulse running out to the cap.
        const total = n.reachAt - (n.born + tk.warn(900));
        const k = Phaser.Math.Clamp((time - (n.reachAt - total)) / Math.max(1, total), 0, 1);
        if (k > 0 && !n.burst) {
          const q = along(n.pts, k);
          g.fillStyle(GLOW, 0.4); g.fillCircle(q.x, q.y, 12);
          g.fillStyle(WHITE, 1); g.fillCircle(q.x, q.y, 4);
        }
        g.lineStyle(1.5, SPORE, 0.4 * fade); g.strokeCircle(n.x, n.y, 26);
      }
    },
    drawAir(g, time) {
      for (const n of nodes) {
        const grow = Phaser.Math.Clamp((time - n.born) / 600, 0, 1);
        if (n.burst) {
          const q = Phaser.Math.Clamp((time - n.reachAt) / 500, 0, 1);
          sporeCloud(g, n.x, n.y - 8, 30 + q * 30, SPORE, 1 - q, time / 1000, n.x);
          continue;
        }
        const swell = 1 + Math.max(0, 1 - (n.reachAt - time) / 400) * 0.25;
        toadstool(g, n.x, n.y + 6, 13 * grow * swell, CAP_VIOLET, true, 1, Math.floor(n.x));
      }
    },
    onPhaseEnd() { nodes = []; },
  };
};

// ── Signature: Spore Gust ───────────────────────────────────────────
// The great cap tips toward you. A cone of gills shows on the floor; then
// the cap snaps and spore gusts down the cone, leaving drifts of it to wade.

const capGust = (tk: BossToolkit): SignatureMove => {
  interface Gust { a: number; born: number; at: number; done: boolean }
  let gusts: Gust[] = [];
  const LEN = 400;
  const HALF = 0.42;
  const inCone = (gu: Gust, x: number, y: number): boolean => {
    const d = Phaser.Math.Distance.Between(tk.bossX, tk.bossY, x, y);
    if (d > LEN) return false;
    const a = Math.atan2(y - tk.bossY, x - tk.bossX);
    return Math.abs(Phaser.Math.Angle.Wrap(a - gu.a)) < HALF + PLAYER_R / Math.max(40, d);
  };
  return {
    durationMs: 2600,
    windupMs: 700,
    hold: 'spray',
    tell: 'SPORE GUST',
    cast(time) {
      tk.sfx('gust');
      const a = tk.angleToPlayer();
      gusts.push({ a, born: time, at: time + tk.warn(1000), done: false });
      if (tk.hard) gusts.push({ a: a + (Math.random() < 0.5 ? 1 : -1) * 0.95, born: time + 500, at: time + 500 + tk.warn(1000), done: false });
    },
    update(time) {
      const p = tk.player;
      for (const gu of gusts) {
        if (gu.done || time < gu.at) continue;
        gu.done = true;
        tk.sfx('tornado');
        if (inCone(gu, p.x, p.y)) { tk.hitPlayer(14, p.x, p.y); tk.slowPlayer(0.65, 1200); }
        for (let i = 1; i <= 3; i++) {
          const d = (LEN / 4) * i + 20;
          tk.spawnPool({ x: tk.clampX(tk.bossX + Math.cos(gu.a) * d), y: tk.clampY(tk.bossY + Math.sin(gu.a) * d), radius: 46, lifeMs: 3600, damage: 4, tickMs: 700 });
        }
      }
      gusts = gusts.filter((gu) => !gu.done || time < gu.at + 600);
    },
    drawGround(g, time) {
      for (const gu of gusts) {
        if (time < gu.born) continue;
        const k = Phaser.Math.Clamp((time - gu.born) / Math.max(1, gu.at - gu.born), 0, 1);
        const bx = tk.bossX, by = tk.bossY;
        if (!gu.done) {
          // The cone, and the gill lines inside it brightening toward the gust.
          const pts: Phaser.Geom.Point[] = [new Phaser.Geom.Point(bx, by)];
          for (let i = 0; i <= 12; i++) {
            const a = gu.a - HALF + (i / 12) * HALF * 2;
            pts.push(new Phaser.Geom.Point(bx + Math.cos(a) * LEN, by + Math.sin(a) * LEN));
          }
          g.fillStyle(SPORE, 0.06 + 0.14 * k); g.fillPoints(pts, true, true);
          g.lineStyle(2, SPORE, 0.4 + 0.4 * k); g.strokePoints(pts, true, true);
          for (let i = 1; i < 8; i++) {
            const a = gu.a - HALF + (i / 8) * HALF * 2;
            g.lineStyle(1, GILL, 0.4 + 0.4 * k);
            g.lineBetween(bx + Math.cos(a) * 50, by + Math.sin(a) * 50, bx + Math.cos(a) * LEN * k, by + Math.sin(a) * LEN * k);
          }
        }
      }
    },
    drawAir(g, time) {
      for (const gu of gusts) {
        if (!gu.done) continue;
        const q = Phaser.Math.Clamp((time - gu.at) / 600, 0, 1);
        for (let i = 0; i < 9; i++) {
          const a = gu.a + (i / 8 - 0.5) * HALF * 1.8;
          const d = 60 + q * (LEN - 60) * (0.7 + (i % 3) * 0.12);
          sporeCloud(g, tk.bossX + Math.cos(a) * d, tk.bossY + Math.sin(a) * d, 26 + q * 18, SPORE, 1 - q, time / 1000, i);
        }
      }
    },
    onPhaseEnd() { gusts = []; },
  };
};

// ── Signature: Gill Rain ────────────────────────────────────────────
// The underside of his cap: gills, laid out as radial strips on the floor
// round him. Spore rains down every other gill, then the gills between.
// Stand in the gap between two lit strips — then step into the next.

const gillRain = (tk: BossToolkit): SignatureMove => {
  interface Rain { cx: number; cy: number; a0: number; born: number; atA: number; atB: number; doneA: boolean; doneB: boolean }
  let rain: Rain | null = null;
  const LINES = 14;
  const LEN = 330;
  const HALF_W = 13;
  const onSet = (r: Rain, x: number, y: number, odd: number): boolean => {
    const d = Phaser.Math.Distance.Between(r.cx, r.cy, x, y);
    if (d > LEN + PLAYER_R || d < 30) return false;
    for (let i = odd; i < LINES; i += 2) {
      const a = r.a0 + (i / LINES) * Math.PI * 2;
      if (distToSeg(x, y, r.cx, r.cy, r.cx + Math.cos(a) * LEN, r.cy + Math.sin(a) * LEN) < HALF_W + PLAYER_R * 0.55) return true;
    }
    return false;
  };
  return {
    durationMs: 3200,
    windupMs: 800,
    hold: 'charge',
    tell: 'GILL RAIN',
    cast(time) {
      tk.sfx('rain');
      const a0 = tk.angleToPlayer() + Math.PI / LINES;
      const atA = time + tk.warn(1050);
      rain = { cx: tk.bossX, cy: tk.bossY, a0, born: time, atA, atB: atA + tk.warn(800), doneA: false, doneB: false };
    },
    update(time) {
      if (!rain) return;
      const r = rain;
      const p = tk.player;
      if (!r.doneA && time >= r.atA) { r.doneA = true; tk.sfx('splash'); if (onSet(r, p.x, p.y, 0)) tk.hitPlayer(12, p.x, p.y); }
      if (!r.doneB && time >= r.atB) { r.doneB = true; tk.sfx('splash'); if (onSet(r, p.x, p.y, 1)) tk.hitPlayer(12, p.x, p.y); }
      if (r.doneB && time > r.atB + 500) rain = null;
    },
    drawGround(g, time) {
      if (!rain) return;
      const r = rain;
      for (let i = 0; i < LINES; i++) {
        const odd = i % 2;
        const at = odd ? r.atB : r.atA;
        const from = odd ? r.atA : r.born;
        const done = odd ? r.doneB : r.doneA;
        const a = r.a0 + (i / LINES) * Math.PI * 2;
        const ex = r.cx + Math.cos(a) * LEN, ey = r.cy + Math.sin(a) * LEN;
        if (done) {
          const q = Phaser.Math.Clamp((time - at) / 400, 0, 1);
          g.lineStyle(HALF_W * 2, SPORE, 0.5 * (1 - q)); g.lineBetween(r.cx, r.cy, ex, ey);
          continue;
        }
        const k = Phaser.Math.Clamp((time - from) / Math.max(1, at - from), 0, 1);
        // Gills: a dark strip with a bright seam that fills toward the rain.
        g.lineStyle(HALF_W * 2, GILL, (odd && time < r.atA ? 0.08 : 0.14 + 0.2 * k));
        g.lineBetween(r.cx, r.cy, ex, ey);
        if (!(odd && time < r.atA)) {
          g.lineStyle(2, SPORE, 0.35 + 0.55 * k);
          g.lineBetween(r.cx, r.cy, r.cx + Math.cos(a) * LEN * k, r.cy + Math.sin(a) * LEN * k);
        }
      }
      g.lineStyle(2, GILL, 0.5); g.strokeCircle(r.cx, r.cy, LEN);
    },
    drawAir(g, time) {
      if (!rain) return;
      const r = rain;
      // Falling spore streaks over the strips about to be rained on.
      const odd = r.doneA ? 1 : 0;
      const at = odd ? r.atB : r.atA;
      if (at - time > 450 || time > at + 200) return;
      for (let i = odd; i < LINES; i += 2) {
        const a = r.a0 + (i / LINES) * Math.PI * 2;
        for (let s = 0; s < 5; s++) {
          const d = 60 + s * 60 + ((time / 6 + s * 23) % 50);
          const x = r.cx + Math.cos(a) * d, y = r.cy + Math.sin(a) * d;
          g.lineStyle(2, SPORE, 0.7); g.lineBetween(x, y - 22, x, y - 8);
        }
      }
    },
    onPhaseEnd() { rain = null; },
  };
};

// ── Signature: Sporelings ───────────────────────────────────────────
// Little puffballs shake loose from his cap, sprout legs, and waddle after
// you. They are slower than you. When one reaches you it swells and pops;
// left alone too long, they pop where they stand.

const sporelings = (tk: BossToolkit): SignatureMove => {
  interface Ling { x: number; y: number; born: number; fuseAt: number; popAt: number; dieAt: number; popped: boolean; seed: number }
  let lings: Ling[] = [];
  const R = 62;
  const FUSE = 480;
  return {
    durationMs: 2200,
    windupMs: 700,
    gesture: 'flex',
    tell: 'SPORELINGS',
    cast(time) {
      tk.sfx('boing');
      const count = tk.hard ? 5 : 4;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        lings.push({
          x: tk.clampX(tk.bossX + Math.cos(a) * 60), y: tk.clampY(tk.bossY + Math.sin(a) * 50),
          born: time + i * 150, fuseAt: 0, popAt: 0, dieAt: time + 6000 + i * 150, popped: false, seed: i * 17 + 3,
        });
      }
    },
    update(time, dt) {
      const p = tk.player;
      const speed = tk.hard ? 120 : 104;
      for (const l of lings) {
        if (l.popped || time < l.born) continue;
        if (!l.fuseAt) {
          const d = Phaser.Math.Distance.Between(l.x, l.y, p.x, p.y);
          if (d < 46 || time >= l.dieAt) { l.fuseAt = time; l.popAt = time + tk.warn(FUSE); tk.sfx('bubble'); continue; }
          // Waddle: a stop-start gait, slower than a walk.
          const gait = 0.55 + 0.45 * Math.abs(Math.sin((time - l.born) / 140 + l.seed));
          l.x = tk.clampX(l.x + ((p.x - l.x) / d) * speed * gait * Math.min(0.05, dt));
          l.y = tk.clampY(l.y + ((p.y - l.y) / d) * speed * gait * Math.min(0.05, dt));
          // Keep them from stacking into one.
          for (const o of lings) {
            if (o === l || o.popped) continue;
            const od = Phaser.Math.Distance.Between(l.x, l.y, o.x, o.y);
            if (od > 0 && od < 30) { l.x += ((l.x - o.x) / od) * 1.5; l.y += ((l.y - o.y) / od) * 1.5; }
          }
        } else if (time >= l.popAt) {
          l.popped = true;
          tk.sfx('spore');
          if (Phaser.Math.Distance.Between(l.x, l.y, p.x, p.y) < R + PLAYER_R * 0.4) tk.hitPlayer(13, p.x, p.y);
        }
      }
      lings = lings.filter((l) => !l.popped || time < l.popAt + 500);
    },
    drawGround(g, time) {
      for (const l of lings) {
        if (!l.fuseAt || l.popped) continue;
        const k = Phaser.Math.Clamp((time - l.fuseAt) / Math.max(1, l.popAt - l.fuseAt), 0, 1);
        g.lineStyle(2, SPORE, 0.4 + 0.5 * k); g.strokeCircle(l.x, l.y, R);
        g.fillStyle(SPORE, 0.05 + 0.15 * k); g.fillCircle(l.x, l.y, R * k);
      }
    },
    drawAir(g, time) {
      for (const l of lings) {
        if (time < l.born) continue;
        if (l.popped) {
          const q = Phaser.Math.Clamp((time - l.popAt) / 500, 0, 1);
          sporeCloud(g, l.x, l.y - 6, R * (0.5 + q * 0.5), SPORE, 1 - q, time / 1000, l.seed);
          continue;
        }
        const k = l.fuseAt ? Phaser.Math.Clamp((time - l.fuseAt) / Math.max(1, l.popAt - l.fuseAt), 0, 1) : 0;
        const step = Math.sin((time - l.born) / 70 + l.seed);
        // Stubby legs, a fat white body that swells and browns as it fuses, two dot eyes.
        g.lineStyle(3, STEM_SHADE, 1);
        g.lineBetween(l.x - 5, l.y + 6, l.x - 6 + step * 3, l.y + 14);
        g.lineBetween(l.x + 5, l.y + 6, l.x + 6 - step * 3, l.y + 14);
        puffball(g, l.x, l.y - 2 - Math.abs(step) * 2, 13 * (1 + k * 0.45), k, l.seed);
        g.fillStyle(PEAT_DARK, 1);
        g.fillCircle(l.x - 4, l.y - 4, 1.8); g.fillCircle(l.x + 4, l.y - 4, 1.8);
        if (k > 0.5 && Math.floor(time / 60) % 2) { g.lineStyle(2, WHITE, 0.8); g.strokeCircle(l.x, l.y - 2, 13 * (1 + k * 0.45) + 2); }
      }
    },
    onPhaseEnd() { lings = []; },
  };
};

// ── Signature: The Mat ──────────────────────────────────────────────
// Mycorrhiza: the floor is him. The room divides into patches of mat; one
// set of patches glows, then erupts in caps — then the other set. Stand on
// a dark patch, then cross to one that has just gone off.

const matBloom = (tk: BossToolkit): SignatureMove => {
  interface Mat { cols: number; rows: number; born: number; atA: number; atB: number; doneA: boolean; doneB: boolean; flip: boolean }
  let mat: Mat | null = null;
  const x0 = 20;
  const cellOf = (m: Mat): { w: number; h: number } => ({ w: (tk.W - 40) / m.cols, h: (tk.H - FIELD_TOP - 20) / m.rows });
  const setOf = (m: Mat, c: number, r: number): number => ((c + r + (m.flip ? 1 : 0)) % 2);
  return {
    durationMs: 3200,
    windupMs: 700,
    hold: 'brace',
    tell: 'THE MAT',
    cast(time) {
      tk.sfx('quake');
      const atA = time + tk.warn(1150);
      mat = { cols: 6, rows: 4, born: time, atA, atB: atA + tk.warn(950), doneA: false, doneB: false, flip: Math.random() < 0.5 };
    },
    update(time) {
      if (!mat) return;
      const m = mat;
      const p = tk.player;
      const { w, h } = cellOf(m);
      const c = Math.floor((p.x - x0) / w), r = Math.floor((p.y - FIELD_TOP) / h);
      const mine = c >= 0 && c < m.cols && r >= 0 && r < m.rows ? setOf(m, c, r) : -1;
      if (!m.doneA && time >= m.atA) { m.doneA = true; tk.sfx('stone-rise'); if (mine === 0) tk.hitPlayer(13, p.x, p.y); }
      if (!m.doneB && time >= m.atB) { m.doneB = true; tk.sfx('stone-rise'); if (mine === 1) tk.hitPlayer(13, p.x, p.y); }
      if (m.doneB && time > m.atB + 600) mat = null;
    },
    drawGround(g, time) {
      if (!mat) return;
      const m = mat;
      const { w, h } = cellOf(m);
      for (let c = 0; c < m.cols; c++) {
        for (let r = 0; r < m.rows; r++) {
          const set = setOf(m, c, r);
          const at = set === 0 ? m.atA : m.atB;
          const from = set === 0 ? m.born : m.atA;
          const done = set === 0 ? m.doneA : m.doneB;
          const x = x0 + c * w, y = FIELD_TOP + r * h;
          if (done) {
            const q = Phaser.Math.Clamp((time - at) / 600, 0, 1);
            g.fillStyle(GLOW_WASH, 0.35 * (1 - q)); g.fillRect(x + 3, y + 3, w - 6, h - 6);
            continue;
          }
          const k = Phaser.Math.Clamp((time - from) / Math.max(1, at - from), 0, 1);
          const active = set === 0 || m.doneA;
          g.lineStyle(1.5, GLOW_DEEP, 0.6); g.strokeRect(x + 3, y + 3, w - 6, h - 6);
          if (active) {
            g.fillStyle(GLOW, 0.05 + 0.2 * k); g.fillRect(x + 3, y + 3, w - 6, h - 6);
            // The mat knitting: threads criss-crossing the cell as it charges.
            g.lineStyle(1, GLOW, 0.3 + 0.5 * k);
            for (let s = 0; s < 3; s++) g.lineBetween(x + 8, y + 10 + s * (h / 3), x + 8 + (w - 16) * k, y + h - 10 - s * (h / 3));
          }
        }
      }
    },
    drawAir(g, time) {
      if (!mat) return;
      const m = mat;
      const { w, h } = cellOf(m);
      for (let c = 0; c < m.cols; c++) {
        for (let r = 0; r < m.rows; r++) {
          const set = setOf(m, c, r);
          const at = set === 0 ? m.atA : m.atB;
          if (time < at || time > at + 600) continue;
          const q = (time - at) / 600;
          const up = q < 0.25 ? q / 0.25 : 1 - (q - 0.25) / 0.75;
          const x = x0 + c * w + w / 2, y = FIELD_TOP + r * h + h / 2;
          for (let s = 0; s < 3; s++) toadstool(g, x - w * 0.25 + s * w * 0.25, y + 10 + (s % 2) * 8, 6 + up * 10, s % 2 ? CAP_VIOLET : GLOW_DEEP, s % 2 === 1, up, s + c + r);
        }
      }
    },
    onPhaseEnd() { mat = null; },
  };
};

// ── Signature: Take Root ────────────────────────────────────────────
// Knots of root surface round you — one under your feet, a ring about it.
// The one under you snaps first; the ring a moment later. Step out of the
// middle through a gap in the ring, not into a knot.

const rootSnare = (tk: BossToolkit): SignatureMove => {
  interface Knot { x: number; y: number; born: number; at: number; done: boolean }
  let knots: Knot[] = [];
  const R = 40;
  return {
    durationMs: 2400,
    windupMs: 650,
    gesture: 'clap',
    tell: 'TAKE ROOT',
    cast(time) {
      tk.sfx('trap-set');
      const p = tk.player;
      knots.push({ x: p.x, y: p.y, born: time, at: time + tk.warn(800), done: false });
      const n = 5;
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        knots.push({ x: tk.clampX(p.x + Math.cos(a) * 118, 40), y: tk.clampY(p.y + Math.sin(a) * 100, 40), born: time, at: time + tk.warn(1300), done: false });
      }
    },
    update(time) {
      const p = tk.player;
      for (const k of knots) {
        if (k.done || time < k.at) continue;
        k.done = true;
        tk.sfx('trap-snap');
        if (Phaser.Math.Distance.Between(p.x, p.y, k.x, k.y) < R + PLAYER_R * 0.4) { tk.hitPlayer(9, p.x, p.y); tk.slowPlayer(0.4, 1400); }
      }
      knots = knots.filter((k) => !k.done || time < k.at + 500);
    },
    drawGround(g, time) {
      for (const k of knots) {
        if (k.done) continue;
        const q = Phaser.Math.Clamp((time - k.born) / Math.max(1, k.at - k.born), 0, 1);
        g.lineStyle(2, ROT_LIT, 0.4 + 0.5 * q); g.strokeCircle(k.x, k.y, R);
        // A knot of root pulling tight: spokes curling inward.
        for (let s = 0; s < 6; s++) {
          const a = (s / 6) * Math.PI * 2 + q * 1.5;
          g.lineStyle(2, ROT, 0.8);
          g.lineBetween(k.x + Math.cos(a) * R, k.y + Math.sin(a) * R, k.x + Math.cos(a + 0.8) * R * (1 - q * 0.7), k.y + Math.sin(a + 0.8) * R * (1 - q * 0.7));
        }
        g.fillStyle(ROT, 0.15 + 0.25 * q); g.fillCircle(k.x, k.y, R * q);
      }
    },
    drawAir(g, time) {
      for (const k of knots) {
        if (!k.done) continue;
        const q = Phaser.Math.Clamp((time - k.at) / 500, 0, 1);
        const up = q < 0.3 ? q / 0.3 : 1 - (q - 0.3) / 0.7;
        // Roots whipping up out of the floor and closing like fingers.
        for (let s = 0; s < 5; s++) {
          const a = (s / 5) * Math.PI * 2;
          const bx = k.x + Math.cos(a) * R * 0.8, by = k.y + Math.sin(a) * R * 0.5;
          g.lineStyle(5, ROT, up); g.lineBetween(bx, by, k.x + Math.cos(a) * 6, k.y - 30 * up);
          g.lineStyle(2, ROT_LIT, up); g.lineBetween(bx, by, k.x + Math.cos(a) * 6, k.y - 30 * up);
        }
      }
    },
    onPhaseEnd() { knots = []; },
  };
};

/** The upper half of an ellipse, as fillable points — a mushroom cap's dome. */
function dome(cx: number, cy: number, rx: number, ry: number): Phaser.Geom.Point[] {
  const pts: Phaser.Geom.Point[] = [];
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI + (i / 20) * Math.PI;
    pts.push(new Phaser.Geom.Point(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry));
  }
  return pts;
}

// ── The def ──────────────────────────────────────────────────────────

export const MYCEL_BOSS: WorldBossDef = {
  worldId: 'isle:mycel',
  name: 'Prince Mycel',
  title: 'The Ear Beneath the Floor',
  color: 0x3b2a3c,
  colorLit: GLOW,
  colorDark: 0x120b12,
  accent: STEM,
  damageMult: 1.1,

  intro: [
    'Shh. I have been listening to you since you stepped on the first board. You walk heavily.',
    'Mother likes a tidy garden. What falls here goes back into the ground — and the ground is mine.',
  ],
  banter: [
    'Every doorstep in this bog has a thread under it. I know who comes up short before they do.',
    'Rot is not cruel. It is thorough. Nothing is wasted. Not even you.',
    'You hear that? No. You never do. I do.',
    'The pruned do not scream, in the end. They grow. I have listened to them growing.',
    'A mushroom is only the part you see. You are fighting the part you see.',
    'Hold still. I can hear your heart. It is very loud.',
  ],
  defeatLine: 'THE THREADS FALL QUIET',
  resumeLine: 'Back again. I heard you coming three boards off.',

  phases: [
    {
      name: 'The Network',
      line: 'Every thread in this floor runs to me. Step carefully. Step quietly.',
      hp: 430,
      cycle: [
        'sig:hyphalRun', 'volley', 'sig:rhizome', 'barrage', 'sig:listen',
        'homing', 'sig:hyphalRun', 'hazard', 'sig:rhizome', 'lanes',
      ],
      harass: ['h-snipe', 'h-orbs', 'h-rune'],
      restMs: 1060,
      harassMs: 3000,
    },
    {
      name: 'Fruiting Body',
      line: 'You want to see the part above the ground? Very well. Look up.',
      hp: 510,
      cycle: [
        'sig:capGust', 'sig:sporelings', 'radial', 'sig:gillRain', 'hazard',
        'sig:capGust', 'spiral', 'sig:sporelings', 'sig:gillRain', 'charge',
      ],
      harass: ['h-flak', 'h-mines', 'h-rune'],
      restMs: 940,
      harassMs: 2700,
    },
  ],

  hard: {
    introLine: 'THE WHOLE FLOOR IS LISTENING',
    extraPhase: {
      name: 'Mycorrhiza',
      line: 'There is no "me" to strike at. There is only the floor, and you are standing on it.',
      hp: 370,
      cycle: [
        'sig:matBloom', 'sig:rootSnare', 'sig:listen', 'sweep', 'sig:matBloom',
        'sig:hyphalRun', 'sig:rootSnare', 'sanctuary', 'sig:rhizome',
      ],
      harass: ['h-lane', 'h-snipe', 'h-orbs', 'h-mines'],
      restMs: 820,
      harassMs: 2300,
    },
  },

  tuning: {
    hazard: { radius: 60, durationMs: 4200 },
    homing: { count: 3, speed: 150 },
  },

  signatures: {
    hyphalRun,
    listen,
    rhizome,
    capGust,
    gillRain,
    sporelings,
    matBloom,
    rootSnare,
  },

  look: {
    crest: 'tendrils', pattern: 'weave', aura: 'dust', hands: 'wisp',
    torsoR: 34, eyes: 3, eyeColor: GLOW, mouth: 'line',
  },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none', tint: 'none' },
    { movement: 'stalk', gimmick: 'wards', tint: 'sick', look: { crest: 'none', pattern: 'smooth', aura: 'dust', hands: 'claw', torsoR: 40, eyes: 2, mouth: 'maw' } },
    { movement: 'blink', gimmick: 'tremor', tint: 'void', look: { crest: 'tendrils', pattern: 'weave', aura: 'leaves', hands: 'wisp', eyes: 1, mouth: 'none', torsoR: 32 } },
  ],

  /**
   * The silhouette is the cap. In The Network, Mycel wears a broad parasol cap on his head like a
   * mushroom does — bruise-violet, cream-spotted, its teal gills glowing underneath — and from his
   * underside a fan of glowing threads runs down into the floor and away, so he always looks
   * planted. In Fruiting Body the cap swells to three times his width and ragged at the rim; it
   * breathes spore, and he stands on a fat cream stem. In Mycorrhiza there is no cap at all: he
   * is sunk to the chest in a disc of mat, and threads run from him to the very edges of the room.
   */
  drawDecor(g, s: BossBodyState) {
    const R = s.radius;
    const t = s.t;
    const phase = s.phaseIdx;
    const sec = t / 1000;

    if (phase === 0) {
      // Threads down into the floor, pulsing outward.
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7;
        const end = { x: s.x + Math.cos(a) * R * 3.2, y: s.y + R * 0.9 + Math.sin(a) * R * 1.4 };
        hypha(g, { x: s.x + Math.cos(a) * R * 0.6, y: s.y + R * 0.7 }, end, 1.6, GLOW, 0.7, i * 3, 0.18);
        const ph = (sec * 0.8 + i / 7) % 1;
        const q = along(hyphaPoints({ x: s.x + Math.cos(a) * R * 0.6, y: s.y + R * 0.7 }, end, i * 3), ph);
        g.fillStyle(GLOW_WASH, 1 - ph); g.fillCircle(q.x, q.y, 2.2);
      }
      // The parasol cap: a flat dome of bruise-violet over glowing teal gills.
      const cy = s.y - R * 0.9;
      const w = R * 1.6, h = R * 0.85;
      g.fillStyle(GLOW, 0.22 + s.castGlow * 0.3); g.fillEllipse(s.x, cy + 6, w * 2.1, R * 0.42);
      g.fillStyle(GILL, 1); g.fillEllipse(s.x, cy + 3, w * 1.96, R * 0.32);
      for (let i = 0; i < 14; i++) {
        const gx = s.x - w * 0.92 + (i / 13) * w * 1.84;
        g.lineStyle(1, GLOW, 0.65); g.lineBetween(s.x, cy + 1, gx, cy + 6);
      }
      g.fillStyle(dim(CAP_VIOLET, 0.35), 1); g.fillPoints(dome(s.x, cy, w, h), true, true);
      g.fillStyle(CAP_VIOLET, 1); g.fillPoints(dome(s.x - 2, cy - 2, w * 0.93, h * 0.92), true, true);
      g.fillStyle(CAP_VIOLET_LIT, 0.6); g.fillEllipse(s.x - w * 0.35, cy - h * 0.55, w * 0.6, h * 0.28);
      // A raised umbo in the middle, and the spots.
      g.fillStyle(lit(CAP_VIOLET, 0.15), 1); g.fillEllipse(s.x, cy - h * 0.86, w * 0.36, h * 0.3);
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + 0.4 + (i / 6) * (Math.PI - 0.8);
        g.fillStyle(SPOT, 0.9); g.fillEllipse(s.x + Math.cos(a) * w * 0.62, cy + Math.sin(a) * h * 0.66, 6, 4);
      }
    } else if (phase === 1) {
      // The stem he stands on.
      g.fillStyle(STEM_SHADE, 1); g.fillRoundedRect(s.x - R * 0.55, s.y + R * 0.4, R * 1.1, R * 0.9, 8);
      g.fillStyle(STEM, 1); g.fillRoundedRect(s.x - R * 0.5, s.y + R * 0.4, R * 0.7, R * 0.88, 8);
      g.fillStyle(STEM_SHADE, 1); g.fillEllipse(s.x, s.y + R * 1.28, R * 1.5, R * 0.36);
      // The towering cap: three bodies wide, ragged at the rim, breathing spore.
      const cy = s.y - R * 1.0;
      const w = R * 2.6, h = R * 1.35;
      const breathe = 1 + Math.sin(sec * 1.6) * 0.03 + s.castGlow * 0.06;
      g.fillStyle(0x000000, 0.25); g.fillEllipse(s.x, s.y + R * 1.3, w * 1.6, R * 0.5);
      g.fillStyle(GILL, 1); g.fillEllipse(s.x, cy + 6, w * 2 * breathe, R * 0.5);
      for (let i = 0; i < 24; i++) {
        const gx = s.x - w + (i / 23) * w * 2;
        g.lineStyle(1.2, GLOW, 0.5); g.lineBetween(s.x, cy + 4, gx * breathe + s.x * (1 - breathe), cy + 10);
      }
      g.fillStyle(dim(CAP_RED, 0.35), 1); g.fillPoints(dome(s.x, cy, w * breathe, h * breathe), true, true);
      g.fillStyle(CAP_RED, 1); g.fillPoints(dome(s.x - 3, cy - 2, w * 0.94 * breathe, h * 0.93 * breathe), true, true);
      // Ragged rim: torn scallops along the edge.
      for (let i = 0; i < 11; i++) {
        const x = s.x - w + (i / 10) * w * 2;
        g.fillStyle(dim(CAP_RED, 0.5), 1); g.fillTriangle(x - 7, cy, x + 7, cy, x + (i % 2 ? 3 : -3), cy + 9 + (i % 3) * 3);
      }
      for (let i = 0; i < 11; i++) {
        const a = Math.PI + 0.3 + ((i * 0.61) % 1) * (Math.PI - 0.6);
        const r = 0.35 + ((i * 0.37) % 1) * 0.5;
        g.fillStyle(SPOT, 0.92); g.fillEllipse(s.x + Math.cos(a) * w * r, cy + Math.sin(a) * h * r * 0.9, 11, 7);
      }
      // Spore breathing off the rim.
      for (let i = 0; i < 6; i++) {
        const ph = (sec * 0.5 + i / 6) % 1;
        const sx = s.x - w + ((i * 0.37) % 1) * w * 2;
        g.fillStyle(SPORE, 0.35 * (1 - ph)); g.fillCircle(sx, cy + 10 + ph * 50, 4 + ph * 10);
      }
    } else {
      // Sunk into a disc of mat; threads to the edges of the room.
      g.fillStyle(PEAT_DARK, 0.95); g.fillEllipse(s.x, s.y + R * 0.5, R * 3.4, R * 1.3);
      g.fillStyle(GLOW_DEEP, 0.35); g.fillEllipse(s.x, s.y + R * 0.5, R * 3, R * 1.05);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.2;
        const end = { x: s.x + Math.cos(a) * 700, y: s.y + R * 0.5 + Math.sin(a) * 500 };
        hypha(g, { x: s.x + Math.cos(a) * R * 1.4, y: s.y + R * 0.5 + Math.sin(a) * R * 0.5 }, end, 1.4, GLOW, 0.45, i * 7, 0.1);
      }
      // The disc's rim of tiny caps.
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        toadstool(g, s.x + Math.cos(a) * R * 1.6, s.y + R * 0.5 + Math.sin(a) * R * 0.62, 5, i % 2 ? CAP_VIOLET : GLOW_DEEP, false, 1, i);
      }
      // The lower half of him hidden in the mat.
      g.fillStyle(PEAT, 1); g.fillEllipse(s.x, s.y + R * 0.75, R * 2.2, R * 0.9);
      g.lineStyle(1.5, GLOW, 0.5); g.strokeEllipse(s.x, s.y + R * 0.55, R * 2.2, R * 0.5);
    }
    if (s.hurt) sporeCloud(g, s.x + R * 0.6, s.y - R * 0.6, 14, SPORE, 0.8, sec, 3);
  },

  /**
   * The Prince's floor is the heart of the Mycelarium: black loam under the great dome, the
   * whole of it webbed with glowing hyphae that radiate from the middle and knot into nodes;
   * three fairy rings, one inside the next, of red, violet and glowing caps; and the moss pale
   * where something heavy was lately composted.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x5b0e);
    g.fillStyle(PEAT_DARK, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) {
      g.fillStyle(rng() < 0.5 ? PEAT : PEAT_LIT, 0.4);
      g.fillEllipse(rng() * W, FIELD_TOP + rng() * (H - FIELD_TOP), 40 + rng() * 140, 20 + rng() * 60);
    }
    for (let i = 0; i < 18; i++) {
      g.fillStyle(rng() < 0.5 ? MOSS_DARK : MOSS, 0.5);
      g.fillEllipse(rng() * W, FIELD_TOP + rng() * (H - FIELD_TOP), 30 + rng() * 80, 14 + rng() * 30);
    }
    const cx = W / 2, cy = (FIELD_TOP + H) / 2 + 10;
    // The web: radial threads, knotted, with cross-threads.
    const spokes = 16;
    const knots: Pt[][] = [];
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2 + rng() * 0.1;
      const ring: Pt[] = [];
      for (let k = 1; k <= 4; k++) ring.push({ x: cx + Math.cos(a) * k * 110 * 1.15, y: cy + Math.sin(a) * k * 72 });
      knots.push(ring);
      hypha(g, { x: cx, y: cy }, ring[3], 1.6, GLOW_DEEP, 0.7, i * 5, 0.12);
    }
    for (let k = 0; k < 4; k++) {
      for (let i = 0; i < spokes; i++) {
        const a = knots[i][k], b = knots[(i + 1) % spokes][k];
        if (rng() < 0.75) hypha(g, a, b, 1, GLOW_DEEP, 0.45, i * 9 + k, 0);
        g.fillStyle(GLOW, 0.4); g.fillCircle(a.x, a.y, 2.2);
      }
    }
    g.fillStyle(GLOW, 0.12); g.fillCircle(cx, cy, 40);
    // Three fairy rings, nested.
    const rings: [number, number, number][] = [[W * 0.46, CAP_RED, 30], [W * 0.38, CAP_VIOLET, 24], [W * 0.3, GLOW_DEEP, 18]];
    for (const [rx, cap, n] of rings) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rng() * 0.05;
        toadstool(g, cx + Math.cos(a) * rx, cy + Math.sin(a) * rx * 0.58, 5 + rng() * 3, cap, cap !== GLOW_DEEP, 0.85, i);
      }
    }
    // Scattered glowcaps along the walls.
    for (let i = 0; i < 16; i++) glowcaps(g, 10 + rng() * (W - 20), rng() < 0.5 ? FIELD_TOP + 10 + rng() * 20 : H - 10 - rng() * 14, 4 + rng() * 3, 0.7, i);
    g.lineStyle(3, ROT, 0.5); g.strokeRect(8, FIELD_TOP - 6, W - 16, H - FIELD_TOP);
    g.fillStyle(SPORE_DARK, 0.06); g.fillRect(0, FIELD_TOP, W, H - FIELD_TOP);
  },
};
