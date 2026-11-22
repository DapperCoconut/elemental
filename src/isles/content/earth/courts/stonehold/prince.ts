import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mulberry } from '../../../../art/IsleArt';
import { boulder, burierSeal, dustPuff, menhir, rollingBoulder, shard, titheWeight } from './art';
import {
  BOULD, BOULD_DARK, BOULD_EYE, BOULD_LIT, BRASS, DUST, DUST_LIT, EARTH, EARTH_DARK, GRANITE, GRANITE_DARK,
  GRANITE_DEEP, GRANITE_LIT, LICHEN, LICHEN_LIT, MAGMA, MAGMA_LIT, MOSS, REGENT, SANDSTONE, STRATA,
} from './palette';
import { clamp, dist, segDist } from './util';

/**
 * Prince Bould, the Unmoved — Regent Gravane's eldest, governor of the Stonehold Court.
 *
 * His father told him, when he was very small, that a stone does not move and a stone is not
 * moved, and Bould has been trying to be a stone ever since. He speaks slowly, sits on his gate
 * for whole days, and collects the Tithe the stone way: what is owed is owed, and no weather
 * changes it. He fights like the mountain he wants to be:
 *
 * • **Rockslide** (rushing): he curls into a boulder and caroms round the hall off every wall,
 *   shedding scree at each impact; skips stones across the floor in long hops, every landing
 *   marked; and brings scree showering down off the walls in diagonal runs.
 * • **Standing Stone** (anchored, the tremor): he plants himself and will not be moved. Menhirs
 *   burst up in a ring round him, and an earth-shock rolls out from his feet — hide in a stone's
 *   lee; a fault line splits the floor toward you and heaves; and he builds a dolmen over you,
 *   two uprights and then the capstone.
 * • **Avalanche** (hard, blinking): the mountain comes down. Waves of boulders roll from the top
 *   edge with one clear lane each, and he rides the slide down after them.
 */

const TOP = 96;

/** The phase index the decor last drew — read by moves that change with the phases. */
let phaseNow = 0;

const alive = (tk: BossToolkit) => tk.player.active && tk.player.hp > 0;

// ── Signature: Carom ─────────────────────────────────────────────────
// He curls up into a boulder and rolls: four legs, each to a wall, bouncing off it. Each leg's
// line is shown before he goes; every impact sheds a ring of scree.

interface Leg { fx: number; fy: number; tx: number; ty: number; startAt: number; arriveAt: number; shed: boolean }

const carom = (tk: BossToolkit): SignatureMove => {
  let legs: Leg[] = [];
  let endAt = 0;
  const WARN = 480;
  return {
    durationMs: 3900,
    windupMs: 500,
    locksBody: true,
    gesture: 'flex',
    hold: 'brace',
    tell: 'ROCKSLIDE',
    cast(time) {
      legs = [];
      const n = phaseNow >= 2 ? 5 : 4;
      let x = tk.bossX, y = tk.bossY;
      let a = tk.angleToPlayer() + (Math.random() - 0.5) * 0.3;
      let t = time;
      const x0 = 90, x1 = tk.W - 90, y0 = 150, y1 = tk.H - 90;
      for (let i = 0; i < n; i++) {
        const nx = Math.cos(a), ny = Math.sin(a);
        let k = Infinity;
        if (nx > 0.01) k = Math.min(k, (x1 - x) / nx); else if (nx < -0.01) k = Math.min(k, (x0 - x) / nx);
        if (ny > 0.01) k = Math.min(k, (y1 - y) / ny); else if (ny < -0.01) k = Math.min(k, (y0 - y) / ny);
        k = Math.max(60, Math.min(k, 900));
        const tx = clamp(x + nx * k, x0, x1), ty = clamp(y + ny * k, y0, y1);
        const travel = Math.max(260, (k / 900) * 700);
        const warn = tk.warn(WARN);
        legs.push({ fx: x, fy: y, tx, ty, startAt: t + warn, arriveAt: t + warn + travel, shed: false });
        const leg = legs[legs.length - 1];
        tk.schedule(t - time, () => tk.spawnCharge({ toX: leg.tx, toY: leg.ty, warnMs: WARN, travelMs: travel, halfW: 30, damage: 14 }));
        t += warn + travel + 60;
        // Bounce: reflect off whichever wall it met, and bend toward the player a little.
        if (tx <= x0 + 1 || tx >= x1 - 1) a = Math.PI - a;
        if (ty <= y0 + 1 || ty >= y1 - 1) a = -a;
        const toP = Math.atan2(tk.player.y - ty, tk.player.x - tx);
        a += Math.atan2(Math.sin(toP - a), Math.cos(toP - a)) * 0.25;
        x = tx; y = ty;
      }
      endAt = t;
      tk.sfx('rock-throw');
    },
    update(time) {
      for (const l of legs) {
        if (l.shed || time < l.arriveAt) continue;
        l.shed = true;
        tk.sfx('stone-slam');
        const n = 7;
        const off = Math.random() * Math.PI;
        for (let i = 0; i < n; i++) tk.spawnBullet({ x: l.tx, y: l.ty, angle: off + (i / n) * Math.PI * 2, speed: 150, damage: 7, r: 5, lifeMs: 2600, color: GRANITE });
      }
      if (time > endAt + 400) legs = [];
    },
    drawGround(g, time) {
      for (const l of legs) {
        if (time > l.arriveAt + 500) continue;
        // The groove he will roll: a scored line, then the dent where he struck.
        if (time < l.arriveAt) {
          const k = clamp((time - (l.startAt - tk.warn(WARN))) / tk.warn(WARN), 0, 1);
          g.lineStyle(3, GRANITE_DEEP, 0.2 + k * 0.4); g.lineBetween(l.fx, l.fy, l.tx, l.ty);
          g.fillStyle(DUST, 0.25 + k * 0.3); g.fillEllipse(l.tx, l.ty + 10, 60, 20);
        } else {
          const k = (time - l.arriveAt) / 500;
          g.fillStyle(GRANITE_DEEP, 0.4 * (1 - k)); g.fillEllipse(l.tx, l.ty + 6, 80, 30);
        }
      }
    },
    drawAir(g, time) {
      // While rolling he is a boulder: a shell drawn over him, spinning.
      const rolling = legs.some((l) => time >= l.startAt && time < l.arriveAt);
      if (rolling) rollingBoulder(g, tk.bossX, tk.bossY, 40, time / 60, BOULD);
      for (const l of legs) {
        if (time < l.arriveAt || time > l.arriveAt + 600) continue;
        dustPuff(g, l.tx, l.ty, (time - l.arriveAt) / 600, 46);
      }
    },
    onPhaseEnd() { legs = []; },
  };
};

