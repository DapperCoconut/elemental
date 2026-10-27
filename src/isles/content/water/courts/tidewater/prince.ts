import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mulberry } from '../../../../art/IsleArt';
import { anemone, foamEdge, sandRipples, shells, starfish } from './art';
import {
  BRASS, BRASS_DARK, BRASS_LIT, BUOY, DRIFT, DRIFT_DARK, EBB, EBB_DARK, EBB_LIT, EBB_PEARL, FOAM, MOON,
  PAINT_CREAM, PILE, PILE_WET, SAND, SAND_DARK, SEA, SEA_DEEP, SEA_LIT, SEA_SHALLOW, WEED, WETSAND, WETSAND_DARK,
  WETSAND_LIT,
} from './palette';
import { clamp, segDist } from './util';

/**
 * Prince Ebb, the Tidecaller — Queen Maresa's son, governor of the Tidewater Court.
 *
 * Ebb is *exact*. He knows every house on the flats by the depth it drowns at, and he calls the
 * tide from the Low-Water Stone to the minute. He does not hate anyone. He simply lets the sea
 * do what the ledger says, and he fights the same way: by moving water.
 *
 * • **Slack Water** (hovering, calm): breakers roll across the court one at a time, each broken
 *   by a single sandbar — the gap is the way through. Tide pools open round you with anemones
 *   that lash and spit; and he draws the sea back toward himself, dragging the flotsam in, before
 *   the backwash slams down where he floats.
 * • **Spring Tide** (orbiting, the cold tint): the court floods in stripes — alternate bands of
 *   the floor go under and drain, back and forth — and Ebb *surfs*: he rides a wave down a
 *   foam-marked lane, three runs, re-aimed at you each time.
 * • **King Tide** (hard, rooted, crowned): the sea stands up. A wall of water rises along one
 *   edge of the court, its shadow showing where it will fall; it falls; and then it runs back
 *   the way it came, broken in two places.
 */

const TOP = 96;

// ── Signature: Rolling Breaker ───────────────────────────────────────
// A line of surf rolls the whole width of the court. A sandbar runs across its path and breaks
// it there — the sandbar is drawn the moment the wave is called, and it is the only safe way
// through. Spring Tide sends two, from opposite sides, with different bars.

type Axis = 'down' | 'up' | 'right' | 'left';

interface Breaker { axis: Axis; bornAt: number; startAt: number; gap: number; dealt: boolean; speed: number }

const GAP_HALF = 74;
const BAND = 24;

function axisLen(tk: BossToolkit, a: Axis): number { return a === 'down' || a === 'up' ? tk.H - TOP : tk.W; }
function latLen(tk: BossToolkit, a: Axis): number { return a === 'down' || a === 'up' ? tk.W : tk.H - TOP; }
/** Coordinate of a point along the wave's travel (0 at its starting edge) and across it. */
function along(tk: BossToolkit, a: Axis, x: number, y: number): number {
  if (a === 'down') return y - TOP;
  if (a === 'up') return tk.H - y;
  if (a === 'right') return x;
  return tk.W - x;
}
function across(a: Axis, x: number, y: number): number { return a === 'down' || a === 'up' ? x : y - TOP; }
/** World point for (along, across). */
function pt(tk: BossToolkit, a: Axis, u: number, v: number): { x: number; y: number } {
  if (a === 'down') return { x: v, y: TOP + u };
  if (a === 'up') return { x: v, y: tk.H - u };
  if (a === 'right') return { x: u, y: TOP + v };
  return { x: tk.W - u, y: TOP + v };
}

const breakerMove = (tk: BossToolkit): SignatureMove => {
  let waves: Breaker[] = [];
  let lastAxis: Axis = 'up';
  /** Phases ended so far: from Spring Tide on, breakers come in pairs. */
  let phase = 0;

  function call(time: number, axis: Axis, delay: number): void {
    const p = tk.player;
    const pv = across(axis, p.x, p.y);
    const L = latLen(tk, axis);
    const off = (110 + Math.random() * 90) * (Math.random() < 0.5 ? -1 : 1);
    let gap = pv + off;
    if (gap < GAP_HALF + 30 || gap > L - GAP_HALF - 30) gap = pv - off;
    gap = clamp(gap, GAP_HALF + 30, L - GAP_HALF - 30);
    const bornAt = time + delay;
    waves.push({ axis, bornAt, startAt: bornAt + tk.warn(1150), gap, dealt: false, speed: tk.hard ? 185 : 165 });
  }

  return {
    durationMs: 1800,
    windupMs: 700,
    gesture: 'sweep',
    tell: 'ROLLING BREAKER',
    cast(time) {
      const opts: Axis[] = ['down', 'up', 'right', 'left'];
      let a = opts[Math.floor(Math.random() * 4)];
      if (a === lastAxis) a = opts[(opts.indexOf(a) + 1) % 4];
      lastAxis = a;
      call(time, a, 0);
      // Spring Tide and after: a second breaker from the opposite side.
      if (phase >= 1) {
        const opp: Axis = a === 'down' ? 'up' : a === 'up' ? 'down' : a === 'right' ? 'left' : 'right';
        tk.schedule(1700, () => call(tk.now, opp, 0));
      }
      tk.sfx('water-jet');
    },
    update(time) {
      const p = tk.player;
      for (const w of waves) {
        if (w.dealt || time < w.startAt) continue;
        const pos = ((time - w.startAt) / 1000) * w.speed;
        if (!p.active || p.hp <= 0) continue;
        const u = along(tk, w.axis, p.x, p.y);
        const v = across(w.axis, p.x, p.y);
        if (Math.abs(u - pos) < BAND && Math.abs(v - w.gap) > GAP_HALF - 8) {
          w.dealt = true;
          tk.hitPlayer(14, p.x, p.y);
          tk.slowPlayer(0.65, 700);
          tk.sfx('splash');
        }
      }
      waves = waves.filter((w) => time < w.startAt || ((time - w.startAt) / 1000) * w.speed < axisLen(tk, w.axis) + 60);
    },
    drawGround(g, time) {
      for (const w of waves) {
        if (time < w.bornAt) continue;
        const len = axisLen(tk, w.axis);
        const L = latLen(tk, w.axis);
        // The sandbar: a pale strip the whole way across, ripple-marked.
        const a0 = pt(tk, w.axis, 0, w.gap - GAP_HALF), a1 = pt(tk, w.axis, len, w.gap + GAP_HALF);
        const rx = Math.min(a0.x, a1.x), ry = Math.min(a0.y, a1.y);
        const rw = Math.abs(a1.x - a0.x), rh = Math.abs(a1.y - a0.y);
        const warnK = clamp((time - w.bornAt) / Math.max(1, w.startAt - w.bornAt), 0, 1);
        g.fillStyle(SAND, 0.35 + warnK * 0.3); g.fillRect(rx, ry, rw, rh);
        g.lineStyle(1.5, SAND_DARK, 0.5);
        for (let d = 10; d < len; d += 16) {
          const s0 = pt(tk, w.axis, d, w.gap - GAP_HALF + 8), s1 = pt(tk, w.axis, d + 4, w.gap + GAP_HALF - 8);
          g.lineBetween(s0.x, s0.y, s1.x, s1.y);
        }
        if (time < w.startAt) {
          // The swell gathering at its edge.
          for (const [v0, v1] of [[0, w.gap - GAP_HALF], [w.gap + GAP_HALF, L]] as [number, number][]) {
            const e0 = pt(tk, w.axis, 6, v0), e1 = pt(tk, w.axis, 6, v1);
            g.lineStyle(6 + warnK * 10, SEA_LIT, 0.3 + warnK * 0.5); g.lineBetween(e0.x, e0.y, e1.x, e1.y);
          }
          continue;
        }
        const pos = ((time - w.startAt) / 1000) * w.speed;
        // Wash behind the wave, fading.
        for (const [v0, v1] of [[0, w.gap - GAP_HALF], [w.gap + GAP_HALF, L]] as [number, number][]) {
          const b0 = pt(tk, w.axis, Math.max(0, pos - 120), v0), b1 = pt(tk, w.axis, pos - BAND, v1);
          g.fillStyle(SEA_SHALLOW, 0.22);
          g.fillRect(Math.min(b0.x, b1.x), Math.min(b0.y, b1.y), Math.abs(b1.x - b0.x), Math.abs(b1.y - b0.y));
          // The wave body and its foaming lip.
          const c0 = pt(tk, w.axis, pos - BAND, v0), c1 = pt(tk, w.axis, pos + BAND, v1);
          g.fillStyle(SEA, 0.75);
          g.fillRect(Math.min(c0.x, c1.x), Math.min(c0.y, c1.y), Math.abs(c1.x - c0.x), Math.abs(c1.y - c0.y));
          const l0 = pt(tk, w.axis, pos + BAND - 6, v0), l1 = pt(tk, w.axis, pos + BAND - 6, v1);
          g.lineStyle(7, FOAM, 0.9); g.lineBetween(l0.x, l0.y, l1.x, l1.y);
          for (let v = v0 + 8; v < v1; v += 20) {
            const f = pt(tk, w.axis, pos + BAND - 4 + Math.sin(v * 0.2 + time / 90) * 4, v);
            g.fillStyle(FOAM, 0.85); g.fillCircle(f.x, f.y, 4);
          }
        }
        // Where the bar breaks it: foam boiling on both corners of the gap.
        for (const v of [w.gap - GAP_HALF, w.gap + GAP_HALF]) {
          const f = pt(tk, w.axis, pos, v);
          for (let i = 0; i < 4; i++) {
            g.fillStyle(FOAM, 0.6); g.fillCircle(f.x + Math.sin(time / 70 + i) * 8, f.y + Math.cos(time / 80 + i) * 8, 6 - i);
          }
        }
      }
    },
    onPhaseEnd() { waves = []; phase++; },
  };
};