// ── Signature: Skipping Stones ───────────────────────────────────────
// He flicks a fan of flat stones low across the floor. Each skips three times, and only the
// landings hurt — every landing is ringed on the floor from the moment he throws.

interface Skip { pts: { x: number; y: number }[]; startAt: number; hopMs: number; hit: boolean[]; spin: number }

const skipping = (tk: BossToolkit): SignatureMove => {
  let stones: Skip[] = [];
  return {
    durationMs: 1600,
    windupMs: 600,
    gesture: 'sweep',
    tell: 'SKIPPING STONES',
    cast(time) {
      stones = [];
      const n = tk.hard ? 6 : 5;
      const a0 = tk.angleToPlayer();
      const reach = clamp(dist(tk.bossX, tk.bossY, tk.player.x, tk.player.y) + 80, 300, 640);
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / (n - 1) - 0.5) * 0.9;
        const pts = [{ x: tk.bossX, y: tk.bossY }];
        for (let h = 1; h <= 3; h++) {
          const d = reach * (h === 1 ? 0.42 : h === 2 ? 0.74 : 1);
          pts.push({ x: tk.clampX(tk.bossX + Math.cos(a) * d, 40), y: tk.clampY(tk.bossY + Math.sin(a) * d, 40) });
        }
        stones.push({ pts, startAt: time + tk.warn(300) + i * 70, hopMs: 360, hit: [false, false, false], spin: Math.random() * 6 });
      }
      tk.sfx('whoosh');
    },
    update(time) {
      const p = tk.player;
      for (const s of stones) {
        for (let h = 0; h < 3; h++) {
          if (s.hit[h] || time < s.startAt + (h + 1) * s.hopMs) continue;
          s.hit[h] = true;
          const q = s.pts[h + 1];
          tk.sfx('rock-throw');
          if (alive(tk) && dist(p.x, p.y, q.x, q.y) < 34) tk.hitPlayer(10, p.x, p.y);
        }
      }
      stones = stones.filter((s) => time < s.startAt + 3 * s.hopMs + 400);
    },
    drawGround(g, time) {
      for (const s of stones) {
        for (let h = 0; h < 3; h++) {
          const q = s.pts[h + 1];
          const landAt = s.startAt + (h + 1) * s.hopMs;
          if (time > landAt + 300) continue;
          if (time < landAt) {
            const k = clamp(1 - (landAt - time) / (s.hopMs * (h + 1) + 300), 0, 1);
            g.lineStyle(2, DUST_LIT, 0.3 + k * 0.6); g.strokeEllipse(q.x, q.y, 48, 20);
            g.fillStyle(GRANITE_DEEP, 0.12 + k * 0.2); g.fillEllipse(q.x, q.y, 48 * k, 20 * k);
          } else {
            const k = (time - landAt) / 300;
            g.lineStyle(2, DUST, 1 - k); g.strokeEllipse(q.x, q.y, 48 + k * 30, 20 + k * 12);
          }
        }
      }
    },
    drawAir(g, time) {
      for (const s of stones) {
        const e = time - s.startAt;
        if (e < 0 || e > 3 * s.hopMs) continue;
        const h = Math.min(2, Math.floor(e / s.hopMs));
        const k = (e - h * s.hopMs) / s.hopMs;
        const a = s.pts[h], b = s.pts[h + 1];
        const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
        const lift = Math.sin(k * Math.PI) * (34 - h * 8);
        g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 4, 16, 6);
        // A flat stone, spinning edge-on.
        const sp = s.spin + e / 40;
        g.fillStyle(GRANITE_DARK, 1); g.fillEllipse(x, y - lift + 1, 16, 5 + Math.abs(Math.sin(sp)) * 4);
        g.fillStyle(SANDSTONE, 1); g.fillEllipse(x, y - lift, 15, 4 + Math.abs(Math.sin(sp)) * 4);
      }
    },
    onPhaseEnd() { stones = []; },
  };
};

// ── Signature: Scree Shower ──────────────────────────────────────────
// Scree pours off the walls in three diagonal runs across the hall, one through you, coming down
// in sequence. Each fall is a spray of stones you can see dropping onto its ring.

const screeShower = (tk: BossToolkit): SignatureMove => {
  let falls: { x: number; y: number; at: number; landAt: number }[] = [];
  return {
    durationMs: 2200,
    windupMs: 550,
    gesture: 'raise',
    tell: 'SCREE SHOWER',
    cast(time) {
      falls = [];
      const p = tk.player;
      const dir = Math.random() < 0.5 ? 1 : -1;
      for (let run = -1; run <= 1; run++) {
        for (let i = 0; i < 7; i++) {
          const k = i / 6;
          const x = p.x + run * 170 + (k - 0.5) * 560 * dir;
          const y = p.y + (k - 0.5) * 360;
          if (x < 50 || x > tk.W - 50 || y < TOP + 30 || y > tk.H - 40) continue;
          const warn = 900 + (run + 1) * 380 + i * 50;
          tk.spawnZone({ x, y, radius: 42, warnMs: warn, damage: 11, fall: true, slowMult: 0.75, slowMs: 600 });
          falls.push({ x, y, at: time, landAt: time + tk.warn(warn) });
        }
      }
      tk.sfx('quake');
    },
    drawAir(g, time) {
      for (const f of falls) {
        if (time > f.landAt + 400) continue;
        if (time < f.landAt) {
          // Stones dropping out of the dust onto the ring.
          const k = clamp((time - f.at) / Math.max(1, f.landAt - f.at), 0, 1);
          for (let i = 0; i < 4; i++) {
            const fy = f.y - 160 * (1 - k) - i * 18;
            if (k < 0.3) continue;
            shard(g, f.x - 12 + i * 8, fy, 4, time / 90 + i, i % 2 ? GRANITE : SANDSTONE);
          }
        } else dustPuff(g, f.x, f.y, (time - f.landAt) / 400, 32);
      }
      falls = falls.filter((f) => time < f.landAt + 400);
    },
    onPhaseEnd() { falls = []; },
  };
};

// ── Signature: Menhir Ring ───────────────────────────────────────────
// Menhirs burst up round him (don't stand where the ground cracks), then an earth-shock rolls
// out from his feet. The stones break it: in a menhir's lee, the shock passes over you.

interface Stone { x: number; y: number; riseAt: number; sinkAt: number; h: number }

const menhirRing = (tk: BossToolkit): SignatureMove => {
  let stones: Stone[] = [];
  let shocks: { cx: number; cy: number; at: number; hit: boolean }[] = [];
  const SHOCK_V = 280, BAND = 20, STONE_R = 18;
  const shaded = (cx: number, cy: number, x: number, y: number) => {
    const d = dist(cx, cy, x, y);
    const a = Math.atan2(y - cy, x - cx);
    return stones.some((s) => {
      const ds = dist(cx, cy, s.x, s.y);
      if (ds >= d - 6) return false;
      const as = Math.atan2(s.y - cy, s.x - cx);
      const half = Math.asin(Math.min(1, (STONE_R + 8) / ds));
      return Math.abs(Math.atan2(Math.sin(a - as), Math.cos(a - as))) < half;
    });
  };
  return {
    durationMs: 3200,
    windupMs: 700,
    gesture: 'slam',
    tell: 'STANDING STONES',
    cast(time) {
      const cx = tk.bossX, cy = tk.bossY;
      const n = tk.hard ? 6 : 7;
      const off = Math.random() * Math.PI * 2;
      stones = [];
      const warn = tk.warn(700);
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const r = 150 + Math.random() * 60;
        const x = tk.clampX(cx + Math.cos(a) * r, 50), y = tk.clampY(cy + Math.sin(a) * r * 0.85, 50);
        stones.push({ x, y, riseAt: time + warn, sinkAt: time + warn + 6500, h: 60 + Math.random() * 26 });
        tk.spawnZone({ x, y, radius: 30, warnMs: 700, damage: 10 });
      }
      shocks = [0, 1].map((k) => ({ cx, cy, at: time + warn + tk.warn(900) + k * 900, hit: false }));
      tk.sfx('stone-rise');
    },
    update(time) {
      const p = tk.player;
      for (const s of shocks) {
        if (s.hit || time < s.at) continue;
        const r = ((time - s.at) / 1000) * SHOCK_V;
        if (r > 1100) { s.hit = true; continue; }
        if (!alive(tk)) continue;
        const d = dist(s.cx, s.cy, p.x, p.y);
        if (Math.abs(d - r) < BAND && !shaded(s.cx, s.cy, p.x, p.y)) {
          s.hit = true;
          tk.hitPlayer(16, p.x, p.y);
          tk.slowPlayer(0.6, 700);
          tk.sfx('quake');
        }
      }
      stones = stones.filter((s) => time < s.sinkAt + 500);
    },
    drawGround(g, time) {
      for (const s of shocks) {
        if (time < s.at - 700) continue;
        if (time < s.at) {
          const k = (time - (s.at - 700)) / 700;
          g.lineStyle(3, MAGMA, 0.2 + k * 0.5); g.strokeCircle(s.cx, s.cy, 30 + k * 10);
          continue;
        }
        const r = ((time - s.at) / 1000) * SHOCK_V;
        if (r > 1100) continue;
        // The shock: a ridge of heaved earth, broken where a stone stands in its way.
        const n = 96;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const x = s.cx + Math.cos(a) * r, y = s.cy + Math.sin(a) * r;
          if (shaded(s.cx, s.cy, x, y)) continue;
          g.fillStyle(i % 2 ? EARTH_DARK : EARTH, 0.85); g.fillEllipse(x, y, 16, 9);
          g.fillStyle(DUST_LIT, 0.5); g.fillCircle(x - Math.cos(a) * 4, y - Math.sin(a) * 4 - 2, 2.5);
        }
      }
      // The lee behind each stone: a pale wedge, so you can see where to stand.
      for (const st of stones) {
        if (time < st.riseAt || !shocks.some((s) => time < s.at + 3000)) continue;
        const cx = shocks[0]?.cx ?? tk.bossX, cy = shocks[0]?.cy ?? tk.bossY;
        const a = Math.atan2(st.y - cy, st.x - cx);
        const ds = dist(cx, cy, st.x, st.y);
        const half = Math.asin(Math.min(1, (STONE_R + 8) / ds));
        g.fillStyle(DUST_LIT, 0.14);
        g.fillTriangle(st.x, st.y, st.x + Math.cos(a - half) * 260, st.y + Math.sin(a - half) * 260, st.x + Math.cos(a + half) * 260, st.y + Math.sin(a + half) * 260);
      }
    },
    drawAir(g, time) {
      const rng = mulberry(7);
      for (const s of stones) {
        if (time < s.riseAt) {
          const k = clamp(1 - (s.riseAt - time) / tk.warn(700), 0, 1);
          g.lineStyle(2, GRANITE_DEEP, 0.6 + k * 0.4);
          for (let i = 0; i < 4; i++) { const a = i * 1.7; g.lineBetween(s.x, s.y, s.x + Math.cos(a) * 26 * k, s.y + Math.sin(a) * 12 * k); }
          continue;
        }
        const up = clamp((time - s.riseAt) / 180, 0, 1) * clamp((s.sinkAt + 500 - time) / 500, 0, 1);
        if (up <= 0) continue;
        menhir(g, s.x, s.y + 10, 30, s.h * up, rng, 0, false);
      }
    },
    onPhaseEnd() { stones = []; shocks = []; },
  };
};