// ── Signature: Tide Pools ────────────────────────────────────────────
// Three rock pools open round you. An anemone blooms in each: it lashes anyone within reach,
// and every couple of seconds spits a bubble at you. They dry up after a while.

interface TidePool { x: number; y: number; bornAt: number; openAt: number; dieAt: number; lastLash: number; lastSpit: number; seed: number; color: number }

const POOL_R = 56;

const tidePools = (tk: BossToolkit): SignatureMove => {
  let pools: TidePool[] = [];
  return {
    durationMs: 1500,
    windupMs: 650,
    gesture: 'point',
    tell: 'TIDE POOLS',
    cast(time) {
      const p = tk.player;
      const a0 = Math.random() * Math.PI * 2;
      pools = pools.filter((q) => time < q.dieAt);
      for (let i = 0; i < 3; i++) {
        if (pools.length >= 5) break;
        const a = a0 + (i * Math.PI * 2) / 3;
        const x = tk.clampX(p.x + Math.cos(a) * 140, 70);
        const y = tk.clampY(p.y + Math.sin(a) * 120, 70);
        const openAt = time + tk.warn(1100);
        pools.push({ x, y, bornAt: time, openAt, dieAt: openAt + 7500, lastLash: 0, lastSpit: openAt + i * 600, seed: Math.random() * 10, color: i % 2 ? 0xd65a7a : 0x6ab8a0 });
      }
      tk.sfx('bubble');
    },
    update(time) {
      const p = tk.player;
      for (const q of pools) {
        if (time < q.openAt || time > q.dieAt) continue;
        const d = Phaser.Math.Distance.Between(p.x, p.y, q.x, q.y);
        if (d < POOL_R + 10 && time - q.lastLash > 700) {
          q.lastLash = time;
          tk.hitPlayer(7, p.x, p.y);
          tk.slowPlayer(0.75, 400);
        }
        if (time - q.lastSpit > 2300) {
          q.lastSpit = time;
          const a = tk.angleToPlayer(q.x, q.y);
          tk.spawnBullet({ x: q.x, y: q.y - 10, angle: a, speed: 150, damage: 8, r: 7, lifeMs: 4000, color: SEA_LIT });
        }
      }
      pools = pools.filter((q) => time < q.dieAt + 600);
    },
    drawGround(g, time) {
      for (const q of pools) {
        if (time < q.openAt) {
          const k = (time - q.bornAt) / Math.max(1, q.openAt - q.bornAt);
          g.fillStyle(WETSAND_DARK, 0.3 + k * 0.3); g.fillCircle(q.x, q.y, POOL_R * k);
          g.lineStyle(2.5, EBB_LIT, 0.4 + k * 0.5); g.strokeCircle(q.x, q.y, POOL_R);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + time / 600;
            g.fillStyle(0x4d5455, 0.8 * k); g.fillEllipse(q.x + Math.cos(a) * POOL_R, q.y + Math.sin(a) * POOL_R * 0.8, 18, 10);
          }
          continue;
        }
        const fade = time > q.dieAt ? 1 - (time - q.dieAt) / 600 : 1;
        // Rim of wet rock.
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + q.seed;
          g.fillStyle(0x3a3f40, fade); g.fillEllipse(q.x + Math.cos(a) * POOL_R, q.y + Math.sin(a) * POOL_R * 0.75, 26, 14);
          g.fillStyle(0x4d5455, fade); g.fillEllipse(q.x + Math.cos(a) * POOL_R - 2, q.y + Math.sin(a) * POOL_R * 0.75 - 3, 16, 7);
        }
        g.fillStyle(SEA_DEEP, 0.95 * fade); g.fillEllipse(q.x, q.y, POOL_R * 1.8, POOL_R * 1.3);
        g.fillStyle(SEA, 0.8 * fade); g.fillEllipse(q.x - 4, q.y - 3, POOL_R * 1.4, POOL_R * 0.95);
        const rk = (time / 900 + q.seed) % 1;
        g.lineStyle(1.2, SEA_LIT, 0.6 * (1 - rk) * fade); g.strokeEllipse(q.x, q.y, POOL_R * 1.4 * rk, POOL_R * rk);
        starfish(g, q.x + POOL_R * 0.6, q.y + POOL_R * 0.45, 6, 0xd9733e, q.seed);
        // The reach the anemone lashes to.
        g.lineStyle(1.5, q.color, 0.3 * fade); g.strokeCircle(q.x, q.y, POOL_R + 10);
      }
    },
    drawAir(g, time) {
      const p = tk.player;
      for (const q of pools) {
        if (time < q.openAt || time > q.dieAt) continue;
        const t = time / 1000;
        anemone(g, q.x, q.y, 12, q.color, t * 1.5, q.seed);
        // A lash: tentacles stretching to you when you are in reach.
        const d = Phaser.Math.Distance.Between(p.x, p.y, q.x, q.y);
        if (d < POOL_R + 10) {
          const k = clamp(1 - (time - q.lastLash) / 300, 0, 1);
          for (let i = -1; i <= 1; i++) {
            g.lineStyle(3, q.color, 0.5 + k * 0.5);
            g.lineBetween(q.x, q.y - 8, p.x + i * 8, p.y + 8);
          }
        }
        // About to spit: the mouth swells.
        const spit = clamp(1 - (2300 - (time - q.lastSpit)) / 500, 0, 1);
        if (spit > 0) { g.fillStyle(SEA_LIT, 0.4 + spit * 0.5); g.fillCircle(q.x, q.y - 10, 3 + spit * 5); }
      }
    },
    onPhaseEnd() { pools = []; },
  };
};