// ── Signature: Fault Line ────────────────────────────────────────────
// He stamps and a crack zig-zags from his feet toward you, forking halfway. A moment later the
// crack heaves, slab by slab, from his end outward.

interface Seg { ax: number; ay: number; bx: number; by: number; fireAt: number; fired: boolean }

const faultLine = (tk: BossToolkit): SignatureMove => {
  let segs: Seg[] = [];
  let bornAt = 0;
  return {
    durationMs: 2000,
    windupMs: 500,
    gesture: 'slam',
    tell: 'FAULT LINE',
    cast(time) {
      segs = [];
      bornAt = time;
      const p = tk.player;
      const a0 = Math.atan2(p.y - tk.bossY, p.x - tk.bossX);
      const len = clamp(dist(tk.bossX, tk.bossY, p.x, p.y) + 200, 400, 820);
      const warn = tk.warn(850);
      const walk = (x: number, y: number, a: number, n: number, step: number, t0: number): { x: number; y: number; t: number } => {
        let t = t0;
        for (let i = 0; i < n; i++) {
          const zig = a + (i % 2 ? 0.45 : -0.45);
          const nx = tk.clampX(x + Math.cos(zig) * step, 30), ny = tk.clampY(y + Math.sin(zig) * step, 30);
          segs.push({ ax: x, ay: y, bx: nx, by: ny, fireAt: time + warn + t, fired: false });
          x = nx; y = ny; t += 70;
        }
        return { x, y, t };
      };
      const step = len / 10;
      const mid = walk(tk.bossX, tk.bossY, a0, 5, step, 0);
      walk(mid.x, mid.y, a0 - 0.42, 5, step, mid.t);
      walk(mid.x, mid.y, a0 + 0.42, 5, step, mid.t);
      tk.sfx('quake');
    },
    update(time) {
      const p = tk.player;
      for (const s of segs) {
        if (s.fired || time < s.fireAt) continue;
        s.fired = true;
        if (alive(tk) && segDist(p.x, p.y, s.ax, s.ay, s.bx, s.by) < 26) tk.hitPlayer(14, p.x, p.y);
      }
      if (segs.length && segs.every((s) => s.fired && time > s.fireAt + 700)) segs = [];
    },
    drawGround(g, time) {
      for (const s of segs) {
        if (!s.fired) {
          const k = clamp((time - bornAt) / Math.max(1, s.fireAt - bornAt), 0, 1);
          g.lineStyle(2 + k * 4, GRANITE_DEEP, 0.5 + k * 0.4); g.lineBetween(s.ax, s.ay, s.bx, s.by);
          g.lineStyle(1.5, MAGMA, k * 0.7); g.lineBetween(s.ax, s.ay, s.bx, s.by);
          continue;
        }
        const k = clamp((time - s.fireAt) / 700, 0, 1);
        // The heaved slabs either side of the crack, tipping up and settling.
        const mx = (s.ax + s.bx) / 2, my = (s.ay + s.by) / 2;
        const a = Math.atan2(s.by - s.ay, s.bx - s.ax);
        const lift = Math.sin(Math.min(1, k * 2) * Math.PI) * 10;
        for (const side of [-1, 1]) {
          const ox = Math.cos(a + Math.PI / 2) * 12 * side, oy = Math.sin(a + Math.PI / 2) * 12 * side;
          g.fillStyle(GRANITE_DARK, 0.9 * (1 - k * 0.6)); g.fillEllipse(mx + ox, my + oy - lift + 3, 34, 16);
          g.fillStyle(GRANITE, 0.9 * (1 - k * 0.6)); g.fillEllipse(mx + ox, my + oy - lift, 32, 14);
        }
        g.lineStyle(4, 0x1a120c, 0.9 * (1 - k)); g.lineBetween(s.ax, s.ay, s.bx, s.by);
      }
    },
    onPhaseEnd() { segs = []; },
  };
};

// ── Signature: Dolmen ────────────────────────────────────────────────
// Two uprights burst out of the floor either side of you; then the capstone comes down between
// them. Its shadow grows on the floor first. Step out between the stones, not along them.

const dolmenDrop = (tk: BossToolkit): SignatureMove => {
  let d: { cx: number; cy: number; a: number; at: number; dropAt: number; dealt: boolean } | null = null;
  const HALF_L = 90, HALF_W = 42;
  const inside = (x: number, y: number) => {
    if (!d) return false;
    const dx = x - d.cx, dy = y - d.cy;
    const along = dx * Math.cos(d.a) + dy * Math.sin(d.a), across = -dx * Math.sin(d.a) + dy * Math.cos(d.a);
    return Math.abs(along) < HALF_L && Math.abs(across) < HALF_W;
  };
  return {
    durationMs: 1800,
    windupMs: 600,
    gesture: 'raise',
    tell: 'DOLMEN',
    cast(time) {
      const p = tk.player;
      // The uprights stand along the line from him to you, so the slab lies across your path.
      const a = Math.atan2(p.y - tk.bossY, p.x - tk.bossX) + Math.PI / 2;
      d = { cx: tk.clampX(p.x, 100), cy: tk.clampY(p.y, 60), a, at: time, dropAt: time + tk.warn(1150), dealt: false };
      for (const s of [-1, 1]) tk.spawnZone({ x: d.cx + Math.cos(a) * HALF_L * s, y: d.cy + Math.sin(a) * HALF_L * s, radius: 26, warnMs: 450, damage: 8 });
      tk.sfx('stone-rise');
    },
    update(time) {
      if (!d || d.dealt || time < d.dropAt) return;
      d.dealt = true;
      tk.sfx('stone-slam');
      tk.boom(d.cx, d.cy, 80, GRANITE);
      const p = tk.player;
      if (alive(tk) && inside(p.x, p.y)) { tk.hitPlayer(18, p.x, p.y); tk.slowPlayer(0.55, 900); }
    },
    drawGround(g, time) {
      if (!d || time > d.dropAt + 1800) return;
      const k = clamp((time - d.at) / Math.max(1, d.dropAt - d.at), 0, 1);
      const c = Math.cos(d.a), s = Math.sin(d.a);
      const corner = (u: number, v: number) => ({ x: d!.cx + c * u - s * v, y: d!.cy + s * u + c * v });
      const pts = [corner(-HALF_L, -HALF_W), corner(HALF_L, -HALF_W), corner(HALF_L, HALF_W), corner(-HALF_L, HALF_W)];
      if (!d.dealt) {
        g.fillStyle(0x000000, 0.12 + k * 0.3);
        g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const q of pts.slice(1)) g.lineTo(q.x, q.y); g.closePath(); g.fillPath();
        g.lineStyle(2, DUST_LIT, 0.4 + k * 0.4);
        g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const q of pts.slice(1)) g.lineTo(q.x, q.y); g.closePath(); g.strokePath();
      }
    },
    drawAir(g, time) {
      if (!d || time > d.dropAt + 1800) return;
      const c = Math.cos(d.a), s = Math.sin(d.a);
      const fade = clamp((d.dropAt + 1800 - time) / 400, 0, 1);
      // The uprights.
      const upK = clamp((time - d.at - tk.warn(450)) / 160, 0, 1) * fade;
      for (const sd of [-1, 1]) {
        if (upK <= 0) continue;
        const ux = d.cx + c * HALF_L * sd, uy = d.cy + s * HALF_L * sd;
        g.fillStyle(GRANITE_DARK, 1); g.fillRoundedRect(ux - 14, uy - 70 * upK, 28, 70 * upK + 4, 6);
        g.fillStyle(GRANITE, 1); g.fillRoundedRect(ux - 13, uy - 70 * upK, 24, 70 * upK, 6);
        g.fillStyle(GRANITE_LIT, 0.4); g.fillRect(ux - 11, uy - 66 * upK, 5, 60 * upK);
      }
      // The capstone: high and small while it falls, then lying across the uprights.
      const k = clamp((time - d.at) / Math.max(1, d.dropAt - d.at), 0, 1);
      const fall = d.dealt ? 0 : (1 - k) * 260;
      const sc = d.dealt ? 1 : 0.6 + k * 0.4;
      const ex = c * HALF_L * 1.15 * sc, ey = s * HALF_L * 1.15 * sc;
      g.lineStyle(30 * sc, GRANITE_DARK, fade); g.lineBetween(d.cx - ex, d.cy - ey - 70 - fall + 4, d.cx + ex, d.cy + ey - 70 - fall + 4);
      g.lineStyle(26 * sc, GRANITE, fade); g.lineBetween(d.cx - ex, d.cy - ey - 72 - fall, d.cx + ex, d.cy + ey - 72 - fall);
      g.lineStyle(6 * sc, GRANITE_LIT, 0.5 * fade); g.lineBetween(d.cx - ex * 0.9, d.cy - ey * 0.9 - 80 - fall, d.cx + ex * 0.9, d.cy + ey * 0.9 - 80 - fall);
      g.fillStyle(MOSS, 0.8 * fade); g.fillEllipse(d.cx - ex * 0.3, d.cy - ey * 0.3 - 82 - fall, 26 * sc, 7 * sc);
      if (d.dealt && time < d.dropAt + 500) dustPuff(g, d.cx, d.cy, (time - d.dropAt) / 500, 70);
    },
    onPhaseEnd() { d = null; },
  };
};

// ── Signature: Avalanche ─────────────────────────────────────────────
// He climbs to the top of the hall and the mountain comes down: three waves of tumbling boulders
// roll from the top edge to the bottom, each with one clear lane — the lane drifts between waves
// but never far. Then he rides the slide down after them.

interface Wave { startAt: number; gapX: number; hit: boolean }