// ── Signature: Undertow ──────────────────────────────────────────────
// Ebb draws the sea back toward himself. You feel the pull, the sand streams past you toward
// him, and the flotsam from the edges of the court comes with it. Then the backwash slams down
// where he floats. Walk away — the pull is always weaker than your legs.

const undertow = (tk: BossToolkit): SignatureMove => {
  const PULL_MS = 2400;
  const SLAM_R = 115;
  let active = false;
  let startAt = 0;
  let cx = 0, cy = 0;
  let slammed = false;
  return {
    durationMs: 3600,
    windupMs: 750,
    hold: 'reach',
    tell: 'UNDERTOW',
    cast(time) {
      active = true;
      slammed = false;
      startAt = time;
      cx = tk.bossX; cy = tk.bossY;
      tk.pull(cx, cy, 105, tk.warn(PULL_MS) * 0.85);
      // Flotsam: driftwood washed in from the edges toward him, along the pull.
      const n = tk.hard ? 6 : 4;
      for (let i = 0; i < n; i++) {
        tk.schedule(300 + i * 380, () => {
          const edge = Math.floor(Math.random() * 4);
          const x = edge === 0 ? 20 : edge === 1 ? tk.W - 20 : 60 + Math.random() * (tk.W - 120);
          const y = edge === 2 ? TOP + 10 : edge === 3 ? tk.H - 20 : TOP + 40 + Math.random() * (tk.H - TOP - 80);
          const a = Math.atan2(cy - y, cx - x);
          tk.spawnBullet({ x, y, angle: a, speed: 150, damage: 9, r: 9, lifeMs: 6000, color: DRIFT });
        });
      }
      tk.sfx('gravity-slam');
    },
    update(time) {
      if (!active) return;
      if (!slammed && time >= startAt + tk.warn(PULL_MS)) {
        slammed = true;
        tk.explode(cx, cy, SLAM_R, 16, EBB);
        tk.scene.cameras.main.shake(200, 0.005);
        tk.sfx('geyser');
      }
      if (time > startAt + tk.warn(PULL_MS) + 600) active = false;
    },
    drawGround(g, time) {
      if (!active) return;
      const slamAt = startAt + tk.warn(PULL_MS);
      if (!slammed) {
        const k = clamp((time - startAt) / (slamAt - startAt), 0, 1);
        // Sand streaming toward him from every side.
        for (let i = 0; i < 28; i++) {
          const a = (i / 28) * Math.PI * 2 + i;
          const r = 420 * (1 - ((time / 1200 + i * 0.137) % 1));
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.7;
          g.lineStyle(2, WETSAND_LIT, 0.5);
          g.lineBetween(x, y, x - Math.cos(a) * 16, y - Math.sin(a) * 11);
        }
        g.fillStyle(SEA_DEEP, 0.18 + k * 0.25); g.fillCircle(cx, cy, SLAM_R);
        g.lineStyle(3, EBB_LIT, 0.5 + k * 0.5); g.strokeCircle(cx, cy, SLAM_R);
        g.lineStyle(5, FOAM, 0.8);
        g.beginPath(); g.arc(cx, cy, SLAM_R - 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        if (k > 0.8 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(4, 0xffffff, 0.6); g.strokeCircle(cx, cy, SLAM_R + 4); }
      } else {
        const k = clamp((time - slamAt) / 600, 0, 1);
        g.fillStyle(FOAM, 0.55 * (1 - k)); g.fillCircle(cx, cy, SLAM_R * (0.7 + k * 0.5));
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          g.fillStyle(0xffffff, 0.7 * (1 - k)); g.fillCircle(cx + Math.cos(a) * SLAM_R * (0.6 + k * 0.6), cy + Math.sin(a) * SLAM_R * (0.5 + k * 0.5), 6 * (1 - k) + 2);
        }
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: Surf's Up ─────────────────────────────────────────────
// Spring Tide's signature. Ebb catches a wave and rides it down a lane marked in foam through
// where you stand — three runs, each re-aimed. The board, the curl behind him, the wake. Step
// out of the lane; the wake left behind drags at your feet a moment.

const surfsUp = (tk: BossToolkit): SignatureMove => {
  const RUNS = 3;
  const WARN = 1050;
  const RIDE = 820;
  const HALF = 38;
  interface Run { x0: number; y0: number; x1: number; y1: number; warnAt: number; rideAt: number; dealt: boolean }
  let runs: Run[] = [];
  let wake: { x: number; y: number; at: number }[] = [];
  let active = false;
  let lastX = 0, lastY = 0;

  function lane(fromX: number, fromY: number, time: number): Run {
    const p = tk.player;
    const a = Math.atan2(p.y - fromY, p.x - fromX) + (Math.random() - 0.5) * 0.5;
    // Extend through the player to the far side of the court.
    let x1 = fromX, y1 = fromY;
    for (let d = 0; d < 1400; d += 20) {
      const x = fromX + Math.cos(a) * d, y = fromY + Math.sin(a) * d;
      if (x < 70 || x > tk.W - 70 || y < TOP + 50 || y > tk.H - 50) break;
      x1 = x; y1 = y;
    }
    const warnAt = time;
    return { x0: fromX, y0: fromY, x1, y1, warnAt, rideAt: warnAt + tk.warn(WARN), dealt: false };
  }

  return {
    durationMs: RUNS * (WARN * 1.45 + RIDE) + 400,
    windupMs: 650,
    locksBody: true,
    gesture: 'flex',
    tell: 'SURF\'S UP',
    cast(time) {
      active = true;
      runs = [lane(tk.bossX, tk.bossY, time)];
      lastX = tk.bossX; lastY = tk.bossY;
      tk.sfx('whoosh');
    },
    update(time) {
      if (!active) return;
      const r = runs[runs.length - 1];
      if (!r) return;
      if (time >= r.rideAt) {
        const k = clamp((time - r.rideAt) / RIDE, 0, 1);
        const e = k * k * (3 - 2 * k);
        const x = r.x0 + (r.x1 - r.x0) * e, y = r.y0 + (r.y1 - r.y0) * e;
        tk.host.setBossPos(x, y);
        const p = tk.player;
        if (!r.dealt && p.active && p.hp > 0 && segDist(p.x, p.y, lastX, lastY, x, y) < HALF) {
          r.dealt = true;
          tk.hitPlayer(16, p.x, p.y);
          tk.sfx('splash');
        }
        if (Phaser.Math.Distance.Between(x, y, lastX, lastY) > 16) wake.push({ x, y, at: time });
        lastX = x; lastY = y;
        if (k >= 1) {
          if (runs.length < RUNS) {
            runs.push(lane(x, y, time + 120));
            tk.sfx('whoosh');
          } else {
            active = false;
          }
        }
      }
      // The wake drags at whoever wades through it.
      const p = tk.player;
      for (const w of wake) {
        if (time - w.at < 1600 && Phaser.Math.Distance.Between(p.x, p.y, w.x, w.y) < 30) { tk.slowPlayer(0.7, 250); break; }
      }
      wake = wake.filter((w) => time - w.at < 1600);
    },
    drawGround(g, time) {
      for (const w of wake) {
        const k = (time - w.at) / 1600;
        g.fillStyle(FOAM, 0.45 * (1 - k)); g.fillEllipse(w.x, w.y, 34 * (1 - k * 0.3), 14);
      }
      if (!active) return;
      const r = runs[runs.length - 1];
      if (!r || time >= r.rideAt + RIDE) return;
      const k = clamp((time - r.warnAt) / Math.max(1, r.rideAt - r.warnAt), 0, 1);
      // The lane: a band of churned water, chevrons pointing the way he will come.
      g.lineStyle(HALF * 2, SEA, 0.18 + k * 0.2); g.lineBetween(r.x0, r.y0, r.x1, r.y1);
      g.lineStyle(2, FOAM, 0.5 + k * 0.4);
      const len = Math.hypot(r.x1 - r.x0, r.y1 - r.y0);
      const ux = (r.x1 - r.x0) / (len || 1), uy = (r.y1 - r.y0) / (len || 1);
      const nx = -uy, ny = ux;
      g.lineBetween(r.x0 + nx * HALF, r.y0 + ny * HALF, r.x1 + nx * HALF, r.y1 + ny * HALF);
      g.lineBetween(r.x0 - nx * HALF, r.y0 - ny * HALF, r.x1 - nx * HALF, r.y1 - ny * HALF);
      for (let d = 30; d < len * Math.min(1, k * 1.2); d += 46) {
        const cx = r.x0 + ux * d, cy = r.y0 + uy * d;
        g.lineStyle(3, FOAM, 0.75);
        g.lineBetween(cx - ux * 10 + nx * 12, cy - uy * 10 + ny * 12, cx + ux * 6, cy + uy * 6);
        g.lineBetween(cx - ux * 10 - nx * 12, cy - uy * 10 - ny * 12, cx + ux * 6, cy + uy * 6);
      }
      if (k > 0.8 && time < r.rideAt && Math.floor(time / 80) % 2 === 0) {
        g.lineStyle(HALF * 2, 0xffffff, 0.12); g.lineBetween(r.x0, r.y0, r.x1, r.y1);
      }
    },
    drawAir(g, time) {
      if (!active) return;
      const r = runs[runs.length - 1];
      if (!r) return;
      const riding = time >= r.rideAt;
      const bx = tk.bossX, by = tk.bossY;
      const a = Math.atan2(r.y1 - r.y0, r.x1 - r.x0);
      // The board under him.
      const c = Math.cos(a), s = Math.sin(a);
      const bl = 34, bw = 9;
      const pts = [
        new Phaser.Geom.Point(bx + c * bl, by + 30 + s * bl),
        new Phaser.Geom.Point(bx - s * bw, by + 30 + c * bw),
        new Phaser.Geom.Point(bx - c * bl * 0.8, by + 30 - s * bl * 0.8),
        new Phaser.Geom.Point(bx + s * bw, by + 30 - c * bw),
      ];
      g.fillStyle(EBB_DARK, 1); g.fillPoints(pts, true);
      g.lineStyle(2, EBB_PEARL, 0.9); g.lineBetween(bx - c * bl * 0.7, by + 30 - s * bl * 0.7, bx + c * bl * 0.9, by + 30 + s * bl * 0.9);
      if (!riding) return;
      // The curl rising behind him.
      const bxx = bx - c * 40, byy = by - s * 40;
      for (let i = 0; i < 7; i++) {
        const t = i / 6;
        const ang = a + Math.PI + (t - 0.5) * 2.2;
        const rr = 46 - t * 8;
        g.fillStyle(i % 2 ? SEA : SEA_SHALLOW, 0.75);
        g.fillCircle(bxx + Math.cos(ang) * rr * 0.5, byy + Math.sin(ang) * rr * 0.5 - 20 - Math.sin(t * Math.PI) * 26, 14);
      }
      for (let i = 0; i < 6; i++) {
        g.fillStyle(FOAM, 0.85);
        g.fillCircle(bxx + Math.sin(time / 60 + i) * 18, byy - 44 - Math.cos(time / 70 + i) * 8, 4 + (i % 3));
      }
    },
    onPhaseEnd() { active = false; runs = []; wake = []; },
  };
};

// ── Signature: Spring Flood ──────────────────────────────────────────
// The court floods in stripes. The odd bands go under, then drain while the even bands go under,
// and back again. A band warns by seeping — the sand darkens and shines — before it fills.

const springFlood = (tk: BossToolkit): SignatureMove => {
  const BANDS = 5;
  const WARN = 1300;
  const HOLD = 2100;
  const STEPS = 3;
  let startAt = 0;
  let active = false;
  let lastHit = 0;
  const bandH = () => (tk.H - TOP) / BANDS;
  const stepLen = () => tk.warn(WARN) + HOLD;
  /** Which parity floods at a step: 0 = odd bands (1,3), 1 = even (0,2,4). */
  const parityAt = (step: number) => step % 2;
  return {
    durationMs: 2000,
    windupMs: 900,
    hold: 'conduct',
    tell: 'SPRING FLOOD',
    cast(time) {
      active = true;
      startAt = time;
      tk.sfx('rain');
    },
    update(time) {
      if (!active) return;
      const t = time - startAt;
      const step = Math.floor(t / stepLen());
      if (step >= STEPS) { active = false; return; }
      const inStep = t - step * stepLen();
      if (inStep < tk.warn(WARN)) return;
      const p = tk.player;
      if (!p.active || p.hp <= 0) return;
      const b = Math.floor((p.y - TOP) / bandH());
      if (b % 2 === (parityAt(step) === 0 ? 1 : 0) && time - lastHit > 600) {
        lastHit = time;
        tk.hitPlayer(9, p.x, p.y);
        tk.slowPlayer(0.6, 600);
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const t = time - startAt;
      const step = Math.floor(t / stepLen());
      if (step >= STEPS) return;
      const inStep = t - step * stepLen();
      const warnMs = tk.warn(WARN);
      const h = bandH();
      const want = parityAt(step) === 0 ? 1 : 0;
      for (let b = 0; b < BANDS; b++) {
        const y = TOP + b * h;
        if (b % 2 !== want) {
          // Dry band — the safe ground, ripple-edged.
          g.lineStyle(1.5, SAND, 0.4); g.lineBetween(0, y + 2, tk.W, y + 2);
          continue;
        }
        if (inStep < warnMs) {
          const k = inStep / warnMs;
          g.fillStyle(WETSAND_DARK, 0.25 + k * 0.25); g.fillRect(0, y, tk.W, h);
          for (let x = 0; x < tk.W; x += 40) {
            g.fillStyle(SEA_LIT, 0.3 * k); g.fillEllipse(x + 20 + Math.sin(x + time / 300) * 6, y + h / 2 + Math.sin(x * 0.1) * h * 0.3, 20 * k, 3);
          }
          if (k > 0.8 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(3, 0xffffff, 0.4); g.strokeRect(0, y, tk.W, h); }
        } else {
          const k = clamp((inStep - warnMs) / 250, 0, 1);
          const drain = clamp((stepLen() - inStep) / 300, 0, 1);
          const a = Math.min(k, drain);
          g.fillStyle(SEA, 0.62 * a); g.fillRect(0, y, tk.W, h);
          g.fillStyle(SEA_DEEP, 0.3 * a); g.fillRect(0, y + h * 0.3, tk.W, h * 0.4);
          foamEdge(g, 0, tk.W, (x) => y + 3 + Math.sin(x * 0.04 + time / 200) * 3, 2.5, 0.7 * a);
          foamEdge(g, 0, tk.W, (x) => y + h - 3 + Math.sin(x * 0.05 - time / 240) * 3, 2.5, 0.7 * a);
          for (let i = 0; i < 6; i++) {
            const x = ((i * 173 + time / 10) % (tk.W + 40)) - 20;
            g.lineStyle(1.2, SEA_LIT, 0.5 * a); g.lineBetween(x, y + h * 0.5 + (i % 3) * 8 - 8, x + 24, y + h * 0.5 + (i % 3) * 8 - 9);
          }
        }
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: The Sea Stands Up ─────────────────────────────────────
// Hard mode's King Tide. A wall of water rises along one edge of the court — its shadow on the
// floor is exactly where it will fall. It falls. Then it runs back the way it came, a line of
// backwash broken in two places, and you have to find a break.

const kingTide = (tk: BossToolkit): SignatureMove => {
  const RISE = 1900;
  const REACH = 0.6;
  const BACK_SPEED = 185;
  const GAP = 70;
  let active = false;
  let axis: Axis = 'down';
  let startAt = 0;
  let crashed = false;
  let crashAt = 0;
  let gaps: number[] = [];
  let backDealt = false;
  let last: Axis = 'up';

  const crashU = () => axisLen(tk, axis) * REACH;
  const backPos = (time: number) => axisLen(tk, axis) - ((time - crashAt - 700) / 1000) * BACK_SPEED;

  return {
    durationMs: 5200,
    windupMs: 1000,
    hold: 'brace',
    tell: 'THE SEA STANDS UP',
    cast(time) {
      const opts: Axis[] = ['down', 'right', 'left', 'up'];
      axis = opts[Math.floor(Math.random() * 4)];
      if (axis === last) axis = opts[(opts.indexOf(axis) + 2) % 4];
      last = axis;
      active = true;
      crashed = false;
      backDealt = false;
      startAt = time;
      const L = latLen(tk, axis);
      const g1 = 80 + Math.random() * (L / 2 - 140);
      const g2 = L / 2 + 60 + Math.random() * (L / 2 - 140);
      gaps = [g1, g2];
      tk.sfx('roar');
    },
    update(time) {
      if (!active) return;
      const p = tk.player;
      const riseEnd = startAt + tk.warn(RISE);
      if (!crashed && time >= riseEnd) {
        crashed = true;
        crashAt = time;
        tk.scene.cameras.main.shake(320, 0.008);
        tk.sfx('explosion-large');
        if (p.active && p.hp > 0 && along(tk, axis, p.x, p.y) < crashU()) {
          tk.hitPlayer(22, p.x, p.y);
          tk.slowPlayer(0.6, 900);
        }
      }
      if (crashed && time > crashAt + 700) {
        const pos = backPos(time);
        if (!backDealt && p.active && p.hp > 0) {
          const u = along(tk, axis, p.x, p.y);
          const v = across(axis, p.x, p.y);
          if (Math.abs(u - pos) < BAND && gaps.every((gp) => Math.abs(v - gp) > GAP - 8)) {
            backDealt = true;
            tk.hitPlayer(14, p.x, p.y);
          }
        }
        if (pos < -40) active = false;
      }
    },
    drawGround(g, time) {
      if (!active) return;
      const len = axisLen(tk, axis), L = latLen(tk, axis);
      const riseEnd = startAt + tk.warn(RISE);
      if (!crashed) {
        const k = clamp((time - startAt) / (riseEnd - startAt), 0, 1);
        // The shadow of the wall on the floor — the crash zone.
        const a = pt(tk, axis, 0, 0), b = pt(tk, axis, crashU() * (0.3 + k * 0.7), L);
        g.fillStyle(SEA_DEEP, 0.15 + k * 0.3);
        g.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
        const e0 = pt(tk, axis, crashU(), 0), e1 = pt(tk, axis, crashU(), L);
        g.lineStyle(3, FOAM, 0.4 + k * 0.5); g.lineBetween(e0.x, e0.y, e1.x, e1.y);
        if (k > 0.8 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(6, 0xffffff, 0.5); g.lineBetween(e0.x, e0.y, e1.x, e1.y); }
        // The gaps the backwash will leave, already marked by eddies on the far side.
        for (const gp of gaps) {
          const c = pt(tk, axis, len - 30, gp);
          g.lineStyle(2, EBB_LIT, 0.3 + k * 0.4); g.strokeCircle(c.x, c.y, GAP * 0.6);
        }
        return;
      }
      const sinceCrash = time - crashAt;
      if (sinceCrash < 900) {
        const f = sinceCrash / 900;
        const a = pt(tk, axis, 0, 0), b = pt(tk, axis, crashU(), L);
        g.fillStyle(FOAM, 0.6 * (1 - f));
        g.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
        g.fillStyle(SEA, 0.4 * (1 - f));
        g.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      }
      // The backwash: rolling back from the far edge, broken in two.
      if (sinceCrash > 300) {
        const pos = Math.min(len, backPos(time));
        const segs: [number, number][] = [];
        const gs = [...gaps].sort((x, y) => x - y);
        let v = 0;
        for (const gp of gs) { segs.push([v, gp - GAP]); v = gp + GAP; }
        segs.push([v, L]);
        for (const [v0, v1] of segs) {
          const c0 = pt(tk, axis, pos - BAND, v0), c1 = pt(tk, axis, pos + BAND, v1);
          g.fillStyle(SEA, 0.8);
          g.fillRect(Math.min(c0.x, c1.x), Math.min(c0.y, c1.y), Math.abs(c1.x - c0.x), Math.abs(c1.y - c0.y));
          const l0 = pt(tk, axis, pos - BAND + 4, v0), l1 = pt(tk, axis, pos - BAND + 4, v1);
          g.lineStyle(6, FOAM, 0.9); g.lineBetween(l0.x, l0.y, l1.x, l1.y);
        }
        for (const gp of gs) {
          const c = pt(tk, axis, pos, gp);
          g.fillStyle(EBB_LIT, 0.35); g.fillCircle(c.x, c.y, 10 + Math.sin(time / 90) * 3);
        }
      }
    },
    drawAir(g, time) {
      if (!active || crashed) return;
      const riseEnd = startAt + tk.warn(RISE);
      const k = clamp((time - startAt) / (riseEnd - startAt), 0, 1);
      const L = latLen(tk, axis);
      // The wall itself, standing along its edge and leaning out over the court: a dark face
      // that thickens as it climbs, a curling crest of foam toward you, spray off the top.
      const thick = 18 + k * 70;
      for (let v = 0; v < L; v += 22) {
        const wob = Math.sin(v * 0.05 + time / 200) * 6 * k;
        const a = pt(tk, axis, 0, v), b = pt(tk, axis, thick + wob, v + 22);
        g.fillStyle(SEA_DEEP, 0.9);
        g.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
        const m = pt(tk, axis, (thick + wob) * 0.55, v + 22);
        g.fillStyle(SEA, 0.75);
        g.fillRect(Math.min(m.x, b.x), Math.min(m.y, b.y), Math.abs(b.x - m.x), Math.abs(b.y - m.y));
        const lip = pt(tk, axis, thick + wob, v + 11);
        g.fillStyle(FOAM, 0.95); g.fillCircle(lip.x, lip.y, 7 + k * 4);
        const spray = pt(tk, axis, thick + wob + 10 + Math.sin(time / 90 + v) * 6, v + 11);
        g.fillStyle(0xffffff, 0.6 * k); g.fillCircle(spray.x, spray.y, 3 + k * 2);
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

/** Points of a circle cut off below a level — the water held inside Ebb's body. */
function lowerSegment(cx: number, cy: number, r: number, level: number): Phaser.Geom.Point[] {
  const yL = cy + r - level * 2 * r;
  const h = clamp((yL - cy) / r, -1, 1);
  const a0 = Math.asin(h);
  const pts: Phaser.Geom.Point[] = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((Math.PI - 2 * a0) * i) / n;
    pts.push(new Phaser.Geom.Point(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return pts;
}

export const EBB_BOSS: WorldBossDef = {
  worldId: 'isle:ebb',
  name: 'Prince Ebb',
  title: 'the Tidecaller',
  color: EBB,
  colorLit: EBB_LIT,
  colorDark: EBB_DARK,
  accent: MOON,
  // Tier 1 of the second isle.
  damageMult: 0.9,

  intro: [
    'You are standing four fathoms below the mark.',
    'I know because I know every stone on these flats by the depth it drowns at. Shall I show you yours?',
  ],
  banter: [
    'The sea is not cruel. It is punctual.',
    'One coin a head. I did not set the price. I only call the water.',
    'Mother says the drowned are not dead. They are kept. I keep the count.',
    'Every ebb gives back what was paid for. That is a kindness, if you think about it properly.',
    'Slack water. Listen. That is the sound of the sea waiting for me.',
  ],
  defeatLine: 'THE TIDE GOES OUT',
  resumeLine: 'Back on a falling tide. You learn. The sea respects that.',

  phases: [
    {
      name: 'Slack Water',
      line: 'Slack water. The sea has stopped to listen. Let us give it something to hear.',
      hp: 340,
      cycle: [
        'sig:breaker', 'volley', 'sig:pools', 'hazard', 'sig:undertow',
        'radial', 'sig:breaker', 'lanes', 'sig:pools', 'homing',
      ],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1300,
      harassMs: 3600,
    },
    {
      name: 'Spring Tide',
      line: 'Spring tide. The moon and I agree. The court goes under.',
      hp: 410,
      cycle: [
        'sig:flood', 'sig:surf', 'spiral', 'sig:breaker', 'sig:pools',
        'sig:surf', 'barrage', 'sig:flood', 'sig:undertow', 'quake',
      ],
      harass: ['h-flak', 'h-orbs', 'h-lane'],
      restMs: 1100,
      harassMs: 3100,
    },
  ],

  hard: {
    introLine: 'THE KING TIDE IS COMING',
    extraPhase: {
      name: 'King Tide',
      line: 'Then not a tide. THE tide. Mother\'s own. Stand up, sea.',
      hp: 310,
      cycle: [
        'sig:king-tide', 'homing', 'sig:surf', 'sig:flood',
        'sig:king-tide', 'sweep', 'sig:breaker', 'stream',
      ],
      harass: ['h-orbs', 'h-rune', 'h-lane'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 220, spreadRad: 0.5 },
    radial: { count: 12, speed: 190 },
    hazard: { radius: 62 },
    spiral: { arms: 3, speed: 170 },
  },

  signatures: {
    breaker: breakerMove,
    pools: tidePools,
    undertow,
    surf: surfsUp,
    flood: springFlood,
    'king-tide': kingTide,
  },

  look: {
    crest: 'none', pattern: 'swirl', aura: 'bubbles', hands: 'orb',
    torsoR: 34, mouth: 'line', eyes: 2, eyeColor: MOON,
  },
  phaseStyles: [
    { movement: 'hover', gimmick: 'none' },
    { movement: 'orbit', gimmick: 'none', tint: 'cold', look: { pattern: 'drip', aura: 'bubbles' } },
    { movement: 'anchor', gimmick: 'tremor', tint: 'pale', look: { crest: 'crown', hands: 'claw', mouth: 'maw', aura: 'frost' } },
  ],

  /**
   * The Tidecaller's tells. His body holds water like a glass — the level inside him *ebbs* as
   * he is hurt, a high water mark scratched across his chest where it started. A crown of a
   * curling wave sits on his head, and he carries the tide-staff he calls the sea with: a pole
   * banded in fathoms, a crescent moon at its head cradling his pearl. Spring Tide turns the
   * crown into a cape of running water; King Tide makes it a wave taller than he is.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const king = s.hard && s.phaseIdx >= 2;
    const spring = s.phaseIdx === 1;
    // The water inside him, ebbing with his health.
    const level = clamp(0.25 + s.hpRatio * 0.6, 0.05, 0.92);
    g.fillStyle(SEA_DEEP, 0.38); g.fillPoints(lowerSegment(s.x, s.y, R * 0.92, level), true);
    const wl = s.y + R * 0.92 - level * 2 * R * 0.92;
    const hw = Math.sqrt(Math.max(0, (R * 0.92) ** 2 - (wl - s.y) ** 2));
    g.lineStyle(2, FOAM, 0.7);
    g.beginPath();
    for (let k = 0; k <= 10; k++) {
      const x = s.x - hw + (hw * 2 * k) / 10;
      const y = wl + Math.sin(k * 1.4 + s.t / 220) * 1.5;
      if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
    // The high water mark, scratched where the level started.
    const mark = s.y + R * 0.92 - 0.85 * 2 * R * 0.92;
    g.lineStyle(1.5, BUOY, 0.75); g.lineBetween(s.x - R * 0.35, mark, s.x + R * 0.35, mark);

    // The tide-staff in his first hand: bands of fathoms, a crescent moon and the pearl.
    const hand = s.hands[0];
    if (hand) {
      const a = -Math.PI / 2 - 0.25 + Math.sin(s.t / 700) * 0.06 - s.castGlow * 0.4;
      const len = R * 2.6;
      const bx = hand.x - Math.cos(a) * len * 0.3, by = hand.y - Math.sin(a) * len * 0.3;
      const tx = hand.x + Math.cos(a) * len * 0.7, ty = hand.y + Math.sin(a) * len * 0.7;
      g.lineStyle(5, PILE, 1); g.lineBetween(bx, by, tx, ty);
      for (let k = 0; k < 7; k++) {
        const t0 = k / 7, t1 = (k + 0.5) / 7;
        g.lineStyle(3.5, k % 2 ? PAINT_CREAM : BUOY, 1);
        g.lineBetween(bx + (tx - bx) * t0, by + (ty - by) * t0, bx + (tx - bx) * t1, by + (ty - by) * t1);
      }
      g.lineStyle(3, MOON, 1);
      g.beginPath(); g.arc(tx, ty - 6, 9, Math.PI * 0.15, Math.PI * 0.85, true); g.strokePath();
      g.fillStyle(EBB_PEARL, 1); g.fillCircle(tx, ty - 8, 4 + s.castGlow * 2);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(tx - 1.5, ty - 9.5, 1.3);
      if (s.castGlow > 0.2) { g.fillStyle(EBB_LIT, 0.15 * s.castGlow); g.fillCircle(tx, ty - 8, 16); }
    }

    const top = s.y - R + 2;
    if (spring) {
      // A cape of running water poured down his back.
      for (let i = 0; i < 6; i++) {
        const x = s.x - R * 0.9 + (i * R * 1.8) / 5;
        const ph = (s.t / 500 + i * 0.3) % 1;
        g.fillStyle(i % 2 ? SEA : SEA_SHALLOW, 0.55);
        g.fillEllipse(x, s.y + R * 0.4 + ph * R * 0.7, 9, 18);
      }
    }
    // The wave crown: a crest curling forward, foam on its lip.
    const tall = king ? 2.4 : spring ? 1.3 : 1;
    const crestH = R * 0.75 * tall;
    const dir = Math.cos(s.facing) >= 0 ? 1 : -1;
    g.fillStyle(king ? SEA_DEEP : EBB_DARK, 1);
    g.fillPoints([
      new Phaser.Geom.Point(s.x - R * 0.7, top + 6),
      new Phaser.Geom.Point(s.x + R * 0.7, top + 6),
      new Phaser.Geom.Point(s.x + dir * R * 0.5, top - crestH * 0.7),
      new Phaser.Geom.Point(s.x + dir * R * 0.05, top - crestH),
      new Phaser.Geom.Point(s.x - dir * R * 0.55, top - crestH * 0.55),
    ], true);
    g.fillStyle(king ? SEA : EBB, 1);
    g.fillPoints([
      new Phaser.Geom.Point(s.x - R * 0.55, top + 4),
      new Phaser.Geom.Point(s.x + R * 0.55, top + 4),
      new Phaser.Geom.Point(s.x + dir * R * 0.4, top - crestH * 0.62),
      new Phaser.Geom.Point(s.x + dir * R * 0.05, top - crestH * 0.88),
      new Phaser.Geom.Point(s.x - dir * R * 0.4, top - crestH * 0.48),
    ], true);
    // The curl and its foam.
    g.lineStyle(3, FOAM, 0.95);
    g.beginPath(); g.arc(s.x + dir * R * 0.32, top - crestH * 0.72, R * 0.22, dir > 0 ? Math.PI : 0, dir > 0 ? Math.PI * 2.3 : -Math.PI * 1.3, dir < 0); g.strokePath();
    for (let i = 0; i < 4; i++) {
      g.fillStyle(FOAM, 0.9);
      g.fillCircle(s.x + dir * (R * 0.05 + i * R * 0.15) + Math.sin(s.t / 120 + i) * 1.5, top - crestH * (0.95 - i * 0.08), 2.5 + (i === 0 ? 1.5 : 0));
    }
    if (king) {
      // The crown proper: three brass tines riding the wave.
      for (const k of [-1, 0, 1]) {
        g.fillStyle(BRASS, 1); g.fillTriangle(s.x + k * R * 0.3 - 4, top + 2, s.x + k * R * 0.3 + 4, top + 2, s.x + k * R * 0.3, top - 12 - (k === 0 ? 6 : 0));
        g.fillStyle(BRASS_LIT, 1); g.fillCircle(s.x + k * R * 0.3, top - 12 - (k === 0 ? 6 : 0), 2);
      }
      // Spray blown off the towering crest.
      for (let i = 0; i < 6; i++) {
        const ph = (s.t / 700 + i / 6) % 1;
        g.fillStyle(FOAM, 0.7 * (1 - ph)); g.fillCircle(s.x - dir * ph * R * 1.4 + i * 3, top - crestH - ph * 20, 2.5);
      }
    }
    // Barnacles where the tide reaches on him.
    for (const [ox, oy] of [[-0.55, 0.62], [0.5, 0.7], [-0.2, 0.82], [0.25, 0.78]] as [number, number][]) {
      g.fillStyle(PAINT_CREAM, 0.85); g.fillCircle(s.x + ox * R, s.y + oy * R, 2);
      g.fillStyle(dim(PAINT_CREAM, 0.4), 1); g.fillCircle(s.x + ox * R, s.y + oy * R, 0.8);
    }
    if (s.enraged) {
      g.lineStyle(1.5, EBB_LIT, 0.4 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R + 6);
    }
  },

  /**
   * The lighthouse court at low water: wet sand ripple-marked by the last ebb, the red and white
   * foot of the tower along the top wall, tide-staffs and mooring posts down the sides, a great
   * compass rose of shell and brass let into the sand, and the Low-Water Stone at its heart.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xebb);
    g.fillStyle(WETSAND, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) {
      g.fillStyle(rng() < 0.5 ? WETSAND_LIT : WETSAND_DARK, 0.16 + rng() * 0.14);
      g.fillEllipse(rng() * W, 110 + rng() * (H - 110), 80 + rng() * 160, 20 + rng() * 40);
    }
    sandRipples(g, { x: 0, y: 112, w: W, h: H - 130 }, WETSAND_DARK, 0.4, rng, 16);
    shells(g, { x: 30, y: 130, w: W - 60, h: H - 160 }, 70, rng);
    // The tower's foot along the top: banded red and white, a door, a brass plate.
    for (let i = 0; i < 8; i++) {
      g.fillStyle(i % 2 ? 0xe8e2d4 : BUOY, 1); g.fillRect(0, i * 13, W, 13);
    }
    g.fillStyle(0x000000, 0.2); g.fillRect(0, 0, W, 104);
    g.fillStyle(0x6b7174, 1); g.fillRect(0, 98, W, 12);
    g.fillStyle(PILE_WET, 0.6); g.fillRect(0, 104, W, 6);
    g.fillStyle(WEED, 0.85); g.fillRect(0, 102, W, 3);
    g.fillStyle(0x1f2224, 1); g.fillRoundedRect(W / 2 - 34, 28, 68, 76, { tl: 30, tr: 30, bl: 0, br: 0 });
    g.fillStyle(0x2f5a62, 1); g.fillRoundedRect(W / 2 - 30, 32, 60, 72, { tl: 27, tr: 27, bl: 0, br: 0 });
    // The compass rose in shell and brass, with the Low-Water Stone at its centre.
    const cx = W / 2, cy = H * 0.58;
    g.lineStyle(4, BRASS_DARK, 0.6); g.strokeCircle(cx, cy, 200);
    g.lineStyle(2, BRASS, 0.45); g.strokeCircle(cx, cy, 186);
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * Math.PI * 2;
      const r0 = k % 4 === 0 ? 168 : 178;
      g.lineStyle(k % 4 === 0 ? 3 : 1.5, BRASS, 0.5);
      g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * 196, cy + Math.sin(a) * 196);
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
      const r = k % 2 ? 90 : 160;
      g.fillStyle(k % 2 ? lit(SAND, 0.2) : PAINT_CREAM, 0.55);
      g.fillTriangle(cx + Math.cos(a - 0.2) * 22, cy + Math.sin(a - 0.2) * 22, cx + Math.cos(a + 0.2) * 22, cy + Math.sin(a + 0.2) * 22, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.fillStyle(BUOY, 0.6); g.fillTriangle(cx - 8, cy - 18, cx + 8, cy - 18, cx, cy - 170);
    g.fillStyle(0x000000, 0.3); g.fillEllipse(cx, cy + 6, 96, 30);
    g.fillStyle(0x3e4446, 1); g.fillEllipse(cx, cy, 86, 36);
    g.fillStyle(0x56605f, 1); g.fillEllipse(cx, cy - 4, 70, 24);
    g.lineStyle(2, BRASS, 0.8); g.strokeEllipse(cx, cy - 4, 42, 14);
    // Tide pools in the corners.
    for (const [x, y, r] of [[90, H - 90, 40], [W - 100, H - 80, 46], [W - 120, 190, 30]] as [number, number, number][]) {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        g.fillStyle(0x3a3f40, 1); g.fillEllipse(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 26, 14);
      }
      g.fillStyle(SEA_DEEP, 1); g.fillEllipse(x, y, r * 1.8, r * 1.2);
      g.fillStyle(SEA, 0.8); g.fillEllipse(x - 4, y - 3, r * 1.3, r * 0.8);
      anemone(g, x + r * 0.2, y + r * 0.1, 7, 0xd65a7a, 0, x);
      starfish(g, x - r * 0.5, y + r * 0.4, 6, 0xd9733e, y);
    }
    // Tide-staffs and mooring posts down the sides.
    for (const x of [22, W - 22]) {
      for (let y = 170; y < H - 40; y += 110) {
        g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 4, 20, 6);
        g.fillStyle(PILE, 1); g.fillRect(x - 5, y - 46, 10, 48);
        for (let k = 0; k < 4; k++) { g.fillStyle(k % 2 ? PAINT_CREAM : BUOY, 1); g.fillRect(x - 4, y - 46 + k * 10, 8, 10); }
        g.fillStyle(PILE_WET, 1); g.fillRect(x - 5, y - 6, 10, 8);
        g.fillStyle(WEED, 0.9); g.fillRect(x - 5, y - 8, 10, 3);
      }
    }
    // A strand of driftwood and wrack, and a thin sheet of sea along the bottom.
    for (let x = 40; x < W - 40; x += 9) {
      g.fillStyle(rng() < 0.5 ? DRIFT_DARK : WEED, 0.6); g.fillEllipse(x + rng() * 6, H - 46 + rng() * 6, 8, 2.5);
    }
    g.fillStyle(SEA_SHALLOW, 1); g.fillRect(0, H - 24, W, 24);
    g.fillStyle(SEA, 1); g.fillRect(0, H - 12, W, 12);
    foamEdge(g, 0, W, (x) => H - 24 + Math.sin(x * 0.03) * 2, 2.5, 0.75);
    // Salt-grey vignette, the sea fog at the edges.
    for (let i = 0; i < 6; i++) {
      g.lineStyle(40, 0x24434d, 0.07);
      g.strokeRect(i * 18, i * 18, W - i * 36, H - i * 36);
    }
  },
};