const avalanche = (tk: BossToolkit): SignatureMove => {
  let waves: Wave[] = [];
  const V = 175, BAND = 34, GAP = 90;
  const waveY = (w: Wave, time: number) => TOP - 20 + ((time - w.startAt) / 1000) * V;
  return {
    durationMs: 4600,
    windupMs: 700,
    locksBody: true,
    gesture: 'raise',
    tell: 'AVALANCHE',
    cast(time) {
      waves = [];
      let gx = clamp(tk.player.x + (Math.random() - 0.5) * 200, 120, tk.W - 120);
      tk.spawnCharge({ toX: tk.W / 2, toY: 140, warnMs: 400, travelMs: 500, halfW: 26, damage: 10 });
      const lead = tk.warn(400) + 500 + tk.warn(700);
      for (let i = 0; i < 3; i++) {
        waves.push({ startAt: time + lead + i * 1100, gapX: gx, hit: false });
        gx = clamp(gx + (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 60), 120, tk.W - 120);
      }
      // He rides down after the last wave, through its gap.
      const last = waves[waves.length - 1];
      tk.schedule(lead + 2 * 1100 + 400, () => tk.spawnCharge({ toX: last.gapX, toY: tk.H - 100, warnMs: 300, travelMs: 1100, halfW: 28, damage: 12 }));
      tk.sfx('quake');
    },
    update(time) {
      const p = tk.player;
      for (const w of waves) {
        if (w.hit || time < w.startAt) continue;
        const y = waveY(w, time);
        if (y > tk.H + 60) { w.hit = true; continue; }
        if (alive(tk) && Math.abs(p.y - y) < BAND && Math.abs(p.x - w.gapX) > GAP - 10) {
          w.hit = true;
          tk.hitPlayer(16, p.x, p.y);
          tk.slowPlayer(0.6, 600);
          tk.sfx('hit-heavy');
        }
      }
      waves = waves.filter((w) => waveY(w, time) < tk.H + 80);
    },
    drawGround(g, time) {
      for (const w of waves) {
        // The clear lane, chalked down the whole hall before the first stone comes.
        g.fillStyle(DUST_LIT, 0.08); g.fillRect(w.gapX - GAP, TOP, GAP * 2, tk.H - TOP);
        g.lineStyle(2, DUST_LIT, 0.35); g.lineBetween(w.gapX - GAP, TOP, w.gapX - GAP, tk.H); g.lineBetween(w.gapX + GAP, TOP, w.gapX + GAP, tk.H);
        if (time < w.startAt) continue;
        const y = waveY(w, time);
        g.fillStyle(0x000000, 0.18); g.fillRect(0, y + 10, w.gapX - GAP, 26); g.fillRect(w.gapX + GAP, y + 10, tk.W - w.gapX - GAP, 26);
      }
    },
    drawAir(g, time) {
      for (const w of waves) {
        if (time < w.startAt - 400) continue;
        const y = time < w.startAt ? TOP - 20 : waveY(w, time);
        // Dust boiling ahead of it, then the boulders tumbling, leaving the lane clear.
        for (let x = 20; x < tk.W; x += 44) {
          if (Math.abs(x - w.gapX) < GAP) continue;
          const bob = Math.abs(Math.sin(time / 120 + x)) * 10;
          dustPuff(g, x, y + 20, ((time / 500) + x / 300) % 1, 22, DUST);
          rollingBoulder(g, x, y - bob, 20 + ((x * 7) % 9), time / 80 + x, (x / 44) % 3 === 0 ? SANDSTONE : 0);
        }
      }
    },
    onPhaseEnd() { waves = []; },
  };
};

export const BOULD_BOSS: WorldBossDef = {
  worldId: 'isle:bould',
  name: 'Prince Bould',
  title: 'the Unmoved',
  color: BOULD,
  colorLit: BOULD_LIT,
  colorDark: BOULD_DARK,
  accent: BOULD_EYE,
  // Tier 1 of the fifth isle.
  damageMult: 1.05,

  intro: [
    'You came up my road. Everybody comes up my road. Some of them roll down it again.',
    'Father says a stone does not move, and a stone is not moved. I have been practising.',
  ],
  banter: [
    'What is owed is owed. Rain does not change it. Begging does not change it. You will not change it.',
    'I sat on my gate for nine days once. Nobody noticed. That was the point.',
    'The short are walled up until the debt is quarried. It is very fair. Stone is very fair.',
    'Hold still. It is easier for both of us.',
    'Father buried the Old King, and the Old King did not complain. Be like the Old King.',
  ],
  defeatLine: 'THE STONE IS MOVED',
  resumeLine: 'Back again. Good. Stones are patient. I can be patient longer than you.',

  phases: [
    {
      name: 'Rockslide',
      line: 'Fine. I will roll. Even a stone rolls, downhill. Everything is downhill from me.',
      hp: 420,
      cycle: [
        'sig:carom', 'volley', 'sig:skip', 'hazard', 'sig:scree',
        'radial', 'sig:carom', 'sig:skip', 'barrage', 'sig:scree',
      ],
      harass: ['h-flak', 'h-snipe'],
      restMs: 1250,
      harassMs: 3500,
    },
    {
      name: 'Standing Stone',
      line: 'Enough rolling. Now I stand. Push me. Go on. Push.',
      hp: 500,
      cycle: [
        'sig:menhirs', 'sig:fault', 'radial', 'sig:dolmen', 'sig:menhirs',
        'lanes', 'sig:fault', 'sig:dolmen', 'spiral',
      ],
      harass: ['h-rune', 'h-lane', 'h-flak'],
      restMs: 1150,
      harassMs: 3100,
    },
  ],

  hard: {
    introLine: 'THE MOUNTAIN COMES DOWN',
    extraPhase: {
      name: 'Avalanche',
      line: 'I am not a stone. I am the mountain. And the mountain is coming down on you.',
      hp: 360,
      cycle: [
        'sig:avalanche', 'sig:carom', 'sig:fault', 'homing',
        'sig:avalanche', 'sig:skip', 'sig:dolmen', 'sweep',
      ],
      harass: ['h-mines', 'h-orbs'],
      restMs: 1000,
      harassMs: 2700,
    },
  },

  tuning: {
    volley: { count: 5, speed: 215, spreadRad: 0.45 },
    radial: { count: 16, speed: 175 },
    hazard: { radius: 64 },
    barrage: { count: 4 },
    spiral: { arms: 3, speed: 160 },
  },

  signatures: {
    carom,
    skip: skipping,
    scree: screeShower,
    menhirs: menhirRing,
    fault: faultLine,
    dolmen: dolmenDrop,
    avalanche,
  },

  look: {
    crest: 'none', pattern: 'cracks', aura: 'dust', hands: 'gauntlet',
    torsoR: 38, mouth: 'grate', eyes: 2, eyeColor: BOULD_EYE,
  },
  phaseStyles: [
    { movement: 'rush', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'tremor', tint: 'pale', look: { pattern: 'plates', hands: 'ball', mouth: 'line' } },
    { movement: 'blink', gimmick: 'none', tint: 'cold', look: { aura: 'smoke', pattern: 'facets', mouth: 'maw' } },
  ],

  /**
   * The Unmoved's tells. A great domed shell of mossy boulder rides on his shoulders like a
   * tortoise's — the thing he curls into — banded with the mesa's strata, and round his neck hangs
   * the Tithe chain of brass weights his father put on him. In Standing Stone a menhir has risen out
   * of the shell, lichened and ringed with old cut grooves, and his feet are sunk in a skirt of
   * earth. In Avalanche the shell is split down the middle and stones pour off him, dust streaming.
   */
  drawDecor(g, s) {
    phaseNow = s.phaseIdx;
    const R = s.radius;
    const standing = s.phaseIdx === 1;
    const slide = s.hard && s.phaseIdx >= 2;
    // Earth skirt round the feet while he stands.
    if (standing) {
      g.fillStyle(EARTH_DARK, 0.9); g.fillEllipse(s.x, s.y + R * 0.95, R * 2.6, R * 0.6);
      g.fillStyle(EARTH, 0.9); g.fillEllipse(s.x, s.y + R * 0.9, R * 2.3, R * 0.45);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI; g.fillStyle(DUST, 0.7); g.fillCircle(s.x + Math.cos(a) * R * 1.1, s.y + R * 0.9 + Math.sin(a) * 4, 3); }
    }
    // The shell: a dome of boulder over the shoulders, split in two in the Avalanche.
    const sy = s.y - R * 0.7;
    const halves = slide ? [-1, 1] : [0];
    for (const h of halves) {
      const ox = h * (6 + Math.sin(s.t / 200) * 2);
      g.fillStyle(dim(BOULD, 0.4), 1); g.fillEllipse(s.x + ox + 3, sy + 3, R * (slide ? 1.25 : 2.5), R * 1.4);
      g.fillStyle(BOULD, 1);
      if (slide) g.slice(s.x + ox, sy, R * 1.25, h < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, h < 0 ? Math.PI * 1.5 : Math.PI * 0.5, false);
      else g.slice(s.x, sy, R * 1.25, Math.PI, 0, false);
      g.fillPath();
      g.fillStyle(BOULD_LIT, 0.45); g.fillEllipse(s.x + ox - R * 0.45, sy - R * 0.55, R * 0.8, R * 0.4);
      for (let k = 0; k < 3; k++) {
        g.lineStyle(4, STRATA[k * 2], 0.45);
        g.beginPath(); g.arc(s.x + ox, sy + 4, R * (0.55 + k * 0.25), Math.PI * 1.08, Math.PI * 1.92, false); g.strokePath();
      }
      g.fillStyle(MOSS, 0.9); g.fillEllipse(s.x + ox + R * 0.15, sy - R * 1.12, R * 1.1, R * 0.3);
      for (let i = 0; i < 5; i++) { g.fillStyle(i % 2 ? LICHEN : LICHEN_LIT, 0.85); g.fillCircle(s.x + ox - R * 0.8 + i * R * 0.4, sy - R * 0.5 + Math.sin(i * 2) * R * 0.3, 2.5); }
      g.lineStyle(2, GRANITE_DEEP, 0.8); g.lineBetween(s.x + ox + R * 0.5, sy - R * 0.9, s.x + ox + R * 0.3, sy - R * 0.3);
    }
    if (standing) {
      // A menhir risen out of the shell, ringed with cut grooves.
      const mh = R * 1.9, mx = s.x - R * 0.15, my = sy - R * 0.9;
      g.fillStyle(GRANITE_DARK, 1); g.fillRoundedRect(mx - R * 0.32 + 3, my - mh + 3, R * 0.64, mh, R * 0.25);
      g.fillStyle(GRANITE, 1); g.fillRoundedRect(mx - R * 0.32, my - mh, R * 0.64, mh, R * 0.25);
      g.fillStyle(GRANITE_LIT, 0.45); g.fillRect(mx - R * 0.26, my - mh + 6, R * 0.14, mh - 12);
      for (let k = 0; k < 4; k++) { g.lineStyle(1.5, GRANITE_DEEP, 0.8); g.lineBetween(mx - R * 0.3, my - mh * (0.2 + k * 0.2), mx + R * 0.3, my - mh * (0.22 + k * 0.2)); }
      g.fillStyle(LICHEN, 0.85); g.fillCircle(mx + R * 0.1, my - mh * 0.7, 4); g.fillCircle(mx - R * 0.12, my - mh * 0.4, 3);
      if (s.castGlow > 0) { g.lineStyle(2, MAGMA_LIT, s.castGlow * 0.8); g.strokeRoundedRect(mx - R * 0.36, my - mh - 4, R * 0.72, mh + 4, R * 0.25); }
    }
    if (slide) {
      // Stones pouring off him, dust streaming behind.
      for (let i = 0; i < 6; i++) {
        const ph = (s.t / 700 + i / 6) % 1;
        shard(g, s.x - R + (i % 3) * R, sy - R * 0.4 + ph * R * 2.4, 4 + (i % 2) * 2, s.t / 100 + i, i % 2 ? SANDSTONE : GRANITE);
      }
      for (let i = 0; i < 4; i++) {
        const ph = (s.t / 1100 + i / 4) % 1;
        g.fillStyle(DUST, 0.35 * (1 - ph)); g.fillCircle(s.x + Math.cos(s.facing + Math.PI) * R * (1 + ph * 2), s.y + Math.sin(s.facing + Math.PI) * R * (1 + ph * 2) - ph * 10, 8 + ph * 14);
      }
    }
    // The Tithe chain of brass weights round his neck.
    const ny = s.y - R * 0.15;
    g.lineStyle(2, BRASS, 1);
    g.beginPath(); g.arc(s.x, ny - R * 0.3, R * 0.7, Math.PI * 0.15, Math.PI * 0.85, false); g.strokePath();
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * (0.2 + k * 0.15);
      titheWeight(g, s.x + Math.cos(a) * R * 0.7, ny - R * 0.3 + Math.sin(a) * R * 0.7 + 8, 0.55);
    }
    burierSeal(g, s.x, ny + R * 0.48, 5, REGENT, 1);
    if (s.enraged) {
      for (let i = 0; i < 3; i++) {
        const ph = (s.t / 500 + i / 3) % 1;
        g.fillStyle(DUST, 0.4 * (1 - ph)); g.fillCircle(s.x + (i - 1) * R * 0.8, s.y + R - ph * 8, 6 + ph * 10);
      }
    }
  },

  /**
   * The keep's great hall: a floor of huge fitted stones laid without mortar, every one a
   * different many-sided shape, the joints packed with dust. A round runnel is cut into the
   * middle — the track the Prince rolls round when he cannot sit still — and the walls under the
   * HUD are the keep's inner courses of boulders, his father's Seal over the door. Boulders sit
   * in the corners where he has parked them.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xb0a1d);
    g.fillStyle(GRANITE_DEEP, 1); g.fillRect(0, 0, W, H);
    // Cyclopean flags: a jittered grid of many-sided stones.
    const S = 80;
    const pts: { x: number; y: number }[][] = [];
    for (let r = 0; r <= Math.ceil(H / S) + 1; r++) {
      pts.push([]);
      for (let c = 0; c <= Math.ceil(W / S) + 1; c++) pts[r].push({ x: c * S + (rng() - 0.5) * S * 0.5, y: 90 + r * S * 0.75 + (rng() - 0.5) * S * 0.35 });
    }
    for (let r = 0; r < pts.length - 1; r++) {
      for (let c = 0; c < pts[r].length - 1; c++) {
        const quad = [pts[r][c], pts[r][c + 1], pts[r + 1][c + 1], pts[r + 1][c]];
        const cxp = quad.reduce((m, q) => m + q.x, 0) / 4, cyp = quad.reduce((m, q) => m + q.y, 0) / 4;
        const shrink = (q: { x: number; y: number }) => ({ x: cxp + (q.x - cxp) * 0.93, y: cyp + (q.y - cyp) * 0.9 });
        const qs = quad.map(shrink);
        const base = rng() < 0.25 ? SANDSTONE : rng() < 0.5 ? GRANITE_DARK : GRANITE;
        g.fillStyle(base, 1);
        g.beginPath(); g.moveTo(qs[0].x, qs[0].y); for (const q of qs.slice(1)) g.lineTo(q.x, q.y); g.closePath(); g.fillPath();
        g.fillStyle(lit(base, 0.18), 0.6);
        g.beginPath(); g.moveTo(qs[0].x, qs[0].y); g.lineTo(qs[1].x, qs[1].y); g.lineTo(cxp, cyp); g.closePath(); g.fillPath();
        if (rng() < 0.3) { g.lineStyle(1, GRANITE_DEEP, 0.6); g.lineBetween(cxp - 12, cyp - 6, cxp + 10, cyp + 8); }
        if (rng() < 0.25) { g.fillStyle(DUST, 0.3); g.fillEllipse(cxp, cyp, 30, 10); }
      }
    }
    // The rolling ring in the middle.
    const cx = W / 2, cy = (H + 110) / 2;
    g.lineStyle(40, GRANITE_DEEP, 1); g.strokeEllipse(cx, cy, 520, 330);
    g.lineStyle(30, dim(GRANITE, 0.45), 1); g.strokeEllipse(cx, cy, 520, 330);
    g.lineStyle(6, GRANITE_LIT, 0.18); g.strokeEllipse(cx, cy, 512, 322);
    burierSeal(g, cx, cy, 26, REGENT, 0.55);
    // The inner wall under the HUD: courses of boulders.
    g.fillStyle(GRANITE_DARK, 1); g.fillRect(0, 0, W, 104);
    for (let course = 0; course < 3; course++) {
      for (let x = (course % 2) * 30; x < W + 40; x += 60) {
        const r = 30 - course * 4, y = 96 - course * 34;
        g.fillStyle(GRANITE_DEEP, 1); g.fillEllipse(x + 3, y + 3, r * 2.1, r * 1.5);
        g.fillStyle(rng() < 0.3 ? SANDSTONE : GRANITE, 1); g.fillEllipse(x, y, r * 2, r * 1.4);
        g.fillStyle(GRANITE_LIT, 0.35); g.fillEllipse(x - r * 0.4, y - r * 0.35, r * 0.8, r * 0.4);
      }
    }
    burierSeal(g, W / 2, 50, 18, REGENT, 1);
    // Parked boulders in the corners.
    boulder(g, 60, H - 30, 36, rng);
    boulder(g, W - 64, H - 34, 40, rng, { sand: true });
    boulder(g, 54, 190, 28, rng);
    boulder(g, W - 50, 200, 30, rng);
    // Dust in the light from the slits.
    for (let i = 0; i < 4; i++) { g.fillStyle(DUST_LIT, 0.05); g.fillTriangle(120 + i * 220, 104, 70 + i * 220, H, 220 + i * 220, H); }
  },
};
